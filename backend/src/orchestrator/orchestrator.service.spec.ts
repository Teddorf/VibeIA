import { OrchestratorService } from './orchestrator.service';
import { TraceContext } from '../observability/trace';

describe('OrchestratorService', () => {
  let service: OrchestratorService;
  let mockPlanner: { createPlan: jest.Mock };
  let mockScheduler: {
    dispatch: jest.Mock;
    onNodeComplete: jest.Mock;
    onNodeFail: jest.Mock;
  };
  let mockResultEvaluator: { evaluate: jest.Mock };
  let mockEventsGateway: {
    emitExecutionEvent: jest.Mock;
    emitWorkerStatusUpdate: jest.Mock;
  };
  let mockPlanRepo: Record<string, jest.Mock>;

  beforeEach(() => {
    mockPlanner = {
      createPlan: jest.fn().mockResolvedValue({
        _id: 'plan-1',
        projectId: 'proj-1',
        intent: 'test',
        dag: [{ nodeId: 'n1', agentId: 'coder' }],
        estimatedCost: 0.01,
        status: 'pending_approval',
      }),
    };

    mockScheduler = {
      dispatch: jest.fn().mockResolvedValue(1),
      onNodeComplete: jest
        .fn()
        .mockResolvedValue({ newlyDispatched: 0, planComplete: true }),
      onNodeFail: jest.fn().mockResolvedValue(undefined),
    };

    mockResultEvaluator = {
      evaluate: jest
        .fn()
        .mockResolvedValue({ passed: true, issues: [], requiresReview: false }),
    };

    mockEventsGateway = {
      emitExecutionEvent: jest.fn(),
      emitWorkerStatusUpdate: jest.fn(),
    };

    mockPlanRepo = {
      findById: jest.fn().mockResolvedValue({
        _id: 'plan-1',
        dag: [
          {
            nodeId: 'n1',
            agentId: 'coder',
            taskDefinition: { id: 't1', type: 'code-generation' },
          },
        ],
        status: 'pending_approval',
      }),
      update: jest.fn().mockResolvedValue(null),
    };

    const mockDecisionCache = {
      getCachedDecision: jest.fn().mockResolvedValue(null),
      cacheDecision: jest.fn().mockResolvedValue(undefined),
      buildKey: jest.fn().mockReturnValue('key'),
      computeContextHash: jest.fn().mockReturnValue('hash'),
    };

    const mockCostTracker = {
      checkBudget: jest.fn().mockResolvedValue({
        allowed: true,
        remaining: 10,
        currentSpend: 0,
        budgetLimit: 10,
      }),
      trackCost: jest.fn().mockResolvedValue(undefined),
      getCostForProject: jest.fn().mockResolvedValue({
        totalCostUSD: 0,
        totalTokensUsed: 0,
        executionCount: 0,
        byAgent: {},
      }),
    };

    const mockPromptCompiler = {
      compileSystemPrompt: jest.fn().mockReturnValue('system prompt'),
      registerModule: jest.fn(),
      getModuleCount: jest.fn().mockReturnValue(0),
    };

    service = new OrchestratorService(
      mockPlanner as any,
      mockScheduler as any,
      mockResultEvaluator as any,
      new TraceContext(),
      mockEventsGateway as any,
      mockDecisionCache as any,
      mockCostTracker as any,
      mockPromptCompiler as any,
      mockPlanRepo as any,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('executeIntent', () => {
    it('should create a plan and emit event', async () => {
      const plan = await service.executeIntent('Build API', 'proj-1', {
        apiKey: 'key',
      });

      expect(mockPlanner.createPlan).toHaveBeenCalledWith(
        'Build API',
        'proj-1',
        { apiKey: 'key' },
      );
      expect(plan.dag).toHaveLength(1);
      expect(mockEventsGateway.emitExecutionEvent).toHaveBeenCalled();
    });
  });

  describe('approvePlan', () => {
    it('should approve and start execution', async () => {
      const plan = await service.approvePlan('plan-1');
      expect(mockPlanRepo.update).toHaveBeenCalledWith(
        'plan-1',
        expect.objectContaining({ status: 'approved' }),
      );
      expect(mockScheduler.dispatch).toHaveBeenCalled();
    });

    it('should throw if plan not found', async () => {
      mockPlanRepo.findById.mockResolvedValue(null);
      await expect(service.approvePlan('bad')).rejects.toThrow('not found');
    });
  });

  describe('handleAgentComplete', () => {
    it('should evaluate and complete node', async () => {
      const output = {
        taskId: 't1',
        agentId: 'coder',
        status: 'success' as const,
        artifacts: [],
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

      await service.handleAgentComplete('plan-1', 'n1', output);
      expect(mockResultEvaluator.evaluate).toHaveBeenCalled();
      expect(mockScheduler.onNodeComplete).toHaveBeenCalled();
    });
  });

  describe('cancelPlan', () => {
    it('should cancel the plan', async () => {
      await service.cancelPlan('plan-1');
      expect(mockPlanRepo.update).toHaveBeenCalledWith('plan-1', {
        status: 'cancelled',
      });
    });
  });
});
