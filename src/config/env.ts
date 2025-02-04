import { z } from 'zod';

// Environment Configuration Schema
export const EnvConfigSchema = z.object({
  // AI Providers
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  MISTRAL_API_KEY: z.string().optional(),

  // Email Services
  SMTP_USERNAME: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SENDGRID_API_KEY: z.string().optional(),

  // Database
  DATABASE_URL: z.string().url(),
  
  // Compliance and Tracking
  COMPLIANCE_API_KEY: z.string().optional(),
  
  // Deployment Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Application-Specific Settings
  APP_NAME: z.string().default('WellConnect Pro'),
  APP_VERSION: z.string().default('1.0.0'),
  
  // Ethical AI Configuration
  ETHICAL_SCORE_THRESHOLD: z.number().min(0).max(10).default(7),
  
  // Proxy and Scraping
  PROXY_SERVERS: z.string().optional()
});

// Validate environment configuration
export const validateEnvConfig = () => {
  try {
    return EnvConfigSchema.parse(process.env);
  } catch (error) {
    console.error('Invalid environment configuration:', error);
    throw new Error('Environment configuration validation failed');
  }
};

// Export validated configuration
export const envConfig = validateEnvConfig();
