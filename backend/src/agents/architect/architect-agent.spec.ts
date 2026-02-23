import { ArchitectAgent } from './architect-agent';

describe('ArchitectAgent', () => {
  let agent: ArchitectAgent;
  let mockLlm: { generateJSON: jest.Mock; generateText: jest.Mock };

  const baseInput = {
    taskDefinition: {
      id: 'task-1',
      type: 'architecture' as const,
      description: 'Design microservice architecture',
      tags: ['architecture'],
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
          components: [
            {
              name: 'API Gateway',
              responsibility: 'Routing',
              techStack: ['NestJS'],
            },
          ],
          decisions: [
            {
              title: 'Use NestJS',
              decision: 'NestJS framework',
              rationale: 'TypeScript',
            },
          ],
          patterns: ['Repository Pattern'],
          diagram: '┌─API─┐──►┌─Service─┐',
        },
        tokensUsed: 300,
        cost: 0.005,
      }),
      generateText: jest.fn(),
    };
    agent = new ArchitectAgent([mockLlm] as any);
  });

  it('should have correct profile', () => {
    expect(agent.profile.id).toBe('architect');
    expect(agent.profile.defaultModelTier).toBe('powerful');
  });

  it('should use LLM for architecture design', async () => {
    const result = await agent.execute(baseInput as any);
    expect(result.status).toBe('success');
    expect(result.artifacts.length).toBeGreaterThan(0);
    expect(mockLlm.generateJSON).toHaveBeenCalled();
  });

  it('should generate ADR files for decisions', async () => {
    const result = await agent.execute(baseInput as any);
    const adrFiles = result.artifacts.filter((a) =>
      a.path?.startsWith('docs/adr/'),
    );
    expect(adrFiles.length).toBe(1);
  });

  it('should use deterministic in deterministicOnly mode', async () => {
    const input = {
      ...baseInput,
      config: { ...baseInput.config, deterministicOnly: true },
    };
    const result = await agent.execute(input as any);
    expect(result.status).toBe('success');
    expect(mockLlm.generateJSON).not.toHaveBeenCalled();
  });

  it('should handle LLM failure', async () => {
    mockLlm.generateJSON.mockRejectedValue(new Error('API error'));
    const result = await agent.execute(baseInput as any);
    expect(result.status).toBe('failure');
  });
});
