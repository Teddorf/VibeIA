import { IRepository } from './database-provider.interface';
import { AgentExecution } from '../../entities/agent-execution.schema';

export interface PipelineMetrics {
  totalExecutions: number;
  completedExecutions: number;
  failedExecutions: number;
  totalCostUSD: number;
  totalTokensUsed: number;
  averageDurationMs: number;
}

export interface IAgentExecutionRepository extends IRepository<AgentExecution> {
  getMetricsForPipeline(pipelineId: string): Promise<PipelineMetrics>;
  getCostForProject(projectId: string): Promise<number>;
}
