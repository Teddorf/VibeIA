import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService, LoginDto, RegisterDto } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    _id: { toString: () => 'user-123' },
    email: 'test@example.com',
    password: 'hashedpassword',
    name: 'Test User',
    role: 'user',
    isActive: true,
    lastLoginAt: new Date(),
    refreshToken: 'hashed-refresh-token',
  };

  beforeEach(async () => {
    const mockUsersService = {
      create: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      validatePassword: jest.fn(),
      updateLastLogin: jest.fn(),
      updateRefreshToken: jest.fn(),
      validateRefreshToken: jest.fn(),
      findRefreshTokenOwner: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get(UsersService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      const registerDto: RegisterDto = {
        email: 'new@example.com',
        password: 'Password123!',
        name: 'New User',
      };

      usersService.create.mockResolvedValue(mockUser as any);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.register(registerDto);

      expect(usersService.create).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-123',
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        },
      });
    });

    it('should throw BadRequestException for missing email', async () => {
      const registerDto = {
        email: '',
        password: 'Password123!',
        name: 'New User',
      };

      await expect(service.register(registerDto as RegisterDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for short password', async () => {
      const registerDto: RegisterDto = {
        email: 'new@example.com',
        password: 'Short1!',
        name: 'New User',
      };

      await expect(service.register(registerDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password missing complexity', async () => {
      const weakPasswords = [
        'lowercaseonly123!', // Missing uppercase
        'UPPERCASEONLY123!', // Missing lowercase
        'NoNumbersHere!',    // Missing number
        'NoSpecialChar123',  // Missing special char
      ];

      for (const password of weakPasswords) {
        const registerDto: RegisterDto = {
          email: 'new@example.com',
          password,
          name: 'New User',
        };
        await expect(service.register(registerDto))
          .rejects.toThrow(BadRequestException);
      }
    });
  });

  describe('login', () => {
    it('should login user and return tokens', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.validatePassword.mockResolvedValue(true);
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');

      const result = await service.login(loginDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(loginDto.email);
      expect(usersService.validatePassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password,
      );
      expect(usersService.updateLastLogin).toHaveBeenCalledWith('user-123');
      expect(result.accessToken).toBe('access-token');
    });

    it('should throw UnauthorizedException for invalid email', async () => {
      usersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser as any);
      usersService.validatePassword.mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      usersService.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as any);

      await expect(
        service.login({ email: 'test@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens for valid refresh token', async () => {
      usersService.findRefreshTokenOwner.mockResolvedValue('user-123');
      usersService.validateRefreshToken.mockResolvedValue(true);
      usersService.findById.mockResolvedValue(mockUser as any);
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshTokens('user-123', 'valid-refresh');

      expect(usersService.findRefreshTokenOwner).toHaveBeenCalledWith('valid-refresh');
      expect(usersService.validateRefreshToken).toHaveBeenCalledWith(
        'user-123',
        'valid-refresh',
      );
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      usersService.findRefreshTokenOwner.mockResolvedValue('user-123');
      usersService.validateRefreshToken.mockResolvedValue(false);

      await expect(
        service.refreshTokens('user-123', 'invalid-refresh'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      usersService.findRefreshTokenOwner.mockResolvedValue('user-123');
      usersService.validateRefreshToken.mockResolvedValue(true);
      usersService.findById.mockResolvedValue({ ...mockUser, isActive: false } as any);

      await expect(
        service.refreshTokens('user-123', 'valid-refresh'),
      ).rejects.toThrow(UnauthorizedException);
    });

    // ==================== IDOR Prevention Tests ====================

    it('should reject refresh when userId does not match token owner (IDOR prevention)', async () => {
      // Arrange: Attacker tries to use victim's refresh token
      const attackerUserId = 'attacker-123';
      const victimUserId = 'victim-456';
      const victimRefreshToken = 'valid-victim-refresh-token';

      // The token belongs to victim, but attacker tries to use it
      usersService.findRefreshTokenOwner.mockResolvedValue(victimUserId);

      // Act & Assert: Should reject because userId doesn't match token owner
      await expect(
        service.refreshTokens(attackerUserId, victimRefreshToken)
      ).rejects.toThrow(UnauthorizedException);

      // Verify that ownership was checked
      expect(usersService.findRefreshTokenOwner).toHaveBeenCalledWith(victimRefreshToken);

      // Verify that validateRefreshToken was NOT called (short-circuit)
      expect(usersService.validateRefreshToken).not.toHaveBeenCalled();
    });

    it('should accept refresh when userId matches token owner', async () => {
      // Arrange: Legitimate user refreshes their own token
      const userId = 'user-123';
      const refreshToken = 'valid-refresh-token';

      usersService.findRefreshTokenOwner.mockResolvedValue(userId);
      usersService.validateRefreshToken.mockResolvedValue(true);
      usersService.findById.mockResolvedValue(mockUser as any);
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      // Act
      const result = await service.refreshTokens(userId, refreshToken);

      // Assert: Should succeed
      expect(result.accessToken).toBe('new-access-token');
      expect(usersService.findRefreshTokenOwner).toHaveBeenCalledWith(refreshToken);
    });

    it('should reject refresh with nonexistent token', async () => {
      // Arrange: Token doesn't exist in database
      usersService.findRefreshTokenOwner.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.refreshTokens('any-user', 'fake-token')
      ).rejects.toThrow(UnauthorizedException);

      expect(usersService.findRefreshTokenOwner).toHaveBeenCalledWith('fake-token');
      expect(usersService.validateRefreshToken).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should clear refresh token on logout', async () => {
      await service.logout('user-123');

      expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
        'user-123',
        null,
      );
    });
  });

  describe('validateUser', () => {
    it('should return user for valid JWT payload', async () => {
      usersService.findById.mockResolvedValue(mockUser as any);

      const result = await service.validateUser({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      expect(result).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      usersService.findById.mockResolvedValue(null);

      const result = await service.validateUser({
        sub: 'invalid',
        email: 'test@example.com',
        role: 'user',
      });

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      usersService.findById.mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as any);

      const result = await service.validateUser({
        sub: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      expect(result).toBeNull();
    });
  });
});
