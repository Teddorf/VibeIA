import { Injectable } from '@nestjs/common';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { LLMProvider, LLMResponse } from './interfaces/llm-provider.interface';

@Injectable()
export class LlmService {
  private providers: Map<string, LLMProvider>;
  private primaryProvider: string;
  private fallbackProvider: string;
  private tertiaryProvider: string;

  constructor() {
    this.providers = new Map();
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('gemini', new GeminiProvider());

    this.primaryProvider = process.env.PRIMARY_LLM || 'anthropic';
    this.fallbackProvider = process.env.FALLBACK_LLM || 'gemini';
    this.tertiaryProvider = process.env.TERTIARY_LLM || 'openai';
  }

  async generatePlan(wizardData: any): Promise<LLMResponse> {
    // Try primary provider
    try {
      const provider = this.providers.get(this.primaryProvider);
      if (!provider) {
        throw new Error(`Provider ${this.primaryProvider} not found`);
      }

      console.log(`Generating plan with ${this.primaryProvider}...`);
      return await provider.generatePlan(wizardData);
    } catch (error) {
      console.error(`Primary provider (${this.primaryProvider}) failed:`, error);

      // Try fallback provider
      try {
        console.log(`Falling back to ${this.fallbackProvider}...`);
        const fallback = this.providers.get(this.fallbackProvider);
        if (!fallback) {
          throw new Error('No fallback provider available');
        }
        return await fallback.generatePlan(wizardData);
      } catch (fallbackError) {
        console.error(`Fallback provider (${this.fallbackProvider}) failed:`, fallbackError);

        // Try tertiary provider
        console.log(`Trying tertiary provider ${this.tertiaryProvider}...`);
        const tertiary = this.providers.get(this.tertiaryProvider);
        if (!tertiary) {
          throw new Error('No tertiary provider available');
        }
        return await tertiary.generatePlan(wizardData);
      }
    }
  }

  async generateCode(task: any, context: any): Promise<{ files: { path: string; content: string }[] }> {
    // Try primary provider
    try {
      const provider = this.providers.get(this.primaryProvider);
      if (!provider) throw new Error(`Provider ${this.primaryProvider} not found`);

      console.log(`Generating code with ${this.primaryProvider}...`);
      return await provider.generateCode(task, context);
    } catch (error) {
      console.error(`Primary provider (${this.primaryProvider}) failed code gen:`, error);

      // Try fallback
      try {
        const fallback = this.providers.get(this.fallbackProvider);
        if (!fallback) throw new Error('No fallback provider available');

        console.log(`Falling back to ${this.fallbackProvider} for code gen...`);
        return await fallback.generateCode(task, context);
      } catch (fallbackError) {
        console.error(`Fallback provider (${this.fallbackProvider}) failed code gen:`, fallbackError);

        // Try tertiary
        const tertiary = this.providers.get(this.tertiaryProvider);
        if (!tertiary) throw new Error('No tertiary provider available');

        console.log(`Trying tertiary provider ${this.tertiaryProvider} for code gen...`);
        return await tertiary.generateCode(task, context);
      }
    }
  }

  estimateCost(wizardData: any): number {
    const provider = this.providers.get(this.primaryProvider);
    if (!provider) return 0;

    const prompt = JSON.stringify(wizardData);
    return provider.estimateCost(prompt);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}