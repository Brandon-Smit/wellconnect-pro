import { z } from 'zod';
import { logger } from './loggingSystem';
import { eventBus, EventTypes } from './eventBus';
import { configManager } from './configurationManager';

// Ethical Communication Schema
const EthicalCommunicationSchema = z.object({
  // Core Ethical Principles
  principles: z.object({
    transparency: z.boolean().default(true),
    consent: z.boolean().default(true),
    userWellbeing: z.boolean().default(true),
    dataPrivacy: z.boolean().default(true)
  }),

  // Communication Content Evaluation
  contentEvaluation: z.object({
    sensitivityThreshold: z.number().min(0).max(10).default(7),
    mentalHealthSupportScore: z.number().min(0).max(10).default(8),
    potentialHarmFactors: z.array(z.string()).default([
      'stigmatization',
      'triggering_language',
      'inappropriate_tone',
      'misleading_information'
    ])
  }),

  // Consent and Opt-out Mechanisms
  consentManagement: z.object({
    explicitConsentRequired: z.boolean().default(true),
    easyOptOutProcess: z.boolean().default(true),
    consentExpirationDays: z.number().min(30).max(365).default(90)
  }),

  // Tracking and Accountability
  tracking: z.object({
    enableEthicalScoring: z.boolean().default(true),
    trackUserInteractions: z.boolean().default(true),
    anonymizePersonalData: z.boolean().default(true)
  })
});

// Ethical Communication Scoring System
class EthicalCommunicationStandards {
  private static instance: EthicalCommunicationStandards;
  private ethicalConfig: z.infer<typeof EthicalCommunicationSchema>;

  private constructor() {
    // Load configuration with default ethical standards
    this.ethicalConfig = EthicalCommunicationSchema.parse(
      configManager.get('ethicalGuidelines') || {}
    );
  }

  // Singleton instance
  public static getInstance(): EthicalCommunicationStandards {
    if (!EthicalCommunicationStandards.instance) {
      EthicalCommunicationStandards.instance = new EthicalCommunicationStandards();
    }
    return EthicalCommunicationStandards.instance;
  }

  // Evaluate communication content for ethical standards
  public evaluateContent(
    content: string,
    context: {
      recipient?: {
        industry?: string;
        role?: string;
      };
      purpose?: string;
    } = {}
  ): {
    isEthical: boolean;
    score: number;
    issues: string[];
  } {
    const issues: string[] = [];
    let ethicalScore = 10; // Start with perfect score

    // Mental health support language check
    const mentalHealthKeywords = [
      'support', 'care', 'well-being', 'mental health', 
      'resources', 'help', 'understanding', 'compassion'
    ];
    const mentalHealthMatches = mentalHealthKeywords.filter(
      keyword => content.toLowerCase().includes(keyword)
    );
    const mentalHealthScore = mentalHealthMatches.length * 1.5;

    // Potential harm factors check
    this.ethicalConfig.contentEvaluation.potentialHarmFactors.forEach(factor => {
      if (this.detectHarmFactor(content, factor)) {
        issues.push(factor);
        ethicalScore -= 2; // Reduce score for each harm factor
      }
    });

    // Contextual sensitivity adjustment
    if (context.recipient?.industry === 'healthcare') {
      ethicalScore += 1; // Bonus for healthcare-sensitive communication
    }

    // Integrate mental health support score
    ethicalScore = Math.min(
      10, 
      ethicalScore + Math.min(mentalHealthScore, 3)
    );

    // Final ethical assessment
    return {
      isEthical: ethicalScore >= this.ethicalConfig.contentEvaluation.sensitivityThreshold,
      score: Math.max(0, ethicalScore),
      issues
    };
  }

  // Detect specific harm factors in content
  private detectHarmFactor(
    content: string, 
    factor: string
  ): boolean {
    const harmDetectors: Record<string, (text: string) => boolean> = {
      'stigmatization': (text) => {
        const stigmatizingTerms = [
          'crazy', 'nuts', 'insane', 'mental', 'unstable'
        ];
        return stigmatizingTerms.some(term => 
          text.toLowerCase().includes(term)
        );
      },
      'triggering_language': (text) => {
        const triggeringTerms = [
          'suicide', 'depression', 'trauma', 'anxiety attack'
        ];
        return triggeringTerms.some(term => 
          text.toLowerCase().includes(term)
        );
      },
      'inappropriate_tone': (text) => {
        // Check for overly casual or insensitive tone
        return text.toLowerCase().includes('lol') || 
               text.includes('!!!') || 
               text.includes('???');
      },
      'misleading_information': (text) => {
        // Detect potentially misleading claims
        const misleadingPhrases = [
          'guaranteed', 'miracle', 'secret solution'
        ];
        return misleadingPhrases.some(phrase => 
          text.toLowerCase().includes(phrase)
        );
      }
    };

    return harmDetectors[factor] 
      ? harmDetectors[factor](content) 
      : false;
  }

  // Generate ethical communication report
  public generateEthicalReport(
    communications: Array<{
      content: string;
      timestamp: Date;
      recipient?: string;
    }>
  ): {
    overallEthicalScore: number;
    communicationBreakdown: Array<{
      content: string;
      isEthical: boolean;
      score: number;
      issues: string[];
    }>;
  } {
    const evaluations = communications.map(comm => ({
      ...comm,
      evaluation: this.evaluateContent(comm.content)
    }));

    const overallEthicalScore = 
      evaluations.reduce((sum, eval) => sum + eval.evaluation.score, 0) / 
      evaluations.length;

    // Log ethical communication insights
    logger.log('info', 'Ethical Communication Report Generated', {
      overallEthicalScore,
      totalCommunications: communications.length
    });

    // Publish ethical report event
    eventBus.publish(EventTypes.ETHICAL_REPORT_GENERATED, {
      overallEthicalScore,
      communicationCount: communications.length
    });

    return {
      overallEthicalScore,
      communicationBreakdown: evaluations.map(eval => ({
        content: eval.content,
        ...eval.evaluation
      }))
    };
  }

  // Consent management utilities
  public createConsentToken(
    recipientId: string,
    options: {
      expirationDays?: number;
      purposes?: string[];
    } = {}
  ): string {
    const {
      expirationDays = this.ethicalConfig.consentManagement.consentExpirationDays,
      purposes = ['email_outreach', 'mental_health_resources']
    } = options;

    const consentToken = {
      recipientId,
      purposes,
      issuedAt: new Date(),
      expiresAt: new Date(
        Date.now() + expirationDays * 24 * 60 * 60 * 1000
      ),
      version: '1.0'
    };

    // Log consent token creation
    logger.log('info', 'Consent Token Created', {
      recipientId,
      purposes,
      expirationDays
    });

    return JSON.stringify(consentToken);
  }

  // Validate consent token
  public validateConsentToken(
    token: string,
    purpose?: string
  ): boolean {
    try {
      const consentToken = JSON.parse(token);
      const now = new Date();

      // Check expiration
      if (new Date(consentToken.expiresAt) < now) {
        return false;
      }

      // Check specific purpose if provided
      if (
        purpose && 
        !consentToken.purposes.includes(purpose)
      ) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Consent Token Validation Failed', error);
      return false;
    }
  }
}

// Export singleton instance
export const ethicalStandards = EthicalCommunicationStandards.getInstance();
