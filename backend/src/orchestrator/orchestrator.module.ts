import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { QualityGatesModule } from '../modules/quality-gates/quality-gates.module';
import { EventsModule } from '../modules/events/events.module';
import { OptimizationModule } from '../optimization/optimization.module';
import { ModelRouter } from './model-router';
import { Planner } from './planner';
import { Scheduler } from './scheduler';
import { ResultEvaluator } from './result-evaluator';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';
import { WorkerPoolManager } from './worker-pool-manager';
import { WorkerPoolController } from './worker-pool.controller';
import { AgentJobRunner } from './agent-job-runner';
import { TraceContext } from '../observability/trace';
import { StructuredLogger } from '../observability/structured-logger';

@Module({
  imports: [AgentsModule, QualityGatesModule, EventsModule, OptimizationModule],
  providers: [
    ModelRouter,
    Planner,
    Scheduler,
    ResultEvaluator,
    OrchestratorService,
    WorkerPoolManager,
    AgentJobRunner,
    TraceContext,
    StructuredLogger,
  ],
  controllers: [OrchestratorController, WorkerPoolController],
  exports: [
    OrchestratorService,
    Planner,
    Scheduler,
    ModelRouter,
    WorkerPoolManager,
    AgentJobRunner,
    TraceContext,
    StructuredLogger,
  ],
})
export class OrchestratorModule {}
