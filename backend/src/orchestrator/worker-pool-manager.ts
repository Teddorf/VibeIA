import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  QUEUE_PROVIDER,
  CACHE_PROVIDER,
  VIBE_CONFIG,
} from '../providers/tokens';
import {
  IQueueProvider,
  IQueue,
} from '../providers/interfaces/queue-provider.interface';
import { ICacheProvider } from '../providers/interfaces/cache-provider.interface';
import { AgentRegistry } from '../agents/registry/agent-registry';
import { VibeConfig } from '../config/vibe-config';
import { AgentJobData } from '../agents/protocol';

export interface PoolStatus {
  agentId: string;
  depth: number;
  activeCount: number;
  maxWorkers: number;
  paused: boolean;
}

@Injectable()
export class WorkerPoolManager {
  private readonly logger = new Logger(WorkerPoolManager.name);
  private readonly pools = new Map<
    string,
    {
      queue: IQueue<AgentJobData>;
      maxWorkers: number;
      activeCount: number;
      paused: boolean;
    }
  >();

  constructor(
    @Inject(QUEUE_PROVIDER) private readonly queueProvider: IQueueProvider,
    @Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider,
    private readonly agentRegistry: AgentRegistry,
    @Inject(VIBE_CONFIG) private readonly config: VibeConfig,
  ) {}

  async setupAgentQueue(
    agentId: string,
    maxWorkers: number = this.config.workers.maxPerAgent,
  ): Promise<void> {
    const queue = this.queueProvider.getQueue<AgentJobData>(`agent:${agentId}`);
    queue.setConcurrency(maxWorkers);

    this.pools.set(agentId, {
      queue,
      maxWorkers,
      activeCount: 0,
      paused: false,
    });

    this.logger.log(
      `Queue setup for agent ${agentId} (max workers: ${maxWorkers})`,
    );
  }

  async updateWorkerCount(agentId: string, newCount: number): Promise<void> {
    const pool = this.pools.get(agentId);
    if (!pool) {
      throw new Error(`No pool found for agent '${agentId}'`);
    }

    const totalActive = this.getTotalActiveWorkers();
    const delta = newCount - pool.maxWorkers;

    if (totalActive + delta > this.config.workers.totalMax) {
      throw new Error(
        `Cannot increase workers: total would exceed ${this.config.workers.totalMax}`,
      );
    }

    pool.maxWorkers = newCount;
    this.logger.log(`Updated worker count for ${agentId}: ${newCount}`);
  }

  async getPoolStatus(agentId: string): Promise<PoolStatus> {
    const pool = this.pools.get(agentId);
    if (!pool) {
      return {
        agentId,
        depth: 0,
        activeCount: 0,
        maxWorkers: this.config.workers.maxPerAgent,
        paused: false,
      };
    }

    const waiting = await pool.queue.getWaiting();
    const active = await pool.queue.getActive();

    return {
      agentId,
      depth: waiting.length,
      activeCount: active.length,
      maxWorkers: pool.maxWorkers,
      paused: pool.paused,
    };
  }

  async getAllPoolStatuses(): Promise<PoolStatus[]> {
    const statuses: PoolStatus[] = [];
    for (const agentId of this.pools.keys()) {
      statuses.push(await this.getPoolStatus(agentId));
    }
    return statuses;
  }

  async pauseQueue(agentId: string): Promise<void> {
    const pool = this.pools.get(agentId);
    if (pool) {
      pool.paused = true;
      this.logger.log(`Paused queue for agent ${agentId}`);
    }
  }

  async resumeQueue(agentId: string): Promise<void> {
    const pool = this.pools.get(agentId);
    if (pool) {
      pool.paused = false;
      this.logger.log(`Resumed queue for agent ${agentId}`);
    }
  }

  async trackContextAffinity(
    agentId: string,
    workerId: string,
    moduleKey: string,
  ): Promise<void> {
    const key = `affinity:${agentId}:${moduleKey}`;
    await this.cache.set(key, workerId, 5 * 60 * 1000);
  }

  async getPreferredWorker(
    agentId: string,
    moduleKey: string,
  ): Promise<string | null> {
    const key = `affinity:${agentId}:${moduleKey}`;
    return this.cache.get<string>(key);
  }

  private getTotalActiveWorkers(): number {
    let total = 0;
    for (const pool of this.pools.values()) {
      total += pool.activeCount;
    }
    return total;
  }
}
