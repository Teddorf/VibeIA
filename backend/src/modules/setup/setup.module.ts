import { Module } from '@nestjs/common';
import { SetupController } from './setup.controller';
import { SetupOrchestratorService } from './setup-orchestrator.service';
import { NeonSetupService } from './neon-setup.service';
import { VercelSetupService } from './vercel-setup.service';
import { RailwaySetupService } from './railway-setup.service';

@Module({
  controllers: [SetupController],
  providers: [
    SetupOrchestratorService,
    NeonSetupService,
    VercelSetupService,
    RailwaySetupService,
  ],
  exports: [
    SetupOrchestratorService,
    NeonSetupService,
    VercelSetupService,
    RailwaySetupService,
  ],
})
export class SetupModule {}
