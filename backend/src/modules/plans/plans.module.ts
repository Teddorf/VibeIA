import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { Plan, PlanSchema } from '../../schemas/plan.schema';
import { LlmModule } from '../llm/llm.module';
import { UsersModule } from '../users/users.module';
import { ProjectsModule } from '../projects/projects.module';
import { createRepositoryProvider } from '../../providers/repository-providers.factory';
import { PLAN_REPOSITORY } from '../../providers/repository-tokens';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]),
    LlmModule,
    UsersModule,
    forwardRef(() => ProjectsModule),
  ],
  controllers: [PlansController],
  providers: [
    PlansService,
    createRepositoryProvider(PLAN_REPOSITORY, Plan.name),
  ],
  exports: [PlansService],
})
export class PlansModule {}
