import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';

// Performance Metric Schema
const PerformanceMetricSchema = z.object({
  id: z.string().uuid(),
  metricType: z.enum([
    'EMAIL_CAMPAIGN', 
    'CONTENT_GENERATION', 
    'COMPLIANCE_CHECK', 
    'AFFILIATE_LINK'
  ]),
  timestamp: z.date(),
  data: z.object({
    // Flexible performance data structure
    duration: z.number().optional(),
    successRate: z.number().min(0).max(1).optional(),
    volume: z.number().optional(),
    resourceUtilization: z.number().min(0).max(1).optional()
  }),
  metadata: z.object({
    campaignId: z.string().optional(),
    serviceName: z.string().default('WellConnectPro'),
    traceId: z.string().optional()
  })
});

// Campaign Performance Schema
const CampaignPerformanceSchema = z.object({
  campaignId: z.string().uuid(),
  startDate: z.date(),
  endDate: z.date().optional(),
  metrics: z.object({
    emailsSent: z.number(),
    emailsDelivered: z.number(),
    openRate: z.number().min(0).max(1),
    clickRate: z.number().min(0).max(1),
    conversionRate: z.number().min(0).max(1),
    ethicalScore: z.number().min(0).max(1)
  }),
  status: z.enum(['ACTIVE', 'COMPLETED', 'PAUSED', 'TERMINATED'])
});

export class PerformanceTrackingService {
  private static instance: PerformanceTrackingService;
  private performanceMetrics: Map<string, z.infer<typeof PerformanceMetricSchema>> = new Map();
  private campaignPerformance: Map<string, z.infer<typeof CampaignPerformanceSchema>> = new Map();

  private constructor() {
    this.initializeEventListeners();
  }

  public static getInstance(): PerformanceTrackingService {
    if (!PerformanceTrackingService.instance) {
      PerformanceTrackingService.instance = new PerformanceTrackingService();
    }
    return PerformanceTrackingService.instance;
  }

  private initializeEventListeners(): void {
    // Listen to various system events for performance tracking
    eventBus.subscribe(EventTypes.CAMPAIGN_INITIATED, this.trackCampaignStart.bind(this));
    eventBus.subscribe(EventTypes.CAMPAIGN_COMPLETED, this.trackCampaignCompletion.bind(this));
    eventBus.subscribe(EventTypes.EMAIL_SENT, this.trackEmailMetrics.bind(this));
  }

  // Record Performance Metric
  public recordPerformanceMetric(
    metricType: z.infer<typeof PerformanceMetricSchema>['metricType'],
    data: z.infer<typeof PerformanceMetricSchema>['data'],
    metadata?: Partial<z.infer<typeof PerformanceMetricSchema>['metadata']>
  ): z.infer<typeof PerformanceMetricSchema> {
    const metric: z.infer<typeof PerformanceMetricSchema> = PerformanceMetricSchema.parse({
      id: uuidv4(),
      metricType,
      timestamp: new Date(),
      data,
      metadata: {
        serviceName: 'WellConnectPro',
        traceId: uuidv4(),
        ...metadata
      }
    });

    this.performanceMetrics.set(metric.id, metric);

    // Log performance metric
    logger.info('Performance Metric Recorded', { 
      metricType, 
      duration: data.duration 
    });

    return metric;
  }

  // Track Campaign Performance
  public startCampaign(
    campaignDetails: Omit<z.infer<typeof CampaignPerformanceSchema>, 'campaignId' | 'startDate' | 'status'>
  ): z.infer<typeof CampaignPerformanceSchema> {
    const campaignPerformance: z.infer<typeof CampaignPerformanceSchema> = CampaignPerformanceSchema.parse({
      campaignId: uuidv4(),
      startDate: new Date(),
      status: 'ACTIVE',
      ...campaignDetails,
      metrics: {
        emailsSent: 0,
        emailsDelivered: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
        ethicalScore: campaignDetails.metrics.ethicalScore
      }
    });

    this.campaignPerformance.set(campaignPerformance.campaignId, campaignPerformance);

    // Publish campaign start event
    eventBus.publish(EventTypes.CAMPAIGN_INITIATED, { 
      campaignId: campaignPerformance.campaignId 
    });

    return campaignPerformance;
  }

  // Track Campaign Start
  private trackCampaignStart(event: any): void {
    logger.info('Campaign Started', { 
      campaignId: event.payload.campaignId 
    });
  }

