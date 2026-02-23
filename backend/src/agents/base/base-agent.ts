import { Logger } from '@nestjs/common';
import { LLM_DEFAULTS } from '../../config/defaults';
import { VibeConfig } from '../../config/vibe-config';
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
    return Math.ceil(text.length / LLM_DEFAULTS.charsPerToken);
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
    if (BaseAgent._vibeConfig) {
      const tier = this.profile.defaultModelTier;
      const pricing = BaseAgent._vibeConfig.providers.llm.pricing[tier];
      return {
        inputPerMillionTokens: pricing.inputPerMillionTokens,
        outputPerMillionTokens: pricing.outputPerMillionTokens,
      };
    }
    switch (this.profile.defaultModelTier) {
      case 'fast':
        return {
          inputPerMillionTokens: LLM_DEFAULTS.gemini.pricing.inputPerMillion,
          outputPerMillionTokens: LLM_DEFAULTS.gemini.pricing.outputPerMillion,
        };
      case 'powerful':
        return {
          inputPerMillionTokens: LLM_DEFAULTS.anthropic.pricing.inputPerMillion,
          outputPerMillionTokens:
            LLM_DEFAULTS.anthropic.pricing.outputPerMillion,
        };
      case 'balanced':
      default:
        return {
          inputPerMillionTokens: LLM_DEFAULTS.openai.pricing.inputPerMillion,
          outputPerMillionTokens: LLM_DEFAULTS.openai.pricing.outputPerMillion,
        };
    }
  }

  private getDefaultModelId(): string {
    if (BaseAgent._vibeConfig) {
      return BaseAgent._vibeConfig.providers.llm.modelMapping[
        this.profile.defaultModelTier
      ];
    }
    switch (this.profile.defaultModelTier) {
      case 'fast':
        return LLM_DEFAULTS.gemini.planModel;
      case 'powerful':
        return LLM_DEFAULTS.anthropic.planModel;
      case 'balanced':
      default:
        return LLM_DEFAULTS.openai.planModel;
    }
  }
}
