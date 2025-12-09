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

export const setupApi = {
  // Start setup process
  startSetup: async (dto: {
    projectId: string;
    projectName: string;
    enableNeon?: boolean;
    enableVercel?: boolean;
    enableRailway?: boolean;
    neonConfig?: { projectName: string; region?: string };
    vercelConfig?: { projectName: string; framework?: string };
    railwayConfig?: { projectName: string; description?: string };
    tokens?: { neon?: string; vercel?: string; railway?: string };
    envVars?: Record<string, string>;
  }) => {
    const response = await apiClient.post('/api/setup/start', dto);
    return response.data;
  },

  // Get setup status
  getStatus: async (setupId: string) => {
    const response = await apiClient.get(`/api/setup/status/${setupId}`);
    return response.data;
  },

  // Validate tokens
  validateTokens: async (tokens: {
    neonToken?: string;
    vercelToken?: string;
    railwayToken?: string;
  }) => {
    const response = await apiClient.post('/api/setup/validate-tokens', tokens);
    return response.data;
  },

  // Rollback setup
  rollback: async (setupId: string, tokens?: { neon?: string; vercel?: string; railway?: string }) => {
    const response = await apiClient.post(`/api/setup/rollback/${setupId}`, tokens);
    return response.data;
  },

  // Get available providers
  getProviders: async () => {
    const response = await apiClient.get('/api/setup/providers');
    return response.data;
  },

  // Get available regions
  getRegions: async () => {
    const response = await apiClient.get('/api/setup/regions');
    return response.data;
  },

  // Validate individual provider token
  validateNeonToken: async (token: string) => {
    const response = await apiClient.post('/api/setup/neon/validate', { token });
    return response.data;
  },

  validateVercelToken: async (token: string) => {
    const response = await apiClient.post('/api/setup/vercel/validate', { token });
    return response.data;
  },

  validateRailwayToken: async (token: string) => {
    const response = await apiClient.post('/api/setup/railway/validate', { token });
    return response.data;
  },
};

