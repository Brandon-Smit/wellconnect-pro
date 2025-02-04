import { z } from 'zod';
import * as tf from '@tensorflow/tfjs-node';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';
import OpenAI from 'openai';
import { reportError, trackPerformance } from './monitoring';

// Comprehensive input schema for ML model
const MLInputSchema = z.object({
  industry: z.string(),
  companySize: z.enum(['small', 'medium', 'large']),
  previousInteractions: z.array(z.object({
    type: z.enum(['email', 'click', 'download']),
    timestamp: z.date(),
    contentType: z.string()
  })).optional(),
  ethicalConstraints: z.object({
    sensitivityLevel: z.number().min(0).max(1),
    communicationPreferences: z.array(z.string())
  })
});

// Input validation schemas
const ContentGenerationInputSchema = z.object({
  affiliateLink: z.string().url(),
  targetIndustry: z.enum([
    'technology', 'healthcare', 'finance', 
    'education', 'manufacturing', 'retail'
  ]),
  companySize: z.enum(['small', 'medium', 'large']),
  contentType: z.enum(['wellness', 'mental-health', 'professional-development']).optional()
});

const EthicalScoringSchema = z.object({
  sensitivityScore: z.number().min(0).max(1),
  inclusivityScore: z.number().min(0).max(1),
  contextRelevance: z.number().min(0).max(1)
});

// Content ethics and personalization model
export class MachineLearningModel {
  private static instance: MachineLearningModel;
  private model: tf.Sequential;
  private ethicsModel: tf.Sequential;
  private openai: OpenAI;

