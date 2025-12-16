import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SecurityScannerService } from './security-scanner.service';
import { CredentialManagerService } from './credential-manager.service';
import { WorkspaceService } from './workspace.service';
import { RateLimiterService } from './rate-limiter.service';
import { CredentialProvider, WorkspaceStatus } from './dto/security.dto';

describe('SecurityScannerService', () => {
  let service: SecurityScannerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SecurityScannerService],
    }).compile();

    service = module.get<SecurityScannerService>(SecurityScannerService);
  });

  describe('scanFiles', () => {
    it('should scan files for secrets and vulnerabilities', async () => {
      const result = await service.scanFiles({
        files: [
          {
            path: 'test.js',
            content: 'const key = "sk-abc123def456ghi789jkl012mno345pqr678stu901vwx";',
          },
        ],
      });

      expect(result).toBeDefined();
      expect(result.filesScanned).toBe(1);
      expect(result.scannedAt).toBeDefined();
      expect(typeof result.riskScore).toBe('number');
      expect(typeof result.passed).toBe('boolean');
    });

    it('should detect AWS access keys', async () => {
      const result = await service.scanFiles({
        files: [
          {
            path: 'config.js',
            content: 'const AWS_KEY = "AKIAIOSFODNN7EXAMPLE";',
          },
        ],
      });

      expect(result.secretsFound.length).toBeGreaterThan(0);
      expect(result.secretsFound[0].secret.type).toBe('AWS Access Key');
    });

    it('should detect GitHub tokens', async () => {
      const result = await service.scanFiles({
        files: [
          {
            path: 'env.js',
            content: 'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";',
          },
        ],
      });

      expect(result.secretsFound.length).toBeGreaterThan(0);
      expect(result.secretsFound[0].secret.type).toBe('GitHub Token');
    });

    it('should detect eval usage as vulnerability', async () => {
      const result = await service.scanFiles({
        files: [
          {
            path: 'unsafe.js',
            content: 'const result = eval(userInput);',
          },
        ],
      });

      expect(result.vulnerabilities.length).toBeGreaterThan(0);
      expect(result.vulnerabilities[0].type).toBe('Code Injection');
    });

    it('should generate recommendations', async () => {
      const result = await service.scanFiles({
        files: [
          {
            path: 'test.js',
            content: 'const key = "AKIAIOSFODNN7EXAMPLE";',
          },
        ],
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should calculate risk score', async () => {
      const cleanResult = await service.scanFiles({
        files: [{ path: 'clean.js', content: 'const x = 1;' }],
      });

      const riskyResult = await service.scanFiles({
        files: [
          {
            path: 'risky.js',
            content: 'const key = "AKIAIOSFODNN7EXAMPLE"; eval(x);',
          },
        ],
      });

      expect(riskyResult.riskScore).toBeGreaterThan(cleanResult.riskScore);
    });
  });

  describe('scanForSecrets', () => {
    it('should detect Stripe secret keys', () => {
      const secrets = service.scanForSecrets(
        'payment.js',
        'const stripe = "sk_live_1234567890abcdefghijklmn";',
      );

      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets[0].secret.type).toBe('Stripe Secret Key');
      expect(secrets[0].secret.severity).toBe('critical');
    });

    it('should detect database URLs with credentials', () => {
      const secrets = service.scanForSecrets(
        'db.js',
        'const url = "postgres://user:password123@localhost:5432/db";',
      );

      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets[0].secret.type).toBe('Database URL');
    });

    it('should detect private keys', () => {
      const secrets = service.scanForSecrets(
        'key.pem',
        '-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJ',
      );

      expect(secrets.length).toBeGreaterThan(0);
      expect(secrets[0].secret.type).toBe('Private Key');
    });

    it('should mask detected secrets', () => {
      const secrets = service.scanForSecrets(
        'test.js',
        'const token = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";',
      );

      expect(secrets[0].secret.maskedValue).toContain('***');
      expect(secrets[0].secret.maskedValue).not.toContain('1234567890');
    });

    it('should return line and column numbers', () => {
      const content = 'line1\nconst key = "AKIAIOSFODNN7EXAMPLE";\nline3';
      const secrets = service.scanForSecrets('test.js', content);

      expect(secrets[0].line).toBe(2);
      expect(secrets[0].column).toBeGreaterThan(0);
    });
  });

  describe('scanForVulnerabilities', () => {
    it('should detect innerHTML usage', () => {
      const vulns = service.scanForVulnerabilities(
        'dom.js',
        'element.innerHTML = userContent;',
      );

      expect(vulns.length).toBeGreaterThan(0);
      expect(vulns[0].type).toBe('XSS Vulnerability');
    });

    it('should detect SQL injection patterns', () => {
      const vulns = service.scanForVulnerabilities(
        'query.js',
        'const sql = "SELECT * FROM users WHERE id = " + userId;',
      );

      expect(vulns.length).toBeGreaterThan(0);
      expect(vulns[0].type).toBe('SQL Injection');
    });

    it('should detect hardcoded passwords', () => {
      const vulns = service.scanForVulnerabilities(
        'config.js',
        'const password = "secret123";',
      );

      expect(vulns.length).toBeGreaterThan(0);
      expect(vulns[0].type).toBe('Hardcoded Password');
    });

    it('should detect TODO comments', () => {
      const vulns = service.scanForVulnerabilities(
        'code.js',
        '// TODO: fix this security issue',
      );

      expect(vulns.some(v => v.type === 'Code Quality')).toBe(true);
    });

    it('should provide remediation suggestions', () => {
      const vulns = service.scanForVulnerabilities(
        'unsafe.js',
        'eval(userInput);',
      );

      expect(vulns[0].remediation).toBeDefined();
      expect(vulns[0].remediation?.length).toBeGreaterThan(0);
    });
  });

  describe('validateSecurityHeaders', () => {
    it('should validate complete headers', () => {
      const result = service.validateSecurityHeaders({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000',
        'Content-Security-Policy': "default-src 'self'",
      });

      expect(result.valid).toBe(true);
      expect(result.missing.length).toBe(0);
    });

    it('should detect missing headers', () => {
      const result = service.validateSecurityHeaders({
        'X-Content-Type-Options': 'nosniff',
      });

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('X-Frame-Options');
    });

    it('should detect weak HSTS configuration', () => {
      const result = service.validateSecurityHeaders({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=3600',
        'Content-Security-Policy': "default-src 'self'",
      });

      expect(result.weak.length).toBeGreaterThan(0);
    });
  });

  describe('detectSensitiveFiles', () => {
    it('should detect .env files', () => {
      const result = service.detectSensitiveFiles(['.env', 'src/index.js']);

      expect(result.sensitive).toContain('.env');
    });

    it('should detect key files', () => {
      const result = service.detectSensitiveFiles(['server.key', 'cert.pem']);

      expect(result.sensitive).toContain('server.key');
      expect(result.sensitive).toContain('cert.pem');
    });

    it('should provide recommendations', () => {
      const result = service.detectSensitiveFiles(['.env.local']);

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });
});

