import { TesterAgent } from './tester-agent';

describe('TesterAgent', () => {
  let agent: TesterAgent;
  let mockLlm: { generateJSON: jest.Mock; generateText: jest.Mock };
  let mockSandbox: Record<string, jest.Mock>;
  let mockSandboxProvider: { create: jest.Mock };

  const baseInput = {
    taskDefinition: {
      id: 'task-1',
      type: 'testing' as const,
      description: 'Generate tests for user service',
      tags: ['testing'],
      dependencies: [],
      priority: 1,
      timeoutMs: 30000,
    },
    context: {
      entries: [],
      tokenBudget: 4000,
      tokenCount: 0,
      compiledAt: new Date(),
      scope: 'task' as const,
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
          testFiles: [
            { path: 'src/user.spec.ts', content: 'describe("User", () => {})' },
          ],
          coverage: { estimated: 80 },
        },
        tokensUsed: 150,
        cost: 0.001,
      }),
      generateText: jest.fn(),
    };

    mockSandbox = {
      writeFile: jest.fn().mockResolvedValue(undefined),
      exec: jest
        .fn()
        .mockResolvedValue({ exitCode: 0, stdout: '{}', stderr: '' }),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    mockSandboxProvider = {
      create: jest.fn().mockResolvedValue(mockSandbox),
    };

    agent = new TesterAgent([mockLlm] as any, mockSandboxProvider as any);
  });

  it('should have correct profile', () => {
    expect(agent.profile.id).toBe('tester');
    expect(agent.profile.tags).toContain('testing');
  });

  it('should generate tests via LLM', async () => {
    const result = await agent.execute(baseInput as any);
    expect(result.status).toBe('success');
    expect(result.artifacts.length).toBeGreaterThanOrEqual(1);
    expect(mockLlm.generateJSON).toHaveBeenCalled();
  });

  it('should use deterministic templates in deterministicOnly', async () => {
    const input = {
      ...baseInput,
      config: { ...baseInput.config, deterministicOnly: true },
    };
    const result = await agent.execute(input as any);
    expect(result.status).toBe('success');
    expect(mockLlm.generateJSON).not.toHaveBeenCalled();
  });

  it('should run tests in sandbox', async () => {
    await agent.execute(baseInput as any);
    expect(mockSandboxProvider.create).toHaveBeenCalled();
    expect(mockSandbox.exec).toHaveBeenCalled();
  });

  it('should handle sandbox failure gracefully', async () => {
    mockSandboxProvider.create.mockRejectedValue(
      new Error('Sandbox unavailable'),
    );
    const result = await agent.execute(baseInput as any);
    expect(result.status).toBe('success');
  });

  it('should handle LLM failure', async () => {
    mockLlm.generateJSON.mockRejectedValue(new Error('Timeout'));
    const result = await agent.execute(baseInput as any);
    expect(result.status).toBe('failure');
  });
});
