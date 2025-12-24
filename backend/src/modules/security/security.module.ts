import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityController } from './security.controller';
import { SecurityScannerService } from './security-scanner.service';
import { CredentialManagerService } from './credential-manager.service';
import { WorkspaceService } from './workspace.service';
import { RateLimiterService } from './rate-limiter.service';
import { SecurityAuditService } from './security-audit.service';
import { Credential, CredentialSchema } from './schemas/credential.schema';
import { Workspace, WorkspaceSchema } from './schemas/workspace.schema';
import { SecurityAudit, SecurityAuditSchema } from './schemas/security-audit.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: Credential.name, schema: CredentialSchema },
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: SecurityAudit.name, schema: SecurityAuditSchema },
    ]),
  ],
  controllers: [SecurityController],
  providers: [
    SecurityScannerService,
    CredentialManagerService,
    WorkspaceService,
    RateLimiterService,
    SecurityAuditService,
  ],
  exports: [
    SecurityScannerService,
    CredentialManagerService,
    WorkspaceService,
    RateLimiterService,
    SecurityAuditService,
  ],
})
export class SecurityModule {}
