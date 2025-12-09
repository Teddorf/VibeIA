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
        password: 'password123',
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
        password: 'password123',
        name: 'New User',
      };

      await expect(service.register(registerDto as RegisterDto))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for short password', async () => {
      const registerDto: RegisterDto = {
        email: 'new@example.com',
        password: 'short',
        name: 'New User',
      };

      await expect(service.register(registerDto))
        .rejects.toThrow(BadRequestException);
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
      usersService.validateRefreshToken.mockResolvedValue(true);
      usersService.findById.mockResolvedValue(mockUser as any);
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await service.refreshTokens('user-123', 'valid-refresh');

      expect(usersService.validateRefreshToken).toHaveBeenCalledWith(
        'user-123',
        'valid-refresh',
      );
      expect(result.accessToken).toBe('new-access-token');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      usersService.validateRefreshToken.mockResolvedValue(false);

      await expect(
        service.refreshTokens('user-123', 'invalid-refresh'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      usersService.validateRefreshToken.mockResolvedValue(true);
      usersService.findById.mockResolvedValue({ ...mockUser, isActive: false } as any);

      await expect(
        service.refreshTokens('user-123', 'valid-refresh'),
      ).rejects.toThrow(UnauthorizedException);
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
