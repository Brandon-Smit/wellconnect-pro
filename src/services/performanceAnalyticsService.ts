import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { MachineLearningModel, PerformanceMetricSchema, RecommendationSchema } from '@/lib/machineLearningModel';
import { complianceService } from './complianceService';

// Campaign Performance Schema
const CampaignPerformanceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  startDate: z.date(),
  endDate: z.date().optional(),
  metrics: z.array(PerformanceMetricSchema),
  recommendations: z.array(RecommendationSchema).optional(),
  overallPerformance: z.object({
    averageOpenRate: z.number().min(0).max(100),
    averageClickRate: z.number().min(0).max(100),
    averageConversionRate: z.number().min(0).max(100),
    averageEthicalScore: z.number().min(0).max(10)
  })
});

// Performance Trend Schema
const PerformanceTrendSchema = z.object({
  campaignId: z.string(),
  trend: z.enum(['improving', 'stable', 'declining']),
  metrics: z.object({
    openRateTrend: z.number(),
    clickRateTrend: z.number(),
    conversionRateTrend: z.number()
  })
});

class PerformanceAnalyticsService {
  private mlModel: MachineLearningModel;
  private campaigns: z.infer<typeof CampaignPerformanceSchema>[] = [];

  constructor() {
    this.mlModel = new MachineLearningModel();
  }

  // Create a new campaign performance tracking
  createCampaign(
    name: string, 
    startDate: Date = new Date()
  ): z.infer<typeof CampaignPerformanceSchema> {
    const campaign = CampaignPerformanceSchema.parse({
      id: uuidv4(),
      name,
      startDate,
      metrics: [],
      overallPerformance: {
        averageOpenRate: 0,
        averageClickRate: 0,
        averageConversionRate: 0,
        averageEthicalScore: 0
      }
    });

    this.campaigns.push(campaign);
    return campaign;
  }

  // Record performance metric for a specific campaign
  recordPerformanceMetric(
    campaignId: string, 
    metric: Omit<z.infer<typeof PerformanceMetricSchema>, 'timestamp'>
  ): void {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }

    const validatedMetric = PerformanceMetricSchema.parse({
      ...metric,
      timestamp: new Date()
    });

    // Add metric to campaign
    campaign.metrics.push(validatedMetric);

    // Update overall performance
    this.updateCampaignPerformance(campaign);

    // Record metric for machine learning
    this.mlModel.recordPerformanceMetric(validatedMetric);

    // Generate recommendations if needed
    this.generateCampaignRecommendations(campaign);
  }

  // Update campaign performance metrics
  private updateCampaignPerformance(
    campaign: z.infer<typeof CampaignPerformanceSchema>
  ): void {
    const metrics = campaign.metrics;
    campaign.overallPerformance = {
      averageOpenRate: this.calculateAverage(metrics.map(m => m.openRate)),
      averageClickRate: this.calculateAverage(metrics.map(m => m.clickRate)),
      averageConversionRate: this.calculateAverage(metrics.map(m => m.conversionRate)),
      averageEthicalScore: this.calculateAverage(metrics.map(m => m.ethicalScore))
    };
  }

  // Generate campaign recommendations
  private generateCampaignRecommendations(
    campaign: z.infer<typeof CampaignPerformanceSchema>
  ): void {
    // Only generate recommendations if we have sufficient metrics
    if (campaign.metrics.length >= 10) {
      const recommendations = this.mlModel.generateRecommendations(campaign.metrics);
      campaign.recommendations = recommendations;
    }
  }

  // Analyze performance trends
  analyzeCampaignTrend(campaignId: string): z.infer<typeof PerformanceTrendSchema> {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }

    // Calculate trends using linear regression
    const metrics = campaign.metrics;
    const openRateTrend = this.calculateTrend(metrics.map(m => m.openRate));
    const clickRateTrend = this.calculateTrend(metrics.map(m => m.clickRate));
    const conversionRateTrend = this.calculateTrend(metrics.map(m => m.conversionRate));

    // Determine overall trend
    const trendType = this.determineTrendType(
      openRateTrend, 
      clickRateTrend, 
      conversionRateTrend
    );

    return PerformanceTrendSchema.parse({
      campaignId,
      trend: trendType,
      metrics: {
        openRateTrend,
        clickRateTrend,
        conversionRateTrend
      }
    });
  }

  // Predict future campaign performance
  predictFuturePerformance(campaignId: string): number[] {
    const campaign = this.campaigns.find(c => c.id === campaignId);
    if (!campaign) {
      throw new Error(`Campaign with ID ${campaignId} not found`);
    }

    return this.mlModel.predictPerformance(campaign.metrics);
  }

  // Calculate average of an array of numbers
  private calculateAverage(values: number[]): number {
    return values.length > 0 
      ? values.reduce((sum, val) => sum + val, 0) / values.length 
      : 0;
  }

  // Calculate trend using simple linear regression
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, index) => sum + val * index, 0);
    const sumXSquare = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumXSquare - sumX * sumX);
    return slope;
  }

  // Determine trend type based on slope
  private determineTrendType(
    openRateTrend: number, 
    clickRateTrend: number, 
    conversionRateTrend: number
  ): z.infer<typeof PerformanceTrendSchema>['trend'] {
    const avgTrend = (openRateTrend + clickRateTrend + conversionRateTrend) / 3;

    if (avgTrend > 0.5) return 'improving';
    if (avgTrend < -0.5) return 'declining';
    return 'stable';
  }

  // Get all campaigns
  getAllCampaigns(): z.infer<typeof CampaignPerformanceSchema>[] {
    return this.campaigns;
  }

  // Find campaign by ID
  findCampaignById(campaignId: string): z.infer<typeof CampaignPerformanceSchema> | undefined {
    return this.campaigns.find(c => c.id === campaignId);
  }
}

export const performanceAnalyticsService = new PerformanceAnalyticsService();
