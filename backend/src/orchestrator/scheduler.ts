import { Injectable, Inject, Logger } from '@nestjs/common';
import { QUEUE_PROVIDER, VCS_PROVIDER } from '../providers/tokens';
import { EXECUTION_PLAN_REPOSITORY } from '../providers/repository-tokens';
import { IQueueProvider } from '../providers/interfaces/queue-provider.interface';
import { IVCSProvider } from '../providers/interfaces/vcs-provider.interface';
import { IRepository } from '../providers/interfaces/database-provider.interface';
import { ExecutionPlan } from '../entities/execution-plan.schema';
import { AgentJobData, AgentOutput, NodeStatus } from '../agents/protocol';

@Injectable()
export class Scheduler {
  private readonly logger = new Logger(Scheduler.name);

  constructor(
    @Inject(QUEUE_PROVIDER) private readonly queueProvider: IQueueProvider,
    @Inject(EXECUTION_PLAN_REPOSITORY)
    private readonly planRepo: IRepository<ExecutionPlan>,
    @Inject(VCS_PROVIDER) private readonly vcs: IVCSProvider,
  ) {}

  async dispatch(planId: string, traceId: string): Promise<number> {
    // Try to create and checkout a branch for this pipeline
    try {
      const branchName = `vibe/pipeline-${planId}`;
      await this.vcs.createBranch('.', branchName);
      await this.vcs.checkout('.', branchName);
      this.logger.log(`Created and checked out branch: ${branchName}`);
    } catch (err) {
      this.logger.debug(
        `VCS branch creation skipped: ${(err as Error).message}`,
      );
    }

    const plan = await this.planRepo.findById(planId);
    if (!plan) {
      throw new Error(`Plan '${planId}' not found`);
    }

    const readyNodes = this.findReadyNodes(plan);
    this.logger.log(
      `Dispatching ${readyNodes.length} ready nodes for plan ${planId}`,
    );

    for (const node of readyNodes) {
      const jobData: AgentJobData = {
        taskId: node.taskDefinition.id,
        pipelineId: planId,
        projectId: plan.projectId,
        agentId: node.agentId,
        taskDefinition: node.taskDefinition,
        contextKeys: node.taskDefinition.tags,
        previousOutputIds: node.dependencies,
        configOverrides: {},
        traceId,
      };

      const queue = this.queueProvider.getQueue<AgentJobData>(
        `agent:${node.agentId}`,
      );
      await queue.add(jobData);

      node.status = 'queued';
      this.logger.log(`Queued node ${node.nodeId} → agent:${node.agentId}`);
    }

    await this.planRepo.update(planId, { dag: plan.dag });
    return readyNodes.length;
  }

  async onNodeComplete(
    planId: string,
    nodeId: string,
    output: AgentOutput,
  ): Promise<{ newlyDispatched: number; planComplete: boolean }> {
    const plan = await this.planRepo.findById(planId);
    if (!plan) throw new Error(`Plan '${planId}' not found`);

    const node = plan.dag.find((n) => n.nodeId === nodeId);
    if (!node) throw new Error(`Node '${nodeId}' not found in plan`);

    node.status = 'completed';
    node.output = output as any;
    node.completedAt = new Date();

    await this.planRepo.update(planId, { dag: plan.dag });

    const allComplete = plan.dag.every(
      (n) => n.status === 'completed' || n.status === 'skipped',
    );

    if (allComplete) {
      await this.planRepo.update(planId, {
        status: 'completed',
        completedAt: new Date(),
      });
      this.logger.log(
        `Plan ${planId} completed. Branch vibe/pipeline-${planId} is ready for merge.`,
      );
      return { newlyDispatched: 0, planComplete: true };
    }

    const dispatched = await this.dispatch(planId, output.traceId);
    return { newlyDispatched: dispatched, planComplete: false };
  }

  async onNodeFail(
    planId: string,
    nodeId: string,
    error: string,
  ): Promise<void> {
    const plan = await this.planRepo.findById(planId);
    if (!plan) throw new Error(`Plan '${planId}' not found`);

    const node = plan.dag.find((n) => n.nodeId === nodeId);
    if (!node) throw new Error(`Node '${nodeId}' not found in plan`);

    node.status = 'failed';
    node.completedAt = new Date();

    const errorLog = [...(plan.errorLog || []), `Node ${nodeId}: ${error}`];

    // Skip dependent nodes
    const dependents = this.findDependents(plan, nodeId);
    for (const dep of dependents) {
      dep.status = 'skipped';
    }

    await this.planRepo.update(planId, {
      dag: plan.dag,
      errorLog,
      status: 'failed',
    });

    this.logger.error(
      `Node ${nodeId} failed in plan ${planId}: ${error}. ` +
        `Skipped ${dependents.length} dependent nodes.`,
    );
  }

  private findReadyNodes(plan: ExecutionPlan) {
    return plan.dag.filter((node) => {
      if (node.status !== 'pending') return false;
      return node.dependencies.every((depId) => {
        const dep = plan.dag.find((n) => n.nodeId === depId);
        return dep && dep.status === 'completed';
      });
    });
  }

  private findDependents(plan: ExecutionPlan, nodeId: string) {
    const dependents: typeof plan.dag = [];
    const visited = new Set<string>();

    const collect = (id: string) => {
      for (const node of plan.dag) {
        if (node.dependencies.includes(id) && !visited.has(node.nodeId)) {
          visited.add(node.nodeId);
          dependents.push(node);
          collect(node.nodeId);
        }
      }
    };

    collect(nodeId);
    return dependents;
  }
}
