import nodemailer from 'nodemailer';
import { z } from 'zod';
import { complianceService } from './compliance-service';

// SMTP Configuration Schema
export const SMTPConfigSchema = z.object({
  host: z.string().min(1, "SMTP Host is required"),
  port: z.number().min(1, "SMTP Port is required"),
  username: z.string().min(1, "SMTP Username is required"),
  password: z.string().min(1, "SMTP Password is required"),
  secure: z.boolean().default(false),
  fromEmail: z.string().email("Invalid sender email")
});

// Email Sending Input Schema
export const EmailSendInputSchema = z.object({
  to: z.string().email("Invalid recipient email"),
  subject: z.string().min(1, "Email subject is required"),
  body: z.string().min(1, "Email body is required"),
  campaignId: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.instanceof(Buffer)
  })).optional()
});

export type SMTPConfig = z.infer<typeof SMTPConfigSchema>;
export type EmailSendInput = z.infer<typeof EmailSendInputSchema>;

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config?: SMTPConfig) {
    if (config) {
      this.initializeTransporter(config);
    }
  }

  initializeTransporter(config: SMTPConfig) {
    // Validate SMTP configuration
    const validatedConfig = SMTPConfigSchema.parse(config);

    this.transporter = nodemailer.createTransport({
      host: validatedConfig.host,
      port: validatedConfig.port,
      secure: validatedConfig.secure,
      auth: {
        user: validatedConfig.username,
        pass: validatedConfig.password
      }
    });
  }

  async sendEmail(input: EmailSendInput) {
    // Validate input
    const validatedInput = EmailSendInputSchema.parse(input);

    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    try {
      // Send email
      const result = await this.transporter.sendMail({
        from: this.config?.fromEmail || 'noreply@wellconnect.pro',
        to: validatedInput.to,
        subject: validatedInput.subject,
        html: this.formatEmailBody(validatedInput.body),
        attachments: validatedInput.attachments
      });

      // Log successful email sending
      if (validatedInput.campaignId) {
        await complianceService.logAction({
          campaignId: validatedInput.campaignId,
          action: 'sent',
          metadata: {
            messageId: result.messageId,
            accepted: result.accepted,
            rejected: result.rejected
          }
        });
      }

      return result;
    } catch (error) {
      // Log email sending failure
      if (validatedInput.campaignId) {
        await complianceService.logAction({
          campaignId: validatedInput.campaignId,
          action: 'bounced',
          reason: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      console.error('Email Sending Error:', error);
      throw new Error('Failed to send email');
    }
  }

  private formatEmailBody(body: string): string {
    // Add WellConnect Pro email template
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background-color: #f4f4f4; 
        }
        .header { 
          background-color: #4a90e2; 
          color: white; 
          text-align: center; 
          padding: 10px; 
        }
        .content { 
          background-color: white; 
          padding: 20px; 
          border-radius: 5px; 
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #777;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>WellConnect Pro</h1>
        </div>
        <div class="content">
          ${body}
        </div>
        <div class="footer">
          <p> ${new Date().getFullYear()} WellConnect Pro. All rights reserved.</p>
          <p>Mental Health Support for Modern Workplaces</p>
        </div>
      </div>
    </body>
    </html>
    `;
  }

  // Method to test SMTP configuration
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('SMTP Connection Test Failed:', error);
      return false;
    }
  }

  // Method for manual email sending with optional campaign tracking
  async sendManualEmail(input: {
    to: string;
    subject: string;
    body: string;
    campaignId?: string | null;
  }) {
    try {
      // Validate input
      const validatedInput = {
        to: input.to,
        subject: input.subject,
        body: input.body,
        campaignId: input.campaignId || null
      };

      // Send email
      const result = await this.sendEmail({
        ...validatedInput,
        attachments: [] // No attachments for manual send
      });

      // Log manual email send if campaign ID is provided
      if (validatedInput.campaignId) {
        await complianceService.logAction({
          campaignId: validatedInput.campaignId,
          action: 'manual_sent',
          metadata: {
            messageId: result.messageId,
            recipient: validatedInput.to
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Manual email sending failed:', error);
      throw new Error('Failed to send manual email');
    }
  }
}

export const emailService = new EmailService();
