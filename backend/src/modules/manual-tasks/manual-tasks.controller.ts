import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ManualTasksService, ManualTaskType } from './manual-tasks.service';

@Controller('api/manual-tasks')
export class ManualTasksController {
  constructor(private readonly manualTasksService: ManualTasksService) {}

  @Post('detect')
  detectManualTask(
    @Body() body: { name: string; description: string; type?: string },
  ) {
    const manualTask = this.manualTasksService.detectManualTasks(body);
    return {
      isManual: !!manualTask,
      task: manualTask,
    };
  }

  @Get('template/:type')
  getTemplate(@Param('type') type: ManualTaskType) {
    return this.manualTasksService.getTaskTemplate(type);
  }

  @Post('validate')
  async validateInputs(
    @Body() body: { taskType: ManualTaskType; inputs: Record<string, string> },
  ) {
    const task = this.manualTasksService.getTaskTemplate(body.taskType);
    return this.manualTasksService.validateInputs(task, body.inputs);
  }

  @Post('generate-env')
  generateEnvFile(@Body() body: { inputs: Record<string, string> }) {
    return {
      content: this.manualTasksService.generateEnvFileContent(body.inputs),
    };
  }
}
