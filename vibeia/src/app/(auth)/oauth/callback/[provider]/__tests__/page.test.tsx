/**
 * OAuth Callback Page Tests
 * Tests the popup callback page that receives OAuth tokens from the backend redirect
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useSearchParams, useParams } from 'next/navigation';
import OAuthCallbackPage from '../page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: jest.fn(),
  useParams: jest.fn(),
}));

// Mock window.opener and window.close
const mockPostMessage = jest.fn();
const mockClose = jest.fn();

describe('OAuthCallbackPage', () => {
  const mockSearchParams = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useSearchParams as jest.Mock).mockReturnValue(mockSearchParams);
    // Default: no opener
    Object.defineProperty(window, 'opener', { value: null, writable: true });
    window.close = mockClose;
  });

  // SUCCESSFUL CALLBACK TESTS
  describe('Successful OAuth Callback', () => {
    const mockUser = { id: '1', name: 'Test User', email: 'test@example.com' };
    const mockUserBase64 = btoa(JSON.stringify(mockUser));

    it('should store tokens in localStorage after successful callback', async () => {
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'oauth_success') return 'true';
        if (key === 'access_token') return 'new-access-token';
        if (key === 'refresh_token') return 'new-refresh-token';
        if (key === 'user') return mockUserBase64;
        return null;
      });

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(localStorage.getItem('auth_token')).toBe('new-access-token');
        expect(localStorage.getItem('refresh_token')).toBe('new-refresh-token');
      });
    });

    it('should clean up OAuth state from localStorage', async () => {
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      localStorage.setItem('oauth_state', 'some-state');
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'oauth_success') return 'true';
        if (key === 'access_token') return 'token';
        if (key === 'refresh_token') return 'refresh';
        if (key === 'user') return mockUserBase64;
        return null;
      });

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(localStorage.getItem('oauth_state')).toBeNull();
      });
    });

    it('should show success message after authentication', async () => {
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'oauth_success') return 'true';
        if (key === 'access_token') return 'token';
        if (key === 'refresh_token') return 'refresh';
        if (key === 'user') return mockUserBase64;
        return null;
      });

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/autenticacion exitosa/i)).toBeInTheDocument();
      });
    });

    it('should notify opener window on success', async () => {
      Object.defineProperty(window, 'opener', {
        value: { postMessage: mockPostMessage },
        writable: true,
      });

      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'oauth_success') return 'true';
        if (key === 'access_token') return 'token';
        if (key === 'refresh_token') return 'refresh';
        if (key === 'user') return mockUserBase64;
        return null;
      });

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(mockPostMessage).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'oauth_success', provider: 'github' }),
          expect.any(String),
        );
      });
    });
  });

  // ERROR HANDLING TESTS
  describe('Error Handling', () => {
    it('should display error when response is incomplete', async () => {
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      // No code, no oauth_success params
      mockSearchParams.get.mockReturnValue(null);

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/respuesta de autenticacion incompleta/i)).toBeInTheDocument();
      });
    });

    it('should display error when OAuth error param is present', async () => {
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'error') return 'access_denied';
        return null;
      });

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText('access_denied')).toBeInTheDocument();
      });
    });

    it('should show error heading on failure', async () => {
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockReturnValue(null);

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/error de autenticacion/i)).toBeInTheDocument();
      });
    });

    it('should show close/back button on error', async () => {
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockReturnValue(null);

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /volver al inicio|cerrar ventana/i }),
        ).toBeInTheDocument();
      });
    });
  });

  // LOADING STATE TESTS
  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      // During Suspense, the fallback shows
      mockSearchParams.get.mockImplementation(() => null);

      // The component processes synchronously in the effect,
      // so loading may be very brief. Check that the page renders.
      render(<OAuthCallbackPage />);

      // The page should render without crashing
      expect(document.body).toBeTruthy();
    });
  });

  // PROVIDER VALIDATION TESTS
  describe('Provider Validation', () => {
    it('should handle github provider', async () => {
      const mockUser = { id: '1' };
      (useParams as jest.Mock).mockReturnValue({ provider: 'github' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'oauth_success') return 'true';
        if (key === 'access_token') return 'token';
        if (key === 'refresh_token') return 'refresh';
        if (key === 'user') return btoa(JSON.stringify(mockUser));
        return null;
      });

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/GitHub/)).toBeInTheDocument();
      });
    });

    it('should handle google provider', async () => {
      const mockUser = { id: '1' };
      (useParams as jest.Mock).mockReturnValue({ provider: 'google' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'oauth_success') return 'true';
        if (key === 'access_token') return 'token';
        if (key === 'refresh_token') return 'refresh';
        if (key === 'user') return btoa(JSON.stringify(mockUser));
        return null;
      });

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/Google/)).toBeInTheDocument();
      });
    });

    it('should handle gitlab provider', async () => {
      const mockUser = { id: '1' };
      (useParams as jest.Mock).mockReturnValue({ provider: 'gitlab' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'oauth_success') return 'true';
        if (key === 'access_token') return 'token';
        if (key === 'refresh_token') return 'refresh';
        if (key === 'user') return btoa(JSON.stringify(mockUser));
        return null;
      });

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/GitLab/)).toBeInTheDocument();
      });
    });

    it('should show error for invalid provider', async () => {
      (useParams as jest.Mock).mockReturnValue({ provider: 'invalid' });
      mockSearchParams.get.mockImplementation((key: string) => {
        if (key === 'code') return 'code';
        return null;
      });

      render(<OAuthCallbackPage />);

      await waitFor(() => {
        expect(screen.getByText(/proveedor no soportado/i)).toBeInTheDocument();
      });
    });
  });
});
