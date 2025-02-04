import { BaseAgent, AgentConfig } from './BaseAgent';

export class DispatchAgent extends BaseAgent {
  private emailQueue: any[] = [];
  private rateLimit = {
    maxEmailsPerHour: 50,
    currentHourCount: 0,
    lastResetTimestamp: Date.now()
  };

  constructor(config: AgentConfig) {
    super({
      ...config,
      capabilities: [
        'email_sending', 
        'rate_limiting', 
        'delivery_tracking'
      ]
    });
  }

  async initialize(): Promise<void> {
    // Initialize dispatch capabilities
    this.setState('dispatchModules', {
      emailSending: false,
      rateLimiting: true,
      deliveryTracking: false
    });
  }

  async process(input: { 
    action: 'send_email' | 'queue_email' | 'track_delivery', 
    data?: any 
  }): Promise<any> {
    switch (input.action) {
      case 'send_email':
        return this.sendEmail(input.data);
      case 'queue_email':
        return this.queueEmail(input.data);
      case 'track_delivery':
        return this.trackDelivery(input.data);
      default:
        throw new Error('Unsupported dispatch action');
    }
  }

  private async sendEmail(emailData: any) {
    // Check rate limiting
    if (!this.checkRateLimit()) {
      return this.queueEmail(emailData);
    }

    // Simulated email sending
    return {
      status: 'simulated',
      recipient: emailData.to,
      timestamp: new Date().toISOString()
    };
  }

  private async queueEmail(emailData: any) {
    this.emailQueue.push({
      ...emailData,
      queuedAt: new Date().toISOString()
    });

    return {
      status: 'queued',
      queuePosition: this.emailQueue.length
    };
  }

  private async trackDelivery(emailId: string) {
    // Placeholder for delivery tracking
    return {
      status: 'simulated',
      emailId,
      deliveryStatus: 'pending'
    };
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Reset counter if an hour has passed
    if (now - this.rateLimit.lastResetTimestamp >= oneHour) {
      this.rateLimit.currentHourCount = 0;
      this.rateLimit.lastResetTimestamp = now;
    }

    // Check if we've exceeded rate limit
    if (this.rateLimit.currentHourCount >= this.rateLimit.maxEmailsPerHour) {
      return false;
    }

    this.rateLimit.currentHourCount++;
    return true;
  }

  handleEvent(eventType: string, payload: any): void {
    switch (eventType) {
      case 'email_send_request':
        this.process({ action: 'send_email', data: payload });
        break;
      case 'delivery_track_request':
        this.process({ action: 'track_delivery', data: payload });
        break;
      default:
        this.emit('unhandledEvent', { eventType, payload });
    }
  }
}
