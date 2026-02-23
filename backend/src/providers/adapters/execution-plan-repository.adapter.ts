import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { MongooseRepository } from './mongoose-repository.adapter';
import { ExecutionPlan } from '../../entities/execution-plan.schema';
import { IExecutionPlanRepository } from '../interfaces/execution-plan-repository.interface';
import { PlanStatus, NodeStatus } from '../../agents/protocol';

@Injectable()
export class ExecutionPlanRepositoryAdapter
  extends MongooseRepository<ExecutionPlan>
  implements IExecutionPlanRepository
{
  constructor(
    @InjectModel(ExecutionPlan.name)
    model: Model<ExecutionPlan & Document>,
  ) {
    super(model);
  }

  async findByProjectAndStatus(
    projectId: string,
    status: PlanStatus,
  ): Promise<ExecutionPlan[]> {
    return this.find({ projectId, status });
  }

  async updateNodeStatus(
    planId: string,
    nodeId: string,
    status: NodeStatus,
  ): Promise<ExecutionPlan | null> {
    return this.findOneAndUpdate(
      { _id: planId, 'dag.nodeId': nodeId },
      { $set: { 'dag.$.status': status } },
    );
  }

  async getReadyNodes(
    planId: string,
  ): Promise<{ nodeId: string; agentId: string }[]> {
    const plan = await this.findById(planId);
    if (!plan) return [];

    const completedNodeIds = new Set(
      plan.dag.filter((n) => n.status === 'completed').map((n) => n.nodeId),
    );

    return plan.dag
      .filter(
        (n) =>
          n.status === 'pending' &&
          n.dependencies.every((dep) => completedNodeIds.has(dep)),
      )
      .map((n) => ({ nodeId: n.nodeId, agentId: n.agentId }));
  }
}
