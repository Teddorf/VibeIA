import { renderHook, act, waitFor } from '@testing-library/react';
import { useStreamingPlan } from '../useStreamingPlan';

describe('useStreamingPlan', () => {
  const mockWizardData = {
    stage1: { projectName: 'Test', description: 'Test project' },
    stage2: { features: 'Authentication' },
    stage3: { selectedArchetypes: ['next-fullstack'] },
  };

  let originalEventSource: typeof EventSource;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEventSource = global.EventSource;
  });

  afterEach(() => {
    global.EventSource = originalEventSource;
  });

  // ============================================
  // INITIAL STATE
  // ============================================
  describe('Initial state', () => {
    it('should start with isGenerating as false', () => {
      const { result } = renderHook(() => useStreamingPlan());

      expect(result.current.isGenerating).toBe(false);
    });

    it('should start with progress at 0', () => {
      const { result } = renderHook(() => useStreamingPlan());

      expect(result.current.progress).toBe(0);
    });

    it('should start with null partialPlan', () => {
      const { result } = renderHook(() => useStreamingPlan());

      expect(result.current.partialPlan).toBeNull();
    });

    it('should start with null completePlan', () => {
      const { result } = renderHook(() => useStreamingPlan());

      expect(result.current.completePlan).toBeNull();
    });

    it('should start with null error', () => {
      const { result } = renderHook(() => useStreamingPlan());

      expect(result.current.error).toBeNull();
    });
  });

  // ============================================
  // START GENERATION
  // ============================================
  describe('startGeneration', () => {
    it('should set isGenerating to true', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      expect(result.current.isGenerating).toBe(true);
    });

    it('should connect to streaming endpoint', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      const MockEventSource = jest.fn(() => mockEventSource);
      // @ts-expect-error - mocking EventSource
      global.EventSource = MockEventSource;

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      expect(MockEventSource).toHaveBeenCalledWith(
        expect.stringContaining('/api/plans/generate/stream')
      );
    });

    it('should update progress on progress events', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        if (mockEventSource.onmessage) {
          mockEventSource.onmessage({
            data: JSON.stringify({ type: 'progress', percent: 50 }),
          } as MessageEvent);
        }
      });

      expect(result.current.progress).toBe(50);
    });

    it('should update currentStage on stage events', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        if (mockEventSource.onmessage) {
          mockEventSource.onmessage({
            data: JSON.stringify({ type: 'stage', stage: 'designing' }),
          } as MessageEvent);
        }
      });

      expect(result.current.currentStage).toBe('designing');
    });

    it('should update partialPlan on partial events', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        if (mockEventSource.onmessage) {
          mockEventSource.onmessage({
            data: JSON.stringify({
              type: 'partial',
              phase: { name: 'Phase 1: Setup', status: 'complete' },
            }),
          } as MessageEvent);
        }
      });

      expect(result.current.partialPlan?.phases).toHaveLength(1);
      expect(result.current.partialPlan?.phases[0].name).toBe('Phase 1: Setup');
    });

    it('should accumulate phases on multiple partial events', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        if (mockEventSource.onmessage) {
          mockEventSource.onmessage({
            data: JSON.stringify({
              type: 'partial',
              phase: { name: 'Phase 1', status: 'complete' },
            }),
          } as MessageEvent);
        }
      });

      act(() => {
        if (mockEventSource.onmessage) {
          mockEventSource.onmessage({
            data: JSON.stringify({
              type: 'partial',
              phase: { name: 'Phase 2', status: 'generating' },
            }),
          } as MessageEvent);
        }
      });

      expect(result.current.partialPlan?.phases).toHaveLength(2);
    });

    it('should set completePlan on complete event', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      const completePlan = {
        phases: [
          { name: 'Phase 1', tasks: [], status: 'complete' },
          { name: 'Phase 2', tasks: [], status: 'complete' },
        ],
        estimatedTime: 120,
      };

      act(() => {
        if (mockEventSource.onmessage) {
          mockEventSource.onmessage({
            data: JSON.stringify({ type: 'complete', plan: completePlan }),
          } as MessageEvent);
        }
      });

      expect(result.current.completePlan).toBeDefined();
      expect(result.current.completePlan?.phases).toHaveLength(2);
      expect(result.current.isGenerating).toBe(false);
      expect(result.current.progress).toBe(100);
    });

    it('should update aiThinking on thinking events', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        if (mockEventSource.onmessage) {
          mockEventSource.onmessage({
            data: JSON.stringify({
              type: 'thinking',
              message: 'Analizando requisitos...',
            }),
          } as MessageEvent);
        }
      });

      expect(result.current.aiThinking).toBe('Analizando requisitos...');
    });
  });

  // ============================================
  // CANCEL GENERATION
  // ============================================
  describe('cancelGeneration', () => {
    it('should close EventSource connection', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        result.current.cancelGeneration();
      });

      expect(mockEventSource.close).toHaveBeenCalled();
      expect(result.current.isGenerating).toBe(false);
    });

    it('should reset progress to 0 on cancel', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        if (mockEventSource.onmessage) {
          mockEventSource.onmessage({
            data: JSON.stringify({ type: 'progress', percent: 50 }),
          } as MessageEvent);
        }
      });

      act(() => {
        result.current.cancelGeneration();
      });

      expect(result.current.progress).toBe(0);
    });
  });

  // ============================================
  // RETRY GENERATION
  // ============================================
  describe('retryGeneration', () => {
    it('should clear error and restart generation', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      // Start and trigger error
      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        if (mockEventSource.onerror) {
          mockEventSource.onerror(new Event('error'));
        }
      });

      expect(result.current.error).toBeDefined();

      // Retry
      act(() => {
        result.current.retryGeneration();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isGenerating).toBe(true);
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================
  describe('error handling', () => {
    it('should set error on EventSource error', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        if (mockEventSource.onerror) {
          mockEventSource.onerror(new Event('error'));
        }
      });

      expect(result.current.error).toBeDefined();
      expect(result.current.isGenerating).toBe(false);
    });

    it('should set error on error event type', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      act(() => {
        if (mockEventSource.onmessage) {
          mockEventSource.onmessage({
            data: JSON.stringify({
              type: 'error',
              message: 'Failed to generate plan',
            }),
          } as MessageEvent);
        }
      });

      expect(result.current.error).toBe('Failed to generate plan');
      expect(result.current.isGenerating).toBe(false);
    });
  });

  // ============================================
  // CLEANUP
  // ============================================
  describe('cleanup', () => {
    it('should close EventSource on unmount', () => {
      const mockEventSource = {
        onmessage: null as ((event: MessageEvent) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        close: jest.fn(),
      };
      // @ts-expect-error - mocking EventSource
      global.EventSource = jest.fn(() => mockEventSource);

      const { result, unmount } = renderHook(() => useStreamingPlan());

      act(() => {
        result.current.startGeneration(mockWizardData);
      });

      unmount();

      expect(mockEventSource.close).toHaveBeenCalled();
    });
  });
});
