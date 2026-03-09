import {
  AgentProfile,
  AgentInput,
  AgentOutput,
  TaskDefinition,
  CompiledContext,
  AgentConfiguration,
  AgentJobData,
  CostEstimate,
  ValidationError,
  ContextUpdate,
  ExecutionMetrics,
  DAGNode,
  ParsedIntent,
  IAgent,
  ModelTier,
  TaskType,
  NodeStatus,
  PlanStatus,
  ContextType,
  ContextScope,
  ContextUpdateOperation,
  ModelPricing,
} from './protocol';

describe('Agent Protocol Types', () => {
  describe('AgentProfile', () => {
    it('should create a valid agent profile', () => {
      const profile: AgentProfile = {
        id: 'coder-agent',
        name: 'Coder',
        role: 'coder',
        capabilities: ['code-generation', 'refactoring'],
        defaultModelTier: 'balanced',
        maxConcurrentTasks: 3,
        tags: ['code-generation', 'implementation'],
      };

      expect(profile.id).toBe('coder-agent');
      expect(profile.capabilities).toContain('code-generation');
      expect(profile.defaultModelTier).toBe('balanced');
    });
  });

  describe('TaskDefinition', () => {
    it('should create a valid task definition', () => {
      const task: TaskDefinition = {
        id: 'task-1',
        type: 'code-generation',
        description: 'Implement user auth',
        tags: ['auth', 'backend'],
        dependencies: [],
        priority: 1,
        timeoutMs: 30000,
      };

      expect(task.id).toBe('task-1');
      expect(task.type).toBe('code-generation');
      expect(task.dependencies).toEqual([]);
    });

    it('should support all task types', () => {
      const types: TaskType[] = [
        'code-generation',
        'code-review',
        'testing',
        'documentation',
        'deployment',
        'architecture',
        'analysis',
        'bug-fix',
        'refactor',
      ];
      expect(types).toHaveLength(9);
    });
  });

  describe('CompiledContext', () => {
    it('should create a valid compiled context with structured scope', () => {
      const context: CompiledContext = {
        entries: [],
        tokenBudget: 4096,
        tokenCount: 0,
        compiledAt: new Date(),
        cacheKey: 'ctx-abc123',
        scope: { global: [], domainSpecific: [], taskSpecific: [] },
      };

      expect(context.tokenBudget).toBe(4096);
      expect(context.entries).toEqual([]);
      expect(context.scope.global).toEqual([]);
      expect(context.scope.domainSpecific).toEqual([]);
      expect(context.scope.taskSpecific).toEqual([]);
    });
  });

  describe('AgentInput', () => {
    it('should create valid agent input with all required fields', () => {
      const input: AgentInput = {
        taskDefinition: {
          id: 'task-1',
          type: 'code-generation',
          description: 'Test task',
          tags: [],
          dependencies: [],
          priority: 1,
          timeoutMs: 30000,
        },
        context: {
          entries: [],
          tokenBudget: 4096,
          tokenCount: 0,
          compiledAt: new Date(),
          cacheKey: 'key',
          scope: { global: [], domainSpecific: [], taskSpecific: [] },
        },
        previousOutputs: [],
        config: {},
        traceId: 'trace-123',
      };

      expect(input.traceId).toBe('trace-123');
      expect(input.previousOutputs).toEqual([]);
    });
  });

  describe('AgentOutput', () => {
    it('should create valid agent output', () => {
      const output: AgentOutput = {
        taskId: 'task-1',
        agentId: 'coder',
        status: 'success',
        artifacts: [
          { type: 'file', path: 'src/test.ts', content: 'export const x = 1;' },
        ],
        contextUpdates: [],
        metrics: {
          startedAt: new Date(),
          completedAt: new Date(),
          durationMs: 1500,
          tokensUsed: 500,
          costUSD: 0.002,
          llmCalls: 1,
          retries: 0,
        },
        traceId: 'trace-123',
      };

      expect(output.status).toBe('success');
      expect(output.artifacts).toHaveLength(1);
      expect(output.metrics.tokensUsed).toBe(500);
    });

    it('should support needs-review status', () => {
      const output: AgentOutput = {
        taskId: 'task-1',
        agentId: 'reviewer',
        status: 'needs-review',
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
      };
      expect(output.status).toBe('needs-review');
    });
  });

  describe('AgentConfiguration', () => {
    it('should allow partial configuration', () => {
      const config: AgentConfiguration = {
        modelTierOverride: 'powerful',
        costBudgetUSD: 1.0,
      };

      expect(config.modelTierOverride).toBe('powerful');
      expect(config.timeoutMs).toBeUndefined();
    });

    it('should support retry policy', () => {
      const config: AgentConfiguration = {
        retryPolicy: {
          maxRetries: 3,
          backoffMs: 1000,
          backoffMultiplier: 2,
        },
      };

      expect(config.retryPolicy?.maxRetries).toBe(3);
    });
  });

  describe('AgentJobData', () => {
    it('should create valid job data for queue dispatch', () => {
      const job: AgentJobData = {
        taskId: 'task-1',
        pipelineId: 'pipe-1',
        projectId: 'proj-1',
        agentId: 'coder',
        taskDefinition: {
          id: 'task-1',
          type: 'code-generation',
          description: 'Generate code',
          tags: [],
          dependencies: [],
          priority: 1,
          timeoutMs: 30000,
        },
        contextKeys: ['arch-context', 'code-context'],
        previousOutputIds: [],
        traceId: 'trace-1',
      };

      expect(job.pipelineId).toBe('pipe-1');
      expect(job.contextKeys).toHaveLength(2);
      expect(job.configOverrides).toBeUndefined();
    });

    it('should accept optional configOverrides', () => {
      const job: AgentJobData = {
        taskId: 'task-1',
        pipelineId: 'pipe-1',
        projectId: 'proj-1',
        agentId: 'coder',
        taskDefinition: {
          id: 'task-1',
          type: 'code-generation',
          description: 'Generate code',
          tags: [],
          dependencies: [],
          priority: 1,
          timeoutMs: 30000,
        },
        contextKeys: [],
        previousOutputIds: [],
        configOverrides: { modelTierOverride: 'powerful' },
        traceId: 'trace-1',
      };

      expect(job.configOverrides?.modelTierOverride).toBe('powerful');
    });
  });

  describe('CostEstimate', () => {
    it('should create a valid cost estimate', () => {
      const estimate: CostEstimate = {
        estimatedInputTokens: 2000,
        estimatedOutputTokens: 1000,
        estimatedCachedTokens: 500,
        modelTier: 'balanced',
        modelId: 'claude-sonnet-4-20250514',
        estimatedCostUSD: 0.021,
        confidenceLevel: 'medium',
      };

      expect(estimate.estimatedCostUSD).toBe(0.021);
      expect(estimate.confidenceLevel).toBe('medium');
    });
  });

  describe('DAGNode', () => {
    it('should create valid DAG node', () => {
      const node: DAGNode = {
        nodeId: 'node-1',
        agentId: 'coder',
        taskDefinition: {
          id: 'task-1',
          type: 'code-generation',
          description: 'Generate auth module',
          tags: ['auth'],
          dependencies: [],
          priority: 1,
          timeoutMs: 60000,
        },
        dependencies: [],
        status: 'pending',
      };

      expect(node.status).toBe('pending');
      expect(node.output).toBeUndefined();
    });
  });

  describe('ParsedIntent', () => {
    it('should parse intent correctly', () => {
      const parsed: ParsedIntent = {
        intent: 'Build a REST API with authentication',
        taskType: 'code-generation',
        complexity: 'complex',
        requiredAgents: ['analyst', 'architect', 'coder', 'reviewer', 'tester'],
      };

      expect(parsed.complexity).toBe('complex');
      expect(parsed.requiredAgents).toContain('coder');
    });
  });

  describe('Literal types', () => {
    it('should validate ModelTier values', () => {
      const tiers: ModelTier[] = ['fast', 'balanced', 'powerful'];
      expect(tiers).toHaveLength(3);
    });

    it('should validate NodeStatus values', () => {
      const statuses: NodeStatus[] = [
        'pending',
        'queued',
        'running',
        'completed',
        'failed',
        'skipped',
        'cancelled',
      ];
      expect(statuses).toHaveLength(7);
    });

    it('should validate PlanStatus values', () => {
      const statuses: PlanStatus[] = [
        'draft',
        'pending_approval',
        'approved',
        'executing',
        'completed',
        'failed',
        'cancelled',
      ];
      expect(statuses).toHaveLength(7);
    });

    it('should validate ContextType values', () => {
      const types: ContextType[] = [
        'architecture',
        'code',
        'requirement',
        'review',
        'test',
        'dependency',
        'convention',
        'decision',
      ];
      expect(types).toHaveLength(8);
    });

    it('should validate ContextScope values', () => {
      const scopes: ContextScope[] = ['global', 'domain', 'task'];
      expect(scopes).toHaveLength(3);
    });

    it('should validate ContextUpdateOperation values including supersede', () => {
      const ops: ContextUpdateOperation[] = [
        'add',
        'update',
        'invalidate',
        'supersede',
      ];
      expect(ops).toHaveLength(4);
    });
  });

  describe('ModelPricing', () => {
    it('should use new field names', () => {
      const pricing: ModelPricing = {
        inputPerMillionTokens: 3,
        outputPerMillionTokens: 15,
        cachedInputPerMillionTokens: 1.5,
      };

      expect(pricing.inputPerMillionTokens).toBe(3);
      expect(pricing.outputPerMillionTokens).toBe(15);
      expect(pricing.cachedInputPerMillionTokens).toBe(1.5);
    });

    it('should allow cachedInputPerMillionTokens to be optional', () => {
      const pricing: ModelPricing = {
        inputPerMillionTokens: 10,
        outputPerMillionTokens: 30,
      };

      expect(pricing.cachedInputPerMillionTokens).toBeUndefined();
    });
  });

  describe('IAgent interface', () => {
    it('should be implementable', () => {
      const mockAgent: IAgent = {
        profile: {
          id: 'test',
          name: 'Test Agent',
          role: 'tester',
          capabilities: ['testing'],
          defaultModelTier: 'fast',
          maxConcurrentTasks: 1,
          tags: ['test'],
        },
        execute: jest.fn(),
        validateInput: jest.fn().mockReturnValue(null),
        estimateCost: jest.fn().mockReturnValue({
          estimatedInputTokens: 100,
          estimatedOutputTokens: 50,
          estimatedCachedTokens: 0,
          modelTier: 'fast',
          modelId: 'test',
          estimatedCostUSD: 0.001,
          confidenceLevel: 'low',
        }),
        canHandle: jest.fn().mockReturnValue(true),
      };

      expect(mockAgent.profile.id).toBe('test');
      expect(mockAgent.validateInput({} as AgentInput)).toBeNull();
      expect(mockAgent.canHandle({} as TaskDefinition)).toBe(true);
    });

    it('should accept AgentInput for estimateCost', () => {
      const mockAgent: IAgent = {
        profile: {
          id: 'test',
          name: 'Test',
          role: 'tester',
          capabilities: ['testing'],
          defaultModelTier: 'fast',
          maxConcurrentTasks: 1,
          tags: ['test'],
        },
        execute: jest.fn(),
        validateInput: jest.fn().mockReturnValue(null),
        estimateCost: jest.fn().mockReturnValue({
          estimatedInputTokens: 100,
          estimatedOutputTokens: 50,
          estimatedCachedTokens: 0,
          modelTier: 'fast',
          modelId: 'test',
          estimatedCostUSD: 0.001,
          confidenceLevel: 'low',
        }),
        canHandle: jest.fn().mockReturnValue(true),
      };

      const input: AgentInput = {
        taskDefinition: {
          id: 't1',
          type: 'code-generation',
          description: 'test',
          tags: [],
          dependencies: [],
          priority: 1,
          timeoutMs: 30000,
        },
        context: {
          entries: [],
          tokenBudget: 4096,
          tokenCount: 0,
          compiledAt: new Date(),
          cacheKey: '',
          scope: { global: [], domainSpecific: [], taskSpecific: [] },
        },
        previousOutputs: [],
        config: {},
        traceId: 'trace-1',
      };

      const estimate = mockAgent.estimateCost(input);
      expect(estimate.estimatedCostUSD).toBe(0.001);
    });
  });
});
