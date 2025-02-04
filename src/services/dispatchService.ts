import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import { createTransport, Transporter } from 'nodemailer';
import { complianceService } from './complianceService';

// SMTP Provider Schema
const SMTPProviderSchema = z.object({
  id: z.string().uuid(),
  host: z.string(),
  port: z.number().min(1).max(65535),
  username: z.string(),
  password: z.string(),
  secure: z.boolean().default(false),
  maxEmailsPerDay: z.number().min(1).max(500).default(50),
  priority: z.number().min(1).max(10).default(5)
});

// Email Dispatch Record Schema
const EmailDispatchRecordSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string(),
  recipientEmail: z.string().email(),
  status: z.enum([
    'queued', 
    'sending', 
    'sent', 
    'delivered', 
    'bounced', 
    'spam', 
    'error'
  ]),
  timestamp: z.date(),
  providerId: z.string().uuid(),
  retryCount: z.number().min(0).max(5).default(0),
  trackingPixelId: z.string().optional(),
  openCount: z.number().min(0).default(0),
  clickCount: z.number().min(0).default(0)
});

// Email Content Schema
const EmailContentSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1),
  htmlBody: z.string().optional(),
  trackingPixelEnabled: z.boolean().default(true)
});

type SMTPProvider = z.infer<typeof SMTPProviderSchema>;
type EmailDispatchRecord = z.infer<typeof EmailDispatchRecordSchema>;
type EmailContent = z.infer<typeof EmailContentSchema>;

class DispatchService {
  private smtpProviders: SMTPProvider[] = [];
  private emailDispatchRecords: EmailDispatchRecord[] = [];
  private transporters: Map<string, Transporter> = new Map();

  constructor() {
    this.initializeDefaultProviders();
  }

  // Initialize default SMTP providers
  private initializeDefaultProviders(): void {
    const defaultProviders = [
      {
        host: 'smtp.gmail.com',
        port: 587,
        username: process.env.GMAIL_USERNAME || '',
        password: process.env.GMAIL_PASSWORD || '',
        secure: false,
        maxEmailsPerDay: 50,
        priority: 7
      },
      {
        host: 'smtp.sendgrid.net',
        port: 587,
        username: process.env.SENDGRID_USERNAME || '',
        password: process.env.SENDGRID_PASSWORD || '',
        secure: false,
        maxEmailsPerDay: 100,
        priority: 8
      }
    ];

    defaultProviders.forEach(providerConfig => {
      this.addSMTPProvider(providerConfig);
    });
  }

  // Add a new SMTP provider
  addSMTPProvider(
    providerConfig: Omit<SMTPProvider, 'id'>
  ): SMTPProvider {
    const provider = SMTPProviderSchema.parse({
      id: uuidv4(),
      ...providerConfig
    });

    // Create transporter
    const transporter = createTransport({
      host: provider.host,
      port: provider.port,
      secure: provider.secure,
      auth: {
        user: provider.username,
        pass: provider.password
      }
    });

    this.transporters.set(provider.id, transporter);
    this.smtpProviders.push(provider);

    return provider;
  }

  // Select optimal SMTP provider
  private selectOptimalProvider(): SMTPProvider {
    // Sort providers by priority and daily email limit
    const availableProviders = this.smtpProviders
      .filter(provider => {
        const dailyDispatchCount = this.getDailyDispatchCount(provider.id);
        return dailyDispatchCount < provider.maxEmailsPerDay;
      })
      .sort((a, b) => b.priority - a.priority);

    if (availableProviders.length === 0) {
      throw new Error('No available SMTP providers');
    }

    return availableProviders[0];
  }

  // Count daily dispatches for a provider
  private getDailyDispatchCount(providerId: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.emailDispatchRecords.filter(
      record => 
        record.providerId === providerId && 
        record.timestamp >= today
    ).length;
  }

  // Generate tracking pixel
  private generateTrackingPixel(dispatchId: string): string {
    return `https://wellconnect-pro.com/track/${dispatchId}`;
  }

