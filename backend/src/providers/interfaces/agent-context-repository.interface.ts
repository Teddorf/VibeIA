import { IRepository } from './database-provider.interface';
import { ContextEntryEntity } from '../../entities/context-entry.schema';
import { ContextType, CompiledContext } from '../../agents/protocol';

export interface IAgentContextRepository extends IRepository<ContextEntryEntity> {
  findByProjectAndTags(
    projectId: string,
    tags: string[],
  ): Promise<ContextEntryEntity[]>;
  findByProjectAndType(
    projectId: string,
    type: ContextType,
  ): Promise<ContextEntryEntity[]>;
  invalidateByPipeline(pipelineId: string): Promise<{ modifiedCount: number }>;
  compileForAgent(
    projectId: string,
    agentId: string,
    tokenBudget: number,
  ): Promise<CompiledContext>;
}
