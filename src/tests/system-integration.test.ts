import { systemOrchestrator } from '../services/systemOrchestrator';
import { complianceService } from '../services/complianceService';
import { performanceTrackingService } from '../services/performanceTrackingService';
import { contentGenerationSystem } from '../services/contentGenerationSystem';
import { machineLearningModel } from '../lib/machineLearningModel';
import { eventBus, EventTypes } from '../core/eventBus';

describe('WellConnect Pro System Integration', () => {
  // Setup and teardown
  beforeAll(async () => {
    // Initialize services and configurations
    await eventBus.initialize();
  });

  afterAll(async () => {
    // Clean up resources
    await eventBus.shutdown();
  });

  // Compliance and Ethical Communication Test
  describe('Compliance and Ethical Communication Workflow', () => {
    it('should successfully execute a compliant campaign workflow', async () => {
      const campaignConfig = {
        affiliateLink: 'https://example-mental-health-service.com/affiliate',
        targetIndustry: 'technology',
        companySize: 'medium',
        dailyEmailLimit: 50,
        ethicalGuidelines: true
      };

      const workflow = await systemOrchestrator.initiateCampaign(campaignConfig);

      // Verify compliance check
      const complianceCheck = await complianceService.performComplianceCheck(
        campaignConfig.affiliateLink, 
        { 
          industry: campaignConfig.targetIndustry,
          companySize: campaignConfig.companySize 
        }
      );
      expect(complianceCheck.result).toBe('PASS');

      // Verify content generation
      const contentGenerationResult = await contentGenerationSystem.generateContent({
        ...campaignConfig,
        contentType: 'mental-health'
      });
      expect(contentGenerationResult.ethicalScore).toBeGreaterThan(0.7);

      // Verify machine learning personalization
      const mlPersonalizationResult = await machineLearningModel.personalizeContent({
        industry: campaignConfig.targetIndustry,
        companySize: campaignConfig.companySize,
        previousInteractions: [],
        ethicalConstraints: {
          sensitivityLevel: 0.8,
          communicationPreferences: ['mental-health']
        }
      });
      expect(mlPersonalizationResult.ethicalScore).toBeGreaterThan(0.7);

      // Verify workflow progression
      expect(workflow.status).toBe('COMPLETED');
    });

    it('should handle campaign failure for non-compliant content', async () => {
      const campaignConfig = {
        affiliateLink: 'https://non-compliant-service.com/affiliate',
        targetIndustry: 'technology',
        companySize: 'medium',
        dailyEmailLimit: 50,
        ethicalGuidelines: true
      };

      await expect(systemOrchestrator.initiateCampaign({
        ...campaignConfig,
        ethicalGuidelines: false
      })).rejects.toThrow();
    });
  });

  // Performance Tracking Test
  describe('Performance Tracking Integration', () => {
    it('should track campaign performance accurately', async () => {
      const campaignPerformance = performanceTrackingService.startCampaign({
        metrics: {
          emailsSent: 100,
          openRate: 25,
          clickRate: 10,
          ethicalScore: 0.8
        }
      });

      expect(campaignPerformance).toBeDefined();
      expect(campaignPerformance.emailsSent).toBe(100);

      const performanceReport = performanceTrackingService.generatePerformanceReport();
      expect(performanceReport).toBeDefined();
      expect(performanceReport.averageOpenRate).toBeGreaterThan(0);
    });
  });

  // Event Bus Integration Test
  describe('Event Bus Integration', () => {
    it('should handle and propagate system events', async () => {
      const mockEventHandler = jest.fn();

      // Subscribe to content generation event
      eventBus.subscribe(EventTypes.CONTENT_GENERATED, mockEventHandler);

      // Trigger content generation
      await contentGenerationSystem.generateContent({
        affiliateLink: 'https://example-service.com/affiliate',
        targetIndustry: 'healthcare',
        companySize: 'large',
        ethicalGuidelines: true
      });

      // Verify event was handled
      expect(mockEventHandler).toHaveBeenCalledTimes(1);
      const eventPayload = mockEventHandler.mock.calls[0][0];
      expect(eventPayload.contentType).toBeDefined();
      expect(eventPayload.industry).toBe('healthcare');
    });
  });

  // System Health Check Test
  describe('System Health Check', () => {
    it('should perform comprehensive system health check', async () => {
      const healthCheck = await systemOrchestrator.systemHealthCheck();

      expect(healthCheck).toEqual({
        emailDiscovery: true,
        dispatch: true,
        compliance: true,
        affiliateLinks: true
      });
    });
  });
});

// Export for potential external use
export { systemOrchestrator, complianceService, performanceTrackingService };
