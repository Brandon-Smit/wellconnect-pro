import nodemailer from 'nodemailer';
import { z } from 'zod';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';
import { configManager } from '../core/configurationManager';
import { consentManagement } from '../compliance/consentManagement';

// Email Dispatch Configuration Schema
const DispatchConfigSchema = z.object({
  dailyRateLimit: z.number().min(1).max(100).default(50),
  smtpServers: z.array(z.object({
    host: z.string(),
    port: z.number(),
    username: z.string(),
    password: z.string(),
    secure: z.boolean().default(true)
  })).min(1),
  retryConfig: z.object({
    maxRetries: z.number().min(1).max(5).default(3),
    retryDelay: z.number().min(1000).max(60000).default(5000)
  }),
  trackingConfig: z.object({
    enableOpenTracking: z.boolean().default(true),
    enableClickTracking: z.boolean().default(true)
  })
});

// Email Tracking Schema
const EmailTrackingSchema = z.object({
  messageId: z.string(),
  recipient: z.string().email(),
  status: z.enum(['queued', 'sent', 'delivered', 'opened', 'clicked', 'failed']),
  attempts: z.number().min(0).default(0),
  lastAttemptAt: z.date().optional(),
  openedAt: z.date().optional(),
  clickedAt: z.date().optional(),
  errorMessage: z.string().optional()
});

class EmailDispatchModule {
  private static instance: EmailDispatchModule;
  private dispatchConfig: z.infer<typeof DispatchConfigSchema>;
  private emailTracking: Map<string, z.infer<typeof EmailTrackingSchema>> = new Map();
  private currentSmtpIndex = 0;
  private dailyEmailCount = 0;
  private dailyResetTime: Date;

  private constructor() {
    this.dispatchConfig = DispatchConfigSchema.parse(
      configManager.get('emailDispatch') || {}
    );
    this.dailyResetTime = this.calculateDailyResetTime();
  }

  public static getInstance(): EmailDispatchModule {
    if (!EmailDispatchModule.instance) {
      EmailDispatchModule.instance = new EmailDispatchModule();
    }
    return EmailDispatchModule.instance;
  }

  // Configure email dispatch settings
  public configure(config: Partial<z.infer<typeof DispatchConfigSchema>>): void {
    this.dispatchConfig = DispatchConfigSchema.parse({
      ...this.dispatchConfig,
      ...config
    });

    logger.log('info', 'Email Dispatch Configuration Updated', {
      dailyRateLimit: this.dispatchConfig.dailyRateLimit,
      smtpServersCount: this.dispatchConfig.smtpServers.length
    });
  }

