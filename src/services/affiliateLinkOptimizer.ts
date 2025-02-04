import { z } from 'zod';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';

// Affiliate Link Variation Schema
const AffiliateLinkVariationSchema = z.object({
  id: z.string(),
  originalLink: z.string().url('Invalid affiliate link'),
  variations: z.array(z.object({
    url: z.string().url('Invalid URL variation'),
    parameters: z.record(z.string(), z.string()).optional(),
    type: z.enum([
      'default', 
      'tracking', 
      'campaign', 
      'source', 
      'medium'
    ]).default('default'),
    performanceMetrics: z.object({
      clicks: z.number().min(0).default(0),
      conversions: z.number().min(0).default(0),
      conversionRate: z.number().min(0).max(1).default(0)
    }).optional()
  })),
  serviceUrl: z.string().url('Invalid service URL'),
  createdAt: z.date(),
  lastOptimizedAt: z.date().optional()
});

export class AffiliateLinkOptimizer {
  private static instance: AffiliateLinkOptimizer;
  private affiliateLinkVariations: Map<string, z.infer<typeof AffiliateLinkVariationSchema>> = new Map();

  private constructor() {
    this.initializeEventListeners();
  }

  public static getInstance(): AffiliateLinkOptimizer {
    if (!this.instance) {
      this.instance = new AffiliateLinkOptimizer();
    }
    return this.instance;
  }

  private initializeEventListeners() {
    // Listen for link performance tracking
    eventBus.subscribe(
      EventTypes.AFFILIATE_LINK_PERFORMANCE_TRACKED, 
      this.updateLinkPerformance.bind(this)
    );
  }

  public addAffiliateLinkConfiguration(
    originalLink: string, 
    serviceUrl: string,
    variations: Array<Omit<z.infer<typeof AffiliateLinkVariationSchema>['variations'][0], 'performanceMetrics'>>
  ): z.infer<typeof AffiliateLinkVariationSchema> {
    try {
      const linkConfig = AffiliateLinkVariationSchema.parse({
        id: this.generateUniqueId(),
        originalLink,
        serviceUrl,
        variations: variations.map(variation => ({
          ...variation,
          performanceMetrics: {
            clicks: 0,
            conversions: 0,
            conversionRate: 0
          }
        })),
        createdAt: new Date()
      });

      this.affiliateLinkVariations.set(linkConfig.id, linkConfig);

      logger.log('info', 'Affiliate Link Configuration Added', {
        linkId: linkConfig.id,
        variationsCount: linkConfig.variations.length
      });

      return linkConfig;
    } catch (error) {
      logger.log('error', 'Affiliate Link Configuration Failed', { error });
      throw error;
    }
  }

  private updateLinkPerformance(event: {
    linkId: string;
    variationUrl: string;
    eventType: 'click' | 'conversion';
  }) {
    try {
      const linkConfig = this.getAffiliateLinkConfiguration(event.linkId);
      
      const updatedVariations = linkConfig.variations.map(variation => {
        if (variation.url === event.variationUrl) {
          const updatedMetrics = {
            ...variation.performanceMetrics,
            clicks: event.eventType === 'click' 
              ? (variation.performanceMetrics?.clicks || 0) + 1 
              : variation.performanceMetrics?.clicks,
            conversions: event.eventType === 'conversion'
              ? (variation.performanceMetrics?.conversions || 0) + 1
              : variation.performanceMetrics?.conversions
          };

          // Recalculate conversion rate
          updatedMetrics.conversionRate = updatedMetrics.conversions / 
            (updatedMetrics.clicks || 1);

          return { ...variation, performanceMetrics: updatedMetrics };
        }
        return variation;
      });

      // Update the link configuration
      const updatedLinkConfig = {
        ...linkConfig,
        variations: updatedVariations,
        lastOptimizedAt: new Date()
      };

      this.affiliateLinkVariations.set(event.linkId, updatedLinkConfig);

      logger.log('info', 'Affiliate Link Performance Updated', {
        linkId: event.linkId,
        variationUrl: event.variationUrl,
        eventType: event.eventType
      });
    } catch (error) {
      logger.log('error', 'Link Performance Update Failed', { error });
    }
  }

  public getOptimalAffiliateLink(
    linkId: string
  ): string {
    const linkConfig = this.getAffiliateLinkConfiguration(linkId);
    
    // Find variation with highest conversion rate
    const optimalVariation = linkConfig.variations.reduce(
      (best, current) => {
        const bestRate = best.performanceMetrics?.conversionRate || 0;
        const currentRate = current.performanceMetrics?.conversionRate || 0;
        return currentRate > bestRate ? current : best;
      }
    );

    return optimalVariation.url;
  }

  public generateEmailContent(
    linkId: string, 
    serviceContext: any,
    contentGenerationParams: any
  ): string {
    const linkConfig = this.getAffiliateLinkConfiguration(linkId);
    const optimalLink = this.getOptimalAffiliateLink(linkId);

    // Here you would integrate with your content generation service
    // to create an email that incorporates the optimal affiliate link
    const emailContent = `
      Dear HR Professional,

      We've discovered an exceptional mental health service that could transform 
      your workplace wellness approach. 

      Learn more and get started: ${optimalLink}

      [Rest of the personalized email content]
    `;

    return emailContent;
  }

  private getAffiliateLinkConfiguration(
    linkId: string
  ): z.infer<typeof AffiliateLinkVariationSchema> {
    const linkConfig = this.affiliateLinkVariations.get(linkId);
    if (!linkConfig) {
      throw new Error('Affiliate Link Configuration not found');
    }
    return linkConfig;
  }

  private generateUniqueId(): string {
    return `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public getAllAffiliateLinkConfigurations(): Array<z.infer<typeof AffiliateLinkVariationSchema>> {
    return Array.from(this.affiliateLinkVariations.values());
  }
}

export const affiliateLinkOptimizer = AffiliateLinkOptimizer.getInstance();
