import { performance } from 'perf_hooks';
import { z } from 'zod';
import { performanceMetrics } from './metricsCollector';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';

// Middleware Configuration Schema
const PerformanceMiddlewareConfigSchema = z.object({
  enabled: z.boolean().default(true),
  slowThreshold: z.number().min(0).default(1000), // ms
  detailedLogging: z.boolean().default(false),
  ignorePaths: z.array(z.string()).default([])
});

class PerformanceMiddleware {
  private static instance: PerformanceMiddleware;
  private config: z.infer<typeof PerformanceMiddlewareConfigSchema>;

  private constructor() {
    this.config = PerformanceMiddlewareConfigSchema.parse({});
  }

  // Singleton instance
  public static getInstance(): PerformanceMiddleware {
    if (!PerformanceMiddleware.instance) {
      PerformanceMiddleware.instance = new PerformanceMiddleware();
    }
    return PerformanceMiddleware.instance;
  }

  // Configure performance middleware
  public configure(
    config: Partial<z.infer<typeof PerformanceMiddlewareConfigSchema>>
  ): void {
    this.config = PerformanceMiddlewareConfigSchema.parse({
      ...this.config,
      ...config
    });

    logger.log('info', 'Performance Middleware Configured', {
      enabled: this.config.enabled,
      slowThreshold: this.config.slowThreshold
    });
  }

  // Express/HTTP request performance middleware
  public httpRequestMiddleware() {
    return (req: any, res: any, next: () => void) => {
      if (!this.config.enabled) return next();

      // Ignore specific paths
      if (this.config.ignorePaths.includes(req.path)) return next();

      const startTime = performance.now();

      // Wrap response end to measure performance
      const originalEnd = res.end;
      res.end = (...args: any[]) => {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Record performance metric
        performanceMetrics.recordPerformanceMetric({
          service: 'http_server',
          operation: `${req.method} ${req.path}`,
          duration,
          status: res.statusCode >= 400 ? 'failure' : 'success',
          metadata: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode
          }
        });

        // Log slow requests
        if (duration > this.config.slowThreshold) {
          logger.log('warn', 'Slow HTTP Request', {
            method: req.method,
            path: req.path,
            duration,
            statusCode: res.statusCode
          });

          // Publish slow request event
          eventBus.publish(EventTypes.SLOW_REQUEST_DETECTED, {
            method: req.method,
            path: req.path,
            duration
          });
        }

        // Detailed logging if enabled
        if (this.config.detailedLogging) {
          this.logDetailedRequestInfo(req, res, duration);
        }

        // Call original end method
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  // Database query performance middleware
  public databaseQueryMiddleware() {
    return async (
      query: string, 
      params: any[], 
      execute: () => Promise<any>
    ) => {
      if (!this.config.enabled) return execute();

      const startTime = performance.now();

      try {
        const result = await execute();
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Record database query performance
        performanceMetrics.recordPerformanceMetric({
          service: 'database',
          operation: 'query',
          duration,
          status: 'success',
          metadata: {
            queryLength: query.length,
            paramCount: params.length
          }
        });

        // Log slow queries
        if (duration > this.config.slowThreshold) {
          logger.log('warn', 'Slow Database Query', {
            duration,
            queryLength: query.length
          });

          // Publish slow query event
          eventBus.publish(EventTypes.SLOW_QUERY_DETECTED, {
            duration,
            query
          });
        }

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Record failed query
        performanceMetrics.recordPerformanceMetric({
          service: 'database',
          operation: 'query',
          duration,
          status: 'failure',
          metadata: {
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });

        throw error;
      }
    };
  }

  // ML model inference performance middleware
  public mlInferenceMiddleware() {
    return async (
      modelName: string, 
      inference: () => Promise<any>
    ) => {
      if (!this.config.enabled) return inference();

      const startTime = performance.now();

      try {
        const result = await inference();
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Record ML inference performance
        performanceMetrics.recordPerformanceMetric({
          service: 'ml_inference',
          operation: modelName,
          duration,
          status: 'success'
        });

        // Log slow inferences
        if (duration > this.config.slowThreshold) {
          logger.log('warn', 'Slow ML Inference', {
            modelName,
            duration
          });

          // Publish slow inference event
          eventBus.publish(EventTypes.SLOW_ML_INFERENCE_DETECTED, {
            modelName,
            duration
          });
        }

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Record failed inference
        performanceMetrics.recordPerformanceMetric({
          service: 'ml_inference',
          operation: modelName,
          duration,
          status: 'failure',
          metadata: {
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          }
        });

        throw error;
      }
    };
  }

  // Detailed request logging
  private logDetailedRequestInfo(
    req: any, 
    res: any, 
    duration: number
  ): void {
    logger.log('debug', 'Detailed HTTP Request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      headers: req.headers,
      query: req.query,
      body: req.body
    });
  }
}

// Export singleton instance
export const performanceMiddleware = PerformanceMiddleware.getInstance();
