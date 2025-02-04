import { z } from 'zod';

// Comprehensive configuration validation schemas
const ServiceConfigSchema = z.object({
  aiService: z.object({
    provider: z.enum(['mistral', 'openai', 'huggingface', 'custom']),
    apiKey: z.string().optional(),
    customEndpoint: z.string().url().optional(),
    model: z.string().optional()
  }),
  emailService: z.object({
    provider: z.enum(['sendgrid', 'mailgun', 'postfix', 'custom']),
    apiKey: z.string().optional(),
    smtpHost: z.string().optional(),
    smtpPort: z.number().optional(),
    username: z.string().optional(),
    password: z.string().optional()
  }),
  database: z.object({
    type: z.enum(['sqlite', 'postgresql', 'mongodb', 'custom']),
    connectionString: z.string().optional(),
    host: z.string().optional(),
    port: z.number().optional(),
    username: z.string().optional(),
    password: z.string().optional()
  }),
  analytics: z.object({
    provider: z.enum(['plausible', 'mixpanel', 'custom']),
    apiKey: z.string().optional(),
    selfHostedUrl: z.string().url().optional()
  })
});

type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

export class ConfigService {
  private static instance: ConfigService;
  private currentConfig: ServiceConfig;

  private constructor() {
    // Default configuration
    this.currentConfig = {
      aiService: { provider: 'mistral' },
      emailService: { provider: 'sendgrid' },
      database: { type: 'sqlite' },
      analytics: { provider: 'plausible' }
    };
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  // Validate and update configuration
  updateServiceConfiguration(config: ServiceConfig): ServiceConfig {
    try {
      // Validate configuration
      const validatedConfig = ServiceConfigSchema.parse(config);
      
      // Perform additional validation checks
      this.validateServiceCredentials(validatedConfig);
      
      // Update current configuration
      this.currentConfig = validatedConfig;
      
      return validatedConfig;
    } catch (error) {
      console.error('Configuration validation failed', error);
      throw new Error('Invalid service configuration');
    }
  }

  // Get current configuration
  getCurrentConfiguration(): ServiceConfig {
    return this.currentConfig;
  }

  // Additional validation for service credentials
  private validateServiceCredentials(config: ServiceConfig): void {
    // Custom validation logic for each service
    // Example: Check API key formats, connection strings, etc.
    if (config.aiService.provider !== 'custom' && !config.aiService.apiKey) {
      throw new Error('API key required for selected AI service');
    }

    // Similar validations for other services
  }

  // Method to test service connections
  async testServiceConnections(config: ServiceConfig): Promise<boolean> {
    // Implement connection tests for each service
    // Return true if all services can be connected, false otherwise
    return true;
  }
}

export const configService = ConfigService.getInstance();
