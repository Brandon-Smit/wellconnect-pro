import { BaseAgent, AgentConfig } from './BaseAgent';
import { emailService } from '@/lib/api';

export class EmailAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    // Check existing email configuration
    try {
      const config = await emailService.getConfig();
      this.setState('emailConfig', config);
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
    }
  }

  async process(input: { 
    action: 'configure' | 'validate' | 'send', 
    data?: any 
  }): Promise<any> {
    switch (input.action) {
      case 'configure':
        return this.configureEmail(input.data);
      case 'validate':
        return this.validateEmailConfig();
      case 'send':
        return this.sendEmail(input.data);
      default:
        throw new Error('Unsupported action');
    }
  }

  private async configureEmail(emailConfig: any) {
    try {
      const result = await emailService.configureSmtp(emailConfig);
      
      // Update local state
      this.setState('emailConfig', emailConfig);
      this.emit('configurationUpdated', emailConfig);

      return result;
    } catch (error) {
      this.emit('error', { type: 'configureEmail', error });
      throw error;
    }
  }

  private async validateEmailConfig() {
    const config = this.getState('emailConfig');
    
    if (!config) {
      throw new Error('No email configuration found');
    }

    // Basic validation (in a real app, this would do more comprehensive checks)
    return {
      isValid: !!(config.smtpHost && config.smtpPort && config.username),
      details: {
        hostConfigured: !!config.smtpHost,
        portConfigured: !!config.smtpPort,
        usernameConfigured: !!config.username,
      },
    };
  }

  private async sendEmail(emailData: {
    to: string;
    subject: string;
    body: string;
  }) {
    // Placeholder for email sending logic
    // In a real application, this would integrate with an email service
    this.emit('emailAttempted', emailData);

    return {
      status: 'simulated',
      message: 'Email sending not implemented in this demo',
      recipient: emailData.to,
    };
  }

  handleEvent(eventType: string, payload: any): void {
    switch (eventType) {
      case 'configureRequest':
        this.process({ action: 'configure', data: payload });
        break;
      case 'validateRequest':
        this.process({ action: 'validate' });
        break;
      case 'sendEmailRequest':
        this.process({ action: 'send', data: payload });
        break;
      default:
        this.emit('unhandledEvent', { eventType, payload });
    }
  }
}
