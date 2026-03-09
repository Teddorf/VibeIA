import { DocAgent } from './doc-agent';

describe('DocAgent', () => {
  let agent: DocAgent;
  let mockLlm: { generateJSON: jest.Mock; generateText: jest.Mock };

  const baseInput = {
    taskDefinition: {
      id: 'task-1',
      type: 'documentation' as const,
      description: 'Generate API documentation',
      tags: ['documentation'],
      dependencies: [],
      priority: 1,
      timeoutMs: 30000,
    },
    context: {
      entries: [],
      tokenBudget: 4000,
      tokenCount: 0,
      compiledAt: new Date(),
      scope: { global: [], domainSpecific: [], taskSpecific: [] },
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
          files: [
            {
              path: 'README.md',
              content: '# Project\nDocs here',
              type: 'readme',
            },
            { path: 'docs/api.md', content: '# API\nEndpoints', type: 'api' },
          ],
        },
        tokensUsed: 100,
        cost: 0.0005,
      }),
      generateText: jest.fn(),
    };
    agent = new DocAgent([mockLlm] as any);
  });

  it('should have correct profile', () => {
    expect(agent.profile.id).toBe('doc');
    expect(agent.profile.defaultModelTier).toBe('fast');
  });

  it('should generate docs via LLM', async () => {
    const result = await agent.execute(baseInput as any);
    expect(result.status).toBe('success');
    expect(result.artifacts.length).toBe(2);
    expect(mockLlm.generateJSON).toHaveBeenCalled();
  });

  it('should use template in deterministicOnly mode', async () => {
    const input = {
      ...baseInput,
      config: { ...baseInput.config, deterministicOnly: true },
    };
    const result = await agent.execute(input as any);
    expect(result.status).toBe('success');
    expect(result.artifacts[0].path).toBe('README.md');
    expect(mockLlm.generateJSON).not.toHaveBeenCalled();
  });

  it('should handle LLM failure', async () => {
    mockLlm.generateJSON.mockRejectedValue(new Error('API error'));
    const result = await agent.execute(baseInput as any);
    expect(result.status).toBe('failure');
  });

  it('should handle canHandle for documentation tags', () => {
    expect(agent.canHandle({ tags: ['documentation'] } as any)).toBe(true);
    expect(agent.canHandle({ tags: ['testing'] } as any)).toBe(false);
  });
});
