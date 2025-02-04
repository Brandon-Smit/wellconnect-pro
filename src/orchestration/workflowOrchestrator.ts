import { z } from 'zod';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';
import { configManager } from '../core/configurationManager';
import { emailDiscoveryModule } from '../discovery/emailDiscoveryModule';
import { emailDispatchModule } from '../dispatch/emailDispatchModule';
import { affiliateLinkManager } from '../affiliate/affiliateLinkManager';
import { consentManagement } from '../compliance/consentManagement';

// Campaign Workflow Schema
const CampaignWorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  targetIndustries: z.array(z.string()),
  companySizes: z.array(z.enum(['small', 'medium', 'large'])),
  emailTemplate: z.object({
    subject: z.string(),
    body: z.string(),
    affiliateLinkId: z.string().optional()
  }),
  scheduleConfig: z.object({
    startDate: z.date(),
    endDate: z.date().optional(),
    dailyEmailLimit: z.number().min(1).max(100).default(50)
  }),
  performanceThresholds: z.object({
    minOpenRate: z.number().min(0).max(1).default(0.1),
    minClickRate: z.number().min(0).max(1).default(0.05),
    minConversionRate: z.number().min(0).max(1).default(0.02)
  }),
  createdAt: z.date(),
  updatedAt: z.date()
});

class WorkflowOrchestrator {
  private static instance: WorkflowOrchestrator;
  private campaigns: Map<string, z.infer<typeof CampaignWorkflowSchema>> = new Map();

  private constructor() {
    // Initialize from configuration if needed
    const savedCampaigns = configManager.get('campaigns') || [];
    savedCampaigns.forEach(campaign => this.createCampaign(campaign));
  }

  public static getInstance(): WorkflowOrchestrator {
    if (!WorkflowOrchestrator.instance) {
      WorkflowOrchestrator.instance = new WorkflowOrchestrator();
    }
    return WorkflowOrchestrator.instance;
  }

