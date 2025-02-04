import { z } from 'zod';
import crypto from 'crypto';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';
import { configManager } from '../core/configurationManager';

// Consent Schema
const ConsentSchema = z.object({
  id: z.string().uuid(),
  recipientId: z.string(),
  purposes: z.array(z.string()),
  status: z.enum(['granted', 'revoked', 'expired']),
  grantedAt: z.date(),
  expiresAt: z.date(),
  metadata: z.record(z.string(), z.any()).optional(),
  version: z.string().default('1.0')
});

// Consent Purpose Schema
const ConsentPurposeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  requiredFields: z.array(z.string()).optional(),
  defaultExpirationDays: z.number().min(1).max(365).default(90)
});

class ConsentManagementSystem {
  private static instance: ConsentManagementSystem;
  private consents: Map<string, z.infer<typeof ConsentSchema>> = new Map();
  private purposes: Map<string, z.infer<typeof ConsentPurposeSchema>> = new Map();

  private constructor() {
    this.initializeStandardPurposes();
  }

  // Singleton instance
  public static getInstance(): ConsentManagementSystem {
    if (!ConsentManagementSystem.instance) {
      ConsentManagementSystem.instance = new ConsentManagementSystem();
    }
    return ConsentManagementSystem.instance;
  }

  // Initialize standard consent purposes
  private initializeStandardPurposes(): void {
    const standardPurposes = [
      {
        id: 'mental_health_outreach',
        name: 'Mental Health Resources',
        description: 'Receive personalized mental health support and resources',
        requiredFields: ['email', 'industry'],
        defaultExpirationDays: 180
      },
      {
        id: 'affiliate_communication',
        name: 'Affiliate Marketing',
        description: 'Receive communications about mental health services and affiliate offers',
        requiredFields: ['email', 'company_size'],
        defaultExpirationDays: 90
      }
    ];

    standardPurposes.forEach(purpose => {
      this.registerConsentPurpose(purpose);
    });
  }

  // Register a new consent purpose
  public registerConsentPurpose(
    purpose: Omit<z.infer<typeof ConsentPurposeSchema>, 'id'> & { 
      id?: string 
    }
  ): string {
    const purposeWithId = {
      ...purpose,
      id: purpose.id || crypto.randomUUID()
    };

    const validatedPurpose = ConsentPurposeSchema.parse(purposeWithId);
    
    this.purposes.set(validatedPurpose.id, validatedPurpose);

    logger.log('info', 'Consent Purpose Registered', {
      purposeName: validatedPurpose.name
    });

    // Publish consent purpose registration event
    eventBus.publish(EventTypes.CONSENT_PURPOSE_REGISTERED, validatedPurpose);

    return validatedPurpose.id;
  }

  // Grant consent
  public grantConsent(
    recipientId: string,
    purposes: string[],
    metadata?: Record<string, any>
  ): z.infer<typeof ConsentSchema> {
    // Validate purposes exist
    purposes.forEach(purposeId => {
      if (!this.purposes.has(purposeId)) {
        throw new Error(`Consent purpose ${purposeId} not found`);
      }
    });

    const consentId = crypto.randomUUID();
    const now = new Date();

    // Calculate expiration based on purposes
    const expirationDays = Math.min(
      ...purposes.map(purposeId => 
        this.purposes.get(purposeId)?.defaultExpirationDays || 90
      )
    );

    const consent = ConsentSchema.parse({
      id: consentId,
      recipientId,
      purposes,
      status: 'granted',
      grantedAt: now,
      expiresAt: new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000),
      metadata
    });

    this.consents.set(consentId, consent);

    logger.log('info', 'Consent Granted', {
      recipientId,
      purposes,
      expirationDays
    });

    // Publish consent granted event
    eventBus.publish(EventTypes.CONSENT_GRANTED, consent);

