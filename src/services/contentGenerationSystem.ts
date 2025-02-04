import { MachineLearningModel } from '../lib/machineLearningModel';
import { AffiliateContextAnalyzer } from './affiliateLinkContextAnalyzer';
import { z } from 'zod';
import { reportError, trackPerformance } from '../lib/monitoring';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';

// Content Generation Input Schema
const ContentGenerationInputSchema = z.object({
  affiliateLink: z.string().url(),
  targetIndustry: z.enum([
    'technology', 'healthcare', 'finance', 
    'education', 'manufacturing', 'retail'
  ]),
  companySize: z.enum(['small', 'medium', 'large']),
  ethicalGuidelines: z.boolean().default(true),
  contentType: z.enum([
    'wellness', 
    'mental-health', 
    'professional-development', 
    'support-resources'
  ]).optional()
});

// Content Generation Output Schema
const ContentGenerationOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
  contentType: z.string(),
  ethicalScore: z.object({
    sensitivityScore: z.number().min(0).max(1),
    inclusivityScore: z.number().min(0).max(1),
    contextRelevance: z.number().min(0).max(1)
  }),
  processingTime: z.number(),
  linkContext: z.object({
    affiliateLink: z.string().url(),
    ethicalScore: z.number().min(0).max(1)
  }),
  contentVariants: z.array(z.string()),
  metadata: z.object({
    generatedAt: z.date(),
    version: z.string()
  })
});

// Email Preview Schema
export const EmailPreviewSchema = z.object({
  subject: z.string(),
  body: z.string(),
  ethicalScore: z.object({
    sensitivityScore: z.number().min(0).max(1),
    inclusivityScore: z.number().min(0).max(1),
    contextRelevance: z.number().min(0).max(1)
  }),
  previewVariants: z.array(z.object({
    id: z.string().uuid(),
    subject: z.string(),
    body: z.string(),
    tone: z.enum(['professional', 'empathetic', 'direct', 'supportive']),
    personalizedElements: z.record(z.string(), z.string()).optional()
  })).min(1).max(5)
});

export class ContentGenerationSystem {
  private static instance: ContentGenerationSystem;
  private mlModel: MachineLearningModel;
  private contextAnalyzer: AffiliateContextAnalyzer;
  private contentTemplates: Record<string, string[]> = {
    'wellness': [
      'Nurturing Mental Wellness in the Workplace',
      'Holistic Approaches to Employee Well-being',
      'Creating a Supportive Work Environment'
    ],
    'mental-health': [
      'Breaking the Stigma: Mental Health at Work',
      'Compassionate Leadership and Mental Health',
      'Supporting Your Team\'s Emotional Resilience'
    ],
    'professional-development': [
      'Emotional Intelligence for Professional Growth',
      'Stress Management and Career Success',
      'Building Resilience in High-Pressure Environments'
    ],
    'support-resources': [
      'Your Guide to Workplace Mental Health Resources',
      'Accessing Professional Support: A Comprehensive Guide',
      'Empowering Your Team Through Mental Health Support'
    ]
  };

  private constructor() {
    this.mlModel = MachineLearningModel.getInstance();
    this.contextAnalyzer = AffiliateContextAnalyzer.getInstance();
  }

  public static getInstance(): ContentGenerationSystem {
    if (!ContentGenerationSystem.instance) {
      ContentGenerationSystem.instance = new ContentGenerationSystem();
    }
    return ContentGenerationSystem.instance;
  }

  async generateContent(
    input: z.infer<typeof ContentGenerationInputSchema>
  ): Promise<z.infer<typeof ContentGenerationOutputSchema>> {
    try {
      // Validate input
      const validatedInput = ContentGenerationInputSchema.parse(input);

      // Extract context from affiliate link
      const linkContext = await this.contextAnalyzer.analyzeAffiliateLink(
        validatedInput.affiliateLink
      );

      // Validate ethical score
      if (
        validatedInput.ethicalGuidelines !== false && 
        linkContext.ethicalScore < 0.7
      ) {
        throw new Error('Affiliate link does not meet ethical standards');
      }

      // Generate content using ML model
      const startTime = Date.now();
      const contentEnhancement = await this.mlModel.generateContentEnhancement(validatedInput);

      // Calculate ethical score
      const ethicalScore = await this.mlModel.calculateEthicalScore(
        contentEnhancement.generatedContent
      );

      const endTime = Date.now();
      trackPerformance('content_generation_total', endTime - startTime);

      // Validate content ethics
      const contentEthics = await this.validateContentEthics(contentEnhancement.generatedContent);

      // Ensure ethical guidelines are met
      if (validatedInput.ethicalGuidelines && !contentEthics.isCompliant) {
        throw new Error('Content does not meet ethical standards');
      }

      // Prepare output
      const contentOutput = ContentGenerationOutputSchema.parse({
        subject: `Mental Health Support for ${validatedInput.targetIndustry} Companies`,
        body: contentEnhancement.generatedContent,
        contentType: validatedInput.contentType || 'mental-health',
        ethicalScore: contentEthics.score,
        processingTime: contentEnhancement.processingTime,
        linkContext: {
          affiliateLink: validatedInput.affiliateLink,
          ethicalScore: linkContext.ethicalScore
        },
        contentVariants: this.generateContentVariants(contentEnhancement.generatedContent),
        metadata: {
          generatedAt: new Date(),
          version: '1.0.0'
        }
      });

      // Log content generation event
      await eventBus.publish(EventTypes.CONTENT_GENERATED, {
        contentType: validatedInput.contentType || 'mental-health',
        industry: validatedInput.targetIndustry,
        ethicalScore: contentEthics.score
      });

      return contentOutput;
    } catch (error) {
      reportError(error as Error, { 
        context: 'Content Generation', 
        input: JSON.stringify(input) 
      });
      logger.error('Content Generation Failed', { 
        error, 
        input: JSON.stringify(input) 
      });
      throw error;
    }
  }

