import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;

// API methods
export const plansApi = {
  generate: async (wizardData: any) => {
    const response = await apiClient.post('/api/plans/generate', {
      projectId: 'temp-' + Date.now(),
      userId: 'user-' + Date.now(),
      wizardData,
    });
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/plans/${id}`);
    return response.data;
  },

  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/api/plans/${id}`, { status });
    return response.data;
  },
};

export const projectsApi = {
  create: async (name: string, description: string, userId: string) => {
    const response = await apiClient.post('/api/projects', { name, description, userId });
    return response.data;
  },
};

export const executionApi = {
  start: async (planId: string) => {
    const response = await apiClient.post(`/api/execution/${planId}/start`);
    return response.data;
  },

  getStatus: async (planId: string) => {
    const response = await apiClient.get(`/api/execution/${planId}/status`);
    return response.data;
  },

  pause: async (planId: string) => {
    const response = await apiClient.post(`/api/execution/${planId}/pause`);
    return response.data;
  },

  resume: async (planId: string) => {
    const response = await apiClient.post(`/api/execution/${planId}/resume`);
    return response.data;
  },
};

export const manualTasksApi = {
  detect: async (task: { name: string; description: string; type?: string }) => {
    const response = await apiClient.post('/api/manual-tasks/detect', task);
    return response.data;
  },

  getTemplate: async (type: string) => {
    const response = await apiClient.get(`/api/manual-tasks/template/${type}`);
    return response.data;
  },

  validate: async (taskType: string, inputs: Record<string, string>) => {
    const response = await apiClient.post('/api/manual-tasks/validate', { taskType, inputs });
    return response.data;
  },

  generateEnv: async (inputs: Record<string, string>) => {
    const response = await apiClient.post('/api/manual-tasks/generate-env', { inputs });
    return response.data;
  },
};

export const qualityGatesApi = {
  check: async (files: { path: string; content: string }[], skipTests = false) => {
    const response = await apiClient.post('/api/quality-gates/check', { files, skipTests });
    return response.data;
  },

  lint: async (files: { path: string; content: string }[]) => {
    const response = await apiClient.post('/api/quality-gates/lint', { files });
    return response.data;
  },

  security: async (files: { path: string; content: string }[]) => {
    const response = await apiClient.post('/api/quality-gates/security', { files });
    return response.data;
  },
};
