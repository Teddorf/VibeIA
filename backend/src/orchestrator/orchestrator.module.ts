import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { QualityGatesModule } from '../modules/quality-gates/quality-gates.module';
import { EventsModule } from '../modules/events/events.module';
import { ModelRouter } from './model-router';
import { Planner } from './planner';
import { Scheduler } from './scheduler';
import { ResultEvaluator } from './result-evaluator';
import { OrchestratorService } from './orchestrator.service';
import { OrchestratorController } from './orchestrator.controller';
import { TraceContext } from '../observability/trace';
import { StructuredLogger } from '../observability/structured-logger';

@Module({
  imports: [AgentsModule, QualityGatesModule, EventsModule],
  providers: [
    ModelRouter,
    Planner,
    Scheduler,
    ResultEvaluator,
    OrchestratorService,
    TraceContext,
    StructuredLogger,
  ],
  controllers: [OrchestratorController],
  exports: [
    OrchestratorService,
    Planner,
    Scheduler,
    ModelRouter,
    TraceContext,
    StructuredLogger,
  ],
})
export class OrchestratorModule {}
