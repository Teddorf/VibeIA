/**
 * OAuth Callback Page Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import OAuthCallbackPage from '../page';
import { authApi } from '@/lib/api-client';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  useParams: jest.fn(),
}));

// Mock auth API
jest.mock('@/lib/api-client', () => ({
  authApi: {
    oauthCallback: jest.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('OAuthCallbackPage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };

  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
  });

  // SUCCESSFUL CALLBACK TESTS
  describe('Successful OAuth Callback', () => {
    it('should exchange code for tokens on mount', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'valid-oauth-code';
        if (key === 'state') return 'stored-state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('stored-state');
      (authApi.oauthCallback as jest.Mock).mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        isNewUser: false,
      });

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(authApi.oauthCallback).toHaveBeenCalledWith('github', 'valid-oauth-code');
      });
    });

    it('should store tokens in localStorage after successful callback', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'valid-oauth-code';
        if (key === 'state') return 'stored-state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('stored-state');
      (authApi.oauthCallback as jest.Mock).mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        isNewUser: false,
      });

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth_token', 'new-access-token');
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith('refresh_token', 'new-refresh-token');
      });
    });

    it('should redirect to dashboard for existing users', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'google' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'valid-code';
        if (key === 'state') return 'stored-state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('stored-state');
      (authApi.oauthCallback as jest.Mock).mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: '1', name: 'Existing User' },
        isNewUser: false,
      });

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should redirect to onboarding for new users', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'valid-code';
        if (key === 'state') return 'stored-state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('stored-state');
      (authApi.oauthCallback as jest.Mock).mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: '1', name: 'New User' },
        isNewUser: true,
      });

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should clean up OAuth state from localStorage', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'valid-code';
        if (key === 'state') return 'stored-state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('stored-state');
      (authApi.oauthCallback as jest.Mock).mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: { id: '1' },
        isNewUser: false,
      });

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('oauth_state');
      });
    });
  });

  // ERROR HANDLING TESTS
  describe('Error Handling', () => {
    it('should display error when code is missing', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockReturnValue(null);

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/código de autorización no encontrado/i)).toBeInTheDocument();
      });
    });

    it('should display error when state mismatch (CSRF protection)', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'valid-code';
        if (key === 'state') return 'url-state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('different-stored-state');

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/error de seguridad/i)).toBeInTheDocument();
      });
    });

    it('should display error when OAuth callback fails', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'invalid-code';
        if (key === 'state') return 'stored-state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('stored-state');
      (authApi.oauthCallback as jest.Mock).mockRejectedValue(new Error('Invalid code'));

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/error de autenticación/i)).toBeInTheDocument();
      });
    });

    it('should display error when user cancels OAuth', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'error') return 'access_denied';
        if (key === 'error_description') return 'User cancelled';
        return null;
      });

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/autenticación cancelada/i)).toBeInTheDocument();
      });
    });

    it('should show retry button on error', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockReturnValue(null);

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /intentar de nuevo/i })).toBeInTheDocument();
      });
    });

    it('should redirect to login when retry is clicked', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockReturnValue(null);

      // Act
      render(<OAuthCallbackPage />);
      const retryButton = await screen.findByRole('button', { name: /intentar de nuevo/i });
      retryButton.click();

      // Assert
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  // LOADING STATE TESTS
  describe('Loading State', () => {
    it('should show loading spinner while processing', () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'valid-code';
        if (key === 'state') return 'stored-state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('stored-state');
      (authApi.oauthCallback as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      expect(screen.getByTestId('oauth-loading')).toBeInTheDocument();
      expect(screen.getByText(/verificando autenticación/i)).toBeInTheDocument();
    });

    it('should show provider name in loading message', () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'google' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'valid-code';
        if (key === 'state') return 'stored-state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('stored-state');
      (authApi.oauthCallback as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      expect(screen.getByText(/google/i)).toBeInTheDocument();
    });
  });

  // PROVIDER VALIDATION TESTS
  describe('Provider Validation', () => {
    it('should handle github provider', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'code';
        if (key === 'state') return 'state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('state');
      (authApi.oauthCallback as jest.Mock).mockResolvedValue({
        accessToken: 'token',
        user: { id: '1' },
        isNewUser: false,
      });

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(authApi.oauthCallback).toHaveBeenCalledWith('github', 'code');
      });
    });

    it('should handle google provider', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'google' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'code';
        if (key === 'state') return 'state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('state');
      (authApi.oauthCallback as jest.Mock).mockResolvedValue({
        accessToken: 'token',
        user: { id: '1' },
        isNewUser: false,
      });

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(authApi.oauthCallback).toHaveBeenCalledWith('google', 'code');
      });
    });

    it('should handle gitlab provider', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'gitlab' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'code';
        if (key === 'state') return 'state';
        return null;
      });
      mockLocalStorage.getItem.mockReturnValue('state');
      (authApi.oauthCallback as jest.Mock).mockResolvedValue({
        accessToken: 'token',
        user: { id: '1' },
        isNewUser: false,
      });

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(authApi.oauthCallback).toHaveBeenCalledWith('gitlab', 'code');
      });
    });

    it('should show error for invalid provider', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ provider: 'invalid' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'code';
        if (key === 'state') return 'state';
        return null;
      });

      // Act
      render(<OAuthCallbackPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/proveedor no soportado/i)).toBeInTheDocument();
      });
    });
  });
});
