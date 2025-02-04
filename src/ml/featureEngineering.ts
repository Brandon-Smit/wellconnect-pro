import * as tf from '@tensorflow/tfjs-node';
import { z } from 'zod';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';

// Feature Schema
const FeatureSchema = z.object({
  name: z.string(),
  type: z.enum([
    'numerical', 
    'categorical', 
    'text', 
    'embedding', 
    'temporal'
  ]),
  description: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional()
});

// Feature Engineering Configuration
const FeatureEngineeringConfigSchema = z.object({
  features: z.array(z.object({
    name: z.string(),
    type: z.enum([
      'numerical', 
      'categorical', 
      'text', 
      'embedding', 
      'temporal'
    ]),
    preprocessing: z.object({
      normalization: z.enum(['standard', 'minmax', 'none']).default('none'),
      encoding: z.enum(['onehot', 'embedding', 'none']).default('none')
    }).optional()
  }))
});

// Feature Vector Schema
const FeatureVectorSchema = z.object({
  campaignId: z.string(),
  features: z.object({
    // Email Engagement Features
    openRate: z.number().min(0).max(1),
    clickRate: z.number().min(0).max(1),
    conversionRate: z.number().min(0).max(1),
    unsubscribeRate: z.number().min(0).max(1),

    // Content Features
    contentLength: z.number().min(0),
    personalizedScore: z.number().min(0).max(1),
    ethicalScore: z.number().min(0).max(1),

    // Targeting Features
    industryType: z.string(),
    companySize: z.enum(['small', 'medium', 'large']),
    targetDepartment: z.string(),

    // Temporal Features
    sendTimeHour: z.number().min(0).max(23),
    dayOfWeek: z.number().min(0).max(6),

    // Affiliate Features
    affiliateLinkCount: z.number().min(0),
    affiliateConversionRate: z.number().min(0).max(1)
  })
});

class FeatureEngineeringService {
  private static instance: FeatureEngineeringService;
  private featureRegistry: Map<string, z.infer<typeof FeatureSchema>> = new Map();

  private constructor() {}

  // Singleton instance
  public static getInstance(): FeatureEngineeringService {
    if (!FeatureEngineeringService.instance) {
      FeatureEngineeringService.instance = new FeatureEngineeringService();
    }
    return FeatureEngineeringService.instance;
  }

  // Register a new feature
  public registerFeature(
    feature: z.infer<typeof FeatureSchema>
  ): void {
    const validatedFeature = FeatureSchema.parse(feature);
    
    this.featureRegistry.set(feature.name, validatedFeature);
    
    logger.log('info', 'Feature Registered', {
      featureName: feature.name,
      featureType: feature.type
    });
  }

  // Preprocess numerical features
  public preprocessNumericalFeature(
    data: number[],
    method: 'standard' | 'minmax' = 'standard'
  ): tf.Tensor {
    const tensor = tf.tensor(data);
    
    if (method === 'standard') {
      const mean = tensor.mean();
      const std = tensor.std();
      return tensor.sub(mean).div(std);
    } else if (method === 'minmax') {
      const min = tensor.min();
      const max = tensor.max();
      return tensor.sub(min).div(max.sub(min));
    }
    
    return tensor;
  }

  // Encode categorical features
  public encodeCategoricalFeature(
    categories: string[],
    method: 'onehot' | 'embedding' = 'onehot'
  ): {
    encodedTensor: tf.Tensor;
    vocabulary: string[];
  } {
    const uniqueCategories = [...new Set(categories)];
    
    if (method === 'onehot') {
      const encodingMatrix = uniqueCategories.map((_, index) => 
        uniqueCategories.map(
          (_, i) => i === index ? 1 : 0
        )
      );
      
      return {
        encodedTensor: tf.tensor(encodingMatrix),
        vocabulary: uniqueCategories
      };
    }
    
    // Simple embedding (in a real scenario, you'd use more advanced techniques)
    const embeddingDim = 10;
    const embeddings = uniqueCategories.map(() => 
      Array.from({ length: embeddingDim }, () => Math.random())
    );
    
    return {
      encodedTensor: tf.tensor(embeddings),
      vocabulary: uniqueCategories
    };
  }

  // Text feature embedding
  public async embedTextFeature(
    texts: string[],
    embeddingDimension: number = 100
  ): Promise<tf.Tensor> {
    // Placeholder for more advanced embedding techniques
    // In a production scenario, use pre-trained embeddings like Word2Vec or BERT
    const randomEmbeddings = texts.map(() => 
      Array.from({ length: embeddingDimension }, () => Math.random())
    );
    
    return tf.tensor(randomEmbeddings);
  }

  // Temporal feature engineering
  public extractTemporalFeatures(
    timestamps: Date[]
  ): {
    dayOfWeek: number[];
    hourOfDay: number[];
    monthOfYear: number[];
  } {
    return {
      dayOfWeek: timestamps.map(ts => ts.getDay()),
      hourOfDay: timestamps.map(ts => ts.getHours()),
      monthOfYear: timestamps.map(ts => ts.getMonth())
    };
  }

