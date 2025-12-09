import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlansModule } from './modules/plans/plans.module';
import { GitModule } from './modules/git/git.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { LlmModule } from './modules/llm/llm.module';
import { QualityGatesModule } from './modules/quality-gates/quality-gates.module';
import { ManualTasksModule } from './modules/manual-tasks/manual-tasks.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { DocumentationModule } from './modules/documentation/documentation.module';
import { SetupModule } from './modules/setup/setup.module';
import { ErrorHandlingModule } from './modules/error-handling/error-handling.module';
import { SecurityModule } from './modules/security/security.module';
import { BillingModule } from './modules/billing/billing.module';
import { TeamsModule } from './modules/teams/teams.module';
import { CodebaseAnalysisModule } from './modules/codebase-analysis/codebase-analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/vibecoding'),
    UsersModule,
    AuthModule,
    EventsModule,
    PlansModule,
    GitModule,
    ProjectsModule,
    ExecutionModule,
    LlmModule,
    QualityGatesModule,
    ManualTasksModule,
    RecommendationsModule,
    DocumentationModule,
    SetupModule,
    ErrorHandlingModule,
    SecurityModule,
    BillingModule,
    TeamsModule,
    TeamsModule,
    CodebaseAnalysisModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }



