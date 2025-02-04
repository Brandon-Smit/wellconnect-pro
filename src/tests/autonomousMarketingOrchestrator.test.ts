import { AutonomousMarketingOrchestrator } from '../services/autonomousMarketingOrchestrator';
import { MachineLearningModel } from '../lib/machineLearningModel';
import { v4 as uuidv4 } from 'uuid';

describe('AutonomousMarketingOrchestrator', () => {
  let orchestrator: AutonomousMarketingOrchestrator;
  let mlModel: MachineLearningModel;

  beforeEach(() => {
    mlModel = MachineLearningModel.getInstance();
    orchestrator = new AutonomousMarketingOrchestrator(
      mlModel,
      // Mock other dependencies
      {} as any,
      {} as any,
      {} as any,
      {} as any
    );
  });

  test('initiates autonomous marketing workflow', async () => {
    const result = await orchestrator.initiateAutonomousMarketingWorkflow({
      campaignId: uuidv4(),
      selectedEmailVariant: {
        id: uuidv4(),
        subject: 'Test Subject',
        body: 'Test Body',
        tone: 'professional'
      },
      affiliateLink: 'https://example-mental-health-service.com',
      targetIndustry: 'technology',
      companySize: 'medium',
      ethicalScore: 0.9
    });

    expect(result.success).toBe(true);
    expect(result.enhancementInsights).toBeDefined();
    expect(result.recommendedOptimizations).toBeInstanceOf(Array);
  });

  test('captures campaign feedback', async () => {
    const campaignId = uuidv4();
    await expect(
      orchestrator.captureCampaignFeedback(campaignId, {
        openRate: 0.45,
        clickRate: 0.15,
        conversions: 10
      })
    ).resolves.not.toThrow();
  });
});