  // Send email with tracking and rate limiting
  public async sendEmail(
    emailDetails: {
      to: string;
      subject: string;
      html: string;
      affiliateLink?: string;
    }
  ): Promise<z.infer<typeof EmailTrackingSchema>> {
    // Check consent
    const consentCheck = consentManagement.checkConsent(
      emailDetails.to, 
      'affiliate_communication'
    );

    if (!consentCheck.isValid) {
      throw new Error('Consent not granted for email communication');
    }

    // Rate limiting
    this.checkRateLimit();

    const currentSmtp = this.getCurrentSmtp();
    const transporter = nodemailer.createTransport({
      host: currentSmtp.host,
      port: currentSmtp.port,
      secure: currentSmtp.secure,
      auth: {
        user: currentSmtp.username,
        pass: currentSmtp.password
      }
    });

    try {
      const result = await this.sendEmailWithRetry(
        transporter, 
        emailDetails
      );

      this.dailyEmailCount++;
      return result;
    } catch (error) {
      logger.log('error', 'Email Dispatch Failed', {
        recipient: emailDetails.to,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  // Send email with retry mechanism
  private async sendEmailWithRetry(
    transporter: nodemailer.Transporter,
    emailDetails: {
      to: string;
      subject: string;
      html: string;
      affiliateLink?: string;
    },
    attempt = 1
  ): Promise<z.infer<typeof EmailTrackingSchema>> {
    try {
      const messageInfo = await transporter.sendMail({
        from: 'WellConnect Pro <noreply@wellconnectpro.com>',
        to: emailDetails.to,
        subject: emailDetails.subject,
        html: this.injectTrackingPixel(
          emailDetails.html, 
          emailDetails.to, 
          emailDetails.affiliateLink
        )
      });

      const trackingEntry = EmailTrackingSchema.parse({
        messageId: messageInfo.messageId,
        recipient: emailDetails.to,
        status: 'sent',
        attempts: attempt,
        lastAttemptAt: new Date()
      });

      this.emailTracking.set(messageInfo.messageId, trackingEntry);

      // Publish email sent event
      eventBus.publish(EventTypes.EMAIL_SENT, trackingEntry);

      return trackingEntry;
    } catch (error) {
      if (attempt < this.dispatchConfig.retryConfig.maxRetries) {
        await new Promise(resolve => 
          setTimeout(
            resolve, 
            this.dispatchConfig.retryConfig.retryDelay
          )
        );

        return this.sendEmailWithRetry(
          transporter, 
          emailDetails, 
          attempt + 1
        );
      }

      const failedTrackingEntry = EmailTrackingSchema.parse({
        messageId: `failed-${Date.now()}`,
        recipient: emailDetails.to,
        status: 'failed',
        attempts: attempt,
        lastAttemptAt: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      this.emailTracking.set(failedTrackingEntry.messageId, failedTrackingEntry);

      // Publish email dispatch failure event
      eventBus.publish(EventTypes.EMAIL_DISPATCH_FAILED, failedTrackingEntry);

      throw error;
    }
  }

  // Inject tracking pixel and affiliate link
  private injectTrackingPixel(
    html: string, 
    recipient: string, 
    affiliateLink?: string
  ): string {
    if (!this.dispatchConfig.trackingConfig.enableOpenTracking) {
      return html;
    }

    const trackingPixel = `
      <img 
        src="https://wellconnectpro.com/track/open?r=${encodeURIComponent(recipient)}" 
        width="1" 
        height="1" 
        style="display:none;"
      />
    `;

    // Inject tracking pixel and affiliate link
    return html + trackingPixel + 
      (affiliateLink ? `<a href="${affiliateLink}">Affiliate Link</a>` : '');
  }

  // Rate limit check
  private checkRateLimit(): void {
    const now = new Date();

    // Reset daily count if it's a new day
    if (now > this.dailyResetTime) {
      this.dailyEmailCount = 0;
      this.dailyResetTime = this.calculateDailyResetTime();
    }

    if (this.dailyEmailCount >= this.dispatchConfig.dailyRateLimit) {
      throw new Error('Daily email rate limit exceeded');
    }
  }

  // Calculate daily reset time
  private calculateDailyResetTime(): Date {
    const reset = new Date();
    reset.setHours(0, 0, 0, 0);
    reset.setDate(reset.getDate() + 1);
    return reset;
  }

  // Rotate SMTP server
  private getCurrentSmtp(): z.infer<typeof DispatchConfigSchema>['smtpServers'][0] {
    const smtp = this.dispatchConfig.smtpServers[this.currentSmtpIndex];
    
    // Rotate to next SMTP server
    this.currentSmtpIndex = 
      (this.currentSmtpIndex + 1) % this.dispatchConfig.smtpServers.length;

    return smtp;
  }

  // Track email open
  public trackEmailOpen(recipient: string, messageId: string): void {
    if (!this.dispatchConfig.trackingConfig.enableOpenTracking) return;

    const tracking = this.emailTracking.get(messageId);
    if (tracking) {
      tracking.status = 'opened';
      tracking.openedAt = new Date();

      // Publish email open event
      eventBus.publish(EventTypes.EMAIL_OPENED, tracking);
    }
  }

  // Track email click
  public trackEmailClick(recipient: string, messageId: string, link: string): void {
    if (!this.dispatchConfig.trackingConfig.enableClickTracking) return;

    const tracking = this.emailTracking.get(messageId);
    if (tracking) {
      tracking.status = 'clicked';
      tracking.clickedAt = new Date();

      // Publish email click event
      eventBus.publish(EventTypes.EMAIL_CLICKED, {
        ...tracking,
        clickedLink: link
      });
    }
  }

  // Generate email dispatch report
  public generateDispatchReport(
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): {
    totalEmails: number;
    emailStatusCounts: Record<string, number>;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  } {
    const { startDate, endDate } = options;

    const filteredTracking = Array.from(this.emailTracking.values()).filter(
      tracking => 
        (!startDate || tracking.lastAttemptAt >= startDate) &&
        (!endDate || tracking.lastAttemptAt <= endDate)
    );

    const statusCounts = filteredTracking.reduce((counts, tracking) => {
      counts[tracking.status] = (counts[tracking.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    const totalEmails = filteredTracking.length;
    const deliveredEmails = statusCounts['delivered'] || 0;
    const openedEmails = filteredTracking.filter(t => t.openedAt).length;
    const clickedEmails = filteredTracking.filter(t => t.clickedAt).length;

    const report = {
      totalEmails,
      emailStatusCounts: statusCounts,
      deliveryRate: totalEmails > 0 ? deliveredEmails / totalEmails : 0,
      openRate: totalEmails > 0 ? openedEmails / totalEmails : 0,
      clickRate: totalEmails > 0 ? clickedEmails / totalEmails : 0
    };

    // Publish dispatch report event
    eventBus.publish(EventTypes.EMAIL_DISPATCH_REPORT_GENERATED, report);

    return report;
  }

  // Clear email tracking history
  public clearTrackingHistory(): void {
    this.emailTracking.clear();
    logger.log('info', 'Email Tracking History Cleared');
  }
}

export const emailDispatchModule = EmailDispatchModule.getInstance();
