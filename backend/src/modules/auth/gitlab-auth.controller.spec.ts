import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { GitLabAuthController } from './gitlab-auth.controller';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('GitLabAuthController', () => {
  let controller: GitLabAuthController;
  let configService: jest.Mocked<ConfigService>;
  let usersService: jest.Mocked<UsersService>;
  let authService: jest.Mocked<AuthService>;

  const mockConfigValues = {
    GITLAB_CLIENT_ID: 'test-gitlab-client-id',
    GITLAB_CLIENT_SECRET: 'test-gitlab-client-secret',
    GITLAB_CALLBACK_URL: 'http://localhost:3001/api/auth/gitlab/callback',
    FRONTEND_URL: 'http://localhost:3000',
  };

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
  };

  const mockGitLabUser = {
    id: 12345,
    username: 'testuser',
    email: 'test@gitlab.com',
    name: 'Test User',
    avatar_url: 'https://gitlab.com/avatar.png',
    web_url: 'https://gitlab.com/testuser',
  };

  const mockTokens = {
    accessToken: 'jwt-access-token',
    refreshToken: 'jwt-refresh-token',
    user: { id: 'user-123', email: 'test@gitlab.com', name: 'Test User' },
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => mockConfigValues[key] || ''),
    };

    const mockUsersService = {
      connectGitLab: jest.fn(),
      getGitLabConnectionStatus: jest.fn(),
      disconnectGitLab: jest.fn(),
    };

    const mockAuthService = {
      loginWithOAuth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GitLabAuthController],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<GitLabAuthController>(GitLabAuthController);
    configService = module.get(ConfigService);
    usersService = module.get(UsersService);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initiateOAuth', () => {
    it('should redirect to GitLab OAuth URL', async () => {
      const mockRes = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.initiateOAuth(mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('https://gitlab.com/oauth/authorize'),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('client_id=test-gitlab-client-id'),
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

    it('should include required GitLab OAuth parameters', async () => {
      const mockRes = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.initiateOAuth(mockRes);

      const redirectUrl = (mockRes.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('response_type=code');
      expect(redirectUrl).toContain('scope=read_user+api+read_repository');
    });

    it('should throw BadRequestException if GitLab OAuth not configured', async () => {
      const moduleWithoutConfig = await Test.createTestingModule({
        controllers: [GitLabAuthController],
        providers: [
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
          { provide: UsersService, useValue: {} },
          { provide: AuthService, useValue: {} },
        ],
      }).compile();

      const controllerWithoutConfig = moduleWithoutConfig.get<GitLabAuthController>(GitLabAuthController);
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
          json: () => Promise.resolve({ access_token: 'gitlab-token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGitLabUser),
        });

      authService.loginWithOAuth.mockResolvedValue(mockTokens as any);

      const loginState = Buffer.from(JSON.stringify({ csrfState: 'csrf-123', type: 'login' })).toString('base64');

      await controller.handleCallback('auth-code-123', loginState, '', '', mockRes);

      expect(authService.loginWithOAuth).toHaveBeenCalledWith(
        'gitlab',
        mockGitLabUser.id.toString(),
        mockGitLabUser.email,
        mockGitLabUser.name,
        'gitlab-token',
        mockGitLabUser.username,
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('oauth_success=true'),
      );
    });

    it('should handle connect flow and redirect to dashboard', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'gitlab-token', token_type: 'Bearer' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGitLabUser),
        });

      usersService.connectGitLab.mockResolvedValue(undefined);

      const connectState = Buffer.from(JSON.stringify({ userId: 'user-123', type: 'connect' })).toString('base64');

      await controller.handleCallback('auth-code-123', connectState, '', '', mockRes);

      expect(usersService.connectGitLab).toHaveBeenCalledWith(
        'user-123',
        mockGitLabUser.id.toString(),
        'gitlab-token',
        mockGitLabUser.username,
        mockGitLabUser.email,
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('gitlab_connected=true'),
      );
    });

    it('should use username as name if name is empty', async () => {
      const userWithoutName = { ...mockGitLabUser, name: '' };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'gitlab-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(userWithoutName),
        });

      authService.loginWithOAuth.mockResolvedValue(mockTokens as any);

      await controller.handleCallback('auth-code-123', '', '', '', mockRes);

      expect(authService.loginWithOAuth).toHaveBeenCalledWith(
        'gitlab',
        mockGitLabUser.id.toString(),
        mockGitLabUser.email,
        mockGitLabUser.username, // Falls back to username when name is empty
        'gitlab-token',
        mockGitLabUser.username,
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
        expect.stringContaining('error=Failed+to+authenticate+with+GitLab'),
      );
    });
  });

  describe('getStatus', () => {
    it('should return GitLab connection status', async () => {
      const mockStatus = {
        connected: true,
        username: 'testuser',
        email: 'test@gitlab.com',
        connectedAt: new Date(),
      };
      usersService.getGitLabConnectionStatus.mockResolvedValue(mockStatus);

      const result = await controller.getStatus(mockUser as any);

      expect(usersService.getGitLabConnectionStatus).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockStatus);
    });

    it('should return not connected status', async () => {
      usersService.getGitLabConnectionStatus.mockResolvedValue({ connected: false });

      const result = await controller.getStatus(mockUser as any);

      expect(result.connected).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect GitLab account', async () => {
      usersService.disconnectGitLab.mockResolvedValue(undefined);

      const result = await controller.disconnect(mockUser as any);

      expect(usersService.disconnectGitLab).toHaveBeenCalledWith('user-123');
      expect(result.message).toBe('GitLab account disconnected successfully');
    });
  });

  describe('getAuthUrl', () => {
    it('should return GitLab OAuth URL with user state', () => {
      const result = controller.getAuthUrl(mockUser as any);

      expect(result.url).toContain('https://gitlab.com/oauth/authorize');
      expect(result.url).toContain('client_id=test-gitlab-client-id');
      expect(result.url).toContain('response_type=code');
      expect(result.url).toContain('scope=read_user+api+read_repository');
    });

    it('should throw BadRequestException if GitLab OAuth not configured', async () => {
      const moduleWithoutConfig = await Test.createTestingModule({
        controllers: [GitLabAuthController],
        providers: [
          { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('') } },
          { provide: UsersService, useValue: {} },
          { provide: AuthService, useValue: {} },
        ],
      }).compile();

      const controllerWithoutConfig = moduleWithoutConfig.get<GitLabAuthController>(GitLabAuthController);

      expect(() => controllerWithoutConfig.getAuthUrl(mockUser as any)).toThrow(
        BadRequestException,
      );
    });
  });
});
