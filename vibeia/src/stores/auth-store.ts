'use client';

import { create } from 'zustand';
import apiClient from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
}

interface AuthStore {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  accessToken: typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  isAuthenticated: false,
  isLoading: true,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setAccessToken: (token) => {
    if (token) {
      localStorage.setItem('accessToken', token);
    } else {
      localStorage.removeItem('accessToken');
    }
    set({ accessToken: token });
  },

  login: async (email, password) => {
    const { data } = await apiClient.post('/api/auth/login', {
      email,
      password,
    });
    localStorage.setItem('accessToken', data.accessToken);
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    set({
      user: data.user,
      accessToken: data.accessToken,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, accessToken: null, isAuthenticated: false });
  },

  fetchMe: async () => {
    try {
      set({ isLoading: true });
      const { data } = await apiClient.get('/api/auth/me');
      set({ user: data, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
