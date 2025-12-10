import { Controller, Post, Get, Param, UseGuards } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/execution')
@UseGuards(JwtAuthGuard)
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) { }

  @Post(':planId/start')
  async startExecution(
    @Param('planId') planId: string,
    @CurrentUser('userId') userId: string,
  ) {
    // Run in background (don't await)
    this.executionService.executePlan(planId, userId).catch(err => {
      console.error('Background execution failed:', err);
    });

    return { message: 'Execution started', planId };
  }

  @Get(':planId/status')
  async getExecutionStatus(
    @Param('planId') planId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.executionService.getExecutionStatus(planId, userId);
  }

  @Post(':planId/pause')
  async pauseExecution(
    @Param('planId') planId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.executionService.pauseExecution(planId, userId);
  }

  @Post(':planId/resume')
  async resumeExecution(
    @Param('planId') planId: string,
    @CurrentUser('userId') userId: string,
  ) {
    // Resume in background
    this.executionService.resumeExecution(planId, userId).catch(err => {
      console.error('Resume execution failed:', err);
    });

    return { message: 'Execution resumed', planId };
  }
}