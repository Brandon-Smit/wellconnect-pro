import { configService } from '@/lib/services/config-service';
import { emailService } from '@/lib/services/email-service';

// Mock email service
jest.mock('@/lib/services/email-service');

describe('Configuration Service', () => {
  beforeEach(() => {
    // Reset configuration
    jest.clearAllMocks();
  });

  test('updates configuration', () => {
    const newConfig = {
      smtpConfig: {
        host: 'smtp.test.com',
        port: 587,
        username: 'testuser',
        password: 'testpass',
        secure: false,
        fromEmail: 'test@wellconnect.pro'
      },
      apiKeys: {
        huggingFace: 'test-hf-key',
        openAI: 'test-openai-key'
      },
      features: {
        aiContentGeneration: false
      }
    };

    const updatedConfig = configService.updateConfig(newConfig);

    expect(updatedConfig.smtpConfig?.host).toBe('smtp.test.com');
    expect(process.env.HUGGING_FACE_API_KEY).toBe('test-hf-key');
    expect(process.env.OPENAI_API_KEY).toBe('test-openai-key');
    expect(updatedConfig.features.aiContentGeneration).toBe(false);
  });

  test('updates SMTP configuration', () => {
    const smtpConfig = {
      host: 'smtp.example.com',
      port: 465,
      username: 'user',
      password: 'pass',
      secure: true,
      fromEmail: 'sender@example.com'
    };

    const updatedConfig = configService.updateSMTPConfig(smtpConfig);

    expect(emailService.initializeTransporter).toHaveBeenCalledWith(smtpConfig);
    expect(updatedConfig.host).toBe('smtp.example.com');
  });

  test('tests SMTP configuration', async () => {
    const smtpConfig = {
      host: 'smtp.test.com',
      port: 587,
      username: 'testuser',
      password: 'testpass',
      secure: false,
      fromEmail: 'test@wellconnect.pro'
    };

    // Mock test connection to return true
    (emailService.constructor as jest.Mock).mockImplementation(() => ({
      testConnection: jest.fn().mockResolvedValue(true)
    }));

    const result = await configService.testSMTPConfig(smtpConfig);
    expect(result).toBe(true);
  });

  test('toggles feature flags', () => {
    const updatedFeatures = configService.setFeatureFlag('aiContentGeneration', false);
    
    expect(updatedFeatures.aiContentGeneration).toBe(false);
  });

  test('validates configuration input', () => {
    expect(() => configService.updateConfig({
      // @ts-ignore
      smtpConfig: {
        host: '', // Invalid input
        port: -1
      }
    })).toThrow();
  });
});
