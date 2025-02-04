import { performance } from 'perf_hooks';
import { logger } from './monitoring';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

export class PerformanceOptimizer {
  private static metrics: Map<string, PerformanceMetric> = new Map();
  private static cacheStore: Map<string, any> = new Map();

  // Measure function performance
  static measure<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    this.metrics.set(name, { name, startTime });

    return fn()
      .then((result) => {
        const endTime = performance.now();
        const metric = this.metrics.get(name);
        if (metric) {
          metric.endTime = endTime;
          metric.duration = endTime - startTime;
          
          logger.info(`Performance Metric: ${name}`, {
            duration: metric.duration,
            timestamp: new Date().toISOString()
          });
        }
        return result;
      })
      .catch((error) => {
        logger.error(`Performance Metric Error: ${name}`, { error });
        throw error;
      });
  }

  // Memoization cache
  static memoize<T>(key: string, fn: () => Promise<T>, ttl: number = 300000): Promise<T> {
    const cachedResult = this.cacheStore.get(key);
    const currentTime = Date.now();

    if (cachedResult && currentTime - cachedResult.timestamp < ttl) {
      return Promise.resolve(cachedResult.value);
    }

    return fn().then((result) => {
      this.cacheStore.set(key, {
        value: result,
        timestamp: currentTime
      });
      return result;
    });
  }

  // Circuit breaker for external API calls
  static circuitBreaker<T>(
    fn: () => Promise<T>, 
    failureThreshold: number = 3, 
    resetTimeout: number = 30000
  ): Promise<T> {
    let failures = 0;
    let lastFailureTime = 0;

    return new Promise((resolve, reject) => {
      const attemptCall = () => {
        const currentTime = Date.now();

        // Check if circuit is open
        if (failures >= failureThreshold && 
            currentTime - lastFailureTime < resetTimeout) {
          reject(new Error('Circuit is OPEN: Too many failures'));
          return;
        }

        fn()
          .then((result) => {
            // Reset failures on success
            failures = 0;
            resolve(result);
          })
          .catch((error) => {
            failures++;
            lastFailureTime = Date.now();
            
            logger.warn('Circuit Breaker Triggered', { 
              failures, 
              error 
            });

            if (failures >= failureThreshold) {
              logger.error('Circuit OPEN: Blocking further calls');
            }

            reject(error);
          });
      };

      attemptCall();
    });
  }

  // Get performance metrics
  static getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  // Clear performance metrics
  static clearMetrics(): void {
    this.metrics.clear();
  }
}
