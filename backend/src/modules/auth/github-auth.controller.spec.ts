import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { GitHubAuthController } from './github-auth.controller';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { GitService } from '../git/git.service';
import { AuthService } from './auth.service';
import { OAuthStateService } from './services/oauth-state.service';

// Mock fetch globally
global.fetch = jest.fn();

describe('GitHubAuthController', () => {
  let controller: GitHubAuthController;
  let configService: jest.Mocked<ConfigService>;
  let usersService: jest.Mocked<UsersService>;
  let gitService: jest.Mocked<GitService>;
  let authService: jest.Mocked<AuthService>;
  let oauthStateService: OAuthStateService;

  const mockConfigValues = {
    GITHUB_CLIENT_ID: 'test-client-id',
    GITHUB_CLIENT_SECRET: 'test-client-secret',
    GITHUB_CALLBACK_URL: 'http://localhost:3001/api/auth/github/callback',
    FRONTEND_URL: 'http://localhost:3000',
  };

  const mockUser = {
    userId: 'user-123',
    email: 'test@example.com',
  };

  const mockGitHubUser = {
    id: 12345,
    login: 'testuser',
    avatar_url: 'https://github.com/avatar.png',
    name: 'Test User',
    email: 'test@example.com',
  };

  const mockTokens = {
    accessToken: 'jwt-access-token',
    refreshToken: 'jwt-refresh-token',
    user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
  };

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => mockConfigValues[key] || ''),
    };

    const mockUsersService = {
      connectGitHub: jest.fn(),
      getGitHubConnectionStatus: jest.fn(),
      getGitHubAccessToken: jest.fn(),
      disconnectGitHub: jest.fn(),
    };

    const mockGitService = {
      verifyToken: jest.fn(),
    };

    const mockAuthService = {
      loginWithOAuth: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GitHubAuthController],
      providers: [
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: GitService, useValue: mockGitService },
        { provide: AuthService, useValue: mockAuthService },
        OAuthStateService,
      ],
    }).compile();

    controller = module.get<GitHubAuthController>(GitHubAuthController);
    configService = module.get(ConfigService);
    usersService = module.get(UsersService);
    gitService = module.get(GitService);
    authService = module.get(AuthService);
    oauthStateService = module.get(OAuthStateService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initiateOAuth', () => {
    it('should redirect to GitHub OAuth URL', async () => {
      const mockRes = {
        redirect: jest.fn(),
      } as unknown as Response;

      await controller.initiateOAuth(mockRes);

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('https://github.com/login/oauth/authorize'),
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('client_id=test-client-id'),
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

      await controller.initiateOAuth(mockRes, 'connect', 'user-123');

      const redirectUrl = (mockRes.redirect as jest.Mock).mock.calls[0][0];
      expect(redirectUrl).toContain('state=');
      // State should contain userId encoded
      const stateParam = new URL(redirectUrl).searchParams.get('state');
      const decodedState = JSON.parse(
        Buffer.from(stateParam!, 'base64').toString(),
      );
      expect(decodedState.userId).toBe('user-123');
      expect(decodedState.type).toBe('connect');
    });

    it('should throw BadRequestException if GitHub OAuth not configured', async () => {
      // Create controller with no client ID
      const moduleWithoutConfig = await Test.createTestingModule({
        controllers: [GitHubAuthController],
        providers: [
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('') },
          },
          { provide: UsersService, useValue: {} },
          { provide: GitService, useValue: {} },
          { provide: AuthService, useValue: {} },
          OAuthStateService,
        ],
      }).compile();

      const controllerWithoutConfig =
        moduleWithoutConfig.get<GitHubAuthController>(GitHubAuthController);
      const mockRes = { redirect: jest.fn() } as unknown as Response;

      await expect(
        controllerWithoutConfig.initiateOAuth(mockRes),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('handleCallback', () => {
    let mockRes: Response;

    beforeEach(() => {
      mockRes = {
        redirect: jest.fn(),
        cookie: jest.fn(),
      } as unknown as Response;
    });

    it('should redirect with error if OAuth error received', async () => {
      await controller.handleCallback(
        '', // code
        '', // state
        'access_denied', // error
        'User denied access', // error_description
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
          json: () =>
            Promise.resolve({
              access_token: 'github-token',
              token_type: 'bearer',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGitHubUser),
        });

      authService.loginWithOAuth.mockResolvedValue(mockTokens as any);

      const validState = oauthStateService.generateState('login');

      await controller.handleCallback(
        'auth-code-123',
        validState,
        '',
        '',
        mockRes,
      );

      expect(authService.loginWithOAuth).toHaveBeenCalledWith(
        'github',
        mockGitHubUser.id.toString(),
        mockGitHubUser.email,
        mockGitHubUser.name,
        'github-token',
        mockGitHubUser.login,
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('oauth_success=true'),
      );
    });

    it('should handle connect flow and redirect to dashboard', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () =>
            Promise.resolve({
              access_token: 'github-token',
              token_type: 'bearer',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockGitHubUser),
        });

      usersService.connectGitHub.mockResolvedValue(undefined);

      const validState = oauthStateService.generateState('connect', 'user-123');

      await controller.handleCallback(
        'auth-code-123',
        validState,
        '',
        '',
        mockRes,
      );

      expect(usersService.connectGitHub).toHaveBeenCalledWith(
        'user-123',
        mockGitHubUser.id.toString(),
        'github-token',
        mockGitHubUser.login,
      );
      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('github_connected=true'),
      );
    });

    it('should fetch email from /user/emails if not in profile', async () => {
      const userWithoutEmail = { ...mockGitHubUser, email: null };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ access_token: 'github-token' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(userWithoutEmail),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                email: 'secondary@example.com',
                primary: false,
                verified: true,
              },
              { email: 'primary@example.com', primary: true, verified: true },
            ]),
        });

      authService.loginWithOAuth.mockResolvedValue(mockTokens as any);

      const validState = oauthStateService.generateState('login');

      await controller.handleCallback(
        'auth-code-123',
        validState,
        '',
        '',
        mockRes,
      );

      expect(authService.loginWithOAuth).toHaveBeenCalledWith(
        'github',
        mockGitHubUser.id.toString(),
        'primary@example.com',
        mockGitHubUser.name,
        'github-token',
        mockGitHubUser.login,
      );
    });

    it('should redirect with error if token exchange fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            error: 'bad_verification_code',
            error_description: 'Invalid code',
          }),
      });

      const validState = oauthStateService.generateState('login');

      await controller.handleCallback(
        'invalid-code',
        validState,
        '',
        '',
        mockRes,
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=Invalid+code'),
      );
    });

    it('should redirect with generic error on exception', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new Error('Network error'),
      );

      const validState = oauthStateService.generateState('login');

      await controller.handleCallback(
        'auth-code-123',
        validState,
        '',
        '',
        mockRes,
      );

      expect(mockRes.redirect).toHaveBeenCalledWith(
        expect.stringContaining('error=Failed+to+authenticate+with+GitHub'),
      );
    });
  });

  describe('getStatus', () => {
    it('should return connected status with valid token', async () => {
      usersService.getGitHubConnectionStatus.mockResolvedValue({
        connected: true,
        username: 'testuser',
        connectedAt: new Date(),
      });
      usersService.getGitHubAccessToken.mockResolvedValue('valid-token');
      gitService.verifyToken.mockResolvedValue({
        valid: true,
        scopes: ['repo', 'user'],
      });

      const result = await controller.getStatus(mockUser as any);

      expect(result.connected).toBe(true);
      expect(result.username).toBe('testuser');
      expect(result.scopes).toEqual(['repo', 'user']);
    });

    it('should return not connected if token invalid', async () => {
      usersService.getGitHubConnectionStatus.mockResolvedValue({
        connected: true,
        username: 'testuser',
        connectedAt: new Date(),
      });
      usersService.getGitHubAccessToken.mockResolvedValue('expired-token');
      gitService.verifyToken.mockResolvedValue({ valid: false, scopes: [] });

      const result = await controller.getStatus(mockUser as any);

      expect(result.connected).toBe(false);
    });

    it('should return not connected if no GitHub connection', async () => {
      usersService.getGitHubConnectionStatus.mockResolvedValue({
        connected: false,
      });

      const result = await controller.getStatus(mockUser as any);

      expect(result.connected).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect GitHub account', async () => {
      usersService.disconnectGitHub.mockResolvedValue(undefined);

      const result = await controller.disconnect(mockUser as any);

      expect(usersService.disconnectGitHub).toHaveBeenCalledWith('user-123');
      expect(result.message).toBe('GitHub account disconnected successfully');
    });
  });

  describe('getAuthUrl', () => {
    it('should return GitHub OAuth URL with user state', () => {
      const result = controller.getAuthUrl(mockUser as any);

      expect(result.url).toContain('https://github.com/login/oauth/authorize');
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain('state=');

      const stateParam = new URL(result.url).searchParams.get('state');
      const decodedState = JSON.parse(
        Buffer.from(stateParam!, 'base64').toString(),
      );
      expect(decodedState.userId).toBe('user-123');
      expect(decodedState.type).toBe('connect');
    });

    it('should throw BadRequestException if GitHub OAuth not configured', async () => {
      const moduleWithoutConfig = await Test.createTestingModule({
        controllers: [GitHubAuthController],
        providers: [
          {
            provide: ConfigService,
            useValue: { get: jest.fn().mockReturnValue('') },
          },
          { provide: UsersService, useValue: {} },
          { provide: GitService, useValue: {} },
          { provide: AuthService, useValue: {} },
          OAuthStateService,
        ],
      }).compile();

      const controllerWithoutConfig =
        moduleWithoutConfig.get<GitHubAuthController>(GitHubAuthController);

      expect(() => controllerWithoutConfig.getAuthUrl(mockUser as any)).toThrow(
        BadRequestException,
      );
    });
  });
});
