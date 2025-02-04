import { z } from 'zod';
import { emailService, SMTPConfig, SMTPConfigSchema } from './email-service';

// Configuration types
export const AppConfigSchema = z.object({
  smtpConfig: SMTPConfigSchema.optional(),
  apiKeys: z.object({
    huggingFace: z.string().optional(),
    openAI: z.string().optional()
  }).optional(),
  features: z.object({
    aiContentGeneration: z.boolean().default(true),
    complianceTracking: z.boolean().default(true)
  }).default({})
});

export type AppConfig = z.infer<typeof AppConfigSchema>;

export class ConfigService {
  private config: AppConfig = {
    features: {
      aiContentGeneration: true,
      complianceTracking: true
    }
  };

  // Retrieve current configuration
  getConfig(): AppConfig {
    return { ...this.config };
  }

  // Update entire configuration
  updateConfig(newConfig: AppConfig) {
    const validatedConfig = AppConfigSchema.parse(newConfig);
    
    // If SMTP config is provided, initialize email service
    if (validatedConfig.smtpConfig) {
      emailService.initializeTransporter(validatedConfig.smtpConfig);
    }

    // Update API keys in environment
    if (validatedConfig.apiKeys) {
      if (validatedConfig.apiKeys.huggingFace) {
        process.env.HUGGING_FACE_API_KEY = validatedConfig.apiKeys.huggingFace;
      }
      if (validatedConfig.apiKeys.openAI) {
        process.env.OPENAI_API_KEY = validatedConfig.apiKeys.openAI;
      }
    }

    this.config = validatedConfig;
    return this.config;
  }

  // Update SMTP configuration specifically
  updateSMTPConfig(smtpConfig: SMTPConfig) {
    const validatedConfig = SMTPConfigSchema.parse(smtpConfig);
    
    // Initialize email service with new config
    emailService.initializeTransporter(validatedConfig);

    // Update or add SMTP config to app config
    this.config = {
      ...this.config,
      smtpConfig: validatedConfig
    };

    return validatedConfig;
  }

  // Test SMTP configuration
  async testSMTPConfig(smtpConfig: SMTPConfig): Promise<boolean> {
    // Temporarily create a new email service to test config
    const testEmailService = new emailService.constructor(smtpConfig);
    return testEmailService.testConnection();
  }

  // Toggle feature flags
  setFeatureFlag(feature: keyof AppConfig['features'], enabled: boolean) {
    this.config.features = {
      ...this.config.features,
      [feature]: enabled
    };
    return this.config.features;
  }
}

export const configService = new ConfigService();
