/**
 * Onboarding Page Tests
 * TDD: Tests written BEFORE implementation
 *
 * Onboarding Flow (3 steps):
 * 1. Welcome + Profile setup (name, avatar)
 * 2. Preferences (role, experience level, interests)
 * 3. Connect integrations (optional GitHub, etc.)
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRouter } from 'next/navigation';
import OnboardingPage from '../page';
import { profileApi, githubApi } from '@/lib/api-client';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock APIs
jest.mock('@/lib/api-client', () => ({
  profileApi: {
    updateProfile: jest.fn(),
    updatePreferences: jest.fn(),
  },
  githubApi: {
    getAuthUrl: jest.fn(),
  },
}));

// Mock AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: '1', name: '', email: 'test@example.com' },
    isAuthenticated: true,
    refreshUser: jest.fn(),
  }),
}));

describe('OnboardingPage', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    localStorage.clear();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  // STEP NAVIGATION TESTS
  describe('Step Navigation', () => {
    it('should render step 1 (Welcome) by default', () => {
      // Arrange & Act
      render(<OnboardingPage />);

      // Assert
      expect(screen.getByText(/bienvenido/i)).toBeInTheDocument();
      expect(screen.getByTestId('step-indicator-1')).toHaveClass('active');
    });

    it('should show 3 step indicators', () => {
      // Arrange & Act
      render(<OnboardingPage />);

      // Assert
      expect(screen.getByTestId('step-indicator-1')).toBeInTheDocument();
      expect(screen.getByTestId('step-indicator-2')).toBeInTheDocument();
      expect(screen.getByTestId('step-indicator-3')).toBeInTheDocument();
    });

    it('should navigate to step 2 when Continue is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Fill required fields
      await user.type(screen.getByRole('textbox'), 'John Doe');

      // Act
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('step-indicator-2')).toHaveClass('active');
        expect(screen.getByRole('heading', { name: /preferencias/i })).toBeInTheDocument();
      });
    });

    it('should navigate back to step 1 when Back is clicked on step 2', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<OnboardingPage />);
      await user.type(screen.getByRole('textbox'), 'John');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Act
      await user.click(screen.getByRole('button', { name: /volver/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('step-indicator-1')).toHaveClass('active');
      });
    });

    it('should not show Back button on step 1', () => {
      // Arrange & Act
      render(<OnboardingPage />);

      // Assert
      expect(screen.queryByRole('button', { name: /volver/i })).not.toBeInTheDocument();
    });
  });

  // STEP 1: WELCOME & PROFILE TESTS
  describe('Step 1 - Welcome & Profile', () => {
    it('should render name input field', () => {
      // Arrange & Act
      render(<OnboardingPage />);

      // Assert
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render avatar upload option', () => {
      // Arrange & Act
      render(<OnboardingPage />);

      // Assert
      expect(screen.getByTestId('avatar-upload')).toBeInTheDocument();
    });

    it('should validate name is required', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Act - click continue without entering name
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/nombre es requerido/i)).toBeInTheDocument();
      });
    });

    it('should validate name minimum length', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Act
      await user.type(screen.getByRole('textbox'), 'AB');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/al menos 3 caracteres/i)).toBeInTheDocument();
      });
    });

    it('should show avatar preview when uploaded', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<OnboardingPage />);
      const file = new File(['avatar'], 'avatar.png', { type: 'image/png' });

      // Act
      const input = screen.getByTestId('avatar-input');
      await user.upload(input, file);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('avatar-preview')).toBeInTheDocument();
      });
    });
  });

  // STEP 2: PREFERENCES TESTS
  describe('Step 2 - Preferences', () => {
    const goToStep2 = async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);
      await user.type(screen.getByRole('textbox'), 'John Doe');
      await user.click(screen.getByRole('button', { name: /continuar/i }));
      return user;
    };

    it('should render role selection', async () => {
      // Arrange & Act
      await goToStep2();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/cuál es tu rol/i)).toBeInTheDocument();
        expect(screen.getByText('Desarrollador')).toBeInTheDocument();
        expect(screen.getByText('Diseñador')).toBeInTheDocument();
        expect(screen.getByText('Product Manager')).toBeInTheDocument();
        expect(screen.getByText('Otro')).toBeInTheDocument();
      });
    });

    it('should render experience level selection', async () => {
      // Arrange & Act
      await goToStep2();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/nivel de experiencia/i)).toBeInTheDocument();
        expect(screen.getByText('Principiante')).toBeInTheDocument();
        expect(screen.getByText('Intermedio')).toBeInTheDocument();
        expect(screen.getByText('Avanzado')).toBeInTheDocument();
      });
    });

    it('should render interests checkboxes', async () => {
      // Arrange & Act
      await goToStep2();

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/qué te interesa/i)).toBeInTheDocument();
        expect(screen.getByText('Web Development')).toBeInTheDocument();
        expect(screen.getByText('Mobile Apps')).toBeInTheDocument();
        expect(screen.getByText('AI/ML')).toBeInTheDocument();
      });
    });

    it('should allow selecting multiple interests', async () => {
      // Arrange
      const user = await goToStep2();

      // Act - Click on label text to toggle checkboxes
      await waitFor(() => screen.getByText('Web Development'));
      await user.click(screen.getByText('Web Development'));
      await user.click(screen.getByText('AI/ML'));

      // Assert - Check that the labels have the selected class
      const webDevLabel = screen.getByText('Web Development').closest('label');
      const aiMlLabel = screen.getByText('AI/ML').closest('label');
      expect(webDevLabel).toHaveClass('border-purple-500');
      expect(aiMlLabel).toHaveClass('border-purple-500');
    });

    it('should validate at least one role is selected', async () => {
      // Arrange
      const user = await goToStep2();

      // Act - try to continue without selecting role
      await waitFor(() => screen.getByRole('button', { name: /continuar/i }));
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/selecciona tu rol/i)).toBeInTheDocument();
      });
    });
  });

  // STEP 3: INTEGRATIONS TESTS
  describe('Step 3 - Integrations', () => {
    const goToStep3 = async () => {
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Step 1
      await user.type(screen.getByRole('textbox'), 'John Doe');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Step 2 - Use role queries for sr-only inputs
      await waitFor(() => screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /intermedio/i }));
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      return user;
    };

    it('should render GitHub connection option', async () => {
      // Arrange & Act
      await goToStep3();

      // Assert
      await waitFor(() => {
        expect(screen.getByText('GitHub')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /conectar con github/i })).toBeInTheDocument();
      });
    });

    it('should render skip option', async () => {
      // Arrange & Act
      await goToStep3();

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /omitir por ahora/i })).toBeInTheDocument();
      });
    });

    it('should show "Finish" button instead of "Continue"', async () => {
      // Arrange & Act
      await goToStep3();

      // Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /finalizar/i })).toBeInTheDocument();
      });
    });

    it('should initiate GitHub OAuth when connect is clicked', async () => {
      // Arrange
      (githubApi.getAuthUrl as jest.Mock).mockResolvedValue({
        url: 'https://github.com/oauth',
      });
      const user = await goToStep3();

      // Act
      await waitFor(() => screen.getByRole('button', { name: /conectar con github/i }));
      await user.click(screen.getByRole('button', { name: /conectar con github/i }));

      // Assert
      expect(githubApi.getAuthUrl).toHaveBeenCalled();
    });

    it('should show connected state when GitHub is linked', async () => {
      // Arrange - mock user with GitHub connected
      jest.spyOn(require('@/contexts/AuthContext'), 'useAuth').mockReturnValue({
        user: { id: '1', name: 'John', githubId: 'gh-123' },
        isAuthenticated: true,
        refreshUser: jest.fn(),
      });

      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Navigate to step 3
      await user.type(screen.getByRole('textbox'), 'John');
      await user.click(screen.getByRole('button', { name: /continuar/i }));
      await waitFor(() => screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /intermedio/i }));
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/conectado/i)).toBeInTheDocument();
      });
    });
  });

  // COMPLETION TESTS
  describe('Onboarding Completion', () => {
    it('should save profile data when completing onboarding', async () => {
      // Arrange
      (profileApi.updateProfile as jest.Mock).mockResolvedValue({ success: true });
      (profileApi.updatePreferences as jest.Mock).mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Step 1
      await user.type(screen.getByRole('textbox'), 'John Doe');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Step 2
      await waitFor(() => screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /intermedio/i }));
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Step 3
      await waitFor(() => screen.getByRole('button', { name: /finalizar/i }));
      await user.click(screen.getByRole('button', { name: /finalizar/i }));

      // Assert
      await waitFor(() => {
        expect(profileApi.updateProfile).toHaveBeenCalledWith(
          expect.objectContaining({ name: 'John Doe' })
        );
      });
    });

    it('should redirect to dashboard after completion', async () => {
      // Arrange
      (profileApi.updateProfile as jest.Mock).mockResolvedValue({ success: true });
      (profileApi.updatePreferences as jest.Mock).mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Complete all steps
      await user.type(screen.getByRole('textbox'), 'John Doe');
      await user.click(screen.getByRole('button', { name: /continuar/i }));
      await waitFor(() => screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /intermedio/i }));
      await user.click(screen.getByRole('button', { name: /continuar/i }));
      await waitFor(() => screen.getByRole('button', { name: /finalizar/i }));
      await user.click(screen.getByRole('button', { name: /finalizar/i }));

      // Assert
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
      });
    });

    it('should show success animation before redirect', async () => {
      // Arrange
      (profileApi.updateProfile as jest.Mock).mockResolvedValue({ success: true });
      (profileApi.updatePreferences as jest.Mock).mockResolvedValue({ success: true });

      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Complete all steps quickly
      await user.type(screen.getByRole('textbox'), 'John');
      await user.click(screen.getByRole('button', { name: /continuar/i }));
      await waitFor(() => screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /intermedio/i }));
      await user.click(screen.getByRole('button', { name: /continuar/i }));
      await waitFor(() => screen.getByRole('button', { name: /finalizar/i }));
      await user.click(screen.getByRole('button', { name: /finalizar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId('success-animation')).toBeInTheDocument();
      });
    });

    it('should handle API errors gracefully', async () => {
      // Arrange
      (profileApi.updateProfile as jest.Mock).mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Complete steps
      await user.type(screen.getByRole('textbox'), 'John');
      await user.click(screen.getByRole('button', { name: /continuar/i }));
      await waitFor(() => screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /desarrollador/i }));
      await user.click(screen.getByRole('radio', { name: /intermedio/i }));
      await user.click(screen.getByRole('button', { name: /continuar/i }));
      await waitFor(() => screen.getByRole('button', { name: /finalizar/i }));
      await user.click(screen.getByRole('button', { name: /finalizar/i }));

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/error al guardar/i)).toBeInTheDocument();
      });
    });
  });

  // SKIP ONBOARDING TESTS
  describe('Skip Onboarding', () => {
    it('should show skip link', () => {
      // Arrange & Act
      render(<OnboardingPage />);

      // Assert
      expect(screen.getByRole('button', { name: /completar después/i })).toBeInTheDocument();
    });

    it('should redirect to dashboard when skip is clicked', async () => {
      // Arrange
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Act
      await user.click(screen.getByRole('button', { name: /completar después/i }));

      // Assert
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });

    it('should mark onboarding as skipped in localStorage', async () => {
      // Arrange
      const user = userEvent.setup();
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      render(<OnboardingPage />);

      // Act
      await user.click(screen.getByRole('button', { name: /completar después/i }));

      // Assert
      expect(setItemSpy).toHaveBeenCalledWith('onboarding_skipped', 'true');
    });
  });

  // PROGRESS PERSISTENCE TESTS
  describe('Progress Persistence', () => {
    it('should restore progress from localStorage on mount', () => {
      // Arrange
      const savedProgress = {
        step: 2,
        data: { name: 'John Doe' },
      };
      jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(savedProgress));

      // Act
      render(<OnboardingPage />);

      // Assert
      expect(screen.getByTestId('step-indicator-2')).toHaveClass('active');
    });

    it('should save progress to localStorage on step change', async () => {
      // Arrange
      const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
      const user = userEvent.setup();
      render(<OnboardingPage />);

      // Act
      await user.type(screen.getByRole('textbox'), 'John');
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      // Assert
      await waitFor(() => {
        expect(setItemSpy).toHaveBeenCalledWith(
          'onboarding_progress',
          expect.stringContaining('"step":2')
        );
      });
    });
  });
});
