import { AnalystAgent } from './analyst-agent';

describe('AnalystAgent', () => {
  let agent: AnalystAgent;
  let mockLlm: { generateJSON: jest.Mock; generateText: jest.Mock };

  const baseInput = {
    taskDefinition: {
      id: 'task-1',
      type: 'analysis' as const,
      description: 'Build an e-commerce platform',
      tags: ['analysis'],
      dependencies: [],
      priority: 1,
      timeoutMs: 30000,
    },
    context: {
      entries: [],
      tokenBudget: 4000,
      tokenCount: 0,
      compiledAt: new Date(),
      scope: 'global' as const,
    },
    previousOutputs: [],
    config: {
      deterministicOnly: false,
      retryPolicy: { maxRetries: 0, backoffMs: 0, backoffMultiplier: 1 },
      timeoutMs: 30000,
    },
    traceId: 'trace-1',
  };

  beforeEach(() => {
    mockLlm = {
      generateJSON: jest.fn().mockResolvedValue({
        data: {
          intent: 'Build e-commerce',
          taskType: 'analysis',
          complexity: 'high',
          features: ['cart', 'checkout'],
          requiredAgents: ['coder', 'reviewer'],
          taskBreakdown: [
            {
              name: 'Cart',
              description: 'Build cart',
              type: 'code-generation',
            },
          ],
        },
        tokensUsed: 200,
        cost: 0.002,
      }),
      generateText: jest.fn(),
    };
    agent = new AnalystAgent([mockLlm] as any);
  });

  it('should have correct profile', () => {
    expect(agent.profile.id).toBe('analyst');
    expect(agent.profile.role).toBe('analyst');
  });

  it('should use deterministic analysis for known patterns', async () => {
    const result = await agent.execute(baseInput as any);
    // e-commerce triggers deterministic path
    expect(result.status).toBe('success');
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(mockLlm.generateJSON).not.toHaveBeenCalled();
  });

  it('should use LLM for unknown patterns', async () => {
    const input = {
      ...baseInput,
      taskDefinition: {
        ...baseInput.taskDefinition,
        description: 'Build a quantum computing simulator',
      },
    };
    const result = await agent.execute(input as any);
    expect(result.status).toBe('success');
    expect(mockLlm.generateJSON).toHaveBeenCalled();
  });

  it('should handle deterministic-only mode', async () => {
    const input = {
      ...baseInput,
      taskDefinition: {
        ...baseInput.taskDefinition,
        description: 'Some unknown task',
      },
      config: { ...baseInput.config, deterministicOnly: true },
    };
    const result = await agent.execute(input as any);
    expect(result.status).toBe('success');
    expect(mockLlm.generateJSON).not.toHaveBeenCalled();
  });

  it('should handle LLM failure gracefully', async () => {
    mockLlm.generateJSON.mockRejectedValue(new Error('LLM timeout'));
    const input = {
      ...baseInput,
      taskDefinition: {
        ...baseInput.taskDefinition,
        description: 'Unknown task requiring LLM',
      },
    };
    const result = await agent.execute(input as any);
    expect(result.status).toBe('failure');
  });

  it('should handle canHandle for analysis tags', () => {
    expect(agent.canHandle({ tags: ['analysis'] } as any)).toBe(true);
    expect(agent.canHandle({ tags: ['deployment'] } as any)).toBe(false);
  });
});
