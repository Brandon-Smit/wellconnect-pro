import { z } from 'zod';
import crypto from 'crypto';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';
import { configManager } from '../core/configurationManager';

// Affiliate Link Schema
const AffiliateLinkSchema = z.object({
  id: z.string().uuid(),
  originalUrl: z.string().url(),
  shortCode: z.string(),
  serviceCategory: z.enum([
    'mental_health', 
    'wellness', 
    'hr_support', 
    'professional_development'
  ]),
  ethicalScore: z.number().min(0).max(1).default(0.5),
  trackingParameters: z.record(z.string(), z.string()).optional(),
  createdAt: z.date(),
  lastUsedAt: z.date().optional(),
  clickCount: z.number().min(0).default(0),
  conversionCount: z.number().min(0).default(0)
});

// Conversion Tracking Schema
const ConversionTrackingSchema = z.object({
  linkId: z.string(),
  timestamp: z.date(),
  metadata: z.record(z.string(), z.any()).optional()
});

class AffiliateLinkManager {
  private static instance: AffiliateLinkManager;
  private affiliateLinks: Map<string, z.infer<typeof AffiliateLinkSchema>> = new Map();
  private conversionTracking: Map<string, z.infer<typeof ConversionTrackingSchema>[]> = new Map();

  private constructor() {
    // Initialize from configuration if needed
    const savedLinks = configManager.get('affiliateLinks') || [];
    savedLinks.forEach(link => this.registerAffiliateLink(link));
  }

  public static getInstance(): AffiliateLinkManager {
    if (!AffiliateLinkManager.instance) {
      AffiliateLinkManager.instance = new AffiliateLinkManager();
    }
    return AffiliateLinkManager.instance;
  }

  // Register a new affiliate link
  public registerAffiliateLink(
    linkDetails: Omit<z.infer<typeof AffiliateLinkSchema>, 'id' | 'createdAt' | 'shortCode'> & {
      id?: string;
      shortCode?: string;
    }
  ): z.infer<typeof AffiliateLinkSchema> {
    // Generate unique identifiers
    const id = linkDetails.id || crypto.randomUUID();
    const shortCode = linkDetails.shortCode || this.generateShortCode();

    const affiliateLink = AffiliateLinkSchema.parse({
      ...linkDetails,
      id,
      shortCode,
      createdAt: new Date(),
      ethicalScore: this.calculateEthicalScore(linkDetails.originalUrl)
    });

    this.affiliateLinks.set(id, affiliateLink);

    logger.log('info', 'Affiliate Link Registered', {
      serviceCategory: affiliateLink.serviceCategory,
      shortCode: affiliateLink.shortCode
    });

    // Publish affiliate link registration event
    eventBus.publish(EventTypes.AFFILIATE_LINK_REGISTERED, affiliateLink);

    return affiliateLink;
  }

  // Generate a unique short code
  private generateShortCode(length = 6): string {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
  }

  // Calculate ethical score for a link
  private calculateEthicalScore(url: string): number {
    const mentalHealthKeywords = [
      'therapy', 'counseling', 'mental-health', 'wellness', 
      'support', 'healing', 'psychology'
    ];

    const keywordScore = mentalHealthKeywords.reduce((score, keyword) => {
      return url.toLowerCase().includes(keyword) ? score + 0.1 : score;
    }, 0.5);

    // Ensure score is between 0 and 1
    return Math.min(Math.max(keywordScore, 0), 1);
  }

  // Track link click
  public trackLinkClick(linkId: string): z.infer<typeof AffiliateLinkSchema> {
    const link = this.affiliateLinks.get(linkId);
    
    if (!link) {
      throw new Error(`Affiliate link not found: ${linkId}`);
    }

    // Update click tracking
    const updatedLink = {
      ...link,
      clickCount: link.clickCount + 1,
      lastUsedAt: new Date()
    };

    this.affiliateLinks.set(linkId, updatedLink);

    // Publish link click event
    eventBus.publish(EventTypes.AFFILIATE_LINK_CLICKED, updatedLink);

    return updatedLink;
  }

