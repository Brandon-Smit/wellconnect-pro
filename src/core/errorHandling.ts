import { z } from 'zod';
import { logger } from './loggingSystem';
import { eventBus, EventTypes } from './eventBus';

// Error Classification Schema
const ErrorSchema = z.object({
  type: z.enum([
    'VALIDATION_ERROR',
    'COMPLIANCE_ERROR',
    'NETWORK_ERROR',
    'AUTHENTICATION_ERROR',
    'RATE_LIMIT_ERROR',
    'SYSTEM_ERROR',
    'EXTERNAL_SERVICE_ERROR',
    'ETHICAL_VIOLATION_ERROR'
  ]),
  code: z.string(),
  message: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  context: z.record(z.string(), z.any()).optional(),
  timestamp: z.date(),
  retryable: z.boolean().default(false)
});

// Error Handling Strategy
class ErrorHandler {
  private static instance: ErrorHandler;
  private retryStrategies: Map<string, (error: z.infer<typeof ErrorSchema>) => Promise<any>> = new Map();
  private fallbackHandlers: Map<string, (error: z.infer<typeof ErrorSchema>) => void> = new Map();

  private constructor() {
    // Default error logging
    this.registerFallbackHandler('SYSTEM_ERROR', this.defaultSystemErrorHandler);
  }

  // Singleton instance
  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Create a standardized error
  public createError(
    errorParams: Omit<z.infer<typeof ErrorSchema>, 'timestamp'> & { 
      context?: Record<string, any> 
    }
  ): z.infer<typeof ErrorSchema> {
    return ErrorSchema.parse({
      ...errorParams,
      timestamp: new Date(),
      context: errorParams.context || {}
    });
  }

  // Handle and process errors
  public async handleError(
    error: z.infer<typeof ErrorSchema>
  ): Promise<{ handled: boolean; result?: any }> {
    // Log the error
    logger.error(`Error: ${error.message}`, undefined, {
      service: error.context?.service,
      component: error.context?.component
    });

    // Publish error event
    eventBus.publish(EventTypes.ERROR_OCCURRED, error);

    // Check if error is retryable
    if (error.retryable && this.retryStrategies.has(error.code)) {
      const retryStrategy = this.retryStrategies.get(error.code)!;
      try {
        const result = await retryStrategy(error);
        return { handled: true, result };
      } catch (retryError) {
        // Retry failed, fall back to error handler
        return this.fallbackHandle(error);
      }
    }

    // Use fallback handler if available
    return this.fallbackHandle(error);
  }

  // Register a retry strategy for specific error codes
  public registerRetryStrategy(
    errorCode: string, 
    strategy: (error: z.infer<typeof ErrorSchema>) => Promise<any>
  ): void {
    this.retryStrategies.set(errorCode, strategy);
  }

  // Register a fallback handler for specific error types
  public registerFallbackHandler(
    errorType: z.infer<typeof ErrorSchema>['type'], 
    handler: (error: z.infer<typeof ErrorSchema>) => void
  ): void {
    this.fallbackHandlers.set(errorType, handler);
  }

  // Fallback error handling
  private fallbackHandle(
    error: z.infer<typeof ErrorSchema>
  ): { handled: boolean; result?: any } {
    const fallbackHandler = this.fallbackHandlers.get(error.type);
    
    if (fallbackHandler) {
      fallbackHandler(error);
      return { handled: true };
    }

    // Default fallback if no specific handler
    this.defaultSystemErrorHandler(error);
    return { handled: false };
  }

  // Default system error handler
  private defaultSystemErrorHandler(
    error: z.infer<typeof ErrorSchema>
  ): void {
    // Comprehensive error logging
    logger.log('error', 'Unhandled System Error', {
      errorType: error.type,
      errorCode: error.code,
      errorMessage: error.message,
      severity: error.severity,
      context: error.context
    });

    // Optional: Send alert to monitoring system
    if (error.severity === 'CRITICAL') {
      // Placeholder for critical error notification
      // Could integrate with PagerDuty, Slack, etc.
      console.error('CRITICAL ERROR ALERT', error);
    }
  }

  // Circuit breaker for external services
  public createCircuitBreaker(
    serviceName: string, 
    options: {
      failureThreshold?: number;
      recoveryTime?: number;
    } = {}
  ): (fn: () => Promise<any>) => Promise<any> {
    const {
      failureThreshold = 3,
      recoveryTime = 30000 // 30 seconds
    } = options;

    let failures = 0;
    let lastFailureTime: number | null = null;
    let isOpen = false;

    return async (fn) => {
      // Check circuit breaker state
      if (isOpen) {
        if (lastFailureTime && 
            Date.now() - lastFailureTime > recoveryTime) {
          // Half-open: allow one request to test recovery
          isOpen = false;
        } else {
          throw this.createError({
            type: 'EXTERNAL_SERVICE_ERROR',
            code: 'CIRCUIT_OPEN',
            message: `Circuit breaker open for ${serviceName}`,
            severity: 'HIGH',
            context: { serviceName }
          });
        }
      }

      try {
        const result = await fn();
        // Reset on successful call
        failures = 0;
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();

        if (failures >= failureThreshold) {
          isOpen = true;
          logger.log('warn', `Circuit breaker activated for ${serviceName}`);
        }

        throw error;
      }
    };
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();
