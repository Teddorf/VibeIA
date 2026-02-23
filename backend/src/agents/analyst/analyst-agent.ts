import { Injectable, Inject } from '@nestjs/common';
import { BaseAgent } from '../base/base-agent';
import { LLM_PROVIDER } from '../../providers/tokens';
import { ILLMProvider } from '../../providers/interfaces/llm-provider.interface';
import {
  AgentProfile,
  AgentInput,
  AgentOutput,
  Artifact,
  ContextUpdate,
} from '../protocol';

const KNOWN_INTENT_PATTERNS: Record<
  string,
  { taskType: string; features: string[] }
> = {
  'e-commerce': {
    taskType: 'analysis',
    features: ['cart', 'checkout', 'products', 'orders'],
  },
  blog: {
    taskType: 'analysis',
    features: ['posts', 'comments', 'categories', 'auth'],
  },
  dashboard: {
    taskType: 'analysis',
    features: ['charts', 'tables', 'filters', 'export'],
  },
  api: {
    taskType: 'analysis',
    features: ['endpoints', 'auth', 'validation', 'docs'],
  },
  chat: {
    taskType: 'analysis',
    features: ['messages', 'rooms', 'users', 'notifications'],
  },
};

@Injectable()
export class AnalystAgent extends BaseAgent {
  readonly profile: AgentProfile = {
    id: 'analyst',
    name: 'Analyst Agent',
    role: 'analyst',
    capabilities: ['requirement-analysis', 'intent-parsing', 'task-breakdown'],
    defaultModelTier: 'balanced',
    maxConcurrentTasks: 2,
    tags: ['analysis', 'requirements', 'intent-parsing'],
  };

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmAdapters: ILLMProvider[],
  ) {
    super();
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const metrics = this.startMetrics();

    try {
      // Deterministic first: pattern matching on known intents
      const deterministicResult = this.tryDeterministicAnalysis(input);
      if (deterministicResult) {
        this.logger.log(
          `[${input.traceId}] Deterministic analysis for task ${input.taskDefinition.id}`,
        );
        return this.buildSuccessOutput(
          input,
          deterministicResult.artifacts,
          metrics,
          deterministicResult.contextUpdates,
        );
      }

      // LLM-based analysis
      const adapter = this.llmAdapters[0];
      if (!adapter) {
        return this.buildFailureOutput(
          input,
          metrics,
          'No LLM adapter available',
        );
      }

      const prompt = `Analyze the following requirement and break it down.
Requirement: ${input.taskDefinition.description}

Return JSON: {
  "intent": string,
  "taskType": string,
  "complexity": "low" | "medium" | "high",
  "features": string[],
  "requiredAgents": string[],
  "taskBreakdown": [{ "name": string, "description": string, "type": string }]
}`;

      const result = await adapter.generateJSON<{
        intent: string;
        taskType: string;
        complexity: string;
        features: string[];
        requiredAgents: string[];
        taskBreakdown: { name: string; description: string; type: string }[];
      }>(prompt, {
        apiKey: (input.config as any)?.apiKey ?? '',
        maxTokens: input.config.maxTokensOverride,
      });

      metrics.llmCalls++;
      metrics.tokensUsed += result.tokensUsed;
      metrics.costUSD += result.cost;

      // Check early termination
      const termCheck = this.checkEarlyTermination(JSON.stringify(result.data));
      if (termCheck.terminated) {
        return this.buildFailureOutput(input, metrics, termCheck.reason!);
      }

      const artifacts: Artifact[] = [
        {
          type: 'analysis',
          content: JSON.stringify(result.data, null, 2),
        },
      ];

      const contextUpdates: ContextUpdate[] = [
        {
          operation: 'add',
          entry: {
            type: 'requirement',
            scope: 'global',
            tags: input.taskDefinition.tags,
            content: result.data,
            tokenCount: this.estimateTokens(JSON.stringify(result.data)),
          },
          reason: `Analysis for task ${input.taskDefinition.id}`,
        },
      ];

      return this.buildSuccessOutput(input, artifacts, metrics, contextUpdates);
    } catch (error: any) {
      this.logger.error(
        `[${input.traceId}] Analyst agent failed: ${error.message}`,
      );
      return this.buildFailureOutput(input, metrics, error.message);
    }
  }

  private tryDeterministicAnalysis(
    input: AgentInput,
  ): { artifacts: Artifact[]; contextUpdates: ContextUpdate[] } | null {
    const desc = input.taskDefinition.description.toLowerCase();

    for (const [keyword, pattern] of Object.entries(KNOWN_INTENT_PATTERNS)) {
      if (desc.includes(keyword)) {
        const analysis = {
          intent: input.taskDefinition.description,
          taskType: pattern.taskType,
          complexity: 'medium',
          features: pattern.features,
          requiredAgents: ['coder', 'reviewer', 'tester'],
          taskBreakdown: pattern.features.map((f) => ({
            name: `Implement ${f}`,
            description: `Build ${f} feature`,
            type: 'code-generation',
          })),
        };

        return {
          artifacts: [
            { type: 'analysis', content: JSON.stringify(analysis, null, 2) },
          ],
          contextUpdates: [
            {
              operation: 'add',
              entry: {
                type: 'requirement',
                scope: 'global',
                tags: input.taskDefinition.tags,
                content: analysis,
                tokenCount: this.estimateTokens(JSON.stringify(analysis)),
              },
              reason: `Deterministic analysis for ${keyword} pattern`,
            },
          ],
        };
      }
    }

    if (input.config.deterministicOnly) {
      return {
        artifacts: [
          {
            type: 'analysis',
            content: JSON.stringify({
              intent: input.taskDefinition.description,
              taskType: 'analysis',
              complexity: 'medium',
              features: [],
              requiredAgents: ['coder'],
              taskBreakdown: [],
            }),
          },
        ],
        contextUpdates: [],
      };
    }

    return null;
  }
}
