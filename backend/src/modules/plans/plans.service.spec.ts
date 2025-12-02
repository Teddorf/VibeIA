import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlansService } from './plans.service';
import { Plan, PlanDocument } from '../../schemas/plan.schema';
import { LlmService } from '../llm/llm.service';
import { CreatePlanDto } from './dto/create-plan.dto';

describe('PlansService', () =\u003e {
  let service: PlansService;
  let planModel: Model\u003cPlanDocument\u003e;
  let llmService: LlmService;

  const mockPlan = {
    _id: 'plan123',
    projectId: 'proj123',
    userId: 'user123',
    wizardData: {
      stage1: { projectName: 'Test', description: 'Test Desc' },
      stage2: {},
      stage3: { selectedArchetypes: [] },
    },
    phases: [],
    estimatedTime: 120,
    status: 'pending',
    save: jest.fn().mockResolvedValue(this),
  };

  const mockLlmResponse = {
    plan: {
      phases: [{ name: 'Phase 1', tasks: [], estimatedTime: 60 }],
      estimatedTime: 60,
    },
    provider: 'anthropic',
    tokensUsed: 1000,
    cost: 0.003,
  };

  beforeEach(async () =\u003e {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        {
          provide: getModelToken(Plan.name),
          useValue: {
            new: jest.fn().mockResolvedValue(mockPlan),
            constructor: jest.fn().mockResolvedValue(mockPlan),
            find: jest.fn(),
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
        {
          provide: LlmService,
          useValue: {
            generatePlan: jest.fn().mockResolvedValue(mockLlmResponse),
          },
        },
      ],
    }).compile();

    service = module.get\u003cPlansService\u003e(PlansService);
    planModel = module.get\u003cModel\u003cPlanDocument\u003e\u003e(getModelToken(Plan.name));
    llmService = module.get\u003cLlmService\u003e(LlmService);
  });

  describe('generatePlan', () =\u003e {
    it('should generate and save a plan', async () =\u003e {
      const createPlanDto: CreatePlanDto = {
        projectId: 'proj123',
        userId: 'user123',
        wizardData: {
          stage1: { projectName: 'Test', description: 'Desc' },
          stage2: {},
          stage3: { selectedArchetypes: ['auth-jwt'] },
        },
      };

      const saveSpy = jest.fn().mockResolvedValue(mockPlan);
      jest.spyOn(planModel, 'prototype' as any).mockImplementation(() =\u003e ({
        save: saveSpy,
      }));

      await service.generatePlan(createPlanDto);

      expect(llmService.generatePlan).toHaveBeenCalledWith(createPlanDto.wizardData);
    });
  });

  describe('findAll', () =\u003e {
    it('should return all plans for a user', async () =\u003e {
      const mockPlans = [mockPlan, mockPlan];
      jest.spyOn(planModel, 'find').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPlans),
      } as any);

      const result = await service.findAll('user123');

      expect(planModel.find).toHaveBeenCalledWith({ userId: 'user123' });
      expect(result).toEqual(mockPlans);
    });
  });

  describe('findOne', () =\u003e {
    it('should return a plan by id', async () =\u003e {
      jest.spyOn(planModel, 'findById').mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockPlan),
      } as any);

      const result = await service.findOne('plan123');

      expect(planModel.findById).toHaveBeenCalledWith('plan123');
      expect(result).toEqual(mockPlan);
    });
  });

  describe('updateStatus', () =\u003e {
    it('should update plan status', async () =\u003e {
      const updatedPlan = { ...mockPlan, status: 'in_progress' };
      jest.spyOn(planModel, 'findByIdAndUpdate').mockReturnValue({
        exec: jest.fn().mockResolvedValue(updatedPlan),
      } as any);

      const result = await service.updateStatus('plan123', 'in_progress');

      expect(planModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'plan123',
        { status: 'in_progress' },
        { new: true }
      );
      expect(result.status).toBe('in_progress');
    });
  });
});
