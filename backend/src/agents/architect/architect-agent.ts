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

@Injectable()
export class ArchitectAgent extends BaseAgent {
  readonly profile: AgentProfile = {
    id: 'architect',
    name: 'Architect Agent',
    role: 'architect',
    capabilities: ['system-design', 'architecture-decisions', 'tech-stack'],
    defaultModelTier: 'powerful',
    maxConcurrentTasks: 2,
    tags: ['architecture', 'design', 'adr'],
  };

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmAdapters: ILLMProvider[],
  ) {
    super();
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const metrics = this.startMetrics();

    try {
      // Deterministic: generate architecture docs for known patterns
      const deterministicResult = this.tryDeterministicArchitecture(input);
      if (deterministicResult) {
        this.logger.log(
          `[${input.traceId}] Deterministic architecture for task ${input.taskDefinition.id}`,
        );
        return this.buildSuccessOutput(
          input,
          deterministicResult.artifacts,
          metrics,
          deterministicResult.contextUpdates,
        );
      }

      const adapter = this.llmAdapters[0];
      if (!adapter) {
        return this.buildFailureOutput(
          input,
          metrics,
          'No LLM adapter available',
        );
      }

      const contextSummary = input.context.entries
        .map((e) => JSON.stringify(e.content))
        .join('\n');

      const prompt = `Design system architecture for the following requirement.
Requirement: ${input.taskDefinition.description}
Context:
${contextSummary}

Return JSON: {
  "components": [{ "name": string, "responsibility": string, "techStack": string[] }],
  "decisions": [{ "title": string, "decision": string, "rationale": string }],
  "patterns": string[],
  "diagram": string
}`;

      const result = await adapter.generateJSON<{
        components: {
          name: string;
          responsibility: string;
          techStack: string[];
        }[];
        decisions: { title: string; decision: string; rationale: string }[];
        patterns: string[];
        diagram: string;
      }>(prompt, {
        apiKey: (input.config as any)?.apiKey ?? '',
        maxTokens: input.config.maxTokensOverride,
      });

      metrics.llmCalls++;
      metrics.tokensUsed += result.tokensUsed;
      metrics.costUSD += result.cost;

      const termCheck = this.checkEarlyTermination(JSON.stringify(result.data));
      if (termCheck.terminated) {
        return this.buildFailureOutput(input, metrics, termCheck.reason!);
      }

      const artifacts: Artifact[] = [
        { type: 'architecture', content: JSON.stringify(result.data, null, 2) },
      ];

      // Generate ADR artifacts for each decision
      for (const decision of result.data.decisions) {
        artifacts.push({
          type: 'file',
          path: `docs/adr/${decision.title.toLowerCase().replace(/\s+/g, '-')}.md`,
          content: `# ADR: ${decision.title}\n\n## Decision\n${decision.decision}\n\n## Rationale\n${decision.rationale}\n`,
        });
      }

      const contextUpdates: ContextUpdate[] = [
        {
          operation: 'add',
          entry: {
            type: 'architecture',
            scope: 'global',
            tags: input.taskDefinition.tags,
            content: result.data,
            tokenCount: this.estimateTokens(JSON.stringify(result.data)),
          },
          reason: `Architecture design for task ${input.taskDefinition.id}`,
        },
      ];

      return this.buildSuccessOutput(input, artifacts, metrics, contextUpdates);
    } catch (error: any) {
      this.logger.error(
        `[${input.traceId}] Architect agent failed: ${error.message}`,
      );
      return this.buildFailureOutput(input, metrics, error.message);
    }
  }

  private tryDeterministicArchitecture(
    input: AgentInput,
  ): { artifacts: Artifact[]; contextUpdates: ContextUpdate[] } | null {
    if (!input.config.deterministicOnly) return null;

    const architecture = {
      components: [
        {
          name: 'API Layer',
          responsibility: 'HTTP routing',
          techStack: ['NestJS'],
        },
        {
          name: 'Service Layer',
          responsibility: 'Business logic',
          techStack: ['TypeScript'],
        },
        {
          name: 'Data Layer',
          responsibility: 'Persistence',
          techStack: ['MongoDB', 'Mongoose'],
        },
      ],
      decisions: [
        {
          title: 'Use NestJS Framework',
          decision: 'NestJS for backend API',
          rationale: 'TypeScript-first, modular architecture',
        },
      ],
      patterns: ['Repository Pattern', 'Dependency Injection', 'CQRS'],
      diagram: '┌─API─┐──►┌─Service─┐──►┌─Data─┐',
    };

    return {
      artifacts: [
        {
          type: 'architecture',
          content: JSON.stringify(architecture, null, 2),
        },
      ],
      contextUpdates: [
        {
          operation: 'add',
          entry: {
            type: 'architecture',
            scope: 'global',
            tags: input.taskDefinition.tags,
            content: architecture,
            tokenCount: this.estimateTokens(JSON.stringify(architecture)),
          },
          reason: `Default architecture for task ${input.taskDefinition.id}`,
        },
      ],
    };
  }
}
