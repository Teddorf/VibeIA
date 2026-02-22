import { Injectable, Logger } from '@nestjs/common';
import {
  IDeployProvider,
  IDeployResult,
} from '../interfaces/deploy-provider.interface';

@Injectable()
export class NullDeployAdapter implements IDeployProvider {
  private readonly logger = new Logger(NullDeployAdapter.name);

  async deploy(
    projectPath: string,
    _options?: Record<string, unknown>,
  ): Promise<IDeployResult> {
    this.logger.warn(
      `NullDeployAdapter: deploy() called for ${projectPath} — no-op`,
    );
    return {
      url: 'http://localhost:3000',
      deploymentId: 'null-deploy-' + Date.now(),
      status: 'success',
      logs: ['NullDeployAdapter: deployment simulated (no-op)'],
    };
  }

  async getStatus(deploymentId: string): Promise<IDeployResult> {
    this.logger.warn(
      `NullDeployAdapter: getStatus() called for ${deploymentId} — no-op`,
    );
    return {
      url: 'http://localhost:3000',
      deploymentId,
      status: 'success',
    };
  }

  async rollback(deploymentId: string): Promise<IDeployResult> {
    this.logger.warn(
      `NullDeployAdapter: rollback() called for ${deploymentId} — no-op`,
    );
    return {
      url: 'http://localhost:3000',
      deploymentId,
      status: 'success',
      logs: ['NullDeployAdapter: rollback simulated (no-op)'],
    };
  }
}
