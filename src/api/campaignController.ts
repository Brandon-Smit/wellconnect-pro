import express, { Request, Response } from 'express';
import { z } from 'zod';
import { campaignExecutionManager } from '../services/campaignExecutionManager';
import { affiliateLinkOptimizer } from '../services/affiliateLinkOptimizer';
import { contextualUrlProcessor } from '../services/contextualUrlProcessor';
import { logger } from '../core/loggingSystem';

// Comprehensive Request Validation Schema
const CampaignConfigurationSchema = z.object({
  // Affiliate Link Configuration
  affiliateLink: z.object({
    originalLink: z.string().url('Invalid affiliate link'),
    variations: z.array(z.object({
      url: z.string().url('Invalid URL variation'),
      type: z.enum(['default', 'tracking', 'campaign', 'source']),
      parameters: z.record(z.string(), z.string()).optional()
    })).min(1, 'At least one link variation is required'),
    
    // Optional contextual URLs
    contextualUrls: z.array(z.object({
      url: z.string().url('Invalid contextual URL'),
      category: z.enum([
        'service_overview', 
        'pricing', 
        'case_studies', 
        'testimonials', 
        'blog_post', 
        'research_paper',
        'other'
      ]),
      description: z.string().optional()
    })).optional()
  }),

  // Service URL Configuration
  serviceUrl: z.string().url('Invalid service URL'),

  // Targeting Configuration
  targeting: z.object({
    countries: z.array(z.object({
      countryCode: z.string().length(2),
      industryFocus: z.array(z.string()).optional(),
      companySizeTarget: z.enum(['small', 'medium', 'large', 'all']).optional()
    })).min(1, 'Select at least one country')
  }),

  // Email Platform Configuration
  emailPlatform: z.object({
    provider: z.enum([
      'smtp', 
      'sendgrid', 
      'mailgun', 
      'amazon_ses', 
      'zoho_mail', 
      'custom'
    ]),
    configuration: z.object({
      host: z.string().optional(),
      port: z.number().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      apiKey: z.string().optional(),
      region: z.string().optional(),
      zohoMailDomain: z.string().optional()
    }),
    dailyEmailLimit: z.number().min(1).max(50).default(50)
  })
});

export class CampaignController {
  private router: express.Router;

  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // Campaign Configuration Endpoint
    this.router.post('/configure', this.configureCampaign.bind(this));
    
    // Campaign Status Endpoint
    this.router.get('/status/:campaignId', this.getCampaignStatus.bind(this));
    
    // Campaign Performance Endpoint
    this.router.get('/performance/:campaignId', this.getCampaignPerformance.bind(this));
  }

  private async configureCampaign(req: Request, res: Response) {
    try {
      // Validate incoming request
      const campaignConfig = CampaignConfigurationSchema.parse(req.body);

      // Process contextual URLs if present
      let contextualUrlInsights = null;
      if (campaignConfig.affiliateLink.contextualUrls?.length) {
        contextualUrlInsights = await contextualUrlProcessor.processContextualUrls(
          campaignConfig.affiliateLink.contextualUrls
        );
      }

      // Add Affiliate Link Variations
      const affiliateLinkConfig = affiliateLinkOptimizer.addAffiliateLinkConfiguration(
        campaignConfig.affiliateLink.originalLink,
        campaignConfig.serviceUrl,
        campaignConfig.affiliateLink.variations
      );

      // Create Campaign with Contextual Insights
      const campaign = campaignExecutionManager.createCampaign({
        affiliateLinkId: affiliateLinkConfig.id,
        serviceUrl: campaignConfig.serviceUrl,
        targetCountries: campaignConfig.targeting.countries,
        dailyEmailLimit: campaignConfig.emailPlatform.dailyEmailLimit,
        emailPlatform: {
          provider: campaignConfig.emailPlatform.provider,
          configuration: campaignConfig.emailPlatform.configuration
        },
        // Include contextual URL insights
        contextualUrlInsights
      });

      // Log successful campaign creation
      logger.log('info', 'Campaign Configured Successfully', {
        campaignId: campaign.id,
        serviceUrl: campaign.serviceUrl,
        contextualUrlsProcessed: contextualUrlInsights?.summary.totalUrlsProcessed || 0
      });

      // Respond with campaign details and contextual insights
      res.status(201).json({
        message: 'Campaign Configured Successfully',
        campaignId: campaign.id,
        status: campaign.status,
        contextualUrlInsights
      });
    } catch (error) {
      // Handle validation and configuration errors
      logger.log('error', 'Campaign Configuration Failed', { error });

      if (error instanceof z.ZodError) {
        // Detailed validation error response
        res.status(400).json({
          message: 'Invalid Campaign Configuration',
          errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        // Generic error response
        res.status(500).json({
          message: 'Internal Server Error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  private async getCampaignStatus(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      // Retrieve campaign status
      // Note: This would require extending campaignExecutionManager
      const campaignStatus = campaignExecutionManager.getCampaignStatus(campaignId);

      res.status(200).json({
        campaignId,
        status: campaignStatus.status,
        emailsSent: campaignStatus.emailsSent,
        startedAt: campaignStatus.startedAt
      });
    } catch (error) {
      logger.log('error', 'Campaign Status Retrieval Failed', { error });
      res.status(404).json({
        message: 'Campaign Not Found',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async getCampaignPerformance(req: Request, res: Response) {
    try {
      const { campaignId } = req.params;

      // Retrieve campaign performance metrics
      // Note: This would require extending campaignExecutionManager
      const performanceMetrics = campaignExecutionManager.getCampaignPerformance(campaignId);

      res.status(200).json({
        campaignId,
        totalEmailsSent: performanceMetrics.totalEmailsSent,
        uniqueClicks: performanceMetrics.uniqueClicks,
        conversionRate: performanceMetrics.conversionRate
      });
    } catch (error) {
      logger.log('error', 'Campaign Performance Retrieval Failed', { error });
      res.status(404).json({
        message: 'Campaign Performance Not Found',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Expose router for app integration
  public getRouter(): express.Router {
    return this.router;
  }
}

// Create and export singleton instance
export const campaignController = new CampaignController();
