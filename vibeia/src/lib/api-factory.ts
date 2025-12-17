/**
 * API Factory Module
 *
 * Creates standardized API modules with common CRUD operations.
 * Reduces boilerplate and ensures consistent API patterns across the app.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const projectsApi = createApiModule('/api/projects');
 * const projects = await projectsApi.getAll();
 * const project = await projectsApi.getById('123');
 *
 * // With custom methods
 * const projectsApi = createApiModule('/api/projects', {
 *   importFromGitHub: async (data) => {
 *     const response = await apiClient.post('/api/projects/import', data);
 *     return response.data;
 *   },
 * });
 *
 * // Typed
 * interface Project { id: string; name: string; }
 * const projectsApi = createApiModule<Project>('/api/projects');
 * ```
 */

import apiClient from './api-client';

/**
 * Base API module interface with standard CRUD operations
 */
export interface ApiModule<T = unknown> {
  /** Base path for the API module */
  basePath: string;

  /** Get all resources, optionally with query params */
  getAll: (params?: Record<string, string>) => Promise<T[]>;

  /** Get a single resource by ID */
  getById: (id: string) => Promise<T>;

  /** Create a new resource */
  create: <D = Partial<T>>(data: D) => Promise<T>;

  /** Update a resource (full replacement) */
  update: <D = Partial<T>>(id: string, data: D) => Promise<T>;

  /** Patch a resource (partial update) */
  patch: <D = Partial<T>>(id: string, data: D) => Promise<T>;

  /** Delete a resource */
  delete: (id: string) => Promise<{ success?: boolean; [key: string]: unknown }>;

  /** Execute an action on a resource or the collection */
  action: <D = unknown, R = unknown>(
    id: string | null,
    actionName: string,
    data?: D,
  ) => Promise<R>;
}

/**
 * Type for custom methods that can be added to an API module
 */
export type CustomMethods<T> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: (...args: any[]) => Promise<any>;
};

/**
 * Creates an API module with standard CRUD operations.
 *
 * @param basePath - The base URL path for the API endpoints
 * @param customMethods - Optional custom methods to add or override
 * @returns An API module with CRUD operations and any custom methods
 */
export function createApiModule<T = unknown, C extends CustomMethods<T> = object>(
  basePath: string,
  customMethods?: C,
): ApiModule<T> & C {
  /**
   * Build URL with optional query parameters
   */
  const buildUrl = (path: string, params?: Record<string, string>): string => {
    if (!params || Object.keys(params).length === 0) {
      return path;
    }
    const queryString = new URLSearchParams(params).toString();
    return `${path}?${queryString}`;
  };

  // Standard CRUD operations
  const standardMethods: ApiModule<T> = {
    basePath,

    getAll: async (params?: Record<string, string>): Promise<T[]> => {
      const url = buildUrl(basePath, params);
      const response = await apiClient.get(url);
      return response.data;
    },

    getById: async (id: string): Promise<T> => {
      const response = await apiClient.get(`${basePath}/${id}`);
      return response.data;
    },

    create: async <D = Partial<T>>(data: D): Promise<T> => {
      const response = await apiClient.post(basePath, data);
      return response.data;
    },

    update: async <D = Partial<T>>(id: string, data: D): Promise<T> => {
      const response = await apiClient.put(`${basePath}/${id}`, data);
      return response.data;
    },

    patch: async <D = Partial<T>>(id: string, data: D): Promise<T> => {
      const response = await apiClient.patch(`${basePath}/${id}`, data);
      return response.data;
    },

    delete: async (id: string): Promise<{ success?: boolean; [key: string]: unknown }> => {
      const response = await apiClient.delete(`${basePath}/${id}`);
      return response.data;
    },

    action: async <D = unknown, R = unknown>(
      id: string | null,
      actionName: string,
      data?: D,
    ): Promise<R> => {
      const url = id ? `${basePath}/${id}/${actionName}` : `${basePath}/${actionName}`;
      const response = await apiClient.post(url, data);
      return response.data;
    },
  };

  // Merge standard methods with custom methods
  // Custom methods can override standard methods
  return {
    ...standardMethods,
    ...customMethods,
  } as ApiModule<T> & C;
}

/**
 * Helper to create a typed API module with auto-completion support
 */
export function typedApiModule<T>() {
  return {
    create: <C extends CustomMethods<T> = object>(basePath: string, customMethods?: C) =>
      createApiModule<T, C>(basePath, customMethods),
  };
}

export default createApiModule;
