import { Module } from '@nestjs/common';
import { ExecutionService } from './execution.service';
import { ExecutionController } from './execution.controller';
import { PlansModule } from '../plans/plans.module';
import { ProjectsModule } from '../projects/projects.module';
import { GitModule } from '../git/git.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [
    PlansModule,
    ProjectsModule,
    GitModule,
    LlmModule,
  ],
  controllers: [ExecutionController],
  providers: [ExecutionService],
})
export class ExecutionModule {}