import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { NeonSetupService } from './neon-setup.service';
import { VercelSetupService } from './vercel-setup.service';
import { RailwaySetupService } from './railway-setup.service';
import { SetupOrchestratorService } from './setup-orchestrator.service';
import { NeonExecutor } from './executors/NeonExecutor';
import { VercelExecutor } from './executors/VercelExecutor';
import { RailwayExecutor } from './executors/RailwayExecutor';
import { SetupState } from './schemas/setup-state.schema';
import { RollbackAction } from './schemas/rollback-action.schema';
import { SetupTaskStatus, SetupProvider } from './dto/setup.dto';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('NeonSetupService', () => {
  let service: NeonSetupService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NeonSetupService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-token'),
          },
        },
      ],
    }).compile();

    service = module.get<NeonSetupService>(NeonSetupService);
    configService = module.get<ConfigService>(ConfigService);
    mockFetch.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should select optimal region', () => {
    expect(service.selectOptimalRegion()).toBe('aws-us-east-1');
    expect(service.selectOptimalRegion('aws-eu-central-1')).toBe('aws-eu-central-1');
    expect(service.selectOptimalRegion('invalid-region')).toBe('aws-us-east-1');
  });

  it('should validate token successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ projects: [{ id: '1', name: 'test' }] }),
    });

    const result = await service.validateToken('valid-token');

    expect(result.valid).toBe(true);
    expect(result.accountInfo).toBeDefined();
  });

  it('should handle invalid token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Unauthorized',
    });

    const result = await service.validateToken('invalid-token');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should create project', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        project: {
          id: 'proj-123',
          name: 'test-project',
          region_id: 'aws-us-east-1',
          default_branch_id: 'branch-123',
        },
      }),
    });

    const { project, steps } = await service.createProject({
      projectName: 'test-project',
    });

    expect(project.id).toBe('proj-123');
    expect(steps.length).toBe(1);
    expect(steps[0].status).toBe(SetupTaskStatus.COMPLETED);
  });

  it('should validate connection string format', async () => {
    const validUrl = 'postgresql://user:pass@host.neon.tech/dbname?sslmode=require';
    const invalidUrl = 'not-a-valid-url';

    expect(await service.validateConnection(validUrl)).toBe(true);
    expect(await service.validateConnection(invalidUrl)).toBe(false);
  });
});

describe('VercelSetupService', () => {
  let service: VercelSetupService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VercelSetupService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-token'),
          },
        },
      ],
    }).compile();

    service = module.get<VercelSetupService>(VercelSetupService);
    configService = module.get<ConfigService>(ConfigService);
    mockFetch.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate token successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        user: { name: 'Test User', email: 'test@example.com' },
      }),
    });

    const result = await service.validateToken('valid-token');

    expect(result.valid).toBe(true);
    expect(result.accountInfo?.name).toBe('Test User');
    expect(result.accountInfo?.email).toBe('test@example.com');
  });

  it('should handle invalid token', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      text: async () => 'Unauthorized',
    });

    const result = await service.validateToken('invalid-token');

    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should create project', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'prj-123',
        name: 'test-project',
        accountId: 'acc-123',
        framework: 'nextjs',
      }),
    });

    const { project, step } = await service.createProject({
      projectName: 'test-project',
    });

    expect(project.id).toBe('prj-123');
    expect(step.status).toBe(SetupTaskStatus.COMPLETED);
  });

  it('should configure environment variables', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    const step = await service.configureEnvironmentVariables('prj-123', [
      { key: 'DATABASE_URL', value: 'postgres://...', target: ['production'] },
      { key: 'API_KEY', value: 'secret', target: ['production', 'preview'] },
    ]);

    expect(step.status).toBe(SetupTaskStatus.COMPLETED);
    expect(step.message).toContain('2 environment variables');
  });
});

