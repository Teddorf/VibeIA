import { Module } from '@nestjs/common';
import { ManualTasksService } from './manual-tasks.service';
import { ManualTasksController } from './manual-tasks.controller';

@Module({
  controllers: [ManualTasksController],
  providers: [ManualTasksService],
  exports: [ManualTasksService],
})
export class ManualTasksModule {}
