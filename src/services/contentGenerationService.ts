import { Mistral7B } from '../lib/aiModels/mistral';
import { CompanyContact } from '../types/companyContact';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import OpenAI from 'openai';
import { complianceService } from './complianceService';

// Content Generation Configuration Schema
const ContentConfigSchema = z.object({
  apiProviders: z.array(z.object({
    name: z.string(),
    apiKey: z.string(),
    model: z.string(),
    maxTokens: z.number().min(50).max(4096).default(1024),
    temperature: z.number().min(0).max(1).default(0.7),
    ethicalScoreThreshold: z.number().min(0).max(10).default(8)
  })),
  contentTypes: z.array(z.enum([
    'email_subject', 
    'email_body', 
    'hr_outreach', 
    'mental_health_resource', 
    'campaign_tagline'
  ])),
  languageModels: z.array(z.string()).default(['gpt-4', 'claude-2', 'mistral-7b']),
  complianceChecks: z.object({
    toxicityThreshold: z.number().min(0).max(1).default(0.2),
    sensitivityThreshold: z.number().min(0).max(1).default(0.3)
  })
});

// Generated Content Schema
const GeneratedContentSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'email_subject', 
    'email_body', 
    'hr_outreach', 
    'mental_health_resource', 
    'campaign_tagline'
  ]),
  content: z.string(),
  provider: z.string(),
  model: z.string(),
  timestamp: z.date(),
  ethicalScore: z.number().min(0).max(10),
  complianceRating: z.number().min(0).max(1),
  tags: z.array(z.string()).optional()
});

// Content Personalization Schema
const PersonalizationContextSchema = z.object({
  companyName: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.number().optional(),
  mentalHealthInitiatives: z.array(z.string()).optional(),
  contactName: z.string().optional(),
  contactRole: z.string().optional()
});

// Company Profile Schema
const CompanyProfileSchema = z.object({
  name: z.string(),
  industry: z.string(),
  size: z.object({
    min: z.number(),
    max: z.number()
  }),
  mentalHealthInitiatives: z.array(z.string()).optional(),
  challenges: z.array(z.string()).optional()
});

// Email Content Schema
const EmailContentSchema = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  body: z.string(),
  personalizedScore: z.number().min(0).max(10),
  mentalHealthEmphasis: z.number().min(0).max(10),
  ethicalScore: z.number().min(0).max(10),
  generatedAt: z.date()
});

type ContentConfig = z.infer<typeof ContentConfigSchema>;
type GeneratedContent = z.infer<typeof GeneratedContentSchema>;
type PersonalizationContext = z.infer<typeof PersonalizationContextSchema>;
type CompanyProfile = z.infer<typeof CompanyProfileSchema>;
type EmailContent = z.infer<typeof EmailContentSchema>;

interface EmailTemplate {
  subject: string;
  body: string;
  callToAction: string;
}

class ContentGenerationService {
  private config: ContentConfig;
  private generatedContents: GeneratedContent[] = [];
  private openaiClients: Record<string, OpenAI> = {};
  private openai: OpenAI;

