'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'wizard_progress';
const EXPIRY_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const DEBOUNCE_MS = 500;

export interface WizardProgressData {
  stage1?: {
    projectName: string;
    description: string;
  };
  stage2?: Record<string, string>;
  stage3?: {
    techStack?: string[];
    database?: string;
    deploy?: string;
  };
  stage4?: {
    plan?: unknown;
  };
  currentStage?: number;
  savedAt?: number;
}

export interface UseWizardProgressReturn {
  /** Currently tracked progress (in memory) */
  currentProgress: WizardProgressData | null;
  /** Saved progress from localStorage (if valid and not expired) */
  savedProgress: WizardProgressData | null;
  /** Whether there is valid restorable progress */
  hasRestorable: boolean;
  /** Time remaining until saved progress expires (ms) */
  expiresIn: number;
  /** Update progress (debounced save to localStorage) */
  updateProgress: (data: WizardProgressData) => void;
  /** Restore saved progress to current progress */
  restoreProgress: () => void;
  /** Clear all saved and current progress */
  clearProgress: () => void;
}

/**
 * Hook to manage wizard progress with auto-save and restore capabilities.
 * - Automatically saves progress to localStorage with debouncing
 * - Restores progress on mount if within 24 hours
 * - Provides expiry information for UI prompts
 */
export function useWizardProgress(): UseWizardProgressReturn {
  const [currentProgress, setCurrentProgress] = useState<WizardProgressData | null>(null);
  const [savedProgress, setSavedProgress] = useState<WizardProgressData | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Load saved progress on mount
  useEffect(() => {
    try {
      if (typeof localStorage === 'undefined') return;

      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored) as WizardProgressData;

      // Check if expired
      if (parsed.savedAt) {
        const age = Date.now() - parsed.savedAt;
        if (age <= EXPIRY_TIME_MS) {
          setSavedProgress(parsed);
        } else {
          // Expired - clean up
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Invalid JSON - ignore
      setSavedProgress(null);
    }
  }, []);

  // Save progress to localStorage (debounced)
  const saveToStorage = useCallback((data: WizardProgressData) => {
    try {
      if (typeof localStorage === 'undefined') return;

      const toSave = {
        ...data,
        savedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      setSavedProgress(toSave);
    } catch {
      // localStorage unavailable - ignore
    }
  }, []);

  // Update progress with debounce
  const updateProgress = useCallback((data: WizardProgressData) => {
    // Update in-memory state immediately
    setCurrentProgress(data);

    // Don't save empty data
    if (!data || Object.keys(data).length === 0) return;

    // Clear existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Schedule save
    debounceTimer.current = setTimeout(() => {
      saveToStorage(data);
    }, DEBOUNCE_MS);
  }, [saveToStorage]);

  // Restore saved progress
  const restoreProgress = useCallback(() => {
    if (savedProgress) {
      setCurrentProgress(savedProgress);
    }
  }, [savedProgress]);

  // Clear all progress
  const clearProgress = useCallback(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore errors
    }
    setCurrentProgress(null);
    setSavedProgress(null);

    // Clear any pending debounce
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
  }, []);

  // Calculate expiry time
  const expiresIn = savedProgress?.savedAt
    ? Math.max(0, EXPIRY_TIME_MS - (Date.now() - savedProgress.savedAt))
    : 0;

  // Has restorable progress
  const hasRestorable = savedProgress !== null && expiresIn > 0;

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    currentProgress,
    savedProgress,
    hasRestorable,
    expiresIn,
    updateProgress,
    restoreProgress,
    clearProgress,
  };
}
