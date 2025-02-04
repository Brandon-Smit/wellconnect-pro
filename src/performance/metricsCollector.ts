import { z } from 'zod';
import { performance } from 'perf_hooks';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';
import { configManager } from '../core/configurationManager';

// Performance Metric Schema
const PerformanceMetricSchema = z.object({
  // Core Performance Metrics
  timestamp: z.date(),
  service: z.string(),
  operation: z.string(),
  duration: z.number(),
  status: z.enum(['success', 'failure']),

  // Detailed Performance Attributes
  resourceUsage: z.object({
    cpuUsage: z.number().min(0).max(100).optional(),
    memoryUsage: z.number().min(0).max(100).optional(),
    networkIO: z.number().optional()
  }).optional(),

  // Contextual Metadata
  metadata: z.record(z.string(), z.any()).optional()
});

// Performance Threshold Configuration
const PerformanceThresholdSchema = z.object({
  services: z.record(z.string(), z.object({
    maxResponseTime: z.number(), // ms
    errorThreshold: z.number().min(0).max(1), // error rate
    criticalOperations: z.array(z.string()).optional()
  }))
});

class PerformanceMetricsCollector {
  private static instance: PerformanceMetricsCollector;
  private performanceMetrics: Map<string, z.infer<typeof PerformanceMetricSchema>[]> = new Map();
  private performanceThresholds: z.infer<typeof PerformanceThresholdSchema>;

  private constructor() {
    // Load performance thresholds from configuration
    this.performanceThresholds = this.loadPerformanceThresholds();
  }

  // Singleton instance
  public static getInstance(): PerformanceMetricsCollector {
    if (!PerformanceMetricsCollector.instance) {
      PerformanceMetricsCollector.instance = new PerformanceMetricsCollector();
    }
    return PerformanceMetricsCollector.instance;
  }

  // Load performance thresholds from configuration
  private loadPerformanceThresholds(): z.infer<typeof PerformanceThresholdSchema> {
    try {
      const config = configManager.get('performanceTracking') || {};
      return PerformanceThresholdSchema.parse({
        services: config.services || {}
      });
    } catch (error) {
      logger.error('Performance threshold configuration error', error);
      return PerformanceThresholdSchema.parse({ services: {} });
    }
  }

  // Measure performance of an operation
  public async measurePerformance<T>(
    service: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<{
    result: T;
    metric: z.infer<typeof PerformanceMetricSchema>;
  }> {
    const startTime = performance.now();
    let status: z.infer<typeof PerformanceMetricSchema>['status'] = 'success';

    try {
      const result = await fn();
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric = this.recordPerformanceMetric({
        service,
        operation,
        duration,
        status,
        resourceUsage: this.getCurrentResourceUsage()
      });

      // Check if performance exceeds thresholds
      this.checkPerformanceThresholds(metric);

      return { result, metric };
    } catch (error) {
      status = 'failure';
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metric = this.recordPerformanceMetric({
        service,
        operation,
        duration,
        status,
        metadata: { 
          errorMessage: error instanceof Error ? error.message : 'Unknown error' 
        },
        resourceUsage: this.getCurrentResourceUsage()
      });

      // Publish performance error event
      eventBus.publish(EventTypes.PERFORMANCE_THRESHOLD_EXCEEDED, metric);

      throw error;
    }
  }

  // Record performance metric
  private recordPerformanceMetric(
    metricData: Omit<z.infer<typeof PerformanceMetricSchema>, 'timestamp'> & {
      timestamp?: Date;
    }
  ): z.infer<typeof PerformanceMetricSchema> {
    const metric = PerformanceMetricSchema.parse({
      ...metricData,
      timestamp: new Date()
    });

    // Store metric in service-specific collection
    const serviceMetrics = this.performanceMetrics.get(metric.service) || [];
    serviceMetrics.push(metric);
    this.performanceMetrics.set(metric.service, serviceMetrics);

    // Log performance metric
    logger.log('info', 'Performance Metric Recorded', {
      service: metric.service,
      operation: metric.operation,
      duration: metric.duration,
      status: metric.status
    });

    // Publish performance metric event
    eventBus.publish(EventTypes.PERFORMANCE_METRIC_RECORDED, metric);

    return metric;
  }

  // Get current system resource usage
  private getCurrentResourceUsage(): z.infer<typeof PerformanceMetricSchema>['resourceUsage'] {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      cpuUsage: this.calculateCpuUsagePercentage(cpuUsage),
      memoryUsage: this.calculateMemoryUsagePercentage(memoryUsage),
      networkIO: 0 // Placeholder for network I/O tracking
    };
  }

