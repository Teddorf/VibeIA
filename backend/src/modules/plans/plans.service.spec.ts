import { Test, TestingModule } from '@nestjs/testing';
import { PlansService } from './plans.service';
import { Plan } from '../../schemas/plan.schema';
import { LlmService } from '../llm/llm.service';
import { UsersService } from '../users/users.service';
import { ProjectsService } from '../projects/projects.service';
import { BadRequestException } from '@nestjs/common';
import { PLAN_REPOSITORY } from '../../providers/repository-tokens';
import { IRepository } from '../../providers/interfaces/database-provider.interface';

describe('PlansService', () => {
  let service: PlansService;
  let llmService: LlmService;
  let mockPlanRepo: jest.Mocked<IRepository<Plan>>;

  const mockLlmResponse = {
    plan: {
      phases: [
        {
          name: 'Phase 1',
          tasks: [
            {
              id: 't1',
              name: 'Setup Database',
              description: 'Configure MongoDB',
              estimatedTime: 10,
              dependencies: [],
              status: 'pending',
            },
          ],
          estimatedTime: 60,
          status: 'pending',
        },
      ],
      estimatedTime: 60,
    },
    provider: 'anthropic',
    tokensUsed: 1000,
    cost: 0.003,
  };

  const mockPlan = {
    _id: 'plan123',
    projectId: 'proj123',
    userId: 'user123',
    wizardData: {
      stage1: { projectName: 'Test', description: 'Test Desc' },
      stage2: {},
      stage3: { selectedArchetypes: [] },
    },
    phases: mockLlmResponse.plan.phases,
    estimatedTime: 120,
    status: 'pending',
  };

  const mockUsersService = {
    hasLLMConfigured: jest.fn(),
    getActiveLLMApiKeys: jest.fn(),
    getLLMPreferences: jest.fn(),
  };

  const mockProjectsService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    mockPlanRepo = {
      findById: jest.fn().mockResolvedValue(mockPlan),
      findOne: jest.fn().mockResolvedValue(mockPlan),
      find: jest.fn().mockResolvedValue([mockPlan]),
      create: jest.fn().mockResolvedValue(mockPlan),
      update: jest
        .fn()
        .mockResolvedValue({ ...mockPlan, status: 'in_progress' }),
      delete: jest.fn().mockResolvedValue(true),
      findOneAndUpdate: jest.fn().mockResolvedValue(mockPlan),
      findOneAndDelete: jest.fn().mockResolvedValue(mockPlan),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      count: jest.fn().mockResolvedValue(0),
      insertMany: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: PLAN_REPOSITORY,
          useValue: mockPlanRepo,
        },
        {
          provide: LlmService,
          useValue: {
            generatePlan: jest.fn().mockResolvedValue(mockLlmResponse),
          },
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);
    llmService = module.get<LlmService>(LlmService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all plans for a user', async () => {
      const result = await service.findAll('user123');

      expect(mockPlanRepo.find).toHaveBeenCalledWith(
        { userId: 'user123' },
        { sort: { createdAt: -1 } },
      );
      expect(result).toEqual([mockPlan]);
    });

    it('should filter by projectId when provided', async () => {
      const result = await service.findAll('user123', 'proj123');

      expect(mockPlanRepo.find).toHaveBeenCalledWith(
        { userId: 'user123', projectId: 'proj123' },
        { sort: { createdAt: -1 } },
      );
      expect(result).toEqual([mockPlan]);
    });
  });

  describe('findOne', () => {
    it('should return a plan by id without userId check (internal)', async () => {
      const result = await service.findOne('plan123');

      expect(mockPlanRepo.findById).toHaveBeenCalledWith('plan123');
      expect(result).toEqual(mockPlan);
    });

    it('should return a plan by id if userId matches', async () => {
      const result = await service.findOne('plan123', 'user123');
      expect(result).toEqual(mockPlan);
    });

    it('should throw BadRequestException if userId does not match', async () => {
      const otherUserPlan = { ...mockPlan, userId: 'otherUser' };
      mockPlanRepo.findById.mockResolvedValue(otherUserPlan as any);

      await expect(service.findOne('plan123', 'user123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should update plan status if user owns plan', async () => {
      mockPlanRepo.findById.mockResolvedValue(mockPlan as any);

      const result = await service.updateStatus(
        'plan123',
        'in_progress',
        'user123',
      );

      expect(mockPlanRepo.update).toHaveBeenCalledWith('plan123', {
        status: 'in_progress',
      });
      expect(result!.status).toBe('in_progress');
    });

    it('should fail to update status if user does not own plan', async () => {
      const otherUserPlan = { ...mockPlan, userId: 'otherUser' };
      mockPlanRepo.findById.mockResolvedValue(otherUserPlan as any);

      await expect(
        service.updateStatus('plan123', 'in_progress', 'user123'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
