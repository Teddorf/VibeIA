import { AgentRegistry } from '../registry/agent-registry';
import { CoderAgent } from '../coder/coder-agent';
import { ReviewerAgent } from '../reviewer/reviewer-agent';
import { DevOpsAgent } from '../devops/devops-agent';
import {
  AgentInput,
  AgentOutput,
  CompiledContext,
  TaskDefinition,
} from '../protocol';

describe('Agent Pipeline E2E', () => {
  let registry: AgentRegistry;
  let coderAgent: CoderAgent;
  let reviewerAgent: ReviewerAgent;
  let devOpsAgent: DevOpsAgent;

  const mockLlmAdapters = [
    {
      name: 'test-llm',
      generateJSON: jest.fn().mockResolvedValue({
        data: {
          files: [
            { path: 'src/auth.ts', content: 'export class AuthService {}' },
            {
              path: 'src/auth.spec.ts',
              content:
                'describe("Auth", () => { it("works", () => { expect(true).toBe(true); }); });',
            },
          ],
        },
        tokensUsed: 300,
        cost: 0.003,
      }),
    },
  ];

  const mockSandbox = {
    create: jest.fn().mockResolvedValue({
      writeFile: jest.fn(),
      exec: jest
        .fn()
        .mockResolvedValue({ exitCode: 0, stdout: 'ok', stderr: '' }),
      destroy: jest.fn(),
    }),
  };

  const mockFs = {
    writeFile: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn().mockResolvedValue(''),
    exists: jest.fn().mockResolvedValue(true),
    mkdir: jest.fn().mockResolvedValue(undefined),
  };

  const mockVcs = {
    commit: jest.fn().mockResolvedValue('abc123'),
    push: jest.fn().mockResolvedValue(undefined),
    createBranch: jest.fn().mockResolvedValue(undefined),
    checkout: jest.fn().mockResolvedValue(undefined),
  };

  const mockDeploy = {
    deploy: jest.fn().mockResolvedValue({
      url: 'https://app.example.com',
      deploymentId: 'dep-1',
      status: 'success',
    }),
  };

  const mockQualityGates = {
    runAllChecks: jest.fn().mockResolvedValue({
      passed: true,
      overallScore: 95,
      checks: [],
      blockers: [],
    }),
    generateReport: jest.fn().mockReturnValue('PASSED'),
  };

  const mockContextCompiler = {};

  const emptyContext: CompiledContext = {
    entries: [],
    tokenBudget: 4096,
    tokenCount: 0,
    compiledAt: new Date(),
    cacheKey: 'test',
    scope: { global: [], domainSpecific: [], taskSpecific: [] },
  };

  beforeEach(() => {
    registry = new AgentRegistry();
    coderAgent = new CoderAgent(
      mockLlmAdapters as any,
      mockSandbox as any,
      mockFs as any,
      mockContextCompiler as any,
    );
    reviewerAgent = new ReviewerAgent(
      mockLlmAdapters as any,
      mockQualityGates as any,
    );
    devOpsAgent = new DevOpsAgent(
      mockVcs as any,
      mockDeploy as any,
      mockFs as any,
    );

    registry.register(coderAgent);
    registry.register(reviewerAgent);
    registry.register(devOpsAgent);
  });

  it('should register all 3 agents', () => {
    expect(registry.getAll()).toHaveLength(3);
    expect(registry.getRegisteredIds()).toEqual(
      expect.arrayContaining(['coder', 'reviewer', 'devops']),
    );
  });

  it('should route tasks to correct agents via canHandle', () => {
    const codeTask: TaskDefinition = {
      id: 't1',
      type: 'code-generation',
      description: 'Generate code',
      tags: ['code-generation'],
      dependencies: [],
      priority: 1,
      timeoutMs: 30000,
    };

    const reviewTask: TaskDefinition = {
      id: 't2',
      type: 'code-review',
      description: 'Review code',
      tags: ['code-review'],
      dependencies: [],
      priority: 1,
      timeoutMs: 30000,
    };

    const deployTask: TaskDefinition = {
      id: 't3',
      type: 'deployment',
      description: 'Deploy',
      tags: ['deployment'],
      dependencies: [],
      priority: 1,
      timeoutMs: 30000,
    };

    expect(registry.canHandle(codeTask).map((a) => a.profile.id)).toContain(
      'coder',
    );
    expect(registry.canHandle(reviewTask).map((a) => a.profile.id)).toContain(
      'reviewer',
    );
    expect(registry.canHandle(deployTask).map((a) => a.profile.id)).toContain(
      'devops',
    );
  });

  it('should execute full pipeline: coder -> reviewer -> devops', async () => {
    // Step 1: Coder generates code
    const coderInput: AgentInput = {
      taskDefinition: {
        id: 'task-code',
        type: 'code-generation',
        description: 'Build auth module',
        tags: ['code-generation'],
        dependencies: [],
        priority: 1,
        timeoutMs: 60000,
      },
      context: emptyContext,
      previousOutputs: [],
      config: {},
      traceId: 'trace-e2e',
    };

    const coderOutput = await coderAgent.execute(coderInput);
    expect(coderOutput.status).toBe('success');
    expect(coderOutput.artifacts.length).toBeGreaterThan(0);
    expect(coderOutput.metrics.llmCalls).toBe(1);

    // Step 2: Reviewer reviews the code
    const reviewerInput: AgentInput = {
      taskDefinition: {
        id: 'task-review',
        type: 'code-review',
        description: 'Review auth code',
        tags: ['code-review'],
        dependencies: ['task-code'],
        priority: 2,
        timeoutMs: 60000,
      },
      context: emptyContext,
      previousOutputs: [coderOutput],
      config: {},
      traceId: 'trace-e2e',
    };

    const reviewerOutput = await reviewerAgent.execute(reviewerInput);
    expect(reviewerOutput.status).toBe('success');
    expect(mockQualityGates.runAllChecks).toHaveBeenCalled();

    // Step 3: DevOps deploys the code
    const devOpsInput: AgentInput = {
      taskDefinition: {
        id: 'task-deploy',
        type: 'deployment',
        description: 'Deploy auth module',
        tags: ['deployment', 'vcs'],
        dependencies: ['task-review'],
        priority: 3,
        timeoutMs: 90000,
      },
      context: emptyContext,
      previousOutputs: [coderOutput, reviewerOutput],
      config: {},
      traceId: 'trace-e2e',
    };

    const devOpsOutput = await devOpsAgent.execute(devOpsInput);
    expect(devOpsOutput.status).toBe('success');
    expect(mockVcs.commit).toHaveBeenCalled();
    expect(mockDeploy.deploy).toHaveBeenCalled();

    // Verify complete pipeline
    const allOutputs = [coderOutput, reviewerOutput, devOpsOutput];
    expect(allOutputs.every((o) => o.status === 'success')).toBe(true);
    expect(allOutputs.every((o) => o.traceId === 'trace-e2e')).toBe(true);
  });

  it('should estimate costs for all agents', () => {
    const input: AgentInput = {
      taskDefinition: {
        id: 't1',
        type: 'code-generation',
        description: 'Test task',
        tags: ['code-generation'],
        dependencies: [],
        priority: 1,
        timeoutMs: 30000,
      },
      context: emptyContext,
      previousOutputs: [],
      config: {},
      traceId: 'trace-cost',
    };

    for (const agent of registry.getAll()) {
      const estimate = agent.estimateCost(input);
      expect(estimate.estimatedCostUSD).toBeGreaterThanOrEqual(0);
      expect(estimate.modelTier).toBeDefined();
    }
  });

  it('should validate inputs for all agents', () => {
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
      context: emptyContext,
      previousOutputs: [],
      config: {},
      traceId: 'trace-1',
    };

    for (const agent of registry.getAll()) {
      const errors = agent.validateInput(input);
      expect(errors).toBeNull();
    }
  });
});
