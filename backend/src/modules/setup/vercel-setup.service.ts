import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  VercelProjectConfig,
  VercelSetupResult,
  VercelEnvironmentVariable,
  SetupTaskStatus,
  SetupStep,
} from './dto/setup.dto';

interface VercelApiProject {
  id: string;
  name: string;
  accountId: string;
  framework: string;
  createdAt: number;
}

interface VercelApiDeployment {
  id: string;
  url: string;
  state: string;
  readyState: string;
  createdAt: number;
}

@Injectable()
export class VercelSetupService {
  private readonly logger = new Logger(VercelSetupService.name);
  private readonly baseUrl = 'https://api.vercel.com';

  constructor(private readonly configService: ConfigService) {}

  private getToken(): string {
    return this.configService.get<string>('VERCEL_TOKEN') || '';
  }

  private async apiRequest<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>,
    token?: string,
  ): Promise<T> {
    const apiToken = token || this.getToken();

    if (!apiToken) {
      throw new Error('Vercel API token is not configured');
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Vercel API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async validateToken(token: string): Promise<{
    valid: boolean;
    accountInfo?: { name?: string; email?: string };
    error?: string;
  }> {
    try {
      const result = await this.apiRequest<{
        user: { name: string; email: string };
      }>('GET', '/v2/user', undefined, token);

      return {
        valid: true,
        accountInfo: {
          name: result.user.name,
          email: result.user.email,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  async createProject(
    config: VercelProjectConfig,
    token?: string,
  ): Promise<{ project: VercelApiProject; step: SetupStep }> {
    const step: SetupStep = {
      id: 'create-project',
      name: 'Creating Vercel project',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    try {
      const projectPayload: Record<string, unknown> = {
        name: config.projectName,
        framework: config.framework || 'nextjs',
      };

      if (config.gitRepository) {
        projectPayload.gitRepository = config.gitRepository;
      }

      if (config.rootDirectory) {
        projectPayload.rootDirectory = config.rootDirectory;
      }

      const response = await this.apiRequest<VercelApiProject>(
        'POST',
        '/v9/projects',
        projectPayload,
        token,
      );

      step.status = SetupTaskStatus.COMPLETED;
      step.message = `Project created: ${response.name}`;

      return { project: response, step };
    } catch (error) {
      step.status = SetupTaskStatus.FAILED;
      step.message = error instanceof Error ? error.message : 'Failed to create project';
      throw error;
    }
  }

  async configureEnvironmentVariables(
    projectId: string,
    variables: VercelEnvironmentVariable[],
    token?: string,
  ): Promise<SetupStep> {
    const step: SetupStep = {
      id: 'configure-env-vars',
      name: 'Configuring environment variables',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    try {
      for (const variable of variables) {
        await this.apiRequest(
          'POST',
          `/v10/projects/${projectId}/env`,
          {
            key: variable.key,
            value: variable.value,
            target: variable.target,
            type: 'encrypted',
          },
          token,
        );
      }

      step.status = SetupTaskStatus.COMPLETED;
      step.message = `${variables.length} environment variables configured`;

      return step;
    } catch (error) {
      step.status = SetupTaskStatus.FAILED;
      step.message = error instanceof Error ? error.message : 'Failed to configure env vars';
      throw error;
    }
  }

  async triggerDeployment(
    projectName: string,
    gitSource: {
      type: string;
      ref: string;
      repoId: string;
    },
    token?: string,
  ): Promise<{ deployment: VercelApiDeployment; step: SetupStep }> {
    const step: SetupStep = {
      id: 'trigger-deployment',
      name: 'Triggering deployment',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    try {
      const response = await this.apiRequest<VercelApiDeployment>(
        'POST',
        '/v13/deployments',
        {
          name: projectName,
          gitSource,
          target: 'production',
        },
        token,
      );

      step.status = SetupTaskStatus.COMPLETED;
      step.message = `Deployment triggered: ${response.id}`;

      return { deployment: response, step };
    } catch (error) {
      step.status = SetupTaskStatus.FAILED;
      step.message = error instanceof Error ? error.message : 'Failed to trigger deployment';
      throw error;
    }
  }

  async waitForDeployment(
    deploymentId: string,
    maxWaitTimeMs: number = 300000, // 5 minutes
    pollIntervalMs: number = 5000,
    token?: string,
  ): Promise<{ status: string; url: string; step: SetupStep }> {
    const step: SetupStep = {
      id: 'wait-deployment',
      name: 'Waiting for deployment to complete',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTimeMs) {
      const deployment = await this.apiRequest<VercelApiDeployment>(
        'GET',
        `/v13/deployments/${deploymentId}`,
        undefined,
        token,
      );

      if (deployment.readyState === 'READY') {
        step.status = SetupTaskStatus.COMPLETED;
        step.message = `Deployment ready: ${deployment.url}`;
        return { status: 'READY', url: deployment.url, step };
      }

      if (deployment.readyState === 'ERROR') {
        step.status = SetupTaskStatus.FAILED;
        step.message = 'Deployment failed';
        throw new Error('Deployment failed');
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    step.status = SetupTaskStatus.FAILED;
    step.message = 'Deployment timed out';
    throw new Error('Deployment timed out');
  }

  async execute(
    config: VercelProjectConfig,
    envVars?: VercelEnvironmentVariable[],
    gitSource?: { type: string; ref: string; repoId: string },
    token?: string,
  ): Promise<VercelSetupResult & { steps: SetupStep[] }> {
    const allSteps: SetupStep[] = [];

    this.logger.log(`Starting Vercel setup for project: ${config.projectName}`);

    // 1. Create project
    const { project, step: projectStep } = await this.createProject(config, token);
    allSteps.push(projectStep);

    // 2. Configure environment variables
    if (envVars && envVars.length > 0) {
      const envStep = await this.configureEnvironmentVariables(project.id, envVars, token);
      allSteps.push(envStep);
    }

    // 3. Trigger deployment if git source is provided
    let deploymentId: string | undefined;
    let deploymentStatus: string | undefined;
    let deploymentUrl: string | undefined;

    if (gitSource) {
      const { deployment, step: deployStep } = await this.triggerDeployment(
        config.projectName,
        gitSource,
        token,
      );
      allSteps.push(deployStep);
      deploymentId = deployment.id;

      // 4. Wait for deployment (optional - can be done asynchronously)
      try {
        const { status, url, step: waitStep } = await this.waitForDeployment(
          deployment.id,
          60000, // Wait only 1 minute for initial check
          5000,
          token,
        );
        allSteps.push(waitStep);
        deploymentStatus = status;
        deploymentUrl = url;
      } catch {
        // Deployment in progress - add a pending step
        const waitStep: SetupStep = {
          id: 'wait-deployment',
          name: 'Deployment in progress',
          status: SetupTaskStatus.IN_PROGRESS,
          message: 'Deployment is building...',
        };
        allSteps.push(waitStep);
        deploymentStatus = 'BUILDING';
      }
    }

    const projectUrl = `https://${config.projectName}.vercel.app`;
    const dashboardUrl = config.teamSlug
      ? `https://vercel.com/${config.teamSlug}/${config.projectName}`
      : `https://vercel.com/dashboard`;

    this.logger.log(`Vercel setup completed for project: ${project.id}`);

    return {
      projectId: project.id,
      url: deploymentUrl || projectUrl,
      dashboardUrl,
      deploymentId,
      deploymentStatus,
      steps: allSteps,
    };
  }

  async rollback(projectId: string, token?: string): Promise<void> {
    this.logger.log(`Rolling back Vercel project: ${projectId}`);

    try {
      await this.apiRequest('DELETE', `/v9/projects/${projectId}`, undefined, token);
      this.logger.log(`Successfully deleted Vercel project: ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to rollback Vercel project: ${projectId}`, error);
      throw error;
    }
  }
}
