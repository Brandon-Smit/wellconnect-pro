import { z } from 'zod';
import { logger } from './loggingSystem';
import { eventBus, EventTypes } from './eventBus';
import { configManager } from './configurationManager';

// Error Type Schema
const ErrorSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.date(),
  severity: z.enum([
    'CRITICAL', 
    'HIGH', 
    'MEDIUM', 
    'LOW', 
    'INFO'
  ]),
  category: z.enum([
    'SYSTEM',
    'NETWORK',
    'DATABASE',
    'ML_MODEL',
    'COMPLIANCE',
    'COMMUNICATION',
    'AUTHENTICATION',
    'EXTERNAL_SERVICE'
  ]),
  message: z.string(),
  context: z.record(z.string(), z.unknown()).optional(),
  stackTrace: z.string().optional(),
  resolution: z.string().optional()
});

type ErrorRecord = z.infer<typeof ErrorSchema>;

class ErrorTracker {
  private static instance: ErrorTracker;
  private errorLog: ErrorRecord[] = [];
  private maxErrorLogSize: number;

  private constructor() {
    this.maxErrorLogSize = configManager.get('performanceThresholds').maxDailyEmails;
  }

  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  public trackError(
    error: Omit<ErrorRecord, 'id' | 'timestamp'> & { 
      id?: string, 
      timestamp?: Date 
    }
  ): string {
    try {
      const errorRecord: ErrorRecord = {
        id: error.id || crypto.randomUUID(),
        timestamp: error.timestamp || new Date(),
        severity: error.severity,
        category: error.category,
        message: error.message,
        context: error.context,
        stackTrace: error.stackTrace,
        resolution: error.resolution
      };

      // Validate error record
      ErrorSchema.parse(errorRecord);

      // Manage error log size
      if (this.errorLog.length >= this.maxErrorLogSize) {
        this.errorLog.shift(); // Remove oldest error
      }

      this.errorLog.push(errorRecord);

      // Log to system logger
      logger.error('Error Tracked', { 
        errorId: errorRecord.id, 
        severity: errorRecord.severity,
        category: errorRecord.category
      });

      // Publish error event
      eventBus.publish(EventTypes.ERROR_TRACKED, errorRecord);

      // Trigger appropriate actions based on severity
      this.handleErrorEscalation(errorRecord);

      return errorRecord.id;
    } catch (validationError) {
      logger.error('Error Tracking Failed', { 
        originalError: error, 
        validationError 
      });
      throw validationError;
    }
  }

  private handleErrorEscalation(error: ErrorRecord): void {
    switch (error.severity) {
      case 'CRITICAL':
        this.triggerCriticalErrorProtocol(error);
        break;
      case 'HIGH':
        this.triggerHighSeverityAlert(error);
        break;
      default:
        // Log for monitoring
        logger.info('Error Logged', { 
          errorId: error.id, 
          category: error.category 
        });
    }
  }

  private triggerCriticalErrorProtocol(error: ErrorRecord): void {
    // Immediate system-wide alert
    eventBus.publish(EventTypes.SYSTEM_CRITICAL_ALERT, {
      errorId: error.id,
      message: 'Critical system error detected',
      details: error
    });

    // Optional: Trigger emergency shutdown or failover mechanism
    logger.critical('CRITICAL SYSTEM ERROR', { 
      errorId: error.id, 
      details: error 
    });
  }

  private triggerHighSeverityAlert(error: ErrorRecord): void {
    // Send high-priority notification
    eventBus.publish(EventTypes.HIGH_SEVERITY_ALERT, {
      errorId: error.id,
      message: 'High severity error requires immediate attention',
      details: error
    });

    logger.warn('High Severity Error', { 
      errorId: error.id, 
      details: error 
    });
  }

  public getErrorLog(
    options: { 
      limit?: number, 
      severity?: ErrorRecord['severity'], 
      category?: ErrorRecord['category'] 
    } = {}
  ): ErrorRecord[] {
    let filteredLog = [...this.errorLog];

    if (options.severity) {
      filteredLog = filteredLog.filter(err => err.severity === options.severity);
    }

    if (options.category) {
      filteredLog = filteredLog.filter(err => err.category === options.category);
    }

    return filteredLog
      .slice(-Math.min(options.limit || 100, 1000))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  public clearErrorLog(): void {
    this.errorLog = [];
    logger.info('Error Log Cleared');
  }

  // Advanced error analysis method
  public analyzeErrorTrends(): {
    categoryCounts: Record<ErrorRecord['category'], number>,
    severityCounts: Record<ErrorRecord['severity'], number>
  } {
    const categoryCounts: Record<ErrorRecord['category'], number> = {
      SYSTEM: 0,
      NETWORK: 0,
      DATABASE: 0,
      ML_MODEL: 0,
      COMPLIANCE: 0,
      COMMUNICATION: 0,
      AUTHENTICATION: 0,
      EXTERNAL_SERVICE: 0
    };

    const severityCounts: Record<ErrorRecord['severity'], number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0
    };

    this.errorLog.forEach(error => {
      categoryCounts[error.category]++;
      severityCounts[error.severity]++;
    });

    return { categoryCounts, severityCounts };
  }
}

export const errorTracker = ErrorTracker.getInstance();
