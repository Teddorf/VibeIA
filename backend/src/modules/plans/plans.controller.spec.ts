import { Test, TestingModule } from '@nestjs/testing';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';

describe('PlansController', () => {
  let controller: PlansController;
  let service: PlansService;

  const mockPlan = {
    _id: 'plan123',
    projectId: 'proj123',
    userId: 'user123',
    phases: [],
    estimatedTime: 120,
    status: 'pending',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlansController],
      providers: [
        {
          provide: PlansService,
          useValue: {
            generatePlan: jest.fn().mockResolvedValue(mockPlan),
            findAll: jest.fn().mockResolvedValue([mockPlan]),
            findOne: jest.fn().mockResolvedValue(mockPlan),
            updateStatus: jest.fn().mockResolvedValue({ ...mockPlan, status: 'completed' }),
          },
        },
      ],
    }).compile();

    controller = module.get<PlansController>(PlansController);
    service = module.get<PlansService>(PlansService);
  });

  describe('generate', () => {
    it('should generate a new plan', async () => {
      const createPlanDto: CreatePlanDto = {
        projectId: 'proj123',
        userId: 'user123',
        wizardData: {
          stage1: { projectName: 'Test', description: 'Desc' },
          stage2: {},
          stage3: { selectedArchetypes: [] },
        },
      };

      const result = await controller.generate(createPlanDto);

      expect(service.generatePlan).toHaveBeenCalledWith(createPlanDto);
      expect(result).toEqual(mockPlan);
    });
  });

  describe('findAll', () => {
    it('should return all plans for a user', async () => {
      const result = await controller.findAll('user123');

      expect(service.findAll).toHaveBeenCalledWith('user123');
      expect(result).toEqual([mockPlan]);
    });
  });

  describe('findOne', () => {
    it('should return a plan by id', async () => {
      const result = await controller.findOne('plan123');

      expect(service.findOne).toHaveBeenCalledWith('plan123');
      expect(result).toEqual(mockPlan);
    });
  });

  describe('updateStatus', () => {
    it('should update plan status', async () => {
      const result = await controller.updateStatus('plan123', 'completed');

      expect(service.updateStatus).toHaveBeenCalledWith('plan123', 'completed');
      expect(result.status).toBe('completed');
    });
  });
});