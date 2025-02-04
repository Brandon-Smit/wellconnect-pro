import mongoose from 'mongoose';
import { complianceService } from '@/lib/services/compliance-service';
import { ComplianceLog } from '@/lib/db/models';

describe('Compliance Service', () => {
  const mockCampaignId = 'test-campaign-123';

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
    await ComplianceLog.deleteMany({});
  }, 30000);

  test('logs compliance action successfully', async () => {
    const log = await complianceService.logAction({
      campaignId: mockCampaignId,
      action: 'sent',
      reason: 'Test email sent'
    });

    expect(log.campaignId).toBe(mockCampaignId);
    expect(log.action).toBe('sent');
    expect(log.timestamp).toBeTruthy();
  }, 30000);

  test('retrieves campaign compliance logs', async () => {
    // Create multiple logs
    await complianceService.logAction({
      campaignId: mockCampaignId,
      action: 'sent'
    });
    await complianceService.logAction({
      campaignId: mockCampaignId,
      action: 'opened'
    });

    const logs = await complianceService.getCampaignComplianceLogs(mockCampaignId);
    
    expect(logs.length).toBe(2);
    expect(logs[0].campaignId).toBe(mockCampaignId);
  }, 30000);

  test('calculates compliance metrics', async () => {
    await complianceService.logAction({
      campaignId: mockCampaignId,
      action: 'sent'
    });
    await complianceService.logAction({
      campaignId: mockCampaignId,
      action: 'opened'
    });
    await complianceService.logAction({
      campaignId: mockCampaignId,
      action: 'opened'
    });

    const metrics = await complianceService.getComplianceMetrics(mockCampaignId);
    
    expect(metrics.total).toBe(3);
    expect(metrics.actions['sent']).toBe(1);
    expect(metrics.actions['opened']).toBe(2);
  }, 30000);
});
