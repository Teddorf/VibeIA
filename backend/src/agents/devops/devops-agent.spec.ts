import { DevOpsAgent } from './devops-agent';
import { AgentInput } from '../protocol';

describe('DevOpsAgent', () => {
  let agent: DevOpsAgent;
  let mockVcs: any;
  let mockDeploy: any;
  let mockFs: any;

  beforeEach(() => {
    mockVcs = {
      commit: jest.fn().mockResolvedValue('abc123'),
      push: jest.fn().mockResolvedValue(undefined),
      createBranch: jest.fn().mockResolvedValue(undefined),
    };
    mockDeploy = {
      deploy: jest.fn().mockResolvedValue({
        url: 'https://app.example.com',
        deploymentId: 'dep-1',
        status: 'success',
      }),
    };
    mockFs = {
      writeFile: jest.fn().mockResolvedValue(undefined),
      mkdir: jest.fn().mockResolvedValue(undefined),
    };

    agent = new DevOpsAgent(mockVcs, mockDeploy, mockFs);
  });

  const makeInput = (overrides: Partial<AgentInput> = {}): AgentInput => ({
    taskDefinition: {
      id: 'task-deploy',
      type: 'deployment',
      description: 'Deploy application',
      tags: ['deployment', 'vcs'],
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
          { type: 'file', path: 'src/app.ts', content: 'const app = {};' },
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
    expect(agent.profile.id).toBe('devops');
    expect(agent.profile.role).toBe('devops');
    expect(agent.profile.tags).toContain('deployment');
  });

  it('should write files, commit, and deploy', async () => {
    const output = await agent.execute(makeInput());

    expect(output.status).toBe('success');
    expect(mockFs.writeFile).toHaveBeenCalled();
    expect(mockVcs.commit).toHaveBeenCalled();
    expect(mockDeploy.deploy).toHaveBeenCalled();
    expect(output.artifacts.length).toBeGreaterThanOrEqual(2);
  });

  it('should handle VCS failure gracefully', async () => {
    mockVcs.commit.mockRejectedValue(new Error('Git error'));

    const output = await agent.execute(makeInput());
    expect(output.status).toBe('success');
  });

  it('should handle deploy failure gracefully', async () => {
    mockDeploy.deploy.mockRejectedValue(new Error('Deploy failed'));

    const output = await agent.execute(makeInput());
    expect(output.status).toBe('success');
    expect(output.artifacts.some((a) => a.type === 'deployment-skipped')).toBe(
      true,
    );
  });

  it('should generate config for non-deployment tasks', async () => {
    const output = await agent.execute(
      makeInput({
        taskDefinition: {
          id: 'task-config',
          type: 'architecture',
          description: 'Generate config',
          tags: ['infrastructure'],
          dependencies: [],
          priority: 1,
          timeoutMs: 30000,
        },
      }),
    );

    expect(output.status).toBe('success');
    expect(output.artifacts[0].type).toBe('file');
    expect(output.artifacts[0].path).toBe('.env.generated');
  });
});
