/**
 * OAuth Providers API Tests (Google & GitLab)
 * TDD: Tests for googleApi and gitlabApi
 *
 * These APIs are used in Settings page for connecting OAuth providers
 */
import apiClient, { googleApi, gitlabApi } from '../api-client';

// Use jest.spyOn to mock apiClient methods
describe('Google OAuth API', () => {
  let getSpy: jest.SpyInstance;
  let deleteSpy: jest.SpyInstance;

  beforeEach(() => {
    getSpy = jest.spyOn(apiClient, 'get');
    deleteSpy = jest.spyOn(apiClient, 'delete');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAuthUrl', () => {
    it('should return Google OAuth URL for connect flow', async () => {
      const mockResponse = {
        data: {
          url: 'https://accounts.google.com/o/oauth2/v2/auth?client_id=xxx&state=xxx',
        },
      };
      getSpy.mockResolvedValue(mockResponse);

      const result = await googleApi.getAuthUrl();

      expect(getSpy).toHaveBeenCalledWith('/api/auth/google/auth-url');
      expect(result.url).toContain('accounts.google.com');
    });

    it('should include userId for connect flow', async () => {
      const mockResponse = {
        data: { url: 'https://accounts.google.com/...' },
      };
      getSpy.mockResolvedValue(mockResponse);

      await googleApi.getAuthUrl('user-123');

      expect(getSpy).toHaveBeenCalledWith('/api/auth/google/auth-url?userId=user-123');
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connected status with email', async () => {
      const mockResponse = {
        data: {
          connected: true,
          email: 'user@gmail.com',
          name: 'Test User',
          connectedAt: '2024-01-15T10:00:00Z',
        },
      };
      getSpy.mockResolvedValue(mockResponse);

      const result = await googleApi.getConnectionStatus();

      expect(getSpy).toHaveBeenCalledWith('/api/auth/google/status');
      expect(result.connected).toBe(true);
      expect(result.email).toBe('user@gmail.com');
    });

    it('should return not connected status', async () => {
      const mockResponse = {
        data: { connected: false },
      };
      getSpy.mockResolvedValue(mockResponse);

      const result = await googleApi.getConnectionStatus();

      expect(result.connected).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect Google account', async () => {
      const mockResponse = {
        data: { message: 'Google account disconnected successfully' },
      };
      deleteSpy.mockResolvedValue(mockResponse);

      const result = await googleApi.disconnect();

      expect(deleteSpy).toHaveBeenCalledWith('/api/auth/google');
      expect(result.message).toContain('disconnected');
    });

    it('should handle disconnect errors', async () => {
      const error = new Error('Server error');
      deleteSpy.mockRejectedValue(error);

      await expect(googleApi.disconnect()).rejects.toThrow('Server error');
    });
  });
});

describe('GitLab OAuth API', () => {
  let getSpy: jest.SpyInstance;
  let deleteSpy: jest.SpyInstance;

  beforeEach(() => {
    getSpy = jest.spyOn(apiClient, 'get');
    deleteSpy = jest.spyOn(apiClient, 'delete');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAuthUrl', () => {
    it('should return GitLab OAuth URL for connect flow', async () => {
      const mockResponse = {
        data: {
          url: 'https://gitlab.com/oauth/authorize?client_id=xxx&state=xxx',
        },
      };
      getSpy.mockResolvedValue(mockResponse);

      const result = await gitlabApi.getAuthUrl();

      expect(getSpy).toHaveBeenCalledWith('/api/auth/gitlab/auth-url');
      expect(result.url).toContain('gitlab.com');
    });

    it('should include userId for connect flow', async () => {
      const mockResponse = {
        data: { url: 'https://gitlab.com/...' },
      };
      getSpy.mockResolvedValue(mockResponse);

      await gitlabApi.getAuthUrl('user-456');

      expect(getSpy).toHaveBeenCalledWith('/api/auth/gitlab/auth-url?userId=user-456');
    });
  });

  describe('getConnectionStatus', () => {
    it('should return connected status with username', async () => {
      const mockResponse = {
        data: {
          connected: true,
          username: 'testuser',
          email: 'user@gitlab.com',
          connectedAt: '2024-01-15T10:00:00Z',
        },
      };
      getSpy.mockResolvedValue(mockResponse);

      const result = await gitlabApi.getConnectionStatus();

      expect(getSpy).toHaveBeenCalledWith('/api/auth/gitlab/status');
      expect(result.connected).toBe(true);
      expect(result.username).toBe('testuser');
    });

    it('should return not connected status', async () => {
      const mockResponse = {
        data: { connected: false },
      };
      getSpy.mockResolvedValue(mockResponse);

      const result = await gitlabApi.getConnectionStatus();

      expect(result.connected).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect GitLab account', async () => {
      const mockResponse = {
        data: { message: 'GitLab account disconnected successfully' },
      };
      deleteSpy.mockResolvedValue(mockResponse);

      const result = await gitlabApi.disconnect();

      expect(deleteSpy).toHaveBeenCalledWith('/api/auth/gitlab');
      expect(result.message).toContain('disconnected');
    });

    it('should handle disconnect errors', async () => {
      const error = new Error('Server error');
      deleteSpy.mockRejectedValue(error);

      await expect(gitlabApi.disconnect()).rejects.toThrow('Server error');
    });
  });

  describe('listProjects', () => {
    it('should list GitLab projects', async () => {
      const mockResponse = {
        data: [
          { id: 1, name: 'project-1', web_url: 'https://gitlab.com/user/project-1' },
          { id: 2, name: 'project-2', web_url: 'https://gitlab.com/user/project-2' },
        ],
      };
      getSpy.mockResolvedValue(mockResponse);

      const result = await gitlabApi.listProjects();

      expect(getSpy).toHaveBeenCalledWith('/api/git/gitlab/projects');
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no projects', async () => {
      const mockResponse = { data: [] };
      getSpy.mockResolvedValue(mockResponse);

      const result = await gitlabApi.listProjects();

      expect(result).toHaveLength(0);
    });
  });
});
