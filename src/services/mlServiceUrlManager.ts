import { z } from 'zod';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';

// Service URL Schema
const ServiceUrlSchema = z.object({
  id: z.string().uuid(),
  url: z.string().url('Invalid URL'),
  category: z.enum([
    'mental_health', 
    'wellness', 
    'corporate_services', 
    'employee_support'
  ]),
  priority: z.number().min(1).max(10).default(5),
  metadata: z.object({
    lastScraped: z.date().optional(),
    contentHash: z.string().optional(),
    extractionStatus: z.enum(['pending', 'success', 'failed']).default('pending')
  }).optional(),
  mlTrainingData: z.object({
    extractedContent: z.string().optional(),
    processedTokens: z.number().optional(),
    trainingWeight: z.number().min(0).max(1).optional()
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Service URL Management Service
export class MLServiceUrlManager {
  private static instance: MLServiceUrlManager;
  private serviceUrls: Map<string, z.infer<typeof ServiceUrlSchema>> = new Map();

  private constructor() {
    this.initializeEventListeners();
  }

  public static getInstance(): MLServiceUrlManager {
    if (!this.instance) {
      this.instance = new MLServiceUrlManager();
    }
    return this.instance;
  }

  private initializeEventListeners() {
    // Listen for ML training events
    eventBus.subscribe(
      EventTypes.ML_SERVICE_URL_ADDED, 
      this.processServiceUrl.bind(this)
    );
  }

  public addServiceUrl(
    urlData: Omit<z.infer<typeof ServiceUrlSchema>, 'id' | 'createdAt' | 'updatedAt' | 'metadata' | 'mlTrainingData'>
  ): z.infer<typeof ServiceUrlSchema> {
    try {
      const newServiceUrl = ServiceUrlSchema.parse({
        id: uuidv4(),
        ...urlData,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          extractionStatus: 'pending'
        }
      });

      this.serviceUrls.set(newServiceUrl.id, newServiceUrl);

      logger.log('info', 'Service URL Added for ML Training', {
        urlId: newServiceUrl.id,
        url: newServiceUrl.url,
        category: newServiceUrl.category
      });

      // Trigger processing
      eventBus.publish(EventTypes.ML_SERVICE_URL_ADDED, newServiceUrl);

      return newServiceUrl;
    } catch (error) {
      logger.log('error', 'Service URL Addition Failed', { error });
      throw error;
    }
  }

  private async processServiceUrl(
    serviceUrl: z.infer<typeof ServiceUrlSchema>
  ): Promise<void> {
    try {
      // Fetch webpage content
      const response = await axios.get(serviceUrl.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'WellConnect Pro ML Service URL Extractor'
        }
      });

      // Basic content extraction and preprocessing
      const extractedContent = this.extractMainContent(response.data);
      const processedTokens = this.tokenizeContent(extractedContent);

      // Update service URL with extracted data
      const updatedServiceUrl = ServiceUrlSchema.parse({
        ...serviceUrl,
        metadata: {
          ...serviceUrl.metadata,
          lastScraped: new Date(),
          extractionStatus: 'success'
        },
        mlTrainingData: {
          extractedContent,
          processedTokens: processedTokens.length,
          trainingWeight: this.calculateTrainingWeight(serviceUrl.priority)
        },
        updatedAt: new Date()
      });

      this.serviceUrls.set(serviceUrl.id, updatedServiceUrl);

      // Publish ML training event
      eventBus.publish(EventTypes.ML_SERVICE_URL_PROCESSED, {
        serviceUrlId: serviceUrl.id,
        extractedContent,
        category: serviceUrl.category
      });

      logger.log('info', 'Service URL Processed for ML Training', {
        urlId: serviceUrl.id,
        processedTokens: processedTokens.length
      });
    } catch (error) {
      // Handle extraction failures
      const failedServiceUrl = ServiceUrlSchema.parse({
        ...serviceUrl,
        metadata: {
          ...serviceUrl.metadata,
          extractionStatus: 'failed'
        },
        updatedAt: new Date()
      });

      this.serviceUrls.set(serviceUrl.id, failedServiceUrl);

      logger.log('error', 'Service URL Processing Failed', { 
        urlId: serviceUrl.id,
        error 
      });
    }
  }

  private extractMainContent(htmlContent: string): string {
    // Basic content extraction logic
    // In a real-world scenario, use more sophisticated extraction
    const contentRegex = /&lt;body&gt;([\s\S]*?)&lt;\/body&gt;/i;
    const match = htmlContent.match(contentRegex);
    return match ? match[1] : htmlContent;
  }

  private tokenizeContent(content: string): string[] {
    // Basic tokenization
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  private calculateTrainingWeight(priority: number): number {
    // Convert priority to training weight
    return priority / 10;
  }

  public getServiceUrl(urlId: string): z.infer<typeof ServiceUrlSchema> {
    const url = this.serviceUrls.get(urlId);
    if (!url) {
      throw new Error('Service URL not found');
    }
    return url;
  }

  public getAllServiceUrls(): Array<z.infer<typeof ServiceUrlSchema>> {
    return Array.from(this.serviceUrls.values());
  }

  public getServiceUrlsByCategory(
    category: z.infer<typeof ServiceUrlSchema>['category']
  ): Array<z.infer<typeof ServiceUrlSchema>> {
    return Array.from(this.serviceUrls.values())
      .filter(url => url.category === category);
  }
}

// Export singleton instance
export const mlServiceUrlManager = MLServiceUrlManager.getInstance();