  async generateEmailPreviews(options: {
    affiliateLink: string;
    targetIndustry: string;
    companySize: string;
    contentType?: ContentGenerationConfig['contentTypes'][number];
    ethicalGuidelines?: boolean;
    companyName?: string;
  }): Promise<z.infer<typeof EmailPreviewSchema>> {
    try {
      // Extract affiliate link context
      const affiliateContext = await this.contextAnalyzer.analyzeAffiliateLink(
        options.affiliateLink
      );

      // Generate base content
      const baseContent = await this.generateContent(options);

      // Generate preview variants
      const previewVariants = await this.createEmailVariants(
        baseContent, 
        affiliateContext, 
        options
      );

      // Construct full preview object
      return {
        subject: baseContent.subject,
        body: baseContent.body,
        ethicalScore: baseContent.ethicalScore,
        previewVariants
      };
    } catch (error) {
      reportError(error as Error, { 
        context: 'Email Preview Generation', 
        options: JSON.stringify(options) 
      });
      logger.error('Email Preview Generation Failed', { 
        error, 
        options: JSON.stringify(options) 
      });

      // Fallback preview generation
      return this.generateFallbackPreviews(options);
    }
  }

  private async createEmailVariants(
    baseContent: {
      subject: string;
      body: string;
      ethicalScore: object;
    },
    affiliateContext: any,
    options: {
      targetIndustry: string;
      companySize: string;
      companyName?: string;
    }
  ): Promise<z.infer<typeof EmailPreviewSchema>['previewVariants']> {
    const tones: z.infer<typeof EmailPreviewSchema>['previewVariants'][number]['tone'][] = [
      'professional', 
      'empathetic', 
      'direct', 
      'supportive'
    ];

    const variants = await Promise.all(tones.map(async (tone) => {
      // Use ML model to generate tone-specific variations
      const personalizedVariation = await this.mlModel.personalizeContent({
        industry: options.targetIndustry,
        companySize: options.companySize,
        contentType: 'mental-health',
        tone: tone,
        affiliateContext
      });

      // Create variant-specific subject and body
      const variantSubject = await this.generateVariantSubject(
        baseContent.subject, 
        tone, 
        options
      );

      const variantBody = await this.generateVariantBody(
        baseContent.body, 
        tone, 
        personalizedVariation,
        options
      );

      return {
        id: crypto.randomUUID(),
        subject: variantSubject,
        body: variantBody,
        tone: tone,
        personalizedElements: {
          industry: options.targetIndustry,
          companySize: options.companySize,
          ...(options.companyName ? { companyName: options.companyName } : {})
        }
      };
    }));

    return variants;
  }

  private async generateVariantSubject(
    baseSubject: string, 
    tone: string,
    options: {
      targetIndustry: string;
      companySize: string;
      companyName?: string;
    }
  ): Promise<string> {
    const subjectVariations = {
      professional: `Professional Mental Health Solutions for ${options.companySize} ${options.targetIndustry} Companies`,
      empathetic: `Supporting ${options.companyName || 'Your'} Team's Mental Wellness Journey`,
      direct: `Elevate ${options.targetIndustry} Workplace Mental Health Now`,
      supportive: `Your Partner in ${options.targetIndustry} Mental Health Support`
    };

    return subjectVariations[tone as keyof typeof subjectVariations] || baseSubject;
  }

