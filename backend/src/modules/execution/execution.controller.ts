import { Controller, Post, Get, Param } from '@nestjs/common';
import { ExecutionService } from './execution.service';

@Controller('api/execution')
export class ExecutionController {
  constructor(private readonly executionService: ExecutionService) {}

  @Post(':planId/start')
  async startExecution(@Param('planId') planId: string) {
    // Run in background (don't await)
    this.executionService.executePlan(planId).catch(err => {
      console.error('Background execution failed:', err);
    });

    return { message: 'Execution started', planId };
  }

  @Get(':planId/status')
  async getExecutionStatus(@Param('planId') planId: string) {
    return this.executionService.getExecutionStatus(planId);
  }

  @Post(':planId/pause')
  async pauseExecution(@Param('planId') planId: string) {
    return this.executionService.pauseExecution(planId);
  }

  @Post(':planId/resume')
  async resumeExecution(@Param('planId') planId: string) {
    // Resume in background
    this.executionService.resumeExecution(planId).catch(err => {
      console.error('Resume execution failed:', err);
    });

    return { message: 'Execution resumed', planId };
  }
}