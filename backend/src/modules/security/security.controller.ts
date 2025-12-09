import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { SecurityScannerService } from './security-scanner.service';
import { CredentialManagerService } from './credential-manager.service';
import { WorkspaceService } from './workspace.service';
import { RateLimiterService } from './rate-limiter.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ScanFilesDto,
  StoreCredentialDto,
  CreateWorkspaceDto,
  CredentialProvider,
  SecretScanResult,
  VulnerabilityResult,
} from './dto/security.dto';

@Controller('api/security')
export class SecurityController {
  constructor(
    private readonly scannerService: SecurityScannerService,
    private readonly credentialManager: CredentialManagerService,
    private readonly workspaceService: WorkspaceService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  // Security Scanning Endpoints
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  async scanFiles(@Body() dto: ScanFilesDto) {
    return this.scannerService.scanFiles(dto);
  }

  @Post('scan/secrets')
  @HttpCode(HttpStatus.OK)
  async scanSecrets(@Body() body: { files: { path: string; content: string }[] }) {
    const results: SecretScanResult[] = [];
    for (const file of body.files) {
      const secrets = this.scannerService.scanForSecrets(file.path, file.content);
      results.push(...secrets);
    }
    return { secrets: results, count: results.length };
  }

  @Post('scan/vulnerabilities')
  @HttpCode(HttpStatus.OK)
  async scanVulnerabilities(@Body() body: { files: { path: string; content: string }[] }) {
    const results: VulnerabilityResult[] = [];
    for (const file of body.files) {
      const vulns = this.scannerService.scanForVulnerabilities(file.path, file.content);
      results.push(...vulns);
    }
    return { vulnerabilities: results, count: results.length };
  }

  @Post('validate-headers')
  @HttpCode(HttpStatus.OK)
  async validateHeaders(@Body() body: { headers: Record<string, string> }) {
    return this.scannerService.validateSecurityHeaders(body.headers);
  }

  @Post('detect-sensitive-files')
  @HttpCode(HttpStatus.OK)
  async detectSensitiveFiles(@Body() body: { files: string[] }) {
    return this.scannerService.detectSensitiveFiles(body.files);
  }

  // Credential Management Endpoints
  @Post('credentials')
  async storeCredential(
    @Body() dto: StoreCredentialDto,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.credentialManager.storeCredential(userId, dto);
  }

  @Get('credentials')
  async listCredentials(@CurrentUser('userId') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.credentialManager.listCredentials(userId);
  }

  @Get('credentials/:provider')
  async getCredential(
    @Param('provider') provider: CredentialProvider,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const credential = await this.credentialManager.getCredential(userId, provider);
    return { exists: !!credential, provider };
  }

  @Delete('credentials/:id')
  async deleteCredential(
    @Param('id') credentialId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const deleted = await this.credentialManager.deleteCredential(userId, credentialId);
    return { deleted };
  }

  @Post('credentials/:id/rotate')
  async rotateCredential(
    @Param('id') credentialId: string,
    @Body() body: { newToken: string },
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const rotated = await this.credentialManager.rotateCredential(
      userId,
      credentialId,
      body.newToken,
    );
    return { rotated };
  }

  @Post('credentials/validate')
  async validateToken(
    @Body() body: { provider: CredentialProvider; token: string },
  ) {
    return this.credentialManager.validateToken(body.provider, body.token);
  }

  @Get('credentials/:id/should-rotate')
  async shouldRotate(@Param('id') credentialId: string) {
    const shouldRotate = this.credentialManager.shouldRotate(credentialId);
    return { shouldRotate };
  }

  // Workspace Management Endpoints
  @Post('workspaces')
  async createWorkspace(
    @Body() dto: CreateWorkspaceDto,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.workspaceService.createWorkspace(userId, dto);
  }

  @Get('workspaces')
  async getUserWorkspaces(@CurrentUser('userId') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.workspaceService.getUserWorkspaces(userId);
  }

  @Get('workspaces/stats')
  async getWorkspaceStats() {
    return this.workspaceService.getWorkspaceStats();
  }

  @Get('workspaces/:id')
  async getWorkspace(@Param('id') workspaceId: string) {
    const workspace = await this.workspaceService.getWorkspace(workspaceId);
    if (!workspace) {
      return { error: 'Workspace not found' };
    }
    return workspace;
  }

  @Post('workspaces/:id/pause')
  async pauseWorkspace(@Param('id') workspaceId: string) {
    return this.workspaceService.pauseWorkspace(workspaceId);
  }

  @Post('workspaces/:id/resume')
  async resumeWorkspace(@Param('id') workspaceId: string) {
    return this.workspaceService.resumeWorkspace(workspaceId);
  }

  @Post('workspaces/:id/extend')
  async extendWorkspace(
    @Param('id') workspaceId: string,
    @Body() body: { duration: string },
  ) {
    return this.workspaceService.extendWorkspace(workspaceId, body.duration);
  }

  @Delete('workspaces/:id')
  async destroyWorkspace(@Param('id') workspaceId: string) {
    await this.workspaceService.destroyWorkspace(workspaceId);
    return { destroyed: true };
  }

  @Post('workspaces/:id/exec')
  async executeInWorkspace(
    @Param('id') workspaceId: string,
    @Body() body: { command: string },
  ) {
    return this.workspaceService.executeInWorkspace(workspaceId, body.command);
  }

  @Post('workspaces/cleanup')
  async cleanupExpiredWorkspaces() {
    const cleaned = await this.workspaceService.cleanupExpiredWorkspaces();
    return { cleaned };
  }

  // Rate Limiting Endpoints
  @Get('rate-limits')
  async getRateLimitStats(@Query('name') name?: string) {
    return this.rateLimiter.getStats(name);
  }

  @Post('rate-limits/check')
  @HttpCode(HttpStatus.OK)
  async checkRateLimit(
    @Body() body: { limiter: string; key: string },
  ) {
    return this.rateLimiter.checkLimit(body.limiter, body.key);
  }

  @Post('rate-limits/reset')
  async resetRateLimit(
    @Body() body: { limiter: string; key: string },
  ) {
    this.rateLimiter.resetLimit(body.limiter, body.key);
    return { reset: true };
  }

  // Security Headers Endpoints
  @Get('headers')
  async getSecurityHeaders() {
    return this.rateLimiter.getSecurityHeaders();
  }

  @Post('headers/csp')
  @HttpCode(HttpStatus.OK)
  async generateCSP(
    @Body() options: {
      allowInlineStyles?: boolean;
      allowInlineScripts?: boolean;
      scriptSources?: string[];
      styleSources?: string[];
      imageSources?: string[];
      connectSources?: string[];
    },
  ) {
    const csp = this.rateLimiter.generateCSP(options);
    return { csp };
  }

  // Gitignore Management
  @Post('gitignore')
  @HttpCode(HttpStatus.OK)
  async generateGitignore(
    @Body() body: { projectPath: string; additionalSecrets?: string[] },
  ) {
    const entries = this.credentialManager.ensureGitignore(
      body.projectPath,
      body.additionalSecrets,
    );
    const content = this.credentialManager.generateGitignoreContent(entries);
    return { entries, content };
  }

  // Health check
  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        scanner: 'active',
        credentials: 'active',
        workspaces: 'active',
        rateLimiter: 'active',
      },
    };
  }
}
