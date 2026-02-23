import { FixerAgent } from './fixer-agent';

describe('FixerAgent', () => {
  let agent: FixerAgent;
  let mockLlm: { generateJSON: jest.Mock; generateText: jest.Mock };
  let mockSandbox: Record<string, jest.Mock>;
  let mockSandboxProvider: { create: jest.Mock };

  const baseInput = {
    taskDefinition: {
      id: 'task-1',
      type: 'bug-fix' as const,
      description: 'Fix null pointer in user service',
      tags: ['bug-fix'],
      dependencies: [],
      priority: 1,
      timeoutMs: 30000,
    },
    context: {
      entries: [
        {
          type: 'code',
          scope: 'task',
          tags: ['bug-fix'],
          content: { file: 'user.ts' },
          tokenCount: 10,
        },
      ],
      tokenBudget: 4000,
      tokenCount: 10,
      compiledAt: new Date(),
      scope: 'task' as const,
    },
    previousOutputs: [
      {
        taskId: 't0',
        agentId: 'coder',
        status: 'failure' as const,
        artifacts: [
          { type: 'error', content: 'TypeError: Cannot read property of null' },
        ],
        contextUpdates: [],
        metrics: {
          startedAt: new Date(),
          durationMs: 0,
          tokensUsed: 0,
          costUSD: 0,
          llmCalls: 0,
          retries: 0,
        },
        traceId: 'trace-0',
      },
    ],
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
          rootCause: 'Null check missing in user lookup',
          fixes: [
            {
              path: 'src/user.ts',
              content: 'fixed code',
              description: 'Added null guard',
            },
          ],
          confidence: 'high',
        },
        tokensUsed: 200,
        cost: 0.002,
      }),
      generateText: jest.fn(),
    };

    mockSandbox = {
      writeFile: jest.fn().mockResolvedValue(undefined),
      exec: jest
        .fn()
        .mockResolvedValue({ exitCode: 0, stdout: 'ok', stderr: '' }),
      destroy: jest.fn().mockResolvedValue(undefined),
    };
    mockSandboxProvider = {
      create: jest.fn().mockResolvedValue(mockSandbox),
    };

    agent = new FixerAgent([mockLlm] as any, mockSandboxProvider as any);
  });

  it('should have correct profile', () => {
    expect(agent.profile.id).toBe('fixer');
    expect(agent.profile.tags).toContain('bug-fix');
  });

  it('should diagnose and fix errors', async () => {
    const result = await agent.execute(baseInput as any);
    expect(result.status).toBe('success');
    expect(result.artifacts.length).toBe(2); // diagnosis + fix file
    expect(mockLlm.generateJSON).toHaveBeenCalled();
  });

  it('should include diagnosis artifact', async () => {
    const result = await agent.execute(baseInput as any);
    const diagnosis = result.artifacts.find((a) => a.type === 'diagnosis');
    expect(diagnosis).toBeDefined();
    const parsed = JSON.parse(diagnosis!.content);
    expect(parsed.rootCause).toContain('Null check');
  });

  it('should validate fix in sandbox', async () => {
    await agent.execute(baseInput as any);
    expect(mockSandboxProvider.create).toHaveBeenCalled();
    expect(mockSandbox.writeFile).toHaveBeenCalled();
  });

  it('should handle sandbox failure gracefully', async () => {
    mockSandboxProvider.create.mockRejectedValue(new Error('No sandbox'));
    const result = await agent.execute(baseInput as any);
    expect(result.status).toBe('success');
  });

  it('should handle LLM failure', async () => {
    mockLlm.generateJSON.mockRejectedValue(new Error('LLM error'));
    const result = await agent.execute(baseInput as any);
    expect(result.status).toBe('failure');
  });
});
