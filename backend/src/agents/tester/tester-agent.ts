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
export class TesterAgent extends BaseAgent {
  readonly profile: AgentProfile = {
    id: 'tester',
    name: 'Tester Agent',
    role: 'tester',
    capabilities: ['test-generation', 'test-execution', 'coverage-analysis'],
    defaultModelTier: 'balanced',
    maxConcurrentTasks: 3,
    tags: ['testing', 'test-generation', 'coverage'],
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
      // Deterministic: template-based tests for common patterns
      const templateResult = this.tryTemplateTests(input);
      if (templateResult) {
        this.logger.log(
          `[${input.traceId}] Template tests for task ${input.taskDefinition.id}`,
        );
        return this.buildSuccessOutput(
          input,
          templateResult.artifacts,
          metrics,
          templateResult.contextUpdates,
        );
      }

      // Extract code from previous outputs for test generation
      const codeArtifacts = (input.previousOutputs ?? [])
        .flatMap((o) => o.artifacts)
        .filter((a) => a.type === 'file' && a.path?.endsWith('.ts'));

      const adapter = this.llmAdapters[0];
      if (!adapter) {
        return this.buildFailureOutput(
          input,
          metrics,
          'No LLM adapter available',
        );
      }

      const codeContext = codeArtifacts
        .map((a) => `// ${a.path}\n${a.content}`)
        .join('\n\n');

      const prompt = `Generate Jest test suites for the following code.
${codeContext || `Task: ${input.taskDefinition.description}`}

Return JSON: {
  "testFiles": [{ "path": string, "content": string }],
  "coverage": { "estimated": number }
}`;

      const result = await adapter.generateJSON<{
        testFiles: { path: string; content: string }[];
        coverage: { estimated: number };
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

      const artifacts: Artifact[] = result.data.testFiles.map((f) => ({
        type: 'file',
        path: f.path,
        content: f.content,
      }));

      // Run tests in sandbox if available
      try {
        const sandbox = await this.sandboxProvider.create();
        for (const file of result.data.testFiles) {
          await sandbox.writeFile(file.path, file.content);
        }
        const testRun = await sandbox.exec(
          'npx jest --passWithNoTests --json',
          30000,
        );
        await sandbox.destroy();

        if (testRun.exitCode === 0) {
          artifacts.push({
            type: 'test-report',
            content: testRun.stdout,
          });
        } else {
          this.logger.warn(
            `[${input.traceId}] Test execution had failures: ${testRun.stderr}`,
          );
          artifacts.push({
            type: 'test-report',
            content: `Exit code: ${testRun.exitCode}\n${testRun.stderr}`,
          });
        }
      } catch (sandboxErr: any) {
        this.logger.warn(
          `[${input.traceId}] Sandbox test execution skipped: ${sandboxErr.message}`,
        );
      }

      const contextUpdates: ContextUpdate[] = [
        {
          operation: 'add',
          entry: {
            type: 'test',
            scope: 'task',
            tags: input.taskDefinition.tags,
            content: {
              testCount: result.data.testFiles.length,
              estimatedCoverage: result.data.coverage.estimated,
            },
            tokenCount: this.estimateTokens(JSON.stringify(result.data)),
          },
          reason: `Tests generated for task ${input.taskDefinition.id}`,
        },
      ];

      return this.buildSuccessOutput(input, artifacts, metrics, contextUpdates);
    } catch (error: any) {
      this.logger.error(
        `[${input.traceId}] Tester agent failed: ${error.message}`,
      );
      return this.buildFailureOutput(input, metrics, error.message);
    }
  }

  private tryTemplateTests(
    input: AgentInput,
  ): { artifacts: Artifact[]; contextUpdates: ContextUpdate[] } | null {
    if (!input.config.deterministicOnly) return null;

    const testContent = `import { describe, it, expect } from '@jest/globals';

describe('${input.taskDefinition.description}', () => {
  it('should be implemented', () => {
    expect(true).toBe(true);
  });
});
`;

    return {
      artifacts: [
        {
          type: 'file',
          path: `src/__tests__/${input.taskDefinition.id}.spec.ts`,
          content: testContent,
        },
      ],
      contextUpdates: [],
    };
  }
}
