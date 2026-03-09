'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

export interface PartialPhase {
  name: string;
  status?: 'complete' | 'generating' | 'pending';
  tasks?: Array<{
    name: string;
    estimatedTime?: number;
  }>;
}

export interface PartialPlan {
  phases: PartialPhase[];
}

export interface CompletePlan {
  phases: Array<{
    name: string;
    tasks: Array<{
      name: string;
      description?: string;
      estimatedTime?: number;
    }>;
    status: string;
  }>;
  estimatedTime?: number;
}

export interface WizardData {
  stage1?: {
    projectName?: string;
    description?: string;
  };
  stage2?: Record<string, unknown>;
  stage3?: {
    selectedArchetypes?: string[];
    plan?: unknown;
  };
}

type GenerationStage = 'analyzing' | 'designing' | 'generating' | 'estimating' | 'validating';

interface StreamingPlanState {
  isGenerating: boolean;
  progress: number;
  currentStage: GenerationStage | null;
  partialPlan: PartialPlan | null;
  completePlan: CompletePlan | null;
  aiThinking: string | null;
  error: string | null;
}

interface StreamEvent {
  type: 'progress' | 'stage' | 'partial' | 'thinking' | 'complete' | 'error';
  percent?: number;
  stage?: GenerationStage;
  phase?: PartialPhase;
  message?: string;
  plan?: CompletePlan;
}

export function useStreamingPlan() {
  const [state, setState] = useState<StreamingPlanState>({
    isGenerating: false,
    progress: 0,
    currentStage: null,
    partialPlan: null,
    completePlan: null,
    aiThinking: null,
    error: null,
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const lastWizardDataRef = useRef<WizardData | null>(null);

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: StreamEvent = JSON.parse(event.data);

      switch (data.type) {
        case 'progress':
          setState((prev) => ({
            ...prev,
            progress: data.percent || prev.progress,
          }));
          break;

        case 'stage':
          setState((prev) => ({
            ...prev,
            currentStage: data.stage || prev.currentStage,
          }));
          break;

        case 'partial':
          if (data.phase) {
            setState((prev) => ({
              ...prev,
              partialPlan: {
                phases: [...(prev.partialPlan?.phases || []), data.phase!],
              },
            }));
          }
          break;

        case 'thinking':
          setState((prev) => ({
            ...prev,
            aiThinking: data.message || null,
          }));
          break;

        case 'complete':
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            progress: 100,
            completePlan: data.plan || null,
          }));
          eventSourceRef.current?.close();
          eventSourceRef.current = null;
          break;

        case 'error':
          setState((prev) => ({
            ...prev,
            isGenerating: false,
            error: data.message || 'Unknown error occurred',
          }));
          eventSourceRef.current?.close();
          eventSourceRef.current = null;
          break;
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const handleError = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isGenerating: false,
      error: 'Connection error occurred',
    }));
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  const startGeneration = useCallback(
    (wizardData: WizardData) => {
      // Store wizard data for retry
      lastWizardDataRef.current = wizardData;

      // Reset state
      setState({
        isGenerating: true,
        progress: 0,
        currentStage: null,
        partialPlan: null,
        completePlan: null,
        aiThinking: null,
        error: null,
      });

      // Close existing connection if any
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Create query params from wizard data
      const params = new URLSearchParams();
      params.set('data', JSON.stringify(wizardData));

      // Create EventSource connection
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const url = `${apiUrl}/api/plans/generate/stream?${params.toString()}`;

      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onmessage = handleMessage;
      eventSource.onerror = handleError;
    },
    [handleMessage, handleError],
  );

  const cancelGeneration = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isGenerating: false,
      progress: 0,
    }));
  }, []);

  const retryGeneration = useCallback(() => {
    if (lastWizardDataRef.current) {
      startGeneration(lastWizardDataRef.current);
    }
  }, [startGeneration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    ...state,
    startGeneration,
    cancelGeneration,
    retryGeneration,
  };
}
