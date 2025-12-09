import { Injectable, Logger } from '@nestjs/common';
import {
  Workspace,
  WorkspaceConfig,
  WorkspaceStatus,
  CreateWorkspaceDto,
} from './dto/security.dto';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);
  private workspaces: Map<string, Workspace> = new Map();

  private readonly defaultConfig: WorkspaceConfig = {
    base: 'ubuntu:22.04',
    tools: ['git', 'node', 'npm', 'python'],
    resources: {
      cpu: 2,
      memory: '4GB',
      disk: '10GB',
    },
    network: 'isolated',
    lifetime: '3h',
    autoDestroy: true,
  };

  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<Workspace> {
    const workspaceId = this.generateWorkspaceId();
    const config = { ...this.defaultConfig, ...dto.config };

    const workspace: Workspace = {
      id: workspaceId,
      userId,
      projectId: dto.projectId,
      config,
      status: WorkspaceStatus.CREATING,
      createdAt: new Date(),
      expiresAt: this.calculateExpiration(config.lifetime),
      lastActivityAt: new Date(),
    };

    this.workspaces.set(workspaceId, workspace);

    try {
      const containerId = await this.spawnContainer(workspace);
      workspace.containerId = containerId;
      workspace.status = WorkspaceStatus.RUNNING;

      this.logger.log(`Workspace ${workspaceId} created for user ${userId}`);

      if (config.autoDestroy) {
        this.scheduleDestruction(workspaceId, config.lifetime);
      }

      return workspace;
    } catch (error) {
      workspace.status = WorkspaceStatus.ERROR;
      this.logger.error(`Failed to create workspace: ${error}`);
      throw error;
    }
  }

  async getWorkspace(workspaceId: string): Promise<Workspace | null> {
    return this.workspaces.get(workspaceId) || null;
  }

  async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    const workspaces: Workspace[] = [];
    this.workspaces.forEach((workspace) => {
      if (workspace.userId === userId) {
        workspaces.push(workspace);
      }
    });
    return workspaces;
  }

  async pauseWorkspace(workspaceId: string): Promise<Workspace> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    if (workspace.status !== WorkspaceStatus.RUNNING) {
      throw new Error(`Cannot pause workspace in ${workspace.status} state`);
    }

    await this.pauseContainer(workspace.containerId!);
    workspace.status = WorkspaceStatus.PAUSED;
    workspace.lastActivityAt = new Date();

    this.logger.log(`Workspace ${workspaceId} paused`);
    return workspace;
  }

  async resumeWorkspace(workspaceId: string): Promise<Workspace> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    if (workspace.status !== WorkspaceStatus.PAUSED) {
      throw new Error(`Cannot resume workspace in ${workspace.status} state`);
    }

    await this.resumeContainer(workspace.containerId!);
    workspace.status = WorkspaceStatus.RUNNING;
    workspace.lastActivityAt = new Date();

    this.logger.log(`Workspace ${workspaceId} resumed`);
    return workspace;
  }

  async destroyWorkspace(workspaceId: string): Promise<void> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return;
    }

    workspace.status = WorkspaceStatus.DESTROYING;

    try {
      if (workspace.containerId) {
        await this.destroyContainer(workspace.containerId);
      }
      workspace.status = WorkspaceStatus.DESTROYED;
      this.workspaces.delete(workspaceId);

      this.logger.log(`Workspace ${workspaceId} destroyed`);
    } catch (error) {
      workspace.status = WorkspaceStatus.ERROR;
      this.logger.error(`Failed to destroy workspace: ${error}`);
      throw error;
    }
  }

  async extendWorkspace(workspaceId: string, duration: string): Promise<Workspace> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const extension = this.parseDuration(duration);
    workspace.expiresAt = new Date(workspace.expiresAt.getTime() + extension);
    workspace.lastActivityAt = new Date();

    this.logger.log(`Workspace ${workspaceId} extended by ${duration}`);
    return workspace;
  }

  async executeInWorkspace(
    workspaceId: string,
    command: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    if (workspace.status !== WorkspaceStatus.RUNNING) {
      throw new Error(`Workspace is not running`);
    }

    workspace.lastActivityAt = new Date();

    return this.execInContainer(workspace.containerId!, command);
  }

  getWorkspaceStats(): {
    total: number;
    running: number;
    paused: number;
    byUser: Record<string, number>;
  } {
    const stats = {
      total: 0,
      running: 0,
      paused: 0,
      byUser: {} as Record<string, number>,
    };

    this.workspaces.forEach((workspace) => {
      stats.total++;
      if (workspace.status === WorkspaceStatus.RUNNING) stats.running++;
      if (workspace.status === WorkspaceStatus.PAUSED) stats.paused++;

      stats.byUser[workspace.userId] = (stats.byUser[workspace.userId] || 0) + 1;
    });

    return stats;
  }

  async cleanupExpiredWorkspaces(): Promise<number> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, workspace] of this.workspaces) {
      if (workspace.expiresAt < now) {
        await this.destroyWorkspace(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired workspaces`);
    }

    return cleaned;
  }

  private generateWorkspaceId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateExpiration(lifetime: string): Date {
    const ms = this.parseDuration(lifetime);
    return new Date(Date.now() + ms);
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)(h|m|s)$/);
    if (!match) {
      return 3 * 60 * 60 * 1000;
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'h':
        return value * 60 * 60 * 1000;
      case 'm':
        return value * 60 * 1000;
      case 's':
        return value * 1000;
      default:
        return 3 * 60 * 60 * 1000;
    }
  }

  private scheduleDestruction(workspaceId: string, lifetime: string): void {
    const ms = this.parseDuration(lifetime);
    setTimeout(() => {
      this.destroyWorkspace(workspaceId).catch((err) => {
        this.logger.error(`Failed to auto-destroy workspace ${workspaceId}: ${err}`);
      });
    }, ms);
  }

  private async spawnContainer(workspace: Workspace): Promise<string> {
    this.logger.debug(`Spawning container for workspace ${workspace.id}`);
    return `container-${workspace.id}`;
  }

  private async pauseContainer(containerId: string): Promise<void> {
    this.logger.debug(`Pausing container ${containerId}`);
  }

  private async resumeContainer(containerId: string): Promise<void> {
    this.logger.debug(`Resuming container ${containerId}`);
  }

  private async destroyContainer(containerId: string): Promise<void> {
    this.logger.debug(`Destroying container ${containerId}`);
  }

  private async execInContainer(
    containerId: string,
    command: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    this.logger.debug(`Executing in ${containerId}: ${command}`);
    return { stdout: '', stderr: '', exitCode: 0 };
  }
}
