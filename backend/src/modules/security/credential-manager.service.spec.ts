import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CredentialManagerService } from './credential-manager.service';
import { CredentialStatus } from './schemas/credential.schema';
import {
  CredentialProvider,
  DEFAULT_GITIGNORE_SECRETS,
} from './dto/security.dto';
import { CREDENTIAL_REPOSITORY } from '../../providers/repository-tokens';

// Mock fetch globally
global.fetch = jest.fn();

describe('CredentialManagerService', () => {
  let service: CredentialManagerService;
  let credentialRepo: any;

  const mockUserId = 'user-123';
  const mockCredentialId = 'cred-123';

  const mockCredentialDoc = {
    _id: mockCredentialId,
    userId: mockUserId,
    provider: 'github',
    name: 'GitHub API Key',
    encryptedToken: '', // Will be set dynamically
    status: CredentialStatus.ACTIVE,
    scopes: ['repo', 'user'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastUsedAt: null,
    tokenExpiresAt: null,
    rotationDays: 90,
  };

  function createMockRepo() {
    return {
      findById: jest.fn().mockResolvedValue(null),
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest
        .fn()
        .mockImplementation((doc) =>
          Promise.resolve({ ...doc, _id: mockCredentialId }),
        ),
      update: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue(true),
      findOneAndUpdate: jest.fn().mockResolvedValue(null),
      findOneAndDelete: jest.fn().mockResolvedValue(null),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      count: jest.fn().mockResolvedValue(0),
      insertMany: jest.fn().mockResolvedValue([]),
    };
  }

  beforeEach(async () => {
    credentialRepo = createMockRepo();

    const mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'ENCRYPTION_KEY') return 'test-encryption-key-32-chars!!';
        return '';
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialManagerService,
        { provide: CREDENTIAL_REPOSITORY, useValue: credentialRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CredentialManagerService>(CredentialManagerService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('storeCredential', () => {
    it('should store a new credential', async () => {
      const dto = {
        provider: CredentialProvider.GITHUB,
        token: 'ghp_test_token_123',
        name: 'My GitHub Token',
        scope: ['repo', 'user'],
      };

      const result = await service.storeCredential(mockUserId, dto);

      expect(result.provider).toBe(CredentialProvider.GITHUB);
      expect(result.id).toBe(mockCredentialId);
    });

    it('should use default name if not provided', async () => {
      const dto = {
        provider: CredentialProvider.VERCEL,
        token: 'vercel_token_123',
      };

      const result = await service.storeCredential(mockUserId, dto);

      expect(result.provider).toBe(CredentialProvider.VERCEL);
    });
  });

  describe('getCredential', () => {
    it('should query database with correct parameters', async () => {
      credentialRepo.findOne.mockResolvedValue(null);

      await service.getCredential(mockUserId, CredentialProvider.GITHUB);

      expect(credentialRepo.findOne).toHaveBeenCalledWith({
        userId: mockUserId,
        provider: CredentialProvider.GITHUB,
        status: CredentialStatus.ACTIVE,
      });
    });

    it('should return null if credential not found', async () => {
      credentialRepo.findOne.mockResolvedValue(null);

      const result = await service.getCredential(
        mockUserId,
        CredentialProvider.GITHUB,
      );

      expect(result).toBeNull();
    });

    it('should return null and mark as expired if token expired', async () => {
      const expiredCred = {
        ...mockCredentialDoc,
        tokenExpiresAt: new Date('2020-01-01'), // Past date
      };

      credentialRepo.findOne.mockResolvedValue(expiredCred);

      const result = await service.getCredential(
        mockUserId,
        CredentialProvider.GITHUB,
      );

      expect(result).toBeNull();
      expect(credentialRepo.update).toHaveBeenCalledWith(mockCredentialId, {
        status: CredentialStatus.EXPIRED,
      });
    });
  });

  describe('getCredentialById', () => {
    it('should return null if credential not found', async () => {
      credentialRepo.findById.mockResolvedValue(null);

      const result = await service.getCredentialById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should return null if token expired', async () => {
      const expiredCred = {
        ...mockCredentialDoc,
        tokenExpiresAt: new Date('2020-01-01'),
      };

      credentialRepo.findById.mockResolvedValue(expiredCred);

      const result = await service.getCredentialById(mockCredentialId);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      credentialRepo.findById.mockRejectedValue(new Error('DB error'));

      const result = await service.getCredentialById(mockCredentialId);

      expect(result).toBeNull();
    });
  });

  describe('listCredentials', () => {
    it('should list all credentials for user', async () => {
      const credentials = [
        {
          _id: 'cred-1',
          provider: 'github',
          createdAt: new Date('2024-01-01'),
          lastUsedAt: new Date('2024-01-15'),
          tokenExpiresAt: null,
        },
        {
          _id: 'cred-2',
          provider: 'vercel',
          createdAt: new Date('2024-02-01'),
          lastUsedAt: null,
          tokenExpiresAt: new Date('2025-01-01'),
        },
      ];

      credentialRepo.find.mockResolvedValue(credentials);

      const result = await service.listCredentials(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].provider).toBe('github');
      expect(result[1].provider).toBe('vercel');
      expect(credentialRepo.find).toHaveBeenCalledWith(
        { userId: mockUserId },
        { select: '-encryptedToken -encryptedRefreshToken' },
      );
    });

    it('should return empty array if no credentials', async () => {
      credentialRepo.find.mockResolvedValue([]);

      const result = await service.listCredentials(mockUserId);

      expect(result).toHaveLength(0);
    });
  });

  describe('deleteCredential', () => {
    it('should delete credential successfully', async () => {
      credentialRepo.findOneAndDelete.mockResolvedValue({
        _id: mockCredentialId,
      });

      const result = await service.deleteCredential(
        mockUserId,
        mockCredentialId,
      );

      expect(result).toBe(true);
      expect(credentialRepo.findOneAndDelete).toHaveBeenCalledWith({
        _id: mockCredentialId,
        userId: mockUserId,
      });
    });

    it('should return false if credential not found', async () => {
      credentialRepo.findOneAndDelete.mockResolvedValue(null);

      const result = await service.deleteCredential(mockUserId, 'nonexistent');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      credentialRepo.findOneAndDelete.mockRejectedValue(new Error('DB error'));

      const result = await service.deleteCredential(
        mockUserId,
        mockCredentialId,
      );

      expect(result).toBe(false);
    });
  });

  describe('rotateCredential', () => {
    it('should rotate credential successfully', async () => {
      credentialRepo.findOneAndUpdate.mockResolvedValue({
        _id: mockCredentialId,
      });

      const result = await service.rotateCredential(
        mockUserId,
        mockCredentialId,
        'new_token_value',
      );

      expect(result).toBe(true);
      expect(credentialRepo.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should return false if credential not found', async () => {
      credentialRepo.findOneAndUpdate.mockResolvedValue(null);

      const result = await service.rotateCredential(
        mockUserId,
        'nonexistent',
        'new_token',
      );

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      credentialRepo.findOneAndUpdate.mockRejectedValue(new Error('DB error'));

      const result = await service.rotateCredential(
        mockUserId,
        mockCredentialId,
        'new_token',
      );

      expect(result).toBe(false);
    });
  });

  describe('shouldRotate', () => {
    it('should return true if rotation interval passed', async () => {
      const oldCredential = {
        ...mockCredentialDoc,
        rotationDays: 90,
        updatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
      };

      credentialRepo.findById.mockResolvedValue(oldCredential);

      const result = await service.shouldRotate(mockCredentialId);

      expect(result).toBe(true);
    });

    it('should return false if rotation not needed yet', async () => {
      const recentCredential = {
        ...mockCredentialDoc,
        rotationDays: 90,
        updatedAt: new Date(), // Just updated
      };

      credentialRepo.findById.mockResolvedValue(recentCredential);

      const result = await service.shouldRotate(mockCredentialId);

      expect(result).toBe(false);
    });

    it('should return false if credential not found', async () => {
      credentialRepo.findById.mockResolvedValue(null);

      const result = await service.shouldRotate('nonexistent');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      credentialRepo.findById.mockRejectedValue(new Error('DB error'));

      const result = await service.shouldRotate(mockCredentialId);

      expect(result).toBe(false);
    });
  });

  describe('validateToken', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockReset();
    });

    it('should validate GitHub token successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ login: 'testuser', name: 'Test User' }),
      });

      const result = await service.validateToken(
        CredentialProvider.GITHUB,
        'ghp_valid_token',
      );

      expect(result.valid).toBe(true);
      expect(result.accountInfo).toEqual({
        login: 'testuser',
        name: 'Test User',
      });
    });

    it('should return invalid for bad GitHub token', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
      });

      const result = await service.validateToken(
        CredentialProvider.GITHUB,
        'bad_token',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid GitHub token');
    });

    it('should validate Neon token successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ projects: [{ id: '1' }, { id: '2' }] }),
      });

      const result = await service.validateToken(
        CredentialProvider.NEON,
        'neon_valid_token',
      );

      expect(result.valid).toBe(true);
      expect(result.accountInfo).toEqual({ projectCount: 2 });
    });

    it('should validate Vercel token successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            user: { username: 'testuser', email: 'test@example.com' },
          }),
      });

      const result = await service.validateToken(
        CredentialProvider.VERCEL,
        'vercel_valid_token',
      );

      expect(result.valid).toBe(true);
      expect(result.accountInfo).toEqual({
        username: 'testuser',
        email: 'test@example.com',
      });
    });

    it('should validate Railway token successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { me: { name: 'Test', email: 'test@example.com' } },
          }),
      });

      const result = await service.validateToken(
        CredentialProvider.RAILWAY,
        'railway_valid_token',
      );

      expect(result.valid).toBe(true);
      expect(result.accountInfo).toEqual({
        name: 'Test',
        email: 'test@example.com',
      });
    });

    it('should return invalid for Railway token with errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ errors: [{ message: 'Invalid token' }] }),
      });

      const result = await service.validateToken(
        CredentialProvider.RAILWAY,
        'bad_railway_token',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid Railway token');
    });

    it('should return valid for unknown provider', async () => {
      const result = await service.validateToken(
        'unknown' as CredentialProvider,
        'any_token',
      );

      expect(result.valid).toBe(true);
    });

    it('should handle fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.validateToken(
        CredentialProvider.GITHUB,
        'token',
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Failed to validate GitHub token');
    });
  });

  describe('ensureGitignore', () => {
    it('should return default gitignore entries', () => {
      const result = service.ensureGitignore('/project');

      expect(result).toEqual(DEFAULT_GITIGNORE_SECRETS);
    });

    it('should append additional secret patterns', () => {
      const additionalSecrets = ['*.secret', 'private-config.json'];

      const result = service.ensureGitignore('/project', additionalSecrets);

      expect(result.length).toBe(DEFAULT_GITIGNORE_SECRETS.length + 2);
      expect(result.find((e) => e.pattern === '*.secret')).toBeDefined();
      expect(
        result.find((e) => e.pattern === 'private-config.json'),
      ).toBeDefined();
    });
  });

  describe('generateGitignoreContent', () => {
    it('should generate gitignore content from default entries', () => {
      const content = service.generateGitignoreContent();

      expect(content).toContain('# Secrets and credentials');
      expect(content).toContain('.env');
      expect(content).toContain('*.pem');
      expect(content).toContain('credentials.json');
    });

    it('should generate content from custom entries', () => {
      const customEntries = [
        { pattern: '*.custom', description: 'Custom pattern', isSecret: true },
        { pattern: '*.public', description: 'Public pattern', isSecret: false },
      ];

      const content = service.generateGitignoreContent(customEntries);

      expect(content).toContain('*.custom');
      expect(content).toContain('# Custom pattern');
      expect(content).not.toContain('*.public'); // isSecret: false should be excluded
    });
  });
});
