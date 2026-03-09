import { Injectable, Inject } from '@nestjs/common';
import { BaseAgent } from '../base/base-agent';
import { LLM_PROVIDER } from '../../providers/tokens';
import { ILLMProvider } from '../../providers/interfaces/llm-provider.interface';
import { QualityGatesService } from '../../modules/quality-gates/quality-gates.service';
import {
  AgentProfile,
  AgentInput,
  AgentOutput,
  Artifact,
  ContextUpdate,
} from '../protocol';

@Injectable()
export class ReviewerAgent extends BaseAgent {
  readonly profile: AgentProfile = {
    id: 'reviewer',
    name: 'Reviewer Agent',
    role: 'reviewer',
    capabilities: ['code-review', 'quality-assurance'],
    defaultModelTier: 'balanced',
    maxConcurrentTasks: 3,
    tags: ['code-review', 'quality'],
  };

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmAdapters: ILLMProvider[],
    private readonly qualityGates: QualityGatesService,
  ) {
    super();
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const metrics = this.startMetrics();

    try {
      // Step 1: Deterministic checks (lint, security, patterns)
      const codeArtifacts = this.extractCodeFromPreviousOutputs(input);

      if (codeArtifacts.length === 0) {
        return this.buildSuccessOutput(
          input,
          [{ type: 'review', content: 'No code artifacts to review' }],
          metrics,
        );
      }

      const gateResult = await this.qualityGates.runAllChecks(codeArtifacts, {
        skipTests: true,
      });

      const reviewArtifacts: Artifact[] = [
        {
          type: 'review-report',
          content: this.qualityGates.generateReport(gateResult),
          metadata: {
            passed: gateResult.passed,
            overallScore: gateResult.overallScore,
            blockerCount: gateResult.blockers.length,
          },
        },
      ];

      // Step 2: LLM-based deep review (only if deterministic passes)
      if (gateResult.passed && this.llmAdapters.length > 0) {
        try {
          const adapter = this.llmAdapters[0];
          const codeSnippets = codeArtifacts
            .map((f) => `// ${f.path}\n${f.content}`)
            .join('\n\n');

          const prompt = `Review this code for quality, patterns, and potential issues.
Code:
${codeSnippets}

Return JSON: { "comments": [{ "file": string, "line": number, "severity": "error"|"warning"|"info", "message": string }], "approved": boolean, "summary": string }`;

          const result = await adapter.generateJSON<{
            comments: {
              file: string;
              line: number;
              severity: string;
              message: string;
            }[];
            approved: boolean;
            summary: string;
          }>(prompt, {
            apiKey: (input.config as any)?.apiKey ?? '',
          });

          metrics.llmCalls++;
          metrics.tokensUsed += result.tokensUsed;
          metrics.costUSD += result.cost;

          reviewArtifacts.push({
            type: 'llm-review',
            content: result.data.summary,
            metadata: {
              approved: result.data.approved,
              commentCount: result.data.comments.length,
            },
          });
        } catch (error: any) {
          this.logger.warn(
            `[${input.traceId}] LLM review skipped: ${error.message}`,
          );
        }
      }

      const contextUpdates: ContextUpdate[] = [
        {
          operation: 'add',
          entry: {
            type: 'review' as const,
            scope: 'task' as const,
            tags: input.taskDefinition.tags,
            content: {
              passed: gateResult.passed,
              score: gateResult.overallScore,
            },
            tokenCount: this.estimateTokens(JSON.stringify(gateResult)),
          },
          reason: `Review completed for task ${input.taskDefinition.id}`,
        },
      ];

      return this.buildSuccessOutput(
        input,
        reviewArtifacts,
        metrics,
        contextUpdates,
      );
    } catch (error: any) {
      this.logger.error(
        `[${input.traceId}] Reviewer agent failed: ${error.message}`,
      );
      return this.buildFailureOutput(input, metrics, error.message);
    }
  }

  private extractCodeFromPreviousOutputs(
    input: AgentInput,
  ): { path: string; content: string }[] {
    const files: { path: string; content: string }[] = [];

    for (const output of input.previousOutputs) {
      for (const artifact of output.artifacts) {
        if (artifact.type === 'file' && artifact.path && artifact.content) {
          files.push({ path: artifact.path, content: artifact.content });
        }
      }
    }

    return files;
  }
}
