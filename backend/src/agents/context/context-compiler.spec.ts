import { Test, TestingModule } from '@nestjs/testing';
import { ContextCompiler } from './context-compiler';
import { AGENT_CONTEXT_REPOSITORY } from '../../providers/repository-tokens';
import { CACHE_PROVIDER } from '../../providers/tokens';
import { TaskDefinition } from '../protocol';

describe('ContextCompiler', () => {
  let compiler: ContextCompiler;
  let mockRepo: Record<string, jest.Mock>;
  let mockCache: Record<string, jest.Mock>;

  const makeEntry = (scope: string, tags: string[], tokenCount: number) => ({
    _id: `id-${Math.random().toString(36).slice(2)}`,
    projectId: 'p1',
    type: 'code',
    scope,
    tags,
    content: { data: 'x'.repeat(tokenCount * 4) },
    tokenCount,
    createdBy: 'test',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn().mockResolvedValue([]),
    };
    mockCache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextCompiler,
        { provide: AGENT_CONTEXT_REPOSITORY, useValue: mockRepo },
        { provide: CACHE_PROVIDER, useValue: mockCache },
      ],
    }).compile();

    compiler = module.get(ContextCompiler);
  });

  const task: TaskDefinition = {
    id: 'task-1',
    type: 'code-generation',
    description: 'Generate code',
    tags: ['auth'],
    dependencies: [],
    priority: 1,
    timeoutMs: 30000,
  };

  it('should be defined', () => {
    expect(compiler).toBeDefined();
  });

  describe('compile', () => {
    it('should return cached context if available', async () => {
      const cached = {
        entries: [],
        tokenBudget: 4096,
        tokenCount: 0,
        compiledAt: new Date(),
        cacheKey: 'ctx:agent:task-1:pipe-1',
        scope: 'global',
      };
      mockCache.get.mockResolvedValue(cached);

      const result = await compiler.compile('agent', task, 'pipe-1');
      expect(result).toEqual(cached);
      expect(mockRepo.find).not.toHaveBeenCalled();
    });

    it('should compile context with priority ordering', async () => {
      const taskEntry = makeEntry('task', ['auth'], 100);
      const domainEntry = makeEntry('domain', ['auth'], 200);
      const globalEntry = makeEntry('global', [], 150);

      mockRepo.find
        .mockResolvedValueOnce([taskEntry]) // task scope
        .mockResolvedValueOnce([domainEntry]) // domain scope
        .mockResolvedValueOnce([globalEntry]); // global scope

      const result = await compiler.compile('coder', task, 'pipe-1');

      expect(result.entries).toHaveLength(3);
      expect(result.tokenCount).toBe(450);
      expect(result.scope).toBe('task');
    });

    it('should trim entries to token budget', async () => {
      const entries = [
        makeEntry('task', ['auth'], 3000),
        makeEntry('task', ['auth'], 2000), // exceeds 4096 budget
      ];

      mockRepo.find
        .mockResolvedValueOnce(entries)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await compiler.compile('coder', task, 'pipe-1', 4096);
      expect(result.entries).toHaveLength(1);
      expect(result.tokenCount).toBe(3000);
    });

    it('should cache compiled context', async () => {
      mockRepo.find.mockResolvedValue([]);

      await compiler.compile('coder', task, 'pipe-1');
      expect(mockCache.set).toHaveBeenCalledWith(
        'ctx:coder:task-1:pipe-1',
        expect.any(Object),
        expect.any(Number),
      );
    });
  });

  describe('estimateTokens', () => {
    it('should estimate tokens based on character count', () => {
      const text = 'a'.repeat(400);
      expect(compiler.estimateTokens(text)).toBe(100);
    });

    it('should round up token estimates', () => {
      const text = 'a'.repeat(5);
      expect(compiler.estimateTokens(text)).toBe(2);
    });
  });
});
