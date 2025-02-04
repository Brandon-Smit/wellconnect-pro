import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';

// Affiliate Link Schema
const AffiliateLinkSchema = z.object({
  id: z.string().uuid(),
  baseUrl: z.string().url('Invalid URL'),
  trackingParameters: z.array(z.object({
    key: z.string().min(1, 'Parameter key is required'),
    value: z.string()
  })).optional(),
  description: z.string().optional(),
  category: z.enum([
    'mental_health', 
    'wellness', 
    'corporate_services', 
    'employee_support'
  ]),
  performanceMetrics: z.object({
    clicks: z.number().min(0).default(0),
    conversions: z.number().min(0).default(0),
    revenue: z.number().min(0).default(0)
  }).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Affiliate Link Management Service
export class AffiliateLinkService {
  private static instance: AffiliateLinkService;
  private affiliateLinks: Map<string, z.infer<typeof AffiliateLinkSchema>> = new Map();

  private constructor() {
    this.initializeEventListeners();
  }

  public static getInstance(): AffiliateLinkService {
    if (!this.instance) {
      this.instance = new AffiliateLinkService();
    }
    return this.instance;
  }

  private initializeEventListeners() {
    // Listen for performance tracking events
    eventBus.subscribe(
      EventTypes.AFFILIATE_LINK_CLICKED, 
      this.updateLinkPerformance.bind(this)
    );
  }

  public createAffiliateLink(
    linkData: Omit<z.infer<typeof AffiliateLinkSchema>, 'id' | 'createdAt' | 'updatedAt'>
  ): z.infer<typeof AffiliateLinkSchema> {
    try {
      const newLink = AffiliateLinkSchema.parse({
        id: uuidv4(),
        ...linkData,
        createdAt: new Date(),
        updatedAt: new Date(),
        performanceMetrics: {
          clicks: 0,
          conversions: 0,
          revenue: 0
        }
      });

      this.affiliateLinks.set(newLink.id, newLink);

      logger.log('info', 'Affiliate Link Created', {
        linkId: newLink.id,
        baseUrl: newLink.baseUrl
      });

      return newLink;
    } catch (error) {
      logger.log('error', 'Affiliate Link Creation Failed', { error });
      throw error;
    }
  }

  public updateAffiliateLink(
    linkId: string, 
    updateData: Partial<Omit<z.infer<typeof AffiliateLinkSchema>, 'id'>>
  ): z.infer<typeof AffiliateLinkSchema> {
    const existingLink = this.affiliateLinks.get(linkId);
    if (!existingLink) {
      throw new Error('Affiliate Link not found');
    }

    try {
      const updatedLink = AffiliateLinkSchema.parse({
        ...existingLink,
        ...updateData,
        updatedAt: new Date()
      });

      this.affiliateLinks.set(linkId, updatedLink);

      logger.log('info', 'Affiliate Link Updated', {
        linkId,
        baseUrl: updatedLink.baseUrl
      });

      return updatedLink;
    } catch (error) {
      logger.log('error', 'Affiliate Link Update Failed', { error });
      throw error;
    }
  }

  public getAffiliateLink(linkId: string): z.infer<typeof AffiliateLinkSchema> {
    const link = this.affiliateLinks.get(linkId);
    if (!link) {
      throw new Error('Affiliate Link not found');
    }
    return link;
  }

  public getAllAffiliateLinks(): Array<z.infer<typeof AffiliateLinkSchema>> {
    return Array.from(this.affiliateLinks.values());
  }

  private updateLinkPerformance(event: {
    linkId: string;
    eventType: 'click' | 'conversion';
    revenue?: number;
  }) {
    try {
      const link = this.getAffiliateLink(event.linkId);
      
      const updatedMetrics = {
        ...link.performanceMetrics,
        clicks: event.eventType === 'click' 
          ? (link.performanceMetrics?.clicks || 0) + 1 
          : link.performanceMetrics?.clicks,
        conversions: event.eventType === 'conversion'
          ? (link.performanceMetrics?.conversions || 0) + 1
          : link.performanceMetrics?.conversions,
        revenue: event.revenue 
          ? (link.performanceMetrics?.revenue || 0) + event.revenue
          : link.performanceMetrics?.revenue
      };

      this.updateAffiliateLink(event.linkId, { 
        performanceMetrics: updatedMetrics 
      });

      logger.log('info', 'Affiliate Link Performance Updated', {
        linkId: event.linkId,
        eventType: event.eventType
      });
    } catch (error) {
      logger.log('error', 'Link Performance Update Failed', { error });
    }
  }

  public generateTrackingUrl(
    linkId: string, 
    additionalParams?: Record<string, string>
  ): string {
    const link = this.getAffiliateLink(linkId);
    
    const baseUrl = new URL(link.baseUrl);
    
    // Add tracking parameters from link configuration
    link.trackingParameters?.forEach(param => {
      baseUrl.searchParams.append(param.key, param.value);
    });

    // Add any additional parameters
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        baseUrl.searchParams.append(key, value);
      });
    }

    // Add unique tracking identifier
    baseUrl.searchParams.append('tracking_id', uuidv4());

    return baseUrl.toString();
  }
}

// Export singleton instance
export const affiliateLinkService = AffiliateLinkService.getInstance();