  constructor() {
    this.config = ContentConfigSchema.parse({
      apiProviders: [
        {
          name: 'OpenAI',
          apiKey: process.env.OPENAI_API_KEY || '',
          model: 'gpt-4',
          maxTokens: 1024,
          temperature: 0.7,
          ethicalScoreThreshold: 8
        },
        {
          name: 'Anthropic',
          apiKey: process.env.ANTHROPIC_API_KEY || '',
          model: 'claude-2',
          maxTokens: 1024,
          temperature: 0.6,
          ethicalScoreThreshold: 9
        }
      ],
      contentTypes: [
        'email_subject', 
        'email_body', 
        'hr_outreach', 
        'mental_health_resource', 
        'campaign_tagline'
      ],
      complianceChecks: {
        toxicityThreshold: 0.2,
        sensitivityThreshold: 0.3
      }
    });

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || ''
    });

    this.initializeClients();
  }

  // Initialize AI clients
  private initializeClients(): void {
    this.config.apiProviders.forEach(provider => {
      if (provider.apiKey) {
        this.openaiClients[provider.name] = new OpenAI({
          apiKey: provider.apiKey
        });
      }
    });
  }

  // Select optimal AI provider
  private selectOptimalProvider(contentType: string): ContentConfig['apiProviders'][number] {
    const availableProviders = this.config.apiProviders
      .filter(provider => this.openaiClients[provider.name]);

    return availableProviders.reduce((best, current) => 
      current.ethicalScoreThreshold > best.ethicalScoreThreshold ? current : best
    );
  }

  // Generate content with personalization and ethical considerations
  async generateContent(
    contentType: GeneratedContent['type'], 
    personalizationContext?: PersonalizationContext
  ): Promise<GeneratedContent> {
    const provider = this.selectOptimalProvider(contentType);
    const client = this.openaiClients[provider.name];

    if (!client) {
      throw new Error(`No client available for provider: ${provider.name}`);
    }

    // Construct prompt based on content type and personalization
    const prompt = this.constructPrompt(contentType, personalizationContext);

    try {
      const response = await client.chat.completions.create({
        model: provider.model,
        messages: [
          {
            role: 'system', 
            content: `You are an ethical AI assistant specializing in mental health communication. 
            Your goal is to create compassionate, supportive, and professional content that promotes 
            mental health awareness and resources.`
          },
          {
            role: 'user', 
            content: prompt
          }
        ],
        max_tokens: provider.maxTokens,
        temperature: provider.temperature
      });

      const generatedContent = response.choices[0].message.content || '';

      // Compliance and ethical scoring
      const complianceRating = await this.assessContentCompliance(generatedContent);
      const ethicalScore = this.calculateEthicalScore(complianceRating);

      // Create content record
      const contentRecord = GeneratedContentSchema.parse({
        id: uuidv4(),
        type: contentType,
        content: generatedContent,
        provider: provider.name,
        model: provider.model,
        timestamp: new Date(),
        ethicalScore,
        complianceRating,
        tags: personalizationContext 
          ? this.extractContentTags(personalizationContext) 
          : undefined
      });

      // Store generated content
      this.generatedContents.push(contentRecord);

      return contentRecord;
    } catch (error) {
      console.error('Content generation error:', error);
      throw new Error('Failed to generate content');
    }
  }

  // Construct prompt with personalization
  private constructPrompt(
    contentType: GeneratedContent['type'], 
    context?: PersonalizationContext
  ): string {
    const basePrompts: Record<GeneratedContent['type'], string> = {
      email_subject: `Create a compelling, empathetic email subject line about mental health resources`,
      email_body: `Compose a supportive, professional email about mental health support`,
      hr_outreach: `Draft a professional outreach message to HR departments about mental health initiatives`,
      mental_health_resource: `Generate an informative description of mental health resources`,
      campaign_tagline: `Create an inspiring tagline that promotes mental health awareness`
    };

    let prompt = basePrompts[contentType];

    // Add personalization if context is provided
    if (context) {
      const personalizedDetails = [
        context.companyName && `Targeting ${context.companyName}`,
        context.industry && `in the ${context.industry} industry`,
        context.companySize && `with approximately ${context.companySize} employees`,
        context.contactName && `addressed to ${context.contactName}`,
        context.contactRole && `who is a ${context.contactRole}`
      ].filter(Boolean).join(' ');

      prompt += `. Personalize the content for: ${personalizedDetails}`;
    }

    return prompt;
  }

  // Assess content compliance
  private async assessContentCompliance(content: string): Promise<number> {
    try {
      // Use compliance service for toxicity and sensitivity checks
      const toxicityScore = await complianceService.checkToxicity(content);
      const sensitivityScore = await complianceService.checkSensitivity(content);

      // Combine scores, lower is better
      return (toxicityScore + sensitivityScore) / 2;
    } catch (error) {
      console.error('Compliance assessment error:', error);
      return 1; // Worst possible score if assessment fails
    }
  }

  // Calculate ethical score based on compliance rating
  private calculateEthicalScore(complianceRating: number): number {
    // Inverse relationship: lower compliance rating means higher ethical score
    return Math.max(0, 10 * (1 - complianceRating));
  }

  // Extract relevant tags from personalization context
  private extractContentTags(context: PersonalizationContext): string[] {
    return [
      context.companyName,
      context.industry,
      context.contactRole,
      ...(context.mentalHealthInitiatives || [])
    ].filter(Boolean) as string[];
  }

  // Retrieve generated content
  getGeneratedContent(filters?: {
    type?: GeneratedContent['type'];
    minEthicalScore?: number;
    tags?: string[];
  }): GeneratedContent[] {
    return this.generatedContents.filter(content => 
      (!filters?.type || content.type === filters.type) &&
      (!filters?.minEthicalScore || content.ethicalScore >= filters.minEthicalScore) &&
      (!filters?.tags || 
        filters.tags.every(tag => 
          content.tags?.includes(tag)
        )
      )
    );
  }

  // Content regeneration with improved parameters
  async regenerateContent(
    contentId: string, 
    additionalContext?: Partial<PersonalizationContext>
  ): Promise<GeneratedContent> {
    const originalContent = this.generatedContents.find(c => c.id === contentId);
    
    if (!originalContent) {
      throw new Error('Original content not found');
    }

    // Merge original and new context
    const mergedContext = {
      ...(originalContent.tags ? 
        { 
          companyName: originalContent.tags[0],
          industry: originalContent.tags[1]
        } 
        : {}),
      ...additionalContext
    };

    return this.generateContent(
      originalContent.type, 
      PersonalizationContextSchema.parse(mergedContext)
    );
  }

  async generateEmailContent(
    contact: CompanyContact, 
    affiliateLink: string
  ): Promise<EmailTemplate> {
    const emailSubjectContent = await this.generateContent('email_subject', {
      companyName: contact.companyName,
      industry: contact.industry,
      companySize: contact.companySize
    });

    const emailBodyContent = await this.generateContent('email_body', {
      companyName: contact.companyName,
      industry: contact.industry,
      companySize: contact.companySize
    });

    return {
      subject: emailSubjectContent.content,
      body: `${emailBodyContent.content}\n\nLearn more about our mental health resources: ${affiliateLink}`,
      callToAction: 'Discover Better Mental Health Support Today'
    };
  }

  // Generate personalized email content
  async generatePersonalizedEmailContent(
    companyProfile: CompanyProfile
  ): Promise<EmailContent> {
    // Validate company profile
    const validatedProfile = CompanyProfileSchema.parse(companyProfile);

    // Generate personalized subject
    const subject = await this.generateSubject(validatedProfile);

    // Generate email body
    const body = await this.generateEmailBody(validatedProfile);

    // Calculate scores
    const personalizedScore = this.calculatePersonalizationScore(
      validatedProfile, 
      body
    );
    const mentalHealthEmphasis = this.calculateMentalHealthEmphasis(body);
    const ethicalScore = this.calculateEthicalScore(body);

    return EmailContentSchema.parse({
      id: uuidv4(),
      subject,
      body,
      personalizedScore,
      mentalHealthEmphasis,
      ethicalScore,
      generatedAt: new Date()
    });
  }

  // Generate personalized email subject
  private async generateSubject(
    companyProfile: CompanyProfile
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `Generate a compelling email subject line for an HR department. 
            Focus on mental health resources and employee wellness.
            Be professional, empathetic, and concise.`
          },
          {
            role: "user",
            content: `Company: ${companyProfile.name}
            Industry: ${companyProfile.industry}
            Company Size: ${companyProfile.size.min}-${companyProfile.size.max} employees
            Potential Challenges: ${companyProfile.challenges?.join(', ') || 'Not specified'}`
          }
        ],
        max_tokens: 50
      });

      return response.choices[0].message.content?.trim() || 
        "Enhancing Workplace Wellness: A Compassionate Approach";
    } catch (error) {
      console.error("Subject generation error", error);
      return "Supporting Mental Health in the Workplace";
    }
  }

  // Generate personalized email body
  private async generateEmailBody(
    companyProfile: CompanyProfile
  ): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `Write a professional, empathetic email to an HR department.
            Focus on mental health resources, employee wellness, and supportive communication.
            Maintain highest ethical standards and provide genuine value.`
          },
          {
            role: "user",
            content: `Company: ${companyProfile.name}
            Industry: ${companyProfile.industry}
            Company Size: ${companyProfile.size.min}-${companyProfile.size.max} employees
            Current Initiatives: ${companyProfile.mentalHealthInitiatives?.join(', ') || 'None specified'}
            Potential Challenges: ${companyProfile.challenges?.join(', ') || 'Not specified'}`
          }
        ],
        max_tokens: 300
      });

      return response.choices[0].message.content?.trim() || 
        "We understand the unique challenges your organization faces...";
    } catch (error) {
      console.error("Body generation error", error);
      return `Dear HR Team,

We recognize the critical role of mental health in today's workplace. Our tailored resources can help support your employees' well-being and create a more resilient, compassionate work environment.

Best regards,
WellConnect Pro Team`;
    }
  }

  // Calculate personalization score
  private calculatePersonalizationScore(
    companyProfile: CompanyProfile,
    content: string
  ): number {
    const personalizedFactors = [
      companyProfile.name,
      companyProfile.industry,
      ...(companyProfile.challenges || [])
    ];

    const matchedFactors = personalizedFactors.filter(factor => 
      content.toLowerCase().includes(factor.toLowerCase())
    );

    return Math.min(matchedFactors.length * 2, 10);
  }

  // Calculate mental health emphasis score
  private calculateMentalHealthEmphasis(content: string): number {
    const mentalHealthKeywords = [
      'mental health', 'wellness', 'support', 
      'resilience', 'stress management', 
      'emotional well-being'
    ];

    const matchedKeywords = mentalHealthKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    );

    return Math.min(matchedKeywords.length * 2, 10);
  }

  // Calculate ethical score for content
  private calculateEthicalScore(content: string): number {
    const ethicalKeywords = [
      'respect', 'confidential', 'compassionate', 
      'supportive', 'understanding', 'care'
    ];

    const matchedKeywords = ethicalKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    );

    return Math.min(matchedKeywords.length * 2, 10);
  }
}

export const contentGenerationService = new ContentGenerationService();
