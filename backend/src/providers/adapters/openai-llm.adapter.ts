import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import {
  ILLMProvider,
  ILLMProviderOptions,
  ILLMProviderResult,
  ILLMProviderJSONResult,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  ModelInfo,
  ModelPricingSpec,
  LLMCapability,
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
      temperature: options.temperature,
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
      temperature: options.temperature,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const text = completion.choices[0].message.content || '{}';
    let data: T;
    try {
      data = JSON.parse(text) as T;
    } catch {
      throw new Error(
        `OpenAI returned invalid JSON: ${text.substring(0, 200)}`,
      );
    }
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

  // ─── SPEC v2.2 methods ────────────────────────────────────────────────────

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.OPENAI_API_KEY ?? '';
    const client = this.createClient(apiKey);
    const start = Date.now();

    const messages = request.messages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === 'string'
          ? m.content
          : m.content.map((b) => b.text ?? '').join(''),
    }));

    const params: any = {
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      messages,
    };
    if (request.responseFormat === 'json') {
      params.response_format = { type: 'json_object' };
    }

    const completion = await client.chat.completions.create(params);
    const latencyMs = Date.now() - start;

    return {
      content: completion.choices[0].message.content || '',
      usage: {
        inputTokens: completion.usage?.prompt_tokens || 0,
        outputTokens: completion.usage?.completion_tokens || 0,
        cachedTokens: 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
      model: request.model,
      finishReason:
        completion.choices[0].finish_reason === 'stop' ? 'stop' : 'length',
      latencyMs,
      cached: false,
      providerId: this.name,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    const apiKey = process.env.OPENAI_API_KEY ?? '';
    const client = this.createClient(apiKey);

    const messages = request.messages.map((m) => ({
      role: m.role,
      content:
        typeof m.content === 'string'
          ? m.content
          : m.content.map((b) => b.text ?? '').join(''),
    }));

    const stream = await client.chat.completions.create({
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content ?? '';
      const finishReason = chunk.choices[0]?.finish_reason;
      yield {
        delta,
        finishReason: finishReason === 'stop' ? 'stop' : undefined,
      };
    }
  }

  listModels(): ModelInfo[] {
    return [
      {
        modelId: LLM_DEFAULTS.openai.planModel,
        displayName: 'GPT-4 Turbo Preview',
        tier: 'balanced',
        contextWindow: 128000,
        capabilities: ['text', 'json', 'streaming', 'function-calling', 'code'],
      },
      {
        modelId: LLM_DEFAULTS.openai.validationModel,
        displayName: 'GPT-3.5 Turbo',
        tier: 'fast',
        contextWindow: 16384,
        capabilities: ['text', 'json', 'streaming', 'function-calling', 'code'],
      },
    ];
  }

  getModelPricing(_modelId: string): ModelPricingSpec {
    return {
      inputPerMillionTokens: LLM_DEFAULTS.openai.pricing.inputPerMillion,
      outputPerMillionTokens: LLM_DEFAULTS.openai.pricing.outputPerMillion,
    };
  }

  supportsCapability(capability: LLMCapability): boolean {
    const supported: LLMCapability[] = [
      'text',
      'json',
      'streaming',
      'function-calling',
      'code',
    ];
    return supported.includes(capability);
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
