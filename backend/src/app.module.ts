import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlansModule } from './modules/plans/plans.module';
import { GitModule } from './modules/git/git.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { LlmModule } from './modules/llm/llm.module';
import { QualityGatesModule } from './modules/quality-gates/quality-gates.module';
import { ManualTasksModule } from './modules/manual-tasks/manual-tasks.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/vibecoding'),
    PlansModule,
    GitModule,
    ProjectsModule,
    ExecutionModule,
    LlmModule,
    QualityGatesModule,
    ManualTasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}



