import mongoose from 'mongoose';
import { emailCampaignService } from '@/lib/services/email-campaign-service';
import { aiInferenceService } from '@/lib/services/ai-inference';
import { EmailCampaign } from '@/lib/db/models';

// Mock dependencies
jest.mock('@/lib/services/ai-inference');
const mockedAIService = aiInferenceService as jest.Mocked<typeof aiInferenceService>;

describe('Email Campaign Service', () => {
  beforeAll(async () => {
    const mongoUri = global.__MONGO_URI__;
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 30000);

  beforeEach(async () => {
    await EmailCampaign.deleteMany({});
    
    // Setup mock for AI inference
    mockedAIService.generateEmailContent.mockResolvedValue({
      subject: 'Test Subject',
      body: 'Test Body',
      callToAction: 'Test CTA'
    });
  }, 30000);

  test('creates a campaign successfully', async () => {
    const campaign = await emailCampaignService.createCampaign({
      name: 'Test Campaign',
      target: 'test@example.com',
      industry: 'technology',
      companySize: 'medium'
    });

    expect(campaign.name).toBe('Test Campaign');
    expect(campaign.content.subject).toBe('Test Subject');
    expect(campaign.status).toBe('draft');
  }, 30000);

  test('retrieves campaigns', async () => {
    // Create multiple campaigns
    await emailCampaignService.createCampaign({
      name: 'Campaign 1',
      target: 'test1@example.com',
      industry: 'technology',
      companySize: 'medium'
    });
    await emailCampaignService.createCampaign({
      name: 'Campaign 2',
      target: 'test2@example.com',
      industry: 'healthcare',
      companySize: 'small'
    });

    const campaigns = await emailCampaignService.getCampaigns();
    expect(campaigns.length).toBe(2);
  }, 30000);

  test('updates campaign status', async () => {
    const campaign = await emailCampaignService.createCampaign({
      name: 'Test Campaign',
      target: 'test@example.com',
      industry: 'technology',
      companySize: 'medium'
    });

    const updatedCampaign = await emailCampaignService.updateCampaignStatus(
      campaign._id.toString(), 
      'scheduled'
    );

    expect(updatedCampaign.status).toBe('scheduled');
  }, 30000);

  test('throws error for invalid campaign creation', async () => {
    await expect(emailCampaignService.createCampaign({
      // @ts-ignore
      name: '',
      target: 'invalid-email',
      industry: '',
      companySize: 'medium'
    })).rejects.toThrow();
  }, 30000);
});
