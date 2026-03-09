import { Injectable, Inject } from '@nestjs/common';
import { VIBE_CONFIG, LLM_FALLBACK_CHAIN } from '../providers/tokens';
import { VibeConfig } from '../config/vibe-config';
import { ILLMFallbackChain } from '../providers/interfaces/llm-fallback-chain.interface';
import {
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../providers/interfaces/llm-provider.interface';

export class RateLimitExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitExceededError';
  }
}

@Injectable()
export class LLMRateLimiter {
  private readonly requestTimestamps: number[] = [];
  private readonly requestsPerMinute: number;

  constructor(
    @Inject(VIBE_CONFIG) private readonly config: VibeConfig,
    @Inject(LLM_FALLBACK_CHAIN)
    private readonly fallbackChain: ILLMFallbackChain,
  ) {
    this.requestsPerMinute = config.rateLimits.llm.requestsPerMinute;
  }

  private pruneOldTimestamps(): void {
    const oneMinuteAgo = Date.now() - 60_000;
    while (
      this.requestTimestamps.length > 0 &&
      this.requestTimestamps[0] < oneMinuteAgo
    ) {
      this.requestTimestamps.shift();
    }
  }

  private checkRateLimit(): void {
    this.pruneOldTimestamps();
    if (this.requestTimestamps.length >= this.requestsPerMinute) {
      throw new RateLimitExceededError(
        `LLM rate limit exceeded: ${this.requestsPerMinute} requests per minute`,
      );
    }
  }

  private recordRequest(): void {
    this.requestTimestamps.push(Date.now());
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    this.checkRateLimit();
    this.recordRequest();
    return this.fallbackChain.complete(request);
  }

  stream(request: LLMRequest): AsyncIterable<LLMStreamChunk> {
    this.checkRateLimit();
    this.recordRequest();
    const fallbackChain = this.fallbackChain;
    async function* generate(): AsyncIterable<LLMStreamChunk> {
      yield* fallbackChain.stream(request);
    }
    return generate();
  }

  getRequestCount(): number {
    this.pruneOldTimestamps();
    return this.requestTimestamps.length;
  }

  getRemainingRequests(): number {
    return Math.max(0, this.requestsPerMinute - this.getRequestCount());
  }
}
