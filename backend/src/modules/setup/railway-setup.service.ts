import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RailwayProjectConfig,
  RailwayServiceConfig,
  RailwaySetupResult,
  SetupTaskStatus,
  SetupStep,
} from './dto/setup.dto';

interface RailwayApiProject {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

interface RailwayApiService {
  id: string;
  name: string;
  projectId: string;
}

interface RailwayApiDomain {
  id: string;
  domain: string;
  serviceId: string;
}

interface RailwayApiDatabase {
  id: string;
  name: string;
  type: string;
  connectionString: string;
}

@Injectable()
export class RailwaySetupService {
  private readonly logger = new Logger(RailwaySetupService.name);
  private readonly graphqlUrl = 'https://backboard.railway.app/graphql/v2';

  constructor(private readonly configService: ConfigService) {}

  private getToken(): string {
    return this.configService.get<string>('RAILWAY_TOKEN') || '';
  }

  private async graphqlRequest<T>(
    query: string,
    variables?: Record<string, unknown>,
    token?: string,
  ): Promise<T> {
    const apiToken = token || this.getToken();

    if (!apiToken) {
      throw new Error('Railway API token is not configured');
    }

    const response = await fetch(this.graphqlUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Railway API error: ${response.status} - ${error}`);
    }

    const result = await response.json();

    if (result.errors && result.errors.length > 0) {
      throw new Error(`Railway GraphQL error: ${result.errors[0].message}`);
    }

    return result.data;
  }

  async validateToken(token: string): Promise<{
    valid: boolean;
    accountInfo?: { name?: string; email?: string };
    error?: string;
  }> {
    try {
      const query = `
        query {
          me {
            id
            email
            name
          }
        }
      `;

      const result = await this.graphqlRequest<{ me: { name: string; email: string } }>(
        query,
        undefined,
        token,
      );

      return {
        valid: true,
        accountInfo: {
          name: result.me.name,
          email: result.me.email,
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
    config: RailwayProjectConfig,
    token?: string,
  ): Promise<{ project: RailwayApiProject; step: SetupStep }> {
    const step: SetupStep = {
      id: 'create-project',
      name: 'Creating Railway project',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    try {
      const query = `
        mutation createProject($name: String!, $description: String, $isPublic: Boolean) {
          projectCreate(input: { name: $name, description: $description, isPublic: $isPublic }) {
            id
            name
            description
            createdAt
          }
        }
      `;

      const result = await this.graphqlRequest<{ projectCreate: RailwayApiProject }>(
        query,
        {
          name: config.projectName,
          description: config.description || 'Created by VibeCoding',
          isPublic: config.isPublic || false,
        },
        token,
      );

      step.status = SetupTaskStatus.COMPLETED;
      step.message = `Project created: ${result.projectCreate.name}`;

      return { project: result.projectCreate, step };
    } catch (error) {
      step.status = SetupTaskStatus.FAILED;
      step.message = error instanceof Error ? error.message : 'Failed to create project';
      throw error;
    }
  }

  async createService(
    projectId: string,
    config: RailwayServiceConfig,
    token?: string,
  ): Promise<{ service: RailwayApiService; step: SetupStep }> {
    const step: SetupStep = {
      id: 'create-api-service',
      name: 'Creating API service',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    try {
      const query = `
        mutation createService($projectId: String!, $name: String!) {
          serviceCreate(input: { projectId: $projectId, name: $name }) {
            id
            name
            projectId
          }
        }
      `;

      const result = await this.graphqlRequest<{ serviceCreate: RailwayApiService }>(
        query,
        {
          projectId,
          name: config.name,
        },
        token,
      );

      step.status = SetupTaskStatus.COMPLETED;
      step.message = `Service created: ${result.serviceCreate.name}`;

      return { service: result.serviceCreate, step };
    } catch (error) {
      step.status = SetupTaskStatus.FAILED;
      step.message = error instanceof Error ? error.message : 'Failed to create service';
      throw error;
    }
  }

  async connectGitRepository(
    serviceId: string,
    repoFullName: string,
    branch: string = 'main',
    token?: string,
  ): Promise<SetupStep> {
    const step: SetupStep = {
      id: 'connect-git-repo',
      name: 'Connecting Git repository',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    try {
      const query = `
        mutation serviceSourceConnect($serviceId: String!, $repo: String!, $branch: String!) {
          serviceSourceUpdate(input: {
            serviceId: $serviceId,
            source: { repo: $repo, branch: $branch }
          }) {
            id
          }
        }
      `;

      await this.graphqlRequest(
        query,
        {
          serviceId,
          repo: repoFullName,
          branch,
        },
        token,
      );

      step.status = SetupTaskStatus.COMPLETED;
      step.message = `Connected to ${repoFullName}`;

      return step;
    } catch (error) {
      step.status = SetupTaskStatus.FAILED;
      step.message = error instanceof Error ? error.message : 'Failed to connect repository';
      throw error;
    }
  }

  async createRedisDatabase(
    projectId: string,
    token?: string,
  ): Promise<{ database: RailwayApiDatabase; step: SetupStep }> {
    const step: SetupStep = {
      id: 'create-redis',
      name: 'Creating Redis database',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    try {
      // Railway uses plugins for databases
      const query = `
        mutation createPlugin($projectId: String!, $name: String!) {
          pluginCreate(input: { projectId: $projectId, name: $name }) {
            id
            name
          }
        }
      `;

      const result = await this.graphqlRequest<{
        pluginCreate: { id: string; name: string };
      }>(
        query,
        {
          projectId,
          name: 'redis',
        },
        token,
      );

      step.status = SetupTaskStatus.COMPLETED;
      step.message = 'Redis database created';

      return {
        database: {
          id: result.pluginCreate.id,
          name: result.pluginCreate.name,
          type: 'redis',
          connectionString: 'REDIS_URL', // Retrieved from env vars after creation
        },
        step,
      };
    } catch (error) {
      step.status = SetupTaskStatus.FAILED;
      step.message = error instanceof Error ? error.message : 'Failed to create Redis';
      throw error;
    }
  }

  async configureEnvironmentVariables(
    serviceId: string,
    variables: Record<string, string>,
    token?: string,
  ): Promise<SetupStep> {
    const step: SetupStep = {
      id: 'configure-env-vars',
      name: 'Configuring environment variables',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    try {
      const query = `
        mutation variableUpsert($input: VariableUpsertInput!) {
          variableUpsert(input: $input)
        }
      `;

      for (const [name, value] of Object.entries(variables)) {
        await this.graphqlRequest(
          query,
          {
            input: {
              serviceId,
              name,
              value,
            },
          },
          token,
        );
      }

      step.status = SetupTaskStatus.COMPLETED;
      step.message = `${Object.keys(variables).length} environment variables configured`;

      return step;
    } catch (error) {
      step.status = SetupTaskStatus.FAILED;
      step.message = error instanceof Error ? error.message : 'Failed to configure env vars';
      throw error;
    }
  }

  async generateDomain(
    serviceId: string,
    token?: string,
  ): Promise<{ domain: RailwayApiDomain; step: SetupStep }> {
    const step: SetupStep = {
      id: 'generate-domain',
      name: 'Generating domain',
      status: SetupTaskStatus.IN_PROGRESS,
    };

    try {
      const query = `
        mutation domainCreate($serviceId: String!) {
          serviceDomainCreate(input: { serviceId: $serviceId }) {
            id
            domain
            serviceId
          }
        }
      `;

      const result = await this.graphqlRequest<{
        serviceDomainCreate: RailwayApiDomain;
      }>(
        query,
        { serviceId },
        token,
      );

      step.status = SetupTaskStatus.COMPLETED;
      step.message = `Domain generated: ${result.serviceDomainCreate.domain}`;

      return { domain: result.serviceDomainCreate, step };
    } catch (error) {
      step.status = SetupTaskStatus.FAILED;
      step.message = error instanceof Error ? error.message : 'Failed to generate domain';
      throw error;
    }
  }

  async execute(
    config: RailwayProjectConfig,
    serviceConfig?: RailwayServiceConfig,
    needsRedis?: boolean,
    envVars?: Record<string, string>,
    token?: string,
  ): Promise<RailwaySetupResult & { steps: SetupStep[] }> {
    const allSteps: SetupStep[] = [];

    this.logger.log(`Starting Railway setup for project: ${config.projectName}`);

    // 1. Create project
    const { project, step: projectStep } = await this.createProject(config, token);
    allSteps.push(projectStep);

    let apiServiceId: string | undefined;
    let apiUrl: string | undefined;
    let redisInfo: { id: string; connectionString: string } | undefined;

    // 2. Create API service if config provided
    if (serviceConfig) {
      const { service, step: serviceStep } = await this.createService(
        project.id,
        serviceConfig,
        token,
      );
      allSteps.push(serviceStep);
      apiServiceId = service.id;

      // 3. Connect Git repository
      if (serviceConfig.repoFullName) {
        const gitStep = await this.connectGitRepository(
          service.id,
          serviceConfig.repoFullName,
          serviceConfig.branch,
          token,
        );
        allSteps.push(gitStep);
      }

      // 4. Generate domain
      const { domain, step: domainStep } = await this.generateDomain(service.id, token);
      allSteps.push(domainStep);
      apiUrl = `https://${domain.domain}`;

      // 5. Configure environment variables
      if (envVars && Object.keys(envVars).length > 0) {
        const envStep = await this.configureEnvironmentVariables(service.id, envVars, token);
        allSteps.push(envStep);
      }
    }

    // 6. Create Redis if needed
    if (needsRedis) {
      try {
        const { database, step: redisStep } = await this.createRedisDatabase(project.id, token);
        allSteps.push(redisStep);
        redisInfo = {
          id: database.id,
          connectionString: database.connectionString,
        };
      } catch (error) {
        this.logger.warn('Failed to create Redis, continuing without it');
      }
    }

    const dashboardUrl = `https://railway.app/project/${project.id}`;

    this.logger.log(`Railway setup completed for project: ${project.id}`);

    return {
      projectId: project.id,
      services: {
        api: apiServiceId
          ? {
              id: apiServiceId,
              url: apiUrl || '',
            }
          : undefined,
        redis: redisInfo,
      },
      dashboardUrl,
      steps: allSteps,
    };
  }

  async rollback(projectId: string, token?: string): Promise<void> {
    this.logger.log(`Rolling back Railway project: ${projectId}`);

    try {
      const query = `
        mutation projectDelete($id: String!) {
          projectDelete(id: $id)
        }
      `;

      await this.graphqlRequest(query, { id: projectId }, token);
      this.logger.log(`Successfully deleted Railway project: ${projectId}`);
    } catch (error) {
      this.logger.error(`Failed to rollback Railway project: ${projectId}`, error);
      throw error;
    }
  }
}