export const securityApi = {
  // Security Scanning
  scanFiles: async (files: { path: string; content: string }[], options?: {
    checkSecrets?: boolean;
    checkVulnerabilities?: boolean;
  }) => {
    const response = await apiClient.post('/api/security/scan', { files, options });
    return response.data;
  },

  scanSecrets: async (files: { path: string; content: string }[]) => {
    const response = await apiClient.post('/api/security/scan/secrets', { files });
    return response.data;
  },

  scanVulnerabilities: async (files: { path: string; content: string }[]) => {
    const response = await apiClient.post('/api/security/scan/vulnerabilities', { files });
    return response.data;
  },

  validateHeaders: async (headers: Record<string, string>) => {
    const response = await apiClient.post('/api/security/validate-headers', { headers });
    return response.data;
  },

  detectSensitiveFiles: async (files: string[]) => {
    const response = await apiClient.post('/api/security/detect-sensitive-files', { files });
    return response.data;
  },

  // Credential Management
  storeCredential: async (dto: {
    provider: string;
    token: string;
    tokenType?: string;
    scope?: string[];
  }) => {
    const response = await apiClient.post('/api/security/credentials', dto);
    return response.data;
  },

  listCredentials: async () => {
    const response = await apiClient.get('/api/security/credentials');
    return response.data;
  },

  getCredential: async (provider: string) => {
    const response = await apiClient.get(`/api/security/credentials/${provider}`);
    return response.data;
  },

  deleteCredential: async (id: string) => {
    const response = await apiClient.delete(`/api/security/credentials/${id}`);
    return response.data;
  },

  rotateCredential: async (id: string, newToken: string) => {
    const response = await apiClient.post(`/api/security/credentials/${id}/rotate`, { newToken });
    return response.data;
  },

  validateToken: async (provider: string, token: string) => {
    const response = await apiClient.post('/api/security/credentials/validate', { provider, token });
    return response.data;
  },

  shouldRotateCredential: async (id: string) => {
    const response = await apiClient.get(`/api/security/credentials/${id}/should-rotate`);
    return response.data;
  },

  // Workspace Management
  createWorkspace: async (dto: {
    projectId: string;
    config?: {
      base?: string;
      tools?: string[];
      resources?: { cpu: number; memory: string; disk: string };
      network?: string;
      lifetime?: string;
      autoDestroy?: boolean;
    };
  }) => {
    const response = await apiClient.post('/api/security/workspaces', dto);
    return response.data;
  },

  getWorkspaces: async () => {
    const response = await apiClient.get('/api/security/workspaces');
    return response.data;
  },

  getWorkspace: async (id: string) => {
    const response = await apiClient.get(`/api/security/workspaces/${id}`);
    return response.data;
  },

  getWorkspaceStats: async () => {
    const response = await apiClient.get('/api/security/workspaces/stats');
    return response.data;
  },

  pauseWorkspace: async (id: string) => {
    const response = await apiClient.post(`/api/security/workspaces/${id}/pause`);
    return response.data;
  },

  resumeWorkspace: async (id: string) => {
    const response = await apiClient.post(`/api/security/workspaces/${id}/resume`);
    return response.data;
  },

  extendWorkspace: async (id: string, duration: string) => {
    const response = await apiClient.post(`/api/security/workspaces/${id}/extend`, { duration });
    return response.data;
  },

  destroyWorkspace: async (id: string) => {
    const response = await apiClient.delete(`/api/security/workspaces/${id}`);
    return response.data;
  },

  executeInWorkspace: async (id: string, command: string) => {
    const response = await apiClient.post(`/api/security/workspaces/${id}/exec`, { command });
    return response.data;
  },

  cleanupWorkspaces: async () => {
    const response = await apiClient.post('/api/security/workspaces/cleanup');
    return response.data;
  },

  // Rate Limiting
  getRateLimitStats: async (name?: string) => {
    const url = name ? `/api/security/rate-limits?name=${name}` : '/api/security/rate-limits';
    const response = await apiClient.get(url);
    return response.data;
  },

  checkRateLimit: async (limiter: string, key: string) => {
    const response = await apiClient.post('/api/security/rate-limits/check', { limiter, key });
    return response.data;
  },

  resetRateLimit: async (limiter: string, key: string) => {
    const response = await apiClient.post('/api/security/rate-limits/reset', { limiter, key });
    return response.data;
  },

  // Security Headers
  getSecurityHeaders: async () => {
    const response = await apiClient.get('/api/security/headers');
    return response.data;
  },

  generateCSP: async (options: {
    allowInlineStyles?: boolean;
    allowInlineScripts?: boolean;
    scriptSources?: string[];
    styleSources?: string[];
    imageSources?: string[];
    connectSources?: string[];
  }) => {
    const response = await apiClient.post('/api/security/headers/csp', options);
    return response.data;
  },

  // Gitignore
  generateGitignore: async (projectPath: string, additionalSecrets?: string[]) => {
    const response = await apiClient.post('/api/security/gitignore', { projectPath, additionalSecrets });
    return response.data;
  },

  // Health
  getHealth: async () => {
    const response = await apiClient.get('/api/security/health');
    return response.data;
  },
};

export const errorHandlingApi = {
  // Rollback resources
  rollback: async (dto: {
    setupId: string;
    reason?: string;
    force?: boolean;
    tokens?: { neon?: string; vercel?: string; railway?: string };
  }) => {
    const response = await apiClient.post('/api/error-handling/rollback', dto);
    return response.data;
  },

  // Get rollback status
  getRollbackStatus: async (setupId: string) => {
    const response = await apiClient.get(`/api/error-handling/rollback/status/${setupId}`);
    return response.data;
  },

  // Attempt recovery
  attemptRecovery: async (dto: {
    setupId: string;
    errorId: string;
    strategy?: string;
  }) => {
    const response = await apiClient.post('/api/error-handling/recover', dto);
    return response.data;
  },

  // Analyze error
  analyzeError: async (dto: {
    errorMessage: string;
    errorCode?: string;
    setupId?: string;
    taskName?: string;
  }) => {
    const response = await apiClient.post('/api/error-handling/analyze', dto);
    return response.data;
  },

  // Get error strategies
  getStrategies: async () => {
    const response = await apiClient.get('/api/error-handling/strategies');
    return response.data;
  },

  // Get health status
  getHealth: async () => {
    const response = await apiClient.get('/api/error-handling/health');
    return response.data;
  },
};

