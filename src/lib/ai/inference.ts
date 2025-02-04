import axios from 'axios';

// Enum for supported LLM providers
export enum LLMProvider {
  Mistral = 'mistralai/Mistral-7B-v0.1',
  Llama2 = 'meta-llama/Llama-2-7b-chat-hf',
  Phi2 = 'microsoft/phi-2',
  OpenHermes = 'teknium/OpenHermes-2.5-Mistral-7B'
}

// Configuration interface for LLM settings
interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
}

export class AIInference {
  private static HUGGING_FACE_API = 'https://api-inference.huggingface.co/models/';
  
  // Default configuration
  private static defaultConfig: LLMConfig = {
    provider: LLMProvider.OpenHermes,
    maxTokens: 150,
    temperature: 0.7
  };

  // Flexible text generation method
  static async generateText(
    prompt: string, 
    config: Partial<LLMConfig> = {}
  ): Promise<string> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const apiKey = mergedConfig.apiKey || process.env.HUGGING_FACE_API_KEY;

    if (!apiKey) {
      console.warn('No Hugging Face API key provided. Using fallback.');
      return this.fallbackGeneration(prompt);
    }

    try {
      const response = await axios.post(
        `${this.HUGGING_FACE_API}${mergedConfig.provider}`, 
        { 
          inputs: prompt, 
          parameters: { 
            max_new_tokens: mergedConfig.maxTokens,
            temperature: mergedConfig.temperature
          } 
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data[0]?.generated_text || this.fallbackGeneration(prompt);
    } catch (error) {
      console.error('AI Generation Error:', error);
      return this.fallbackGeneration(prompt);
    }
  }

  // Fallback method remains the same
  private static fallbackGeneration(prompt: string): string {
    const templates = [
      `Based on "${prompt}", here's a professional response.`,
      `Generating content for: "${prompt}"`,
      `Adaptive response to: "${prompt}"`
    ];
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // Advanced method to select best model based on context
  static async selectBestModel(context: string): Promise<LLMProvider> {
    // Simple heuristic for model selection
    const contextLength = context.length;
    const complexityKeywords = [
      'technical', 'complex', 'detailed', 'sophisticated'
    ];

    const isComplex = complexityKeywords.some(keyword => 
      context.toLowerCase().includes(keyword)
    );

    if (contextLength > 500 || isComplex) {
      return LLMProvider.Mistral;  // More capable for complex tasks
    }

    if (contextLength < 200) {
      return LLMProvider.Phi2;  // Lightweight for simple tasks
    }

    return LLMProvider.OpenHermes;  // Balanced default
  }

  // Lightweight text analysis remains the same
  static analyzeText(text: string): { 
    sentiment: 'positive' | 'neutral' | 'negative', 
    keywords: string[] 
  } {
    const keywords = text.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    
    const positiveWords = ['good', 'great', 'excellent', 'helpful'];
    const negativeWords = ['bad', 'poor', 'terrible', 'unhelpful'];

    const sentiment = keywords.some(word => positiveWords.includes(word)) 
      ? 'positive' 
      : keywords.some(word => negativeWords.includes(word)) 
        ? 'negative' 
        : 'neutral';

    return {
      sentiment,
      keywords: keywords.slice(0, 5)
    };
  }
}
