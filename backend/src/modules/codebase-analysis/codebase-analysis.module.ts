import { Module } from '@nestjs/common';
import { CodebaseAnalysisService } from './codebase-analysis.service';
import { CodebaseAnalysisController } from './codebase-analysis.controller';
import { StructureAnalyzer } from './analyzers/structure.analyzer';
import { TechStackAnalyzer } from './analyzers/tech-stack.analyzer';
import { DependenciesAnalyzer } from './analyzers/dependencies.analyzer';
import { CodeQualityAnalyzer } from './analyzers/code-quality.analyzer';
import { GitModule } from '../git/git.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [GitModule, UsersModule],
  controllers: [CodebaseAnalysisController],
  providers: [
    CodebaseAnalysisService,
    StructureAnalyzer,
    TechStackAnalyzer,
    DependenciesAnalyzer,
    CodeQualityAnalyzer,
  ],
  exports: [CodebaseAnalysisService],
})
export class CodebaseAnalysisModule {}
