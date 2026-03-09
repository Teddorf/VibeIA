import { LLMRateLimiter, RateLimitExceededError } from './llm-rate-limiter';
import { VibeConfig } from '../config/vibe-config';
import { loadVibeConfig } from '../config/vibe-config';
import { ILLMFallbackChain } from '../providers/interfaces/llm-fallback-chain.interface';
import {
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../providers/interfaces/llm-provider.interface';

describe('LLMRateLimiter', () => {
  let limiter: LLMRateLimiter;
  let mockConfig: VibeConfig;
  let mockFallbackChain: jest.Mocked<ILLMFallbackChain>;
  let mockRequest: LLMRequest;
  let mockResponse: LLMResponse;

  beforeEach(() => {
    mockConfig = loadVibeConfig();
    // Override to a small limit for testing
    mockConfig.rateLimits.llm.requestsPerMinute = 3;

    mockResponse = {
      content: 'test response',
      usage: {
        inputTokens: 10,
        outputTokens: 5,
        cachedTokens: 0,
        totalTokens: 15,
      },
      model: 'test-model',
      finishReason: 'stop',
      latencyMs: 100,
      cached: false,
      providerId: 'test',
    };

    mockFallbackChain = {
      providers: [],
      complete: jest.fn().mockResolvedValue(mockResponse),
      stream: jest.fn().mockReturnValue(
        (async function* () {
          yield { delta: 'hello', finishReason: 'stop' } as LLMStreamChunk;
        })(),
      ),
      addProvider: jest.fn(),
      removeProvider: jest.fn(),
      getActiveProvider: jest.fn().mockReturnValue(null),
    };

    mockRequest = {
      messages: [{ role: 'user', content: 'hello' }],
      model: 'test-model',
      maxTokens: 100,
    };

    limiter = new LLMRateLimiter(mockConfig, mockFallbackChain);
  });

  it('should allow requests within limit', async () => {
    const result = await limiter.complete(mockRequest);
    expect(result).toBe(mockResponse);
    expect(mockFallbackChain.complete).toHaveBeenCalledWith(mockRequest);
  });

  it('should track request count', async () => {
    expect(limiter.getRequestCount()).toBe(0);
    await limiter.complete(mockRequest);
    expect(limiter.getRequestCount()).toBe(1);
    await limiter.complete(mockRequest);
    expect(limiter.getRequestCount()).toBe(2);
  });

  it('should throw when rate limit exceeded', async () => {
    await limiter.complete(mockRequest);
    await limiter.complete(mockRequest);
    await limiter.complete(mockRequest);
    await expect(limiter.complete(mockRequest)).rejects.toThrow(
      RateLimitExceededError,
    );
  });

  it('should report remaining requests', async () => {
    expect(limiter.getRemainingRequests()).toBe(3);
    await limiter.complete(mockRequest);
    expect(limiter.getRemainingRequests()).toBe(2);
  });

  it('should rate limit stream requests too', async () => {
    await limiter.complete(mockRequest);
    await limiter.complete(mockRequest);
    await limiter.complete(mockRequest);
    expect(() => {
      // stream is a generator, it throws synchronously on checkRateLimit
      const iter = limiter.stream(mockRequest);
      // Need to call next() to trigger the generator body
      (iter as AsyncGenerator).next();
    }).toThrow(RateLimitExceededError);
  });

  it('should delegate stream to fallback chain', async () => {
    const chunks: LLMStreamChunk[] = [];
    for await (const chunk of limiter.stream(mockRequest)) {
      chunks.push(chunk);
    }
    expect(chunks).toHaveLength(1);
    expect(chunks[0].delta).toBe('hello');
  });

  it('should allow requests after window expires', async () => {
    // Fill up the limit
    await limiter.complete(mockRequest);
    await limiter.complete(mockRequest);
    await limiter.complete(mockRequest);

    // Manually expire timestamps by accessing private field
    const timestamps = (limiter as any).requestTimestamps;
    const pastTime = Date.now() - 61_000;
    timestamps[0] = pastTime;
    timestamps[1] = pastTime;
    timestamps[2] = pastTime;

    // Should now allow
    const result = await limiter.complete(mockRequest);
    expect(result).toBe(mockResponse);
  });
});
