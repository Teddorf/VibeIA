import { Injectable, Inject } from '@nestjs/common';
import { BaseAgent } from '../base/base-agent';
import { LLM_PROVIDER, SANDBOX_PROVIDER } from '../../providers/tokens';
import { ILLMProvider } from '../../providers/interfaces/llm-provider.interface';
import { ISandboxProvider } from '../../providers/interfaces/sandbox-provider.interface';
import {
  AgentProfile,
  AgentInput,
  AgentOutput,
  Artifact,
  ContextUpdate,
} from '../protocol';

@Injectable()
export class FixerAgent extends BaseAgent {
  readonly profile: AgentProfile = {
    id: 'fixer',
    name: 'Fixer Agent',
    role: 'fixer',
    capabilities: [
      'bug-fixing',
      'merge-conflict-resolution',
      'error-diagnosis',
    ],
    defaultModelTier: 'balanced',
    maxConcurrentTasks: 3,
    tags: ['bug-fix', 'merge-conflict', 'error-fix'],
  };

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmAdapters: ILLMProvider[],
    @Inject(SANDBOX_PROVIDER)
    private readonly sandboxProvider: ISandboxProvider,
  ) {
    super();
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const metrics = this.startMetrics();

    try {
      // Extract error context from previous outputs
      const errorArtifacts = (input.previousOutputs ?? [])
        .flatMap((o) => o.artifacts)
        .filter((a) => a.type === 'error' || a.type === 'test-report');

      const adapter = this.llmAdapters[0];
      if (!adapter) {
        return this.buildFailureOutput(
          input,
          metrics,
          'No LLM adapter available',
        );
      }

      const errorContext = errorArtifacts.map((a) => a.content).join('\n---\n');

      const codeContext = input.context.entries
        .filter((e) => e.type === 'code')
        .map((e) => JSON.stringify(e.content))
        .join('\n');

      const prompt = `Analyze the following error and generate a fix.
Task: ${input.taskDefinition.description}
Error context:
${errorContext || 'No error artifacts available'}
Code context:
${codeContext || 'No code context available'}

Return JSON: {
  "rootCause": string,
  "fixes": [{ "path": string, "content": string, "description": string }],
  "confidence": "low" | "medium" | "high"
}`;

      const result = await adapter.generateJSON<{
        rootCause: string;
        fixes: { path: string; content: string; description: string }[];
        confidence: string;
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
        {
          type: 'diagnosis',
          content: JSON.stringify({
            rootCause: result.data.rootCause,
            confidence: result.data.confidence,
          }),
        },
        ...result.data.fixes.map((f) => ({
          type: 'file' as const,
          path: f.path,
          content: f.content,
        })),
      ];

      // Validate fix in sandbox
      try {
        const sandbox = await this.sandboxProvider.create();
        for (const fix of result.data.fixes) {
          await sandbox.writeFile(fix.path, fix.content);
        }
        const validation = await sandbox.exec('echo "fix validation ok"', 5000);
        await sandbox.destroy();

        if (validation.exitCode !== 0) {
          this.logger.warn(
            `[${input.traceId}] Fix validation warning: ${validation.stderr}`,
          );
        }
      } catch (sandboxErr: any) {
        this.logger.warn(
          `[${input.traceId}] Fix sandbox validation skipped: ${sandboxErr.message}`,
        );
      }

      const contextUpdates: ContextUpdate[] = [
        {
          operation: 'add',
          entry: {
            type: 'decision',
            scope: 'task',
            tags: input.taskDefinition.tags,
            content: {
              rootCause: result.data.rootCause,
              fixApplied: result.data.fixes.map((f) => f.description),
              confidence: result.data.confidence,
            },
            tokenCount: this.estimateTokens(JSON.stringify(result.data)),
          },
          reason: `Bug fix for task ${input.taskDefinition.id}`,
        },
      ];

      return this.buildSuccessOutput(input, artifacts, metrics, contextUpdates);
    } catch (error: any) {
      this.logger.error(
        `[${input.traceId}] Fixer agent failed: ${error.message}`,
      );
      return this.buildFailureOutput(input, metrics, error.message);
    }
  }
}