  // Dispatch email
  async dispatchEmail(
    campaignId: string,
    recipientEmail: string,
    content: EmailContent
  ): Promise<EmailDispatchRecord> {
    // Check compliance
    if (complianceService.isBlocked(recipientEmail)) {
      throw new Error('Email is blocked due to compliance issues');
    }

    // Select provider
    const provider = this.selectOptimalProvider();
    const transporter = this.transporters.get(provider.id);

    if (!transporter) {
      throw new Error('No transporter found for provider');
    }

    // Prepare dispatch record
    const dispatchRecord = EmailDispatchRecordSchema.parse({
      id: uuidv4(),
      campaignId,
      recipientEmail,
      status: 'queued',
      timestamp: new Date(),
      providerId: provider.id,
      trackingPixelId: content.trackingPixelEnabled 
        ? this.generateTrackingPixel(uuidv4()) 
        : undefined
    });

    try {
      // Update status to sending
      dispatchRecord.status = 'sending';

      // Prepare email with tracking pixel if enabled
      const emailOptions = {
        from: '"WellConnect Pro" <noreply@wellconnectpro.com>',
        to: recipientEmail,
        subject: content.subject,
        text: content.body,
        html: content.htmlBody || content.body,
        ...(content.trackingPixelEnabled && dispatchRecord.trackingPixelId 
          ? { 
              html: `${content.htmlBody || content.body}
              <img src="${dispatchRecord.trackingPixelId}" width="1" height="1" />`
            }
          : {})
      };

      // Send email
      const info = await transporter.sendMail(emailOptions);

      // Update dispatch record
      dispatchRecord.status = 'sent';

      // Store dispatch record
      this.emailDispatchRecords.push(dispatchRecord);

      return dispatchRecord;
    } catch (error) {
      // Handle dispatch errors
      dispatchRecord.status = 'error';
      dispatchRecord.retryCount++;

      // Log error
      console.error('Email dispatch error:', error);

      // Retry mechanism
      if (dispatchRecord.retryCount < 3) {
        return this.retryDispatch(dispatchRecord, content);
      }

      throw error;
    }
  }

  // Retry email dispatch
  private async retryDispatch(
    dispatchRecord: EmailDispatchRecord,
    content: EmailContent
  ): Promise<EmailDispatchRecord> {
    // Wait before retry (exponential backoff)
    await new Promise(resolve => 
      setTimeout(resolve, 1000 * Math.pow(2, dispatchRecord.retryCount))
    );

    return this.dispatchEmail(
      dispatchRecord.campaignId, 
      dispatchRecord.recipientEmail, 
      content
    );
  }

  // Track email open
  trackEmailOpen(trackingPixelId: string): void {
    const record = this.emailDispatchRecords.find(
      record => record.trackingPixelId === trackingPixelId
    );

    if (record) {
      record.openCount++;
      record.status = 'delivered';
    }
  }

  // Track email click
  trackEmailClick(dispatchId: string): void {
    const record = this.emailDispatchRecords.find(
      record => record.id === dispatchId
    );

    if (record) {
      record.clickCount++;
    }
  }

  // Get dispatch statistics
  getDispatchStatistics(campaignId?: string): {
    totalDispatched: number;
    deliveryRate: number;
    openRate: number;
    clickRate: number;
  } {
    const filteredRecords = campaignId 
      ? this.emailDispatchRecords.filter(r => r.campaignId === campaignId)
      : this.emailDispatchRecords;

    const totalDispatched = filteredRecords.length;
    const deliveredCount = filteredRecords.filter(
      r => r.status === 'delivered' || r.status === 'sent'
    ).length;
    const openCount = filteredRecords.reduce(
      (sum, record) => sum + record.openCount, 0
    );
    const clickCount = filteredRecords.reduce(
      (sum, record) => sum + record.clickCount, 0
    );

    return {
      totalDispatched,
      deliveryRate: totalDispatched > 0 
        ? (deliveredCount / totalDispatched) * 100 
        : 0,
      openRate: totalDispatched > 0 
        ? (openCount / totalDispatched) * 100 
        : 0,
      clickRate: totalDispatched > 0 
        ? (clickCount / totalDispatched) * 100 
        : 0
    };
  }
}

export const dispatchService = new DispatchService();
