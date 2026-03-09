'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authApi } from '@/lib/api-client';

export type WizardMode = 'guided' | 'standard' | 'expert';
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

const STORAGE_KEY = 'wizard_mode_preference';
const VALID_MODES: WizardMode[] = ['guided', 'standard', 'expert'];

interface ModeInfo {
  id: WizardMode;
  name: string;
  description: string;
  estimatedTime: string;
  idealFor: string;
  icon: string;
}

const MODE_INFO: Record<WizardMode, ModeInfo> = {
  guided: {
    id: 'guided',
    name: 'Guiado',
    description: 'Paso a paso con ayuda',
    estimatedTime: '~10 min',
    idealFor: 'Primera vez',
    icon: '🎯',
  },
  standard: {
    id: 'standard',
    name: 'Estándar',
    description: 'Flujo normal con opciones',
    estimatedTime: '~5 min',
    idealFor: 'La mayoría',
    icon: '⚡',
  },
  expert: {
    id: 'expert',
    name: 'Experto',
    description: 'Modo rápido sin fricciones',
    estimatedTime: '~1 min',
    idealFor: 'Devs senior',
    icon: '🚀',
  },
};

const EXPERIENCE_TO_MODE: Record<ExperienceLevel, WizardMode> = {
  beginner: 'guided',
  intermediate: 'standard',
  advanced: 'expert',
};

interface UseWizardModeReturn {
  mode: WizardMode | null;
  setMode: (mode: WizardMode, persist?: boolean) => void;
  clearPreference: () => void;
  hasPreference: boolean;
  isLoading: boolean;
  userExperience: ExperienceLevel | null;
  suggestedMode: WizardMode;
  getModeInfo: (mode: WizardMode) => ModeInfo;
  getAllModesInfo: () => ModeInfo[];
}

export function useWizardMode(): UseWizardModeReturn {
  const [mode, setModeState] = useState<WizardMode | null>(null);
  const [hasPreference, setHasPreference] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userExperience, setUserExperience] = useState<ExperienceLevel | null>(null);

  // Load saved preference from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY);
    if (savedMode && VALID_MODES.includes(savedMode as WizardMode)) {
      setModeState(savedMode as WizardMode);
      setHasPreference(true);
    }
  }, []);

  // Fetch user experience level
  useEffect(() => {
    async function fetchUserExperience() {
      try {
        setIsLoading(true);
        const user = await authApi.getProfile();
        if (
          user?.experienceLevel &&
          ['beginner', 'intermediate', 'advanced'].includes(user.experienceLevel)
        ) {
          setUserExperience(user.experienceLevel as ExperienceLevel);
        }
      } catch (error) {
        // Silently fail - user experience is optional
        console.debug('Could not fetch user experience level:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserExperience();
  }, []);

  // Calculate suggested mode based on user experience
  const suggestedMode = useMemo<WizardMode>(() => {
    if (userExperience) {
      return EXPERIENCE_TO_MODE[userExperience];
    }
    return 'standard'; // Default suggestion
  }, [userExperience]);

  // Set mode with optional persistence
  const setMode = useCallback((newMode: WizardMode, persist = false) => {
    if (!VALID_MODES.includes(newMode)) {
      console.warn(`Invalid wizard mode: ${newMode}`);
      return;
    }

    setModeState(newMode);

    if (persist) {
      localStorage.setItem(STORAGE_KEY, newMode);
      setHasPreference(true);
    }
  }, []);

  // Clear saved preference
  const clearPreference = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setModeState(null);
    setHasPreference(false);
  }, []);

  // Get info for a specific mode
  const getModeInfo = useCallback((modeId: WizardMode): ModeInfo => {
    return MODE_INFO[modeId];
  }, []);

  // Get all modes info
  const getAllModesInfo = useCallback((): ModeInfo[] => {
    return VALID_MODES.map((m) => MODE_INFO[m]);
  }, []);

  return {
    mode,
    setMode,
    clearPreference,
    hasPreference,
    isLoading,
    userExperience,
    suggestedMode,
    getModeInfo,
    getAllModesInfo,
  };
}
