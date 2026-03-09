import { Injectable, Inject } from '@nestjs/common';
import { AGENT_CONTEXT_REPOSITORY } from '../../providers/repository-tokens';
import { IRepository } from '../../providers/interfaces/database-provider.interface';
import { ContextEntryEntity } from '../../entities/context-entry.schema';
import { ContextType, ContextScope } from '../protocol';

@Injectable()
export class ContextStoreService {
  constructor(
    @Inject(AGENT_CONTEXT_REPOSITORY)
    private readonly contextRepo: IRepository<ContextEntryEntity>,
  ) {}

  async create(
    entry: Partial<ContextEntryEntity>,
  ): Promise<ContextEntryEntity> {
    return this.contextRepo.create(entry);
  }

  async findById(id: string): Promise<ContextEntryEntity | null> {
    return this.contextRepo.findById(id);
  }

  async findByProject(projectId: string): Promise<ContextEntryEntity[]> {
    return this.contextRepo.find({
      projectId,
      supersededBy: { $exists: false },
    });
  }

  async findByProjectAndTags(
    projectId: string,
    tags: string[],
    scope?: ContextScope,
  ): Promise<ContextEntryEntity[]> {
    const filter: Record<string, unknown> = {
      projectId,
      tags: { $in: tags },
      supersededBy: { $exists: false },
    };
    if (scope) {
      filter.scope = scope;
    }
    return this.contextRepo.find(filter);
  }

  async findByProjectAndType(
    projectId: string,
    type: ContextType,
  ): Promise<ContextEntryEntity[]> {
    return this.contextRepo.find({
      projectId,
      type,
      supersededBy: { $exists: false },
    });
  }

  async invalidateByPipeline(pipelineId: string): Promise<number> {
    const result = await this.contextRepo.updateMany(
      { pipelineId, supersededBy: { $exists: false } },
      { supersededBy: 'invalidated' },
    );
    return result.modifiedCount;
  }

  async update(
    id: string,
    data: Partial<ContextEntryEntity>,
  ): Promise<ContextEntryEntity | null> {
    return this.contextRepo.update(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.contextRepo.delete(id);
  }
}
