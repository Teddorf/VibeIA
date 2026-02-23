import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_PROVIDER } from '../providers/tokens';
import { ICacheProvider } from '../providers/interfaces/cache-provider.interface';
import { AgentOutput } from '../agents/protocol';
import { createHash } from 'crypto';

const DEFAULT_DECISION_TTL_MS = 10 * 60 * 1000; // 10 minutes

@Injectable()
export class DecisionCache {
  private readonly logger = new Logger(DecisionCache.name);

  constructor(@Inject(CACHE_PROVIDER) private readonly cache: ICacheProvider) {}

  buildKey(agentId: string, taskType: string, contextHash: string): string {
    const raw = `${agentId}:${taskType}:${contextHash}`;
    return `decision:${createHash('sha256').update(raw).digest('hex').slice(0, 16)}`;
  }

  computeContextHash(context: unknown): string {
    const str = JSON.stringify(context);
    return createHash('sha256').update(str).digest('hex').slice(0, 16);
  }

  async getCachedDecision(key: string): Promise<AgentOutput | null> {
    const cached = await this.cache.get<AgentOutput>(key);
    if (cached) {
      this.logger.log(`Decision cache HIT: ${key}`);
    }
    return cached;
  }

  async cacheDecision(
    key: string,
    output: AgentOutput,
    ttlMs: number = DEFAULT_DECISION_TTL_MS,
  ): Promise<void> {
    await this.cache.set(key, output, ttlMs);
    this.logger.debug(`Decision cached: ${key} (TTL: ${ttlMs}ms)`);
  }

  async invalidate(key: string): Promise<void> {
    await this.cache.del(key);
  }
}
