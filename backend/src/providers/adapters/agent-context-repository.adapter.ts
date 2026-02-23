import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { MongooseRepository } from './mongoose-repository.adapter';
import { ContextEntryEntity } from '../../entities/context-entry.schema';
import { IAgentContextRepository } from '../interfaces/agent-context-repository.interface';
import {
  ContextType,
  CompiledContext,
  ContextEntry,
} from '../../agents/protocol';

@Injectable()
export class AgentContextRepositoryAdapter
  extends MongooseRepository<ContextEntryEntity>
  implements IAgentContextRepository
{
  constructor(
    @InjectModel(ContextEntryEntity.name)
    model: Model<ContextEntryEntity & Document>,
  ) {
    super(model);
  }

  async findByProjectAndTags(
    projectId: string,
    tags: string[],
  ): Promise<ContextEntryEntity[]> {
    return this.find({ projectId, tags: { $in: tags } });
  }

  async findByProjectAndType(
    projectId: string,
    type: ContextType,
  ): Promise<ContextEntryEntity[]> {
    return this.find({ projectId, type });
  }

  async invalidateByPipeline(
    pipelineId: string,
  ): Promise<{ modifiedCount: number }> {
    return this.updateMany(
      { pipelineId },
      { $set: { supersededBy: 'invalidated' } },
    );
  }

  async compileForAgent(
    projectId: string,
    agentId: string,
    tokenBudget: number,
  ): Promise<CompiledContext> {
    const entries = await this.find(
      { projectId, supersededBy: { $exists: false } },
      { sort: { tokenCount: 1 } },
    );

    let tokenCount = 0;
    const selected: ContextEntry[] = [];
    for (const entry of entries) {
      if (tokenCount + entry.tokenCount > tokenBudget) break;
      tokenCount += entry.tokenCount;
      selected.push(entry as unknown as ContextEntry);
    }

    const global = selected.filter((e) => e.scope === 'global');
    const domainSpecific = selected.filter((e) => e.scope === 'domain');
    const taskSpecific = selected.filter((e) => e.scope === 'task');

    return {
      entries: selected,
      tokenBudget,
      tokenCount,
      compiledAt: new Date(),
      cacheKey: `${projectId}:${agentId}:${Date.now()}`,
      scope: { global, domainSpecific, taskSpecific },
    };
  }
}
