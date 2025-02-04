import { z } from 'zod';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';
import { affiliateLinkOptimizer } from './affiliateLinkOptimizer';
import { contentGenerationService } from '../content/contentGenerationService';
import { urlContextExtractor } from '../services/urlContextExtractor';
import nodemailer from 'nodemailer';
import { setTimeout } from 'timers/promises';
import * as AWS from 'aws-sdk';

// Campaign Configuration Schema
const CampaignConfigSchema = z.object({
  id: z.string(),
  affiliateLinkId: z.string(),
  serviceUrl: z.string().url(),
  targetCountries: z.array(z.object({
    countryCode: z.string().length(2),
    industryFocus: z.array(z.string()).optional(),
    companySizeTarget: z.enum(['small', 'medium', 'large', 'all']).optional()
  })),
  dailyEmailLimit: z.number().min(1).max(50).default(50),
  status: z.enum(['pending', 'running', 'paused', 'completed']).default('pending'),
  createdAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  emailPlatform: z.object({
    provider: z.enum(['smtp', 'zoho_mail', 'sendgrid', 'mailgun', 'amazon_ses']),
    configuration: z.object({
      host: z.string().optional(),
      port: z.number().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      apiKey: z.string().optional(),
      region: z.string().optional()
    })
  })
});

// Email Dispatch Record Schema
const EmailDispatchRecordSchema = z.object({
  campaignId: z.string(),
  emailsSent: z.number().min(0).default(0),
  emailsAttempted: z.number().min(0).default(0),
  lastSentAt: z.date().optional(),
  dailyDispatchLog: z.array(z.object({
    date: z.date(),
    count: z.number()
  })).default([])
});

export class CampaignExecutionManager {
  private static instance: CampaignExecutionManager;
  private campaigns: Map<string, z.infer<typeof CampaignConfigSchema>> = new Map();
  private dispatchRecords: Map<string, z.infer<typeof EmailDispatchRecordSchema>> = new Map();
  private emailTransport: nodemailer.Transporter;
  private campaignConfig: z.infer<typeof CampaignConfigSchema>;

  private constructor() {
    this.initializeEmailTransport();
    this.initializeEventListeners();
    this.startAutomaticCampaignExecution();
  }

  public static getInstance(): CampaignExecutionManager {
    if (!this.instance) {
      this.instance = new CampaignExecutionManager();
    }
    return this.instance;
  }

