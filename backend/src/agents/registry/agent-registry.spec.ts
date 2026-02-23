import { AgentRegistry } from './agent-registry';
import { IAgent, AgentProfile, TaskDefinition } from '../protocol';

const createMockAgent = (overrides: Partial<AgentProfile> = {}): IAgent => ({
  profile: {
    id: 'test-agent',
    name: 'Test Agent',
    role: 'tester',
    capabilities: ['testing'],
    defaultModelTier: 'fast',
    maxConcurrentTasks: 1,
    tags: ['test'],
    ...overrides,
  },
  execute: jest.fn(),
  validateInput: jest.fn().mockReturnValue(null),
  estimateCost: jest.fn(),
  canHandle: jest.fn().mockReturnValue(true),
});

describe('AgentRegistry', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('register', () => {
    it('should register a valid agent', () => {
      const agent = createMockAgent();
      registry.register(agent);
      expect(registry.has('test-agent')).toBe(true);
    });

    it('should throw on duplicate registration', () => {
      const agent = createMockAgent();
      registry.register(agent);
      expect(() => registry.register(agent)).toThrow('already registered');
    });

    it('should throw on invalid profile (missing id)', () => {
      const agent = createMockAgent({ id: '' });
      expect(() => registry.register(agent)).toThrow('Invalid agent profile');
    });
  });

  describe('get', () => {
    it('should return registered agent', () => {
      const agent = createMockAgent();
      registry.register(agent);
      expect(registry.get('test-agent')).toBe(agent);
    });

    it('should throw for unknown agent', () => {
      expect(() => registry.get('unknown')).toThrow('not found');
    });
  });

  describe('getAll', () => {
    it('should return all registered agents', () => {
      registry.register(createMockAgent({ id: 'a1', name: 'A1' }));
      registry.register(createMockAgent({ id: 'a2', name: 'A2' }));
      expect(registry.getAll()).toHaveLength(2);
    });
  });

  describe('getByCapability', () => {
    it('should filter agents by capability', () => {
      registry.register(
        createMockAgent({ id: 'a1', capabilities: ['code-gen'] }),
      );
      registry.register(
        createMockAgent({ id: 'a2', capabilities: ['review'] }),
      );

      const result = registry.getByCapability('code-gen');
      expect(result).toHaveLength(1);
      expect(result[0].profile.id).toBe('a1');
    });
  });

  describe('canHandle', () => {
    it('should filter agents that can handle a task', () => {
      const a1 = createMockAgent({ id: 'a1' });
      const a2 = createMockAgent({ id: 'a2' });
      (a2.canHandle as jest.Mock).mockReturnValue(false);

      registry.register(a1);
      registry.register(a2);

      const task: TaskDefinition = {
        id: 't1',
        type: 'code-generation',
        description: 'test',
        tags: ['code'],
        dependencies: [],
        priority: 1,
        timeoutMs: 30000,
      };

      const result = registry.canHandle(task);
      expect(result).toHaveLength(1);
      expect(result[0].profile.id).toBe('a1');
    });
  });
});
