import { v4 as uuidv4 } from 'uuid';
import { emailDiscoveryService } from './emailDiscoveryService';
import { contentGenerationService } from './contentGenerationService';
import { dispatchService } from './dispatchService';
import { performanceTrackingService } from './performanceTrackingService';
import { complianceService } from './complianceService';
import { Campaign, validateCampaign } from '../lib/validations/campaignSchema';

export class CampaignOrchestrator {
  async createAndExecuteCampaign(campaignConfig: Partial<Campaign>): Promise<string> {
    // Validate campaign configuration
    const campaign = validateCampaign({
      ...campaignConfig,
      id: uuidv4(),
      status: 'draft'
    });

    // Discover potential contacts
    const contacts = await emailDiscoveryService.discoverContacts({
      industry: campaign.targetIndustries[0],
      minCompanySize: campaign.companySize?.min,
      maxCompanySize: campaign.companySize?.max,
      roles: ['HR', 'People', 'Talent']
    });

    // Track campaign start
    const campaignTracker = performanceTrackingService.startCampaign(campaign.id);

    // Process contacts
    for (const contact of contacts) {
      // Compliance check
      if (complianceService.isEligibleForOutreach(contact)) {
        try {
          // Generate personalized content
          const emailContent = await contentGenerationService.generateEmailContent(
            contact, 
            campaign.affiliateLink.url
          );

          // Dispatch email
          const dispatchResult = await dispatchService.sendEmail({
            to: contact.email,
            subject: emailContent.subject,
            body: emailContent.body,
            campaignId: campaign.id
          });

          // Track performance
          campaignTracker.recordEmailDispatch(dispatchResult);

        } catch (error) {
          // Log and handle individual email failures
          console.error(`Email dispatch failed for ${contact.email}:`, error);
          campaignTracker.recordFailure(contact.email);
        }

        // Respect daily email limit
        if (campaignTracker.emailsSent >= campaign.schedule.dailyEmailLimit) {
          break;
        }
      }
    }

    // Finalize campaign
    const finalReport = campaignTracker.generateReport();
    performanceTrackingService.saveCampaignReport(campaign.id, finalReport);

    return campaign.id;
  }

  async pauseCampaign(campaignId: string) {
    performanceTrackingService.pauseCampaign(campaignId);
  }

  async resumeCampaign(campaignId: string) {
    performanceTrackingService.resumeCampaign(campaignId);
  }

  async getCampaignReport(campaignId: string) {
    return performanceTrackingService.getCampaignReport(campaignId);
  }
}

export const campaignOrchestrator = new CampaignOrchestrator();
