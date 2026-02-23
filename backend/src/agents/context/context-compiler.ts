import { Injectable, Inject } from '@nestjs/common';
import { AGENT_CONTEXT_REPOSITORY } from '../../providers/repository-tokens';
import { CACHE_PROVIDER } from '../../providers/tokens';
import { IRepository } from '../../providers/interfaces/database-provider.interface';
import { ICacheProvider } from '../../providers/interfaces/cache-provider.interface';
import { ContextEntryEntity } from '../../entities/context-entry.schema';
import { LLM_DEFAULTS } from '../../config/defaults';
import { CompiledContext, ContextEntry, TaskDefinition } from '../protocol';

const CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DEFAULT_TOKEN_BUDGET = 4096;

@Injectable()
export class ContextCompiler {
  constructor(
    @Inject(AGENT_CONTEXT_REPOSITORY)
    private readonly contextRepo: IRepository<ContextEntryEntity>,
    @Inject(CACHE_PROVIDER)
    private readonly cache: ICacheProvider,
  ) {}

  async compile(
    agentId: string,
    task: TaskDefinition,
    pipelineId: string,
    maxTokens?: number,
  ): Promise<CompiledContext> {
    const budget = maxTokens ?? DEFAULT_TOKEN_BUDGET;
    const cacheKey = this.buildCacheKey(agentId, task.id, pipelineId);

    // Check cache first
    const cached = await this.cache.get<CompiledContext>(cacheKey);
    if (cached) {
      return cached;
    }

    // Retrieve all relevant context entries, prioritized by scope
    const taskEntries = await this.contextRepo.find({
      tags: { $in: task.tags },
      scope: 'task',
      supersededBy: { $exists: false },
    });

    const domainEntries = await this.contextRepo.find({
      tags: { $in: task.tags },
      scope: 'domain',
      supersededBy: { $exists: false },
    });

    const globalEntries = await this.contextRepo.find({
      scope: 'global',
      supersededBy: { $exists: false },
    });

    // Priority: task-specific > domain-specific > global
    const allEntries = [...taskEntries, ...domainEntries, ...globalEntries];
    const trimmed = this.trimToTokenBudget(allEntries, budget);
    const tokenCount = trimmed.reduce((sum, e) => sum + (e.tokenCount || 0), 0);
    const entries = trimmed.map((e) => this.toContextEntry(e));

    const compiled: CompiledContext = {
      entries,
      tokenBudget: budget,
      tokenCount,
      compiledAt: new Date(),
      cacheKey,
      scope: this.determineScope(entries),
    };

    await this.cache.set(cacheKey, compiled, CONTEXT_CACHE_TTL_MS);
    return compiled;
  }

  estimateTokens(text: string): number {
    return Math.ceil(text.length / LLM_DEFAULTS.charsPerToken);
  }

  private trimToTokenBudget(
    entries: ContextEntryEntity[],
    budget: number,
  ): ContextEntryEntity[] {
    const result: ContextEntryEntity[] = [];
    let totalTokens = 0;

    for (const entry of entries) {
      const tokens =
        entry.tokenCount || this.estimateTokens(JSON.stringify(entry.content));
      if (totalTokens + tokens > budget) {
        break;
      }
      result.push(entry);
      totalTokens += tokens;
    }

    return result;
  }

  private buildCacheKey(
    agentId: string,
    taskId: string,
    pipelineId: string,
  ): string {
    return `ctx:${agentId}:${taskId}:${pipelineId}`;
  }

  private determineScope(entries: ContextEntry[]): CompiledContext['scope'] {
    return {
      global: entries.filter((e) => e.scope === 'global'),
      domainSpecific: entries.filter((e) => e.scope === 'domain'),
      taskSpecific: entries.filter((e) => e.scope === 'task'),
    };
  }

  private toContextEntry(entity: ContextEntryEntity): ContextEntry {
    const doc = entity as any;
    return {
      id: doc._id?.toString() ?? doc.id ?? '',
      projectId: entity.projectId,
      type: entity.type as ContextEntry['type'],
      scope: entity.scope as ContextEntry['scope'],
      tags: entity.tags,
      content: entity.content,
      tokenCount: entity.tokenCount,
      createdAt: doc.createdAt ?? new Date(),
      updatedAt: doc.updatedAt ?? new Date(),
      createdBy: entity.createdBy,
      supersededBy: entity.supersededBy,
      pipelineId: entity.pipelineId,
    };
  }
}
