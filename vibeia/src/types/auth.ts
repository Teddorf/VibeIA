export interface User {
  id: string;
  _id?: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  updatedAt?: string;
  hasLLMConfigured?: boolean;
  githubId?: string;
  googleId?: string;
  gitlabId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  user: User;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  email: string;
  password: string;
  name: string;
}