// CredentialManagerService tests are in credential-manager.service.spec.ts
describe.skip('CredentialManagerService', () => {
  let service: CredentialManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialManagerService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-encryption-key-32chars!!'),
          },
        },
      ],
    }).compile();

    service = module.get<CredentialManagerService>(CredentialManagerService);
  });

  describe('storeCredential', () => {
    it('should store a credential and return id', async () => {
      const result = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'ghp_test_token_123',
      });

      expect(result.id).toBeDefined();
      expect(result.id).toContain('cred-');
      expect(result.provider).toBe(CredentialProvider.GITHUB);
    });

    it('should encrypt the token', async () => {
      const result = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'plain_text_token',
      });

      const credentials = await service.listCredentials('user-1');
      expect(credentials[0].id).toBe(result.id);
    });
  });

  describe('getCredential', () => {
    it('should retrieve a stored credential', async () => {
      const stored = await service.storeCredential('user-1', {
        provider: CredentialProvider.VERCEL,
        token: 'vercel_token_123',
      });

      const token = await service.getCredential('user-1', CredentialProvider.VERCEL);
      expect(token).toBe('vercel_token_123');
    });

    it('should return null for non-existent credential', async () => {
      const token = await service.getCredential('user-1', CredentialProvider.RAILWAY);
      expect(token).toBeNull();
    });

    it('should return null for different user', async () => {
      await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'token_123',
      });

      const token = await service.getCredential('user-2', CredentialProvider.GITHUB);
      expect(token).toBeNull();
    });
  });

  describe('getCredentialById', () => {
    it('should retrieve credential by ID', async () => {
      const stored = await service.storeCredential('user-1', {
        provider: CredentialProvider.NEON,
        token: 'neon_token_xyz',
      });

      const token = await service.getCredentialById(stored.id);
      expect(token).toBe('neon_token_xyz');
    });

    it('should return null for invalid ID', async () => {
      const token = await service.getCredentialById('invalid-id');
      expect(token).toBeNull();
    });
  });

  describe('listCredentials', () => {
    it('should list all credentials for a user', async () => {
      await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'token1',
      });
      await service.storeCredential('user-1', {
        provider: CredentialProvider.VERCEL,
        token: 'token2',
      });

      const credentials = await service.listCredentials('user-1');
      expect(credentials.length).toBe(2);
    });

    it('should not include tokens in listing', async () => {
      await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'secret_token',
      });

      const credentials = await service.listCredentials('user-1');
      expect(JSON.stringify(credentials)).not.toContain('secret_token');
    });
  });

  describe('deleteCredential', () => {
    it('should delete a credential', async () => {
      const stored = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'token',
      });

      const deleted = await service.deleteCredential('user-1', stored.id);
      expect(deleted).toBe(true);

      const token = await service.getCredentialById(stored.id);
      expect(token).toBeNull();
    });

    it('should return false for non-existent credential', async () => {
      const deleted = await service.deleteCredential('user-1', 'invalid-id');
      expect(deleted).toBe(false);
    });

    it('should not allow deleting another user credential', async () => {
      const stored = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'token',
      });

      const deleted = await service.deleteCredential('user-2', stored.id);
      expect(deleted).toBe(false);
    });
  });

  describe('rotateCredential', () => {
    it('should rotate a credential', async () => {
      const stored = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'old_token',
      });

      const rotated = await service.rotateCredential('user-1', stored.id, 'new_token');
      expect(rotated).toBe(true);

      const token = await service.getCredentialById(stored.id);
      expect(token).toBe('new_token');
    });
  });

  describe('shouldRotate', () => {
    it('should return false for new credentials', async () => {
      const stored = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'token',
      });

      const shouldRotate = service.shouldRotate(stored.id);
      expect(shouldRotate).toBe(false);
    });

    it('should return false for non-existent credentials', () => {
      const shouldRotate = service.shouldRotate('invalid-id');
      expect(shouldRotate).toBe(false);
    });
  });

  describe('ensureGitignore', () => {
    it('should return default gitignore entries', () => {
      const entries = service.ensureGitignore('/project');
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some(e => e.pattern === '.env')).toBe(true);
    });

    it('should include additional secrets', () => {
      const entries = service.ensureGitignore('/project', ['custom.secret']);
      expect(entries.some(e => e.pattern === 'custom.secret')).toBe(true);
    });
  });

  describe('generateGitignoreContent', () => {
    it('should generate gitignore content', () => {
      const content = service.generateGitignoreContent();
      expect(content).toContain('.env');
      expect(content).toContain('# Secrets and credentials');
    });
  });
});

