import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { createRepositoryProvider } from '../providers/repository-providers.factory';
import {
  EXECUTION_PLAN_REPOSITORY,
  AGENT_EXECUTION_REPOSITORY,
  AGENT_CONTEXT_REPOSITORY,
  WORKER_POOL_CONFIG_REPOSITORY,
  AGENT_PROFILE_REPOSITORY,
} from '../providers/repository-tokens';
import {
  ExecutionPlan,
  ExecutionPlanSchema,
} from '../entities/execution-plan.schema';
import {
  AgentExecution,
  AgentExecutionSchema,
} from '../entities/agent-execution.schema';
import {
  ContextEntryEntity,
  ContextEntrySchema,
} from '../entities/context-entry.schema';
import {
  WorkerPoolConfig,
  WorkerPoolConfigSchema,
} from '../entities/worker-pool-config.schema';
import {
  AgentProfileEntity,
  AgentProfileSchema,
} from '../entities/agent-profile.schema';
import { AgentRegistry } from './registry/agent-registry';
import { ContextStoreService } from './context/context-store.service';
import { ContextCompiler } from './context/context-compiler';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExecutionPlan.name, schema: ExecutionPlanSchema },
      { name: AgentExecution.name, schema: AgentExecutionSchema },
      { name: ContextEntryEntity.name, schema: ContextEntrySchema },
      { name: WorkerPoolConfig.name, schema: WorkerPoolConfigSchema },
      { name: AgentProfileEntity.name, schema: AgentProfileSchema },
    ]),
  ],
  providers: [
    createRepositoryProvider(EXECUTION_PLAN_REPOSITORY, ExecutionPlan.name),
    createRepositoryProvider(AGENT_EXECUTION_REPOSITORY, AgentExecution.name),
    createRepositoryProvider(AGENT_CONTEXT_REPOSITORY, ContextEntryEntity.name),
    createRepositoryProvider(
      WORKER_POOL_CONFIG_REPOSITORY,
      WorkerPoolConfig.name,
    ),
    createRepositoryProvider(AGENT_PROFILE_REPOSITORY, AgentProfileEntity.name),
    AgentRegistry,
    ContextStoreService,
    ContextCompiler,
  ],
  exports: [
    EXECUTION_PLAN_REPOSITORY,
    AGENT_EXECUTION_REPOSITORY,
    AGENT_CONTEXT_REPOSITORY,
    WORKER_POOL_CONFIG_REPOSITORY,
    AGENT_PROFILE_REPOSITORY,
    AgentRegistry,
    ContextStoreService,
    ContextCompiler,
  ],
})
export class AgentsModule {}
