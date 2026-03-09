import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkerPoolManager } from './worker-pool-manager';

@Controller('api/workers')
export class WorkerPoolController {
  constructor(private readonly poolManager: WorkerPoolManager) {}

  @Get('status')
  async getAllStatuses() {
    const statuses = await this.poolManager.getAllPoolStatuses();
    return { pools: statuses };
  }

  @Get(':agentId/status')
  async getStatus(@Param('agentId') agentId: string) {
    const status = await this.poolManager.getPoolStatus(agentId);
    return { status };
  }

  @Patch(':agentId')
  async updateWorkers(
    @Param('agentId') agentId: string,
    @Body() body: { maxWorkers: number },
  ) {
    await this.poolManager.updateWorkerCount(agentId, body.maxWorkers);
    const status = await this.poolManager.getPoolStatus(agentId);
    return { status };
  }

  @Post(':agentId/pause')
  @HttpCode(HttpStatus.OK)
  async pauseQueue(@Param('agentId') agentId: string) {
    await this.poolManager.pauseQueue(agentId);
    return { status: 'paused' };
  }

  @Post(':agentId/resume')
  @HttpCode(HttpStatus.OK)
  async resumeQueue(@Param('agentId') agentId: string) {
    await this.poolManager.resumeQueue(agentId);
    return { status: 'resumed' };
  }
}
