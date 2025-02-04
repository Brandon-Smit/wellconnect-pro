import crypto from 'crypto';
import { logger } from './monitoring';

export class SecurityHardener {
  // Generate cryptographically secure random token
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash sensitive data with salt
  static hashData(data: string, salt?: string): { hash: string, salt: string } {
    const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(
      data, 
      generatedSalt, 
      10000, 
      64, 
      'sha512'
    ).toString('hex');

    return { hash, salt: generatedSalt };
  }

  // Validate hashed data
  static validateHash(
    inputData: string, 
    storedHash: string, 
    storedSalt: string
  ): boolean {
    const { hash } = this.hashData(inputData, storedSalt);
    return crypto.timingSafeEqual(
      Buffer.from(hash), 
      Buffer.from(storedHash)
    );
  }

  // Sanitize input to prevent injection
  static sanitizeInput(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Rate limiting decorator
  static rateLimiter(
    maxCalls: number = 10, 
    windowMs: number = 60000
  ) {
    const callTracker = new Map<string, { count: number, resetTime: number }>();

    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;

      descriptor.value = function(...args: any[]) {
        const key = crypto.createHash('md5')
          .update(JSON.stringify(args))
          .digest('hex');

        const now = Date.now();
        const record = callTracker.get(key);

        if (record && now < record.resetTime) {
          if (record.count >= maxCalls) {
            logger.warn('Rate limit exceeded', { key });
            throw new Error('Too many calls. Please wait.');
          }
          record.count++;
        } else {
          callTracker.set(key, {
            count: 1,
            resetTime: now + windowMs
          });
        }

        return originalMethod.apply(this, args);
      };

      return descriptor;
    };
  }

  // Encryption utility
  static encrypt(data: string, secretKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc', 
      crypto.scryptSync(secretKey, 'salt', 32), 
      iv
    );

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  // Decryption utility
  static decrypt(encryptedData: string, secretKey: string): string {
    const [ivHex, encryptedHex] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');

    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', 
      crypto.scryptSync(secretKey, 'salt', 32), 
      iv
    );

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // Detect potential security risks
  static detectPotentialRisks(input: string): string[] {
    const risks: string[] = [];

    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP)\b)/i,
      /(\bOR\s+1=1\b)/i
    ];

    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /onerror\s*=/i
    ];

    sqlInjectionPatterns.forEach(pattern => {
      if (pattern.test(input)) {
        risks.push(`Potential SQL Injection: ${pattern.source}`);
      }
    });

    xssPatterns.forEach(pattern => {
      if (pattern.test(input)) {
        risks.push(`Potential XSS Attack: ${pattern.source}`);
      }
    });

    return risks;
  }
}