  // Track Campaign Completion
  private trackCampaignCompletion(event: any): void {
    const campaignId = event.payload.campaignId;
    const campaign = this.campaignPerformance.get(campaignId);

    if (campaign) {
      campaign.endDate = new Date();
      campaign.status = 'COMPLETED';

      // Log campaign performance
      logger.info('Campaign Completed', { 
        campaignId, 
        metrics: campaign.metrics 
      });
    }
  }

  // Track Email Metrics
  private trackEmailMetrics(event: any): void {
    const { campaignId, emailMetrics } = event.payload;
    const campaign = this.campaignPerformance.get(campaignId);

    if (campaign) {
      // Update campaign metrics
      campaign.metrics.emailsSent += emailMetrics.emailsSent;
      campaign.metrics.emailsDelivered += emailMetrics.emailsDelivered;
      campaign.metrics.openRate = this.calculateWeightedAverage(
        campaign.metrics.openRate, 
        emailMetrics.openRate
      );
      campaign.metrics.clickRate = this.calculateWeightedAverage(
        campaign.metrics.clickRate, 
        emailMetrics.clickRate
      );
      campaign.metrics.conversionRate = this.calculateWeightedAverage(
        campaign.metrics.conversionRate, 
        emailMetrics.conversionRate
      );
    }
  }

  // Weighted Average Calculation
  private calculateWeightedAverage(
    currentAverage: number, 
    newValue: number, 
    weight: number = 0.5
  ): number {
    return currentAverage * (1 - weight) + newValue * weight;
  }

  // Get System Performance
  public getSystemPerformance(): {
    averageResponseTime: number,
    totalCampaigns: number,
    successRate: number
  } {
    const performanceMetrics = Array.from(this.performanceMetrics.values());
    const campaigns = Array.from(this.campaignPerformance.values());

    return {
      averageResponseTime: this.calculateAverageResponseTime(performanceMetrics),
      totalCampaigns: campaigns.length,
      successRate: this.calculateOverallSuccessRate(campaigns)
    };
  }

  // Calculate Average Response Time
  private calculateAverageResponseTime(
    metrics: z.infer<typeof PerformanceMetricSchema>[]
  ): number {
    const responseTimes = metrics
      .map(metric => metric.data.duration || 0)
      .filter(duration => duration > 0);

    return responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;
  }

  // Calculate Overall Success Rate
  private calculateOverallSuccessRate(
    campaigns: z.infer<typeof CampaignPerformanceSchema>[]
  ): number {
    const successfulCampaigns = campaigns.filter(
      campaign => 
        campaign.status === 'COMPLETED' && 
        campaign.metrics.conversionRate > 0.1
    );

    return successfulCampaigns.length / campaigns.length;
  }

  // Generate Comprehensive Performance Report
  public generatePerformanceReport(options: {
    startDate?: Date,
    endDate?: Date
  } = {}): {
    totalCampaigns: number,
    averageConversionRate: number,
    topPerformingCampaigns: Array<{
      campaignId: string,
      conversionRate: number,
      ethicalScore: number
    }>,
    systemHealthMetrics: {
      averageResponseTime: number,
      successRate: number
    }
  } {
    const startDate = options.startDate || new Date(0);
    const endDate = options.endDate || new Date();

    const filteredCampaigns = Array.from(this.campaignPerformance.values())
      .filter(campaign => 
        campaign.startDate >= startDate && 
        (campaign.endDate || new Date()) <= endDate
      );

    const topPerformingCampaigns = filteredCampaigns
      .sort((a, b) => b.metrics.conversionRate - a.metrics.conversionRate)
      .slice(0, 5)
      .map(campaign => ({
        campaignId: campaign.campaignId,
        conversionRate: campaign.metrics.conversionRate,
        ethicalScore: campaign.metrics.ethicalScore
      }));

    return {
      totalCampaigns: filteredCampaigns.length,
      averageConversionRate: this.calculateAverageConversionRate(filteredCampaigns),
      topPerformingCampaigns,
      systemHealthMetrics: this.getSystemPerformance()
    };
  }

  private calculateAverageConversionRate(
    campaigns: z.infer<typeof CampaignPerformanceSchema>[]
  ): number {
    if (campaigns.length === 0) return 0;

    const totalConversionRate = campaigns.reduce(
      (sum, campaign) => sum + campaign.metrics.conversionRate, 
      0
    );

    return totalConversionRate / campaigns.length;
  }
}

export const performanceTrackingService = PerformanceTrackingService.getInstance();