  // Feature importance and selection
  public calculateFeatureImportance(
    features: tf.Tensor,
    labels: tf.Tensor
  ): tf.Tensor {
    // Simple feature importance calculation using correlation
    const correlation = tf.tidy(() => {
      const featuresTransposed = features.transpose();
      const labelsTiled = labels.tile([features.shape[1], 1]);
      
      const covariance = tf.mean(
        featuresTransposed.mul(labelsTiled), 
        1
      );
      
      return covariance.abs();
    });
    
    return correlation;
  }

  // Create feature engineering pipeline
  public createFeatureEngineeringPipeline(
    config: z.infer<typeof FeatureEngineeringConfigSchema>
  ): (data: Record<string, any>) => tf.Tensor {
    const validatedConfig = FeatureEngineeringConfigSchema.parse(config);
    
    return (data: Record<string, any>) => {
      const processedFeatures = validatedConfig.features.map(feature => {
        const rawValue = data[feature.name];
        
        switch (feature.type) {
          case 'numerical':
            return this.preprocessNumericalFeature(
              rawValue, 
              feature.preprocessing?.normalization
            );
          case 'categorical':
            return this.encodeCategoricalFeature(
              rawValue, 
              feature.preprocessing?.encoding
            ).encodedTensor;
          // Add more feature type handling as needed
          default:
            return tf.tensor(rawValue);
        }
      });
      
      // Concatenate processed features
      return tf.concat(processedFeatures);
    };
  }

  public extractFeatures(
    campaignData: {
      campaignId: string;
      emailMetrics: {
        sent: number;
        opened: number;
        clicked: number;
        converted: number;
        unsubscribed: number;
      };
      contentDetails: {
        length: number;
        personalizedScore: number;
        ethicalScore: number;
      };
      targetingInfo: {
        industry: string;
        companySize: 'small' | 'medium' | 'large';
        department: string;
      };
      sendDetails: {
        hour: number;
        dayOfWeek: number;
      };
      affiliateDetails: {
        linkCount: number;
        conversionRate: number;
      };
    }
  ): z.infer<typeof FeatureVectorSchema> {
    try {
      const featureVector = FeatureVectorSchema.parse({
        campaignId: campaignData.campaignId,
        features: {
          // Engagement Rates
          openRate: campaignData.emailMetrics.opened / campaignData.emailMetrics.sent,
          clickRate: campaignData.emailMetrics.clicked / campaignData.emailMetrics.sent,
          conversionRate: campaignData.emailMetrics.converted / campaignData.emailMetrics.sent,
          unsubscribeRate: campaignData.emailMetrics.unsubscribed / campaignData.emailMetrics.sent,

          // Content Features
          contentLength: campaignData.contentDetails.length,
          personalizedScore: campaignData.contentDetails.personalizedScore,
          ethicalScore: campaignData.contentDetails.ethicalScore,

          // Targeting Features
          industryType: campaignData.targetingInfo.industry,
          companySize: campaignData.targetingInfo.companySize,
          targetDepartment: campaignData.targetingInfo.department,

          // Temporal Features
          sendTimeHour: campaignData.sendDetails.hour,
          dayOfWeek: campaignData.sendDetails.dayOfWeek,

          // Affiliate Features
          affiliateLinkCount: campaignData.affiliateDetails.linkCount,
          affiliateConversionRate: campaignData.affiliateDetails.conversionRate
        }
      });

      logger.log('info', 'Feature Vector Extracted', {
        campaignId: featureVector.campaignId,
        openRate: featureVector.features.openRate
      });

      return featureVector;
    } catch (error) {
      logger.log('error', 'Feature Extraction Failed', { error });
      throw error;
    }
  }

  public normalizeFeatures(
    featureVectors: z.infer<typeof FeatureVectorSchema>[]
  ): z.infer<typeof FeatureVectorSchema>[] {
    const featureRanges = this.calculateFeatureRanges(featureVectors);

    return featureVectors.map(vector => ({
      ...vector,
      features: Object.fromEntries(
        Object.entries(vector.features).map(([key, value]) => {
          const range = featureRanges[key];
          return [
            key, 
            typeof value === 'number' && range 
              ? (value - range.min) / (range.max - range.min) 
              : value
          ];
        })
      )
    }));
  }

  private calculateFeatureRanges(
    featureVectors: z.infer<typeof FeatureVectorSchema>[]
  ): Record<string, { min: number; max: number }> {
    const numericFeatures = [
      'openRate', 
      'clickRate', 
      'conversionRate', 
      'unsubscribeRate',
      'contentLength',
      'personalizedScore',
      'ethicalScore',
      'sendTimeHour',
      'dayOfWeek',
      'affiliateLinkCount',
      'affiliateConversionRate'
    ];

    return numericFeatures.reduce((ranges, feature) => {
      const values = featureVectors.map(
        vector => vector.features[feature] as number
      );

      ranges[feature] = {
        min: Math.min(...values),
        max: Math.max(...values)
      };

      return ranges;
    }, {});
  }
}

// Export singleton instance
export const featureEngineering = FeatureEngineeringService.getInstance();
