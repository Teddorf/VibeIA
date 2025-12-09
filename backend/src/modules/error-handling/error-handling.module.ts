import { Module } from '@nestjs/common';
import { ErrorHandlingController } from './error-handling.controller';
import { RetryService } from './retry.service';
import { RollbackEngineService } from './rollback-engine.service';
import { RecoveryService } from './recovery.service';

@Module({
  controllers: [ErrorHandlingController],
  providers: [RetryService, RollbackEngineService, RecoveryService],
  exports: [RetryService, RollbackEngineService, RecoveryService],
})
export class ErrorHandlingModule {}
