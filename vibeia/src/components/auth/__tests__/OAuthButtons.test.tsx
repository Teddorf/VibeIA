/**
 * OAuthButtons Component Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OAuthButtons } from '../OAuthButtons';

// Mock window.open for OAuth popup
const mockWindowOpen = jest.fn();
const originalWindowOpen = window.open;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

describe('OAuthButtons', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.open = mockWindowOpen;
    Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });
  });

  afterAll(() => {
    window.open = originalWindowOpen;
  });

  // RENDERING TESTS
  describe('Rendering', () => {
    it('should render all three OAuth provider buttons', () => {
      // Arrange & Act
      render(<OAuthButtons />);

      // Assert
      expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /gitlab/i })).toBeInTheDocument();
    });

    it('should render divider with "or continue with" text', () => {
      // Arrange & Act
      render(<OAuthButtons />);

      // Assert
      expect(screen.getByText(/o continúa con/i)).toBeInTheDocument();
    });

    it('should render provider icons', () => {
      // Arrange & Act
      render(<OAuthButtons />);

      // Assert
      expect(screen.getByTestId('github-icon')).toBeInTheDocument();
      expect(screen.getByTestId('google-icon')).toBeInTheDocument();
      expect(screen.getByTestId('gitlab-icon')).toBeInTheDocument();
    });

    it('should render in compact mode when variant is compact', () => {
      // Arrange & Act
      render(<OAuthButtons variant="compact" />);

      // Assert - compact shows only icons, no text
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveClass('p-2');
      });
    });

    it('should render in full mode by default', () => {
      // Arrange & Act
      render(<OAuthButtons />);

      // Assert - full mode shows text
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Google')).toBeInTheDocument();
      expect(screen.getByText('GitLab')).toBeInTheDocument();
    });
  });

  // INTERACTION TESTS
  describe('Interactions', () => {
    it('should call onOAuthStart when GitHub button is clicked', async () => {
      // Arrange
      const onOAuthStart = jest.fn();
      render(<OAuthButtons onOAuthStart={onOAuthStart} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /github/i }));

      // Assert
      expect(onOAuthStart).toHaveBeenCalledWith('github');
    });

    it('should call onOAuthStart when Google button is clicked', async () => {
      // Arrange
      const onOAuthStart = jest.fn();
      render(<OAuthButtons onOAuthStart={onOAuthStart} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /google/i }));

      // Assert
      expect(onOAuthStart).toHaveBeenCalledWith('google');
    });

    it('should call onOAuthStart when GitLab button is clicked', async () => {
      // Arrange
      const onOAuthStart = jest.fn();
      render(<OAuthButtons onOAuthStart={onOAuthStart} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /gitlab/i }));

      // Assert
      expect(onOAuthStart).toHaveBeenCalledWith('gitlab');
    });

    it('should store OAuth state in localStorage before redirect', async () => {
      // Arrange
      render(<OAuthButtons />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /github/i }));

      // Assert
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'oauth_state',
        expect.any(String)
      );
    });

    it('should open OAuth URL in popup window', async () => {
      // Arrange
      mockWindowOpen.mockReturnValue({ closed: false });
      render(<OAuthButtons />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /github/i }));

      // Assert
      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          expect.stringContaining('github'),
          'oauth-popup',
          expect.any(String)
        );
      });
    });
  });

  // LOADING STATE TESTS
  describe('Loading States', () => {
    it('should show loading state when OAuth is in progress', () => {
      // Arrange & Act
      render(<OAuthButtons isLoading={true} loadingProvider="github" />);

      // Assert
      expect(screen.getByRole('button', { name: /github/i })).toBeDisabled();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should disable all buttons when any OAuth is in progress', () => {
      // Arrange & Act
      render(<OAuthButtons isLoading={true} loadingProvider="github" />);

      // Assert
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should show loading spinner only on the active provider button', () => {
      // Arrange & Act
      render(<OAuthButtons isLoading={true} loadingProvider="google" />);

      // Assert
      const googleButton = screen.getByRole('button', { name: /google/i });
      expect(googleButton.querySelector('[data-testid="loading-spinner"]')).toBeInTheDocument();
    });
  });

  // ERROR STATE TESTS
  describe('Error States', () => {
    it('should display error message when OAuth fails', () => {
      // Arrange & Act
      render(<OAuthButtons error="OAuth authentication failed" />);

      // Assert
      expect(screen.getByText('OAuth authentication failed')).toBeInTheDocument();
    });

    it('should call onError callback when popup is blocked', async () => {
      // Arrange
      mockWindowOpen.mockReturnValue(null); // Popup blocked
      const onError = jest.fn();
      render(<OAuthButtons onError={onError} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /github/i }));

      // Assert
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith('popup_blocked');
      });
    });
  });

  // ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have accessible names for all buttons', () => {
      // Arrange & Act
      render(<OAuthButtons />);

      // Assert
      expect(screen.getByRole('button', { name: /continuar con github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuar con google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /continuar con gitlab/i })).toBeInTheDocument();
    });

    it('should have proper aria-disabled when loading', () => {
      // Arrange & Act
      render(<OAuthButtons isLoading={true} loadingProvider="github" />);

      // Assert
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-disabled', 'true');
      });
    });
  });

  // CONFIGURATION TESTS
  describe('Configuration', () => {
    it('should only render enabled providers', () => {
      // Arrange & Act
      render(<OAuthButtons enabledProviders={['github', 'google']} />);

      // Assert
      expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /gitlab/i })).not.toBeInTheDocument();
    });

    it('should use custom redirect URI when provided', async () => {
      // Arrange
      const customRedirectUri = 'https://example.com/callback';
      render(<OAuthButtons redirectUri={customRedirectUri} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /github/i }));

      // Assert
      await waitFor(() => {
        expect(mockWindowOpen).toHaveBeenCalledWith(
          expect.stringContaining(encodeURIComponent(customRedirectUri)),
          expect.any(String),
          expect.any(String)
        );
      });
    });
  });
});
