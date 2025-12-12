/**
 * Email Verification Page Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useParams } from 'next/navigation';
import VerifyEmailPage from '../page';
import { authApi } from '@/lib/api-client';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useParams: jest.fn(),
}));

// Mock auth API
jest.mock('@/lib/api-client', () => ({
  authApi: {
    verifyEmail: jest.fn(),
  },
}));

describe('VerifyEmailPage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  // SUCCESSFUL VERIFICATION TESTS
  describe('Successful Verification', () => {
    it('should verify email on mount with valid token', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'valid-token-123' });
      (authApi.verifyEmail as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Email verified successfully',
      });

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(authApi.verifyEmail).toHaveBeenCalledWith('valid-token-123');
      });
    });

    it('should show success message after verification', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'valid-token' });
      (authApi.verifyEmail as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Email verified',
      });

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/email verificado/i)).toBeInTheDocument();
        expect(screen.getByTestId('success-icon')).toBeInTheDocument();
      });
    });

    it('should show login link after successful verification', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'valid-token' });
      (authApi.verifyEmail as jest.Mock).mockResolvedValue({ success: true });

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('link', { name: /iniciar sesión/i })).toBeInTheDocument();
      });
    });

    it('should auto-redirect to login after 5 seconds', async () => {
      // Arrange
      jest.useFakeTimers();
      (useParams as jest.Mock).mockReturnValue({ token: 'valid-token' });
      (authApi.verifyEmail as jest.Mock).mockResolvedValue({ success: true });

      // Act
      render(<VerifyEmailPage />);
      await waitFor(() => screen.getByText(/email verificado/i));

      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);

      // Assert
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/login');
      });

      jest.useRealTimers();
    });

    it('should show countdown timer', async () => {
      // Arrange
      jest.useFakeTimers();
      (useParams as jest.Mock).mockReturnValue({ token: 'valid-token' });
      (authApi.verifyEmail as jest.Mock).mockResolvedValue({ success: true });

      // Act
      render(<VerifyEmailPage />);
      await waitFor(() => screen.getByText(/email verificado/i));

      // Assert
      expect(screen.getByText(/redirigiendo en 5/i)).toBeInTheDocument();

      jest.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(screen.getByText(/redirigiendo en 4/i)).toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  // ERROR HANDLING TESTS
  describe('Error Handling', () => {
    it('should show error for invalid token', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'invalid-token' });
      (authApi.verifyEmail as jest.Mock).mockRejectedValue({
        response: {
          status: 400,
          data: { message: 'Invalid or expired token' },
        },
      });

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/token inválido o expirado/i)).toBeInTheDocument();
        expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      });
    });

    it('should show error for expired token', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'expired-token' });
      (authApi.verifyEmail as jest.Mock).mockRejectedValue({
        response: {
          status: 410,
          data: { message: 'Token expired' },
        },
      });

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/enlace ha expirado/i)).toBeInTheDocument();
      });
    });

    it('should show error for already verified email', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'used-token' });
      (authApi.verifyEmail as jest.Mock).mockRejectedValue({
        response: {
          status: 409,
          data: { message: 'Email already verified' },
        },
      });

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/email ya verificado/i)).toBeInTheDocument();
      });
    });

    it('should show resend verification option on error', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'invalid-token' });
      (authApi.verifyEmail as jest.Mock).mockRejectedValue({
        response: { status: 400 },
      });

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reenviar email/i })).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'token' });
      (authApi.verifyEmail as jest.Mock).mockRejectedValue(new Error('Network error'));

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/error de conexión/i)).toBeInTheDocument();
      });
    });
  });

  // LOADING STATE TESTS
  describe('Loading State', () => {
    it('should show loading state while verifying', () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'token' });
      (authApi.verifyEmail as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      // Act
      render(<VerifyEmailPage />);

      // Assert
      expect(screen.getByTestId('verification-loading')).toBeInTheDocument();
      expect(screen.getByText(/verificando/i)).toBeInTheDocument();
    });

    it('should show spinner during verification', () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'token' });
      (authApi.verifyEmail as jest.Mock).mockImplementation(
        () => new Promise(() => {})
      );

      // Act
      render(<VerifyEmailPage />);

      // Assert
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  // TOKEN VALIDATION TESTS
  describe('Token Validation', () => {
    it('should handle empty token', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: '' });

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/token no proporcionado/i)).toBeInTheDocument();
      });
      expect(authApi.verifyEmail).not.toHaveBeenCalled();
    });

    it('should handle malformed token', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: '<script>alert(1)</script>' });

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/token inválido/i)).toBeInTheDocument();
      });
    });
  });

  // RESEND VERIFICATION TESTS
  describe('Resend Verification', () => {
    it('should show email input for resend', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'invalid' });
      (authApi.verifyEmail as jest.Mock).mockRejectedValue({ response: { status: 400 } });

      // Act
      render(<VerifyEmailPage />);
      await waitFor(() => screen.getByRole('button', { name: /reenviar/i }));
      screen.getByRole('button', { name: /reenviar/i }).click();

      // Assert
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      });
    });
  });

  // ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'token' });
      (authApi.verifyEmail as jest.Mock).mockResolvedValue({ success: true });

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      });
    });

    it('should announce verification result to screen readers', async () => {
      // Arrange
      (useParams as jest.Mock).mockReturnValue({ token: 'token' });
      (authApi.verifyEmail as jest.Mock).mockResolvedValue({ success: true });

      // Act
      render(<VerifyEmailPage />);

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('status')).toBeInTheDocument();
      });
    });
  });
});
