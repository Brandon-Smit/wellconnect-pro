import { OpenAI } from 'openai';
import { z } from 'zod';

// Email generation configuration
const EmailGenerationConfig = z.object({
  tone: z.enum(['professional', 'empathetic', 'direct']).default('professional'),
  industry: z.string().optional(),
  context: z.string().optional()
});

type EmailGenerationInput = z.infer<typeof EmailGenerationConfig>;

export class EmailGenerationAgent {
  private openai: OpenAI;

  constructor(apiKey?: string) {
    this.openai = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // Use with caution
    });
  }

  // Generate email with optional configuration
  async generateEmail(config?: EmailGenerationInput) {
    try {
      // Validate and set default configuration
      const validConfig = EmailGenerationConfig.parse(config || {});

      // Prepare prompt for email generation
      const prompt = this.constructPrompt(validConfig);

      // Call OpenAI API for email generation
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system', 
            content: 'You are an AI assistant specialized in generating professional, ethical mental health outreach emails for HR departments.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      // Extract and parse email content
      const generatedContent = response.choices[0].message.content || '';
      return this.parseEmailContent(generatedContent);
    } catch (error) {
      console.error('Email generation failed:', error);
      throw new Error('Failed to generate email');
    }
  }

  // Construct prompt based on configuration
  private constructPrompt(config: EmailGenerationInput): string {
    const basePrompt = `Generate a professional email about mental health resources for HR departments. 
    Tone: ${config.tone}
    ${config.industry ? `Industry context: ${config.industry}` : ''}
    ${config.context ? `Additional context: ${config.context}` : ''}

    Format the response as:
    SUBJECT: [Email Subject]
    BODY: [Email Body Text]`;

    return basePrompt;
  }

  // Parse generated content into subject and body
  private parseEmailContent(content: string): { subject: string; body: string } {
    const subjectMatch = content.match(/SUBJECT:\s*(.+)/i);
    const bodyMatch = content.match(/BODY:\s*(.+)/is);

    if (!subjectMatch || !bodyMatch) {
      throw new Error('Invalid email generation response');
    }

    return {
      subject: subjectMatch[1].trim(),
      body: bodyMatch[1].trim()
    };
  }
}
