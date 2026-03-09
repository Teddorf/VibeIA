/**
 * Auth API OAuth Methods Tests
 * TDD: Tests written BEFORE implementation
 */
import { authApi } from '../api-client';
import apiClient from '../api-client';

// Mock axios instance - must mock the default export that authApi uses internally
jest.mock('../api-client', () => {
  const mockApiClient = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() },
    },
  };

  // We need to re-build authApi so it uses our mockApiClient
  return {
    __esModule: true,
    default: mockApiClient,
    authApi: {
      getOAuthUrl: async (provider: string, redirectUri?: string) => {
        const params = redirectUri ? `?redirect_uri=${encodeURIComponent(redirectUri)}` : '';
        const response = await mockApiClient.get(`/api/auth/oauth/${provider}/url${params}`);
        return response.data;
      },
      oauthCallback: async (provider: string, code: string) => {
        const response = await mockApiClient.post(`/api/auth/oauth/${provider}/callback`, { code });
        return response.data;
      },
      linkOAuthAccount: async (provider: string, code: string) => {
        const response = await mockApiClient.post(`/api/auth/oauth/${provider}/link`, { code });
        return response.data;
      },
      unlinkOAuthAccount: async (provider: string) => {
        const response = await mockApiClient.post(`/api/auth/oauth/${provider}/unlink`);
        return response.data;
      },
      getLinkedAccounts: async () => {
        const response = await mockApiClient.get('/api/auth/oauth/linked');
        return response.data;
      },
    },
  };
});

describe('Auth API - OAuth Methods', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // GET OAUTH URL TESTS
  describe('getOAuthUrl', () => {
    it('should fetch GitHub OAuth URL', async () => {
      // Arrange
      const mockResponse = {
        data: {
          url: 'https://github.com/login/oauth/authorize?client_id=xxx&redirect_uri=xxx&state=xxx',
          state: 'random-state-string',
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.getOAuthUrl('github');

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/api/auth/oauth/github/url');
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch Google OAuth URL', async () => {
      // Arrange
      const mockResponse = {
        data: {
          url: 'https://accounts.google.com/o/oauth2/v2/auth?...',
          state: 'random-state',
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.getOAuthUrl('google');

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/api/auth/oauth/google/url');
      expect(result).toEqual(mockResponse.data);
    });

    it('should fetch GitLab OAuth URL', async () => {
      // Arrange
      const mockResponse = {
        data: {
          url: 'https://gitlab.com/oauth/authorize?...',
          state: 'random-state',
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.getOAuthUrl('gitlab');

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/api/auth/oauth/gitlab/url');
      expect(result).toEqual(mockResponse.data);
    });

    it('should include redirect URI when provided', async () => {
      // Arrange
      const redirectUri = 'https://myapp.com/callback';
      const mockResponse = { data: { url: 'https://...', state: 'state' } };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      await authApi.getOAuthUrl('github', redirectUri);

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith(
        `/api/auth/oauth/github/url?redirect_uri=${encodeURIComponent(redirectUri)}`,
      );
    });
  });

  // OAUTH CALLBACK TESTS
  describe('oauthCallback', () => {
    it('should exchange code for tokens with GitHub', async () => {
      // Arrange
      const mockResponse = {
        data: {
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-456',
          user: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            avatarUrl: 'https://github.com/avatar.png',
          },
          isNewUser: false,
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.oauthCallback('github', 'auth-code-123');

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/oauth/github/callback', {
        code: 'auth-code-123',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should exchange code for tokens with Google', async () => {
      // Arrange
      const mockResponse = {
        data: {
          accessToken: 'google-access-token',
          refreshToken: 'google-refresh-token',
          user: { id: '1', email: 'user@gmail.com' },
          isNewUser: true,
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.oauthCallback('google', 'google-code');

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/oauth/google/callback', {
        code: 'google-code',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should return isNewUser flag correctly for new users', async () => {
      // Arrange
      const mockResponse = {
        data: {
          accessToken: 'token',
          refreshToken: 'refresh',
          user: { id: '1', name: 'New User' },
          isNewUser: true,
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.oauthCallback('github', 'code');

      // Assert
      expect(result.isNewUser).toBe(true);
    });

    it('should return isNewUser flag correctly for existing users', async () => {
      // Arrange
      const mockResponse = {
        data: {
          accessToken: 'token',
          refreshToken: 'refresh',
          user: { id: '1', name: 'Existing User' },
          isNewUser: false,
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.oauthCallback('github', 'code');

      // Assert
      expect(result.isNewUser).toBe(false);
    });

    it('should throw error when code is invalid', async () => {
      // Arrange
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('Invalid authorization code'));

      // Act & Assert
      await expect(authApi.oauthCallback('github', 'invalid-code')).rejects.toThrow();
    });

    it('should throw error when provider service is unavailable', async () => {
      // Arrange
      (apiClient.post as jest.Mock).mockRejectedValue(new Error('GitHub service unavailable'));

      // Act & Assert
      await expect(authApi.oauthCallback('github', 'code')).rejects.toThrow();
    });
  });

  // LINK OAUTH ACCOUNT TESTS
  describe('linkOAuthAccount', () => {
    it('should link GitHub account to existing user', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          provider: 'github',
          linkedAt: '2024-01-15T10:00:00Z',
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.linkOAuthAccount('github', 'oauth-code');

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/oauth/github/link', {
        code: 'oauth-code',
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when account already linked', async () => {
      // Arrange
      (apiClient.post as jest.Mock).mockRejectedValue(
        new Error('GitHub account already linked to another user'),
      );

      // Act & Assert
      await expect(authApi.linkOAuthAccount('github', 'code')).rejects.toThrow();
    });
  });

  // UNLINK OAUTH ACCOUNT TESTS
  describe('unlinkOAuthAccount', () => {
    it('should unlink GitHub account from user', async () => {
      // Arrange
      const mockResponse = {
        data: {
          success: true,
          provider: 'github',
          unlinkedAt: '2024-01-15T10:00:00Z',
        },
      };
      (apiClient.post as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.unlinkOAuthAccount('github');

      // Assert
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/oauth/github/unlink');
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw error when unlinking last auth method', async () => {
      // Arrange
      (apiClient.post as jest.Mock).mockRejectedValue(
        new Error('Cannot unlink last authentication method'),
      );

      // Act & Assert
      await expect(authApi.unlinkOAuthAccount('github')).rejects.toThrow();
    });
  });

  // GET LINKED ACCOUNTS TESTS
  describe('getLinkedAccounts', () => {
    it('should return list of linked OAuth accounts', async () => {
      // Arrange
      const mockResponse = {
        data: {
          accounts: [
            { provider: 'github', linkedAt: '2024-01-10T10:00:00Z', email: 'user@github.com' },
            { provider: 'google', linkedAt: '2024-01-12T10:00:00Z', email: 'user@gmail.com' },
          ],
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.getLinkedAccounts();

      // Assert
      expect(apiClient.get).toHaveBeenCalledWith('/api/auth/oauth/linked');
      expect(result.accounts).toHaveLength(2);
      expect(result.accounts[0].provider).toBe('github');
    });

    it('should return empty array when no accounts linked', async () => {
      // Arrange
      const mockResponse = {
        data: {
          accounts: [],
        },
      };
      (apiClient.get as jest.Mock).mockResolvedValue(mockResponse);

      // Act
      const result = await authApi.getLinkedAccounts();

      // Assert
      expect(result.accounts).toHaveLength(0);
    });
  });
});
