'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '@/lib/api-client';

import { z } from 'zod';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
});

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const accessToken = localStorage.getItem(AUTH_TOKEN_KEY);
        const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
        const userStr = localStorage.getItem(USER_KEY);

        if (accessToken && userStr) {
          try {
            const rawUser = JSON.parse(userStr);
            const validation = UserSchema.safeParse(rawUser);

            if (!validation.success) {
              console.error('Invalid user data in localStorage', validation.error);
              clearAuthState();
              return;
            }

            const user = validation.data;
            setState({
              user,
              accessToken,
              refreshToken,
              isAuthenticated: true,
              isLoading: false,
            });

            // Verify token is still valid
            try {
              const response = await apiClient.get('/api/auth/me');
              setState(prev => ({
                ...prev,
                user: response.data,
                isLoading: false,
              }));
            } catch {
              // Token expired, try to refresh
              if (refreshToken) {
                const refreshed = await refreshAuth();
                if (!refreshed) {
                  clearAuthState();
                }
              } else {
                clearAuthState();
              }
            }
          } catch (error) {
            console.error('Error parsing user data', error);
            clearAuthState();
          }
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } catch {
        clearAuthState();
      }
    };

    initAuth();
  }, []);

  const clearAuthState = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  const saveAuthState = (accessToken: string, refreshToken: string, user: User) => {
    localStorage.setItem(AUTH_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setState({
      user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/api/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data;
    saveAuthState(accessToken, refreshToken, user);
  };

  const register = async (email: string, password: string, name: string) => {
    const response = await apiClient.post('/api/auth/register', { email, password, name });
    const { accessToken, refreshToken, user } = response.data;
    saveAuthState(accessToken, refreshToken, user);
  };

  const logout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Ignore error, still clear local state
    }
    clearAuthState();
  };

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      const userStr = localStorage.getItem(USER_KEY);

      if (!refreshToken || !userStr) {
        return false;
      }

      const rawUser = JSON.parse(userStr);
      const validation = UserSchema.safeParse(rawUser);

      if (!validation.success) {
        throw new Error('Invalid user data');
      }

      const user = validation.data;
      const response = await apiClient.post('/api/auth/refresh', {
        userId: user.id,
        refreshToken,
      });

      const { accessToken: newAccessToken, refreshToken: newRefreshToken, user: newUser } = response.data;
      saveAuthState(newAccessToken, newRefreshToken, newUser);
      return true;
    } catch {
      clearAuthState();
      return false;
    }
  }, []);

  // Setup axios interceptor for token refresh
  useEffect(() => {
    const interceptor = apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          const refreshed = await refreshAuth();
          if (refreshed) {
            const newToken = localStorage.getItem(AUTH_TOKEN_KEY);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      apiClient.interceptors.response.eject(interceptor);
    };
  }, [refreshAuth]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRequireAuth() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      window.location.href = '/login';
    }
  }, [auth.isLoading, auth.isAuthenticated]);

  return auth;
}
