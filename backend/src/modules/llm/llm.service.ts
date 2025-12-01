import { Injectable } from '@nestjs/common';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { LLMProvider, LLMResponse } from './interfaces/llm-provider.interface';

@Injectable()
export class LlmService {
  private providers: Map\u003cstring, LLMProvider\u003e;
  private primaryProvider: string;
  private fallbackProvider: string;

  constructor() {
    this.providers = new Map();
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('openai', new OpenAIProvider());

    this.primaryProvider = process.env.PRIMARY_LLM || 'anthropic';
    this.fallbackProvider = process.env.FALLBACK_LLM || 'openai';
  }

  async generatePlan(wizardData: any): Promise\u003cLLMResponse\u003e {
    try {
      const provider = this.providers.get(this.primaryProvider);
      if (!provider) {
        throw new Error(\Provider \ not found\);
      }

      console.log(\Generating plan with \...\);
      return await provider.generatePlan(wizardData);
    } catch (error) {
      console.error(\Primary provider (\) failed:\, error);
      console.log(\Falling back to \...\);

      const fallback = this.providers.get(this.fallbackProvider);
      if (!fallback) {
        throw new Error('No fallback provider available');
      }

      return await fallback.generatePlan(wizardData);
    }
  }

  estimateCost(wizardData: any): number {
    const provider = this.providers.get(this.primaryProvider);
    if (!provider) return 0;

    const prompt = JSON.stringify(wizardData);
    return provider.estimateCost(prompt);
  }
}
