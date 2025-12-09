import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service';
import { Project, ProjectSchema } from '../../schemas/project.schema';
import { GitModule } from '../git/git.module';
import { CodebaseAnalysisModule } from '../codebase-analysis/codebase-analysis.module';
import { UsersModule } from '../users/users.module';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    GitModule,
    CodebaseAnalysisModule,
    UsersModule,
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}