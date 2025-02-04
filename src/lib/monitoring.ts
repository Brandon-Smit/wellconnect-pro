import * as Sentry from "@sentry/nextjs";
import pino from 'pino';

// Error Tracking Configuration
export function initializeErrorTracking() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    debug: process.env.NODE_ENV !== 'production',
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
    ],
  });
}

// Logging Configuration
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  }
});

// Performance Monitoring
export function trackPerformance(metricName: string, value: number) {
  if (process.env.PERFORMANCE_TRACKING_ENABLED === 'true') {
    Sentry.metrics.increment(metricName, value);
  }
}

// Error Reporting Utility
export function reportError(error: Error, context?: Record<string, any>) {
  logger.error({ 
    msg: error.message, 
    stack: error.stack,
    ...context 
  });
  
  Sentry.captureException(error, { 
    extra: context 
  });
}

export default {
  initializeErrorTracking,
  logger,
  trackPerformance,
  reportError
};
