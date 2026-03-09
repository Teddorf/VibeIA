import { IRepository } from './database-provider.interface';
import { ExecutionPlan } from '../../entities/execution-plan.schema';
import { PlanStatus, NodeStatus } from '../../agents/protocol';

export interface IExecutionPlanRepository extends IRepository<ExecutionPlan> {
  findByProjectAndStatus(
    projectId: string,
    status: PlanStatus,
  ): Promise<ExecutionPlan[]>;
  updateNodeStatus(
    planId: string,
    nodeId: string,
    status: NodeStatus,
  ): Promise<ExecutionPlan | null>;
  getReadyNodes(planId: string): Promise<{ nodeId: string; agentId: string }[]>;
}
