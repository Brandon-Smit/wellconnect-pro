import type { NextApiRequest, NextApiResponse } from 'next';

export interface PerformanceMetric {
  id: string;
  type: 'affiliate_link' | 'email_campaign';
  timestamp: string;
  userId: string;
  data: Record<string, any>;
}

class PerformanceTracker {
  private metrics: PerformanceMetric[] = [];

  trackMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>) {
    const newMetric: PerformanceMetric = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...metric,
    };

    this.metrics.push(newMetric);
    return newMetric;
  }

  getMetricsByUser(userId: string) {
    return this.metrics.filter(metric => metric.userId === userId);
  }

  getMetricsByType(type: PerformanceMetric['type']) {
    return this.metrics.filter(metric => metric.type === type);
  }

  generatePerformanceSummary(userId: string) {
    const userMetrics = this.getMetricsByUser(userId);
    
    const summary = {
      totalMetrics: userMetrics.length,
      metricsByType: {} as Record<string, number>,
      lastMetricTimestamp: userMetrics.length > 0 
        ? userMetrics[userMetrics.length - 1].timestamp 
        : null,
    };

    userMetrics.forEach(metric => {
      summary.metricsByType[metric.type] = 
        (summary.metricsByType[metric.type] || 0) + 1;
    });

    return summary;
  }
}

export const performanceTracker = new PerformanceTracker();

// Middleware to track API performance
export function withPerformanceTracking(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    const startTime = Date.now();
    
    // Capture original end and json methods
    const originalEnd = res.end;
    const originalJson = res.json;

    // Track performance metrics
    res.end = function(...args) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      performanceTracker.trackMetric({
        type: req.method === 'GET' ? 'affiliate_link' : 'email_campaign',
        userId: (req as any).user?.id || 'anonymous',
        data: {
          path: req.url,
          method: req.method,
          statusCode: res.statusCode,
          duration,
        },
      });

      return originalEnd.apply(this, args);
    };

    res.json = function(body) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      performanceTracker.trackMetric({
        type: req.method === 'GET' ? 'affiliate_link' : 'email_campaign',
        userId: (req as any).user?.id || 'anonymous',
        data: {
          path: req.url,
          method: req.method,
          statusCode: res.statusCode,
          duration,
        },
      });

      return originalJson.call(this, body);
    };

    return handler(req, res);
  };
}
