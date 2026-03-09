import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrchestratorService } from './orchestrator.service';

@Controller('api/orchestrator')
export class OrchestratorController {
  constructor(private readonly orchestratorService: OrchestratorService) {}

  @Post('execute')
  @HttpCode(HttpStatus.CREATED)
  async execute(
    @Body()
    body: {
      intent: string;
      projectId: string;
      apiKey: string;
      preferredProvider?: string;
    },
  ) {
    const plan = await this.orchestratorService.executeIntent(
      body.intent,
      body.projectId,
      { apiKey: body.apiKey, preferredProvider: body.preferredProvider },
    );
    return { plan };
  }

  @Get('plans/:id')
  async getPlan(@Param('id') id: string) {
    const plan = await this.orchestratorService.getPlan(id);
    if (!plan) {
      return { error: 'Plan not found' };
    }
    return { plan };
  }

  @Post('plans/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approvePlan(@Param('id') id: string) {
    const plan = await this.orchestratorService.approvePlan(id);
    return { plan };
  }

  @Get('plans/:id/status')
  async getPlanStatus(@Param('id') id: string) {
    const plan = await this.orchestratorService.getPlan(id);
    if (!plan) {
      return { error: 'Plan not found' };
    }
    return {
      status: (plan as any).status,
      nodes: plan.dag.map((n) => ({
        nodeId: n.nodeId,
        agentId: n.agentId,
        status: n.status,
      })),
    };
  }

  @Post('plans/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelPlan(@Param('id') id: string) {
    await this.orchestratorService.cancelPlan(id);
    return { status: 'cancelled' };
  }
}
