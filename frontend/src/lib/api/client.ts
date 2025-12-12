/**
 * Core API Client Configuration
 *
 * This module provides the base axios instance with interceptors for:
 * - Authentication token management
 * - Request/response logging
 * - Automatic retry for transient failures
 * - Rate limit handling
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { logger } from '../logger';
import { parseApiError, ErrorCode } from '../api-error';
import { API_TIMEOUT, RETRY_CONFIG } from '@/config/constants';

// Extend config for tracking
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
  __startTime?: number;
  __skipRetry?: boolean;
}

// Create axios instance
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: API_TIMEOUT.DEFAULT,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config: ExtendedAxiosRequestConfig) => {
    // Track timing for logging
    config.__startTime = Date.now();

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

// Response interceptor with automatic retry
apiClient.interceptors.response.use(
  (response) => {
    // Log successful API calls
    const config = response.config as ExtendedAxiosRequestConfig;
    const duration = config.__startTime ? Date.now() - config.__startTime : undefined;
    logger.apiCall(
      config.method?.toUpperCase() || 'GET',
      config.url || '',
      response.status,
      duration
    );
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as ExtendedAxiosRequestConfig | undefined;

    if (!config) {
      logger.error('API Error without config', error);
      return Promise.reject(error);
    }

    const retryCount = config.__retryCount || 0;
    const duration = config.__startTime ? Date.now() - config.__startTime : undefined;

    // Log the error
    logger.apiCall(
      config.method?.toUpperCase() || 'GET',
      config.url || '',
      error.response?.status,
      duration,
      error
    );

    // Parse error to determine if retryable
    const apiError = parseApiError(error);

    // No retry for certain error types
    if (config.__skipRetry) {
      return Promise.reject(error);
    }

    // Automatic retry for network errors and some server errors
    const shouldRetry = (
      apiError.isNetworkError ||
      apiError.code === ErrorCode.GATEWAY_TIMEOUT ||
      apiError.code === ErrorCode.BAD_GATEWAY ||
      apiError.code === ErrorCode.SERVICE_UNAVAILABLE
    );

    if (shouldRetry && retryCount < RETRY_CONFIG.MAX_RETRIES) {
      config.__retryCount = retryCount + 1;

      // Exponential backoff
      const delay = RETRY_CONFIG.INITIAL_DELAY * Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount);

      logger.info(`Retrying request (attempt ${retryCount + 1}/${RETRY_CONFIG.MAX_RETRIES})`, {
        url: config.url,
        method: config.method,
        delay,
      });

      await new Promise(resolve => setTimeout(resolve, delay));

      return apiClient.request(config);
    }

    // Rate limit: wait and retry
    if (apiError.code === ErrorCode.RATE_LIMITED && apiError.retryAfter && retryCount < 1) {
      config.__retryCount = retryCount + 1;
      const waitTime = apiError.retryAfter * 1000;

      logger.warn(`Rate limited. Retrying after ${apiError.retryAfter}s`, {
        url: config.url,
      });

      await new Promise(resolve => setTimeout(resolve, waitTime));

      return apiClient.request(config);
    }

    return Promise.reject(error);
  }
);

/**
 * Create a request that doesn't retry
 * Useful for requests that shouldn't be retried (e.g., payments)
 */
export function createNoRetryRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  return requestFn();
}

/**
 * Helper to cancel requests
 */
export function createCancelToken() {
  const controller = new AbortController();
  return {
    token: controller.signal,
    cancel: () => controller.abort(),
  };
}

export default apiClient;
