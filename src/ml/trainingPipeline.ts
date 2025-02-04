import * as tf from '@tensorflow/tfjs-node';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';
import { mlModelManager } from './modelManager';
import { featureEngineering } from './featureEngineering';

// Training Configuration Schema
const TrainingConfigSchema = z.object({
  modelType: z.enum([
    'mental_health_sentiment', 
    'email_personalization', 
    'compliance_risk',
    'engagement_prediction'
  ]),
  hyperparameters: z.object({
    learningRate: z.number().min(0.0001).max(1).default(0.001),
    batchSize: z.number().min(1).max(1024).default(32),
    epochs: z.number().min(1).max(100).default(10),
    validationSplit: z.number().min(0).max(0.5).default(0.2)
  }),
  dataAugmentation: z.boolean().default(false),
  earlyStoppingPatience: z.number().min(1).max(10).default(3)
});

// Dataset Schema
const DatasetSchema = z.object({
  features: z.array(z.array(number)),
  labels: z.array(z.array(number)),
  metadata: z.record(z.string(), z.any()).optional()
});

class MLTrainingPipeline {
  private static instance: MLTrainingPipeline;

  private constructor() {}

  // Singleton instance
  public static getInstance(): MLTrainingPipeline {
    if (!MLTrainingPipeline.instance) {
      MLTrainingPipeline.instance = new MLTrainingPipeline();
    }
    return MLTrainingPipeline.instance;
  }

  // Load training dataset
  private async loadDataset(
    datasetPath: string
  ): Promise<z.infer<typeof DatasetSchema>> {
    try {
      const rawData = JSON.parse(
        fs.readFileSync(datasetPath, 'utf-8')
      );
      return DatasetSchema.parse(rawData);
    } catch (error) {
      logger.error('Dataset loading failed', error);
      throw error;
    }
  }

  // Prepare training data
  private prepareTrainingData(
    dataset: z.infer<typeof DatasetSchema>
  ): {
    trainFeatures: tf.Tensor;
    trainLabels: tf.Tensor;
    validFeatures: tf.Tensor;
    validLabels: tf.Tensor;
  } {
    const features = tf.tensor(dataset.features);
    const labels = tf.tensor(dataset.labels);

    const totalSamples = features.shape[0];
    const validationSplit = 0.2;
    const validationSamples = Math.floor(totalSamples * validationSplit);

    const trainFeatures = features.slice(
      [0, 0], 
      [totalSamples - validationSamples, features.shape[1]]
    );
    const trainLabels = labels.slice(
      [0, 0], 
      [totalSamples - validationSamples, labels.shape[1]]
    );

    const validFeatures = features.slice(
      [totalSamples - validationSamples, 0], 
      [validationSamples, features.shape[1]]
    );
    const validLabels = labels.slice(
      [totalSamples - validationSamples, 0], 
      [validationSamples, labels.shape[1]]
    );

    return { trainFeatures, trainLabels, validFeatures, validLabels };
  }

  // Train a machine learning model
  public async trainModel(
    config: z.infer<typeof TrainingConfigSchema>,
    datasetPath: string
  ): Promise<{
    model: tf.LayersModel;
    trainingHistory: tf.History;
    performanceMetrics: {
      accuracy: number;
      loss: number;
      validationAccuracy: number;
      validationLoss: number;
    }
  }> {
    const validatedConfig = TrainingConfigSchema.parse(config);
    
    // Log training start
    logger.log('info', 'ML Model Training Started', {
      modelType: validatedConfig.modelType,
      epochs: validatedConfig.hyperparameters.epochs
    });

    // Publish training start event
    eventBus.publish(EventTypes.ML_TRAINING_STARTED, {
      modelType: validatedConfig.modelType
    });

    try {
      // Load dataset
      const dataset = await this.loadDataset(datasetPath);
      const { 
        trainFeatures, 
        trainLabels, 
        validFeatures, 
        validLabels 
      } = this.prepareTrainingData(dataset);

      // Create model based on type
      let model: tf.LayersModel;
      switch (validatedConfig.modelType) {
        case 'mental_health_sentiment':
          model = await mlModelManager.createMentalHealthSentimentModel();
          break;
        default:
          throw new Error(`Unsupported model type: ${validatedConfig.modelType}`);
      }

      // Compile model
      model.compile({
        optimizer: tf.train.adam(validatedConfig.hyperparameters.learningRate),
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });

      // Early stopping callback
      const earlyStoppingCallback = tf.callbacks.earlyStopping({
        patience: validatedConfig.earlyStoppingPatience
      });

      // Train model
      const trainingHistory = await model.fit(
        trainFeatures, 
        trainLabels, 
        {
          batchSize: validatedConfig.hyperparameters.batchSize,
          epochs: validatedConfig.hyperparameters.epochs,
          validationData: [validFeatures, validLabels],
          callbacks: [earlyStoppingCallback]
        }
      );

      // Evaluate model performance
      const [loss, accuracy] = model.evaluate(
        validFeatures, 
        validLabels
      ) as tf.Scalar[];

      const performanceMetrics = {
        accuracy: accuracy.dataSync()[0],
        loss: loss.dataSync()[0],
        validationAccuracy: trainingHistory.history['val_accuracy']?.slice(-1)[0] || 0,
        validationLoss: trainingHistory.history['val_loss']?.slice(-1)[0] || 0
      };

      // Register trained model
      await mlModelManager.registerModel({
        name: `${validatedConfig.modelType}_${Date.now()}`,
        type: validatedConfig.modelType,
        version: '1.0.0',
        path: './models',
        inputShape: trainFeatures.shape.slice(1),
        outputShape: trainLabels.shape.slice(1)
      }, { model });

      // Track model performance
      mlModelManager.trackModelPerformance({
        modelName: `${validatedConfig.modelType}_${Date.now()}`,
        accuracy: performanceMetrics.accuracy,
        precision: 0, // Placeholder
        recall: 0, // Placeholder
        f1Score: 0, // Placeholder
        lastTrainingDate: new Date(),
        trainingDatasetSize: trainFeatures.shape[0]
      });

      // Publish training completion event
      eventBus.publish(EventTypes.ML_TRAINING_COMPLETED, {
        modelType: validatedConfig.modelType,
        performance: performanceMetrics
      });

      // Log training completion
      logger.log('info', 'ML Model Training Completed', {
        modelType: validatedConfig.modelType,
        accuracy: performanceMetrics.accuracy
      });

      return { 
        model, 
        trainingHistory, 
        performanceMetrics 
      };
    } catch (error) {
      // Log and publish training error
      logger.error('ML Model Training Failed', error);
      eventBus.publish(EventTypes.ML_TRAINING_ERROR, {
        modelType: validatedConfig.modelType,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  // Data augmentation techniques
  public augmentTrainingData(
    features: tf.Tensor, 
    labels: tf.Tensor
  ): { 
    augmentedFeatures: tf.Tensor; 
    augmentedLabels: tf.Tensor 
  } {
    // Simple noise addition for data augmentation
    const noise = tf.randomNormal(features.shape, 0, 0.1);
    const augmentedFeatures = features.add(noise);

    return { 
      augmentedFeatures, 
      augmentedLabels: labels 
    };
  }
}

// Export singleton instance
export const mlTrainingPipeline = MLTrainingPipeline.getInstance();
