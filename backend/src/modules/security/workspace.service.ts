import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workspace, WorkspaceDocument, WorkspaceStatus, WorkspaceSize } from './schemas/workspace.schema';
import {
  CreateWorkspaceDto,
  WorkspaceConfig,
} from './dto/security.dto';

@Injectable()
export class WorkspaceService {
  private readonly logger = new Logger(WorkspaceService.name);

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

  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<WorkspaceDocument>,
  ) {}

  async createWorkspace(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceDocument> {
    const config = { ...this.defaultConfig, ...dto.config };

    const workspace = new this.workspaceModel({
      userId,
      name: dto.name || `Workspace ${Date.now()}`,
      projectId: dto.projectId,
      status: WorkspaceStatus.CREATING,
      size: WorkspaceSize.SMALL,
      resources: {
        cpu: this.parseResourceCpu(config.resources?.cpu),
        memory: this.parseResourceMemory(config.resources?.memory),
        disk: this.parseResourceDisk(config.resources?.disk),
      },
      expiresAt: this.calculateExpiration(config.lifetime),
      lastActivityAt: new Date(),
      metadata: { config },
    });

    const saved = await workspace.save();

    try {
      const containerId = await this.spawnContainer(saved);

      await this.workspaceModel
        .findByIdAndUpdate(saved._id, {
          containerId,
          status: WorkspaceStatus.RUNNING,
          startedAt: new Date(),
        })
        .exec();

      this.logger.log(`Workspace ${saved._id} created for user ${userId}`);

      if (config.autoDestroy) {
        this.scheduleDestruction(saved._id.toString(), config.lifetime);
      }

      return (await this.workspaceModel.findById(saved._id).exec())!;
    } catch (error) {
      await this.workspaceModel
        .findByIdAndUpdate(saved._id, { status: WorkspaceStatus.ERROR })
        .exec();
      this.logger.error(`Failed to create workspace: ${error}`);
      throw error;
    }
  }

  async getWorkspace(workspaceId: string): Promise<WorkspaceDocument | null> {
    try {
      return await this.workspaceModel.findById(workspaceId).exec();
    } catch {
      return null;
    }
  }

  async getUserWorkspaces(userId: string): Promise<WorkspaceDocument[]> {
    return this.workspaceModel.find({ userId }).exec();
  }

  async pauseWorkspace(workspaceId: string): Promise<WorkspaceDocument> {
    const workspace = await this.workspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    if (workspace.status !== WorkspaceStatus.RUNNING) {
      throw new Error(`Cannot pause workspace in ${workspace.status} state`);
    }

    await this.pauseContainer(workspace.containerId!);

    const updated = await this.workspaceModel
      .findByIdAndUpdate(
        workspaceId,
        {
          status: WorkspaceStatus.PAUSED,
          lastActivityAt: new Date(),
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Workspace ${workspaceId} paused`);
    return updated!;
  }

  async resumeWorkspace(workspaceId: string): Promise<WorkspaceDocument> {
    const workspace = await this.workspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    if (workspace.status !== WorkspaceStatus.PAUSED) {
      throw new Error(`Cannot resume workspace in ${workspace.status} state`);
    }

    await this.resumeContainer(workspace.containerId!);

    const updated = await this.workspaceModel
      .findByIdAndUpdate(
        workspaceId,
        {
          status: WorkspaceStatus.RUNNING,
          lastActivityAt: new Date(),
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Workspace ${workspaceId} resumed`);
    return updated!;
  }

  async destroyWorkspace(workspaceId: string): Promise<void> {
    const workspace = await this.workspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      return;
    }

    await this.workspaceModel
      .findByIdAndUpdate(workspaceId, { status: WorkspaceStatus.STOPPED })
      .exec();

    try {
      if (workspace.containerId) {
        await this.destroyContainer(workspace.containerId);
      }

      await this.workspaceModel.findByIdAndDelete(workspaceId).exec();

      this.logger.log(`Workspace ${workspaceId} destroyed`);
    } catch (error) {
      await this.workspaceModel
        .findByIdAndUpdate(workspaceId, { status: WorkspaceStatus.ERROR })
        .exec();
      this.logger.error(`Failed to destroy workspace: ${error}`);
      throw error;
    }
  }

  async extendWorkspace(workspaceId: string, duration: string): Promise<WorkspaceDocument> {
    const workspace = await this.workspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const extension = this.parseDuration(duration);
    const newExpiration = new Date(workspace.expiresAt.getTime() + extension);

    const updated = await this.workspaceModel
      .findByIdAndUpdate(
        workspaceId,
        {
          expiresAt: newExpiration,
          lastActivityAt: new Date(),
        },
        { new: true },
      )
      .exec();

    this.logger.log(`Workspace ${workspaceId} extended by ${duration}`);
    return updated!;
  }

  async executeInWorkspace(
    workspaceId: string,
    command: string,
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const workspace = await this.workspaceModel.findById(workspaceId).exec();
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    if (workspace.status !== WorkspaceStatus.RUNNING) {
      throw new Error(`Workspace is not running`);
    }

    await this.workspaceModel
      .findByIdAndUpdate(workspaceId, { lastActivityAt: new Date() })
      .exec();

    return this.execInContainer(workspace.containerId!, command);
  }

  async getWorkspaceStats(): Promise<{
    total: number;
    running: number;
    paused: number;
    byUser: Record<string, number>;
  }> {
    const workspaces = await this.workspaceModel.find().exec();

    const stats = {
      total: 0,
      running: 0,
      paused: 0,
      byUser: {} as Record<string, number>,
    };

    workspaces.forEach((workspace) => {
      stats.total++;
      if (workspace.status === WorkspaceStatus.RUNNING) stats.running++;
      if (workspace.status === WorkspaceStatus.PAUSED) stats.paused++;

      stats.byUser[workspace.userId] = (stats.byUser[workspace.userId] || 0) + 1;
    });

    return stats;
  }

  async cleanupExpiredWorkspaces(): Promise<number> {
    const now = new Date();
    const expiredWorkspaces = await this.workspaceModel
      .find({ expiresAt: { $lt: now }, status: { $ne: WorkspaceStatus.STOPPED } })
      .exec();

    let cleaned = 0;

    for (const workspace of expiredWorkspaces) {
      try {
        await this.destroyWorkspace(workspace._id.toString());
        cleaned++;
      } catch (error) {
        this.logger.error(`Failed to cleanup workspace ${workspace._id}: ${error}`);
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired workspaces`);
    }

    return cleaned;
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

  private parseResourceCpu(cpu: any): number {
    if (typeof cpu === 'number') return cpu;
    return 1;
  }

  private parseResourceMemory(memory: any): number {
    if (typeof memory === 'number') return memory;
    if (typeof memory === 'string') {
      const match = memory.match(/^(\d+)(GB|MB)$/i);
      if (match) {
        const value = parseInt(match[1], 10);
        return match[2].toUpperCase() === 'GB' ? value * 1024 : value;
      }
    }
    return 2048;
  }

  private parseResourceDisk(disk: any): number {
    if (typeof disk === 'number') return disk;
    if (typeof disk === 'string') {
      const match = disk.match(/^(\d+)(GB|MB)$/i);
      if (match) {
        const value = parseInt(match[1], 10);
        return match[2].toUpperCase() === 'GB' ? value : Math.floor(value / 1024);
      }
    }
    return 10;
  }

  private scheduleDestruction(workspaceId: string, lifetime: string): void {
    const ms = this.parseDuration(lifetime);
    setTimeout(() => {
      this.destroyWorkspace(workspaceId).catch((err) => {
        this.logger.error(`Failed to auto-destroy workspace ${workspaceId}: ${err}`);
      });
    }, ms);
  }

  private async spawnContainer(workspace: WorkspaceDocument): Promise<string> {
    this.logger.debug(`Spawning container for workspace ${workspace._id}`);
    return `container-${workspace._id}`;
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
