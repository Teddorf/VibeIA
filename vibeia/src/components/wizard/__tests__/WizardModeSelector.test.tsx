/**
 * WizardModeSelector Tests
 * TDD: Tests written BEFORE implementation
 *
 * Este componente permite al usuario elegir entre 3 modos:
 * - Guiado: Paso a paso con ayuda (para principiantes)
 * - Estándar: Flujo normal con opciones
 * - Experto: Modo rápido sin fricciones
 */
import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WizardModeSelector } from '../WizardModeSelector';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('WizardModeSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
  });

  // ==========================================
  // RENDERIZADO INICIAL
  // ==========================================
  describe('Renderizado inicial', () => {
    it('should render three mode options: Guided, Standard, Expert', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByText(/Guiado/i)).toBeInTheDocument();
      expect(screen.getByText(/Estándar/i)).toBeInTheDocument();
      expect(screen.getByText(/Experto/i)).toBeInTheDocument();
    });

    it('should show description for each mode', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByText(/paso a paso con ayuda/i)).toBeInTheDocument();
      expect(screen.getByText(/flujo normal con opciones/i)).toBeInTheDocument();
      expect(screen.getByText(/modo rápido sin fricciones/i)).toBeInTheDocument();
    });

    it('should show estimated time for each mode', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByText(/~10 min/i)).toBeInTheDocument();
      expect(screen.getByText(/~5 min/i)).toBeInTheDocument();
      expect(screen.getByText(/~1 min/i)).toBeInTheDocument();
    });

    it('should render mode cards with correct test ids', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByTestId('mode-guided')).toBeInTheDocument();
      expect(screen.getByTestId('mode-standard')).toBeInTheDocument();
      expect(screen.getByTestId('mode-expert')).toBeInTheDocument();
    });

    it('should show icons for each mode', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      // Each mode should have an icon
      const guidedMode = screen.getByTestId('mode-guided');
      const standardMode = screen.getByTestId('mode-standard');
      const expertMode = screen.getByTestId('mode-expert');

      expect(within(guidedMode).getByTestId('mode-icon')).toBeInTheDocument();
      expect(within(standardMode).getByTestId('mode-icon')).toBeInTheDocument();
      expect(within(expertMode).getByTestId('mode-icon')).toBeInTheDocument();
    });

    it('should show "ideal for" text for each mode', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByText(/primera vez/i)).toBeInTheDocument();
      expect(screen.getByText(/la mayoría/i)).toBeInTheDocument();
      expect(screen.getByText(/devs senior/i)).toBeInTheDocument();
    });
  });

  // ==========================================
  // SELECCIÓN DE MODO
  // ==========================================
  describe('Selección de modo', () => {
    it('should call onSelect with "guided" when Guided mode is clicked', async () => {
      const onSelect = jest.fn();
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={onSelect} />);

      await user.click(screen.getByTestId('mode-guided'));

      expect(onSelect).toHaveBeenCalledWith('guided');
    });

    it('should call onSelect with "standard" when Standard mode is clicked', async () => {
      const onSelect = jest.fn();
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={onSelect} />);

      await user.click(screen.getByTestId('mode-standard'));

      expect(onSelect).toHaveBeenCalledWith('standard');
    });

    it('should call onSelect with "expert" when Expert mode is clicked', async () => {
      const onSelect = jest.fn();
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={onSelect} />);

      await user.click(screen.getByTestId('mode-expert'));

      expect(onSelect).toHaveBeenCalledWith('expert');
    });

    it('should highlight mode on hover', async () => {
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={jest.fn()} />);

      const guidedMode = screen.getByTestId('mode-guided');
      await user.hover(guidedMode);

      // The component should have hover styles (we check for the hover class or aria attribute)
      expect(guidedMode).toHaveClass('hover:border-purple-500');
    });

    it('should be keyboard accessible', async () => {
      const onSelect = jest.fn();
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={onSelect} />);

      // Tab to first mode and press Enter
      await user.tab();
      await user.keyboard('{Enter}');

      expect(onSelect).toHaveBeenCalled();
    });
  });

  // ==========================================
  // PERSISTENCIA DE PREFERENCIA
  // ==========================================
  describe('Persistencia de preferencia', () => {
    it('should show "Remember my preference" checkbox', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByRole('checkbox', { name: /recordar/i })).toBeInTheDocument();
    });

    it('should save preference to localStorage when checkbox is checked and mode selected', async () => {
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={jest.fn()} />);

      // Check the "remember" checkbox
      await user.click(screen.getByRole('checkbox', { name: /recordar/i }));
      // Select expert mode
      await user.click(screen.getByTestId('mode-expert'));

      expect(localStorageMock.setItem).toHaveBeenCalledWith('wizard_mode_preference', 'expert');
    });

    it('should NOT save preference to localStorage when checkbox is unchecked', async () => {
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={jest.fn()} />);

      // Don't check the checkbox, just select a mode
      await user.click(screen.getByTestId('mode-standard'));

      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(
        'wizard_mode_preference',
        expect.any(String)
      );
    });

    it('should auto-select mode if preference exists in localStorage', () => {
      localStorageMock.getItem.mockReturnValue('expert');
      const onSelect = jest.fn();

      render(<WizardModeSelector onSelect={onSelect} />);

      expect(onSelect).toHaveBeenCalledWith('expert');
    });

    it('should show "change mode" link when autoSelected is true', () => {
      localStorageMock.getItem.mockReturnValue('expert');

      render(<WizardModeSelector onSelect={jest.fn()} showChangeOption />);

      expect(screen.getByText(/cambiar modo/i)).toBeInTheDocument();
    });

    it('should clear preference and show selector when "change mode" is clicked', async () => {
      localStorageMock.getItem.mockReturnValue('expert');
      const user = userEvent.setup();

      render(<WizardModeSelector onSelect={jest.fn()} showChangeOption />);

      await user.click(screen.getByText(/cambiar modo/i));

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('wizard_mode_preference');
      expect(screen.getByTestId('mode-guided')).toBeInTheDocument();
    });
  });

  // ==========================================
  // ADAPTACIÓN POR NIVEL DE USUARIO
  // ==========================================
  describe('Adaptación por nivel de usuario', () => {
    it('should show recommended badge for Guided mode when user is beginner', () => {
      render(<WizardModeSelector onSelect={jest.fn()} userExperience="beginner" />);

      const guidedMode = screen.getByTestId('mode-guided');
      expect(within(guidedMode).getByText(/Recomendado/i)).toBeInTheDocument();
    });

    it('should show recommended badge for Standard mode when user is intermediate', () => {
      render(<WizardModeSelector onSelect={jest.fn()} userExperience="intermediate" />);

      const standardMode = screen.getByTestId('mode-standard');
      expect(within(standardMode).getByText(/Recomendado/i)).toBeInTheDocument();
    });

    it('should show recommended badge for Expert mode when user is advanced', () => {
      render(<WizardModeSelector onSelect={jest.fn()} userExperience="advanced" />);

      const expertMode = screen.getByTestId('mode-expert');
      expect(within(expertMode).getByText(/Recomendado/i)).toBeInTheDocument();
    });

    it('should add "suggested" class to recommended mode', () => {
      render(<WizardModeSelector onSelect={jest.fn()} userExperience="beginner" />);

      expect(screen.getByTestId('mode-guided')).toHaveClass('suggested');
    });

    it('should not show recommended badge when no userExperience provided', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.queryByText(/Recomendado/i)).not.toBeInTheDocument();
    });

    it('should pre-highlight the suggested mode visually', () => {
      render(<WizardModeSelector onSelect={jest.fn()} userExperience="advanced" />);

      const expertMode = screen.getByTestId('mode-expert');
      expect(expertMode).toHaveClass('ring-2');
    });
  });

  // ==========================================
  // TÍTULO Y DESCRIPCIÓN
  // ==========================================
  describe('Título y descripción', () => {
    it('should show main title asking how user wants to create project', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByText(/¿Cómo prefieres crear tu proyecto?/i)).toBeInTheDocument();
    });

    it('should show subtitle with explanation', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByText(/Elige el modo que mejor se adapte/i)).toBeInTheDocument();
    });
  });

  // ==========================================
  // ACCESIBILIDAD
  // ==========================================
  describe('Accesibilidad', () => {
    it('should have proper ARIA labels', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      expect(screen.getByRole('group', { name: /seleccionar modo/i })).toBeInTheDocument();
    });

    it('should have role="button" on mode cards', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      const guidedMode = screen.getByTestId('mode-guided');
      expect(guidedMode).toHaveAttribute('role', 'button');
    });

    it('should have tabIndex on mode cards', () => {
      render(<WizardModeSelector onSelect={jest.fn()} />);

      const guidedMode = screen.getByTestId('mode-guided');
      expect(guidedMode).toHaveAttribute('tabIndex', '0');
    });

    it('should announce selected mode to screen readers', async () => {
      const user = userEvent.setup();
      render(<WizardModeSelector onSelect={jest.fn()} />);

      const guidedMode = screen.getByTestId('mode-guided');
      await user.click(guidedMode);

      expect(guidedMode).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
