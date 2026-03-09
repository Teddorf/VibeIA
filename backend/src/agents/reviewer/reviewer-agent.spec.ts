import { ReviewerAgent } from './reviewer-agent';
import { AgentInput } from '../protocol';

describe('ReviewerAgent', () => {
  let agent: ReviewerAgent;
  let mockLlmAdapters: any[];
  let mockQualityGates: any;

  beforeEach(() => {
    mockLlmAdapters = [];
    mockQualityGates = {
      runAllChecks: jest.fn().mockResolvedValue({
        passed: true,
        overallScore: 95,
        checks: [],
        blockers: [],
      }),
      generateReport: jest.fn().mockReturnValue('Quality Report: PASSED'),
    };

    agent = new ReviewerAgent(mockLlmAdapters, mockQualityGates);
  });

  const makeInput = (overrides: Partial<AgentInput> = {}): AgentInput => ({
    taskDefinition: {
      id: 'task-review',
      type: 'code-review',
      description: 'Review auth code',
      tags: ['code-review', 'quality'],
      dependencies: [],
      priority: 1,
      timeoutMs: 60000,
    },
    context: {
      entries: [],
      tokenBudget: 4096,
      tokenCount: 0,
      compiledAt: new Date(),
      cacheKey: 'k',
      scope: { global: [], domainSpecific: [], taskSpecific: [] },
    },
    previousOutputs: [
      {
        taskId: 'task-code',
        agentId: 'coder',
        status: 'success',
        artifacts: [
          {
            type: 'file',
            path: 'src/auth.ts',
            content: 'export class Auth {}',
          },
        ],
        contextUpdates: [],
        metrics: {
          startedAt: new Date(),
          durationMs: 100,
          tokensUsed: 0,
          costUSD: 0,
          llmCalls: 0,
          retries: 0,
        },
        traceId: 'trace-1',
      },
    ],
    config: {},
    traceId: 'trace-1',
    ...overrides,
  });

  it('should have correct profile', () => {
    expect(agent.profile.id).toBe('reviewer');
    expect(agent.profile.tags).toContain('code-review');
  });

  it('should run quality gates on previous output code', async () => {
    const output = await agent.execute(makeInput());
    expect(output.status).toBe('success');
    expect(mockQualityGates.runAllChecks).toHaveBeenCalledWith(
      [{ path: 'src/auth.ts', content: 'export class Auth {}' }],
      { skipTests: true },
    );
  });

  it('should handle no code artifacts gracefully', async () => {
    const output = await agent.execute(makeInput({ previousOutputs: [] }));
    expect(output.status).toBe('success');
    expect(output.artifacts[0].content).toContain('No code artifacts');
  });

  it('should produce review context update', async () => {
    const output = await agent.execute(makeInput());
    expect(output.contextUpdates.length).toBeGreaterThan(0);
    expect(output.contextUpdates[0].entry?.type).toBe('review');
  });

  it('should handle quality gate failures', async () => {
    mockQualityGates.runAllChecks.mockResolvedValue({
      passed: false,
      overallScore: 40,
      checks: [],
      blockers: [{ file: 'test.ts', message: 'Error' }],
    });

    const output = await agent.execute(makeInput());
    expect(output.status).toBe('success');
    expect(output.artifacts[0].type).toBe('review-report');
  });
});
