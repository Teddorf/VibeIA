import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  NeonProjectConfig,
  NeonSetupResult,
  SetupTaskStatus,
  SetupStep,
} from './dto/setup.dto';

interface NeonApiProject {
  id: string;
  name: string;
  region_id: string;
  created_at: string;
  default_branch_id: string;
}

interface NeonApiBranch {
  id: string;
  name: string;
  project_id: string;
}

interface NeonApiDatabase {
  id: number;
  name: string;
  owner_name: string;
  branch_id: string;
}

interface NeonApiEndpoint {
  id: string;
  host: string;
  type: string;
}

@Injectable()
export class NeonSetupService {
  private readonly logger = new Logger(NeonSetupService.name);
  private readonly baseUrl = 'https://console.neon.tech/api/v2';

  constructor(private readonly configService: ConfigService) {}

  private getToken(): string {
    return this.configService.get<string>('NEON_API_TOKEN') || '';
  }

  private async apiRequest<T>(
    method: string,
    endpoint: string,
    body?: Record<string, unknown>,
    token?: string,
  ): Promise<T> {
    const apiToken = token || this.getToken();

    if (!apiToken) {
      throw new Error('Neon API token is not configured');
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
      throw new Error(`Neon API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async validateToken(token: string): Promise<{
    valid: boolean;
    accountInfo?: { name?: string; email?: string };
    error?: string;
  }> {
    try {
      const result = await this.apiRequest<{ projects: NeonApiProject[] }>(
        'GET',
        '/projects',
        undefined,
        token,
      );

      return {
        valid: true,
        accountInfo: {
          name: `${result.projects.length} projects`,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed',
      };
    }
  }

  selectOptimalRegion(preferredRegion?: string): string {
    const regions = [
      'aws-us-east-1',
      'aws-us-west-2',
      'aws-eu-central-1',
      'aws-ap-southeast-1',
    ];

    if (preferredRegion && regions.includes(preferredRegion)) {
      return preferredRegion;
    }

    // Default to US East
    return 'aws-us-east-1';
  }

  async createProject(
    config: NeonProjectConfig,
    token?: string,
  ): Promise<{ project: NeonApiProject; steps: SetupStep[] }> {
    const steps: SetupStep[] = [];

    const step1: SetupStep = {
      id: 'create-project',
      name: 'Creating Neon project',
      status: SetupTaskStatus.IN_PROGRESS,
    };
    steps.push(step1);

    try {
      const response = await this.apiRequest<{ project: NeonApiProject }>(
        'POST',
        '/projects',
        {
          project: {
            name: config.projectName,
            region_id: this.selectOptimalRegion(config.region),
            pg_version: config.pgVersion || 16,
            store_passwords: true,
            history_retention_seconds: 604800, // 7 days
          },
        },
        token,
      );

      step1.status = SetupTaskStatus.COMPLETED;
      step1.message = `Project created: ${response.project.name}`;

      return { project: response.project, steps };
    } catch (error) {
      step1.status = SetupTaskStatus.FAILED;
      step1.message = error instanceof Error ? error.message : 'Failed to create project';
      throw error;
    }
  }

  async createDatabase(
    projectId: string,
    branchId: string,
    dbName: string = 'main',
    token?: string,
  ): Promise<{ database: NeonApiDatabase; step: SetupStep }> {
    const step: SetupStep = {
      id: 'create-database',
      name: 'Creating database',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    try {
      const response = await this.apiRequest<{ database: NeonApiDatabase }>(
        'POST',
        `/projects/${projectId}/branches/${branchId}/databases`,
        {
          database: {
            name: dbName,
            owner_name: 'neondb_owner',
          },
        },
        token,
      );

      step.status = SetupTaskStatus.COMPLETED;
      step.message = `Database created: ${response.database.name}`;

      return { database: response.database, step };
    } catch (error) {
      step.status = SetupTaskStatus.FAILED;
      step.message = error instanceof Error ? error.message : 'Failed to create database';
      throw error;
    }
  }

  async createPreviewBranch(
    projectId: string,
    parentBranchId: string,
    token?: string,
  ): Promise<{ branch: NeonApiBranch; step: SetupStep }> {
    const step: SetupStep = {
      id: 'create-preview-branch',
      name: 'Creating preview branch',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    try {
      const response = await this.apiRequest<{ branch: NeonApiBranch }>(
        'POST',
        `/projects/${projectId}/branches`,
        {
          branch: {
            name: 'preview',
            parent_id: parentBranchId,
          },
          endpoints: [
            {
              type: 'read_write',
              autoscaling_limit_min_cu: 0.25,
              autoscaling_limit_max_cu: 2,
              suspend_timeout_seconds: 300,
            },
          ],
        },
        token,
      );

      step.status = SetupTaskStatus.COMPLETED;
      step.message = `Preview branch created: ${response.branch.name}`;

      return { branch: response.branch, step };
    } catch (error) {
      step.status = SetupTaskStatus.FAILED;
      step.message = error instanceof Error ? error.message : 'Failed to create preview branch';
      throw error;
    }
  }

  async getConnectionStrings(
    projectId: string,
    branchId: string,
    token?: string,
  ): Promise<{ main: string; pooled: string }> {
    const endpointsResponse = await this.apiRequest<{ endpoints: NeonApiEndpoint[] }>(
      'GET',
      `/projects/${projectId}/branches/${branchId}/endpoints`,
      undefined,
      token,
    );

    const endpoint = endpointsResponse.endpoints[0];
    if (!endpoint) {
      throw new Error('No endpoint found for branch');
    }

    // Get password from project (would need separate API call in real implementation)
    const password = 'PASSWORD_PLACEHOLDER';

    const main = `postgresql://neondb_owner:${password}@${endpoint.host}/main?sslmode=require`;
    const pooled = `postgresql://neondb_owner:${password}@${endpoint.host}/main?sslmode=require&pgbouncer=true`;

    return { main, pooled };
  }

  async validateConnection(connectionString: string): Promise<boolean> {
    // In a real implementation, we would test the connection
    // For now, we validate the format
    const pattern = /^postgresql:\/\/[\w-]+:[\w-]+@[\w.-]+\/[\w-]+/;
    return pattern.test(connectionString);
  }

  async execute(
    config: NeonProjectConfig,
    token?: string,
  ): Promise<NeonSetupResult & { steps: SetupStep[] }> {
    const allSteps: SetupStep[] = [];

    this.logger.log(`Starting Neon setup for project: ${config.projectName}`);

    // 1. Create project
    const { project, steps: projectSteps } = await this.createProject(config, token);
    allSteps.push(...projectSteps);

    // 2. Create database on default branch
    const { database, step: dbStep } = await this.createDatabase(
      project.id,
      project.default_branch_id,
      'main',
      token,
    );
    allSteps.push(dbStep);

    // 3. Create preview branch
    let previewBranchId: string | undefined;
    try {
      const { branch, step: branchStep } = await this.createPreviewBranch(
        project.id,
        project.default_branch_id,
        token,
      );
      allSteps.push(branchStep);
      previewBranchId = branch.id;
    } catch (error) {
      // Preview branch is optional
      this.logger.warn('Failed to create preview branch, continuing without it');
    }

    // 4. Get connection strings
    const connectionStep: SetupStep = {
      id: 'get-connection-strings',
      name: 'Getting connection strings',
      status: SetupTaskStatus.IN_PROGRESS,
    };
    allSteps.push(connectionStep);

    const connectionStrings = await this.getConnectionStrings(
      project.id,
      project.default_branch_id,
      token,
    );
    connectionStep.status = SetupTaskStatus.COMPLETED;
    connectionStep.message = 'Connection strings generated';

    this.logger.log(`Neon setup completed for project: ${project.id}`);

    return {
      projectId: project.id,
      databaseId: String(database.id),
      connectionStrings,
      dashboardUrl: `https://console.neon.tech/app/projects/${project.id}`,
      branches: {
        main: project.default_branch_id,
        preview: previewBranchId,
      },
      steps: allSteps,
    };
  }

  async rollback(projectId: string, token?: string): Promise<void> {
    this.logger.log(`Rolling back Neon project: ${projectId}`);

    try {
      await this.apiRequest('DELETE', `/projects/${projectId}`, undefined, token);
      this.logger.log(`Successfully deleted Neon project: ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to rollback Neon project: ${projectId}`, error);
      throw error;
    }
  }
}
