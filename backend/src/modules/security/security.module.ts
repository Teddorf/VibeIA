import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityController } from './security.controller';
import { SecurityScannerService } from './security-scanner.service';
import { CredentialManagerService } from './credential-manager.service';
import { WorkspaceService } from './workspace.service';
import { RateLimiterService } from './rate-limiter.service';
import { Credential, CredentialSchema } from './schemas/credential.schema';
import { Workspace, WorkspaceSchema } from './schemas/workspace.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Credential.name, schema: CredentialSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
    ]),
  ],
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