  private async generateVariantBody(
    baseBody: string, 
    tone: string,
    personalizedContent: any,
    options: {
      targetIndustry: string;
      companySize: string;
      companyName?: string;
    }
  ): Promise<string> {
    const toneAdapters = {
      professional: (body: string) => body.replace(
        /Dear HR Professional,/,
        `Attention ${options.companyName || 'HR Leadership'}:`
      ),
      empathetic: (body: string) => body.replace(
        /Our \w+ approach ensures/,
        `With compassion and understanding, our approach ensures`
      ),
      direct: (body: string) => body.replace(
        /Ready to transform/,
        `Take immediate action to transform`
      ),
      supportive: (body: string) => body.replace(
        /We understand/,
        `We're here to support you in understanding`
      )
    };

    const adaptedBody = toneAdapters[tone as keyof typeof toneAdapters](baseBody);
  
    return adaptedBody;
  }

  private generateFallbackPreviews(options: {
    affiliateLink: string;
    targetIndustry: string;
    companySize: string;
  }): z.infer<typeof EmailPreviewSchema> {
    return {
      subject: `Mental Health Support for ${options.targetIndustry} Companies`,
      body: `
Dear HR Professional,

We understand the unique mental health challenges in ${options.targetIndustry} industries. Our carefully curated resources are designed to support ${options.companySize} organizations like yours.

Learn more about our mental health solutions: ${options.affiliateLink}

Best regards,
WellConnect Pro Team
    `.trim(),
      ethicalScore: {
        sensitivityScore: 0.7,
        inclusivityScore: 0.7,
        contextRelevance: 0.7
      },
      previewVariants: [{
        id: crypto.randomUUID(),
        subject: `Mental Health Support for ${options.targetIndustry} Companies`,
        body: `
Dear HR Professional,

We understand the unique mental health challenges in ${options.targetIndustry} industries. Our carefully curated resources are designed to support ${options.companySize} organizations like yours.

Learn more about our mental health solutions: ${options.affiliateLink}

Best regards,
WellConnect Pro Team
      `.trim(),
        tone: 'professional',
        personalizedElements: {
          industry: options.targetIndustry,
          companySize: options.companySize
        }
      }]
    };
  }

  private generateContentVariants(baseContent: string): string[] {
    const tones = [
      'professional',
      'empathetic',
      'direct',
      'supportive'
    ];

    return tones.map(tone => {
      // Simple tone variation (in a real-world scenario, this would be more sophisticated)
      return `[${tone.toUpperCase()} TONE]\n${baseContent}`;
    });
  }

  async validateContentEthics(content: string) {
    try {
      const ethicalScore = await this.mlModel.calculateEthicalScore(content);
      
      // Define ethical thresholds
      const ETHICAL_THRESHOLDS = {
        sensitivityScore: 0.7,
        inclusivityScore: 0.7,
        contextRelevance: 0.7
      };

      const isEthicallyCompliant = 
        ethicalScore.sensitivityScore >= ETHICAL_THRESHOLDS.sensitivityScore &&
        ethicalScore.inclusivityScore >= ETHICAL_THRESHOLDS.inclusivityScore &&
        ethicalScore.contextRelevance >= ETHICAL_THRESHOLDS.contextRelevance;

      return {
        isCompliant: isEthicallyCompliant,
        score: ethicalScore
      };
    } catch (error) {
      reportError(error as Error, { 
        context: 'Content Ethics Validation' 
      });
      
      // Fallback to conservative compliance
      return {
        isCompliant: false,
        score: {
          sensitivityScore: 0.5,
          inclusivityScore: 0.5,
          contextRelevance: 0.5
        }
      };
    }
  }

  private generateSubject(contentType: string): string {
    const templates = this.contentTemplates[contentType] || 
      this.contentTemplates['wellness'];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  private generateBody(
    contentType: string, 
    industry: string, 
    companySize: string
  ): string {
    const industryContexts: Record<string, string> = {
      'technology': 'fast-paced tech environments',
      'healthcare': 'high-stress medical settings',
      'finance': 'high-pressure financial sectors',
      'education': 'challenging academic landscapes',
      'manufacturing': 'physically demanding work environments'
    };

    const companySizeDescriptors: Record<string, string> = {
      'small': 'small, agile teams',
      'medium': 'growing, dynamic organizations',
      'large': 'large, complex corporate structures'
    };

    const industryContext = industryContexts[industry.toLowerCase()] || 
      'modern workplace';
    const sizeContext = companySizeDescriptors[companySize] || 
      'diverse work environments';

    const paragraphs = [
      `In today's ${industryContext}, mental health is more critical than ever. ${sizeContext} face unique challenges that demand compassionate, strategic support.`,
      
      `Our approach focuses on proactive mental wellness strategies tailored to your specific organizational needs. We understand that one-size-fits-all solutions simply don't work.`,
      
      `By partnering with leading mental health professionals, we offer comprehensive resources designed to enhance employee resilience, productivity, and overall well-being.`,
      
      `Our evidence-based programs are crafted to address the nuanced mental health challenges in ${industryContext}, ensuring your team feels supported, understood, and empowered.`
    ];

    return paragraphs.join('\n\n');
  }
}

export const contentGenerationSystem = ContentGenerationSystem.getInstance();
