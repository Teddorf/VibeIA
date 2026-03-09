import { CoderAgent } from '../coder/coder-agent';
import { ReviewerAgent } from '../reviewer/reviewer-agent';
import { DevOpsAgent } from '../devops/devops-agent';
import { AnalystAgent } from '../analyst/analyst-agent';
import { ArchitectAgent } from '../architect/architect-agent';
import { TesterAgent } from '../tester/tester-agent';
import { DocAgent } from '../doc/doc-agent';
import { FixerAgent } from '../fixer/fixer-agent';
import { IAgent, AgentProfile } from '../protocol';

describe('All Agents Conformance', () => {
  const mockLlm = { generateJSON: jest.fn(), generateText: jest.fn() };
  const mockSandbox = { create: jest.fn() };
  const mockFs = { readFile: jest.fn(), writeFile: jest.fn() };
  const mockVcs = { commit: jest.fn() };
  const mockDeploy = { deploy: jest.fn() };
  const mockQualityGates = { runAllChecks: jest.fn() };
  const mockContextCompiler = { compile: jest.fn() };

  const agents: IAgent[] = [
    new CoderAgent(
      [mockLlm] as any,
      mockSandbox as any,
      mockFs as any,
      mockContextCompiler as any,
    ),
    new ReviewerAgent([mockLlm] as any, mockQualityGates as any),
    new DevOpsAgent(mockVcs as any, mockDeploy as any, mockFs as any),
    new AnalystAgent([mockLlm] as any),
    new ArchitectAgent([mockLlm] as any),
    new TesterAgent([mockLlm] as any, mockSandbox as any),
    new DocAgent([mockLlm] as any),
    new FixerAgent([mockLlm] as any, mockSandbox as any),
  ];

  it('should have exactly 8 agents', () => {
    expect(agents.length).toBe(8);
  });

  it('should all have unique IDs', () => {
    const ids = agents.map((a) => a.profile.id);
    expect(new Set(ids).size).toBe(agents.length);
  });

  it('should all have unique roles', () => {
    const roles = agents.map((a) => a.profile.role);
    expect(new Set(roles).size).toBe(agents.length);
  });

  describe.each(agents.map((a) => [a.profile.id, a]))('%s', (_id, agent) => {
    const a = agent as IAgent;

    it('should implement IAgent interface', () => {
      expect(typeof a.execute).toBe('function');
      expect(typeof a.validateInput).toBe('function');
      expect(typeof a.estimateCost).toBe('function');
      expect(typeof a.canHandle).toBe('function');
    });

    it('should have a valid AgentProfile', () => {
      const p: AgentProfile = a.profile;
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.role).toBeTruthy();
      expect(p.capabilities.length).toBeGreaterThan(0);
      expect(['fast', 'balanced', 'powerful']).toContain(p.defaultModelTier);
      expect(p.maxConcurrentTasks).toBeGreaterThan(0);
      expect(p.tags.length).toBeGreaterThan(0);
    });

    it('should validate input correctly', () => {
      const errors = a.validateInput({} as any);
      expect(errors).not.toBeNull();
      expect(errors!.length).toBeGreaterThan(0);
      expect(errors!.some((e) => e.code === 'MISSING_TASK_DEFINITION')).toBe(
        true,
      );
    });

    it('should estimate cost', () => {
      const input = {
        taskDefinition: {
          id: 't1',
          type: 'code-generation' as const,
          description: 'Test task',
          tags: ['test'],
          dependencies: [],
          priority: 1,
          timeoutMs: 30000,
        },
        context: {
          entries: [],
          tokenBudget: 4000,
          tokenCount: 100,
          compiledAt: new Date(),
          cacheKey: '',
          scope: {
            global: [] as any[],
            domainSpecific: [] as any[],
            taskSpecific: [] as any[],
          },
        },
        previousOutputs: [],
        config: {},
        traceId: 'trace-conformance',
      };

      const estimate = a.estimateCost(input as any);
      expect(estimate.estimatedInputTokens).toBeGreaterThan(0);
      expect(estimate.estimatedCostUSD).toBeGreaterThanOrEqual(0);
      expect(estimate.modelTier).toBeTruthy();
    });

    it('should handle canHandle for own tags', () => {
      const ownTag = a.profile.tags[0];
      expect(a.canHandle({ tags: [ownTag] } as any)).toBe(true);
      expect(a.canHandle({ tags: ['nonexistent-tag-xyz'] } as any)).toBe(false);
    });
  });
});
