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
  generate: async (wizardData: any, projectId?: string) => {
    const response = await apiClient.post('/api/plans/generate', {
      projectId: projectId || 'temp-' + Date.now(),
      wizardData,
    });
    return response.data;
  },

  getAll: async (projectId?: string) => {
    const url = projectId ? `/api/plans?projectId=${projectId}` : '/api/plans';
    const response = await apiClient.get(url);
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
  create: async (name: string, description: string) => {
    const response = await apiClient.post('/api/projects', { name, description });
    return response.data;
  },

  getAll: async () => {
    const response = await apiClient.get('/api/projects');
    return response.data;
  },

  getById: async (id: string) => {
    const response = await apiClient.get(`/api/projects/${id}`);
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

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    return response.data;
  },

  register: async (email: string, password: string, name: string) => {
    const response = await apiClient.post('/api/auth/register', { email, password, name });
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/api/auth/logout');
    return response.data;
  },

  refresh: async (userId: string, refreshToken: string) => {
    const response = await apiClient.post('/api/auth/refresh', { userId, refreshToken });
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },
};

export const recommendationsApi = {
  // Database recommendations
  getDatabaseRecommendation: async (requirements: {
    dataType: string;
    dataVolume: string;
    trafficLevel: string;
    needsBranching: boolean;
    budget: string;
    needsAuth?: boolean;
    needsStorage?: boolean;
    needsRealtime?: boolean;
  }) => {
    const response = await apiClient.post('/api/recommendations/database', requirements);
    return response.data;
  },

  getDatabaseProviders: async () => {
    const response = await apiClient.get('/api/recommendations/database/providers');
    return response.data;
  },

  // Deploy recommendations
  getDeployRecommendation: async (requirements: {
    components: string[];
    needsPreviewDeployments: boolean;
    trafficTier: string;
    infraComplexity: string;
    budget: string;
    devOpsLevel: string;
  }) => {
    const response = await apiClient.post('/api/recommendations/deploy', requirements);
    return response.data;
  },

  getDeployProviders: async () => {
    const response = await apiClient.get('/api/recommendations/deploy/providers');
    return response.data;
  },

  // Cost calculator
  calculateCost: async (projection: {
    mvpUsers: number;
    growthUsers: number;
    scaleUsers: number;
    mvpStorageGB?: number;
    growthStorageGB?: number;
    scaleStorageGB?: number;
  }) => {
    const response = await apiClient.post('/api/recommendations/cost', projection);
    return response.data;
  },

  getPricingTiers: async () => {
    const response = await apiClient.get('/api/recommendations/cost/pricing');
    return response.data;
  },

  // Full recommendation (combined)
  getFullRecommendation: async (data: {
    database: any;
    deploy: any;
    cost: any;
  }) => {
    const response = await apiClient.post('/api/recommendations/full', data);
    return response.data;
  },
};

export const documentationApi = {
  // Generate documentation
  generateDocument: async (dto: {
    projectId: string;
    type: string;
    context?: {
      featureName?: string;
      description?: string;
      files?: string[];
    };
  }) => {
    const response = await apiClient.post('/api/documentation/generate', dto);
    return response.data;
  },

  // Generate ADR
  generateADR: async (dto: {
    projectId: string;
    title: string;
    context: string;
    decision: string;
    consequences: {
      positive: string[];
      negative: string[];
    };
    alternatives?: {
      name: string;
      description: string;
      rejected_reason: string;
    }[];
  }) => {
    const response = await apiClient.post('/api/documentation/adr', dto);
    return response.data;
  },

  // Generate diagram
  generateDiagram: async (dto: {
    projectId: string;
    type: string;
    title: string;
    entities?: { name: string; type: string; attributes?: string[] }[];
    relationships?: { from: string; to: string; label?: string; type?: string }[];
    steps?: { actor: string; action: string; target?: string }[];
  }) => {
    const response = await apiClient.post('/api/documentation/diagram', dto);
    return response.data;
  },

  // Generate API docs
  generateAPIDocs: async (dto: {
    title: string;
    version: string;
    description: string;
    baseUrl: string;
    endpoints: any[];
    schemas?: Record<string, any>;
  }) => {
    const response = await apiClient.post('/api/documentation/api-docs', dto);
    return response.data;
  },

  // Generate full documentation
  generateFullDocumentation: async (dto: {
    projectName: string;
    projectDescription: string;
    features: string[];
    stack: { frontend: string; backend: string; database: string };
  }) => {
    const response = await apiClient.post('/api/documentation/full', dto);
    return response.data;
  },

  // Generate system diagram
  generateSystemDiagram: async (dto: {
    components: { name: string; type: string }[];
    connections: { from: string; to: string; label?: string }[];
  }) => {
    const response = await apiClient.post('/api/documentation/system-diagram', dto);
    return response.data;
  },

  // Generate data model diagram
  generateDataModelDiagram: async (dto: {
    models: { name: string; fields: string[] }[];
    relations: { from: string; to: string; type: string; label?: string }[];
  }) => {
    const response = await apiClient.post('/api/documentation/data-model-diagram', dto);
    return response.data;
  },

  // Get documentation types
  getTypes: async () => {
    const response = await apiClient.get('/api/documentation/types');
    return response.data;
  },
};
