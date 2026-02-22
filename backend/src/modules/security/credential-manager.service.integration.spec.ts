/**
 * Integration Tests for CredentialManagerService
 *
 * These tests use mongodb-memory-server for real MongoDB persistence.
 * They demonstrate the pattern for enabling the skipped unit tests.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule, getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import mongoose, { Model } from 'mongoose';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearDatabase,
} from '../../test/integration-test.utils';
import { CredentialManagerService } from './credential-manager.service';
import {
  Credential,
  CredentialDocument,
  CredentialSchema,
} from './schemas/credential.schema';
import { CredentialProvider } from './dto/security.dto';

// Extended timeout for Windows MongoDB startup
const DB_TEST_TIMEOUT = 60000;

describe('CredentialManagerService Integration', () => {
  let service: CredentialManagerService;
  let credentialModel: Model<CredentialDocument>;
  let module: TestingModule;

  beforeAll(async () => {
    // Setup in-memory MongoDB
    const uri = await setupTestDatabase();

    // Create NestJS testing module with real MongoDB connection
    module = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(uri),
        MongooseModule.forFeature([
          { name: Credential.name, schema: CredentialSchema },
        ]),
      ],
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
    credentialModel = module.get<Model<CredentialDocument>>(
      getModelToken(Credential.name),
    );
  }, DB_TEST_TIMEOUT);

  afterAll(async () => {
    if (module) {
      await module.close();
    }
    await teardownTestDatabase();
  }, DB_TEST_TIMEOUT);

  beforeEach(async () => {
    // Direct cleanup for more reliable test isolation
    await credentialModel.deleteMany({});
  });

  describe('storeCredential', () => {
    it('should store a credential and return id', async () => {
      const result = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'ghp_test_token_123',
      });

      expect(result.id).toBeDefined();
      expect(result.provider).toBe(CredentialProvider.GITHUB);

      // Verify it was actually stored in the database
      const stored = await credentialModel.findById(result.id);
      expect(stored).not.toBeNull();
      expect(stored?.userId).toBe('user-1');
      expect(stored?.provider).toBe(CredentialProvider.GITHUB);
    });

    it('should encrypt the token', async () => {
      const plainToken = 'plain_text_token_123';
      const result = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: plainToken,
      });

      const stored = await credentialModel.findById(result.id);

      // The stored token should be encrypted (not plaintext)
      expect(stored?.encryptedToken).toBeDefined();
      expect(stored?.encryptedToken).not.toBe(plainToken);
      expect(stored?.encryptedToken).toContain(':'); // Encrypted format: iv:authTag:encrypted
    });
  });

  describe('getCredential', () => {
    it('should retrieve a stored credential', async () => {
      const plainToken = 'vercel_token_123';
      await service.storeCredential('user-1', {
        provider: CredentialProvider.VERCEL,
        token: plainToken,
      });

      const token = await service.getCredential(
        'user-1',
        CredentialProvider.VERCEL,
      );

      expect(token).toBe(plainToken);
    });

    it('should return null for non-existent credential', async () => {
      const token = await service.getCredential(
        'user-1',
        CredentialProvider.RAILWAY,
      );

      expect(token).toBeNull();
    });

    it('should return null for different user', async () => {
      await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'token_123',
      });

      const token = await service.getCredential(
        'user-2',
        CredentialProvider.GITHUB,
      );

      expect(token).toBeNull();
    });
  });

  describe('getCredentialById', () => {
    it('should retrieve credential by ID', async () => {
      const plainToken = 'neon_token_xyz';
      const stored = await service.storeCredential('user-1', {
        provider: CredentialProvider.NEON,
        token: plainToken,
      });

      const token = await service.getCredentialById(stored.id);

      expect(token).toBe(plainToken);
    });

    it('should return null for invalid ID', async () => {
      const token = await service.getCredentialById(
        new mongoose.Types.ObjectId().toString(),
      );

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
      expect(credentials.map((c) => c.provider)).toContain(
        CredentialProvider.GITHUB,
      );
      expect(credentials.map((c) => c.provider)).toContain(
        CredentialProvider.VERCEL,
      );
    });

    it('should not include tokens in listing', async () => {
      await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'secret_token_12345',
      });

      const credentials = await service.listCredentials('user-1');
      const json = JSON.stringify(credentials);

      expect(json).not.toContain('secret_token_12345');
    });

    it('should return empty array for user with no credentials', async () => {
      const credentials = await service.listCredentials('user-with-no-creds');

      expect(credentials).toEqual([]);
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
      const deleted = await service.deleteCredential(
        'user-1',
        new mongoose.Types.ObjectId().toString(),
      );

      expect(deleted).toBe(false);
    });

    it('should not allow deleting another user credential', async () => {
      const stored = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'token',
      });

      const deleted = await service.deleteCredential('user-2', stored.id);
      expect(deleted).toBe(false);

      // Verify it still exists
      const token = await service.getCredentialById(stored.id);
      expect(token).toBe('token');
    });
  });

  describe('rotateCredential', () => {
    it('should rotate a credential', async () => {
      const stored = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'old_token',
      });

      const rotated = await service.rotateCredential(
        'user-1',
        stored.id,
        'new_token',
      );
      expect(rotated).toBe(true);

      const token = await service.getCredentialById(stored.id);
      expect(token).toBe('new_token');
    });

    it('should return false for non-existent credential', async () => {
      const rotated = await service.rotateCredential(
        'user-1',
        new mongoose.Types.ObjectId().toString(),
        'new_token',
      );

      expect(rotated).toBe(false);
    });
  });

  describe('shouldRotate', () => {
    it('should return false for new credentials', async () => {
      const stored = await service.storeCredential('user-1', {
        provider: CredentialProvider.GITHUB,
        token: 'token',
      });

      const shouldRotate = await service.shouldRotate(stored.id);

      expect(shouldRotate).toBe(false);
    });

    it('should return false for non-existent credentials', async () => {
      const shouldRotate = await service.shouldRotate(
        new mongoose.Types.ObjectId().toString(),
      );

      expect(shouldRotate).toBe(false);
    });
  });

  describe('ensureGitignore', () => {
    it('should return default gitignore entries', () => {
      const entries = service.ensureGitignore('/project');

      expect(entries.length).toBeGreaterThan(0);
      expect(entries.some((e) => e.pattern === '.env')).toBe(true);
    });

    it('should include additional secrets', () => {
      const entries = service.ensureGitignore('/project', ['custom.secret']);

      expect(entries.some((e) => e.pattern === 'custom.secret')).toBe(true);
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
