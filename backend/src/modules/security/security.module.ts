import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityController } from './security.controller';
import { SecurityScannerService } from './security-scanner.service';
import { CredentialManagerService } from './credential-manager.service';
import { WorkspaceService } from './workspace.service';
import { RateLimiterService } from './rate-limiter.service';

@Module({
  imports: [ConfigModule],
  controllers: [SecurityController],
  providers: [
    SecurityScannerService,
    CredentialManagerService,
    WorkspaceService,
    RateLimiterService,
  ],
  exports: [
    SecurityScannerService,
    CredentialManagerService,
    WorkspaceService,
    RateLimiterService,
  ],
})
export class SecurityModule {}
