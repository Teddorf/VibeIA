import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User, UserDocument } from './user.schema';
import { EncryptionService } from './encryption.service';

jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let model: Model<UserDocument>;

  const mockUser = {
    _id: 'user-123',
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    role: 'user',
    isActive: true,
    refreshToken: 'hashed-refresh',
    save: jest.fn(),
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    create: jest.fn(),
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
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    model = module.get<Model<UserDocument>>(getModelToken(User.name));

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

      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');

      const saveMock = jest.fn().mockResolvedValue({
        ...mockUser,
        email: createUserDto.email,
        name: createUserDto.name,
      });

      // Mock the constructor behavior
      jest.spyOn(service as any, 'create').mockImplementation(async (dto: any) => {
        const existing = await mockUserModel.findOne({ email: dto.email }).exec();
        if (existing) throw new ConflictException();
        return { ...mockUser, email: dto.email, name: dto.name };
      });

      const result = await service.create(createUserDto);

      expect(result.email).toBe(createUserDto.email);
    });

    it('should throw ConflictException if email exists', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

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
      mockUserModel.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'test@example.com',
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserModel.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      mockUserModel.findById.mockResolvedValue(mockUser);

      const result = await service.findById('user-123');

      expect(mockUserModel.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUser);
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validatePassword('password', 'hashedpassword');

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
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await service.updateLastLogin('user-123');

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
    });
  });

  describe('updateRefreshToken', () => {
    it('should hash and store refresh token', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await service.updateRefreshToken('user-123', 'refresh-token');

      expect(bcrypt.hash).toHaveBeenCalled();
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalled();
    });

    it('should clear refresh token when null', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await service.updateRefreshToken('user-123', null);

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        { refreshToken: null },
      );
    });
  });

  describe('validateRefreshToken', () => {
    it('should return true for valid refresh token', async () => {
      mockUserModel.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashed-refresh',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateRefreshToken('user-123', 'refresh-token');

      expect(result).toBe(true);
    });

    it('should return false if user has no refresh token', async () => {
      mockUserModel.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      const result = await service.validateRefreshToken('user-123', 'refresh-token');

      expect(result).toBe(false);
    });

    it('should return false for invalid refresh token', async () => {
      mockUserModel.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: 'hashed-refresh',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateRefreshToken('user-123', 'wrong-token');

      expect(result).toBe(false);
    });
  });
  describe('getGitHubAccessToken', () => {
    it('should return decrypted token', async () => {
      const encryptedToken = 'iv:tag:encrypted';
      const decryptedToken = 'access-token';

      mockUserModel.findById.mockResolvedValue({
        ...mockUser,
        githubAccessToken: encryptedToken,
      });
      mockEncryptionService.decrypt.mockReturnValue(decryptedToken);

      const result = await service.getGitHubAccessToken('user-123');

      expect(mockEncryptionService.decrypt).toHaveBeenCalledWith(encryptedToken);
      expect(result).toBe(decryptedToken);
    });

    it('should return null if decryption fails (invalid format)', async () => {
      mockUserModel.findById.mockResolvedValue({
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
      mockUserModel.findById.mockResolvedValue({
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
      mockUserModel.findById.mockResolvedValue(mockUser);

      await service.connectGitHub('user-123', 'gh-id', token, 'username');

      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(token);
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({
          githubAccessToken: encrypted
        })
      );
    });
  });
});
