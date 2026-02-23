import { Injectable, Logger } from '@nestjs/common';
import { QualityGatesService } from '../modules/quality-gates/quality-gates.service';
import { AgentOutput, TaskDefinition } from '../agents/protocol';

export interface EvaluationResult {
  passed: boolean;
  issues: string[];
  requiresReview: boolean;
}

@Injectable()
export class ResultEvaluator {
  private readonly logger = new Logger(ResultEvaluator.name);

  constructor(private readonly qualityGates: QualityGatesService) {}

  async evaluate(
    output: AgentOutput,
    task: TaskDefinition,
  ): Promise<EvaluationResult> {
    const issues: string[] = [];

    if (output.status === 'failure') {
      issues.push('Agent execution failed');
      return { passed: false, issues, requiresReview: false };
    }

    if (!output.artifacts || output.artifacts.length === 0) {
      issues.push('No artifacts produced');
      return { passed: false, issues, requiresReview: true };
    }

    // Run quality gates on code artifacts
    const codeArtifacts = output.artifacts.filter(
      (a) => a.type === 'file' && a.path && a.content,
    );

    if (codeArtifacts.length > 0) {
      const files = codeArtifacts.map((a) => ({
        path: a.path!,
        content: a.content,
      }));

      try {
        const gateResult = await this.qualityGates.runAllChecks(files, {
          skipTests: true,
        });

        if (!gateResult.passed) {
          issues.push(
            ...gateResult.blockers.map(
              (b) => `[${b.file}:${b.line ?? '?'}] ${b.message}`,
            ),
          );
        }
      } catch (error: any) {
        this.logger.warn(`Quality gate check failed: ${error.message}`);
        issues.push(`Quality gate error: ${error.message}`);
      }
    }

    // Check if the output meets task expectations
    const requiresReview =
      task.type === 'code-generation' || task.type === 'refactor';

    const passed = issues.length === 0;
    return { passed, issues, requiresReview };
  }
}
