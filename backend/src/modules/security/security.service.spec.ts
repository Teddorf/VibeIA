import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { SecurityScannerService } from './security-scanner.service';
import { CredentialManagerService } from './credential-manager.service';
import { WorkspaceService } from './workspace.service';
import { RateLimiterService } from './rate-limiter.service';
import { Credential } from './schemas/credential.schema';
import { Workspace } from './schemas/workspace.schema';
import { CredentialProvider, WorkspaceStatus } from './dto/security.dto';

/** Helper to configure mock model constructor to return a saveable instance */
function mockWorkspaceConstructor(model: any, savedResult: any) {
  model.mockImplementation((data: any) => ({
    ...data,
    _id: savedResult._id,
    save: jest.fn().mockResolvedValue(savedResult),
  }));
}

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

describe('CredentialManagerService', () => {
  let service: CredentialManagerService;
  let credentialModel: any;

  beforeEach(async () => {
    // Create a mock model that can be used as a constructor
    const mockCredentialModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: 'cred-mock-id',
      save: jest.fn().mockResolvedValue({ ...data, _id: 'cred-mock-id' }),
    }));
    mockCredentialModel.findOne = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockCredentialModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockCredentialModel.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockCredentialModel.findOneAndDelete = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockCredentialModel.findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockCredentialModel.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      }),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialManagerService,
        {
          provide: getModelToken(Credential.name),
          useValue: mockCredentialModel,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-encryption-key-32chars!!'),
          },
        },
      ],
    }).compile();

    service = module.get<CredentialManagerService>(CredentialManagerService);
    credentialModel = mockCredentialModel;
  });

  describe('storeCredential', () => {
    it('should store a credential and return id and provider', async () => {
      const result = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'ghp_test_token_123',
      });

      expect(result.id).toBe('cred-mock-id');
      expect(result.provider).toBe(CredentialProvider.GITHUB);
      expect(credentialModel).toHaveBeenCalled();
    });

    it('should encrypt the token before storing', async () => {
      await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'plain_text_token',
      });

      // Verify the constructor was called with an encrypted token (not plaintext)
      const constructorCall = credentialModel.mock.calls[0][0];
      expect(constructorCall.encryptedToken).toBeDefined();
      expect(constructorCall.encryptedToken).not.toBe('plain_text_token');
    });
  });

  describe('getCredential', () => {
    it('should retrieve and decrypt a stored credential', async () => {
      // Encrypt a token to store as mock data
      const encrypted = (service as any).encrypt('vercel_token_123');

      credentialModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'cred-1',
          encryptedToken: encrypted,
        }),
      });
      credentialModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const token = await service.getCredential('user-1', CredentialProvider.VERCEL);
      expect(token).toBe('vercel_token_123');
    });

    it('should return null for non-existent credential', async () => {
      const token = await service.getCredential('user-1', CredentialProvider.RAILWAY);
      expect(token).toBeNull();
    });
  });

  describe('getCredentialById', () => {
    it('should retrieve credential by ID', async () => {
      const encrypted = (service as any).encrypt('neon_token_xyz');

      credentialModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'cred-1',
          encryptedToken: encrypted,
        }),
      });
      credentialModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const token = await service.getCredentialById('cred-1');
      expect(token).toBe('neon_token_xyz');
    });

    it('should return null for invalid ID', async () => {
      const token = await service.getCredentialById('invalid-id');
      expect(token).toBeNull();
    });
  });

  describe('listCredentials', () => {
    it('should list all credentials for a user', async () => {
      credentialModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { _id: 'c1', provider: 'github', createdAt: new Date() },
            { _id: 'c2', provider: 'vercel', createdAt: new Date() },
          ]),
        }),
      });

      const credentials = await service.listCredentials('user-1');
      expect(credentials.length).toBe(2);
    });

    it('should not include tokens in listing', async () => {
      credentialModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { _id: 'c1', provider: 'github', createdAt: new Date() },
          ]),
        }),
      });

      const credentials = await service.listCredentials('user-1');
      expect(JSON.stringify(credentials)).not.toContain('secret_token');
    });
  });

  describe('deleteCredential', () => {
    it('should delete a credential', async () => {
      credentialModel.findOneAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'cred-1' }),
      });

      const deleted = await service.deleteCredential('user-1', 'cred-1');
      expect(deleted).toBe(true);
    });

    it('should return false for non-existent credential', async () => {
      const deleted = await service.deleteCredential('user-1', 'invalid-id');
      expect(deleted).toBe(false);
    });
  });

  describe('rotateCredential', () => {
    it('should rotate a credential', async () => {
      credentialModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'cred-1' }),
      });

      const rotated = await service.rotateCredential('user-1', 'cred-1', 'new_token');
      expect(rotated).toBe(true);
    });
  });

  describe('shouldRotate', () => {
    it('should return false for new credentials', async () => {
      credentialModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          _id: 'cred-1',
          rotationDays: 90,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      });

      const shouldRotate = await service.shouldRotate('cred-1');
      expect(shouldRotate).toBe(false);
    });

    it('should return false for non-existent credentials', async () => {
      const shouldRotate = await service.shouldRotate('invalid-id');
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

describe('WorkspaceService', () => {
  let service: WorkspaceService;
  let workspaceModel: any;

  beforeEach(async () => {
    const mockWorkspaceModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: 'ws-mock-id',
      save: jest.fn().mockResolvedValue({ ...data, _id: 'ws-mock-id' }),
    }));
    mockWorkspaceModel.findById = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockWorkspaceModel.findByIdAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockWorkspaceModel.findByIdAndDelete = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });
    mockWorkspaceModel.find = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceService,
        {
          provide: getModelToken(Workspace.name),
          useValue: mockWorkspaceModel,
        },
      ],
    }).compile();

    service = module.get<WorkspaceService>(WorkspaceService);
    workspaceModel = mockWorkspaceModel;
  });

  describe('createWorkspace', () => {
    it('should create a workspace and return it', async () => {
      const mockSavedWorkspace = {
        _id: 'ws-1',
        userId: 'user-1',
        projectId: 'project-1',
        status: 'running',
        containerId: 'container-ws-1',
        expiresAt: new Date(Date.now() + 3600000),
      };

      mockWorkspaceConstructor(workspaceModel, mockSavedWorkspace);
      workspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSavedWorkspace),
      });
      workspaceModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockSavedWorkspace),
      });

      const workspace = await service.createWorkspace('user-1', {
        projectId: 'project-1',
      });

      expect(workspace).toBeDefined();
      expect(workspace.userId).toBe('user-1');
      expect(workspace.projectId).toBe('project-1');
    });
  });

  describe('getWorkspace', () => {
    it('should retrieve a workspace', async () => {
      const mockWs = { _id: 'ws-1', userId: 'user-1', status: 'running' };
      workspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockWs),
      });

      const workspace = await service.getWorkspace('ws-1');
      expect(workspace).toBeDefined();
    });

    it('should return null for non-existent workspace', async () => {
      const workspace = await service.getWorkspace('invalid-id');
      expect(workspace).toBeNull();
    });
  });

  describe('getUserWorkspaces', () => {
    it('should get all workspaces for a user', async () => {
      workspaceModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'ws-1', userId: 'user-1' },
          { _id: 'ws-2', userId: 'user-1' },
        ]),
      });

      const workspaces = await service.getUserWorkspaces('user-1');
      expect(workspaces.length).toBe(2);
    });
  });

  describe('pauseWorkspace', () => {
    it('should pause a running workspace', async () => {
      const pausedWs = { _id: 'ws-1', status: WorkspaceStatus.PAUSED, containerId: 'c-1' };
      workspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'ws-1', status: WorkspaceStatus.RUNNING, containerId: 'c-1' }),
      });
      workspaceModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(pausedWs),
      });

      const paused = await service.pauseWorkspace('ws-1');
      expect(paused.status).toBe(WorkspaceStatus.PAUSED);
    });

    it('should throw for non-existent workspace', async () => {
      await expect(service.pauseWorkspace('invalid-id')).rejects.toThrow();
    });

    it('should throw for non-running workspace', async () => {
      workspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'ws-1', status: WorkspaceStatus.PAUSED }),
      });

      await expect(service.pauseWorkspace('ws-1')).rejects.toThrow();
    });
  });

  describe('resumeWorkspace', () => {
    it('should resume a paused workspace', async () => {
      const resumedWs = { _id: 'ws-1', status: WorkspaceStatus.RUNNING };
      workspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'ws-1', status: WorkspaceStatus.PAUSED, containerId: 'c-1' }),
      });
      workspaceModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(resumedWs),
      });

      const resumed = await service.resumeWorkspace('ws-1');
      expect(resumed.status).toBe(WorkspaceStatus.RUNNING);
    });

    it('should throw for non-paused workspace', async () => {
      workspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'ws-1', status: WorkspaceStatus.RUNNING }),
      });

      await expect(service.resumeWorkspace('ws-1')).rejects.toThrow();
    });
  });

  describe('destroyWorkspace', () => {
    it('should destroy a workspace', async () => {
      workspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'ws-1', containerId: 'c-1', status: WorkspaceStatus.RUNNING }),
      });
      workspaceModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      workspaceModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.destroyWorkspace('ws-1')).resolves.not.toThrow();
    });

    it('should handle destroying non-existent workspace', async () => {
      await expect(service.destroyWorkspace('invalid-id')).resolves.not.toThrow();
    });
  });

  describe('extendWorkspace', () => {
    it('should extend workspace expiration', async () => {
      const originalExpiration = new Date(Date.now() + 3600000);
      const newExpiration = new Date(originalExpiration.getTime() + 3600000);
      workspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'ws-1', expiresAt: originalExpiration }),
      });
      workspaceModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'ws-1', expiresAt: newExpiration }),
      });

      const extended = await service.extendWorkspace('ws-1', '1h');
      expect(extended.expiresAt.getTime()).toBeGreaterThan(originalExpiration.getTime());
    });

    it('should throw for non-existent workspace', async () => {
      await expect(service.extendWorkspace('invalid-id', '1h')).rejects.toThrow();
    });
  });

  describe('executeInWorkspace', () => {
    it('should execute command in workspace', async () => {
      workspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'ws-1', status: WorkspaceStatus.RUNNING, containerId: 'c-1' }),
      });
      workspaceModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.executeInWorkspace('ws-1', 'echo hello');
      expect(result).toBeDefined();
      expect(result.exitCode).toBe(0);
    });

    it('should throw for non-running workspace', async () => {
      workspaceModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ _id: 'ws-1', status: WorkspaceStatus.PAUSED }),
      });

      await expect(
        service.executeInWorkspace('ws-1', 'echo hello'),
      ).rejects.toThrow();
    });
  });

  describe('getWorkspaceStats', () => {
    it('should return workspace statistics', async () => {
      workspaceModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([
          { _id: 'ws-1', userId: 'user-1', status: WorkspaceStatus.RUNNING },
          { _id: 'ws-2', userId: 'user-2', status: WorkspaceStatus.RUNNING },
        ]),
      });

      const stats = await service.getWorkspaceStats();
      expect(stats.total).toBe(2);
      expect(stats.running).toBe(2);
      expect(stats.byUser['user-1']).toBe(1);
    });
  });

  describe('cleanupExpiredWorkspaces', () => {
    it('should clean up expired workspaces', async () => {
      workspaceModel.find.mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

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