  // Track conversion
  public trackConversion(
    linkId: string, 
    metadata?: Record<string, any>
  ): z.infer<typeof AffiliateLinkSchema> {
    const link = this.affiliateLinks.get(linkId);
    
    if (!link) {
      throw new Error(`Affiliate link not found: ${linkId}`);
    }

    // Update conversion tracking
    const conversionEntry = ConversionTrackingSchema.parse({
      linkId,
      timestamp: new Date(),
      metadata
    });

    const existingConversions = this.conversionTracking.get(linkId) || [];
    this.conversionTracking.set(linkId, [...existingConversions, conversionEntry]);

    // Update link conversion count
    const updatedLink = {
      ...link,
      conversionCount: link.conversionCount + 1,
      lastUsedAt: new Date()
    };

    this.affiliateLinks.set(linkId, updatedLink);

    // Publish conversion tracking event
    eventBus.publish(EventTypes.AFFILIATE_LINK_CONVERTED, {
      link: updatedLink,
      conversion: conversionEntry
    });

    return updatedLink;
  }

  // Generate affiliate link performance report
  public generatePerformanceReport(
    options: {
      startDate?: Date;
      endDate?: Date;
      serviceCategory?: z.infer<typeof AffiliateLinkSchema>['serviceCategory'];
    } = {}
  ): {
    totalLinks: number;
    linkPerformance: Array<z.infer<typeof AffiliateLinkSchema> & {
      conversionRate: number;
    }>;
    topPerformingCategories: Record<string, number>;
  } {
    const { startDate, endDate, serviceCategory } = options;

    const filteredLinks = Array.from(this.affiliateLinks.values()).filter(
      link => 
        (!startDate || link.createdAt >= startDate) &&
        (!endDate || link.createdAt <= endDate) &&
        (!serviceCategory || link.serviceCategory === serviceCategory)
    );

    const linkPerformance = filteredLinks.map(link => {
      const conversions = this.conversionTracking.get(link.id) || [];
      const filteredConversions = conversions.filter(
        conv => 
          (!startDate || conv.timestamp >= startDate) &&
          (!endDate || conv.timestamp <= endDate)
      );

      return {
        ...link,
        conversionRate: link.clickCount > 0 
          ? filteredConversions.length / link.clickCount 
          : 0
      };
    });

    // Sort by conversion rate
    linkPerformance.sort((a, b) => b.conversionRate - a.conversionRate);

    // Calculate top performing categories
    const topPerformingCategories = linkPerformance.reduce((acc, link) => {
      acc[link.serviceCategory] = 
        (acc[link.serviceCategory] || 0) + link.conversionCount;
      return acc;
    }, {} as Record<string, number>);

    const report = {
      totalLinks: filteredLinks.length,
      linkPerformance,
      topPerformingCategories
    };

    // Publish performance report event
    eventBus.publish(EventTypes.AFFILIATE_PERFORMANCE_REPORT_GENERATED, report);

    return report;
  }

  // Retrieve affiliate link by ID or short code
  public getAffiliateLink(
    identifier: string
  ): z.infer<typeof AffiliateLinkSchema> | undefined {
    // Check by ID
    const byId = this.affiliateLinks.get(identifier);
    if (byId) return byId;

    // Check by short code
    const byShortCode = Array.from(this.affiliateLinks.values())
      .find(link => link.shortCode === identifier);

    return byShortCode;
  }

  // Remove an affiliate link
  public removeAffiliateLink(linkId: string): boolean {
    const link = this.affiliateLinks.get(linkId);
    
    if (link) {
      this.affiliateLinks.delete(linkId);
      this.conversionTracking.delete(linkId);

      logger.log('info', 'Affiliate Link Removed', {
        serviceCategory: link.serviceCategory,
        shortCode: link.shortCode
      });

      // Publish link removal event
      eventBus.publish(EventTypes.AFFILIATE_LINK_REMOVED, link);

      return true;
    }

    return false;
  }

  // Get all registered affiliate links
  public getAllAffiliateLinks(): z.infer<typeof AffiliateLinkSchema>[] {
    return Array.from(this.affiliateLinks.values());
  }
}

export const affiliateLinkManager = AffiliateLinkManager.getInstance();
