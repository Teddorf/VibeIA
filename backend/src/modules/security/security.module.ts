import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { SecurityController } from './security.controller';
import { SecurityScannerService } from './security-scanner.service';
import { CredentialManagerService } from './credential-manager.service';
import { WorkspaceService } from './workspace.service';
import { RateLimiterService } from './rate-limiter.service';
import { SecurityAuditService } from './security-audit.service';
import { TokenEncryptionService } from './token-encryption.service';
import { Credential, CredentialSchema } from './schemas/credential.schema';
import { Workspace, WorkspaceSchema } from './schemas/workspace.schema';
import {
  SecurityAudit,
  SecurityAuditSchema,
} from './schemas/security-audit.schema';
import { createRepositoryProvider } from '../../providers/repository-providers.factory';
import {
  SECURITY_AUDIT_REPOSITORY,
  CREDENTIAL_REPOSITORY,
  WORKSPACE_REPOSITORY,
} from '../../providers/repository-tokens';

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
    TokenEncryptionService,
    createRepositoryProvider(SECURITY_AUDIT_REPOSITORY, SecurityAudit.name),
    createRepositoryProvider(CREDENTIAL_REPOSITORY, Credential.name),
    createRepositoryProvider(WORKSPACE_REPOSITORY, Workspace.name),
  ],
  exports: [
    SecurityScannerService,
    CredentialManagerService,
    WorkspaceService,
    RateLimiterService,
    SecurityAuditService,
    TokenEncryptionService,
  ],
})
export class SecurityModule {}
