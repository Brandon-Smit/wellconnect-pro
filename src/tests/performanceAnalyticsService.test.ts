import { expect } from 'chai';
import { performanceAnalyticsService } from '@/services/performanceAnalyticsService';

describe('Performance Analytics Service', () => {
  let campaignId: string;

  beforeEach(() => {
    // Create a new campaign before each test
    const campaign = performanceAnalyticsService.createCampaign('Test Campaign');
    campaignId = campaign.id;
  });

  describe('Campaign Creation and Metric Recording', () => {
    it('should create a new campaign', () => {
      const campaign = performanceAnalyticsService.findCampaignById(campaignId);
      expect(campaign).to.exist;
      expect(campaign?.name).to.equal('Test Campaign');
    });

    it('should record performance metrics', () => {
      performanceAnalyticsService.recordPerformanceMetric(campaignId, {
        campaignId,
        emailsSent: 100,
        openRate: 25,
        clickRate: 10,
        conversionRate: 5,
        ethicalScore: 8,
        industryType: 'technology',
        companySize: 500,
        contentType: 'mental_health_resource'
      });

      const campaign = performanceAnalyticsService.findCampaignById(campaignId);
      expect(campaign?.metrics).to.have.lengthOf(1);
      expect(campaign?.overallPerformance.averageOpenRate).to.equal(25);
    });
  });

  describe('Performance Trend Analysis', () => {
    beforeEach(() => {
      // Record multiple metrics to analyze trends
      const metrics = [
        { openRate: 10, clickRate: 5, conversionRate: 2 },
        { openRate: 20, clickRate: 10, conversionRate: 4 },
        { openRate: 30, clickRate: 15, conversionRate: 6 }
      ];

      metrics.forEach((metricData, index) => {
        performanceAnalyticsService.recordPerformanceMetric(campaignId, {
          campaignId,
          emailsSent: 100 + index * 10,
          ...metricData,
          ethicalScore: 8,
          industryType: 'technology',
          companySize: 500,
          contentType: 'mental_health_resource'
        });
      });
    });

    it('should analyze campaign performance trend', () => {
      const trend = performanceAnalyticsService.analyzeCampaignTrend(campaignId);
      
      expect(trend).to.exist;
      expect(trend.trend).to.equal('improving');
      expect(trend.metrics.openRateTrend).to.be.greaterThan(0);
      expect(trend.metrics.clickRateTrend).to.be.greaterThan(0);
      expect(trend.metrics.conversionRateTrend).to.be.greaterThan(0);
    });

    it('should generate performance predictions', () => {
      const predictions = performanceAnalyticsService.predictFuturePerformance(campaignId);
      
      expect(predictions).to.exist;
      expect(predictions.length).to.equal(3); // Open, Click, Conversion rates
      predictions.forEach(prediction => {
        expect(prediction).to.be.a('number');
      });
    });
  });

  describe('Campaign Recommendations', () => {
    beforeEach(() => {
      // Record multiple low-performing metrics to trigger recommendations
      const metrics = Array(10).fill(null).map((_, index) => ({
        openRate: 5 + index,
        clickRate: 2 + index / 2,
        conversionRate: 1 + index / 4,
        ethicalScore: 6
      }));

      metrics.forEach((metricData, index) => {
        performanceAnalyticsService.recordPerformanceMetric(campaignId, {
          campaignId,
          emailsSent: 100 + index * 10,
          ...metricData,
          industryType: 'technology',
          companySize: 500,
          contentType: 'mental_health_resource'
        });
      });
    });

    it('should generate campaign recommendations', () => {
      const campaign = performanceAnalyticsService.findCampaignById(campaignId);
      
      expect(campaign?.recommendations).to.exist;
      expect(campaign?.recommendations).to.have.lengthOf.at.least(1);
      
      campaign?.recommendations?.forEach(recommendation => {
        expect(recommendation.strategyName).to.be.a('string');
        expect(recommendation.description).to.be.a('string');
        expect(recommendation.confidenceScore).to.be.a('number');
        expect(recommendation.recommendedActions).to.be.an('array');
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent campaign', () => {
      expect(() => {
        performanceAnalyticsService.recordPerformanceMetric('non-existent-id', {
          campaignId: 'non-existent-id',
          emailsSent: 100,
          openRate: 25,
          clickRate: 10,
          conversionRate: 5,
          ethicalScore: 8,
          industryType: 'technology',
          companySize: 500,
          contentType: 'mental_health_resource'
        });
      }).to.throw('Campaign with ID non-existent-id not found');
    });
  });
});
