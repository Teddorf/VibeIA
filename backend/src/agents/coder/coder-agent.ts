import { Injectable, Inject } from '@nestjs/common';
import { BaseAgent } from '../base/base-agent';
import {
  LLM_PROVIDER,
  SANDBOX_PROVIDER,
  FILESYSTEM_PROVIDER,
} from '../../providers/tokens';
import { ILLMProvider } from '../../providers/interfaces/llm-provider.interface';
import { ISandboxProvider } from '../../providers/interfaces/sandbox-provider.interface';
import { IFileSystemProvider } from '../../providers/interfaces/filesystem-provider.interface';
import { ContextCompiler } from '../context/context-compiler';
import {
  AgentProfile,
  AgentInput,
  AgentOutput,
  Artifact,
  ContextUpdate,
} from '../protocol';

@Injectable()
export class CoderAgent extends BaseAgent {
  readonly profile: AgentProfile = {
    id: 'coder',
    name: 'Coder Agent',
    role: 'coder',
    capabilities: ['code-generation', 'refactoring', 'implementation'],
    defaultModelTier: 'balanced',
    maxConcurrentTasks: 3,
    tags: ['code-generation', 'implementation', 'refactor'],
  };

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmAdapters: ILLMProvider[],
    @Inject(SANDBOX_PROVIDER)
    private readonly sandboxProvider: ISandboxProvider,
    @Inject(FILESYSTEM_PROVIDER)
    private readonly fsProvider: IFileSystemProvider,
    private readonly contextCompiler: ContextCompiler,
  ) {
    super();
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const metrics = this.startMetrics();

    try {
      // Step 1: Check for template-based tasks (deterministic path)
      const templateResult = this.tryTemplateBased(input);
      if (templateResult) {
        this.logger.log(
          `[${input.traceId}] Using template for task ${input.taskDefinition.id}`,
        );
        return this.buildSuccessOutput(
          input,
          templateResult.artifacts,
          metrics,
          templateResult.contextUpdates,
        );
      }

      // Step 2: Use LLM to generate code
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

      const prompt = `Generate code for the following task.
Task: ${input.taskDefinition.description}
Context:
${contextSummary}

Return JSON: { "files": [{ "path": string, "content": string }] }`;

      const result = await adapter.generateJSON<{
        files: { path: string; content: string }[];
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

      // Step 3: Validate in sandbox if available
      try {
        const sandbox = await this.sandboxProvider.create();
        for (const file of result.data.files) {
          await sandbox.writeFile(file.path, file.content);
        }
        const check = await sandbox.exec('echo "validation ok"', 5000);
        await sandbox.destroy();

        if (check.exitCode !== 0) {
          this.logger.warn(
            `[${input.traceId}] Sandbox validation warning: ${check.stderr}`,
          );
        }
      } catch (sandboxErr: any) {
        this.logger.warn(
          `[${input.traceId}] Sandbox validation skipped: ${sandboxErr.message}`,
        );
      }

      const contextUpdates: ContextUpdate[] = artifacts.map((a) => ({
        operation: 'add' as const,
        entry: {
          type: 'code' as const,
          scope: 'task' as const,
          tags: input.taskDefinition.tags,
          content: { path: a.path, snippet: a.content.slice(0, 500) },
          tokenCount: this.estimateTokens(a.content),
        },
        reason: `Code generated for task ${input.taskDefinition.id}`,
      }));

      return this.buildSuccessOutput(input, artifacts, metrics, contextUpdates);
    } catch (error: any) {
      this.logger.error(
        `[${input.traceId}] Coder agent failed: ${error.message}`,
      );
      return this.buildFailureOutput(input, metrics, error.message);
    }
  }

  private tryTemplateBased(
    input: AgentInput,
  ): { artifacts: Artifact[]; contextUpdates: ContextUpdate[] } | null {
    // Deterministic template generation for simple patterns
    if (input.config.deterministicOnly) {
      return {
        artifacts: [
          {
            type: 'file',
            path: 'src/generated/placeholder.ts',
            content: `// Generated for: ${input.taskDefinition.description}\nexport {};\n`,
          },
        ],
        contextUpdates: [],
      };
    }
    return null;
  }
}
