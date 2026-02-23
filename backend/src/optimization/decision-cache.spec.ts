import { DecisionCache } from './decision-cache';
import { AgentOutput } from '../agents/protocol';
import { loadVibeConfig } from '../config/vibe-config';

describe('DecisionCache', () => {
  let cache: DecisionCache;
  let mockCacheProvider: Record<string, jest.Mock>;

  const mockOutput: AgentOutput = {
    taskId: 't1',
    agentId: 'coder',
    status: 'success',
    artifacts: [{ type: 'file', path: 'test.ts', content: 'code' }],
    contextUpdates: [],
    metrics: {
      startedAt: new Date(),
      durationMs: 100,
      tokensUsed: 50,
      costUSD: 0.001,
      llmCalls: 1,
      retries: 0,
    },
    traceId: 'trace-1',
  };

  beforeEach(() => {
    mockCacheProvider = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    cache = new DecisionCache(mockCacheProvider as any, loadVibeConfig());
  });

  describe('buildKey', () => {
    it('should generate deterministic hash-based key', () => {
      const k1 = cache.buildKey('coder', 'code-generation', 'abc');
      const k2 = cache.buildKey('coder', 'code-generation', 'abc');
      expect(k1).toBe(k2);
      expect(k1).toMatch(/^decision:/);
    });

    it('should generate different keys for different inputs', () => {
      const k1 = cache.buildKey('coder', 'code-generation', 'abc');
      const k2 = cache.buildKey('reviewer', 'code-review', 'abc');
      expect(k1).not.toBe(k2);
    });
  });

  describe('computeContextHash', () => {
    it('should hash context deterministically', () => {
      const h1 = cache.computeContextHash({ data: 'test' });
      const h2 = cache.computeContextHash({ data: 'test' });
      expect(h1).toBe(h2);
    });
  });

  describe('getCachedDecision', () => {
    it('should return null on cache miss', async () => {
      const result = await cache.getCachedDecision('key');
      expect(result).toBeNull();
    });

    it('should return cached output on hit', async () => {
      mockCacheProvider.get.mockResolvedValue(mockOutput);
      const result = await cache.getCachedDecision('key');
      expect(result).toEqual(mockOutput);
    });
  });

  describe('cacheDecision', () => {
    it('should store decision with default TTL', async () => {
      await cache.cacheDecision('key', mockOutput);
      expect(mockCacheProvider.set).toHaveBeenCalledWith(
        'key',
        mockOutput,
        expect.any(Number),
      );
    });

    it('should store decision with custom TTL', async () => {
      await cache.cacheDecision('key', mockOutput, 5000);
      expect(mockCacheProvider.set).toHaveBeenCalledWith(
        'key',
        mockOutput,
        5000,
      );
    });
  });

  describe('invalidate', () => {
    it('should delete cached decision', async () => {
      await cache.invalidate('key');
      expect(mockCacheProvider.delete).toHaveBeenCalledWith('key');
    });
  });
});
