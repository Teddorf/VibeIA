import { LLMFallbackChainAdapter } from './llm-fallback-chain.adapter';
import {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
} from '../interfaces/llm-provider.interface';

function createMockProvider(
  name: string,
  overrides: Partial<ILLMProvider> = {},
): ILLMProvider {
  return {
    name,
    generateText: jest.fn(),
    generateJSON: jest.fn(),
    validateApiKey: jest.fn(),
    estimateCost: jest.fn(),
    complete: jest.fn(),
    stream: jest.fn(),
    listModels: jest.fn().mockReturnValue([]),
    getModelPricing: jest.fn(),
    supportsCapability: jest.fn(),
    ...overrides,
  } as ILLMProvider;
}

function makeRequest(): LLMRequest {
  return {
    messages: [{ role: 'user', content: 'hello' }],
    model: 'test-model',
    maxTokens: 100,
  };
}

function makeResponse(content = 'ok'): LLMResponse {
  return {
    content,
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
}

describe('LLMFallbackChainAdapter', () => {
  let adapter: LLMFallbackChainAdapter;

  describe('complete()', () => {
    it('should return response from first provider', async () => {
      const provider1 = createMockProvider('p1', {
        complete: jest.fn().mockResolvedValue(makeResponse('from-p1')),
      });
      const provider2 = createMockProvider('p2', {
        complete: jest.fn().mockResolvedValue(makeResponse('from-p2')),
      });

      adapter = new (LLMFallbackChainAdapter as any)([provider1, provider2]);
      (adapter as any)._providers = [provider1, provider2];

      const result = await adapter.complete(makeRequest());
      expect(result.content).toBe('from-p1');
      expect(provider2.complete).not.toHaveBeenCalled();
    });

    it('should fall back to second provider if first throws', async () => {
      const provider1 = createMockProvider('p1', {
        complete: jest.fn().mockRejectedValue(new Error('p1 failed')),
      });
      const provider2 = createMockProvider('p2', {
        complete: jest.fn().mockResolvedValue(makeResponse('from-p2')),
      });

      adapter = new (LLMFallbackChainAdapter as any)([provider1, provider2]);
      (adapter as any)._providers = [provider1, provider2];

      const result = await adapter.complete(makeRequest());
      expect(result.content).toBe('from-p2');
    });

    it('should throw if all providers fail', async () => {
      const provider1 = createMockProvider('p1', {
        complete: jest.fn().mockRejectedValue(new Error('p1 failed')),
      });
      const provider2 = createMockProvider('p2', {
        complete: jest.fn().mockRejectedValue(new Error('p2 failed')),
      });

      adapter = new (LLMFallbackChainAdapter as any)([provider1, provider2]);
      (adapter as any)._providers = [provider1, provider2];

      await expect(adapter.complete(makeRequest())).rejects.toThrow(
        'p2 failed',
      );
    });
  });

  describe('stream()', () => {
    it('should yield chunks from first provider', async () => {
      async function* fakeStream(): AsyncGenerator<LLMStreamChunk> {
        yield { delta: 'hello' };
        yield { delta: ' world', finishReason: 'stop' };
      }

      const provider1 = createMockProvider('p1', {
        stream: jest.fn().mockReturnValue(fakeStream()),
      });

      adapter = new (LLMFallbackChainAdapter as any)([provider1]);
      (adapter as any)._providers = [provider1];

      const chunks: LLMStreamChunk[] = [];
      for await (const chunk of adapter.stream(makeRequest())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(2);
      expect(chunks[0].delta).toBe('hello');
      expect(chunks[1].delta).toBe(' world');
    });

    it('should fall back to second provider if first throws', async () => {
      const provider1 = createMockProvider('p1', {
        stream: jest.fn().mockImplementation(() => {
          throw new Error('p1 stream failed');
        }),
      });

      async function* fakeStream(): AsyncGenerator<LLMStreamChunk> {
        yield { delta: 'fallback' };
      }

      const provider2 = createMockProvider('p2', {
        stream: jest.fn().mockReturnValue(fakeStream()),
      });

      adapter = new (LLMFallbackChainAdapter as any)([provider1, provider2]);
      (adapter as any)._providers = [provider1, provider2];

      const chunks: LLMStreamChunk[] = [];
      for await (const chunk of adapter.stream(makeRequest())) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(1);
      expect(chunks[0].delta).toBe('fallback');
    });
  });

  describe('addProvider()', () => {
    it('should add a provider', () => {
      const provider1 = createMockProvider('p1');
      adapter = new (LLMFallbackChainAdapter as any)([provider1]);
      (adapter as any)._providers = [provider1];

      const provider2 = createMockProvider('p2');
      adapter.addProvider(provider2);

      expect(adapter.providers).toHaveLength(2);
      expect(adapter.providers[1].name).toBe('p2');
    });
  });

  describe('removeProvider()', () => {
    it('should remove a provider by name', () => {
      const provider1 = createMockProvider('p1');
      const provider2 = createMockProvider('p2');
      adapter = new (LLMFallbackChainAdapter as any)([provider1, provider2]);
      (adapter as any)._providers = [provider1, provider2];

      adapter.removeProvider('p1');

      expect(adapter.providers).toHaveLength(1);
      expect(adapter.providers[0].name).toBe('p2');
    });
  });

  describe('getActiveProvider()', () => {
    it('should return first provider', () => {
      const provider1 = createMockProvider('p1');
      adapter = new (LLMFallbackChainAdapter as any)([provider1]);
      (adapter as any)._providers = [provider1];

      expect(adapter.getActiveProvider()).toBe(provider1);
    });

    it('should return null if no providers', () => {
      adapter = new (LLMFallbackChainAdapter as any)([]);
      (adapter as any)._providers = [];

      expect(adapter.getActiveProvider()).toBeNull();
    });
  });
});
