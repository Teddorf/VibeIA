/**
 * TwoFactorSetup Component Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorSetup } from '../TwoFactorSetup';
import { authApi } from '@/lib/api-client';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  authApi: {
    setup2FA: jest.fn(),
    verify2FA: jest.fn(),
    disable2FA: jest.fn(),
  },
}));

const mockSetupResponse = {
  secret: 'JBSWY3DPEHPK3PXP',
  qrCodeUrl: 'data:image/png;base64,mockQRCode',
  backupCodes: ['ABC123', 'DEF456', 'GHI789', 'JKL012', 'MNO345'],
};

describe('TwoFactorSetup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // INITIAL STATE TESTS
  describe('Initial State', () => {
    it('should render setup button when 2FA is not enabled', () => {
      // Arrange & Act
      render(<TwoFactorSetup isEnabled={false} />);

      // Assert
      expect(screen.getByRole('button', { name: /habilitar/i })).toBeInTheDocument();
    });

    it('should render disable button when 2FA is enabled', () => {
      // Arrange & Act
      render(<TwoFactorSetup isEnabled={true} />);

      // Assert
      expect(screen.getByRole('button', { name: /deshabilitar/i })).toBeInTheDocument();
    });

    it('should show 2FA status indicator', () => {
      // Arrange & Act
      render(<TwoFactorSetup isEnabled={true} />);

      // Assert
      expect(screen.getByTestId('2fa-status')).toHaveTextContent(/habilitado/i);
    });
  });

  // SETUP FLOW TESTS
  describe('Setup Flow', () => {
    it('should show loading state when initiating setup', async () => {
      // Arrange
      (authApi.setup2FA as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockSetupResponse), 100))
      );
      render(<TwoFactorSetup isEnabled={false} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));

      // Assert
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });

    it('should display QR code after setup initialization', async () => {
      // Arrange
      (authApi.setup2FA as jest.Mock).mockResolvedValue(mockSetupResponse);
      render(<TwoFactorSetup isEnabled={false} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('qr-code')).toBeInTheDocument();
      });
    });

    it('should display secret key for manual entry', async () => {
      // Arrange
      (authApi.setup2FA as jest.Mock).mockResolvedValue(mockSetupResponse);
      render(<TwoFactorSetup isEnabled={false} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('secret-key')).toHaveTextContent(mockSetupResponse.secret);
      });
    });

    it('should have copy button for secret key', async () => {
      // Arrange
      (authApi.setup2FA as jest.Mock).mockResolvedValue(mockSetupResponse);
      render(<TwoFactorSetup isEnabled={false} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /copiar/i })).toBeInTheDocument();
      });
    });

    it('should show verification code input', async () => {
      // Arrange
      (authApi.setup2FA as jest.Mock).mockResolvedValue(mockSetupResponse);
      render(<TwoFactorSetup isEnabled={false} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/código/i)).toBeInTheDocument();
      });
    });
  });

  // VERIFICATION TESTS
  describe('Verification', () => {
    it('should validate 6-digit code format', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.setup2FA as jest.Mock).mockResolvedValue(mockSetupResponse);
      render(<TwoFactorSetup isEnabled={false} />);

      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));
      await waitFor(() => screen.getByPlaceholderText(/código/i));

      // Act - type invalid code
      await user.type(screen.getByPlaceholderText(/código/i), 'abc');

      // Assert - verify button should be disabled
      expect(screen.getByRole('button', { name: /verificar/i })).toBeDisabled();
    });

    it('should enable verify button with valid 6-digit code', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.setup2FA as jest.Mock).mockResolvedValue(mockSetupResponse);
      render(<TwoFactorSetup isEnabled={false} />);

      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));
      await waitFor(() => screen.getByPlaceholderText(/código/i));

      // Act
      await user.type(screen.getByPlaceholderText(/código/i), '123456');

      // Assert
      expect(screen.getByRole('button', { name: /verificar/i })).not.toBeDisabled();
    });

    it('should call verify2FA on submit', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.setup2FA as jest.Mock).mockResolvedValue(mockSetupResponse);
      (authApi.verify2FA as jest.Mock).mockResolvedValue({ success: true });
      render(<TwoFactorSetup isEnabled={false} />);

      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));
      await waitFor(() => screen.getByPlaceholderText(/código/i));

      // Act
      await user.type(screen.getByPlaceholderText(/código/i), '123456');
      fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

      // Assert
      await waitFor(() => {
        expect(authApi.verify2FA).toHaveBeenCalledWith('123456', mockSetupResponse.secret);
      });
    });

    it('should show error on invalid verification code', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.setup2FA as jest.Mock).mockResolvedValue(mockSetupResponse);
      (authApi.verify2FA as jest.Mock).mockRejectedValue(new Error('Invalid code'));
      render(<TwoFactorSetup isEnabled={false} />);

      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));
      await waitFor(() => screen.getByPlaceholderText(/código/i));

      // Act
      await user.type(screen.getByPlaceholderText(/código/i), '123456');
      fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/inválido/i);
      });
    });

    it('should show backup codes after successful verification', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.setup2FA as jest.Mock).mockResolvedValue(mockSetupResponse);
      (authApi.verify2FA as jest.Mock).mockResolvedValue({ success: true });
      render(<TwoFactorSetup isEnabled={false} />);

      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));
      await waitFor(() => screen.getByPlaceholderText(/código/i));

      // Act
      await user.type(screen.getByPlaceholderText(/código/i), '123456');
      fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('backup-codes')).toBeInTheDocument();
        mockSetupResponse.backupCodes.forEach((code) => {
          expect(screen.getByText(code)).toBeInTheDocument();
        });
      });
    });
  });

  // DISABLE 2FA TESTS
  describe('Disable 2FA', () => {
    it('should show confirmation modal when clicking disable', async () => {
      // Arrange
      render(<TwoFactorSetup isEnabled={true} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /deshabilitar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
      });
    });

    it('should require password to disable 2FA', async () => {
      // Arrange
      render(<TwoFactorSetup isEnabled={true} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /deshabilitar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument();
      });
    });

    it('should call disable2FA with password', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.disable2FA as jest.Mock).mockResolvedValue({ success: true });
      const onDisabled = jest.fn();
      render(<TwoFactorSetup isEnabled={true} onDisabled={onDisabled} />);

      fireEvent.click(screen.getByRole('button', { name: /deshabilitar/i }));
      await waitFor(() => screen.getByPlaceholderText(/contraseña/i));

      // Act
      await user.type(screen.getByPlaceholderText(/contraseña/i), 'mypassword');
      fireEvent.click(screen.getByRole('button', { name: /confirmar/i }));

      // Assert
      await waitFor(() => {
        expect(authApi.disable2FA).toHaveBeenCalledWith('mypassword');
        expect(onDisabled).toHaveBeenCalled();
      });
    });

    it('should close modal on cancel', async () => {
      // Arrange
      render(<TwoFactorSetup isEnabled={true} />);

      fireEvent.click(screen.getByRole('button', { name: /deshabilitar/i }));
      await waitFor(() => screen.getByTestId('confirm-modal'));

      // Act
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
      });
    });
  });

  // CALLBACK TESTS
  describe('Callbacks', () => {
    it('should call onEnabled after successful setup', async () => {
      // Arrange
      const user = userEvent.setup();
      const onEnabled = jest.fn();
      (authApi.setup2FA as jest.Mock).mockResolvedValue(mockSetupResponse);
      (authApi.verify2FA as jest.Mock).mockResolvedValue({ success: true });
      render(<TwoFactorSetup isEnabled={false} onEnabled={onEnabled} />);

      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));
      await waitFor(() => screen.getByPlaceholderText(/código/i));

      // Act
      await user.type(screen.getByPlaceholderText(/código/i), '123456');
      fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

      // Assert
      await waitFor(() => {
        expect(onEnabled).toHaveBeenCalled();
      });
    });
  });

  // ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      // Arrange & Act
      render(<TwoFactorSetup isEnabled={false} />);

      // Assert
      expect(screen.getByRole('button', { name: /habilitar/i })).toHaveAccessibleName();
    });

    it('should focus verification input after QR code is shown', async () => {
      // Arrange
      (authApi.setup2FA as jest.Mock).mockResolvedValue(mockSetupResponse);
      render(<TwoFactorSetup isEnabled={false} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /habilitar/i }));

      // Assert
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/código/i);
        expect(document.activeElement).toBe(input);
      });
    });
  });
});
