import { z } from 'zod';
import { urlContextExtractor } from '../services/urlContextExtractor';
import { logger } from '../core/loggingSystem';
import { OpenAI } from 'openai';

// Schemas for structured content generation
const EmailContextSchema = z.object({
  serviceUrl: z.string().url(),
  targetCompany: z.object({
    name: z.string(),
    industry: z.string(),
    size: z.enum(['small', 'medium', 'large'])
  }),
  communicationGoal: z.enum([
    'introduce_service', 
    'schedule_demo', 
    'provide_information'
  ])
});

const EmailContentSchema = z.object({
  subject: z.string(),
  body: z.string(),
  callToAction: z.string(),
  personalizedElements: z.array(z.string()).optional()
});

export class ContentGenerationService {
  private openai: OpenAI;
  private static instance: ContentGenerationService;

  private constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  public static getInstance(): ContentGenerationService {
    if (!this.instance) {
      this.instance = new ContentGenerationService();
    }
    return this.instance;
  }

  public async generateEmailContent(
    emailContext: z.infer<typeof EmailContextSchema>
  ): Promise<z.infer<typeof EmailContentSchema>> {
    try {
      // Extract service context from URL
      const serviceContext = await urlContextExtractor.extractServiceContext(
        emailContext.serviceUrl
      );

      // Generate AI-powered email content
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant generating professional, ethical emails for mental health service outreach to HR departments. 
            Focus on value, professionalism, and genuine support.`
          },
          {
            role: "user",
            content: `Generate an email for a ${emailContext.targetCompany.size} ${emailContext.targetCompany.industry} company.
            
            Service Details:
            - Name: ${serviceContext.serviceName}
            - Primary Services: ${serviceContext.primaryServices.join(', ')}
            - Key Benefits: ${serviceContext.keyBenefits.join(', ')}
            
            Communication Goal: ${emailContext.communicationGoal}
            
            Ensure the email is:
            - Professionally written
            - Focused on employee mental health support
            - Highlights unique service value
            - Includes a clear call-to-action`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      });

      const emailContent = completion.choices[0].message.content || '';

      // Validate and structure the generated content
      const structuredContent = this.structureEmailContent(
        emailContent, 
        serviceContext, 
        emailContext
      );

      logger.log('info', 'Email Content Generated', {
        companyName: emailContext.targetCompany.name,
        communicationGoal: emailContext.communicationGoal
      });

      return structuredContent;
    } catch (error) {
      logger.log('error', 'Email Content Generation Failed', { error });
      throw error;
    }
  }

  private structureEmailContent(
    rawContent: string, 
    serviceContext: any, 
    emailContext: z.infer<typeof EmailContextSchema>
  ): z.infer<typeof EmailContentSchema> {
    // Advanced content parsing and structuring
    const subjectMatch = rawContent.match(/Subject:\s*(.+?)(\n|$)/i);
    const bodyMatch = rawContent.match(/Body:\s*(.+?)(\n\n|$)/is);
    const ctaMatch = rawContent.match(/Call to Action:\s*(.+?)(\n|$)/i);

    return EmailContentSchema.parse({
      subject: subjectMatch ? subjectMatch[1].trim() : 
        `Mental Health Support for ${emailContext.targetCompany.name}`,
      body: bodyMatch ? bodyMatch[1].trim() : rawContent,
      callToAction: ctaMatch ? ctaMatch[1].trim() : 
        'Schedule a confidential consultation today',
      personalizedElements: [
        `Tailored for ${emailContext.targetCompany.industry} professionals`,
        ...serviceContext.keyBenefits.slice(0, 2)
      ]
    });
  }

  // Advanced parsing techniques
  public async enhanceContentContext(
    originalContent: string, 
    serviceUrl: string
  ): Promise<string> {
    const serviceContext = await urlContextExtractor.extractServiceContext(serviceUrl);
    
    const enhancementCompletion = await this.openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "Enhance the given content with more contextual, nuanced information."
        },
        {
          role: "user",
          content: `Original Content: ${originalContent}
          
          Service Context:
          - Name: ${serviceContext.serviceName}
          - Primary Services: ${serviceContext.primaryServices.join(', ')}
          - Ethical Standards: ${serviceContext.ethicalStandards?.join(', ') || 'Not specified'}
          
          Enhance the content to be more:
          - Contextually rich
          - Professionally compelling
          - Aligned with service's ethical standards`
        }
      ],
      temperature: 0.6,
      max_tokens: 600
    });

    return enhancementCompletion.choices[0].message.content || originalContent;
  }
}

export const contentGenerationService = ContentGenerationService.getInstance();
