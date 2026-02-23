import { Test, TestingModule } from '@nestjs/testing';
import { ContextStoreService } from './context-store.service';
import { AGENT_CONTEXT_REPOSITORY } from '../../providers/repository-tokens';

describe('ContextStoreService', () => {
  let service: ContextStoreService;
  let mockRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextStoreService,
        { provide: AGENT_CONTEXT_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();

    service = module.get(ContextStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a context entry', async () => {
      const entry = {
        projectId: 'p1',
        type: 'code',
        scope: 'task',
        content: { file: 'test.ts' },
        createdBy: 'coder',
        tags: [],
      };
      mockRepo.create.mockResolvedValue({ ...entry, _id: 'id-1' });

      const result = await service.create(entry);
      expect(mockRepo.create).toHaveBeenCalledWith(entry);
      expect(result).toHaveProperty('_id');
    });
  });

  describe('findByProjectAndTags', () => {
    it('should find entries by project and tags', async () => {
      mockRepo.find.mockResolvedValue([{ projectId: 'p1', tags: ['auth'] }]);

      const result = await service.findByProjectAndTags('p1', ['auth']);
      expect(mockRepo.find).toHaveBeenCalledWith({
        projectId: 'p1',
        tags: { $in: ['auth'] },
        supersededBy: { $exists: false },
      });
      expect(result).toHaveLength(1);
    });

    it('should filter by scope when provided', async () => {
      mockRepo.find.mockResolvedValue([]);

      await service.findByProjectAndTags('p1', ['auth'], 'task');
      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ scope: 'task' }),
      );
    });
  });

  describe('findByProjectAndType', () => {
    it('should find entries by type', async () => {
      mockRepo.find.mockResolvedValue([]);

      await service.findByProjectAndType('p1', 'architecture');
      expect(mockRepo.find).toHaveBeenCalledWith({
        projectId: 'p1',
        type: 'architecture',
        supersededBy: { $exists: false },
      });
    });
  });

  describe('invalidateByPipeline', () => {
    it('should mark entries as superseded', async () => {
      mockRepo.updateMany.mockResolvedValue({ modifiedCount: 5 });

      const count = await service.invalidateByPipeline('pipe-1');
      expect(count).toBe(5);
      expect(mockRepo.updateMany).toHaveBeenCalledWith(
        { pipelineId: 'pipe-1', supersededBy: { $exists: false } },
        { supersededBy: 'invalidated' },
      );
    });
  });
});
