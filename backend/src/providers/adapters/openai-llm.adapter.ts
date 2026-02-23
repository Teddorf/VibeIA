import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  ILLMProvider,
  ILLMProviderOptions,
  ILLMProviderResult,
  ILLMProviderJSONResult,
} from '../interfaces/llm-provider.interface';
import { LLM_DEFAULTS } from '../../config/defaults';

@Injectable()
export class OpenAILLMAdapter implements ILLMProvider {
  readonly name = 'openai';

  private createClient(apiKey: string): OpenAI {
    return new OpenAI({ apiKey });
  }

  async generateText(
    prompt: string,
    options: ILLMProviderOptions,
  ): Promise<ILLMProviderResult> {
    const client = this.createClient(options.apiKey);
    const completion = await client.chat.completions.create({
      model: options.model || LLM_DEFAULTS.openai.planModel,
      max_tokens: options.maxTokens || LLM_DEFAULTS.openai.maxTokensPlan,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = completion.choices[0].message.content || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      text,
      tokensUsed,
      cost: this.calculateCost(
        completion.usage?.prompt_tokens || 0,
        completion.usage?.completion_tokens || 0,
      ),
    };
  }

  async generateJSON<T = unknown>(
    prompt: string,
    options: ILLMProviderOptions,
  ): Promise<ILLMProviderJSONResult<T>> {
    const client = this.createClient(options.apiKey);
    const completion = await client.chat.completions.create({
      model: options.model || LLM_DEFAULTS.openai.planModel,
      max_tokens: options.maxTokens || LLM_DEFAULTS.openai.maxTokensPlan,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0].message.content || '{}';
    const data = JSON.parse(text) as T;
    const tokensUsed = completion.usage?.total_tokens || 0;

    return {
      data,
      tokensUsed,
      cost: this.calculateCost(
        completion.usage?.prompt_tokens || 0,
        completion.usage?.completion_tokens || 0,
      ),
    };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(apiKey);
      await client.chat.completions.create({
        model: LLM_DEFAULTS.openai.validationModel,
        max_tokens: LLM_DEFAULTS.openai.maxTokensValidation,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(prompt: string): number {
    const estimatedTokens = prompt.length / LLM_DEFAULTS.charsPerToken;
    return (
      (estimatedTokens / 1000000) * LLM_DEFAULTS.openai.pricing.inputPerMillion
    );
  }

  private calculateCost(
    promptTokens: number,
    completionTokens: number,
  ): number {
    return (
      (promptTokens / 1000000) * LLM_DEFAULTS.openai.pricing.inputPerMillion +
      (completionTokens / 1000000) *
        LLM_DEFAULTS.openai.pricing.outputPerMillion
    );
  }
}
