import { Test, TestingModule } from '@nestjs/testing';
import { Planner } from './planner';
import { ModelRouter } from './model-router';
import { AgentRegistry } from '../agents/registry/agent-registry';
import { LLM_PROVIDER, VIBE_CONFIG } from '../providers/tokens';
import { EXECUTION_PLAN_REPOSITORY } from '../providers/repository-tokens';
import { loadVibeConfig } from '../config/vibe-config';

describe('Planner', () => {
  let planner: Planner;
  let mockPlanRepo: Record<string, jest.Mock>;
  let mockRegistry: Partial<AgentRegistry>;
  let mockLlmAdapters: any[];

  beforeEach(async () => {
    mockPlanRepo = {
      create: jest.fn().mockImplementation((data) => ({
        ...data,
        _id: 'plan-1',
      })),
    };

    mockRegistry = {
      canHandle: jest.fn().mockReturnValue([
        {
          profile: { id: 'coder' },
          estimateCost: jest.fn().mockReturnValue({
            estimatedCostUSD: 0.01,
          }),
        },
      ]),
    };

    mockLlmAdapters = [];

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Planner,
        { provide: ModelRouter, useValue: { resolve: jest.fn() } },
        { provide: AgentRegistry, useValue: mockRegistry },
        { provide: LLM_PROVIDER, useValue: mockLlmAdapters },
        { provide: EXECUTION_PLAN_REPOSITORY, useValue: mockPlanRepo },
        { provide: VIBE_CONFIG, useValue: loadVibeConfig() },
      ],
    }).compile();

    planner = module.get(Planner);
  });

  it('should be defined', () => {
    expect(planner).toBeDefined();
  });

  describe('createPlan', () => {
    it('should create a plan with deterministic fallback', async () => {
      const plan = await planner.createPlan(
        'Build a REST API with authentication',
        'project-1',
        { apiKey: 'test-key' },
      );

      expect(mockPlanRepo.create).toHaveBeenCalled();
      expect(plan.projectId).toBe('project-1');
      expect(plan.dag.length).toBeGreaterThan(0);
      expect(plan.status).toBe('pending_approval');
    });

    it('should parse bug-fix intents correctly', async () => {
      const plan = await planner.createPlan('Fix the login bug', 'project-1', {
        apiKey: 'test-key',
      });

      const createdData = mockPlanRepo.create.mock.calls[0][0];
      expect(createdData.parsedIntent.taskType).toBe('bug-fix');
    });

    it('should parse deployment intents correctly', async () => {
      const plan = await planner.createPlan(
        'Deploy the application',
        'project-1',
        { apiKey: 'test-key' },
      );

      const createdData = mockPlanRepo.create.mock.calls[0][0];
      expect(createdData.parsedIntent.taskType).toBe('deployment');
    });

    it('should estimate cost across all nodes', async () => {
      const plan = await planner.createPlan('Build an API', 'project-1', {
        apiKey: 'key',
      });

      expect(plan.estimatedCost).toBeGreaterThan(0);
    });

    it('should build DAG with dependencies', async () => {
      const plan = await planner.createPlan(
        'Complete application with tests and docs',
        'project-1',
        { apiKey: 'key' },
      );

      const createdData = mockPlanRepo.create.mock.calls[0][0];
      const reviewNode = createdData.dag.find(
        (n: any) => n.taskDefinition.type === 'code-review',
      );
      if (reviewNode) {
        expect(reviewNode.dependencies).toContain('task-code');
      }
    });
  });
});
