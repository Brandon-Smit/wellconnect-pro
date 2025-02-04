import nodemailer from 'nodemailer';
import { CompanyContact } from '../types/companyContact';

export class DispatchAgent {
  private smtpConfigs = [
    {
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: process.env.SMTP_USER_1,
        pass: process.env.SMTP_PASS_1
      }
    },
    {
      host: 'smtp.outlook.com',
      port: 587,
      auth: {
        user: process.env.SMTP_USER_2,
        pass: process.env.SMTP_PASS_2
      }
    }
  ];

  private dailyEmailLimit = 50;
  private emailsSentToday = 0;

  async sendEmail(contact: CompanyContact, content: string): Promise<boolean> {
    if (this.emailsSentToday >= this.dailyEmailLimit) {
      console.warn('Daily email limit reached');
      return false;
    }

    const transporter = this.getNextSmtpTransporter();

    try {
      await transporter.sendMail({
        from: '"WellConnect Pro" <support@wellconnectpro.com>',
        to: contact.email,
        subject: 'Mental Health Resources for Your Team',
        text: content,
        headers: {
          'X-Company-Size': contact.companySize.toString(),
          'X-Industry': contact.industry
        }
      });

      this.emailsSentToday++;
      this.resetDailyLimitAtMidnight();

      return true;
    } catch (error) {
      console.error('Email dispatch failed:', error);
      return false;
    }
  }

  private getNextSmtpTransporter() {
    const config = this.smtpConfigs[this.emailsSentToday % this.smtpConfigs.length];
    return nodemailer.createTransport(config);
  }

  private resetDailyLimitAtMidnight() {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    
    setTimeout(() => {
      this.emailsSentToday = 0;
    }, midnight.getTime() - now.getTime());
  }
}
