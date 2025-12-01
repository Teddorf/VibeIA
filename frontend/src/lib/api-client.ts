import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) =\u003e {
    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = \Bearer \\;
    }
    return config;
  },
  (error) =\u003e {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) =\u003e response,
  (error) =\u003e {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default apiClient;

// API methods
export const plansApi = {
  generate: async (wizardData: any) =\u003e {
    const response = await apiClient.post('/api/plans/generate', {
      projectId: 'temp-' + Date.now(),
      userId: 'user-' + Date.now(),
      wizardData,
    });
    return response.data;
  },

  getById: async (id: string) =\u003e {
    const response = await apiClient.get(\/api/plans/\\);
    return response.data;
  },

  updateStatus: async (id: string, status: string) =\u003e {
    const response = await apiClient.patch(\/api/plans/\\, { status });
    return response.data;
  },
};
