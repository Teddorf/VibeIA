import { Controller, Post, Param } from '@nestjs/common';
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
}