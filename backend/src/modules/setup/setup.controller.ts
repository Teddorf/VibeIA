import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SetupOrchestratorService } from './setup-orchestrator.service';
import { NeonSetupService } from './neon-setup.service';
import { VercelSetupService } from './vercel-setup.service';
import { RailwaySetupService } from './railway-setup.service';
import {
  StartSetupDto,
  ValidateTokensDto,
  SetupStatusResponse,
  SetupProvider,
} from './dto/setup.dto';

@Controller('api/setup')
export class SetupController {
  constructor(
    private readonly orchestrator: SetupOrchestratorService,
    private readonly neonSetupService: NeonSetupService,
    private readonly vercelSetupService: VercelSetupService,
    private readonly railwaySetupService: RailwaySetupService,
  ) {}

  // Protected endpoints - require authentication
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async startSetup(
    @CurrentUser('userId') userId: string,
    @Body() dto: StartSetupDto & { tokens?: { neon?: string; vercel?: string; railway?: string } },
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const config = {
      projectId: dto.projectId,
      projectName: dto.projectName,
      userId, // Track who initiated the setup
      providers: {
        neon: dto.enableNeon ? dto.neonConfig || { projectName: dto.projectName } : undefined,
        vercel: dto.enableVercel
          ? dto.vercelConfig || { projectName: dto.projectName }
          : undefined,
        railway: dto.enableRailway
          ? dto.railwayConfig || { projectName: dto.projectName }
          : undefined,
      },
      envVars: dto.envVars,
    };

    const { setupId, result } = await this.orchestrator.execute(config, dto.tokens);

    return {
      setupId,
      success: result.success,
      status: result.state.status,
      progress: result.state.progress,
      tasks: result.state.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        provider: task.provider,
        status: task.status,
        steps: task.steps,
        error: task.error,
      })),
      urls: result.urls,
      credentials: result.credentials,
      nextSteps: result.nextSteps,
      generatedEnvFile: result.generatedEnvFile,
    };
  }

  @Get('status/:setupId')
  async getStatus(
    @CurrentUser('userId') userId: string,
    @Param('setupId') setupId: string,
  ): Promise<SetupStatusResponse | { error: string }> {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const state = await this.orchestrator.getStatusAsync(setupId);

    if (!state) {
      return { error: 'Setup not found' };
    }

    const currentTask = state.tasks[state.currentTaskIndex];

    return {
      setupId,
      status: state.status,
      progress: state.progress,
      currentTask: currentTask?.name,
      tasks: state.tasks,
      urls: state.urls,
    };
  }

  @Post('validate-tokens')
  @HttpCode(HttpStatus.OK)
  async validateTokens(
    @CurrentUser('userId') userId: string,
    @Body() dto: ValidateTokensDto,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    const results = await this.orchestrator.validateAllTokens({
      neon: dto.neonToken,
      vercel: dto.vercelToken,
      railway: dto.railwayToken,
    });

    return {
      neon: results.neon,
      vercel: results.vercel,
      railway: results.railway,
    };
  }

  @Post('rollback/:setupId')
  @HttpCode(HttpStatus.OK)
  async rollback(
    @CurrentUser('userId') userId: string,
    @Param('setupId') setupId: string,
    @Body() tokens?: { neon?: string; vercel?: string; railway?: string },
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }

    await this.orchestrator.rollback(setupId, tokens);

    return {
      success: true,
      message: 'Rollback completed',
    };
  }

  @Public()
  @Get('providers')
  getProviders() {
    return {
      providers: [
        {
          id: SetupProvider.NEON,
          name: 'Neon',
          description: 'Serverless PostgreSQL database',
          type: 'database',
          features: ['Auto-scaling', 'Database branching', 'Point-in-time recovery'],
          requiredTokenEnvVar: 'NEON_API_TOKEN',
          dashboardUrl: 'https://console.neon.tech',
          docsUrl: 'https://neon.tech/docs',
        },
        {
          id: SetupProvider.VERCEL,
          name: 'Vercel',
          description: 'Frontend deployment platform',
          type: 'hosting',
          features: ['Edge network', 'Automatic SSL', 'Preview deployments'],
          requiredTokenEnvVar: 'VERCEL_TOKEN',
          dashboardUrl: 'https://vercel.com/dashboard',
          docsUrl: 'https://vercel.com/docs',
        },
        {
          id: SetupProvider.RAILWAY,
          name: 'Railway',
          description: 'Backend deployment platform',
          type: 'hosting',
          features: ['Auto-deploy from Git', 'Built-in databases', 'Easy scaling'],
          requiredTokenEnvVar: 'RAILWAY_TOKEN',
          dashboardUrl: 'https://railway.app/dashboard',
          docsUrl: 'https://docs.railway.app',
        },
      ],
    };
  }

  // Individual token validation - protected
  @Post('neon/validate')
  @HttpCode(HttpStatus.OK)
  async validateNeonToken(
    @CurrentUser('userId') userId: string,
    @Body() body: { token: string },
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.neonSetupService.validateToken(body.token);
  }

  @Post('vercel/validate')
  @HttpCode(HttpStatus.OK)
  async validateVercelToken(
    @CurrentUser('userId') userId: string,
    @Body() body: { token: string },
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.vercelSetupService.validateToken(body.token);
  }

  @Post('railway/validate')
  @HttpCode(HttpStatus.OK)
  async validateRailwayToken(
    @CurrentUser('userId') userId: string,
    @Body() body: { token: string },
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.railwaySetupService.validateToken(body.token);
  }

  // Public informational endpoints
  @Public()
  @Get('regions')
  getRegions() {
    return {
      neon: [
        { id: 'aws-us-east-1', name: 'US East (N. Virginia)', default: true },
        { id: 'aws-us-west-2', name: 'US West (Oregon)' },
        { id: 'aws-eu-central-1', name: 'EU (Frankfurt)' },
        { id: 'aws-ap-southeast-1', name: 'Asia Pacific (Singapore)' },
      ],
      vercel: [
        { id: 'iad1', name: 'Washington, D.C., USA', default: true },
        { id: 'sfo1', name: 'San Francisco, USA' },
        { id: 'fra1', name: 'Frankfurt, Germany' },
        { id: 'sin1', name: 'Singapore' },
      ],
      railway: [
        { id: 'us-west1', name: 'US West', default: true },
        { id: 'us-east4', name: 'US East' },
        { id: 'europe-west4', name: 'Europe' },
        { id: 'asia-southeast1', name: 'Singapore' },
      ],
    };
  }
}
