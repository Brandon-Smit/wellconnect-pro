import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Email Dispatch Schema
const EmailDispatchSchema = z.object({
  id: z.string().uuid(),
  recipient: z.object({
    email: z.string().email(),
    name: z.string().optional(),
    company: z.string().optional()
  }),
  content: z.object({
    subject: z.string(),
    body: z.string()
  }),
  status: z.enum([
    'queued', 
    'sending', 
    'sent', 
    'failed', 
    'bounced'
  ]),
  trackingInfo: z.object({
    messageId: z.string().optional(),
    smtpServer: z.string(),
    sentAt: z.date().optional(),
    deliveryAttempts: z.number().min(0).default(0)
  }),
  performanceMetrics: z.object({
    openRate: z.number().min(0).max(100).default(0),
    clickRate: z.number().min(0).max(100).default(0)
  })
});

class EmailDispatchService {
  private smtpServers: string[] = [
    'smtp.sendgrid.net',
    'smtp.mailgun.org',
    'smtp.amazonses.com'
  ];

  private transporters: { [key: string]: nodemailer.Transporter } = {};

  constructor() {
    this.initializeSmtpTransporters();
  }

  // Initialize SMTP transporters
  private initializeSmtpTransporters() {
    this.smtpServers.forEach(server => {
      this.transporters[server] = nodemailer.createTransport({
        host: server,
        port: 587,
        secure: false,
        auth: {
          user: process.env[`${server.split('.')[1].toUpperCase()}_USERNAME`] || '',
          pass: process.env[`${server.split('.')[1].toUpperCase()}_PASSWORD`] || ''
        }
      });
    });
  }

  // Send email with intelligent routing and tracking
  async sendEmail(
    recipient: z.infer<typeof EmailDispatchSchema>['recipient'],
    content: z.infer<typeof EmailDispatchSchema>['content']
  ): Promise<z.infer<typeof EmailDispatchSchema>> {
    const dispatchRecord = EmailDispatchSchema.parse({
      id: uuidv4(),
      recipient,
      content,
      status: 'queued',
      trackingInfo: {
        smtpServer: this.selectSmtpServer(),
        deliveryAttempts: 0
      },
      performanceMetrics: {
        openRate: 0,
        clickRate: 0
      }
    });

    try {
      const transporter = this.transporters[dispatchRecord.trackingInfo.smtpServer];
      
      const result = await transporter.sendMail({
        from: '"WellConnect Pro" <support@wellconnectpro.com>',
        to: recipient.email,
        subject: content.subject,
        html: this.generateTrackableEmailBody(content.body, dispatchRecord.id),
        headers: {
          'X-Tracking-ID': dispatchRecord.id
        }
      });

      dispatchRecord.status = 'sent';
      dispatchRecord.trackingInfo.messageId = result.messageId;
      dispatchRecord.trackingInfo.sentAt = new Date();

      return dispatchRecord;
    } catch (error) {
      dispatchRecord.status = 'failed';
      dispatchRecord.trackingInfo.deliveryAttempts++;
      console.error('Email dispatch error', error);
      return dispatchRecord;
    }
  }

  // Select SMTP server with intelligent routing
  private selectSmtpServer(): string {
    // In a real implementation, this would consider server load, reputation, etc.
    return this.smtpServers[
      Math.floor(Math.random() * this.smtpServers.length)
    ];
  }

  // Generate trackable email body with tracking pixels and links
  private generateTrackableEmailBody(
    originalBody: string, 
    trackingId: string
  ): string {
    const trackingPixel = this.generateTrackingPixel(trackingId);
    const modifiedBody = this.insertTrackingLinks(originalBody, trackingId);

    return `${modifiedBody}${trackingPixel}`;
  }

  // Generate tracking pixel for email open tracking
  private generateTrackingPixel(trackingId: string): string {
    const trackingEndpoint = `https://wellconnectpro.com/track/open/${trackingId}`;
    return `<img src="${trackingEndpoint}" width="1" height="1" />`;
  }

  // Insert trackable links in email body
  private insertTrackingLinks(
    body: string, 
    trackingId: string
  ): string {
    // Replace links with tracked versions
    return body.replace(
      /href="([^"]+)"/g, 
      (match, url) => `href="https://wellconnectpro.com/track/click/${trackingId}?destination=${encodeURIComponent(url)}"`
    );
  }

  // Track email open event
  trackEmailOpen(trackingId: string): void {
    // In a real system, update performance metrics
    console.log(`Email opened: ${trackingId}`);
  }

  // Track email link click
  trackLinkClick(trackingId: string, destination: string): void {
    // In a real system, update performance metrics
    console.log(`Link clicked: ${trackingId}, Destination: ${destination}`);
  }

  // Rate limit email sending
  private async rateLimitEmails(
    emails: z.infer<typeof EmailDispatchSchema>[]
  ): Promise<z.infer<typeof EmailDispatchSchema>[]> {
    const MAX_DAILY_EMAILS = 50;
    const sentEmails = emails.filter(email => email.status === 'sent');

    if (sentEmails.length >= MAX_DAILY_EMAILS) {
      throw new Error('Daily email limit reached');
    }

    return emails;
  }

  // Bulk email dispatch with rate limiting
  async dispatchBulkEmails(
    emailRequests: Array<{
      recipient: z.infer<typeof EmailDispatchSchema>['recipient'];
      content: z.infer<typeof EmailDispatchSchema>['content'];
    }>
  ): Promise<z.infer<typeof EmailDispatchSchema>[]> {
    const emailDispatches: z.infer<typeof EmailDispatchSchema>[] = [];

    for (const request of emailRequests) {
      try {
        const dispatch = await this.sendEmail(
          request.recipient, 
          request.content
        );
        emailDispatches.push(dispatch);
      } catch (error) {
        console.error('Bulk email dispatch error', error);
      }
    }

    return this.rateLimitEmails(emailDispatches);
  }
}

export const emailDispatchService = new EmailDispatchService();
