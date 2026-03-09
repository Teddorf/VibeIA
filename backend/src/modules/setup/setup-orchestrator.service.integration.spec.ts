/**
 * Integration Tests for SetupOrchestratorService
 *
 * These tests use mongodb-memory-server for real MongoDB persistence
 * with mocked external service executors (Neon, Vercel, Railway).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  setupTestDatabase,
  teardownTestDatabase,
} from '../../test/integration-test.utils';
import { SetupOrchestratorService } from './setup-orchestrator.service';
import { NeonSetupService } from './neon-setup.service';
import { VercelSetupService } from './vercel-setup.service';
import { RailwaySetupService } from './railway-setup.service';
import { NeonExecutor } from './executors/NeonExecutor';
import { VercelExecutor } from './executors/VercelExecutor';
import { RailwayExecutor } from './executors/RailwayExecutor';
import {
  SetupState,
  SetupStateDocument,
  SetupStateSchema,
  SetupStatus,
} from './schemas/setup-state.schema';
import {
  RollbackAction,
  RollbackActionDocument,
  RollbackActionSchema,
} from './schemas/rollback-action.schema';
import { SetupProvider, SetupTaskStatus } from './dto/setup.dto';
import {
  SETUP_STATE_REPOSITORY,
  ROLLBACK_ACTION_REPOSITORY,
} from '../../providers/repository-tokens';
import { createRepositoryProvider } from '../../providers/repository-providers.factory';

// Extended timeout for Windows MongoDB startup
const DB_TEST_TIMEOUT = 60000;

describe('SetupOrchestratorService Integration', () => {
  let service: SetupOrchestratorService;
  let setupStateModel: Model<SetupStateDocument>;
  let rollbackActionModel: Model<RollbackActionDocument>;
  let module: TestingModule;

  // Mock executors
  const mockNeonExecutor = {
    canExecute: jest.fn((provider) => provider === SetupProvider.NEON),
    execute: jest.fn().mockResolvedValue({
      projectId: 'neon-proj-123',
      steps: ['Created project', 'Created database'],
      dashboardUrl: 'https://console.neon.tech/project/123',
      connectionStrings: {
        main: 'postgres://user:pass@host:5432/db',
      },
    }),
    rollback: jest.fn().mockResolvedValue(undefined),
  };

  const mockVercelExecutor = {
    canExecute: jest.fn((provider) => provider === SetupProvider.VERCEL),
    execute: jest.fn().mockResolvedValue({
      projectId: 'vercel-proj-456',
      steps: ['Created project', 'Deployed'],
      url: 'https://test.vercel.app',
      dashboardUrl: 'https://vercel.com/test/project',
    }),
    rollback: jest.fn().mockResolvedValue(undefined),
  };

  const mockRailwayExecutor = {
    canExecute: jest.fn((provider) => provider === SetupProvider.RAILWAY),
    execute: jest.fn().mockResolvedValue({
      projectId: 'railway-proj-789',
      steps: ['Created project', 'Created services'],
      dashboardUrl: 'https://railway.app/project/789',
      services: {
        api: { url: 'https://api.railway.app' },
        redis: { connectionString: 'redis://localhost:6379' },
      },
    }),
    rollback: jest.fn().mockResolvedValue(undefined),
  };

  // Mock setup services for token validation
  const mockNeonSetupService = {
    validateToken: jest.fn().mockResolvedValue({ valid: true }),
  };

  const mockVercelSetupService = {
    validateToken: jest.fn().mockResolvedValue({ valid: true }),
  };

  const mockRailwaySetupService = {
    validateToken: jest.fn().mockResolvedValue({ valid: true }),
  };

  beforeAll(async () => {
    const uri = await setupTestDatabase();

    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: SetupState.name, schema: SetupStateSchema },
          { name: RollbackAction.name, schema: RollbackActionSchema },
        ]),
      ],
      providers: [
        SetupOrchestratorService,
        createRepositoryProvider(SETUP_STATE_REPOSITORY, SetupState.name),
        createRepositoryProvider(
          ROLLBACK_ACTION_REPOSITORY,
          RollbackAction.name,
        ),
        { provide: NeonSetupService, useValue: mockNeonSetupService },
        { provide: VercelSetupService, useValue: mockVercelSetupService },
        { provide: RailwaySetupService, useValue: mockRailwaySetupService },
        { provide: NeonExecutor, useValue: mockNeonExecutor },
        { provide: VercelExecutor, useValue: mockVercelExecutor },
        { provide: RailwayExecutor, useValue: mockRailwayExecutor },
      ],
    }).compile();

    service = module.get<SetupOrchestratorService>(SetupOrchestratorService);
    setupStateModel = module.get<Model<SetupStateDocument>>(
      getModelToken(SetupState.name),
    );
    rollbackActionModel = module.get<Model<RollbackActionDocument>>(
      getModelToken(RollbackAction.name),
    );
  }, DB_TEST_TIMEOUT);

  afterAll(async () => {
    if (module) {
      await module.close();
    }
    await teardownTestDatabase();
  }, DB_TEST_TIMEOUT);

  beforeEach(async () => {
    await setupStateModel.deleteMany({});
    await rollbackActionModel.deleteMany({});
    jest.clearAllMocks();
  });

  describe('execute', () => {
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
      expect(setupId).toContain('setup-');
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
      expect(mockNeonExecutor.execute).toHaveBeenCalled();
      expect(mockVercelExecutor.execute).not.toHaveBeenCalled();
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

      expect(result.generatedEnvFile).toBeDefined();
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

      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps.length).toBeGreaterThan(0);
      expect(result.nextSteps.some((s) => s.includes('Neon'))).toBe(true);
    });

    it('should persist setup state to database', async () => {
      const { setupId } = await service.execute({
        projectId: 'proj-1',
        projectName: 'test-project',
        providers: {
          neon: { projectName: 'test-project' },
        },
      });

      const savedState = await setupStateModel.findOne({ setupId }).exec();

      expect(savedState).toBeDefined();
      expect(savedState?.status).toBe(SetupStatus.COMPLETED);
      expect(savedState?.projectName).toBe('test-project');
    });

    it('should create rollback actions for successful tasks', async () => {
      const { setupId } = await service.execute({
        projectId: 'proj-1',
        projectName: 'test-project',
        providers: {
          neon: { projectName: 'test-project' },
          vercel: { projectName: 'test-project' },
        },
      });

      const rollbackActions = await rollbackActionModel
        .find({ setupId })
        .exec();

      expect(rollbackActions.length).toBe(2);
    });
  });

  describe('getStatusAsync', () => {
    it('should get setup status', async () => {
      const { setupId } = await service.execute({
        projectId: 'proj-1',
        projectName: 'test-project',
        providers: {
          neon: { projectName: 'test-project' },
        },
      });

      const status = await service.getStatusAsync(setupId);

      expect(status).toBeDefined();
      expect(status?.status).toBe(SetupTaskStatus.COMPLETED);
    });

    it('should return null for unknown setup ID', async () => {
      const status = await service.getStatusAsync('unknown-setup-id');

      expect(status).toBeNull();
    });
  });

  describe('rollback', () => {
    it('should handle rollback on failure', async () => {
      // Make Vercel fail
      mockVercelExecutor.execute.mockRejectedValueOnce(
        new Error('Vercel API error'),
      );

      const { result } = await service.execute({
        projectId: 'proj-1',
        projectName: 'test-project',
        providers: {
          neon: { projectName: 'test-project' },
          vercel: { projectName: 'test-project' },
        },
      });

      expect(result.success).toBe(false);
      // Neon should have been rolled back after Vercel failed
      expect(mockNeonExecutor.rollback).toHaveBeenCalled();
    });

    it('should mark setup as rolled back after failure', async () => {
      mockVercelExecutor.execute.mockRejectedValueOnce(
        new Error('Vercel API error'),
      );

      const { setupId } = await service.execute({
        projectId: 'proj-1',
        projectName: 'test-project',
        providers: {
          neon: { projectName: 'test-project' },
          vercel: { projectName: 'test-project' },
        },
      });

      const state = await setupStateModel.findOne({ setupId }).exec();

      expect(state?.status).toBe(SetupStatus.ROLLED_BACK);
    });
  });

  describe('validateAllTokens', () => {
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

    it('should only validate provided tokens', async () => {
      const results = await service.validateAllTokens({
        neon: 'neon-token',
      });

      expect(results.neon?.valid).toBe(true);
      expect(results.vercel).toBeUndefined();
      expect(results.railway).toBeUndefined();
    });

    it('should handle validation failures', async () => {
      mockNeonSetupService.validateToken.mockResolvedValueOnce({
        valid: false,
        error: 'Invalid token',
      });

      const results = await service.validateAllTokens({
        neon: 'invalid-token',
      });

      expect(results.neon?.valid).toBe(false);
      expect(results.neon?.error).toBe('Invalid token');
    });
  });

  describe('progress tracking', () => {
    it('should track progress through setup', async () => {
      const { setupId, result } = await service.execute({
        projectId: 'proj-1',
        projectName: 'test-project',
        providers: {
          neon: { projectName: 'test-project' },
          vercel: { projectName: 'test-project' },
        },
      });

      expect(result.state.progress).toBe(100);

      const state = await setupStateModel.findOne({ setupId }).exec();
      expect(state?.progress).toBe(100);
    });
  });
});
