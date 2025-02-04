import { EmailCampaign } from '@/lib/db/models';
import { aiInferenceService, AIInferenceInput } from './ai-inference';
import { complianceService } from './compliance-service';
import { z } from 'zod';

// Campaign status types
export const CampaignStatusSchema = z.enum([
  'draft', 
  'scheduled', 
  'in_progress', 
  'completed', 
  'paused'
]);

// Campaign input schema
export const EmailCampaignInputSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  target: z.string().email("Invalid email address"),
  industry: z.string().min(2, "Industry must be at least 2 characters"),
  companySize: z.enum(['startup', 'small', 'medium', 'enterprise']),
  mentalHealthFocus: z.string().optional(),
  status: CampaignStatusSchema.default('draft')
});

export type CampaignStatus = z.infer<typeof CampaignStatusSchema>;
export type EmailCampaignInput = z.infer<typeof EmailCampaignInputSchema>;

export class EmailCampaignService {
  async createCampaign(input: EmailCampaignInput) {
    // Validate input
    const validatedInput = EmailCampaignInputSchema.parse(input);

    try {
      // Generate AI-powered email content
      const aiInput: AIInferenceInput = {
        industry: validatedInput.industry,
        companySize: validatedInput.companySize,
        mentalHealthFocus: validatedInput.mentalHealthFocus
      };

      const emailContent = await aiInferenceService.generateEmailContent(aiInput);

      // Create campaign
      const campaign = new EmailCampaign({
        ...validatedInput,
        content: {
          subject: emailContent.subject,
          body: emailContent.body,
          callToAction: emailContent.callToAction
        },
        performanceMetrics: {
          openRate: 0,
          clickRate: 0
        }
      });

      const savedCampaign = await campaign.save();

      // Log campaign creation
      await complianceService.logAction({
        campaignId: savedCampaign._id.toString(),
        action: 'draft',
        reason: 'Campaign created'
      });

      return savedCampaign;
    } catch (error) {
      console.error('Campaign Creation Error:', error);
      throw new Error('Failed to create email campaign');
    }
  }

  async getCampaigns(filters: Partial<EmailCampaignInput> = {}) {
    try {
      return await EmailCampaign.find(filters).sort({ createdAt: -1 });
    } catch (error) {
      console.error('Fetching Campaigns Error:', error);
      throw new Error('Failed to retrieve email campaigns');
    }
  }

  async updateCampaignStatus(campaignId: string, status: CampaignStatus) {
    try {
      const campaign = await EmailCampaign.findByIdAndUpdate(
        campaignId, 
        { status }, 
        { new: true }
      );

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Log status change
      await complianceService.logAction({
        campaignId,
        action: status,
        reason: `Campaign status updated to ${status}`
      });

      return campaign;
    } catch (error) {
      console.error('Campaign Status Update Error:', error);
      throw new Error('Failed to update campaign status');
    }
  }
}

export const emailCampaignService = new EmailCampaignService();
