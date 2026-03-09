import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { UserDocument } from './user.schema';
import { EncryptionService } from './encryption.service';
import { IRepository } from '../../providers/interfaces/database-provider.interface';
import { USER_REPOSITORY } from '../../providers/repository-tokens';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let userRepo: IRepository<UserDocument>;

  const mockUser = {
    _id: 'user-123',
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    role: 'user',
    isActive: true,
    refreshToken: 'hashed-refresh',
  };

  const mockUserRepo: Partial<
    Record<keyof IRepository<UserDocument>, jest.Mock>
  > = {
    findById: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    insertMany: jest.fn(),
  };

  const mockEncryptionService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    maskApiKey: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepo,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepo = module.get<IRepository<UserDocument>>(USER_REPOSITORY);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      const createUserDto = {
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      };

      mockUserRepo.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
      mockUserRepo.create.mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
        name: createUserDto.name,
      });

      const result = await service.create(createUserDto);

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        email: createUserDto.email,
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(mockUserRepo.create).toHaveBeenCalledWith({
        email: createUserDto.email,
        password: 'hashedpassword',
        name: createUserDto.name,
      });
      expect(result.email).toBe(createUserDto.email);
    });

    it('should throw ConflictException if email exists', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'test@example.com',
          password: 'password',
          name: 'Test',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      mockUserRepo.findById.mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUser);
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword(
        'password',
        'hashedpassword',
      );

      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hashedpassword');
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validatePassword('wrong', 'hashedpassword');

      expect(result).toBe(false);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockUserRepo.update.mockResolvedValue(mockUser);

      await service.updateLastLogin('user-123');

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
    });
  });

  describe('updateRefreshToken', () => {
    it('should hash and store refresh token', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
      mockUserRepo.update.mockResolvedValue(mockUser);

      await service.updateRefreshToken('user-123', 'refresh-token');

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(mockUserRepo.update).toHaveBeenCalled();
    });

    it('should clear refresh token when null', async () => {
      mockUserRepo.update.mockResolvedValue(mockUser);

      await service.updateRefreshToken('user-123', null);

      expect(mockUserRepo.update).toHaveBeenCalledWith('user-123', {
        refreshToken: null,
      });
    });
  });

  describe('validateRefreshToken', () => {
    it('should return true for valid refresh token', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashed-refresh',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateRefreshToken(
        'user-123',
        'refresh-token',
      );

      expect(result).toBe(true);
    });

    it('should return false if user has no refresh token', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      const result = await service.validateRefreshToken(
        'user-123',
        'refresh-token',
      );

      expect(result).toBe(false);
    });

    it('should return false for invalid refresh token', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashed-refresh',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateRefreshToken(
        'user-123',
        'wrong-token',
      );

      expect(result).toBe(false);
    });
  });
  describe('getGitHubAccessToken', () => {
    it('should return decrypted token', async () => {
      const encryptedToken = 'iv:tag:encrypted';
      const decryptedToken = 'access-token';

      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        githubAccessToken: encryptedToken,
      });
      mockEncryptionService.decrypt.mockReturnValue(decryptedToken);

      const result = await service.getGitHubAccessToken('user-123');

      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
        encryptedToken,
      );
      expect(result).toBe(decryptedToken);
    });

    it('should return null if decryption fails (invalid format)', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        githubAccessToken: 'iv:tag:encrypted',
      });
      mockEncryptionService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await service.getGitHubAccessToken('user-123');
      expect(result).toBeNull();
    });

    it('should return original token if legacy format (decryption fails but not 3 parts)', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        githubAccessToken: 'legacy-token',
      });
      mockEncryptionService.decrypt.mockImplementation(() => {
        throw new Error('Invalid format');
      });

      const result = await service.getGitHubAccessToken('user-123');
      expect(result).toBe('legacy-token');
    });
  });

  describe('connectGitHub', () => {
    it('should encrypt token before saving', async () => {
      const token = 'gh_token';
      const encrypted = 'iv:tag:encrypted';

      mockEncryptionService.encrypt.mockReturnValue(encrypted);
      mockUserRepo.findById.mockResolvedValue(mockUser);
      mockUserRepo.update.mockResolvedValue(mockUser);

      await service.connectGitHub('user-123', 'gh-id', token, 'username');

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(token);
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          githubAccessToken: encrypted,
        }),
      );
    });
  });

  // Phase 1.1 TDD - Tests for Google/GitLab OAuth token methods
  describe('getGoogleAccessToken', () => {
    it('should return decrypted token', async () => {
      const encryptedToken = 'iv:tag:encrypted';
      const decryptedToken = 'google-access-token';

      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        googleAccessToken: encryptedToken,
      });
      mockEncryptionService.decrypt.mockReturnValue(decryptedToken);

      const result = await service.getGoogleAccessToken('user-123');

      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
        encryptedToken,
      );
      expect(result).toBe(decryptedToken);
    });

    it('should return null if user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      const result = await service.getGoogleAccessToken('user-123');

      expect(result).toBeNull();
    });

    it('should return null if no google token stored', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        googleAccessToken: undefined,
      });

      const result = await service.getGoogleAccessToken('user-123');

      expect(result).toBeNull();
    });

    it('should return null if decryption fails (encrypted format)', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        googleAccessToken: 'iv:tag:encrypted',
      });
      mockEncryptionService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await service.getGoogleAccessToken('user-123');
      expect(result).toBeNull();
    });

    it('should return original token if legacy format', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        googleAccessToken: 'legacy-google-token',
      });
      mockEncryptionService.decrypt.mockImplementation(() => {
        throw new Error('Invalid format');
      });

      const result = await service.getGoogleAccessToken('user-123');
      expect(result).toBe('legacy-google-token');
    });
  });

  describe('getGitLabAccessToken', () => {
    it('should return decrypted token', async () => {
      const encryptedToken = 'iv:tag:encrypted';
      const decryptedToken = 'gitlab-access-token';

      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        gitlabAccessToken: encryptedToken,
      });
      mockEncryptionService.decrypt.mockReturnValue(decryptedToken);

      const result = await service.getGitLabAccessToken('user-123');

      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(
        encryptedToken,
      );
      expect(result).toBe(decryptedToken);
    });

    it('should return null if user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      const result = await service.getGitLabAccessToken('user-123');

      expect(result).toBeNull();
    });

    it('should return null if no gitlab token stored', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        gitlabAccessToken: undefined,
      });

      const result = await service.getGitLabAccessToken('user-123');

      expect(result).toBeNull();
    });

    it('should return null if decryption fails (encrypted format)', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        gitlabAccessToken: 'iv:tag:encrypted',
      });
      mockEncryptionService.decrypt.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await service.getGitLabAccessToken('user-123');
      expect(result).toBeNull();
    });

    it('should return original token if legacy format', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        gitlabAccessToken: 'legacy-gitlab-token',
      });
      mockEncryptionService.decrypt.mockImplementation(() => {
        throw new Error('Invalid format');
      });

      const result = await service.getGitLabAccessToken('user-123');
      expect(result).toBe('legacy-gitlab-token');
    });
  });

  // Add test for user not found case in GitHub (missing from existing tests)
  describe('getGitHubAccessToken - additional cases', () => {
    it('should return null if user not found', async () => {
      mockUserRepo.findById.mockResolvedValue(null);

      const result = await service.getGitHubAccessToken('user-123');

      expect(result).toBeNull();
    });

    it('should return null if no github token stored', async () => {
      mockUserRepo.findById.mockResolvedValue({
        ...mockUser,
        githubAccessToken: undefined,
      });

      const result = await service.getGitHubAccessToken('user-123');

      expect(result).toBeNull();
    });
  });
});
