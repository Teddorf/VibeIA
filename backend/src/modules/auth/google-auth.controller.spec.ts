import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { GoogleAuthController } from './google-auth.controller';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('GoogleAuthController', () => {
  let controller: GoogleAuthController;
  let configService: jest.Mocked<ConfigService>;
  let usersService: jest.Mocked<UsersService>;
  let authService: jest.Mocked<AuthService>;

  const mockConfigValues = {
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    GOOGLE_CALLBACK_URL: 'http://localhost:3001/api/auth/google/callback',
    FRONTEND_URL: 'http://localhost:3000',
  };

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
  };

  const mockGoogleUser = {
    id: 'google-user-123',
    email: 'test@gmail.com',
    verified_email: true,
    name: 'Test User',
    given_name: 'Test',
    family_name: 'User',
    picture: 'https://lh3.googleusercontent.com/avatar.png',
  };

  const mockTokens = {
    accessToken: 'jwt-access-token',
    refreshToken: 'jwt-refresh-token',
    user: { id: 'user-123', email: 'test@gmail.com', name: 'Test User' },
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => mockConfigValues[key] || ''),
    };

    const mockUsersService = {
      connectGoogle: jest.fn(),
      getGoogleConnectionStatus: jest.fn(),
      disconnectGoogle: jest.fn(),
    };

    const mockAuthService = {
      loginWithOAuth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleAuthController],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<GoogleAuthController>(GoogleAuthController);
    configService = module.get(ConfigService);
    usersService = module.get(UsersService);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initiateOAuth', () => {
    it('should redirect to Google OAuth URL', async () => {
      const mockRes = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.initiateOAuth(mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('https://accounts.google.com/o/oauth2/v2/auth'),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('client_id=test-google-client-id'),
      );
    });

    it('should include state for login flow', async () => {
      const mockRes = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.initiateOAuth(mockRes, 'csrf-token-123');

      const redirectUrl = (mockRes.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('state=');
    });

    it('should include userId in state for connect flow', async () => {
      const mockRes = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.initiateOAuth(mockRes, undefined, 'user-123');

      const redirectUrl = (mockRes.redirect as jest.Mock).mock.calls[0][0];
      const stateParam = new URL(redirectUrl).searchParams.get('state');
      const decodedState = JSON.parse(Buffer.from(stateParam!, 'base64').toString());
      expect(decodedState.userId).toBe('user-123');
      expect(decodedState.type).toBe('connect');
    });

    it('should include required Google OAuth parameters', async () => {
      const mockRes = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.initiateOAuth(mockRes);

      const redirectUrl = (mockRes.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('response_type=code');
      expect(redirectUrl).toContain('access_type=offline');
      expect(redirectUrl).toContain('prompt=consent');
      expect(redirectUrl).toContain('scope=openid+email+profile');
    });

    it('should throw BadRequestException if Google OAuth not configured', async () => {
      const moduleWithoutConfig = await Test.createTestingModule({
        controllers: [GoogleAuthController],
        providers: [
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
          { provide: UsersService, useValue: {} },
          { provide: AuthService, useValue: {} },
        ],
      }).compile();

      const controllerWithoutConfig = moduleWithoutConfig.get<GoogleAuthController>(GoogleAuthController);
      const mockRes = { redirect: jest.fn() } as unknown as Response;

      await expect(controllerWithoutConfig.initiateOAuth(mockRes)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('handleCallback', () => {
    let mockRes: Response;

    beforeEach(() => {
      mockRes = {
        redirect: jest.fn(),
      } as unknown as Response;
    });

    it('should redirect with error if OAuth error received', async () => {
      await controller.handleCallback(
        '',
        '',
        'access_denied',
        'User denied access',
        mockRes,
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=User+denied+access'),
      );
    });

    it('should redirect with error if no code received', async () => {
      await controller.handleCallback('', '', '', '', mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=No+authorization+code+received'),
      );
    });

    it('should handle login flow and redirect with tokens', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'google-token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGoogleUser),
        });

      authService.loginWithOAuth.mockResolvedValue(mockTokens as any);

      const loginState = Buffer.from(JSON.stringify({ csrfState: 'csrf-123', type: 'login' })).toString('base64');

      await controller.handleCallback('auth-code-123', loginState, '', '', mockRes);

      expect(authService.loginWithOAuth).toHaveBeenCalledWith(
        'google',
        mockGoogleUser.id,
        mockGoogleUser.email,
        mockGoogleUser.name,
        'google-token',
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('oauth_success=true'),
      );
    });

    it('should handle connect flow and redirect to dashboard', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'google-token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGoogleUser),
        });

      usersService.connectGoogle.mockResolvedValue(undefined);

      const connectState = Buffer.from(JSON.stringify({ userId: 'user-123', type: 'connect' })).toString('base64');

      await controller.handleCallback('auth-code-123', connectState, '', '', mockRes);

      expect(usersService.connectGoogle).toHaveBeenCalledWith(
        'user-123',
        mockGoogleUser.id,
        'google-token',
        mockGoogleUser.email,
        mockGoogleUser.name,
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('google_connected=true'),
      );
    });

    it('should redirect with error if token exchange fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () => Promise.resolve({ error: 'invalid_grant', error_description: 'Invalid code' }),
      });

      await controller.handleCallback('invalid-code', '', '', '', mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=Invalid+code'),
      );
    });

    it('should redirect with generic error on exception', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await controller.handleCallback('auth-code-123', '', '', '', mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=Failed+to+authenticate+with+Google'),
      );
    });
  });

  describe('getStatus', () => {
    it('should return Google connection status', async () => {
      const mockStatus = {
        connected: true,
        email: 'test@gmail.com',
        name: 'Test User',
        connectedAt: new Date(),
      };
      usersService.getGoogleConnectionStatus.mockResolvedValue(mockStatus);

      const result = await controller.getStatus(mockUser as any);

      expect(usersService.getGoogleConnectionStatus).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockStatus);
    });

    it('should return not connected status', async () => {
      usersService.getGoogleConnectionStatus.mockResolvedValue({ connected: false });

      const result = await controller.getStatus(mockUser as any);

      expect(result.connected).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect Google account', async () => {
      usersService.disconnectGoogle.mockResolvedValue(undefined);

      const result = await controller.disconnect(mockUser as any);

      expect(usersService.disconnectGoogle).toHaveBeenCalledWith('user-123');
      expect(result.message).toBe('Google account disconnected successfully');
    });
  });

  describe('getAuthUrl', () => {
    it('should return Google OAuth URL with user state', () => {
      const result = controller.getAuthUrl(mockUser as any);

      expect(result.url).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(result.url).toContain('client_id=test-google-client-id');
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('access_type=offline');
    });

    it('should throw BadRequestException if Google OAuth not configured', async () => {
      const moduleWithoutConfig = await Test.createTestingModule({
        controllers: [GoogleAuthController],
        providers: [
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
          { provide: UsersService, useValue: {} },
          { provide: AuthService, useValue: {} },
        ],
      }).compile();

      const controllerWithoutConfig = moduleWithoutConfig.get<GoogleAuthController>(GoogleAuthController);

      expect(() => controllerWithoutConfig.getAuthUrl(mockUser as any)).toThrow(
        BadRequestException,
      );
    });
  });
});
