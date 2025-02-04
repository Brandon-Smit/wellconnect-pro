import { EmailService } from '@/lib/services/email-service';
import nodemailer from 'nodemailer';
import { complianceService } from '@/lib/services/compliance-service';

// Mock nodemailer and compliance service
jest.mock('nodemailer');
jest.mock('@/lib/services/compliance-service');

const mockSMTPConfig = {
  host: 'smtp.test.com',
  port: 587,
  username: 'testuser',
  password: 'testpass',
  secure: false,
  fromEmail: 'test@wellconnect.pro'
};

describe('Email Service', () => {
  let emailService: EmailService;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create email service with test config
    emailService = new EmailService(mockSMTPConfig);
  });

  test('initializes transporter correctly', () => {
    expect(() => emailService.initializeTransporter(mockSMTPConfig)).not.toThrow();
  });

  test('sends email successfully', async () => {
    // Mock successful email sending
    const mockSendMail = jest.fn().mockResolvedValue({
      messageId: 'test-message-id',
      accepted: ['recipient@test.com'],
      rejected: []
    });

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail
    });

    const result = await emailService.sendEmail({
      to: 'recipient@test.com',
      subject: 'Test Subject',
      body: 'Test Body',
      campaignId: 'test-campaign'
    });

    expect(result.messageId).toBe('test-message-id');
    expect(complianceService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'sent',
        campaignId: 'test-campaign'
      })
    );
  });

  test('handles email sending failure', async () => {
    // Mock email sending failure
    const mockSendMail = jest.fn().mockRejectedValue(new Error('SMTP Error'));

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail: mockSendMail
    });

    await expect(emailService.sendEmail({
      to: 'recipient@test.com',
      subject: 'Test Subject',
      body: 'Test Body',
      campaignId: 'test-campaign'
    })).rejects.toThrow('Failed to send email');

    expect(complianceService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'bounced',
        campaignId: 'test-campaign'
      })
    );
  });

  test('validates input', async () => {
    await expect(emailService.sendEmail({
      // @ts-ignore
      to: 'invalid-email',
      subject: '',
      body: ''
    })).rejects.toThrow();
  });

  test('tests SMTP connection', async () => {
    // Mock connection verification
    const mockVerify = jest.fn().mockResolvedValue(true);

    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      verify: mockVerify
    });

    const result = await emailService.testConnection();
    expect(result).toBe(true);
  });
});
