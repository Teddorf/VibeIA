import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
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
export class AnthropicLLMAdapter implements ILLMProvider {
  readonly name = 'anthropic';

  private createClient(apiKey: string): Anthropic {
    return new Anthropic({ apiKey });
  }

  // ─── Legacy methods ───────────────────────────────────────────────────────

  async generateText(
    prompt: string,
    options: ILLMProviderOptions,
  ): Promise<ILLMProviderResult> {
    const client = this.createClient(options.apiKey);
    const message = await client.messages.create({
      model: options.model || LLM_DEFAULTS.anthropic.planModel,
      max_tokens: options.maxTokens || LLM_DEFAULTS.anthropic.maxTokensPlan,
      temperature: options.temperature,
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
    let data: T;
    try {
      data = JSON.parse(result.text) as T;
    } catch {
      throw new Error(
        `Anthropic returned invalid JSON: ${result.text.substring(0, 200)}`,
      );
    }
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

  // ─── SPEC v2.2 methods ────────────────────────────────────────────────────

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
    const client = this.createClient(apiKey);
    const start = Date.now();

    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content:
          typeof m.content === 'string'
            ? m.content
            : m.content.map((b) => b.text ?? '').join(''),
      }));

    const systemMsg = request.messages.find((m) => m.role === 'system');
    const systemPrompt = systemMsg
      ? typeof systemMsg.content === 'string'
        ? systemMsg.content
        : systemMsg.content.map((b) => b.text ?? '').join('')
      : undefined;

    const params: any = {
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      messages,
    };
    if (systemPrompt) params.system = systemPrompt;

    const message = await client.messages.create(params);
    const latencyMs = Date.now() - start;
    const content = message.content[0];
    const text = content.type === 'text' ? content.text : '';

    return {
      content: text,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
        cachedTokens: 0,
        totalTokens: message.usage.input_tokens + message.usage.output_tokens,
      },
      model: request.model,
      finishReason: message.stop_reason === 'end_turn' ? 'stop' : 'stop',
      latencyMs,
      cached: false,
      providerId: this.name,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
    const client = this.createClient(apiKey);

    const messages = request.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content:
          typeof m.content === 'string'
            ? m.content
            : m.content.map((b) => b.text ?? '').join(''),
      }));

    const stream = client.messages.stream({
      model: request.model,
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = (event as any).delta;
        if (delta?.type === 'text_delta') {
          yield { delta: delta.text ?? '' };
        }
      }
      if (event.type === 'message_stop') {
        yield { delta: '', finishReason: 'stop' };
      }
    }
  }

  listModels(): ModelInfo[] {
    return [
      {
        modelId: LLM_DEFAULTS.anthropic.planModel,
        displayName: 'Claude Sonnet 4',
        tier: 'powerful',
        contextWindow: 200000,
        capabilities: ['text', 'json', 'streaming', 'code', 'vision'],
      },
      {
        modelId: LLM_DEFAULTS.anthropic.validationModel,
        displayName: 'Claude 3 Haiku',
        tier: 'fast',
        contextWindow: 200000,
        capabilities: ['text', 'json', 'streaming', 'code'],
      },
    ];
  }

  getModelPricing(modelId: string): ModelPricingSpec {
    return {
      inputPerMillionTokens: LLM_DEFAULTS.anthropic.pricing.inputPerMillion,
      outputPerMillionTokens: LLM_DEFAULTS.anthropic.pricing.outputPerMillion,
    };
  }

  supportsCapability(capability: LLMCapability): boolean {
    const supported: LLMCapability[] = [
      'text',
      'json',
      'streaming',
      'code',
      'vision',
    ];
    return supported.includes(capability);
  }

  private calculateCost(inputTokens: number, outputTokens: number): number {
    return (
      (inputTokens / 1000000) * LLM_DEFAULTS.anthropic.pricing.inputPerMillion +
      (outputTokens / 1000000) * LLM_DEFAULTS.anthropic.pricing.outputPerMillion
    );
  }
}
