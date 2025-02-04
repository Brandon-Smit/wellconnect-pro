import axios from 'axios';
import { z } from 'zod';

// Zod schema for AI inference input
export const AIInferenceInputSchema = z.object({
  industry: z.string().min(2, "Industry must be at least 2 characters"),
  companySize: z.enum(['startup', 'small', 'medium', 'enterprise']),
  mentalHealthFocus: z.string().optional(),
  tone: z.enum(['professional', 'empathetic', 'direct']).default('professional')
});

// Zod schema for AI inference output
export const AIEmailContentSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  body: z.string().min(20, "Email body must be at least 20 characters"),
  callToAction: z.string().optional()
});

export type AIInferenceInput = z.infer<typeof AIInferenceInputSchema>;
export type AIEmailContent = z.infer<typeof AIEmailContentSchema>;

export class AIInferenceService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.HUGGING_FACE_API_KEY || '';
    this.baseUrl = 'https://api-inference.huggingface.co/models/';
  }

  async generateEmailContent(input: AIInferenceInput): Promise<AIEmailContent> {
    // Input validation
    AIInferenceInputSchema.parse(input);

    try {
      const response = await axios.post(
        `${this.baseUrl}gpt2`, 
        { 
          inputs: this.constructPrompt(input),
          parameters: { 
            max_length: 300,
            temperature: 0.7,
            num_return_sequences: 1
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Basic parsing of AI-generated content
      const rawContent = response.data[0]?.generated_text || '';
      const parsedContent = this.parseAIResponse(rawContent);

      // Validate parsed content
      return AIEmailContentSchema.parse(parsedContent);
    } catch (error) {
      console.error('AI Inference Error:', error);
      throw new Error('Failed to generate email content');
    }
  }

  private constructPrompt(input: AIInferenceInput): string {
    return `Generate a professional email for a ${input.companySize} ${input.industry} company 
    focusing on mental health support. Tone should be ${input.tone}. 
    ${input.mentalHealthFocus ? `Specific focus: ${input.mentalHealthFocus}` : ''}
    
    Email should include:
    1. Compelling subject line
    2. Empathetic and informative body
    3. Clear call-to-action`;
  }

  private parseAIResponse(rawContent: string): Partial<AIEmailContent> {
    // Basic parsing logic - can be enhanced with more sophisticated NLP
    const lines = rawContent.split('\n').filter(line => line.trim() !== '');
    
    return {
      subject: lines[0] || 'Supporting Mental Health in the Workplace',
      body: lines.slice(1, -1).join('\n') || 'We are committed to supporting your team\'s mental well-being.',
      callToAction: lines[lines.length - 1] || 'Learn more about our mental health resources.'
    };
  }
}

export const aiInferenceService = new AIInferenceService();