  // Create a new campaign workflow
  public createCampaign(
    campaignDetails: Omit<z.infer<typeof CampaignWorkflowSchema>, 
      'id' | 'createdAt' | 'updatedAt'> & {
        id?: string;
      }
  ): z.infer<typeof CampaignWorkflowSchema> {
    const campaign = CampaignWorkflowSchema.parse({
      ...campaignDetails,
      id: campaignDetails.id || crypto.randomUUID(),
      status: 'draft',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    this.campaigns.set(campaign.id, campaign);

    logger.log('info', 'Campaign Workflow Created', {
      campaignName: campaign.name,
      targetIndustries: campaign.targetIndustries
    });

    // Publish campaign creation event
    eventBus.publish(EventTypes.CAMPAIGN_WORKFLOW_CREATED, campaign);

    return campaign;
  }

  // Execute campaign workflow
  public async executeCampaign(campaignId: string): Promise<void> {
    const campaign = this.campaigns.get(campaignId);
    
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    // Update campaign status
    campaign.status = 'active';
    campaign.updatedAt = new Date();

    try {
      // Discover email contacts
      const emailContacts = await emailDiscoveryModule.discoverEmails(
        campaign.targetIndustries.join(' ')
      );

      // Filter contacts based on campaign criteria
      const filteredContacts = emailContacts.filter(contact => 
        campaign.targetIndustries.includes(contact.industry) &&
        campaign.companySizes.includes(contact.companySize)
      );

      // Prepare affiliate link
      const affiliateLink = campaign.emailTemplate.affiliateLinkId
        ? affiliateLinkManager.getAffiliateLink(campaign.emailTemplate.affiliateLinkId)
        : undefined;

      // Send emails
      const emailResults = await Promise.all(
        filteredContacts.slice(0, campaign.scheduleConfig.dailyEmailLimit).map(
          async (contact) => {
            // Check consent
            const consentCheck = consentManagement.checkConsent(
              contact.email, 
              'affiliate_communication'
            );

            if (!consentCheck.isValid) {
              return null;
            }

            try {
              return await emailDispatchModule.sendEmail({
                to: contact.email,
                subject: campaign.emailTemplate.subject,
                html: campaign.emailTemplate.body,
                affiliateLink: affiliateLink?.originalUrl
              });
            } catch (error) {
              logger.log('warn', 'Email Dispatch Failed', {
                recipient: contact.email,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              return null;
            }
          }
        )
      );

      // Generate performance report
      const dispatchReport = emailDispatchModule.generateDispatchReport();
      const affiliateReport = affiliateLinkManager.generatePerformanceReport();

      // Check performance thresholds
      const performanceCheck = this.checkCampaignPerformance(
        dispatchReport, 
        affiliateReport
      );

      // Update campaign status
      campaign.status = performanceCheck ? 'completed' : 'active';
      campaign.updatedAt = new Date();

      // Publish campaign execution event
      eventBus.publish(EventTypes.CAMPAIGN_WORKFLOW_EXECUTED, {
        campaignId,
        dispatchReport,
        affiliateReport,
        performanceCheck
      });

    } catch (error) {
      // Handle workflow execution error
      logger.log('error', 'Campaign Workflow Execution Failed', {
        campaignId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Update campaign status
      campaign.status = 'paused';
      campaign.updatedAt = new Date();

      // Publish campaign failure event
      eventBus.publish(EventTypes.CAMPAIGN_WORKFLOW_FAILED, {
        campaignId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  // Check campaign performance against thresholds
  private checkCampaignPerformance(
    dispatchReport: ReturnType<typeof emailDispatchModule.generateDispatchReport>,
    affiliateReport: ReturnType<typeof affiliateLinkManager.generatePerformanceReport>
  ): boolean {
    const { openRate, clickRate } = dispatchReport;
    const topPerformingLink = affiliateReport.linkPerformance[0];

    return (
      openRate >= 0.1 && // 10% open rate
      clickRate >= 0.05 && // 5% click rate
      (topPerformingLink?.conversionRate || 0) >= 0.02 // 2% conversion rate
    );
  }

  // Pause a campaign
  public pauseCampaign(campaignId: string): z.infer<typeof CampaignWorkflowSchema> {
    const campaign = this.campaigns.get(campaignId);
    
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    campaign.status = 'paused';
    campaign.updatedAt = new Date();

    // Publish campaign pause event
    eventBus.publish(EventTypes.CAMPAIGN_WORKFLOW_PAUSED, campaign);

    return campaign;
  }

  // Resume a paused campaign
  public resumeCampaign(campaignId: string): z.infer<typeof CampaignWorkflowSchema> {
    const campaign = this.campaigns.get(campaignId);
    
    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    campaign.status = 'active';
    campaign.updatedAt = new Date();

    // Publish campaign resume event
    eventBus.publish(EventTypes.CAMPAIGN_WORKFLOW_RESUMED, campaign);

    return campaign;
  }

  // Get campaign by ID
  public getCampaign(
    campaignId: string
  ): z.infer<typeof CampaignWorkflowSchema> | undefined {
    return this.campaigns.get(campaignId);
  }

  // List all campaigns
  public listCampaigns(
    filters: {
      status?: z.infer<typeof CampaignWorkflowSchema>['status'];
    } = {}
  ): z.infer<typeof CampaignWorkflowSchema>[] {
    return Array.from(this.campaigns.values())
      .filter(campaign => 
        !filters.status || campaign.status === filters.status
      );
  }

  // Remove a campaign
  public removeCampaign(campaignId: string): boolean {
    const campaign = this.campaigns.get(campaignId);
    
    if (campaign) {
      this.campaigns.delete(campaignId);

      // Publish campaign removal event
      eventBus.publish(EventTypes.CAMPAIGN_WORKFLOW_REMOVED, campaign);

      return true;
    }

    return false;
  }
}

export const workflowOrchestrator = WorkflowOrchestrator.getInstance();
