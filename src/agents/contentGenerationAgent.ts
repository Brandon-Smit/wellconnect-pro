import { Mistral7B } from '../lib/aiModels/mistral';
import { CompanyContact } from '../types/companyContact';

export class ContentGenerationAgent {
  private aiModel: Mistral7B;

  constructor() {
    this.aiModel = new Mistral7B();
  }

  async generateEmailContent(contact: CompanyContact): Promise<string> {
    const prompt = this.createPersonalizationPrompt(contact);
    
    const emailContent = await this.aiModel.generateText(prompt, {
      maxTokens: 500,
      temperature: 0.7,
      topP: 0.9
    });

    return this.sanitizeContent(emailContent);
  }

  private createPersonalizationPrompt(contact: CompanyContact): string {
    return `
      Generate a professional, empathetic email about mental health resources 
      for an HR professional at ${contact.companyName}. 
      
      Context:
      - Company Size: ${contact.companySize}
      - Industry: ${contact.industry}
      
      Key Objectives:
      1. Introduce mental health support services
      2. Highlight value for HR departments
      3. Maintain professional, supportive tone
      4. Include subtle affiliate link
      
      Constraints:
      - Maximum 250 words
      - No aggressive sales language
      - Focus on employee well-being
    `;
  }

  private sanitizeContent(content: string): string {
    // Remove any potentially problematic content
    return content
      .replace(/\b(http|https):\/\/\S+/gi, '')  // Remove raw URLs
      .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '')  // Remove emails
      .trim();
  }
}
