import { AgentContextRepositoryAdapter } from './agent-context-repository.adapter';

describe('AgentContextRepositoryAdapter', () => {
  let adapter: AgentContextRepositoryAdapter;
  let mockModel: any;

  beforeEach(() => {
    mockModel = {
      find: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
      countDocuments: jest.fn(),
      insertMany: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOneAndDelete: jest.fn(),
    };
    adapter = new AgentContextRepositoryAdapter(mockModel);
  });

  describe('findByProjectAndTags', () => {
    it('should call find with projectId and tags $in query', async () => {
      const expected = [{ projectId: 'p1', tags: ['auth'] }];
      jest.spyOn(adapter, 'find').mockResolvedValue(expected as any);

      const result = await adapter.findByProjectAndTags('p1', ['auth', 'api']);
      expect(result).toEqual(expected);
      expect(adapter.find).toHaveBeenCalledWith({
        projectId: 'p1',
        tags: { $in: ['auth', 'api'] },
      });
    });
  });

  describe('findByProjectAndType', () => {
    it('should call find with projectId and type', async () => {
      const expected = [{ projectId: 'p1', type: 'code' }];
      jest.spyOn(adapter, 'find').mockResolvedValue(expected as any);

      const result = await adapter.findByProjectAndType('p1', 'code');
      expect(result).toEqual(expected);
      expect(adapter.find).toHaveBeenCalledWith({
        projectId: 'p1',
        type: 'code',
      });
    });
  });

  describe('invalidateByPipeline', () => {
    it('should call updateMany to set supersededBy', async () => {
      jest.spyOn(adapter, 'updateMany').mockResolvedValue({ modifiedCount: 3 });

      const result = await adapter.invalidateByPipeline('pipe1');
      expect(result).toEqual({ modifiedCount: 3 });
      expect(adapter.updateMany).toHaveBeenCalledWith(
        { pipelineId: 'pipe1' },
        { $set: { supersededBy: 'invalidated' } },
      );
    });
  });

  describe('compileForAgent', () => {
    it('should compile entries within token budget', async () => {
      const entries = [
        {
          projectId: 'p1',
          type: 'code',
          scope: 'global',
          tokenCount: 100,
          tags: [],
        },
        {
          projectId: 'p1',
          type: 'requirement',
          scope: 'domain',
          tokenCount: 200,
          tags: [],
        },
        {
          projectId: 'p1',
          type: 'test',
          scope: 'task',
          tokenCount: 300,
          tags: [],
        },
        {
          projectId: 'p1',
          type: 'architecture',
          scope: 'global',
          tokenCount: 500,
          tags: [],
        },
      ];
      jest.spyOn(adapter, 'find').mockResolvedValue(entries as any);

      const result = await adapter.compileForAgent('p1', 'coder', 600);

      expect(result.tokenCount).toBe(600);
      expect(result.entries).toHaveLength(3);
      expect(result.tokenBudget).toBe(600);
      expect(result.scope.global).toHaveLength(1);
      expect(result.scope.domainSpecific).toHaveLength(1);
      expect(result.scope.taskSpecific).toHaveLength(1);
      expect(result.cacheKey).toContain('p1:coder:');
    });

    it('should return empty compiled context when no entries', async () => {
      jest.spyOn(adapter, 'find').mockResolvedValue([]);

      const result = await adapter.compileForAgent('p1', 'coder', 1000);
      expect(result.tokenCount).toBe(0);
      expect(result.entries).toHaveLength(0);
    });

    it('should stop adding entries when budget is exceeded', async () => {
      const entries = [
        {
          projectId: 'p1',
          type: 'code',
          scope: 'global',
          tokenCount: 100,
          tags: [],
        },
        {
          projectId: 'p1',
          type: 'code',
          scope: 'global',
          tokenCount: 200,
          tags: [],
        },
      ];
      jest.spyOn(adapter, 'find').mockResolvedValue(entries as any);

      const result = await adapter.compileForAgent('p1', 'coder', 150);
      expect(result.entries).toHaveLength(1);
      expect(result.tokenCount).toBe(100);
    });
  });
});
