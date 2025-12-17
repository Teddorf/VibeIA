/**
 * useWizardMode Hook Tests
 * TDD: Tests written BEFORE implementation
 *
 * Este hook maneja:
 * - El modo actual del wizard (guided, standard, expert)
 * - Persistencia de preferencia en localStorage
 * - Nivel de experiencia del usuario
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWizardMode, WizardMode } from '../useWizardMode';

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

// Mock API client
jest.mock('@/lib/api-client', () => ({
  authApi: {
    getMe: jest.fn(),
  },
}));

import { authApi } from '@/lib/api-client';

describe('useWizardMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.clear();
    (authApi.getMe as jest.Mock).mockResolvedValue({ experienceLevel: null });
  });

  // ==========================================
  // ESTADO INICIAL
  // ==========================================
  describe('Estado inicial', () => {
    it('should return null mode when no preference is set', () => {
      const { result } = renderHook(() => useWizardMode());

      expect(result.current.mode).toBeNull();
    });

    it('should return isLoading as true initially when fetching user', () => {
      (authApi.getMe as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useWizardMode());

      expect(result.current.isLoading).toBe(true);
    });

    it('should set isLoading to false after user data is fetched', async () => {
      (authApi.getMe as jest.Mock).mockResolvedValue({ experienceLevel: 'beginner' });

      const { result } = renderHook(() => useWizardMode());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should return hasPreference as false when no localStorage value', () => {
      const { result } = renderHook(() => useWizardMode());

      expect(result.current.hasPreference).toBe(false);
    });
  });

  // ==========================================
  // PERSISTENCIA
  // ==========================================
  describe('Persistencia', () => {
    it('should return saved mode from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('expert');

      const { result } = renderHook(() => useWizardMode());

      expect(result.current.mode).toBe('expert');
      expect(result.current.hasPreference).toBe(true);
    });

    it('should handle invalid localStorage value gracefully', () => {
      localStorageMock.getItem.mockReturnValue('invalid_mode');

      const { result } = renderHook(() => useWizardMode());

      expect(result.current.mode).toBeNull();
    });

    it('should validate mode is one of: guided, standard, expert', () => {
      localStorageMock.getItem.mockReturnValue('standard');

      const { result } = renderHook(() => useWizardMode());

      expect(['guided', 'standard', 'expert']).toContain(result.current.mode);
    });
  });

  // ==========================================
  // NIVEL DE EXPERIENCIA
  // ==========================================
  describe('Nivel de experiencia', () => {
    it('should fetch user experience level from API', async () => {
      (authApi.getMe as jest.Mock).mockResolvedValue({ experienceLevel: 'beginner' });

      const { result } = renderHook(() => useWizardMode());

      await waitFor(() => {
        expect(result.current.userExperience).toBe('beginner');
      });
    });

    it('should return null userExperience if API fails', async () => {
      (authApi.getMe as jest.Mock).mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => useWizardMode());

      await waitFor(() => {
        expect(result.current.userExperience).toBeNull();
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should suggest guided mode for beginner users', async () => {
      (authApi.getMe as jest.Mock).mockResolvedValue({ experienceLevel: 'beginner' });

      const { result } = renderHook(() => useWizardMode());

      await waitFor(() => {
        expect(result.current.suggestedMode).toBe('guided');
      });
    });

    it('should suggest standard mode for intermediate users', async () => {
      (authApi.getMe as jest.Mock).mockResolvedValue({ experienceLevel: 'intermediate' });

      const { result } = renderHook(() => useWizardMode());

      await waitFor(() => {
        expect(result.current.suggestedMode).toBe('standard');
      });
    });

    it('should suggest expert mode for advanced users', async () => {
      (authApi.getMe as jest.Mock).mockResolvedValue({ experienceLevel: 'advanced' });

      const { result } = renderHook(() => useWizardMode());

      await waitFor(() => {
        expect(result.current.suggestedMode).toBe('expert');
      });
    });

    it('should suggest standard mode when no experience level', async () => {
      (authApi.getMe as jest.Mock).mockResolvedValue({ experienceLevel: null });

      const { result } = renderHook(() => useWizardMode());

      await waitFor(() => {
        expect(result.current.suggestedMode).toBe('standard');
      });
    });
  });

  // ==========================================
  // SET MODE
  // ==========================================
  describe('setMode', () => {
    it('should update mode state', () => {
      const { result } = renderHook(() => useWizardMode());

      act(() => {
        result.current.setMode('standard');
      });

      expect(result.current.mode).toBe('standard');
    });

    it('should persist mode to localStorage when persist=true', () => {
      const { result } = renderHook(() => useWizardMode());

      act(() => {
        result.current.setMode('expert', true);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith('wizard_mode_preference', 'expert');
    });

    it('should NOT persist mode to localStorage when persist=false', () => {
      const { result } = renderHook(() => useWizardMode());

      act(() => {
        result.current.setMode('guided', false);
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should NOT persist by default', () => {
      const { result } = renderHook(() => useWizardMode());

      act(() => {
        result.current.setMode('standard');
      });

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should update hasPreference when persisted', () => {
      // Ensure no preference is saved initially
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useWizardMode());

      expect(result.current.hasPreference).toBe(false);

      act(() => {
        result.current.setMode('expert', true);
      });

      expect(result.current.hasPreference).toBe(true);
    });

    it('should accept only valid modes', () => {
      // Ensure no preference is saved initially
      localStorageMock.getItem.mockReturnValue(null);

      const { result } = renderHook(() => useWizardMode());

      // Mode should be null initially
      expect(result.current.mode).toBeNull();

      act(() => {
        result.current.setMode('invalid' as WizardMode);
      });

      // Should remain null after invalid mode attempt
      expect(result.current.mode).toBeNull();
    });
  });

  // ==========================================
  // CLEAR PREFERENCE
  // ==========================================
  describe('clearPreference', () => {
    it('should remove preference from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('expert');
      const { result } = renderHook(() => useWizardMode());

      act(() => {
        result.current.clearPreference();
      });

      expect(localStorageMock.removeItem).toHaveBeenCalledWith('wizard_mode_preference');
    });

    it('should reset mode to null', () => {
      localStorageMock.getItem.mockReturnValue('expert');
      const { result } = renderHook(() => useWizardMode());

      expect(result.current.mode).toBe('expert');

      act(() => {
        result.current.clearPreference();
      });

      expect(result.current.mode).toBeNull();
    });

    it('should set hasPreference to false', () => {
      localStorageMock.getItem.mockReturnValue('expert');
      const { result } = renderHook(() => useWizardMode());

      expect(result.current.hasPreference).toBe(true);

      act(() => {
        result.current.clearPreference();
      });

      expect(result.current.hasPreference).toBe(false);
    });
  });

  // ==========================================
  // MODO DESCRIPCIÓN
  // ==========================================
  describe('getModeInfo', () => {
    it('should return info for guided mode', () => {
      const { result } = renderHook(() => useWizardMode());

      const info = result.current.getModeInfo('guided');

      expect(info).toEqual({
        id: 'guided',
        name: expect.stringMatching(/guiado/i),
        description: expect.stringMatching(/paso a paso/i),
        estimatedTime: '~10 min',
        idealFor: expect.stringMatching(/primera vez/i),
        icon: expect.any(String),
      });
    });

    it('should return info for standard mode', () => {
      const { result } = renderHook(() => useWizardMode());

      const info = result.current.getModeInfo('standard');

      expect(info).toEqual({
        id: 'standard',
        name: expect.stringMatching(/estándar/i),
        description: expect.stringMatching(/flujo normal/i),
        estimatedTime: '~5 min',
        idealFor: expect.stringMatching(/mayoría/i),
        icon: expect.any(String),
      });
    });

    it('should return info for expert mode', () => {
      const { result } = renderHook(() => useWizardMode());

      const info = result.current.getModeInfo('expert');

      expect(info).toEqual({
        id: 'expert',
        name: expect.stringMatching(/experto/i),
        description: expect.stringMatching(/rápido/i),
        estimatedTime: '~1 min',
        idealFor: expect.stringMatching(/senior/i),
        icon: expect.any(String),
      });
    });

    it('should return all modes info', () => {
      const { result } = renderHook(() => useWizardMode());

      const allModes = result.current.getAllModesInfo();

      expect(allModes).toHaveLength(3);
      expect(allModes.map((m) => m.id)).toEqual(['guided', 'standard', 'expert']);
    });
  });
});
