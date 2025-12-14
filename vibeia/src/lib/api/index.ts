/**
 * API Module Index
 *
 * This file re-exports all API modules for a cleaner import experience.
 * Usage:
 *   import { authApi, projectsApi, plansApi } from '@/lib/api';
 *
 * Or import the client directly:
 *   import apiClient from '@/lib/api/client';
 */

// Core client
export { default as apiClient, createNoRetryRequest, createCancelToken } from './client';

// Re-export from legacy api-client for backward compatibility
// TODO: Migrate individual modules to this directory over time
export {
  plansApi,
  projectsApi,
  executionApi,
  manualTasksApi,
  qualityGatesApi,
  authApi,
  profileApi,
  recommendationsApi,
  documentationApi,
  setupApi,
  securityApi,
  errorHandlingApi,
  billingApi,
  llmSettingsApi,
  teamsApi,
  githubApi,
  codebaseAnalysisApi,
} from '../api-client';
