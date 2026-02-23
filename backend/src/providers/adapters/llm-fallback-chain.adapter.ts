import { Injectable, Inject, Logger } from '@nestjs/common';
import { LLM_PROVIDER } from '../tokens';
import {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../interfaces/llm-provider.interface';
import { ILLMFallbackChain } from '../interfaces/llm-fallback-chain.interface';

@Injectable()
export class LLMFallbackChainAdapter implements ILLMFallbackChain {
  private readonly logger = new Logger(LLMFallbackChainAdapter.name);
  private _providers: ILLMProvider[];

  constructor(@Inject(LLM_PROVIDER) providers: ILLMProvider[]) {
    this._providers = [...providers];
  }

  get providers(): ILLMProvider[] {
    return [...this._providers];
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    let lastError: Error | null = null;

    for (const provider of this._providers) {
      try {
        return await provider.complete(request);
      } catch (error: any) {
        lastError = error;
        this.logger.warn(
          `Provider ${provider.name} failed, trying next: ${error.message}`,
        );
      }
    }

    throw lastError ?? new Error('No LLM providers available');
  }

  async *stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    const active = this.getActiveProvider();
    if (!active) {
      throw new Error('No LLM providers available');
    }
    yield* active.stream(request);
  }

  addProvider(provider: ILLMProvider): void {
    this._providers.push(provider);
  }

  removeProvider(providerId: string): void {
    this._providers = this._providers.filter((p) => p.name !== providerId);
  }

  getActiveProvider(): ILLMProvider | null {
    return this._providers.length > 0 ? this._providers[0] : null;
  }
}
