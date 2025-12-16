/**
 * OAuthConnectionCard Component Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import OAuthConnectionCard from '../OAuthConnectionCard';

// Mock icons
jest.mock('lucide-react', () => ({
  Github: () => <svg data-testid="github-icon" />,
  Loader2: () => <svg data-testid="loader-icon" />,
  CheckCircle2: () => <svg data-testid="check-icon" />,
  XCircle: () => <svg data-testid="x-icon" />,
}));

describe('OAuthConnectionCard', () => {
  const defaultProps = {
    provider: 'github' as const,
    title: 'GitHub',
    description: 'Connect your GitHub account',
    onConnect: jest.fn(),
    onDisconnect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render provider title and description', () => {
      render(<OAuthConnectionCard {...defaultProps} />);

      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Connect your GitHub account')).toBeInTheDocument();
    });

    it('should render provider icon', () => {
      render(<OAuthConnectionCard {...defaultProps} />);

      expect(screen.getByTestId('github-icon')).toBeInTheDocument();
    });

    it('should render custom icon when provided', () => {
      const CustomIcon = () => <svg data-testid="custom-icon" />;
      render(<OAuthConnectionCard {...defaultProps} icon={<CustomIcon />} />);

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });

  describe('Disconnected State', () => {
    it('should show connect button when not connected', () => {
      render(<OAuthConnectionCard {...defaultProps} connected={false} />);

      expect(screen.getByRole('button', { name: /connect/i })).toBeInTheDocument();
    });

    it('should call onConnect when connect button is clicked', async () => {
      const user = userEvent.setup();
      render(<OAuthConnectionCard {...defaultProps} connected={false} />);

      await user.click(screen.getByRole('button', { name: /connect/i }));

      expect(defaultProps.onConnect).toHaveBeenCalledTimes(1);
    });

    it('should show "Not connected" status when disconnected', () => {
      render(<OAuthConnectionCard {...defaultProps} connected={false} />);

      expect(screen.getByText(/not connected/i)).toBeInTheDocument();
    });
  });

  describe('Connected State', () => {
    const connectedProps = {
      ...defaultProps,
      connected: true,
      userInfo: {
        name: 'testuser',
        email: 'test@example.com',
      },
    };

    it('should show disconnect button when connected', () => {
      render(<OAuthConnectionCard {...connectedProps} />);

      expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument();
    });

    it('should show user info when connected', () => {
      render(<OAuthConnectionCard {...connectedProps} />);

      // User info is shown in parentheses
      expect(screen.getByText(/testuser/)).toBeInTheDocument();
    });

    it('should show connected status indicator', () => {
      render(<OAuthConnectionCard {...connectedProps} />);

      expect(screen.getByText(/connected/i)).toBeInTheDocument();
      expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    });

    it('should call onDisconnect when disconnect button is clicked', async () => {
      const user = userEvent.setup();
      render(<OAuthConnectionCard {...connectedProps} />);

      await user.click(screen.getByRole('button', { name: /disconnect/i }));

      expect(connectedProps.onDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when isLoading is true', () => {
      render(<OAuthConnectionCard {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('should disable buttons when loading', () => {
      render(<OAuthConnectionCard {...defaultProps} isLoading={true} connected={false} />);

      expect(screen.getByRole('button', { name: /connect/i })).toBeDisabled();
    });

    it('should show loading text instead of connect/disconnect', () => {
      render(<OAuthConnectionCard {...defaultProps} isLoading={true} connected={false} />);

      // Multiple "Connecting..." texts are shown (status and button)
      const connectingElements = screen.getAllByText(/connecting/i);
      expect(connectingElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      render(<OAuthConnectionCard {...defaultProps} error="Connection failed" />);

      expect(screen.getByText('Connection failed')).toBeInTheDocument();
    });

    it('should show error styling', () => {
      render(<OAuthConnectionCard {...defaultProps} error="Connection failed" />);

      const errorElement = screen.getByText('Connection failed');
      expect(errorElement).toHaveClass('text-red-400');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<OAuthConnectionCard {...defaultProps} connected={false} />);

      const button = screen.getByRole('button', { name: /connect github/i });
      expect(button).toBeInTheDocument();
    });

    it('should have proper aria-label for status', () => {
      render(<OAuthConnectionCard {...defaultProps} connected={true} userInfo={{ name: 'testuser' }} />);

      expect(screen.getByLabelText(/github connection status/i)).toBeInTheDocument();
    });
  });

  describe('Provider Variants', () => {
    it('should render Google provider styling', () => {
      render(
        <OAuthConnectionCard
          {...defaultProps}
          provider="google"
          title="Google"
          description="Connect your Google account"
        />
      );

      expect(screen.getByText('Google')).toBeInTheDocument();
    });

    it('should render GitLab provider styling', () => {
      render(
        <OAuthConnectionCard
          {...defaultProps}
          provider="gitlab"
          title="GitLab"
          description="Connect your GitLab account"
        />
      );

      expect(screen.getByText('GitLab')).toBeInTheDocument();
    });
  });
});
