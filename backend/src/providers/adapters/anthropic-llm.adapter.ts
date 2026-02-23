import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import {
  ILLMProvider,
  ILLMProviderOptions,
  ILLMProviderResult,
  ILLMProviderJSONResult,
} from '../interfaces/llm-provider.interface';
import { LLM_DEFAULTS } from '../../config/defaults';

@Injectable()
export class AnthropicLLMAdapter implements ILLMProvider {
  readonly name = 'anthropic';

  private createClient(apiKey: string): Anthropic {
    return new Anthropic({ apiKey });
  }

  async generateText(
    prompt: string,
    options: ILLMProviderOptions,
  ): Promise<ILLMProviderResult> {
    const client = this.createClient(options.apiKey);
    const message = await client.messages.create({
      model: options.model || LLM_DEFAULTS.anthropic.planModel,
      max_tokens: options.maxTokens || LLM_DEFAULTS.anthropic.maxTokensPlan,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    const text = content.type === 'text' ? content.text : '';
    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens;

    return {
      text,
      tokensUsed,
      cost: this.calculateCost(
        message.usage.input_tokens,
        message.usage.output_tokens,
      ),
    };
  }

  async generateJSON<T = unknown>(
    prompt: string,
    options: ILLMProviderOptions,
  ): Promise<ILLMProviderJSONResult<T>> {
    const result = await this.generateText(prompt, options);
    const data = JSON.parse(result.text) as T;
    return { data, tokensUsed: result.tokensUsed, cost: result.cost };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const client = this.createClient(apiKey);
      await client.messages.create({
        model: LLM_DEFAULTS.anthropic.validationModel,
        max_tokens: LLM_DEFAULTS.anthropic.maxTokensValidation,
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
      (estimatedTokens / 1000000) *
      LLM_DEFAULTS.anthropic.pricing.inputPerMillion
    );
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    return (
      (inputTokens / 1000000) * LLM_DEFAULTS.anthropic.pricing.inputPerMillion +
      (outputTokens / 1000000) * LLM_DEFAULTS.anthropic.pricing.outputPerMillion
    );
  }
}
