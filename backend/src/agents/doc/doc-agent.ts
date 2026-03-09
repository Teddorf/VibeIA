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
export class DocAgent extends BaseAgent {
  readonly profile: AgentProfile = {
    id: 'doc',
    name: 'Documentation Agent',
    role: 'doc',
    capabilities: ['documentation', 'readme-generation', 'api-docs'],
    defaultModelTier: 'fast',
    maxConcurrentTasks: 4,
    tags: ['documentation', 'readme', 'api-docs'],
  };

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmAdapters: ILLMProvider[],
  ) {
    super();
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const metrics = this.startMetrics();

    try {
      // Deterministic: template-based docs for known structures
      const templateResult = this.tryTemplateDocs(input);
      if (templateResult) {
        this.logger.log(
          `[${input.traceId}] Template docs for task ${input.taskDefinition.id}`,
        );
        return this.buildSuccessOutput(
          input,
          templateResult.artifacts,
          metrics,
          templateResult.contextUpdates,
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

      // Gather code and architecture context
      const codeArtifacts = (input.previousOutputs ?? [])
        .flatMap((o) => o.artifacts)
        .filter((a) => a.type === 'file' || a.type === 'architecture');

      const contextSummary = [
        ...input.context.entries.map((e) => JSON.stringify(e.content)),
        ...codeArtifacts.map(
          (a) => `${a.path ?? a.type}: ${a.content.slice(0, 500)}`,
        ),
      ].join('\n');

      const prompt = `Generate documentation for the following project.
Task: ${input.taskDefinition.description}
Context:
${contextSummary}

Return JSON: {
  "files": [{ "path": string, "content": string, "type": "readme" | "api" | "changelog" | "guide" }]
}`;

      const result = await adapter.generateJSON<{
        files: { path: string; content: string; type: string }[];
      }>(prompt, {
        apiKey: (input.config as any)?.apiKey ?? '',
        maxTokens: input.config.maxTokensOverride,
      });

      metrics.llmCalls++;
      metrics.tokensUsed += result.tokensUsed;
      metrics.costUSD += result.cost;

      const artifacts: Artifact[] = result.data.files.map((f) => ({
        type: 'file',
        path: f.path,
        content: f.content,
      }));

      return this.buildSuccessOutput(input, artifacts, metrics);
    } catch (error: any) {
      this.logger.error(
        `[${input.traceId}] Doc agent failed: ${error.message}`,
      );
      return this.buildFailureOutput(input, metrics, error.message);
    }
  }

  private tryTemplateDocs(
    input: AgentInput,
  ): { artifacts: Artifact[]; contextUpdates: ContextUpdate[] } | null {
    if (!input.config.deterministicOnly) return null;

    const desc = input.taskDefinition.description;
    const readme = `# ${desc}\n\n## Overview\n\nGenerated documentation.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run start\n\`\`\`\n\n## License\n\nMIT\n`;

    return {
      artifacts: [{ type: 'file', path: 'README.md', content: readme }],
      contextUpdates: [],
    };
  }
}
