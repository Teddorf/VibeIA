import { ResultEvaluator } from './result-evaluator';
import { AgentOutput, TaskDefinition } from '../agents/protocol';
import { loadVibeConfig } from '../config/vibe-config';

describe('ResultEvaluator', () => {
  let evaluator: ResultEvaluator;
  let mockQualityGates: { runAllChecks: jest.Mock };

  beforeEach(() => {
    mockQualityGates = {
      runAllChecks: jest.fn().mockResolvedValue({
        passed: true,
        overallScore: 95,
        checks: [],
        blockers: [],
      }),
    };
    evaluator = new ResultEvaluator(mockQualityGates as any, loadVibeConfig());
  });

  const makeOutput = (overrides: Partial<AgentOutput> = {}): AgentOutput => ({
    taskId: 't1',
    agentId: 'coder',
    status: 'success',
    artifacts: [{ type: 'file', path: 'src/test.ts', content: 'const x = 1;' }],
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
    ...overrides,
  });

  const makeTask = (
    overrides: Partial<TaskDefinition> = {},
  ): TaskDefinition => ({
    id: 't1',
    type: 'code-generation',
    description: 'test',
    tags: [],
    dependencies: [],
    priority: 1,
    timeoutMs: 30000,
    ...overrides,
  });

  it('should pass when quality gates pass', async () => {
    const result = await evaluator.evaluate(makeOutput(), makeTask());
    expect(result.passed).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it('should fail when agent output status is failure', async () => {
    const result = await evaluator.evaluate(
      makeOutput({ status: 'failure' }),
      makeTask(),
    );
    expect(result.passed).toBe(false);
    expect(result.issues).toContain('Agent execution failed');
  });

  it('should fail when no artifacts produced', async () => {
    const result = await evaluator.evaluate(
      makeOutput({ artifacts: [] }),
      makeTask(),
    );
    expect(result.passed).toBe(false);
  });

  it('should report quality gate blockers', async () => {
    mockQualityGates.runAllChecks.mockResolvedValue({
      passed: false,
      overallScore: 40,
      checks: [],
      blockers: [
        {
          file: 'test.ts',
          line: 5,
          message: 'Security issue',
          severity: 'error',
        },
      ],
    });

    const result = await evaluator.evaluate(makeOutput(), makeTask());
    expect(result.passed).toBe(false);
    expect(result.issues[0]).toContain('Security issue');
  });

  it('should flag code-generation tasks as requiring review', async () => {
    const result = await evaluator.evaluate(
      makeOutput(),
      makeTask({ type: 'code-generation' }),
    );
    expect(result.requiresReview).toBe(true);
  });

  it('should not flag deployment tasks as requiring review', async () => {
    const result = await evaluator.evaluate(
      makeOutput(),
      makeTask({ type: 'deployment' }),
    );
    expect(result.requiresReview).toBe(false);
  });
});
