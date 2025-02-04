import mongoose from 'mongoose';
import { EmailCampaign, ComplianceLog } from '@/lib/db/models';
import connectDB from '@/lib/db/connection';

describe('Database Integration', () => {
  beforeAll(async () => {
    const mongoUri = global.__MONGO_URI__;
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }, 10000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 10000);

  beforeEach(async () => {
    await EmailCampaign.deleteMany({});
    await ComplianceLog.deleteMany({});
  });

  test('Database Connection', async () => {
    expect(mongoose.connection.readyState).toBe(1); // Connected
  });

  test('Create Email Campaign', async () => {
    const campaignData = {
      name: 'Test Campaign',
      target: 'test@example.com',
      industry: 'technology',
      companySize: 'medium',
      content: {
        subject: 'Test Subject',
        body: 'Test Body'
      }
    };

    const campaign = new EmailCampaign(campaignData);
    const savedCampaign = await campaign.save();

    expect(savedCampaign.name).toBe(campaignData.name);
    expect(savedCampaign.target).toBe(campaignData.target);
  });

  test('Create Compliance Log', async () => {
    const logData = {
      campaignId: 'test-campaign-123',
      action: 'sent',
      timestamp: new Date()
    };

    const complianceLog = new ComplianceLog(logData);
    const savedLog = await complianceLog.save();

    expect(savedLog.campaignId).toBe(logData.campaignId);
    expect(savedLog.action).toBe(logData.action);
  });
});
