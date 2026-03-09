import { Logger } from '@nestjs/common';
import { VibeConfig, loadVibeConfig } from '../../config/vibe-config';
import {
  EarlyTermination,
  EarlyTerminationResult,
  StopCondition,
} from '../../optimization/early-termination';
import {
  IAgent,
  AgentProfile,
  AgentInput,
  AgentOutput,
  CostEstimate,
  ValidationError,
  ExecutionMetrics,
  TaskDefinition,
} from '../protocol';

export abstract class BaseAgent implements IAgent {
  protected readonly logger: Logger;
  abstract readonly profile: AgentProfile;

  private static _vibeConfig: VibeConfig | null = null;

  static setVibeConfig(config: VibeConfig): void {
    BaseAgent._vibeConfig = config;
  }

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  abstract execute(input: AgentInput): Promise<AgentOutput>;

  validateInput(input: AgentInput): ValidationError[] | null {
    const errors: ValidationError[] = [];

    if (!input.taskDefinition) {
      errors.push({
        field: 'taskDefinition',
        message: 'Task definition is required',
        code: 'MISSING_TASK_DEFINITION',
        severity: 'error',
      });
    }

    if (!input.traceId) {
      errors.push({
        field: 'traceId',
        message: 'Trace ID is required',
        code: 'MISSING_TRACE_ID',
        severity: 'error',
      });
    }

    if (!input.context) {
      errors.push({
        field: 'context',
        message: 'Context is required',
        code: 'MISSING_CONTEXT',
        severity: 'error',
      });
    }

    return errors.length > 0 ? errors : null;
  }

  estimateCost(input: AgentInput): CostEstimate {
    const { taskDefinition: task, context } = input;
    const inputTokens =
      context.tokenCount + this.estimateTokens(task.description);
    const outputTokens = Math.ceil(inputTokens * 0.5);
    const pricing = this.getDefaultPricing();

    const costUSD =
      (inputTokens / 1_000_000) * pricing.inputPerMillionTokens +
      (outputTokens / 1_000_000) * pricing.outputPerMillionTokens;

    return {
      estimatedInputTokens: inputTokens,
      estimatedOutputTokens: outputTokens,
      estimatedCachedTokens: 0,
      modelTier: this.profile.defaultModelTier,
      modelId: this.getDefaultModelId(),
      estimatedCostUSD: Math.round(costUSD * 1_000_000) / 1_000_000,
      confidenceLevel: 'medium',
    };
  }

  canHandle(task: TaskDefinition): boolean {
    return task.tags.some((tag) => this.profile.tags.includes(tag));
  }

  protected estimateTokens(text: string): number {
    const config = BaseAgent._vibeConfig ?? loadVibeConfig();
    return Math.ceil(text.length / config.taskDefaults.charsPerToken);
  }

  protected checkEarlyTermination(
    output: string,
    customConditions?: StopCondition[],
  ): EarlyTerminationResult {
    const et = new EarlyTermination();
    const conditions = customConditions ?? et.getDefaultStopConditions();
    return et.executeWithEarlyTermination(output, conditions);
  }

  protected startMetrics(): ExecutionMetrics {
    return {
      startedAt: new Date(),
      durationMs: 0,
      tokensUsed: 0,
      costUSD: 0,
      llmCalls: 0,
      retries: 0,
    };
  }

  protected finalizeMetrics(metrics: ExecutionMetrics): ExecutionMetrics {
    metrics.completedAt = new Date();
    metrics.durationMs =
      metrics.completedAt.getTime() - metrics.startedAt.getTime();
    return metrics;
  }

  protected buildSuccessOutput(
    input: AgentInput,
    artifacts: AgentOutput['artifacts'],
    metrics: ExecutionMetrics,
    contextUpdates: AgentOutput['contextUpdates'] = [],
  ): AgentOutput {
    return {
      taskId: input.taskDefinition.id,
      agentId: this.profile.id,
      status: 'success',
      artifacts,
      contextUpdates,
      metrics: this.finalizeMetrics(metrics),
      traceId: input.traceId,
    };
  }

  protected buildFailureOutput(
    input: AgentInput,
    metrics: ExecutionMetrics,
    error: string,
  ): AgentOutput {
    return {
      taskId: input.taskDefinition.id,
      agentId: this.profile.id,
      status: 'failure',
      artifacts: [{ type: 'error', content: error }],
      contextUpdates: [],
      metrics: this.finalizeMetrics(metrics),
      traceId: input.traceId,
    };
  }

  private getDefaultPricing(): {
    inputPerMillionTokens: number;
    outputPerMillionTokens: number;
  } {
    const config = BaseAgent._vibeConfig ?? loadVibeConfig();
    const tier = this.profile.defaultModelTier;
    const pricing = config.providers.llm.pricing[tier];
    return {
      inputPerMillionTokens: pricing.inputPerMillionTokens,
      outputPerMillionTokens: pricing.outputPerMillionTokens,
    };
  }

  private getDefaultModelId(): string {
    const config = BaseAgent._vibeConfig ?? loadVibeConfig();
    return config.providers.llm.modelMapping[this.profile.defaultModelTier];
  }
}