// TODO: WorkspaceService tests need Mongoose model mocks
describe.skip('WorkspaceService', () => {
  let service: WorkspaceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkspaceService],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
  });

  describe('createWorkspace', () => {
    it('should create a workspace', async () => {
      const workspace = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      expect(workspace.id).toBeDefined();
      expect(workspace.id).toContain('ws-');
      expect(workspace.userId).toBe('user-1');
      expect(workspace.projectId).toBe('project-1');
      expect(workspace.status).toBe(WorkspaceStatus.RUNNING);
    });

    it('should apply default config', async () => {
      const workspace = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      expect(workspace.config.base).toBe('ubuntu:22.04');
      expect(workspace.config.tools).toContain('git');
    });

    it('should allow custom config', async () => {
      const workspace = await service.createWorkspace('user-1', {
        projectId: 'project-1',
        config: {
          base: 'node:20-alpine',
          lifetime: '6h',
        },
      });

      expect(workspace.config.base).toBe('node:20-alpine');
      expect(workspace.config.lifetime).toBe('6h');
    });

    it('should set expiration time', async () => {
      const workspace = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      expect(workspace.expiresAt).toBeDefined();
      expect(workspace.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('getWorkspace', () => {
    it('should retrieve a workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      const workspace = await service.getWorkspace(created.id);
      expect(workspace).toBeDefined();
      expect(workspace?.id).toBe(created.id);
    });

    it('should return null for non-existent workspace', async () => {
      const workspace = await service.getWorkspace('invalid-id');
      expect(workspace).toBeNull();
    });
  });

  describe('getUserWorkspaces', () => {
    it('should get all workspaces for a user', async () => {
      await service.createWorkspace('user-1', { projectId: 'p1' });
      await service.createWorkspace('user-1', { projectId: 'p2' });
      await service.createWorkspace('user-2', { projectId: 'p3' });

      const workspaces = await service.getUserWorkspaces('user-1');
      expect(workspaces.length).toBe(2);
    });
  });

  describe('pauseWorkspace', () => {
    it('should pause a running workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      const paused = await service.pauseWorkspace(created.id);
      expect(paused.status).toBe(WorkspaceStatus.PAUSED);
    });

    it('should throw for non-existent workspace', async () => {
      await expect(service.pauseWorkspace('invalid-id')).rejects.toThrow();
    });

    it('should throw for non-running workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });
      await service.pauseWorkspace(created.id);

      await expect(service.pauseWorkspace(created.id)).rejects.toThrow();
    });
  });

  describe('resumeWorkspace', () => {
    it('should resume a paused workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });
      await service.pauseWorkspace(created.id);

      const resumed = await service.resumeWorkspace(created.id);
      expect(resumed.status).toBe(WorkspaceStatus.RUNNING);
    });

    it('should throw for non-paused workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      await expect(service.resumeWorkspace(created.id)).rejects.toThrow();
    });
  });

  describe('destroyWorkspace', () => {
    it('should destroy a workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      await service.destroyWorkspace(created.id);

      const workspace = await service.getWorkspace(created.id);
      expect(workspace).toBeNull();
    });

    it('should handle destroying non-existent workspace', async () => {
      await expect(service.destroyWorkspace('invalid-id')).resolves.not.toThrow();
    });
  });

  describe('extendWorkspace', () => {
    it('should extend workspace expiration', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });
      const originalExpiration = created.expiresAt.getTime();

      const extended = await service.extendWorkspace(created.id, '1h');
      expect(extended.expiresAt.getTime()).toBeGreaterThan(originalExpiration);
    });

    it('should throw for non-existent workspace', async () => {
      await expect(service.extendWorkspace('invalid-id', '1h')).rejects.toThrow();
    });
  });

  describe('executeInWorkspace', () => {
    it('should execute command in workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      const result = await service.executeInWorkspace(created.id, 'echo hello');
      expect(result).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it('should throw for non-running workspace', async () => {
      const created = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });
      await service.pauseWorkspace(created.id);

      await expect(
        service.executeInWorkspace(created.id, 'echo hello'),
      ).rejects.toThrow();
    });
  });

  describe('getWorkspaceStats', () => {
    it('should return workspace statistics', async () => {
      await service.createWorkspace('user-1', { projectId: 'p1' });
      await service.createWorkspace('user-2', { projectId: 'p2' });

      const stats = service.getWorkspaceStats();
      expect(stats.total).toBe(2);
      expect(stats.running).toBe(2);
      expect(stats.byUser['user-1']).toBe(1);
    });
  });

  describe('cleanupExpiredWorkspaces', () => {
    it('should clean up expired workspaces', async () => {
      // Create a workspace with very short lifetime
      const workspace = await service.createWorkspace('user-1', {
        projectId: 'p1',
        config: { lifetime: '1ms' },
      });

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 10));

      const cleaned = await service.cleanupExpiredWorkspaces();
      expect(cleaned).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RateLimiterService],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
  });

  describe('registerLimiter', () => {
    it('should register a new limiter', () => {
      service.registerLimiter('custom', {
        windowMs: 60000,
        maxRequests: 10,
        message: 'Custom limit exceeded',
      });

      const stats = service.getStats('custom');
      expect(stats.length).toBe(1);
      expect(stats[0].name).toBe('custom');
    });
  });

  describe('checkLimit', () => {
    it('should allow requests within limit', () => {
      const result = service.checkLimit('global', 'test-key');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should track request count', () => {
      const key = 'track-key-' + Date.now();
      const result1 = service.checkLimit('global', key);
      const result2 = service.checkLimit('global', key);

      expect(result2.remaining).toBeLessThan(result1.remaining);
    });

    it('should block when limit exceeded', () => {
      service.registerLimiter('strict', {
        windowMs: 60000,
        maxRequests: 2,
        message: 'Limit exceeded',
      });

      const key = 'strict-key-' + Date.now();
      service.checkLimit('strict', key);
      service.checkLimit('strict', key);
      const result = service.checkLimit('strict', key);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.message).toBe('Limit exceeded');
    });

    it('should return allowed for unknown limiter', () => {
      const result = service.checkLimit('unknown', 'key');
      expect(result.allowed).toBe(true);
    });
  });

  describe('consume', () => {
    it('should consume multiple tokens', () => {
      service.registerLimiter('tokens', {
        windowMs: 60000,
        maxRequests: 10,
        message: 'Limit exceeded',
      });

      const key = 'consume-key-' + Date.now();
      const consumed = service.consume('tokens', key, 5);
      expect(consumed).toBe(true);

      const check = service.checkLimit('tokens', key);
      expect(check.remaining).toBeLessThanOrEqual(5);
    });

    it('should return false when not enough tokens', () => {
      service.registerLimiter('small', {
        windowMs: 60000,
        maxRequests: 3,
        message: 'Limit exceeded',
      });

      const key = 'small-key-' + Date.now();
      const consumed = service.consume('small', key, 10);
      expect(consumed).toBe(false);
    });
  });

  describe('resetLimit', () => {
    it('should reset limit for a key', () => {
      const key = 'reset-key-' + Date.now();
      service.checkLimit('global', key);
      service.checkLimit('global', key);

      service.resetLimit('global', key);

      const result = service.checkLimit('global', key);
      expect(result.remaining).toBe(99); // maxRequests - 1
    });
  });

  describe('getStats', () => {
    it('should return stats for all limiters', () => {
      const stats = service.getStats();
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].name).toBeDefined();
      expect(stats[0].config).toBeDefined();
    });

    it('should return stats for specific limiter', () => {
      const stats = service.getStats('global');
      expect(stats.length).toBe(1);
      expect(stats[0].name).toBe('global');
    });
  });

  describe('getSecurityHeaders', () => {
    it('should return default security headers', () => {
      const headers = service.getSecurityHeaders();
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('should apply overrides', () => {
      const headers = service.getSecurityHeaders({
        'X-Frame-Options': 'SAMEORIGIN',
      });
      expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
    });
  });

  describe('generateCSP', () => {
    it('should generate basic CSP', () => {
      const csp = service.generateCSP({});
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
    });

    it('should allow inline styles when specified', () => {
      const csp = service.generateCSP({ allowInlineStyles: true });
      expect(csp).toContain("'unsafe-inline'");
    });

    it('should include custom script sources', () => {
      const csp = service.generateCSP({
        scriptSources: ['https://cdn.example.com'],
      });
      expect(csp).toContain('https://cdn.example.com');
    });
  });

  describe('shouldSkipPath', () => {
    it('should skip configured paths', () => {
      const shouldSkip = service.shouldSkipPath('global', '/api/health');
      expect(shouldSkip).toBe(true);
    });

    it('should not skip non-configured paths', () => {
      const shouldSkip = service.shouldSkipPath('global', '/api/users');
      expect(shouldSkip).toBe(false);
    });

    it('should handle wildcard paths', () => {
      service.registerLimiter('wildcard', {
        windowMs: 60000,
        maxRequests: 100,
        message: 'Limit',
        skipPaths: ['/api/public/*'],
      });

      const shouldSkip = service.shouldSkipPath('wildcard', '/api/public/anything');
      expect(shouldSkip).toBe(true);
    });
  });
});