    return consent;
  }

  // Revoke consent
  public revokeConsent(
    consentId: string,
    reason?: string
  ): boolean {
    const consent = this.consents.get(consentId);
    
    if (!consent) {
      logger.log('warn', 'Consent Not Found', { consentId });
      return false;
    }

    const revokedConsent = {
      ...consent,
      status: 'revoked' as const,
      metadata: {
        ...consent.metadata,
        revocationReason: reason
      }
    };

    this.consents.set(consentId, revokedConsent);

    logger.log('info', 'Consent Revoked', {
      recipientId: consent.recipientId,
      purposes: consent.purposes,
      reason
    });

    // Publish consent revocation event
    eventBus.publish(EventTypes.CONSENT_REVOKED, revokedConsent);

    return true;
  }

  // Check consent validity
  public checkConsent(
    recipientId: string,
    purpose: string
  ): {
    isValid: boolean;
    consent: z.infer<typeof ConsentSchema> | null;
  } {
    // Find valid consent for recipient and purpose
    const validConsent = Array.from(this.consents.values()).find(
      consent => 
        consent.recipientId === recipientId &&
        consent.purposes.includes(purpose) &&
        consent.status === 'granted' &&
        consent.expiresAt > new Date()
    );

    return {
      isValid: !!validConsent,
      consent: validConsent || null
    };
  }

  // Generate consent report
  public generateConsentReport(
    options: {
      startDate?: Date;
      endDate?: Date;
      status?: z.infer<typeof ConsentSchema>['status'];
    } = {}
  ): {
    totalConsents: number;
    consentsByStatus: Record<string, number>;
    consentsByPurpose: Record<string, number>;
    recentConsents: z.infer<typeof ConsentSchema>[];
  } {
    const { 
      startDate, 
      endDate, 
      status 
    } = options;

    const filteredConsents = Array.from(this.consents.values()).filter(
      consent => 
        (!startDate || consent.grantedAt >= startDate) &&
        (!endDate || consent.grantedAt <= endDate) &&
        (!status || consent.status === status)
    );

    const report = {
      totalConsents: filteredConsents.length,
      consentsByStatus: this.countConsentsByStatus(filteredConsents),
      consentsByPurpose: this.countConsentsByPurpose(filteredConsents),
      recentConsents: filteredConsents
        .sort((a, b) => b.grantedAt.getTime() - a.grantedAt.getTime())
        .slice(0, 50)
    };

    // Log consent report generation
    logger.log('info', 'Consent Report Generated', {
      totalConsents: report.totalConsents
    });

    // Publish consent report event
    eventBus.publish(EventTypes.CONSENT_REPORT_GENERATED, report);

    return report;
  }

  // Count consents by status
  private countConsentsByStatus(
    consents: z.infer<typeof ConsentSchema>[]
  ): Record<string, number> {
    return consents.reduce((counts, consent) => {
      counts[consent.status] = (counts[consent.status] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);
  }

  // Count consents by purpose
  private countConsentsByPurpose(
    consents: z.infer<typeof ConsentSchema>[]
  ): Record<string, number> {
    return consents.reduce((counts, consent) => {
      consent.purposes.forEach(purpose => {
        counts[purpose] = (counts[purpose] || 0) + 1;
      });
      return counts;
    }, {} as Record<string, number>);
  }

  // Get all registered consent purposes
  public getConsentPurposes(): Array<z.infer<typeof ConsentPurposeSchema>> {
    return Array.from(this.purposes.values());
  }

  // Remove a consent purpose
  public removeConsentPurpose(purposeId: string): boolean {
    const purpose = this.purposes.get(purposeId);
    
    if (purpose) {
      this.purposes.delete(purposeId);
      
      logger.log('info', 'Consent Purpose Removed', {
        purposeName: purpose.name
      });

      // Publish consent purpose removal event
      eventBus.publish(EventTypes.CONSENT_PURPOSE_REMOVED, purpose);

      return true;
    }

    return false;
  }
}

// Export singleton instance
export const consentManagement = ConsentManagementSystem.getInstance();
