import axios from 'axios';
import * as cheerio from 'cheerio';
import { z } from 'zod';
import { logger } from '../core/loggingSystem';
import { errorTracker } from '../core/errorTracker';
import { configManager } from '../core/configurationManager';

// Affiliate Link Context Schema
const AffiliateContextSchema = z.object({
  url: z.string().url(),
  serviceName: z.string(),
  serviceDescription: z.string().optional(),
  mentalHealthFocus: z.enum([
    'individual_therapy', 
    'corporate_wellness', 
    'digital_counseling', 
    'stress_management', 
    'comprehensive_support'
  ]),
  keyFeatures: z.array(z.string()).optional(),
  ethicalScore: z.number().min(0).max(1).default(0.8)
});

type AffiliateContext = z.infer<typeof AffiliateContextSchema>;

export class AffiliateLinkContextAnalyzer {
  private static instance: AffiliateLinkContextAnalyzer;
  private contextCache: Map<string, AffiliateContext> = new Map();

  private constructor() {}

  public static getInstance(): AffiliateLinkContextAnalyzer {
    if (!AffiliateLinkContextAnalyzer.instance) {
      AffiliateLinkContextAnalyzer.instance = new AffiliateLinkContextAnalyzer();
    }
    return AffiliateLinkContextAnalyzer.instance;
  }

  // Comprehensive website context extraction
  public async extractAffiliateContext(
    affiliateUrl: string, 
    options: { 
      forceRefresh?: boolean, 
      timeout?: number 
    } = {}
  ): Promise<AffiliateContext> {
    const { forceRefresh = false, timeout = 10000 } = options;

    // Check cache first
    if (!forceRefresh) {
      const cachedContext = this.contextCache.get(affiliateUrl);
      if (cachedContext) return cachedContext;
    }

    try {
      // Fetch website content
      const response = await axios.get(affiliateUrl, { 
        timeout,
        headers: {
          'User-Agent': 'WellConnect Pro Affiliate Context Analyzer'
        }
      });

      // Parse HTML
      const $ = cheerio.load(response.data);

      // Extract context using advanced selectors
      const serviceContext = this.extractServiceContext($, affiliateUrl);

      // Validate extracted context
      const validatedContext = AffiliateContextSchema.parse({
        url: affiliateUrl,
        ...serviceContext
      });

      // Cache the result
      this.contextCache.set(affiliateUrl, validatedContext);

      return validatedContext;
    } catch (error) {
      // Handle extraction errors
      errorTracker.trackError({
        severity: 'MEDIUM',
        category: 'EXTERNAL_SERVICE',
        message: 'Affiliate Link Context Extraction Failed',
        context: { 
          affiliateUrl, 
          errorDetails: error 
        }
      });

      // Fallback to default context
      return this.createFallbackContext(affiliateUrl);
    }
  }

  // Advanced context extraction method
  private extractServiceContext(
    $: cheerio.Root, 
    affiliateUrl: string
  ): Omit<AffiliateContext, 'url'> {
    // Extract service name
    const serviceName = 
      $('h1').first().text() || 
      $('title').text().replace(' | Mental Health Services', '') ||
      new URL(affiliateUrl).hostname.replace('www.', '');

    // Extract service description
    const serviceDescription = 
      $('meta[name="description"]').attr('content') ||
      $('p.description, .service-description').first().text() ||
      'Comprehensive mental health support service';

    // Determine mental health focus
    const mentalHealthFocusKeywords: Record<AffiliateContext['mentalHealthFocus'], string[]> = {
      individual_therapy: ['individual', 'personal', 'one-on-one'],
      corporate_wellness: ['corporate', 'workplace', 'business', 'team'],
      digital_counseling: ['online', 'digital', 'remote', 'virtual'],
      stress_management: ['stress', 'anxiety', 'burnout', 'resilience'],
      comprehensive_support: ['comprehensive', 'holistic', 'complete']
    };

    const description = serviceDescription.toLowerCase();
    const mentalHealthFocus = (Object.entries(mentalHealthFocusKeywords).find(
      ([, keywords]) => keywords.some(keyword => description.includes(keyword))
    )?.[0] || 'comprehensive_support') as AffiliateContext['mentalHealthFocus'];

    // Extract key features
    const keyFeatures = $('ul.features li, .key-features')
      .map((_, el) => $(el).text().trim())
      .get()
      .filter(feature => feature.length > 0)
      .slice(0, 5);

    // Calculate ethical score based on content
    const ethicalScore = this.calculateEthicalScore($, description);

    return {
      serviceName,
      serviceDescription,
      mentalHealthFocus,
      keyFeatures,
      ethicalScore
    };
  }

  // Ethical scoring mechanism
  private calculateEthicalScore($: cheerio.Root, description: string): number {
    const ethicalKeywords = [
      'compassionate', 'supportive', 'confidential', 
      'professional', 'inclusive', 'non-judgmental'
    ];

    const positiveKeywordCount = ethicalKeywords.filter(keyword => 
      description.includes(keyword)
    ).length;

    // Check for explicit ethical statements
    const explicitEthicalStatement = 
      $('meta[name="ethical-statement"]').attr('content') ||
      $('p.ethical-statement').text();

    const baseScore = positiveKeywordCount / ethicalKeywords.length;
    const bonusForExplicitStatement = explicitEthicalStatement ? 0.2 : 0;

    return Math.min(baseScore + bonusForExplicitStatement, 1);
  }

  // Fallback context for failed extractions
  private createFallbackContext(affiliateUrl: string): AffiliateContext {
    return {
      url: affiliateUrl,
      serviceName: new URL(affiliateUrl).hostname.replace('www.', ''),
      serviceDescription: 'Mental health support service',
      mentalHealthFocus: 'comprehensive_support',
      keyFeatures: ['Professional counseling', 'Confidential support'],
      ethicalScore: 0.7
    };
  }

  // Periodic cache cleanup
  public cleanupContextCache(): void {
    const maxCacheSize = configManager.get('performanceThresholds').maxDailyEmails;
    
    if (this.contextCache.size > maxCacheSize) {
      // Remove oldest entries
      const oldestEntries = Array.from(this.contextCache.keys()).slice(0, this.contextCache.size - maxCacheSize);
      oldestEntries.forEach(key => this.contextCache.delete(key));

      logger.info('Affiliate Context Cache Cleaned', {
        removedEntries: oldestEntries.length
      });
    }
  }
}

export const affiliateLinkContextAnalyzer = AffiliateLinkContextAnalyzer.getInstance();
