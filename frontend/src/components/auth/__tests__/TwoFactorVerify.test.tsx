/**
 * TwoFactorVerify Component Tests
 * TDD: Tests written BEFORE implementation
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TwoFactorVerify } from '../TwoFactorVerify';
import { authApi } from '@/lib/api-client';

// Mock API client
jest.mock('@/lib/api-client', () => ({
  authApi: {
    validate2FACode: jest.fn(),
  },
}));

describe('TwoFactorVerify', () => {
  const mockOnSuccess = jest.fn();
  const mockOnCancel = jest.fn();
  const mockOnUseBackupCode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // RENDERING TESTS
  describe('Rendering', () => {
    it('should render verification form', () => {
      // Arrange & Act
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Assert
      expect(screen.getByTestId('2fa-verify-form')).toBeInTheDocument();
    });

    it('should render 6 digit input fields', () => {
      // Arrange & Act
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Assert
      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(6);
    });

    it('should render title and description', () => {
      // Arrange & Act
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Assert
      expect(screen.getByText(/verificación/i)).toBeInTheDocument();
      expect(screen.getByText(/ingresa el código/i)).toBeInTheDocument();
    });

    it('should render verify button', () => {
      // Arrange & Act
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Assert
      expect(screen.getByRole('button', { name: /verificar/i })).toBeInTheDocument();
    });

    it('should render cancel button when onCancel provided', () => {
      // Arrange & Act
      render(<TwoFactorVerify onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Assert
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument();
    });

    it('should render backup code option', () => {
      // Arrange & Act
      render(<TwoFactorVerify onSuccess={mockOnSuccess} onUseBackupCode={mockOnUseBackupCode} />);

      // Assert
      expect(screen.getByText(/código de respaldo/i)).toBeInTheDocument();
    });
  });

  // INPUT BEHAVIOR TESTS
  describe('Input Behavior', () => {
    it('should auto-focus first input on mount', () => {
      // Arrange & Act
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Assert
      const inputs = screen.getAllByRole('textbox');
      expect(document.activeElement).toBe(inputs[0]);
    });

    it('should move focus to next input after entering a digit', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act
      const inputs = screen.getAllByRole('textbox');
      await user.type(inputs[0], '1');

      // Assert
      expect(document.activeElement).toBe(inputs[1]);
    });

    it('should only accept single digit per input', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act
      const inputs = screen.getAllByRole('textbox');
      await user.type(inputs[0], '123');

      // Assert
      expect(inputs[0]).toHaveValue('1');
    });

    it('should only accept numeric input', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act
      const inputs = screen.getAllByRole('textbox');
      await user.type(inputs[0], 'abc');

      // Assert
      expect(inputs[0]).toHaveValue('');
    });

    it('should handle backspace to clear and move back', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act - type 1, which fills inputs[0] and moves focus to inputs[1]
      const inputs = screen.getAllByRole('textbox');
      await user.type(inputs[0], '1');
      // Now inputs[1] is focused and empty
      // Backspace on empty input should move back to inputs[0] and clear it
      await user.keyboard('{Backspace}');

      // Assert - should have moved back and cleared inputs[0]
      expect(inputs[0]).toHaveValue('');
      expect(document.activeElement).toBe(inputs[0]);
    });

    it('should handle paste of full code', async () => {
      // Arrange
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act
      const inputs = screen.getAllByRole('textbox');
      fireEvent.paste(inputs[0], {
        clipboardData: { getData: () => '123456' },
      });

      // Assert
      await waitFor(() => {
        expect(inputs[0]).toHaveValue('1');
        expect(inputs[1]).toHaveValue('2');
        expect(inputs[2]).toHaveValue('3');
        expect(inputs[3]).toHaveValue('4');
        expect(inputs[4]).toHaveValue('5');
        expect(inputs[5]).toHaveValue('6');
      });
    });
  });

  // VERIFICATION TESTS
  describe('Verification', () => {
    it('should disable verify button when code is incomplete', () => {
      // Arrange & Act
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Assert
      expect(screen.getByRole('button', { name: /verificar/i })).toBeDisabled();
    });

    it('should enable verify button when code is complete', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act
      const inputs = screen.getAllByRole('textbox');
      await user.type(inputs[0], '1');
      await user.type(inputs[1], '2');
      await user.type(inputs[2], '3');
      await user.type(inputs[3], '4');
      await user.type(inputs[4], '5');
      await user.type(inputs[5], '6');

      // Assert
      expect(screen.getByRole('button', { name: /verificar/i })).not.toBeDisabled();
    });

    it('should call validate2FACode on submit', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.validate2FACode as jest.Mock).mockResolvedValue({ success: true });
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act
      const inputs = screen.getAllByRole('textbox');
      for (let i = 0; i < 6; i++) {
        await user.type(inputs[i], String(i + 1));
      }
      fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

      // Assert
      await waitFor(() => {
        expect(authApi.validate2FACode).toHaveBeenCalledWith('123456');
      });
    });

    it('should call onSuccess after successful verification', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.validate2FACode as jest.Mock).mockResolvedValue({ success: true });
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act
      const inputs = screen.getAllByRole('textbox');
      for (let i = 0; i < 6; i++) {
        await user.type(inputs[i], String(i + 1));
      }
      fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

      // Assert
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should show error on invalid code', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.validate2FACode as jest.Mock).mockRejectedValue(new Error('Invalid code'));
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act
      const inputs = screen.getAllByRole('textbox');
      for (let i = 0; i < 6; i++) {
        await user.type(inputs[i], String(i + 1));
      }
      fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/inválido/i);
      });
    });

    it('should clear inputs and show error on failed verification', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.validate2FACode as jest.Mock).mockRejectedValue(new Error('Invalid code'));
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act
      const inputs = screen.getAllByRole('textbox');
      for (let i = 0; i < 6; i++) {
        await user.type(inputs[i], String(i + 1));
      }
      fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

      // Assert
      await waitFor(() => {
        expect(inputs[0]).toHaveValue('');
        expect(document.activeElement).toBe(inputs[0]);
      });
    });

    it('should show loading state during verification', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.validate2FACode as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act
      const inputs = screen.getAllByRole('textbox');
      for (let i = 0; i < 6; i++) {
        await user.type(inputs[i], String(i + 1));
      }
      fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

      // Assert
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  // CANCEL TESTS
  describe('Cancel', () => {
    it('should call onCancel when cancel button clicked', () => {
      // Arrange
      render(<TwoFactorVerify onSuccess={mockOnSuccess} onCancel={mockOnCancel} />);

      // Act
      fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));

      // Assert
      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  // BACKUP CODE TESTS
  describe('Backup Code', () => {
    it('should call onUseBackupCode when backup link clicked', () => {
      // Arrange
      render(
        <TwoFactorVerify
          onSuccess={mockOnSuccess}
          onUseBackupCode={mockOnUseBackupCode}
        />
      );

      // Act
      fireEvent.click(screen.getByText(/código de respaldo/i));

      // Assert
      expect(mockOnUseBackupCode).toHaveBeenCalled();
    });
  });

  // ACCESSIBILITY TESTS
  describe('Accessibility', () => {
    it('should have proper ARIA labels on inputs', () => {
      // Arrange & Act
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Assert
      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input, index) => {
        expect(input).toHaveAttribute('aria-label', `Dígito ${index + 1} de 6`);
      });
    });

    it('should announce error to screen readers', async () => {
      // Arrange
      const user = userEvent.setup();
      (authApi.validate2FACode as jest.Mock).mockRejectedValue(new Error('Invalid code'));
      render(<TwoFactorVerify onSuccess={mockOnSuccess} />);

      // Act
      const inputs = screen.getAllByRole('textbox');
      for (let i = 0; i < 6; i++) {
        await user.type(inputs[i], String(i + 1));
      }
      fireEvent.click(screen.getByRole('button', { name: /verificar/i }));

      // Assert
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveAttribute('aria-live', 'polite');
      });
    });
  });
});
