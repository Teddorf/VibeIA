import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { createRepositoryProvider } from '../providers/repository-providers.factory';
import { ExecutionPlanRepositoryAdapter } from '../providers/adapters/execution-plan-repository.adapter';
import { AgentExecutionRepositoryAdapter } from '../providers/adapters/agent-execution-repository.adapter';
import { AgentContextRepositoryAdapter } from '../providers/adapters/agent-context-repository.adapter';
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
import { QualityGatesModule } from '../modules/quality-gates/quality-gates.module';
import { AgentRegistry } from './registry/agent-registry';
import { ContextStoreService } from './context/context-store.service';
import { ContextCompiler } from './context/context-compiler';
import { CoderAgent } from './coder/coder-agent';
import { ReviewerAgent } from './reviewer/reviewer-agent';
import { DevOpsAgent } from './devops/devops-agent';
import { AnalystAgent } from './analyst/analyst-agent';
import { ArchitectAgent } from './architect/architect-agent';
import { TesterAgent } from './tester/tester-agent';
import { DocAgent } from './doc/doc-agent';
import { FixerAgent } from './fixer/fixer-agent';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ExecutionPlan.name, schema: ExecutionPlanSchema },
      { name: AgentExecution.name, schema: AgentExecutionSchema },
      { name: ContextEntryEntity.name, schema: ContextEntrySchema },
      { name: WorkerPoolConfig.name, schema: WorkerPoolConfigSchema },
      { name: AgentProfileEntity.name, schema: AgentProfileSchema },
    ]),
    QualityGatesModule,
  ],
  providers: [
    {
      provide: EXECUTION_PLAN_REPOSITORY,
      useClass: ExecutionPlanRepositoryAdapter,
    },
    {
      provide: AGENT_EXECUTION_REPOSITORY,
      useClass: AgentExecutionRepositoryAdapter,
    },
    {
      provide: AGENT_CONTEXT_REPOSITORY,
      useClass: AgentContextRepositoryAdapter,
    },
    createRepositoryProvider(
      WORKER_POOL_CONFIG_REPOSITORY,
      WorkerPoolConfig.name,
    ),
    createRepositoryProvider(AGENT_PROFILE_REPOSITORY, AgentProfileEntity.name),
    AgentRegistry,
    ContextStoreService,
    ContextCompiler,
    CoderAgent,
    ReviewerAgent,
    DevOpsAgent,
    AnalystAgent,
    ArchitectAgent,
    TesterAgent,
    DocAgent,
    FixerAgent,
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
    CoderAgent,
    ReviewerAgent,
    DevOpsAgent,
    AnalystAgent,
    ArchitectAgent,
    TesterAgent,
    DocAgent,
    FixerAgent,
  ],
})
export class AgentsModule implements OnModuleInit {
  constructor(
    private readonly registry: AgentRegistry,
    private readonly coderAgent: CoderAgent,
    private readonly reviewerAgent: ReviewerAgent,
    private readonly devOpsAgent: DevOpsAgent,
    private readonly analystAgent: AnalystAgent,
    private readonly architectAgent: ArchitectAgent,
    private readonly testerAgent: TesterAgent,
    private readonly docAgent: DocAgent,
    private readonly fixerAgent: FixerAgent,
  ) {}

  onModuleInit() {
    this.registry.register(this.coderAgent);
    this.registry.register(this.reviewerAgent);
    this.registry.register(this.devOpsAgent);
    this.registry.register(this.analystAgent);
    this.registry.register(this.architectAgent);
    this.registry.register(this.testerAgent);
    this.registry.register(this.docAgent);
    this.registry.register(this.fixerAgent);
  }
}
