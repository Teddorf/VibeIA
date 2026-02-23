import { Injectable, Inject, Logger } from '@nestjs/common';
import { EXECUTION_PLAN_REPOSITORY } from '../providers/repository-tokens';
import { IRepository } from '../providers/interfaces/database-provider.interface';
import { ExecutionPlan } from '../entities/execution-plan.schema';
import { EventsGateway } from '../modules/events/events.gateway';
import { Planner, CreatePlanOptions } from './planner';
import { Scheduler } from './scheduler';
import { ResultEvaluator } from './result-evaluator';
import { TraceContext } from '../observability/trace';
import { generateTraceId } from '../observability/trace';
import { AgentOutput } from '../agents/protocol';
import { DecisionCache } from '../optimization/decision-cache';
import { CostTracker } from '../optimization/cost-tracker';
import { PromptCompiler } from '../optimization/prompt-compiler';

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly planner: Planner,
    private readonly scheduler: Scheduler,
    private readonly resultEvaluator: ResultEvaluator,
    private readonly traceContext: TraceContext,
    private readonly eventsGateway: EventsGateway,
    private readonly decisionCache: DecisionCache,
    private readonly costTracker: CostTracker,
    private readonly promptCompiler: PromptCompiler,
    @Inject(EXECUTION_PLAN_REPOSITORY)
    private readonly planRepo: IRepository<ExecutionPlan>,
  ) {}

  async executeIntent(
    intent: string,
    projectId: string,
    options: CreatePlanOptions,
  ): Promise<ExecutionPlan> {
    const traceId = generateTraceId();
    return this.traceContext.runWithTraceId(traceId, async () => {
      this.logger.log(`[${traceId}] Executing intent: "${intent}"`);

      // Check budget before planning
      const budgetCheck = await this.costTracker.checkBudget(projectId, 0);
      if (!budgetCheck.allowed) {
        throw new Error(
          `Budget exceeded for project ${projectId}: ` +
            `$${budgetCheck.currentSpend.toFixed(2)} / $${budgetCheck.budgetLimit}`,
        );
      }

      const plan = await this.planner.createPlan(intent, projectId, options);
      const planId = (plan as any)._id?.toString() ?? (plan as any).id;

      this.emitPipelineEvent(planId, 'plan_created', {
        nodeCount: plan.dag.length,
        estimatedCost: plan.estimatedCost,
      });

      return plan;
    });
  }

  async approvePlan(planId: string): Promise<ExecutionPlan> {
    const plan = await this.planRepo.findById(planId);
    if (!plan) throw new Error(`Plan '${planId}' not found`);
    if ((plan as any).status !== 'pending_approval') {
      throw new Error(`Plan is not in pending_approval state`);
    }

    await this.planRepo.update(planId, {
      status: 'approved',
      approvedAt: new Date(),
    });

    this.logger.log(`Plan ${planId} approved, starting execution`);
    return this.startExecution(planId);
  }

  async startExecution(planId: string): Promise<ExecutionPlan> {
    const traceId = this.traceContext.getTraceId();
    await this.planRepo.update(planId, { status: 'executing' });

    this.emitPipelineEvent(planId, 'execution_started', {});
    await this.scheduler.dispatch(planId, traceId);

    const plan = await this.planRepo.findById(planId);
    return plan!;
  }

  async handleAgentComplete(
    planId: string,
    nodeId: string,
    output: AgentOutput,
  ): Promise<void> {
    this.logger.log(
      `[${output.traceId}] Agent ${output.agentId} completed node ${nodeId}`,
    );

    // Evaluate result
    const plan = await this.planRepo.findById(planId);
    if (!plan) return;

    const node = plan.dag.find((n) => n.nodeId === nodeId);
    if (!node) return;

    const evaluation = await this.resultEvaluator.evaluate(
      output,
      node.taskDefinition as any,
    );

    if (!evaluation.passed) {
      this.logger.warn(
        `Node ${nodeId} evaluation failed: ${evaluation.issues.join(', ')}`,
      );
      this.emitPipelineEvent(planId, 'node_evaluation_failed', {
        nodeId,
        issues: evaluation.issues,
      });
    }

    const { planComplete } = await this.scheduler.onNodeComplete(
      planId,
      nodeId,
      output,
    );

    this.emitPipelineEvent(planId, 'node_completed', {
      nodeId,
      agentId: output.agentId,
      metrics: output.metrics,
    });

    // Track cost for completed agent execution
    if (output.metrics) {
      await this.costTracker.trackCost({
        projectId: plan.projectId,
        pipelineId: planId,
        taskId: output.taskId,
        agentId: output.agentId,
        traceId: output.traceId,
        metrics: output.metrics as any,
      } as any);
    }

    if (planComplete) {
      this.emitPipelineEvent(planId, 'pipeline_completed', {
        totalNodes: plan.dag.length,
      });
    }
  }

  async handleAgentFail(
    planId: string,
    nodeId: string,
    error: string,
  ): Promise<void> {
    this.logger.error(`Node ${nodeId} failed: ${error}`);
    await this.scheduler.onNodeFail(planId, nodeId, error);

    this.emitPipelineEvent(planId, 'node_failed', { nodeId, error });
  }

  async cancelPlan(planId: string): Promise<void> {
    await this.planRepo.update(planId, { status: 'cancelled' });
    this.emitPipelineEvent(planId, 'pipeline_cancelled', {});
    this.logger.log(`Plan ${planId} cancelled`);
  }

  async getPlan(planId: string): Promise<ExecutionPlan | null> {
    return this.planRepo.findById(planId);
  }

  private emitPipelineEvent(
    planId: string,
    type: string,
    data: Record<string, any>,
  ): void {
    try {
      this.eventsGateway.emitExecutionEvent(planId, {
        type: type as any,
        planId,
        timestamp: new Date(),
        data,
      });
    } catch {
      // Gateway may not be initialized in tests
    }
  }
}