export const billingApi = {
  // Subscriptions
  createSubscription: async (dto: {
    userId: string;
    plan: string;
    billingCycle: string;
    paymentMethodId?: string;
  }) => {
    const response = await apiClient.post('/api/billing/subscriptions', dto);
    return response.data;
  },

  getMySubscription: async () => {
    const response = await apiClient.get('/api/billing/subscriptions/me');
    return response.data;
  },

  getSubscription: async (id: string) => {
    const response = await apiClient.get(`/api/billing/subscriptions/${id}`);
    return response.data;
  },

  updateSubscription: async (id: string, dto: {
    plan?: string;
    billingCycle?: string;
    cancelAtPeriodEnd?: boolean;
  }) => {
    const response = await apiClient.patch(`/api/billing/subscriptions/${id}`, dto);
    return response.data;
  },

  cancelSubscription: async (id: string, immediately = false) => {
    const response = await apiClient.post(`/api/billing/subscriptions/${id}/cancel`, { immediately });
    return response.data;
  },

  reactivateSubscription: async (id: string) => {
    const response = await apiClient.post(`/api/billing/subscriptions/${id}/reactivate`);
    return response.data;
  },

  // Plans
  getPlans: async () => {
    const response = await apiClient.get('/api/billing/plans');
    return response.data;
  },

  getPlan: async (plan: string) => {
    const response = await apiClient.get(`/api/billing/plans/${plan}`);
    return response.data;
  },

  comparePlans: async (plans: string[]) => {
    const response = await apiClient.post('/api/billing/plans/compare', { plans });
    return response.data;
  },

  // Invoices
  getInvoices: async () => {
    const response = await apiClient.get('/api/billing/invoices');
    return response.data;
  },

  payInvoice: async (id: string) => {
    const response = await apiClient.post(`/api/billing/invoices/${id}/pay`);
    return response.data;
  },

  // Usage
  getMyUsage: async (period?: string) => {
    const url = period ? `/api/billing/usage/me?period=${period}` : '/api/billing/usage/me';
    const response = await apiClient.get(url);
    return response.data;
  },

  checkLimit: async (type: string) => {
    const response = await apiClient.get(`/api/billing/usage/check/${type}`);
    return response.data;
  },

  getUsageHistory: async (type: string, months?: number) => {
    const url = months
      ? `/api/billing/usage/history/${type}?months=${months}`
      : `/api/billing/usage/history/${type}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  // Analytics
  getOverviewMetrics: async () => {
    const response = await apiClient.get('/api/billing/analytics/overview');
    return response.data;
  },

  getPlatformAnalytics: async (period?: string) => {
    const url = period
      ? `/api/billing/analytics/platform?period=${period}`
      : '/api/billing/analytics/platform';
    const response = await apiClient.get(url);
    return response.data;
  },

  getDailyMetrics: async (date?: string) => {
    const url = date
      ? `/api/billing/analytics/daily?date=${date}`
      : '/api/billing/analytics/daily';
    const response = await apiClient.get(url);
    return response.data;
  },

  getMetricsRange: async (startDate: string, endDate: string, granularity?: string) => {
    const response = await apiClient.post('/api/billing/analytics/range', {
      startDate,
      endDate,
      granularity,
    });
    return response.data;
  },

  getUserAnalytics: async (userId: string) => {
    const response = await apiClient.get(`/api/billing/analytics/user/${userId}`);
    return response.data;
  },

  getTimeSeries: async (metric: string, days?: number) => {
    const url = days
      ? `/api/billing/analytics/timeseries/${metric}?days=${days}`
      : `/api/billing/analytics/timeseries/${metric}`;
    const response = await apiClient.get(url);
    return response.data;
  },

  getSubscriptionBreakdown: async () => {
    const response = await apiClient.get('/api/billing/analytics/subscriptions/breakdown');
    return response.data;
  },

  getTopFeatures: async () => {
    const response = await apiClient.get('/api/billing/analytics/features/top');
    return response.data;
  },

  // Tracking
  trackActivity: async () => {
    const response = await apiClient.post('/api/billing/track/activity');
    return response.data;
  },

  trackPlanCreated: async () => {
    const response = await apiClient.post('/api/billing/track/plan-created');
    return response.data;
  },

  trackTaskCompleted: async () => {
    const response = await apiClient.post('/api/billing/track/task-completed');
    return response.data;
  },

  // ROI Calculator
  calculateROI: async (params?: {
    hoursWithoutVibe?: number;
    hoursWithVibe?: number;
    hourlyRate?: number;
    monthlyFeatures?: number;
  }) => {
    const response = await apiClient.post('/api/billing/roi/calculate', params || {});
    return response.data;
  },

  // Feature Access
  checkFeatureAccess: async (feature: string) => {
    const response = await apiClient.get(`/api/billing/features/${feature}`);
    return response.data;
  },

  // Health
  getHealth: async () => {
    const response = await apiClient.get('/api/billing/health');
    return response.data;
  },
};

// LLM Settings API
export const llmSettingsApi = {
  // Get all providers info (for setup guidance)
  getProvidersInfo: async () => {
    const response = await apiClient.get('/api/users/llm/providers');
    return response.data;
  },

  // Get user's LLM keys status
  getMyKeys: async () => {
    const response = await apiClient.get('/api/users/me/llm/keys');
    return response.data;
  },

  // Set or update an LLM API key
  setKey: async (provider: string, apiKey: string) => {
    const response = await apiClient.post('/api/users/me/llm/keys', { provider, apiKey });
    return response.data;
  },

  // Remove an LLM API key
  removeKey: async (provider: string) => {
    const response = await apiClient.delete(`/api/users/me/llm/keys/${provider}`);
    return response.data;
  },

  // Toggle an LLM API key active/inactive
  toggleKey: async (provider: string, isActive: boolean) => {
    const response = await apiClient.patch(`/api/users/me/llm/keys/${provider}/toggle`, { isActive });
    return response.data;
  },

  // Get LLM preferences
  getPreferences: async () => {
    const response = await apiClient.get('/api/users/me/llm/preferences');
    return response.data;
  },

  // Update LLM preferences
  updatePreferences: async (preferences: {
    primaryProvider?: string;
    fallbackEnabled?: boolean;
    fallbackOrder?: string[];
  }) => {
    const response = await apiClient.patch('/api/users/me/llm/preferences', preferences);
    return response.data;
  },

  // Test an LLM API key
  testKey: async (provider: string) => {
    const response = await apiClient.post(`/api/users/me/llm/keys/${provider}/test`);
    return response.data;
  },

  // Check if setup is required
  checkSetupRequired: async () => {
    const response = await apiClient.get('/api/users/me/llm/setup-required');
    return response.data;
  },
};

export const teamsApi = {
  // Teams CRUD
  createTeam: async (dto: { name: string; description?: string; settings?: any }) => {
    const response = await apiClient.post('/api/teams', dto);
    return response.data;
  },

  getMyTeams: async () => {
    const response = await apiClient.get('/api/teams');
    return response.data;
  },

  getTeam: async (teamId: string) => {
    const response = await apiClient.get(`/api/teams/${teamId}`);
    return response.data;
  },

  getTeamBySlug: async (slug: string) => {
    const response = await apiClient.get(`/api/teams/slug/${slug}`);
    return response.data;
  },

  updateTeam: async (teamId: string, dto: { name?: string; description?: string; avatarUrl?: string; settings?: any }) => {
    const response = await apiClient.patch(`/api/teams/${teamId}`, dto);
    return response.data;
  },

  deleteTeam: async (teamId: string) => {
    const response = await apiClient.delete(`/api/teams/${teamId}`);
    return response.data;
  },

  transferOwnership: async (teamId: string, newOwnerId: string, confirmPassword: string) => {
    const response = await apiClient.post(`/api/teams/${teamId}/transfer`, { newOwnerId, confirmPassword });
    return response.data;
  },

  // Stats & Activity
  getTeamStats: async (teamId: string) => {
    const response = await apiClient.get(`/api/teams/${teamId}/stats`);
    return response.data;
  },

  getTeamActivity: async (teamId: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit.toString());
    if (offset) params.append('offset', offset.toString());
    const query = params.toString() ? `?${params}` : '';
    const response = await apiClient.get(`/api/teams/${teamId}/activity${query}`);
    return response.data;
  },

  // Members
  getMembers: async (teamId: string) => {
    const response = await apiClient.get(`/api/teams/${teamId}/members`);
    return response.data;
  },

  addMember: async (teamId: string, userId: string, role: string) => {
    const response = await apiClient.post(`/api/teams/${teamId}/members`, { userId, role });
    return response.data;
  },

  updateMemberRole: async (teamId: string, memberId: string, role: string) => {
    const response = await apiClient.patch(`/api/teams/${teamId}/members/${memberId}/role`, { role });
    return response.data;
  },

  removeMember: async (teamId: string, memberId: string) => {
    const response = await apiClient.delete(`/api/teams/${teamId}/members/${memberId}`);
    return response.data;
  },

  leaveTeam: async (teamId: string) => {
    const response = await apiClient.post(`/api/teams/${teamId}/leave`);
    return response.data;
  },

  // Invitations
  getInvitations: async (teamId: string, status?: string) => {
    const query = status ? `?status=${status}` : '';
    const response = await apiClient.get(`/api/teams/${teamId}/invitations${query}`);
    return response.data;
  },

  inviteMember: async (teamId: string, email: string, role: string, message?: string) => {
    const response = await apiClient.post(`/api/teams/${teamId}/invitations`, { email, role, message });
    return response.data;
  },

  bulkInvite: async (teamId: string, emails: string[], role: string) => {
    const response = await apiClient.post(`/api/teams/${teamId}/invitations/bulk`, { emails, role });
    return response.data;
  },

  revokeInvitation: async (teamId: string, invitationId: string) => {
    const response = await apiClient.delete(`/api/teams/${teamId}/invitations/${invitationId}`);
    return response.data;
  },

  resendInvitation: async (teamId: string, invitationId: string) => {
    const response = await apiClient.post(`/api/teams/${teamId}/invitations/${invitationId}/resend`);
    return response.data;
  },

  acceptInvitation: async (token: string) => {
    const response = await apiClient.post('/api/teams/invitations/accept', { token });
    return response.data;
  },

  declineInvitation: async (token: string) => {
    const response = await apiClient.post('/api/teams/invitations/decline', { token });
    return response.data;
  },

  getPendingInvitations: async () => {
    const response = await apiClient.get('/api/teams/invitations/pending');
    return response.data;
  },

  // Git Connections
  getGitConnections: async (teamId: string) => {
    const response = await apiClient.get(`/api/teams/${teamId}/git-connections`);
    return response.data;
  },

  connectGitProvider: async (teamId: string, dto: {
    provider: string;
    code: string;
    redirectUri: string;
    organizationId?: string;
    isDefault?: boolean;
  }) => {
    const response = await apiClient.post(`/api/teams/${teamId}/git-connections`, dto);
    return response.data;
  },

  disconnectGitProvider: async (teamId: string, connectionId: string) => {
    const response = await apiClient.delete(`/api/teams/${teamId}/git-connections/${connectionId}`);
    return response.data;
  },

  setDefaultConnection: async (teamId: string, connectionId: string) => {
    const response = await apiClient.post(`/api/teams/${teamId}/git-connections/${connectionId}/set-default`);
    return response.data;
  },

  validateConnection: async (teamId: string, connectionId: string) => {
    const response = await apiClient.post(`/api/teams/${teamId}/git-connections/${connectionId}/validate`);
    return response.data;
  },

  // OAuth
  getOAuthUrl: async (provider: string, redirectUri: string, state: string) => {
    const response = await apiClient.get(`/api/teams/oauth/${provider}/url?redirectUri=${encodeURIComponent(redirectUri)}&state=${state}`);
    return response.data;
  },

  // Permissions
  getMyPermissions: async (teamId: string) => {
    const response = await apiClient.get(`/api/teams/${teamId}/permissions`);
    return response.data;
  },

  // Health
  getHealth: async () => {
    const response = await apiClient.get('/api/teams/health');
    return response.data;
  },
};
