import { AgentJobRunner } from './agent-job-runner';

describe('AgentJobRunner', () => {
  let runner: AgentJobRunner;
  let mockQueueProvider: any;
  let mockAgentRegistry: any;
  let mockContextCompiler: any;
  let mockOrchestratorService: any;
  let mockExecutionRepo: any;
  let mockWorkerPoolManager: any;
  let mockQueue: any;
  let registeredHandler: ((job: any) => Promise<void>) | null;

  const mockAgent = {
    profile: { id: 'coder', name: 'Coder', role: 'coder', capabilities: [] },
    execute: jest.fn(),
    validateInput: jest.fn(),
    estimateCost: jest.fn(),
    canHandle: jest.fn(),
  };

  const mockContext = {
    entries: [],
    tokenBudget: 4000,
    tokenCount: 0,
    compiledAt: new Date(),
    cacheKey: 'ctx:coder:t1:pipe-1',
    scope: { global: [], domainSpecific: [], taskSpecific: [] },
  };

  const mockJobData = {
    taskId: 't1',
    pipelineId: 'pipe-1',
    projectId: 'proj-1',
    agentId: 'coder',
    taskDefinition: {
      id: 't1',
      type: 'code-generation',
      description: 'Write hello world',
      tags: ['backend'],
      dependencies: [],
      priority: 1,
      timeoutMs: 60000,
    },
    contextKeys: ['backend'],
    previousOutputIds: [],
    configOverrides: {},
    traceId: 'trace-1',
  };

  beforeEach(() => {
    registeredHandler = null;

    mockQueue = {
      add: jest.fn(),
      process: jest.fn((handler: any) => {
        registeredHandler = handler;
      }),
      getWaiting: jest.fn().mockResolvedValue([]),
      getActive: jest.fn().mockResolvedValue([]),
      setConcurrency: jest.fn(),
    };

    mockQueueProvider = {
      getQueue: jest.fn().mockReturnValue(mockQueue),
    };

    mockAgentRegistry = {
      getRegisteredIds: jest.fn().mockReturnValue(['coder', 'reviewer']),
      get: jest.fn().mockReturnValue(mockAgent),
    };

    mockContextCompiler = {
      compile: jest.fn().mockResolvedValue(mockContext),
    };

    mockOrchestratorService = {
      handleAgentComplete: jest.fn().mockResolvedValue(undefined),
      handleAgentFail: jest.fn().mockResolvedValue(undefined),
    };

    mockExecutionRepo = {
      create: jest.fn().mockResolvedValue({
        _id: 'exec-1',
        metrics: { startedAt: new Date() },
      }),
      update: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };

    mockWorkerPoolManager = {
      setupAgentQueue: jest.fn().mockResolvedValue(undefined),
    };

    runner = new AgentJobRunner(
      mockQueueProvider,
      mockAgentRegistry,
      mockContextCompiler,
      mockOrchestratorService,
      mockExecutionRepo,
      mockWorkerPoolManager,
    );
  });

  describe('onModuleInit', () => {
    it('should register handlers for all agents', async () => {
      await runner.onModuleInit();

      expect(mockWorkerPoolManager.setupAgentQueue).toHaveBeenCalledTimes(2);
      expect(mockWorkerPoolManager.setupAgentQueue).toHaveBeenCalledWith(
        'coder',
      );
      expect(mockWorkerPoolManager.setupAgentQueue).toHaveBeenCalledWith(
        'reviewer',
      );

      expect(mockQueueProvider.getQueue).toHaveBeenCalledWith('agent:coder');
      expect(mockQueueProvider.getQueue).toHaveBeenCalledWith('agent:reviewer');

      expect(mockQueue.process).toHaveBeenCalledTimes(2);
    });
  });

  describe('processJob (via handler)', () => {
    const successOutput = {
      taskId: 't1',
      agentId: 'coder',
      status: 'success' as const,
      artifacts: [{ type: 'code', path: 'index.ts', content: 'hello' }],
      contextUpdates: [],
      metrics: {
        startedAt: new Date(),
        durationMs: 150,
        tokensUsed: 200,
        costUSD: 0.002,
        llmCalls: 1,
        retries: 0,
      },
      traceId: 'trace-1',
    };

    beforeEach(async () => {
      await runner.onModuleInit();
      mockAgent.execute.mockReset();
    });

    it('should call agent.execute() with correct AgentInput', async () => {
      mockAgent.execute.mockResolvedValue(successOutput);

      await registeredHandler!({
        id: 'job-1',
        data: mockJobData,
        attempts: 0,
        createdAt: new Date(),
      });

      expect(mockAgentRegistry.get).toHaveBeenCalledWith('coder');
      expect(mockContextCompiler.compile).toHaveBeenCalledWith(
        'coder',
        mockJobData.taskDefinition,
        'pipe-1',
      );
      expect(mockAgent.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          taskDefinition: mockJobData.taskDefinition,
          context: mockContext,
          previousOutputs: [],
          config: {},
          traceId: 'trace-1',
        }),
      );
    });

    it('should persist AgentExecution record on start', async () => {
      mockAgent.execute.mockResolvedValue(successOutput);

      await registeredHandler!({
        id: 'job-1',
        data: mockJobData,
        attempts: 0,
        createdAt: new Date(),
      });

      expect(mockExecutionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          pipelineId: 'pipe-1',
          taskId: 't1',
          agentId: 'coder',
          traceId: 'trace-1',
          status: 'running',
        }),
      );
    });

    it('should call handleAgentComplete on success', async () => {
      mockAgent.execute.mockResolvedValue(successOutput);

      await registeredHandler!({
        id: 'job-1',
        data: mockJobData,
        attempts: 0,
        createdAt: new Date(),
      });

      expect(mockOrchestratorService.handleAgentComplete).toHaveBeenCalledWith(
        'pipe-1',
        't1',
        successOutput,
      );
      expect(mockExecutionRepo.update).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({ status: 'completed' }),
      );
    });

    it('should call handleAgentFail on error', async () => {
      mockAgent.execute.mockRejectedValue(new Error('LLM timeout'));

      await registeredHandler!({
        id: 'job-1',
        data: mockJobData,
        attempts: 0,
        createdAt: new Date(),
      });

      expect(mockOrchestratorService.handleAgentFail).toHaveBeenCalledWith(
        'pipe-1',
        't1',
        'LLM timeout',
      );
      expect(mockExecutionRepo.update).toHaveBeenCalledWith(
        'exec-1',
        expect.objectContaining({
          status: 'failed',
          errorDetails: expect.objectContaining({ message: 'LLM timeout' }),
        }),
      );
    });

    it('should update execution with duration and metrics on success', async () => {
      mockAgent.execute.mockResolvedValue(successOutput);

      await registeredHandler!({
        id: 'job-1',
        data: mockJobData,
        attempts: 0,
        createdAt: new Date(),
      });

      const updateCall = mockExecutionRepo.update.mock.calls[0];
      expect(updateCall[1].metrics).toBeDefined();
      expect(updateCall[1].metrics.durationMs).toBeGreaterThanOrEqual(0);
      expect(updateCall[1].metrics.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('fetchPreviousOutputs', () => {
    it('should return empty array when no previousOutputIds', async () => {
      await runner.onModuleInit();
      mockAgent.execute.mockResolvedValue({
        taskId: 't1',
        agentId: 'coder',
        status: 'success',
        artifacts: [],
        contextUpdates: [],
        metrics: {
          startedAt: new Date(),
          durationMs: 0,
          tokensUsed: 0,
          costUSD: 0,
          llmCalls: 0,
          retries: 0,
        },
        traceId: 'trace-1',
      });

      await registeredHandler!({
        id: 'job-1',
        data: { ...mockJobData, previousOutputIds: [] },
        attempts: 0,
        createdAt: new Date(),
      });

      // find should not be called for previous outputs when array is empty
      expect(mockExecutionRepo.find).not.toHaveBeenCalled();
    });

    it('should fetch previous outputs from execution repo', async () => {
      const prevOutput = {
        taskId: 't0',
        agentId: 'analyst',
        status: 'completed',
        output: {
          taskId: 't0',
          agentId: 'analyst',
          status: 'success',
          artifacts: [],
          contextUpdates: [],
          metrics: {},
          traceId: 'trace-0',
        },
      };
      mockExecutionRepo.find.mockResolvedValue([prevOutput]);
      mockAgent.execute.mockResolvedValue({
        taskId: 't1',
        agentId: 'coder',
        status: 'success',
        artifacts: [],
        contextUpdates: [],
        metrics: {
          startedAt: new Date(),
          durationMs: 0,
          tokensUsed: 0,
          costUSD: 0,
          llmCalls: 0,
          retries: 0,
        },
        traceId: 'trace-1',
      });

      await runner.onModuleInit();

      await registeredHandler!({
        id: 'job-1',
        data: { ...mockJobData, previousOutputIds: ['t0'] },
        attempts: 0,
        createdAt: new Date(),
      });

      expect(mockExecutionRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          pipelineId: 'pipe-1',
          status: 'completed',
        }),
      );
    });
  });
});
