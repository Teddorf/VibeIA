import { renderHook, act, waitFor } from '@testing-library/react';
import { useWizardProgress } from '../useWizardProgress';

describe('useWizardProgress', () => {
  const mockWizardData = {
    stage1: { projectName: 'Test', description: 'Desc' },
    stage2: { target_users: 'Devs' },
    currentStage: 2,
  };

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  // ============================================
  // AUTO-SAVE
  // ============================================
  describe('Auto-save', () => {
    it('should save progress to localStorage on data change', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.updateProgress(mockWizardData);
      });

      // Wait for debounce
      act(() => {
        jest.advanceTimersByTime(500);
      });

      const saved = JSON.parse(localStorage.getItem('wizard_progress') || '{}');
      expect(saved.stage1.projectName).toBe('Test');

      jest.useRealTimers();
    });

    it('should debounce saves to avoid excessive writes', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.updateProgress({ ...mockWizardData, stage1: { projectName: 'A', description: '' } });
        result.current.updateProgress({ ...mockWizardData, stage1: { projectName: 'AB', description: '' } });
        result.current.updateProgress({ ...mockWizardData, stage1: { projectName: 'ABC', description: '' } });
      });

      // Before debounce - should not be saved yet
      expect(localStorage.getItem('wizard_progress')).toBeNull();

      // After debounce (500ms)
      act(() => {
        jest.advanceTimersByTime(500);
      });

      const saved = JSON.parse(localStorage.getItem('wizard_progress') || '{}');
      expect(saved.stage1.projectName).toBe('ABC');

      jest.useRealTimers();
    });

    it('should include timestamp in saved data', async () => {
      jest.useFakeTimers();
      const now = Date.now();
      jest.setSystemTime(now);

      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.updateProgress(mockWizardData);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      const saved = JSON.parse(localStorage.getItem('wizard_progress') || '{}');
      expect(saved.savedAt).toBeDefined();
      // Timestamp should be after debounce, so it's now + 500ms
      expect(saved.savedAt).toBe(now + 500);

      jest.useRealTimers();
    });

    it('should not save when data is empty', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.updateProgress({});
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(localStorage.getItem('wizard_progress')).toBeNull();

      jest.useRealTimers();
    });

    it('should update current progress state', () => {
      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.updateProgress(mockWizardData);
      });

      expect(result.current.currentProgress).toEqual(mockWizardData);
    });
  });

  // ============================================
  // RESTORE
  // ============================================
  describe('Restore', () => {
    it('should restore progress from localStorage on mount', () => {
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: Date.now(),
      }));

      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.savedProgress).toEqual(expect.objectContaining({
        stage1: mockWizardData.stage1,
      }));
    });

    it('should not restore progress older than 24 hours', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000); // 25 hours ago
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: oldTimestamp,
      }));

      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.savedProgress).toBeNull();
    });

    it('should restore progress that is just under 24 hours old', () => {
      // Just under 24 hours (23 hours 59 minutes)
      const justUnderDayOld = Date.now() - (23 * 60 * 60 * 1000 + 59 * 60 * 1000);
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: justUnderDayOld,
      }));

      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.savedProgress).toEqual(expect.objectContaining({
        stage1: mockWizardData.stage1,
      }));
    });

    it('should show restore prompt when saved progress exists', () => {
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: Date.now(),
      }));

      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.hasRestorable).toBe(true);
    });

    it('should not show restore prompt when no saved progress', () => {
      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.hasRestorable).toBe(false);
    });

    it('should apply restored progress when restoreProgress is called', () => {
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: Date.now(),
      }));

      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.restoreProgress();
      });

      expect(result.current.currentProgress).toEqual(expect.objectContaining({
        stage1: mockWizardData.stage1,
      }));
    });

    it('should return null for savedProgress when localStorage has invalid JSON', () => {
      localStorage.setItem('wizard_progress', 'invalid json');

      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.savedProgress).toBeNull();
      expect(result.current.hasRestorable).toBe(false);
    });
  });

  // ============================================
  // CLEAR
  // ============================================
  describe('Clear', () => {
    it('should clear saved progress from localStorage', () => {
      localStorage.setItem('wizard_progress', JSON.stringify(mockWizardData));
      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.clearProgress();
      });

      expect(localStorage.getItem('wizard_progress')).toBeNull();
    });

    it('should reset savedProgress state to null', () => {
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: Date.now(),
      }));

      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.savedProgress).not.toBeNull();

      act(() => {
        result.current.clearProgress();
      });

      expect(result.current.savedProgress).toBeNull();
    });

    it('should reset hasRestorable to false', () => {
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: Date.now(),
      }));

      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.hasRestorable).toBe(true);

      act(() => {
        result.current.clearProgress();
      });

      expect(result.current.hasRestorable).toBe(false);
    });

    it('should also clear current progress', () => {
      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.updateProgress(mockWizardData);
      });

      expect(result.current.currentProgress).toEqual(mockWizardData);

      act(() => {
        result.current.clearProgress();
      });

      expect(result.current.currentProgress).toBeNull();
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================
  describe('Edge cases', () => {
    it('should handle localStorage being unavailable', () => {
      const originalLocalStorage = global.localStorage;
      // @ts-ignore - intentionally setting to undefined for test
      delete global.localStorage;

      expect(() => {
        renderHook(() => useWizardProgress());
      }).not.toThrow();

      global.localStorage = originalLocalStorage;
    });

    it('should work with partial wizard data', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useWizardProgress());

      const partialData = {
        stage1: { projectName: 'Partial', description: '' },
        currentStage: 1,
      };

      act(() => {
        result.current.updateProgress(partialData);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      const saved = JSON.parse(localStorage.getItem('wizard_progress') || '{}');
      expect(saved.stage1.projectName).toBe('Partial');
      expect(saved.stage2).toBeUndefined();

      jest.useRealTimers();
    });

    it('should preserve existing data when updating partially', async () => {
      jest.useFakeTimers();
      const { result } = renderHook(() => useWizardProgress());

      act(() => {
        result.current.updateProgress(mockWizardData);
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      act(() => {
        result.current.updateProgress({
          ...mockWizardData,
          stage3: { techStack: ['nextjs'] },
        });
      });

      act(() => {
        jest.advanceTimersByTime(500);
      });

      const saved = JSON.parse(localStorage.getItem('wizard_progress') || '{}');
      expect(saved.stage1.projectName).toBe('Test');
      expect(saved.stage3.techStack).toContain('nextjs');

      jest.useRealTimers();
    });
  });

  // ============================================
  // TIME-BASED EXPIRY
  // ============================================
  describe('Time-based expiry', () => {
    it('should return time remaining until expiry', () => {
      const savedTime = Date.now() - (12 * 60 * 60 * 1000); // 12 hours ago
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: savedTime,
      }));

      const { result } = renderHook(() => useWizardProgress());

      // Should have about 12 hours remaining (24 - 12)
      expect(result.current.expiresIn).toBeGreaterThan(11 * 60 * 60 * 1000);
      expect(result.current.expiresIn).toBeLessThanOrEqual(12 * 60 * 60 * 1000);
    });

    it('should return 0 for expiresIn when no saved progress', () => {
      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.expiresIn).toBe(0);
    });

    it('should return 0 for expiresIn when progress is expired', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000);
      localStorage.setItem('wizard_progress', JSON.stringify({
        ...mockWizardData,
        savedAt: oldTimestamp,
      }));

      const { result } = renderHook(() => useWizardProgress());

      expect(result.current.expiresIn).toBe(0);
    });
  });
});
