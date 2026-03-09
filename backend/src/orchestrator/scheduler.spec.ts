import { Scheduler } from './scheduler';
import { QUEUE_PROVIDER } from '../providers/tokens';
import { EXECUTION_PLAN_REPOSITORY } from '../providers/repository-tokens';

describe('Scheduler', () => {
  let scheduler: Scheduler;
  let mockPlanRepo: Record<string, jest.Mock>;
  let mockQueueProvider: { getQueue: jest.Mock };
  let mockQueue: { add: jest.Mock };
  let mockVcs: Record<string, jest.Mock>;

  const makePlan = (dag: any[]) => ({
    _id: 'plan-1',
    projectId: 'proj-1',
    intent: 'test',
    dag,
    errorLog: [],
    status: 'approved',
  });

  beforeEach(() => {
    mockQueue = { add: jest.fn().mockResolvedValue({ id: 'job-1' }) };
    mockQueueProvider = {
      getQueue: jest.fn().mockReturnValue(mockQueue),
    };
    mockPlanRepo = {
      findById: jest.fn(),
      update: jest.fn().mockResolvedValue(null),
      getReadyNodes: jest.fn().mockResolvedValue([]),
    };

    mockVcs = {
      createBranch: jest.fn().mockResolvedValue(undefined),
      checkout: jest.fn().mockResolvedValue(undefined),
      clone: jest.fn().mockResolvedValue(undefined),
      commit: jest.fn().mockResolvedValue('abc123'),
      push: jest.fn().mockResolvedValue(undefined),
      pull: jest.fn().mockResolvedValue(undefined),
      getStatus: jest.fn().mockResolvedValue({ modified: [], untracked: [] }),
      mergeBranch: jest.fn().mockResolvedValue(undefined),
    };

    scheduler = new Scheduler(
      mockQueueProvider as any,
      mockPlanRepo as any,
      mockVcs as any,
    );
  });

  describe('dispatch', () => {
    it('should dispatch nodes with no pending dependencies', async () => {
      const plan = makePlan([
        {
          nodeId: 'n1',
          agentId: 'coder',
          taskDefinition: { id: 't1', tags: ['code'] },
          dependencies: [],
          status: 'pending',
        },
        {
          nodeId: 'n2',
          agentId: 'reviewer',
          taskDefinition: { id: 't2', tags: ['review'] },
          dependencies: ['n1'],
          status: 'pending',
        },
      ]);
      mockPlanRepo.findById.mockResolvedValue(plan);
      mockPlanRepo.getReadyNodes.mockResolvedValue([
        { nodeId: 'n1', agentId: 'coder' },
      ]);

      const count = await scheduler.dispatch('plan-1', 'trace-1');
      expect(count).toBe(1);
      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(plan.dag[0].status).toBe('queued');
    });

    it('should attempt VCS branch creation', async () => {
      const plan = makePlan([
        {
          nodeId: 'n1',
          agentId: 'coder',
          taskDefinition: { id: 't1', tags: ['code'] },
          dependencies: [],
          status: 'pending',
        },
      ]);
      mockPlanRepo.findById.mockResolvedValue(plan);
      mockPlanRepo.getReadyNodes.mockResolvedValue([
        { nodeId: 'n1', agentId: 'coder' },
      ]);

      await scheduler.dispatch('plan-1', 'trace-1');
      expect(mockVcs.createBranch).toHaveBeenCalledWith(
        '.',
        'vibe/pipeline-plan-1',
      );
      expect(mockVcs.checkout).toHaveBeenCalledWith(
        '.',
        'vibe/pipeline-plan-1',
      );
    });

    it('should gracefully handle VCS errors', async () => {
      mockVcs.createBranch.mockRejectedValue(new Error('No repo'));
      const plan = makePlan([
        {
          nodeId: 'n1',
          agentId: 'coder',
          taskDefinition: { id: 't1', tags: ['code'] },
          dependencies: [],
          status: 'pending',
        },
      ]);
      mockPlanRepo.findById.mockResolvedValue(plan);
      mockPlanRepo.getReadyNodes.mockResolvedValue([
        { nodeId: 'n1', agentId: 'coder' },
      ]);

      const count = await scheduler.dispatch('plan-1', 'trace-1');
      expect(count).toBe(1); // should still dispatch successfully
    });

    it('should throw when plan not found', async () => {
      mockPlanRepo.findById.mockResolvedValue(null);
      await expect(scheduler.dispatch('bad', 'trace')).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('onNodeComplete', () => {
    it('should mark node completed and dispatch dependents', async () => {
      const plan = makePlan([
        {
          nodeId: 'n1',
          agentId: 'coder',
          taskDefinition: { id: 't1', tags: [] },
          dependencies: [],
          status: 'running',
        },
        {
          nodeId: 'n2',
          agentId: 'reviewer',
          taskDefinition: { id: 't2', tags: [] },
          dependencies: ['n1'],
          status: 'pending',
        },
      ]);
      mockPlanRepo.findById.mockResolvedValue(plan);
      mockPlanRepo.getReadyNodes.mockResolvedValue([
        { nodeId: 'n2', agentId: 'reviewer' },
      ]);

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

      const result = await scheduler.onNodeComplete('plan-1', 'n1', output);
      expect(plan.dag[0].status).toBe('completed');
      expect(result.planComplete).toBe(false);
      expect(result.newlyDispatched).toBe(1);
    });

    it('should mark plan completed when all nodes done', async () => {
      const plan = makePlan([
        {
          nodeId: 'n1',
          agentId: 'coder',
          taskDefinition: { id: 't1', tags: [] },
          dependencies: [],
          status: 'running',
        },
      ]);
      mockPlanRepo.findById.mockResolvedValue(plan);

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

      const result = await scheduler.onNodeComplete('plan-1', 'n1', output);
      expect(result.planComplete).toBe(true);
    });
  });

  describe('onNodeFail', () => {
    it('should mark node failed and skip dependents', async () => {
      const plan = makePlan([
        {
          nodeId: 'n1',
          agentId: 'coder',
          taskDefinition: { id: 't1', tags: [] },
          dependencies: [],
          status: 'running',
        },
        {
          nodeId: 'n2',
          agentId: 'reviewer',
          taskDefinition: { id: 't2', tags: [] },
          dependencies: ['n1'],
          status: 'pending',
        },
        {
          nodeId: 'n3',
          agentId: 'tester',
          taskDefinition: { id: 't3', tags: [] },
          dependencies: ['n2'],
          status: 'pending',
        },
      ]);
      mockPlanRepo.findById.mockResolvedValue(plan);

      await scheduler.onNodeFail('plan-1', 'n1', 'LLM timeout');
      expect(plan.dag[0].status).toBe('failed');
      expect(plan.dag[1].status).toBe('skipped');
      expect(plan.dag[2].status).toBe('skipped');
    });
  });
});
