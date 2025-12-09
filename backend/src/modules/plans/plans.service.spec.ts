import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PlansService } from './plans.service';
import { Plan } from '../../schemas/plan.schema';
import { LlmService } from '../llm/llm.service';
import { CreatePlanDto } from './dto/create-plan.dto';

import { UsersService } from '../users/users.service';
import { ProjectsService } from '../projects/projects.service';
import { BadRequestException } from '@nestjs/common';

describe('PlansService', () => {
  let service: PlansService;
  let llmService: LlmService;

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
              status: 'pending'
            }
          ],
          estimatedTime: 60,
          status: 'pending'
        }
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

  const mockPlanModel = {
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockPlan]),
      }),
    }),
    findById: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockPlan),
    }),
    findByIdAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ ...mockPlan, status: 'in_progress' }),
    }),
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
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: getModelToken(Plan.name),
          useValue: mockPlanModel,
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

      expect(mockPlanModel.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(result).toEqual([mockPlan]);
    });

    it('should filter by projectId when provided', async () => {
      const result = await service.findAll('user123', 'proj123');

      expect(mockPlanModel.find).toHaveBeenCalledWith({ userId: 'user123', projectId: 'proj123' });
      expect(result).toEqual([mockPlan]);
    });
  });

  describe('findOne', () => {
    it('should return a plan by id without userId check (internal)', async () => {
      const result = await service.findOne('plan123');

      expect(mockPlanModel.findById).toHaveBeenCalledWith('plan123');
      expect(result).toEqual(mockPlan);
    });

    it('should return a plan by id if userId matches', async () => {
      const result = await service.findOne('plan123', 'user123');
      expect(result).toEqual(mockPlan);
    });

    it('should throw BadRequestException if userId does not match', async () => {
      const otherUserPlan = { ...mockPlan, userId: 'otherUser' };
      // Create a fresh mock context to avoid side effects
      mockPlanModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(otherUserPlan),
      });

      await expect(service.findOne('plan123', 'user123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should update plan status if user owns plan', async () => {
      // Reset standard mock for success case
      mockPlanModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPlan),
      });

      const result = await service.updateStatus('plan123', 'in_progress', 'user123');

      expect(mockPlanModel.findByIdAndUpdate).toHaveBeenCalled();
      expect(result.status).toBe('in_progress');
    });

    it('should fail to update status if user does not own plan', async () => {
      const otherUserPlan = { ...mockPlan, userId: 'otherUser' };
      mockPlanModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(otherUserPlan),
      });

      await expect(service.updateStatus('plan123', 'in_progress', 'user123')).rejects.toThrow(BadRequestException);
    });
  });
});