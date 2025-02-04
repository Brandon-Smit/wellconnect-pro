import * as fs from 'fs';
import * as path from 'path';
import { z } from 'zod';
import { logger } from './loggingSystem';
import { eventBus, EventTypes } from './eventBus';

// Configuration Schema
const ConfigurationSchema = z.object({
  // System-wide settings
  systemName: z.string().default('WellConnect Pro'),
  environment: z.enum(['development', 'staging', 'production']).default('production'),
  
  // Performance settings
  performanceThresholds: z.object({
    maxDailyEmails: z.number().min(1).max(1000).default(500),
    ethicalScoreThreshold: z.number().min(0).max(1).default(0.7),
    personalizedContentQuality: z.number().min(0).max(1).default(0.75)
  }),

  // Compliance settings
  complianceSettings: z.object({
    gdprCompliant: z.boolean().default(true),
    consentManagement: z.boolean().default(true),
    dataRetentionPeriodDays: z.number().min(1).max(365).default(90)
  }),

  // Machine Learning settings
  mlModelSettings: z.object({
    modelType: z.enum(['transformer', 'neural_network', 'hybrid']).default('hybrid'),
    trainingDataSources: z.array(z.string()).default([
      'mental_health_resources',
      'hr_communication_datasets',
      'ethical_marketing_corpora'
    ]),
    retrainingFrequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly')
  }),

  // Email and communication settings
  communicationSettings: z.object({
    defaultContentType: z.enum([
      'wellness', 
      'mental-health', 
      'professional-development', 
      'support-resources'
    ]).default('mental-health'),
    maxPersonalizationDepth: z.number().min(1).max(10).default(5)
  }),

  // Security settings
  securitySettings: z.object({
    apiRateLimit: z.number().min(1).max(1000).default(100),
    jwtTokenExpiration: z.number().min(60).max(86400).default(3600),
    encryptionKey: z.string().min(32)
  })
});

type Configuration = z.infer<typeof ConfigurationSchema>;

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private configuration: Configuration;
  private configPath: string;

  private constructor() {
    this.configPath = path.resolve(process.cwd(), 'config', 'wellconnect-pro.json');
    this.configuration = this.loadConfiguration();
  }

  public static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  private loadConfiguration(): Configuration {
    try {
      // Check if config file exists
      if (!fs.existsSync(this.configPath)) {
        return this.createDefaultConfiguration();
      }

      // Read and parse configuration
      const rawConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      return ConfigurationSchema.parse(rawConfig);
    } catch (error) {
      logger.error('Configuration Loading Failed', { 
        error, 
        configPath: this.configPath 
      });

      // Fallback to default configuration
      return this.createDefaultConfiguration();
    }
  }

  private createDefaultConfiguration(): Configuration {
    const defaultConfig = ConfigurationSchema.parse({});
    this.saveConfiguration(defaultConfig);
    return defaultConfig;
  }

  public saveConfiguration(config: Partial<Configuration>): void {
    try {
      const validatedConfig = ConfigurationSchema.parse({
        ...this.configuration,
        ...config
      });

      // Ensure config directory exists
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      // Write configuration
      fs.writeFileSync(
        this.configPath, 
        JSON.stringify(validatedConfig, null, 2)
      );

      // Update current configuration
      this.configuration = validatedConfig;

      // Publish configuration update event
      eventBus.publish(EventTypes.CONFIGURATION_UPDATED, {
        updatedSettings: Object.keys(config)
      });

      logger.info('Configuration Updated Successfully', { 
        updatedSettings: Object.keys(config) 
      });
    } catch (error) {
      logger.error('Configuration Save Failed', { 
        error, 
        configPath: this.configPath 
      });
      throw error;
    }
  }

  public get<K extends keyof Configuration>(key: K): Configuration[K] {
    return this.configuration[key];
  }

  public getAll(): Configuration {
    return { ...this.configuration };
  }

  // Dynamic configuration validation and update
  public updateSetting<K extends keyof Configuration>(
    key: K, 
    value: Configuration[K]
  ): void {
    try {
      const updatedConfig = { ...this.configuration };
      updatedConfig[key] = value;

      // Validate entire configuration
      ConfigurationSchema.parse(updatedConfig);

      // Save updated configuration
      this.saveConfiguration({ [key]: value });
    } catch (error) {
      logger.error('Configuration Update Failed', { 
        key, 
        value, 
        error 
      });
      throw error;
    }
  }

  // Configuration health check
  public healthCheck(): boolean {
    try {
      ConfigurationSchema.parse(this.configuration);
      return true;
    } catch (error) {
      logger.error('Configuration Health Check Failed', { error });
      return false;
    }
  }
}

export const configManager = ConfigurationManager.getInstance();
