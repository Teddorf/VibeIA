/**
 * Integration Tests for WorkspaceService
 *
 * These tests use mongodb-memory-server for real MongoDB persistence.
 * They test workspace lifecycle management with actual database operations.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import {
  setupTestDatabase,
  teardownTestDatabase,
} from '../../test/integration-test.utils';
import { WorkspaceService } from './workspace.service';
import {
  Workspace,
  WorkspaceDocument,
  WorkspaceSchema,
  WorkspaceStatus,
} from './schemas/workspace.schema';

// Extended timeout for Windows MongoDB startup
const DB_TEST_TIMEOUT = 60000;

describe('WorkspaceService Integration', () => {
  let service: WorkspaceService;
  let workspaceModel: Model<WorkspaceDocument>;
  let module: TestingModule;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    const uri = await setupTestDatabase();

    // Create NestJS testing module with real MongoDB connection
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: Workspace.name, schema: WorkspaceSchema },
        ]),
      ],
      providers: [WorkspaceService],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    workspaceModel = module.get<Model<WorkspaceDocument>>(
      getModelToken(Workspace.name),
    );
  }, DB_TEST_TIMEOUT);

  afterAll(async () => {
    if (module) {
      await module.close();
    }
    await teardownTestDatabase();
  }, DB_TEST_TIMEOUT);

  beforeEach(async () => {
    // Direct cleanup for reliable test isolation
    await workspaceModel.deleteMany({});
  });

  describe('createWorkspace', () => {
    it('should create a workspace', async () => {
      const workspace = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      expect(workspace._id).toBeDefined();
      expect(workspace.userId).toBe('user-1');
      expect(workspace.projectId).toBe('project-1');
      expect(workspace.status).toBe(WorkspaceStatus.RUNNING);
    });

    it('should apply default resources', async () => {
      const workspace = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      expect(workspace.resources).toBeDefined();
      expect(workspace.resources.cpu).toBeGreaterThan(0);
      expect(workspace.resources.memory).toBeGreaterThan(0);
    });

    it('should set expiration time', async () => {
      const workspace = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      expect(workspace.expiresAt).toBeDefined();
      expect(workspace.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should generate container ID', async () => {
      const workspace = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      expect(workspace.containerId).toBeDefined();
      expect(workspace.containerId).toContain('container-');
    });

    it('should allow custom name', async () => {
      const workspace = await service.createWorkspace('user-1', {
        projectId: 'project-1',
        name: 'My Custom Workspace',
      });

      expect(workspace.name).toBe('My Custom Workspace');
    });
  });

  describe('getWorkspace', () => {
    it('should retrieve a workspace by ID', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      const workspace = await service.getWorkspace(created._id.toString());

      expect(workspace).toBeDefined();
      expect(workspace?._id.toString()).toBe(created._id.toString());
    });

    it('should return null for non-existent workspace', async () => {
      const workspace = await service.getWorkspace(
        new mongoose.Types.ObjectId().toString(),
      );

      expect(workspace).toBeNull();
    });

    it('should return null for invalid ID format', async () => {
      const workspace = await service.getWorkspace('invalid-id');

      expect(workspace).toBeNull();
    });
  });

  describe('getUserWorkspaces', () => {
    it('should get all workspaces for a user', async () => {
      await service.createWorkspace('user-1', { projectId: 'p1' });
      await service.createWorkspace('user-1', { projectId: 'p2' });
      await service.createWorkspace('user-2', { projectId: 'p3' });

      const workspaces = await service.getUserWorkspaces('user-1');

      expect(workspaces.length).toBe(2);
      expect(workspaces.every((w) => w.userId === 'user-1')).toBe(true);
    });

    it('should return empty array for user with no workspaces', async () => {
      const workspaces = await service.getUserWorkspaces('non-existent-user');

      expect(workspaces).toEqual([]);
    });
  });

  describe('pauseWorkspace', () => {
    it('should pause a running workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      const paused = await service.pauseWorkspace(created._id.toString());

      expect(paused.status).toBe(WorkspaceStatus.PAUSED);
    });

    it('should throw for non-existent workspace', async () => {
      await expect(
        service.pauseWorkspace(new mongoose.Types.ObjectId().toString()),
      ).rejects.toThrow('not found');
    });

    it('should throw for non-running workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });
      await service.pauseWorkspace(created._id.toString());

      await expect(
        service.pauseWorkspace(created._id.toString()),
      ).rejects.toThrow('Cannot pause');
    });

    it('should update lastActivityAt', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });
      const originalActivity = created.lastActivityAt;

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const paused = await service.pauseWorkspace(created._id.toString());

      expect(paused.lastActivityAt!.getTime()).toBeGreaterThanOrEqual(
        originalActivity!.getTime(),
      );
    });
  });

  describe('resumeWorkspace', () => {
    it('should resume a paused workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });
      await service.pauseWorkspace(created._id.toString());

      const resumed = await service.resumeWorkspace(created._id.toString());

      expect(resumed.status).toBe(WorkspaceStatus.RUNNING);
    });

    it('should throw for non-paused workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      await expect(
        service.resumeWorkspace(created._id.toString()),
      ).rejects.toThrow('Cannot resume');
    });

    it('should throw for non-existent workspace', async () => {
      await expect(
        service.resumeWorkspace(new mongoose.Types.ObjectId().toString()),
      ).rejects.toThrow('not found');
    });
  });

  describe('destroyWorkspace', () => {
    it('should destroy a workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      await service.destroyWorkspace(created._id.toString());

      const workspace = await service.getWorkspace(created._id.toString());
      expect(workspace).toBeNull();
    });

    it('should handle destroying non-existent workspace gracefully', async () => {
      await expect(
        service.destroyWorkspace(new mongoose.Types.ObjectId().toString()),
      ).resolves.not.toThrow();
    });
  });

  describe('extendWorkspace', () => {
    it('should extend workspace expiration by 1 hour', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });
      const originalExpiration = created.expiresAt.getTime();

      const extended = await service.extendWorkspace(
        created._id.toString(),
        '1h',
      );

      // 1 hour = 3600000 ms
      expect(extended.expiresAt.getTime()).toBe(originalExpiration + 3600000);
    });

    it('should extend workspace expiration by minutes', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });
      const originalExpiration = created.expiresAt.getTime();

      const extended = await service.extendWorkspace(
        created._id.toString(),
        '30m',
      );

      // 30 minutes = 1800000 ms
      expect(extended.expiresAt.getTime()).toBe(originalExpiration + 1800000);
    });

    it('should throw for non-existent workspace', async () => {
      await expect(
        service.extendWorkspace(
          new mongoose.Types.ObjectId().toString(),
          '1h',
        ),
      ).rejects.toThrow('not found');
    });
  });

  describe('executeInWorkspace', () => {
    it('should execute command in running workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      const result = await service.executeInWorkspace(
        created._id.toString(),
        'echo hello',
      );

      expect(result).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it('should throw for non-running workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });
      await service.pauseWorkspace(created._id.toString());

      await expect(
        service.executeInWorkspace(created._id.toString(), 'echo hello'),
      ).rejects.toThrow('not running');
    });

    it('should throw for non-existent workspace', async () => {
      await expect(
        service.executeInWorkspace(
          new mongoose.Types.ObjectId().toString(),
          'echo hello',
        ),
      ).rejects.toThrow('not found');
    });

    it('should update lastActivityAt on execution', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      // Small delay to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await service.executeInWorkspace(created._id.toString(), 'echo hello');

      const updated = await service.getWorkspace(created._id.toString());
      expect(updated!.lastActivityAt!.getTime()).toBeGreaterThanOrEqual(
        created.lastActivityAt!.getTime(),
      );
    });
  });

  describe('getWorkspaceStats', () => {
    it('should return workspace statistics', async () => {
      await service.createWorkspace('user-1', { projectId: 'p1' });
      await service.createWorkspace('user-2', { projectId: 'p2' });

      const stats = await service.getWorkspaceStats();

      expect(stats.total).toBe(2);
      expect(stats.running).toBe(2);
      expect(stats.paused).toBe(0);
      expect(stats.byUser['user-1']).toBe(1);
      expect(stats.byUser['user-2']).toBe(1);
    });

    it('should count paused workspaces correctly', async () => {
      const ws1 = await service.createWorkspace('user-1', { projectId: 'p1' });
      await service.createWorkspace('user-1', { projectId: 'p2' });
      await service.pauseWorkspace(ws1._id.toString());

      const stats = await service.getWorkspaceStats();

      expect(stats.total).toBe(2);
      expect(stats.running).toBe(1);
      expect(stats.paused).toBe(1);
    });

    it('should return empty stats when no workspaces', async () => {
      const stats = await service.getWorkspaceStats();

      expect(stats.total).toBe(0);
      expect(stats.running).toBe(0);
      expect(stats.paused).toBe(0);
      expect(Object.keys(stats.byUser).length).toBe(0);
    });
  });

  describe('cleanupExpiredWorkspaces', () => {
    it('should clean up expired workspaces', async () => {
      // Create a workspace and manually set it as expired
      const workspace = await service.createWorkspace('user-1', {
        projectId: 'p1',
      });

      // Manually expire it by setting expiresAt to past
      await workspaceModel.findByIdAndUpdate(workspace._id, {
        expiresAt: new Date(Date.now() - 1000),
      });

      const cleaned = await service.cleanupExpiredWorkspaces();

      expect(cleaned).toBe(1);

      const remaining = await service.getWorkspace(workspace._id.toString());
      expect(remaining).toBeNull();
    });

    it('should not clean up non-expired workspaces', async () => {
      await service.createWorkspace('user-1', { projectId: 'p1' });

      const cleaned = await service.cleanupExpiredWorkspaces();

      expect(cleaned).toBe(0);
    });

    it('should handle no expired workspaces', async () => {
      const cleaned = await service.cleanupExpiredWorkspaces();

      expect(cleaned).toBe(0);
    });
  });
});