  private initializeEmailTransport() {
    // Enhanced email transport configuration
    switch (this.campaignConfig.emailPlatform.provider) {
      case 'smtp':
        this.emailTransport = nodemailer.createTransport({
          host: this.campaignConfig.emailPlatform.configuration.host,
          port: this.campaignConfig.emailPlatform.configuration.port || 587,
          secure: false,
          auth: {
            user: this.campaignConfig.emailPlatform.configuration.username,
            pass: this.campaignConfig.emailPlatform.configuration.password
          },
          rateLimit: this.campaignConfig.emailPlatform.dailyEmailLimit
        });
        break;

      case 'zoho_mail':
        this.emailTransport = nodemailer.createTransport({
          host: 'smtp.zoho.com',
          port: 587,
          secure: false,
          auth: {
            user: this.campaignConfig.emailPlatform.configuration.username,
            pass: this.campaignConfig.emailPlatform.configuration.password
          },
          tls: {
            rejectUnauthorized: true
          },
          rateLimit: this.campaignConfig.emailPlatform.dailyEmailLimit
        });
        break;

      case 'sendgrid':
        this.emailTransport = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: this.campaignConfig.emailPlatform.configuration.apiKey
          },
          rateLimit: this.campaignConfig.emailPlatform.dailyEmailLimit
        });
        break;

      case 'mailgun':
        this.emailTransport = nodemailer.createTransport({
          host: 'smtp.mailgun.org',
          port: 587,
          auth: {
            user: this.campaignConfig.emailPlatform.configuration.username,
            pass: this.campaignConfig.emailPlatform.configuration.apiKey
          },
          rateLimit: this.campaignConfig.emailPlatform.dailyEmailLimit
        });
        break;

      case 'amazon_ses':
        this.emailTransport = nodemailer.createTransport({
          SES: new AWS.SES({
            apiVersion: '2010-12-01',
            region: this.campaignConfig.emailPlatform.configuration.region
          }),
          rateLimit: this.campaignConfig.emailPlatform.dailyEmailLimit
        });
        break;

      default:
        throw new Error('Unsupported email provider');
    }
  }

  private initializeEventListeners() {
    // Listen for campaign start events
    eventBus.subscribe(
      EventTypes.CAMPAIGN_CONFIGURATION_COMPLETE, 
      this.startCampaign.bind(this)
    );
  }

  public createCampaign(
    campaignConfig: Omit<z.infer<typeof CampaignConfigSchema>, 'id' | 'status' | 'createdAt'>
  ): z.infer<typeof CampaignConfigSchema> {
    try {
      const campaign = CampaignConfigSchema.parse({
        id: this.generateUniqueCampaignId(),
        ...campaignConfig,
        status: 'pending',
        createdAt: new Date()
      });

      this.campaigns.set(campaign.id, campaign);
      this.campaignConfig = campaign;
      this.initializeDispatchRecord(campaign.id);

      // Trigger campaign configuration complete event
      eventBus.publish(EventTypes.CAMPAIGN_CONFIGURATION_COMPLETE, campaign);

      logger.log('info', 'Campaign Created', {
        campaignId: campaign.id,
        serviceUrl: campaign.serviceUrl
      });

      return campaign;
    } catch (error) {
      logger.log('error', 'Campaign Creation Failed', { error });
      throw error;
    }
  }

  private initializeDispatchRecord(campaignId: string) {
    const dispatchRecord = EmailDispatchRecordSchema.parse({
      campaignId
    });

    this.dispatchRecords.set(campaignId, dispatchRecord);
  }

  private async startCampaign(campaign: z.infer<typeof CampaignConfigSchema>) {
    try {
      // Update campaign status
      const updatedCampaign = {
        ...campaign,
        status: 'running',
        startedAt: new Date()
      };
      this.campaigns.set(campaign.id, updatedCampaign);

      // Extract service context
      const serviceContext = await urlContextExtractor.extractServiceContext(
        campaign.serviceUrl
      );

      // Start automated email dispatch
      await this.runAutomatedEmailCampaign(campaign.id, serviceContext);
    } catch (error) {
      logger.log('error', 'Campaign Start Failed', { 
        campaignId: campaign.id, 
        error 
      });
    }
  }

  private async runAutomatedEmailCampaign(
    campaignId: string, 
    serviceContext: any
  ) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const dispatchRecord = this.dispatchRecords.get(campaignId);
    if (!dispatchRecord) throw new Error('Dispatch record not found');

    // Fetch optimal affiliate link
    const affiliateLinkId = campaign.affiliateLinkId;
    const optimalAffiliateLink = affiliateLinkOptimizer.getOptimalAffiliateLink(
      affiliateLinkId
    );

    // Daily email dispatch loop
    while (
      campaign.status === 'running' && 
      dispatchRecord.emailsSent < campaign.dailyEmailLimit
    ) {
      try {
        // Find next email recipient
        const recipient = await this.findNextRecipient(campaign);
        
        if (!recipient) {
          // No more recipients, complete campaign
          this.completeCampaign(campaignId);
          break;
        }

        // Generate personalized email content
        const emailContent = contentGenerationService.generateEmailContent({
          serviceUrl: campaign.serviceUrl,
          targetCompany: recipient,
          communicationGoal: 'introduce_service',
          affiliateLink: optimalAffiliateLink
        });

        // Send email
        await this.sendEmail(recipient.contactEmail, emailContent);

        // Update dispatch record
        this.updateDispatchRecord(campaignId);

        // Ethical throttling: wait between emails
        await setTimeout(this.calculateEmailDelay());
      } catch (error) {
        logger.log('error', 'Email Dispatch Failed', { 
          campaignId, 
          error 
        });
        
        // Implement retry or skip logic
        continue;
      }
    }
  }

  private async findNextRecipient(
    campaign: z.infer<typeof CampaignConfigSchema>
  ): Promise<{ 
    name: string; 
    contactEmail: string; 
    industry: string 
  } | null> {
    // TODO: Implement recipient selection logic
    // This would typically query a database or external service
    // Filter by:
    // - Target countries
    // - Industry focus
    // - Company size
    // - Not previously contacted
    return null; // Placeholder
  }

  private async sendEmail(
    recipientEmail: string, 
    emailContent: string
  ): Promise<void> {
    await this.emailTransport.sendMail({
      from: process.env.EMAIL_FROM,
      to: recipientEmail,
      subject: 'Innovative Mental Health Support for Your Team',
      html: emailContent
    });
  }

  private updateDispatchRecord(campaignId: string) {
    const dispatchRecord = this.dispatchRecords.get(campaignId);
    if (!dispatchRecord) return;

    const updatedRecord = {
      ...dispatchRecord,
      emailsSent: dispatchRecord.emailsSent + 1,
      emailsAttempted: dispatchRecord.emailsAttempted + 1,
      lastSentAt: new Date(),
      dailyDispatchLog: [
        ...dispatchRecord.dailyDispatchLog,
        { 
          date: new Date(), 
          count: dispatchRecord.emailsSent + 1 
        }
      ]
    };

    this.dispatchRecords.set(campaignId, updatedRecord);
  }

  private completeCampaign(campaignId: string) {
    const campaign = this.campaigns.get(campaignId);
    if (!campaign) return;

    const completedCampaign = {
      ...campaign,
      status: 'completed',
      completedAt: new Date()
    };

    this.campaigns.set(campaignId, completedCampaign);

    logger.log('info', 'Campaign Completed', { 
      campaignId, 
      emailsSent: this.dispatchRecords.get(campaignId)?.emailsSent 
    });
  }

  private calculateEmailDelay(): number {
    // Randomized delay between emails to appear more natural
    // Prevents detection as automated system
    const baseDelay = 5 * 60 * 1000; // 5 minutes
    const jitter = Math.random() * 3 * 60 * 1000; // Up to 3 additional minutes
    return baseDelay + jitter;
  }

  private generateUniqueCampaignId(): string {
    return `camp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export const campaignExecutionManager = CampaignExecutionManager.getInstance();
