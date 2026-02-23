import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Document } from 'mongoose';
import { MongooseRepository } from './mongoose-repository.adapter';
import { AgentExecution } from '../../entities/agent-execution.schema';
import {
  IAgentExecutionRepository,
  PipelineMetrics,
} from '../interfaces/agent-execution-repository.interface';

@Injectable()
export class AgentExecutionRepositoryAdapter
  extends MongooseRepository<AgentExecution>
  implements IAgentExecutionRepository
{
  constructor(
    @InjectModel(AgentExecution.name)
    model: Model<AgentExecution & Document>,
  ) {
    super(model);
  }

  async getMetricsForPipeline(pipelineId: string): Promise<PipelineMetrics> {
    const executions = await this.find({ pipelineId });

    const completed = executions.filter((e) => e.status === 'completed');
    const failed = executions.filter((e) => e.status === 'failed');

    const totalCostUSD = executions.reduce(
      (sum, e) => sum + (e.metrics?.costUSD ?? 0),
      0,
    );
    const totalTokensUsed = executions.reduce(
      (sum, e) => sum + (e.metrics?.tokensUsed ?? 0),
      0,
    );
    const totalDuration = executions.reduce(
      (sum, e) => sum + (e.metrics?.durationMs ?? 0),
      0,
    );

    return {
      totalExecutions: executions.length,
      completedExecutions: completed.length,
      failedExecutions: failed.length,
      totalCostUSD,
      totalTokensUsed,
      averageDurationMs:
        executions.length > 0 ? totalDuration / executions.length : 0,
    };
  }

  async getCostForProject(projectId: string): Promise<number> {
    const executions = await this.find({ projectId });
    return executions.reduce((sum, e) => sum + (e.metrics?.costUSD ?? 0), 0);
  }
}
