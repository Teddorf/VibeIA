import { Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
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

  // ─── SPEC v2.2 methods ────────────────────────────────────────────────────

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const apiKey = process.env.GOOGLE_AI_API_KEY ?? '';
    const client = this.createClient(apiKey);
    const start = Date.now();

    const model = client.getGenerativeModel({
      model: request.model,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        responseMimeType:
          request.responseFormat === 'json' ? 'application/json' : undefined,
      },
    });

    const prompt = request.messages
      .map((m) =>
        typeof m.content === 'string'
          ? m.content
          : m.content.map((b) => b.text ?? '').join(''),
      )
      .join('\n');

    const result = await model.generateContent(prompt);
    const latencyMs = Date.now() - start;
    const text = result.response.text();
    const estimatedTokens = this.estimateTokens(prompt, text);

    return {
      content: text,
      usage: {
        inputTokens: Math.round(prompt.length / LLM_DEFAULTS.charsPerToken),
        outputTokens: Math.round(text.length / LLM_DEFAULTS.charsPerToken),
        cachedTokens: 0,
        totalTokens: estimatedTokens,
      },
      model: request.model,
      finishReason: 'stop',
      latencyMs,
      cached: false,
      providerId: this.name,
    };
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    const apiKey = process.env.GOOGLE_AI_API_KEY ?? '';
    const client = this.createClient(apiKey);

    const model = client.getGenerativeModel({
      model: request.model,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
      },
    });

    const prompt = request.messages
      .map((m) =>
        typeof m.content === 'string'
          ? m.content
          : m.content.map((b) => b.text ?? '').join(''),
      )
      .join('\n');

    const result = await model.generateContentStream(prompt);
    for await (const chunk of result.stream) {
      yield { delta: chunk.text() };
    }
    yield { delta: '', finishReason: 'stop' };
  }

  listModels(): ModelInfo[] {
    return [
      {
        modelId: LLM_DEFAULTS.gemini.planModel,
        displayName: 'Gemini 2.0 Flash',
        tier: 'fast',
        contextWindow: 1048576,
        capabilities: ['text', 'json', 'streaming', 'code'],
      },
      {
        modelId: LLM_DEFAULTS.gemini.fallbackModel,
        displayName: 'Gemini Pro',
        tier: 'balanced',
        contextWindow: 32768,
        capabilities: ['text', 'json', 'streaming', 'code'],
      },
    ];
  }

  getModelPricing(_modelId: string): ModelPricingSpec {
    return {
      inputPerMillionTokens: LLM_DEFAULTS.gemini.pricing.inputPerMillion,
      outputPerMillionTokens: LLM_DEFAULTS.gemini.pricing.outputPerMillion,
    };
  }

  supportsCapability(capability: LLMCapability): boolean {
    const supported: LLMCapability[] = ['text', 'json', 'streaming', 'code'];
    return supported.includes(capability);
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
