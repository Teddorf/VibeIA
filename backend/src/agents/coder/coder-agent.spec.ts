import { CoderAgent } from './coder-agent';
import { AgentInput, CompiledContext, TaskDefinition } from '../protocol';

describe('CoderAgent', () => {
  let agent: CoderAgent;
  let mockLlmAdapters: any[];
  let mockSandboxProvider: any;
  let mockFsProvider: any;
  let mockContextCompiler: any;

  beforeEach(() => {
    mockLlmAdapters = [
      {
        name: 'test',
        generateJSON: jest.fn().mockResolvedValue({
          data: {
            files: [{ path: 'src/auth.ts', content: 'export class Auth {}' }],
          },
          tokensUsed: 200,
          cost: 0.002,
        }),
      },
    ];
    mockSandboxProvider = {
      create: jest.fn().mockResolvedValue({
        writeFile: jest.fn(),
        exec: jest
          .fn()
          .mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' }),
        destroy: jest.fn(),
      }),
    };
    mockFsProvider = {};
    mockContextCompiler = {};

    agent = new CoderAgent(
      mockLlmAdapters,
      mockSandboxProvider,
      mockFsProvider,
      mockContextCompiler,
    );
  });

  const makeInput = (overrides: Partial<AgentInput> = {}): AgentInput => ({
    taskDefinition: {
      id: 'task-1',
      type: 'code-generation',
      description: 'Build auth module',
      tags: ['auth', 'code-generation'],
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
      scope: 'task',
    },
    previousOutputs: [],
    config: {},
    traceId: 'trace-1',
    ...overrides,
  });

  it('should have correct profile', () => {
    expect(agent.profile.id).toBe('coder');
    expect(agent.profile.role).toBe('coder');
    expect(agent.profile.tags).toContain('code-generation');
  });

  it('should generate code via LLM', async () => {
    const output = await agent.execute(makeInput());

    expect(output.status).toBe('success');
    expect(output.artifacts).toHaveLength(1);
    expect(output.artifacts[0].path).toBe('src/auth.ts');
    expect(output.metrics.llmCalls).toBe(1);
    expect(output.metrics.tokensUsed).toBe(200);
  });

  it('should use deterministic path when deterministicOnly is set', async () => {
    const output = await agent.execute(
      makeInput({ config: { deterministicOnly: true } }),
    );

    expect(output.status).toBe('success');
    expect(output.artifacts[0].path).toBe('src/generated/placeholder.ts');
    expect(mockLlmAdapters[0].generateJSON).not.toHaveBeenCalled();
  });

  it('should fail gracefully when no LLM adapter available', async () => {
    agent = new CoderAgent(
      [],
      mockSandboxProvider,
      mockFsProvider,
      mockContextCompiler,
    );
    const output = await agent.execute(makeInput());

    expect(output.status).toBe('failure');
    expect(output.artifacts[0].content).toContain('No LLM adapter');
  });

  it('should handle sandbox validation failure gracefully', async () => {
    mockSandboxProvider.create.mockRejectedValue(
      new Error('Sandbox unavailable'),
    );

    const output = await agent.execute(makeInput());
    expect(output.status).toBe('success');
  });

  it('should generate context updates for produced files', async () => {
    const output = await agent.execute(makeInput());
    expect(output.contextUpdates.length).toBeGreaterThan(0);
    expect(output.contextUpdates[0].operation).toBe('add');
  });

  it('should handle tasks with appropriate tags', () => {
    expect(
      agent.canHandle({
        id: 't1',
        type: 'code-generation',
        description: 'test',
        tags: ['code-generation'],
        dependencies: [],
        priority: 1,
        timeoutMs: 30000,
      }),
    ).toBe(true);
  });
});