  private constructor() {
    this.initializeModels();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: false
    });
  }

  public static getInstance(): MachineLearningModel {
    if (!MachineLearningModel.instance) {
      MachineLearningModel.instance = new MachineLearningModel();
    }
    return MachineLearningModel.instance;
  }

  private initializeModels(): void {
    // Personalization model
    this.model = tf.sequential();
    this.model.add(tf.layers.dense({
      inputShape: [6], // industry, company size, interaction types
      units: 16,
      activation: 'relu'
    }));
    this.model.add(tf.layers.dense({
      units: 8,
      activation: 'relu'
    }));
    this.model.add(tf.layers.dense({
      units: 4,
      activation: 'softmax'
    }));

    // Ethics scoring model
    this.ethicsModel = tf.sequential();
    this.ethicsModel.add(tf.layers.dense({
      inputShape: [5], // content features
      units: 10,
      activation: 'relu'
    }));
    this.ethicsModel.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid'
    }));

    this.model.compile({ 
      optimizer: 'adam', 
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'] 
    });

    this.ethicsModel.compile({
      optimizer: 'adam',
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
  }

  // Personalize content based on input parameters
  public async personalizeContent(
    input: z.infer<typeof MLInputSchema>
  ): Promise<{
    personalizedScore: number[],
    recommendedContentType: string,
    ethicalScore: number
  }> {
    try {
      // Validate input
      const validatedInput = MLInputSchema.parse(input);

      // Prepare input tensor
      const inputTensor = tf.tensor2d([
        this.encodeIndustry(validatedInput.industry),
        this.encodeCompanySize(validatedInput.companySize),
        ...this.encodeInteractions(validatedInput.previousInteractions || []),
        validatedInput.ethicalConstraints.sensitivityLevel
      ], [1, 6]);

      // Personalization prediction
      const personalizedPrediction = this.model.predict(inputTensor) as tf.Tensor;
      const personalizedScore = await personalizedPrediction.array();

      // Determine recommended content type
      const contentTypes = ['wellness', 'mental-health', 'professional-development', 'support-resources'];
      const recommendedIndex = personalizedScore[0].indexOf(Math.max(...personalizedScore[0]));
      const recommendedContentType = contentTypes[recommendedIndex];

      // Ethics scoring
      const ethicsInputTensor = tf.tensor2d([
        this.encodeIndustry(validatedInput.industry),
        this.encodeCompanySize(validatedInput.companySize),
        validatedInput.ethicalConstraints.sensitivityLevel,
        validatedInput.previousInteractions?.length || 0,
        validatedInput.ethicalConstraints.communicationPreferences.length
      ], [1, 5]);

      const ethicsScore = await this.evaluateContentEthics(ethicsInputTensor);

      // Log personalization event
      await eventBus.publish(EventTypes.ML_PERSONALIZATION_COMPLETED, {
        industry: validatedInput.industry,
        companySize: validatedInput.companySize,
        recommendedContentType,
        ethicalScore: ethicsScore
      });

      return {
        personalizedScore: personalizedScore[0],
        recommendedContentType,
        ethicalScore
      };
    } catch (error) {
      logger.error('ML Personalization Failed', { 
        error, 
        input: JSON.stringify(input) 
      });
      throw error;
    }
  }

  // Evaluate content ethics
  public async evaluateContentEthics(
    content: string | tf.Tensor
  ): Promise<number> {
    try {
      let ethicsInputTensor: tf.Tensor;

      if (typeof content === 'string') {
        // Basic content feature extraction (placeholder)
        ethicsInputTensor = tf.tensor2d([
          this.extractContentFeatures(content)
        ], [1, 5]);
      } else {
        ethicsInputTensor = content;
      }

      const ethicsPrediction = this.ethicsModel.predict(ethicsInputTensor) as tf.Tensor;
      const ethicsScore = await ethicsPrediction.data();

      return ethicsScore[0];
    } catch (error) {
      logger.error('Content Ethics Evaluation Failed', { error });
      return 0.5; // Default neutral score
    }
  }

  async generateContentEnhancement(input: z.infer<typeof ContentGenerationInputSchema>) {
    try {
      // Validate input
      const validatedInput = ContentGenerationInputSchema.parse(input);
      
      const startTime = Date.now();
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system', 
            content: `You are an AI specialized in generating ethical, context-aware marketing content for mental health services. 
            Focus on empathy, professionalism, and supporting HR departments.`
          },
          {
            role: 'user',
            content: `Generate a marketing email for a mental health service targeting ${validatedInput.targetIndustry} companies 
            of ${validatedInput.companySize} size. Use the affiliate link: ${validatedInput.affiliateLink}. 
            Emphasize employee wellness and professional support.`
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
        top_p: 1.0,
        frequency_penalty: 0.5,
        presence_penalty: 0.6
      });

      const endTime = Date.now();
      trackPerformance('ml_content_generation', endTime - startTime);

      return {
        generatedContent: response.choices[0].message.content || '',
        processingTime: endTime - startTime
      };
    } catch (error) {
      reportError(error as Error, { 
        context: 'Content Generation', 
        input: JSON.stringify(input) 
      });
      throw error;
    }
  }

  async calculateEthicalScore(content: string): Promise<z.infer<typeof EthicalScoringSchema>> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: `Analyze the following text and provide ethical scoring across three dimensions:
            1. Sensitivity Score: How respectful and considerate is the content?
            2. Inclusivity Score: Does the content avoid bias and support diverse perspectives?
            3. Context Relevance: How well does the content align with mental health support goals?
            
            Respond with JSON: { "sensitivityScore": 0-1, "inclusivityScore": 0-1, "contextRelevance": 0-1 }`
          },
          {
            role: 'user',
            content
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      });

      const parsedScore = JSON.parse(
        response.choices[0].message.content || '{}'
      );

      return EthicalScoringSchema.parse(parsedScore);
    } catch (error) {
      reportError(error as Error, { 
        context: 'Ethical Scoring', 
        content 
      });
      
      // Fallback scoring
      return {
        sensitivityScore: 0.5,
        inclusivityScore: 0.5,
        contextRelevance: 0.5
      };
    }
  }

  // Encode industry as numerical features
  private encodeIndustry(industry: string): number[] {
    const industries = [
      'technology', 'healthcare', 'finance', 'education', 
      'manufacturing', 'retail', 'other'
    ];
    const index = industries.indexOf(industry.toLowerCase());
    return index !== -1 ? [index / industries.length] : [0.5];
  }

  // Encode company size
  private encodeCompanySize(size: string): number[] {
    const sizeMap = { 'small': 0.2, 'medium': 0.5, 'large': 0.8 };
    return [sizeMap[size] || 0.5];
  }

  // Encode previous interactions
  private encodeInteractions(interactions: any[]): number[] {
    if (!interactions.length) return [0, 0, 0];
    
    const typeCounts = {
      'email': 0,
      'click': 0,
      'download': 0
    };

    interactions.forEach(interaction => {
      typeCounts[interaction.type]++;
    });

    return [
      typeCounts['email'] / interactions.length,
      typeCounts['click'] / interactions.length,
      typeCounts['download'] / interactions.length
    ];
  }

  // Basic content feature extraction (placeholder)
  private extractContentFeatures(content: string): number[] {
    return [
      content.length / 1000,  // Normalize content length
      (content.match(/\b(mental health|wellness|support)\b/gi) || []).length / 10,
      content.includes('confidential') ? 1 : 0,
      content.includes('professional') ? 1 : 0,
      content.includes('consent') ? 1 : 0
    ];
  }

  // Train model with new data (placeholder for future expansion)
  public async trainModel(trainingData: any[]): Promise<void> {
    logger.info('Model Training Initiated', { 
      trainingDataSize: trainingData.length 
    });
    // Future implementation for continuous model improvement
  }
}

export const machineLearningModel = MachineLearningModel.getInstance();
