import { createApiModule, ApiModule } from '../api-factory';

// Mock the api-client
jest.mock('../api-client', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import apiClient from '../api-client';

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('createApiModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic CRUD operations', () => {
    it('should create a module with the correct base path', () => {
      const api = createApiModule('/api/projects');
      expect(api.basePath).toBe('/api/projects');
    });

    it('should get all resources', async () => {
      mockApiClient.get.mockResolvedValue({ data: [{ id: '1' }, { id: '2' }] });

      const api = createApiModule('/api/projects');
      const result = await api.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/projects');
      expect(result).toEqual([{ id: '1' }, { id: '2' }]);
    });

    it('should get all resources with query params', async () => {
      mockApiClient.get.mockResolvedValue({ data: [{ id: '1' }] });

      const api = createApiModule('/api/projects');
      const result = await api.getAll({ status: 'active', limit: '10' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/projects?status=active&limit=10');
      expect(result).toEqual([{ id: '1' }]);
    });

    it('should get a single resource by id', async () => {
      mockApiClient.get.mockResolvedValue({ data: { id: '123', name: 'Project 1' } });

      const api = createApiModule('/api/projects');
      const result = await api.getById('123');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/projects/123');
      expect(result).toEqual({ id: '123', name: 'Project 1' });
    });

    it('should create a resource', async () => {
      const newProject = { name: 'New Project', description: 'Test' };
      mockApiClient.post.mockResolvedValue({ data: { id: '456', ...newProject } });

      const api = createApiModule('/api/projects');
      const result = await api.create(newProject);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/projects', newProject);
      expect(result).toEqual({ id: '456', ...newProject });
    });

    it('should update a resource with PUT', async () => {
      const updateData = { name: 'Updated Project' };
      mockApiClient.put.mockResolvedValue({ data: { id: '123', ...updateData } });

      const api = createApiModule('/api/projects');
      const result = await api.update('123', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/api/projects/123', updateData);
      expect(result).toEqual({ id: '123', ...updateData });
    });

    it('should patch a resource', async () => {
      const patchData = { status: 'archived' };
      mockApiClient.patch.mockResolvedValue({ data: { id: '123', ...patchData } });

      const api = createApiModule('/api/projects');
      const result = await api.patch('123', patchData);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/projects/123', patchData);
      expect(result).toEqual({ id: '123', ...patchData });
    });

    it('should delete a resource', async () => {
      mockApiClient.delete.mockResolvedValue({ data: { success: true } });

      const api = createApiModule('/api/projects');
      const result = await api.delete('123');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/api/projects/123');
      expect(result).toEqual({ success: true });
    });
  });

  describe('custom methods', () => {
    it('should allow adding custom methods', async () => {
      mockApiClient.post.mockResolvedValue({ data: { imported: true } });

      const api = createApiModule('/api/projects', {
        importFromGitHub: async (data: { repoUrl: string }) => {
          const response = await apiClient.post('/api/projects/import', data);
          return response.data;
        },
      });

      const result = await api.importFromGitHub({ repoUrl: 'owner/repo' });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/projects/import', {
        repoUrl: 'owner/repo',
      });
      expect(result).toEqual({ imported: true });
    });

    it('should allow overriding default methods', async () => {
      mockApiClient.get.mockResolvedValue({ data: { custom: true } });

      const api = createApiModule('/api/projects', {
        getAll: async () => {
          const response = await apiClient.get('/api/projects/custom-endpoint');
          return response.data;
        },
      });

      const result = await api.getAll();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/projects/custom-endpoint');
      expect(result).toEqual({ custom: true });
    });
  });

  describe('nested resources', () => {
    it('should handle action on a specific resource', async () => {
      mockApiClient.post.mockResolvedValue({ data: { started: true } });

      const api = createApiModule('/api/execution');
      const result = await api.action('plan-123', 'start');

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/execution/plan-123/start', undefined);
      expect(result).toEqual({ started: true });
    });

    it('should handle action with data', async () => {
      mockApiClient.post.mockResolvedValue({ data: { validated: true } });

      const api = createApiModule('/api/manual-tasks');
      const result = await api.action(null, 'validate', { taskType: 'api_key' });

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/manual-tasks/validate', {
        taskType: 'api_key',
      });
      expect(result).toEqual({ validated: true });
    });
  });

  describe('type safety', () => {
    interface Project {
      id: string;
      name: string;
      description?: string;
    }

    it('should support typed responses', async () => {
      mockApiClient.get.mockResolvedValue({
        data: { id: '1', name: 'Typed Project' },
      });

      const api = createApiModule<Project>('/api/projects');
      const result = await api.getById('1');

      // TypeScript should know result is Project type
      expect(result.id).toBe('1');
      expect(result.name).toBe('Typed Project');
    });

    it('should support typed arrays', async () => {
      mockApiClient.get.mockResolvedValue({
        data: [
          { id: '1', name: 'Project 1' },
          { id: '2', name: 'Project 2' },
        ],
      });

      const api = createApiModule<Project>('/api/projects');
      const result = await api.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Project 1');
    });
  });
});

describe('ApiModule interface', () => {
  it('should have required methods', () => {
    const api = createApiModule('/api/test');

    expect(typeof api.getAll).toBe('function');
    expect(typeof api.getById).toBe('function');
    expect(typeof api.create).toBe('function');
    expect(typeof api.update).toBe('function');
    expect(typeof api.patch).toBe('function');
    expect(typeof api.delete).toBe('function');
    expect(typeof api.action).toBe('function');
  });
});
