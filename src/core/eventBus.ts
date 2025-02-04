import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './loggingSystem';

// Event Type Schema
export const EventTypes = {
  CAMPAIGN_INITIATED: 'CAMPAIGN_INITIATED',
  CAMPAIGN_COMPLETED: 'CAMPAIGN_COMPLETED',
  EMAIL_SENT: 'EMAIL_SENT',
  EMAIL_DELIVERY_FAILED: 'EMAIL_DELIVERY_FAILED',
  CONTENT_GENERATED: 'CONTENT_GENERATED',
  ETHICAL_SCORE_UPDATED: 'ETHICAL_SCORE_UPDATED',
  ERROR_OCCURRED: 'ERROR_OCCURRED',
  SYSTEM_HEALTH_CHECK: 'SYSTEM_HEALTH_CHECK',
  EMAIL_DISCOVERY_STARTED: 'email:discovery:started',
  EMAIL_DISCOVERY_COMPLETED: 'email:discovery:completed',
  COMPLIANCE_CHECK_STARTED: 'compliance:check:started',
  COMPLIANCE_CHECK_COMPLETED: 'compliance:check:completed',
  CONTENT_GENERATION_STARTED: 'content:generation:started',
  CONTENT_GENERATION_COMPLETED: 'content:generation:completed',
  AFFILIATE_LINK_CREATED: 'affiliate:link:created',
  EMAIL_DISPATCH_STARTED: 'email:dispatch:started',
  EMAIL_DISPATCH_COMPLETED: 'email:dispatch:completed',
  CAMPAIGN_STARTED: 'campaign:started',
  CAMPAIGN_COMPLETED: 'campaign:completed',
  ERROR_OCCURRED: 'system:error',
  ETHICAL_REPORT_GENERATED: 'ethical:report:generated',
  // Machine Learning Events
  ML_MODEL_REGISTERED: 'ml:model:registered',
  ML_MODEL_PERFORMANCE_UPDATED: 'ml:model:performance:updated',
  ML_TRAINING_STARTED: 'ml:training:started',
  ML_TRAINING_COMPLETED: 'ml:training:completed',
  ML_TRAINING_ERROR: 'ml:training:error',
  // Performance Monitoring Events
  PERFORMANCE_METRIC_RECORDED: 'performance:metric:recorded',
  PERFORMANCE_SUMMARY_GENERATED: 'performance:summary:generated',
  PERFORMANCE_THRESHOLD_EXCEEDED: 'performance:threshold:exceeded',
  CRITICAL_OPERATION_FAILED: 'performance:critical:failed',
  SLOW_REQUEST_DETECTED: 'performance:slow:request',
  SLOW_QUERY_DETECTED: 'performance:slow:query',
  SLOW_ML_INFERENCE_DETECTED: 'performance:slow:ml_inference',
  PERFORMANCE_ALERT_GENERATED: 'performance:alert:generated',
  SYSTEM_PERFORMANCE_METRICS: 'performance:system:metrics',
  PERFORMANCE_ALERT_TRIGGERED: 'performance:alert:triggered',
  RESOURCE_THRESHOLD_EXCEEDED: 'performance:resource:threshold_exceeded',
  // Compliance Events
  COMPLIANCE_RULE_REGISTERED: 'compliance:rule:registered',
  COMPLIANCE_RULE_REMOVED: 'compliance:rule:removed',
  COMPLIANCE_CHECK_COMPLETED: 'compliance:check:completed',
  COMPLIANCE_REPORT_GENERATED: 'compliance:report:generated',
  // Consent Management Events
  CONSENT_PURPOSE_REGISTERED: 'consent:purpose:registered',
  CONSENT_PURPOSE_REMOVED: 'consent:purpose:removed',
  CONSENT_GRANTED: 'consent:granted',
  CONSENT_REVOKED: 'consent:revoked',
  CONSENT_REPORT_GENERATED: 'consent:report:generated',
  // Email Discovery Events
  EMAIL_DISCOVERY_COMPLETED: 'email:discovery:completed',

  // Email Dispatch Events
  EMAIL_SENT: 'email:sent',
  EMAIL_DISPATCH_FAILED: 'email:dispatch:failed',
  EMAIL_OPENED: 'email:opened',
  EMAIL_CLICKED: 'email:clicked',
  EMAIL_DISPATCH_REPORT_GENERATED: 'email:dispatch:report:generated',

  // Affiliate Link Events
  AFFILIATE_LINK_REGISTERED: 'affiliate:link:registered',
  AFFILIATE_LINK_CLICKED: 'affiliate:link:clicked',
  AFFILIATE_LINK_CONVERTED: 'affiliate:link:converted',
  AFFILIATE_LINK_REMOVED: 'affiliate:link:removed',
  AFFILIATE_PERFORMANCE_REPORT_GENERATED: 'affiliate:performance:report:generated',

  // Campaign Workflow Events
  CAMPAIGN_WORKFLOW_CREATED: 'campaign:workflow:created',
  CAMPAIGN_WORKFLOW_EXECUTED: 'campaign:workflow:executed',
  CAMPAIGN_WORKFLOW_FAILED: 'campaign:workflow:failed',
  CAMPAIGN_WORKFLOW_PAUSED: 'campaign:workflow:paused',
  CAMPAIGN_WORKFLOW_RESUMED: 'campaign:workflow:resumed',
  CAMPAIGN_WORKFLOW_REMOVED: 'campaign:workflow:removed',
  // Content Generation Events
  EMAIL_CONTENT_GENERATED: 'content:email:generated',
  MENTAL_HEALTH_RECOMMENDATIONS_GENERATED: 'content:mental_health:recommendations:generated',
  // Performance Analytics Events
  CAMPAIGN_PERFORMANCE_ANALYZED: 'analytics:campaign:performance:analyzed',
  EMAIL_CAMPAIGN_COMPLETED: 'analytics:email_campaign:completed',
  OPTIMIZATION_RECOMMENDATION_GENERATED: 'analytics:optimization:recommended',
  CAMPAIGN_CONVERSION_RATE_ANALYZED: 'analytics:campaign:conversion_rate:analyzed',
  CAMPAIGN_RETURN_ON_INVESTMENT_ANALYZED: 'analytics:campaign:return_on_investment:analyzed',
  CAMPAIGN_COST_PER_CONVERSION_ANALYZED: 'analytics:campaign:cost_per_conversion:analyzed',
  CAMPAIGN_COST_PER_CLICK_ANALYZED: 'analytics:campaign:cost_per_click:analyzed',
  CAMPAIGN_CLICK_THROUGH_RATE_ANALYZED: 'analytics:campaign:click_through_rate:analyzed',
  CAMPAIGN_OPEN_RATE_ANALYZED: 'analytics:campaign:open_rate:analyzed',
  CAMPAIGN_BOUNCE_RATE_ANALYZED: 'analytics:campaign:bounce_rate:analyzed',
  CAMPAIGN_UNSUBSCRIBE_RATE_ANALYZED: 'analytics:campaign:unsubscribe_rate:analyzed',
  CAMPAIGN_COMPLAINT_RATE_ANALYZED: 'analytics:campaign:complaint_rate:analyzed'
} as const;

