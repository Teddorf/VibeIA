import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SetupController } from './setup.controller';
import { SetupOrchestratorService } from './setup-orchestrator.service';
import { NeonSetupService } from './neon-setup.service';
import { VercelSetupService } from './vercel-setup.service';
import { RailwaySetupService } from './railway-setup.service';
import { NeonExecutor } from './executors/NeonExecutor';
import { VercelExecutor } from './executors/VercelExecutor';
import { RailwayExecutor } from './executors/RailwayExecutor';
import { SetupState, SetupStateSchema } from './schemas/setup-state.schema';
import { RollbackAction, RollbackActionSchema } from './schemas/rollback-action.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SetupState.name, schema: SetupStateSchema },
      { name: RollbackAction.name, schema: RollbackActionSchema },
    ]),
  ],
  controllers: [SetupController],
  providers: [
    SetupOrchestratorService,
    NeonSetupService,
    VercelSetupService,
    RailwaySetupService,
    NeonExecutor,
    VercelExecutor,
    RailwayExecutor,
  ],
  exports: [
    SetupOrchestratorService,
    NeonSetupService,
    VercelSetupService,
    RailwaySetupService,
    NeonExecutor,
    VercelExecutor,
    RailwayExecutor,
  ],
})
export class SetupModule { }