  // Calculate CPU usage percentage
  private calculateCpuUsagePercentage(
    cpuUsage: NodeJS.CpuUsage
  ): number {
    // Simple CPU usage calculation
    const userCpuTime = cpuUsage.user / 1000000; // Convert to milliseconds
    const systemCpuTime = cpuUsage.system / 1000000;
    const totalCpuTime = userCpuTime + systemCpuTime;

    // Normalize to percentage (this is a simplified approximation)
    return Math.min(100, (totalCpuTime / process.uptime()) * 100);
  }

  // Calculate memory usage percentage
  private calculateMemoryUsagePercentage(
    memoryUsage: NodeJS.MemoryUsage
  ): number {
    const totalSystemMemory = require('os').totalmem();
    return (memoryUsage.heapUsed / totalSystemMemory) * 100;
  }

  // Check performance thresholds
  private checkPerformanceThresholds(
    metric: z.infer<typeof PerformanceMetricSchema>
  ): void {
    const serviceThresholds = this.performanceThresholds.services[metric.service];
    
    if (!serviceThresholds) return;

    // Check response time threshold
    if (
      serviceThresholds.maxResponseTime && 
      metric.duration > serviceThresholds.maxResponseTime
    ) {
      logger.log('warn', 'Performance Threshold Exceeded', {
        service: metric.service,
        operation: metric.operation,
        actualDuration: metric.duration,
        maxAllowedDuration: serviceThresholds.maxResponseTime
      });

      eventBus.publish(EventTypes.PERFORMANCE_THRESHOLD_EXCEEDED, {
        type: 'response_time',
        metric
      });
    }

    // Check if critical operation failed
    if (
      metric.status === 'failure' &&
      serviceThresholds.criticalOperations?.includes(metric.operation)
    ) {
      logger.log('error', 'Critical Operation Failed', {
        service: metric.service,
        operation: metric.operation
      });

      eventBus.publish(EventTypes.CRITICAL_OPERATION_FAILED, metric);
    }
  }

  // Get performance metrics for a service
  public getServicePerformanceMetrics(
    service: string,
    options: {
      limit?: number;
      startTime?: Date;
      endTime?: Date;
    } = {}
  ): z.infer<typeof PerformanceMetricSchema>[] {
    const { 
      limit = 100, 
      startTime, 
      endTime 
    } = options;

    const serviceMetrics = this.performanceMetrics.get(service) || [];

    return serviceMetrics
      .filter(metric => 
        (!startTime || metric.timestamp >= startTime) &&
        (!endTime || metric.timestamp <= endTime)
      )
      .slice(-limit)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Generate performance summary
  public generatePerformanceSummary(
    services?: string[]
  ): {
    [service: string]: {
      totalOperations: number;
      successRate: number;
      averageResponseTime: number;
      slowestOperation: { 
        name: string; 
        duration: number 
      } | null;
    }
  } {
    const servicesToAnalyze = services || 
      Array.from(this.performanceMetrics.keys());

    const summary: ReturnType<typeof this.generatePerformanceSummary> = {};

    servicesToAnalyze.forEach(service => {
      const metrics = this.performanceMetrics.get(service) || [];

      const totalOperations = metrics.length;
      const successfulOperations = metrics.filter(
        metric => metric.status === 'success'
      ).length;

      const successRate = totalOperations > 0 
        ? successfulOperations / totalOperations 
        : 1;

      const averageResponseTime = metrics.length > 0
        ? metrics.reduce((sum, metric) => sum + metric.duration, 0) / metrics.length
        : 0;

      const slowestOperation = metrics.length > 0
        ? metrics.reduce((slowest, current) => 
            current.duration > (slowest?.duration || 0) ? current : slowest
          , null as z.infer<typeof PerformanceMetricSchema> | null)
        : null;

      summary[service] = {
        totalOperations,
        successRate,
        averageResponseTime,
        slowestOperation: slowestOperation 
          ? { 
              name: slowestOperation.operation, 
              duration: slowestOperation.duration 
            } 
          : null
      };
    });

    // Log performance summary
    logger.log('info', 'Performance Summary Generated', {
      analyzedServices: servicesToAnalyze
    });

    // Publish performance summary event
    eventBus.publish(EventTypes.PERFORMANCE_SUMMARY_GENERATED, summary);

    return summary;
  }

  // Reset performance metrics
  public reset(): void {
    this.performanceMetrics.clear();
    logger.log('info', 'Performance Metrics Reset');
  }
}

// Export singleton instance
export const performanceMetrics = PerformanceMetricsCollector.getInstance();