// Event Schema
const EventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(Object.values(EventTypes)),
  timestamp: z.date(),
  payload: z.record(z.string(), z.any()).optional(),
  metadata: z.object({
    traceId: z.string().optional(),
    serviceName: z.string().default('WellConnectPro'),
    environment: z.enum(['development', 'staging', 'production']).default('development')
  })
});

type Event = z.infer<typeof EventSchema>;
type EventType = keyof typeof EventTypes;
type EventHandler = (event: Event) => Promise<void> | void;

class EventBus {
  private static instance: EventBus;
  private subscribers: Map<EventType, Set<EventHandler>> = new Map();
  private eventHistory: Event[] = [];
  private maxHistorySize: number = 1000;

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe(
    eventType: EventType, 
    handler: EventHandler
  ): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    
    const subscriberSet = this.subscribers.get(eventType)!;
    subscriberSet.add(handler);

    // Return unsubscribe function
    return () => {
      subscriberSet.delete(handler);
    };
  }

  public async publish(
    eventType: EventType, 
    payload?: Record<string, any>
  ): Promise<void> {
    const event: Event = EventSchema.parse({
      id: uuidv4(),
      type: eventType,
      timestamp: new Date(),
      payload,
      metadata: {
        traceId: uuidv4(),
        serviceName: 'WellConnectPro',
        environment: process.env.NODE_ENV as 'development' | 'staging' | 'production' || 'development'
      }
    });

    // Log the event
    logger.info(`Event Published: ${eventType}`, { 
      eventId: event.id, 
      payload: event.payload 
    });

    // Store in event history
    this.storeEventInHistory(event);

    // Dispatch to subscribers
    const subscribers = this.subscribers.get(eventType) || new Set();
    const handlerPromises = Array.from(subscribers).map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        logger.error(`Event Handler Error for ${eventType}`, { 
          error, 
          eventId: event.id 
        });
      }
    });

    // Wait for all handlers to complete
    await Promise.allSettled(handlerPromises);
  }

  private storeEventInHistory(event: Event): void {
    this.eventHistory.push(event);

    // Maintain maximum history size
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  // Retrieve event history with optional filtering
  public getEventHistory(options: {
    eventType?: EventType,
    startDate?: Date,
    endDate?: Date,
    limit?: number
  } = {}): Event[] {
    let filteredHistory = this.eventHistory;

    if (options.eventType) {
      filteredHistory = filteredHistory.filter(event => event.type === options.eventType);
    }

    if (options.startDate) {
      filteredHistory = filteredHistory.filter(event => event.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filteredHistory = filteredHistory.filter(event => event.timestamp <= options.endDate!);
    }

    if (options.limit) {
      filteredHistory = filteredHistory.slice(-options.limit);
    }

    return filteredHistory;
  }

  // Advanced event correlation and tracing
  public async traceEventChain(
    initialEventId: string, 
    maxDepth: number = 5
  ): Promise<Event[]> {
    const relatedEvents: Event[] = [];
    let currentEvents = this.eventHistory.filter(event => event.id === initialEventId);

    for (let depth = 0; depth < maxDepth && currentEvents.length > 0; depth++) {
      relatedEvents.push(...currentEvents);

      // Find events with matching trace ID or related payload
      currentEvents = this.eventHistory.filter(event => 
        currentEvents.some(currentEvent => 
          event.metadata.traceId === currentEvent.metadata.traceId ||
          this.areEventsRelated(currentEvent, event)
        )
      );
    }

    return relatedEvents;
  }

  private areEventsRelated(event1: Event, event2: Event): boolean {
    // Implement custom logic to determine event relatedness
    // This could involve checking payload properties, service names, etc.
    return false; // Placeholder
  }
}

export const eventBus = EventBus.getInstance();
