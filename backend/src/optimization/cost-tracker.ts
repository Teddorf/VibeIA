import { Injectable, Inject, Logger } from '@nestjs/common';
import { AGENT_EXECUTION_REPOSITORY } from '../providers/repository-tokens';
import { VIBE_CONFIG } from '../providers/tokens';
import { IRepository } from '../providers/interfaces/database-provider.interface';
import { AgentExecution } from '../entities/agent-execution.schema';
import { VibeConfig } from '../config/vibe-config';

export interface CostSummary {
  totalCostUSD: number;
  totalTokensUsed: number;
  executionCount: number;
  byAgent: Record<
    string,
    { costUSD: number; tokensUsed: number; count: number }
  >;
}

export interface BudgetCheckResult {
  allowed: boolean;
  remaining: number;
  currentSpend: number;
  budgetLimit: number;
}

@Injectable()
export class CostTracker {
  private readonly logger = new Logger(CostTracker.name);

  constructor(
    @Inject(AGENT_EXECUTION_REPOSITORY)
    private readonly executionRepo: IRepository<AgentExecution>,
    @Inject(VIBE_CONFIG) private readonly config: VibeConfig,
  ) {}

  async trackCost(execution: Partial<AgentExecution>): Promise<void> {
    await this.executionRepo.create(execution);
  }

  async getCostForProject(
    projectId: string,
    dateRange?: { from: Date; to: Date },
  ): Promise<CostSummary> {
    const filter: Record<string, unknown> = { projectId };
    if (dateRange) {
      filter.createdAt = {
        $gte: dateRange.from,
        $lte: dateRange.to,
      };
    }

    const executions = await this.executionRepo.find(filter);

    const summary: CostSummary = {
      totalCostUSD: 0,
      totalTokensUsed: 0,
      executionCount: executions.length,
      byAgent: {},
    };

    for (const exec of executions) {
      const cost = exec.metrics?.costUSD ?? 0;
      const tokens = exec.metrics?.tokensUsed ?? 0;

      summary.totalCostUSD += cost;
      summary.totalTokensUsed += tokens;

      if (!summary.byAgent[exec.agentId]) {
        summary.byAgent[exec.agentId] = { costUSD: 0, tokensUsed: 0, count: 0 };
      }
      summary.byAgent[exec.agentId].costUSD += cost;
      summary.byAgent[exec.agentId].tokensUsed += tokens;
      summary.byAgent[exec.agentId].count++;
    }

    return summary;
  }

  async checkBudget(
    projectId: string,
    estimatedCost: number,
    budgetLimitUSD: number = this.config.taskDefaults.costBudgetUSD,
  ): Promise<BudgetCheckResult> {
    const summary = await this.getCostForProject(projectId);
    const remaining = budgetLimitUSD - summary.totalCostUSD;
    const allowed = remaining >= estimatedCost;

    if (!allowed) {
      this.logger.warn(
        `Budget exceeded for project ${projectId}: $${summary.totalCostUSD.toFixed(4)} / $${budgetLimitUSD}`,
      );
    }

    return {
      allowed,
      remaining: Math.max(0, remaining),
      currentSpend: summary.totalCostUSD,
      budgetLimit: budgetLimitUSD,
    };
  }
}
