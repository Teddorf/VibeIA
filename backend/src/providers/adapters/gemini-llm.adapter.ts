import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  ILLMProvider,
  ILLMProviderOptions,
  ILLMProviderResult,
  ILLMProviderJSONResult,
} from '../interfaces/llm-provider.interface';
import { LLM_DEFAULTS } from '../../config/defaults';

@Injectable()
export class GeminiLLMAdapter implements ILLMProvider {
  readonly name = 'gemini';

  private createClient(apiKey: string): GoogleGenerativeAI {
    return new GoogleGenerativeAI(apiKey);
  }

  async generateText(
    prompt: string,
    options: ILLMProviderOptions,
  ): Promise<ILLMProviderResult> {
    const client = this.createClient(options.apiKey);
    const model = client.getGenerativeModel({
      model: options.model || LLM_DEFAULTS.gemini.planModel,
      generationConfig: {
        temperature:
          options.temperature ?? LLM_DEFAULTS.gemini.temperatureDefault,
        maxOutputTokens:
          options.maxTokens || LLM_DEFAULTS.gemini.maxOutputTokens,
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const tokensUsed = this.estimateTokens(prompt, text);

    return {
      text,
      tokensUsed,
      cost: this.calculateCost(tokensUsed),
    };
  }

  async generateJSON<T = unknown>(
    prompt: string,
    options: ILLMProviderOptions,
  ): Promise<ILLMProviderJSONResult<T>> {
    const client = this.createClient(options.apiKey);
    const model = client.getGenerativeModel({
      model: options.model || LLM_DEFAULTS.gemini.planModel,
      generationConfig: {
        temperature:
          options.temperature ?? LLM_DEFAULTS.gemini.temperatureDefault,
        maxOutputTokens:
          options.maxTokens || LLM_DEFAULTS.gemini.maxOutputTokens,
        responseMimeType: 'application/json',
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new Error(
        `Gemini returned invalid JSON: ${text.substring(0, 200)}`,
      );
    }
    const tokensUsed = this.estimateTokens(prompt, text);

    return {
      data,
      tokensUsed,
      cost: this.calculateCost(tokensUsed),
    };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(apiKey);
      const model = client.getGenerativeModel({
        model: LLM_DEFAULTS.gemini.planModel,
      });
      await model.generateContent('Hi');
      return true;
    } catch {
      try {
        const client = this.createClient(apiKey);
        const model = client.getGenerativeModel({
          model: LLM_DEFAULTS.gemini.fallbackModel,
        });
        await model.generateContent('Hi');
        return true;
      } catch {
        return false;
      }
    }
  }

  estimateCost(prompt: string): number {
    const estimatedTokens = prompt.length / LLM_DEFAULTS.charsPerToken;
    return (
      (estimatedTokens / 1000000) * LLM_DEFAULTS.gemini.pricing.inputPerMillion
    );
  }

  private estimateTokens(prompt: string, response: string): number {
    return Math.round(
      (prompt.length + response.length) / LLM_DEFAULTS.charsPerToken,
    );
  }

  private calculateCost(totalTokens: number): number {
    return (
      (totalTokens / 1000000) * LLM_DEFAULTS.gemini.pricing.averagePerMillion
    );
  }
}
