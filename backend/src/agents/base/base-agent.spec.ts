import { BaseAgent } from './base-agent';
import {
  AgentProfile,
  AgentInput,
  AgentOutput,
  TaskDefinition,
  CompiledContext,
} from '../protocol';

class TestAgent extends BaseAgent {
  readonly profile: AgentProfile = {
    id: 'test-agent',
    name: 'Test Agent',
    role: 'tester',
    capabilities: ['testing'],
    defaultModelTier: 'balanced',
    maxConcurrentTasks: 2,
    tags: ['test', 'validation'],
  };

  async execute(input: AgentInput): Promise<AgentOutput> {
    const metrics = this.startMetrics();
    return this.buildSuccessOutput(
      input,
      [{ type: 'result', content: 'done' }],
      metrics,
    );
  }
}

describe('BaseAgent', () => {
  let agent: TestAgent;

  beforeEach(() => {
    agent = new TestAgent();
  });

  const makeInput = (overrides: Partial<AgentInput> = {}): AgentInput => ({
    taskDefinition: {
      id: 'task-1',
      type: 'code-generation',
      description: 'Test task',
      tags: ['test'],
      dependencies: [],
      priority: 1,
      timeoutMs: 30000,
    },
    context: {
      entries: [],
      tokenBudget: 4096,
      tokenCount: 100,
      compiledAt: new Date(),
      cacheKey: 'key',
      scope: 'task',
    },
    previousOutputs: [],
    config: {},
    traceId: 'trace-1',
    ...overrides,
  });

  describe('validateInput', () => {
    it('should return no errors for valid input', () => {
      const errors = agent.validateInput(makeInput());
      expect(errors).toEqual([]);
    });

    it('should return error for missing taskDefinition', () => {
      const errors = agent.validateInput(
        makeInput({ taskDefinition: undefined as any }),
      );
      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'MISSING_TASK_DEFINITION' }),
      );
    });

    it('should return error for missing traceId', () => {
      const errors = agent.validateInput(makeInput({ traceId: '' }));
      expect(errors).toContainEqual(
        expect.objectContaining({ code: 'MISSING_TRACE_ID' }),
      );
    });
  });

  describe('estimateCost', () => {
    it('should return a cost estimate', () => {
      const task: TaskDefinition = {
        id: 't1',
        type: 'testing',
        description: 'A test task',
        tags: ['test'],
        dependencies: [],
        priority: 1,
        timeoutMs: 30000,
      };
      const ctx: CompiledContext = {
        entries: [],
        tokenBudget: 4096,
        tokenCount: 200,
        compiledAt: new Date(),
        cacheKey: 'k',
        scope: 'task',
      };

      const estimate = agent.estimateCost(task, ctx);
      expect(estimate.estimatedInputTokens).toBeGreaterThan(0);
      expect(estimate.estimatedOutputTokens).toBeGreaterThan(0);
      expect(estimate.estimatedCostUSD).toBeGreaterThan(0);
      expect(estimate.modelTier).toBe('balanced');
    });
  });

  describe('canHandle', () => {
    it('should return true when task tags overlap with agent tags', () => {
      const task: TaskDefinition = {
        id: 't1',
        type: 'testing',
        description: 'test',
        tags: ['test'],
        dependencies: [],
        priority: 1,
        timeoutMs: 30000,
      };
      expect(agent.canHandle(task)).toBe(true);
    });

    it('should return false when no tag overlap', () => {
      const task: TaskDefinition = {
        id: 't1',
        type: 'deployment',
        description: 'deploy',
        tags: ['deploy'],
        dependencies: [],
        priority: 1,
        timeoutMs: 30000,
      };
      expect(agent.canHandle(task)).toBe(false);
    });
  });

  describe('execute', () => {
    it('should return success output with metrics', async () => {
      const output = await agent.execute(makeInput());
      expect(output.status).toBe('success');
      expect(output.agentId).toBe('test-agent');
      expect(output.traceId).toBe('trace-1');
      expect(output.metrics.durationMs).toBeGreaterThanOrEqual(0);
      expect(output.metrics.completedAt).toBeInstanceOf(Date);
    });
  });
});
