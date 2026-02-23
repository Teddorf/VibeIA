import { Injectable, Inject } from '@nestjs/common';
import { BaseAgent } from '../base/base-agent';
import {
  VCS_PROVIDER,
  DEPLOY_PROVIDER,
  FILESYSTEM_PROVIDER,
} from '../../providers/tokens';
import { IVCSProvider } from '../../providers/interfaces/vcs-provider.interface';
import { IDeployProvider } from '../../providers/interfaces/deploy-provider.interface';
import { IFileSystemProvider } from '../../providers/interfaces/filesystem-provider.interface';
import {
  AgentProfile,
  AgentInput,
  AgentOutput,
  Artifact,
  ContextUpdate,
} from '../protocol';

@Injectable()
export class DevOpsAgent extends BaseAgent {
  readonly profile: AgentProfile = {
    id: 'devops',
    name: 'DevOps Agent',
    role: 'devops',
    capabilities: ['deployment', 'vcs-operations', 'infrastructure'],
    defaultModelTier: 'fast',
    maxConcurrentTasks: 2,
    tags: ['deployment', 'infrastructure', 'vcs'],
  };

  constructor(
    @Inject(VCS_PROVIDER) private readonly vcsProvider: IVCSProvider,
    @Inject(DEPLOY_PROVIDER) private readonly deployProvider: IDeployProvider,
    @Inject(FILESYSTEM_PROVIDER)
    private readonly fsProvider: IFileSystemProvider,
  ) {
    super();
  }

  async execute(input: AgentInput): Promise<AgentOutput> {
    const metrics = this.startMetrics();

    try {
      const taskType = input.taskDefinition.type;
      const artifacts: Artifact[] = [];
      const contextUpdates: ContextUpdate[] = [];

      if (taskType === 'deployment') {
        // Deploy flow
        const codeFiles = this.extractCodeFromPreviousOutputs(input);

        if (codeFiles.length > 0) {
          // Write files to filesystem
          for (const file of codeFiles) {
            try {
              await this.fsProvider.writeFile(file.path, file.content);
            } catch (err: any) {
              this.logger.warn(
                `[${input.traceId}] Failed to write ${file.path}: ${err.message}`,
              );
            }
          }

          // VCS commit
          try {
            const repoPath = '.';
            const commitHash = await this.vcsProvider.commit(
              repoPath,
              `feat: ${input.taskDefinition.description}`,
              codeFiles.map((f) => f.path),
            );

            artifacts.push({
              type: 'vcs-commit',
              content: commitHash,
              metadata: { filesCommitted: codeFiles.length },
            });
          } catch (err: any) {
            this.logger.warn(
              `[${input.traceId}] VCS commit skipped: ${err.message}`,
            );
          }

          // Deploy
          try {
            const result = await this.deployProvider.deploy('.', {
              description: input.taskDefinition.description,
            });

            artifacts.push({
              type: 'deployment',
              content: JSON.stringify(result),
              metadata: {
                url: result.url,
                deploymentId: result.deploymentId,
                status: result.status,
              },
            });

            contextUpdates.push({
              operation: 'add',
              entry: {
                type: 'decision' as const,
                scope: 'global' as const,
                tags: ['deployment'],
                content: { deploymentUrl: result.url, status: result.status },
                tokenCount: 20,
              },
              reason: `Deployment completed for task ${input.taskDefinition.id}`,
            });
          } catch (err: any) {
            this.logger.warn(
              `[${input.traceId}] Deployment skipped: ${err.message}`,
            );
            artifacts.push({
              type: 'deployment-skipped',
              content: err.message,
            });
          }
        }
      } else {
        // Configuration generation (deterministic)
        artifacts.push(this.generateConfig(input));
      }

      if (artifacts.length === 0) {
        artifacts.push({
          type: 'info',
          content: 'No operations required for this task',
        });
      }

      return this.buildSuccessOutput(input, artifacts, metrics, contextUpdates);
    } catch (error: any) {
      this.logger.error(
        `[${input.traceId}] DevOps agent failed: ${error.message}`,
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
        if (artifact.type === 'file' && artifact.path) {
          files.push({ path: artifact.path, content: artifact.content });
        }
      }
    }
    return files;
  }

  private generateConfig(input: AgentInput): Artifact {
    const configContent = [
      `# Configuration for: ${input.taskDefinition.description}`,
      `# Generated at: ${new Date().toISOString()}`,
      '',
      'NODE_ENV=production',
      'PORT=3000',
      '',
    ].join('\n');

    return {
      type: 'file',
      path: '.env.generated',
      content: configContent,
    };
  }
}
