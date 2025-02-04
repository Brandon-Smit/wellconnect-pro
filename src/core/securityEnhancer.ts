import * as crypto from 'crypto';
import { z } from 'zod';
import { logger } from './loggingSystem';
import { eventBus, EventTypes } from './eventBus';
import { configManager } from './configurationManager';
import { errorTracker } from './errorTracker';

// Security Configuration Schema
const SecurityConfigSchema = z.object({
  encryptionAlgorithm: z.enum(['aes-256-gcm', 'chacha20-poly1305']).default('aes-256-gcm'),
  keyRotationFrequency: z.enum(['daily', 'weekly', 'monthly']).default('weekly'),
  rateLimitConfig: z.object({
    maxRequestsPerMinute: z.number().min(1).max(1000).default(100),
    blockDurationSeconds: z.number().min(10).max(3600).default(300)
  }),
  sensitiveDataMask: z.object({
    maskCharacter: z.string().max(1).default('*'),
    maskPercentage: z.number().min(0).max(1).default(0.75)
  }),
  auditLogging: z.object({
    enabled: z.boolean().default(true),
    retentionDays: z.number().min(1).max(365).default(90)
  })
});

type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

export class SecurityEnhancer {
  private static instance: SecurityEnhancer;
  private config: SecurityConfig;
  private encryptionKey: Buffer;
  private requestCounters: Map<string, { count: number, resetTime: number }> = new Map();

  private constructor() {
    this.config = SecurityConfigSchema.parse({});
    this.encryptionKey = this.generateEncryptionKey();
  }

  public static getInstance(): SecurityEnhancer {
    if (!SecurityEnhancer.instance) {
      SecurityEnhancer.instance = new SecurityEnhancer();
    }
    return SecurityEnhancer.instance;
  }

  private generateEncryptionKey(): Buffer {
    return crypto.randomBytes(32);
  }

  public encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        this.config.encryptionAlgorithm, 
        this.encryptionKey, 
        iv
      );
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag().toString('hex');
      
      return `${iv.toString('hex')}:${encrypted}:${authTag}`;
    } catch (error) {
      errorTracker.trackError({
        severity: 'HIGH',
        category: 'SYSTEM',
        message: 'Encryption failed',
        context: { errorDetails: error }
      });
      throw error;
    }
  }

  public decrypt(encryptedData: string): string {
    try {
      const [ivHex, encryptedHex, authTagHex] = encryptedData.split(':');
      
      const iv = Buffer.from(ivHex, 'hex');
      const encrypted = Buffer.from(encryptedHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      
      const decipher = crypto.createDecipheriv(
        this.config.encryptionAlgorithm, 
        this.encryptionKey, 
        iv
      );
      
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      errorTracker.trackError({
        severity: 'HIGH',
        category: 'SYSTEM',
        message: 'Decryption failed',
        context: { errorDetails: error }
      });
      throw error;
    }
  }

  public maskSensitiveData(data: string): string {
    const { maskCharacter, maskPercentage } = this.config.sensitiveDataMask;
    const maskLength = Math.floor(data.length * maskPercentage);
    const unmaskedLength = data.length - maskLength;

    return data.slice(0, Math.max(unmaskedLength, 1)) + 
           maskCharacter.repeat(maskLength);
  }

  public checkRateLimit(requestorId: string): boolean {
    const currentTime = Date.now();
    const { maxRequestsPerMinute, blockDurationSeconds } = this.config.rateLimitConfig;

    const requestRecord = this.requestCounters.get(requestorId) || {
      count: 0,
      resetTime: currentTime + 60000 // 1 minute from now
    };

    // Check if previous rate limit block has expired
    if (currentTime > requestRecord.resetTime) {
      this.requestCounters.delete(requestorId);
      return true;
    }

    // Increment request count
    requestRecord.count++;

    // Check if request limit exceeded
    if (requestRecord.count > maxRequestsPerMinute) {
      // Block further requests
      requestRecord.resetTime = currentTime + (blockDurationSeconds * 1000);
      
      // Log security event
      logger.warn('Rate Limit Exceeded', {
        requestorId,
        blockUntil: new Date(requestRecord.resetTime)
      });

      // Publish security event
      eventBus.publish(EventTypes.SECURITY_RATE_LIMIT_TRIGGERED, {
        requestorId,
        blockUntil: new Date(requestRecord.resetTime)
      });

      return false;
    }

    this.requestCounters.set(requestorId, requestRecord);
    return true;
  }

  public rotateEncryptionKey(): void {
    this.encryptionKey = this.generateEncryptionKey();
    
    logger.info('Encryption Key Rotated', {
      rotationMethod: this.config.keyRotationFrequency
    });

    eventBus.publish(EventTypes.SECURITY_KEY_ROTATED, {
      rotationTimestamp: new Date()
    });
  }

  public performSecurityAudit(): void {
    if (!this.config.auditLogging.enabled) return;

    const auditLog = {
      timestamp: new Date(),
      keyRotationFrequency: this.config.keyRotationFrequency,
      rateLimitConfig: this.config.rateLimitConfig,
      activeRateLimitEntries: this.requestCounters.size
    };

    logger.info('Security Audit', auditLog);

    eventBus.publish(EventTypes.SECURITY_AUDIT_COMPLETED, auditLog);
  }
}

export const securityEnhancer = SecurityEnhancer.getInstance();