describe('RailwaySetupService', () => {
  let service: RailwaySetupService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RailwaySetupService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-token'),
          },
        },
      ],
    }).compile();

    service = module.get<RailwaySetupService>(RailwaySetupService);
    configService = module.get<ConfigService>(ConfigService);
    mockFetch.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should validate token successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          me: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
        },
      }),
    });

    const result = await service.validateToken('valid-token');

    expect(result.valid).toBe(true);
    expect(result.accountInfo?.name).toBe('Test User');
  });

  it('should handle GraphQL errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        errors: [{ message: 'Invalid token' }],
      }),
    });

    const result = await service.validateToken('invalid-token');

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid token');
  });

  it('should create project', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          projectCreate: {
            id: 'proj-123',
            name: 'test-project',
            description: 'Test',
            createdAt: new Date().toISOString(),
          },
        },
      }),
    });

    const { project, step } = await service.createProject({
      projectName: 'test-project',
    });

    expect(project.id).toBe('proj-123');
    expect(step.status).toBe(SetupTaskStatus.COMPLETED);
  });
});

describe('SetupOrchestratorService', () => {
  let service: SetupOrchestratorService;
  let neonService: any;
  let vercelService: any;
  let railwayService: any;

  beforeEach(async () => {
    // Track saved setup states so findOne can return them
    const savedStates: Map<string, any> = new Map();
    const mockSetupStateModel: any = jest.fn().mockImplementation((data) => {
      const state = {
        ...data,
        _id: 'state-mock-id',
        save: jest.fn().mockImplementation(async () => {
          savedStates.set(data.setupId, state);
          return state;
        }),
      };
      return state;
    });
    mockSetupStateModel.findOne = jest.fn().mockImplementation((query) => ({
      exec: jest.fn().mockResolvedValue(savedStates.get(query?.setupId) || null)
    }));
    mockSetupStateModel.findOneAndUpdate = jest.fn().mockImplementation((query, update) => ({
      exec: jest.fn().mockImplementation(async () => {
        const existing = savedStates.get(query?.setupId);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        }
        return null;
      })
    }));
    mockSetupStateModel.find = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([]) });

    // Track saved rollback actions so find() can return them
    const savedRollbackActions: any[] = [];
    const mockRollbackModel: any = jest.fn().mockImplementation((data) => {
      const action = {
        ...data,
        _id: `rollback-${savedRollbackActions.length}`,
        save: jest.fn().mockImplementation(async () => {
          savedRollbackActions.push(action);
          return action;
        }),
      };
      return action;
    });
    mockRollbackModel.find = jest.fn().mockImplementation(() => ({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          savedRollbackActions.filter(a => a.status === 'pending')
        )
      }),
      exec: jest.fn().mockResolvedValue(savedRollbackActions)
    }));
    mockRollbackModel.findByIdAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    mockRollbackModel.findOneAndUpdate = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });

    // Define service mocks as variables so executors can reference them
    neonService = {
      execute: jest.fn().mockResolvedValue({
        projectId: 'neon-proj-123',
        databaseId: 'db-123',
        connectionStrings: {
          main: 'postgresql://...',
          pooled: 'postgresql://...',
        },
        dashboardUrl: 'https://console.neon.tech/...',
        branches: { main: 'branch-123' },
        steps: [{ id: '1', name: 'Create project', status: 'completed' }],
      }),
      rollback: jest.fn().mockResolvedValue(undefined),
      validateToken: jest.fn().mockResolvedValue({ valid: true }),
    };

    vercelService = {
      execute: jest.fn().mockResolvedValue({
        projectId: 'vercel-proj-123',
        url: 'https://test.vercel.app',
        dashboardUrl: 'https://vercel.com/...',
        steps: [{ id: '1', name: 'Create project', status: 'completed' }],
      }),
      rollback: jest.fn().mockResolvedValue(undefined),
      validateToken: jest.fn().mockResolvedValue({ valid: true }),
    };

    railwayService = {
      execute: jest.fn().mockResolvedValue({
        projectId: 'railway-proj-123',
        services: {
          api: { id: 'svc-123', url: 'https://api.railway.app' },
        },
        dashboardUrl: 'https://railway.app/...',
        steps: [{ id: '1', name: 'Create project', status: 'completed' }],
      }),
      rollback: jest.fn().mockResolvedValue(undefined),
      validateToken: jest.fn().mockResolvedValue({ valid: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetupOrchestratorService,
        {
          provide: getModelToken(SetupState.name),
          useValue: mockSetupStateModel,
        },
        {
          provide: getModelToken(RollbackAction.name),
          useValue: mockRollbackModel,
        },
        { provide: NeonSetupService, useValue: neonService },
        { provide: VercelSetupService, useValue: vercelService },
        { provide: RailwaySetupService, useValue: railwayService },
        {
          provide: NeonExecutor,
          useValue: {
            canExecute: jest.fn().mockImplementation((p) => p === SetupProvider.NEON),
            execute: jest.fn().mockImplementation((...args) => neonService.execute(...args)),
            rollback: jest.fn().mockImplementation((...args) => neonService.rollback(...args)),
          },
        },
        {
          provide: VercelExecutor,
          useValue: {
            canExecute: jest.fn().mockImplementation((p) => p === SetupProvider.VERCEL),
            execute: jest.fn().mockImplementation((...args) => vercelService.execute(...args)),
            rollback: jest.fn().mockImplementation((...args) => vercelService.rollback(...args)),
          },
        },
        {
          provide: RailwayExecutor,
          useValue: {
            canExecute: jest.fn().mockImplementation((p) => p === SetupProvider.RAILWAY),
            execute: jest.fn().mockImplementation((...args) => railwayService.execute(...args)),
            rollback: jest.fn().mockImplementation((...args) => railwayService.rollback(...args)),
          },
        },
      ],
    }).compile();

    service = module.get<SetupOrchestratorService>(SetupOrchestratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should execute setup with all providers', async () => {
    const { setupId, result } = await service.execute({
      projectId: 'proj-1',
      projectName: 'test-project',
      providers: {
        neon: { projectName: 'test-project' },
        vercel: { projectName: 'test-project' },
        railway: { projectName: 'test-project' },
      },
    });

    expect(setupId).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.state.tasks.length).toBe(3);
    expect(result.urls.frontend).toBe('https://test.vercel.app');
    expect(result.credentials.databaseUrl).toBeDefined();
  });

  it('should execute setup with only Neon', async () => {
    const { setupId, result } = await service.execute({
      projectId: 'proj-1',
      projectName: 'test-project',
      providers: {
        neon: { projectName: 'test-project' },
      },
    });

    expect(result.success).toBe(true);
    expect(result.state.tasks.length).toBe(1);
    expect(result.state.tasks[0].provider).toBe(SetupProvider.NEON);
  });

  it('should generate env file', async () => {
    const { result } = await service.execute({
      projectId: 'proj-1',
      projectName: 'test-project',
      providers: {
        neon: { projectName: 'test-project' },
        vercel: { projectName: 'test-project' },
      },
    });

    expect(result.generatedEnvFile).toContain('DATABASE_URL');
    expect(result.generatedEnvFile).toContain('NEXT_PUBLIC_APP_URL');
  });

  it('should generate next steps', async () => {
    const { result } = await service.execute({
      projectId: 'proj-1',
      projectName: 'test-project',
      providers: {
        neon: { projectName: 'test-project' },
      },
    });

    expect(result.nextSteps.length).toBeGreaterThan(0);
    expect(result.nextSteps.some((s) => s.includes('Neon'))).toBe(true);
  });

  it('should validate all tokens', async () => {
    const results = await service.validateAllTokens({
      neon: 'neon-token',
      vercel: 'vercel-token',
      railway: 'railway-token',
    });

    expect(results.neon?.valid).toBe(true);
    expect(results.vercel?.valid).toBe(true);
    expect(results.railway?.valid).toBe(true);
  });

  it('should get setup status via result', async () => {
    const { result } = await service.execute({
      projectId: 'proj-1',
      projectName: 'test-project',
      providers: {
        neon: { projectName: 'test-project' },
      },
    });

    // Verify the result state directly instead of async lookup
    expect(result.state).toBeDefined();
    expect(result.state.tasks.length).toBe(1);
    expect(result.success).toBe(true);
  });

  it('should return null for unknown setup ID', () => {
    const status = service.getStatus('unknown-id');
    expect(status).toBeNull();
  });

  it('should handle failure gracefully', async () => {
    // Make Vercel fail
    vercelService.execute.mockRejectedValueOnce(new Error('Vercel API error'));

    const { result } = await service.execute({
      projectId: 'proj-1',
      projectName: 'test-project',
      providers: {
        neon: { projectName: 'test-project' },
        vercel: { projectName: 'test-project' },
      },
    });

    // Verify failure is reported
    expect(result.success).toBe(false);
  });
});
