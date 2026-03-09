'use client';

import { create } from 'zustand';
import apiClient from '@/lib/api-client';

export interface DAGNode {
  nodeId: string;
  agentId: string;
  taskDefinition: {
    id: string;
    type: string;
    description: string;
    tags: string[];
  };
  dependencies: string[];
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled';
  startedAt?: string;
  completedAt?: string;
}

export interface ExecutionPlan {
  id: string;
  projectId: string;
  intent: string;
  dag: DAGNode[];
  estimatedCost: number;
  status: string;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
}

export interface AgentStatus {
  agentId: string;
  queueDepth: number;
  activeCount: number;
  maxWorkers: number;
  paused: boolean;
}

export interface CostInfo {
  totalCostUSD: number;
  totalTokensUsed: number;
  executionCount: number;
  byAgent: Record<string, { costUSD: number; tokensUsed: number; count: number }>;
}

interface OrchestratorState {
  currentPlan: ExecutionPlan | null;
  agentStatuses: AgentStatus[];
  costInfo: CostInfo | null;
  isSubmitting: boolean;
  error: string | null;

  submitIntent: (intent: string, projectId: string) => Promise<void>;
  approvePlan: (planId: string) => Promise<void>;
  cancelPipeline: (planId: string) => Promise<void>;
  fetchPlan: (planId: string) => Promise<void>;
  fetchWorkerStatuses: () => Promise<void>;
  updateNodeStatus: (nodeId: string, status: DAGNode['status']) => void;
  setAgentStatuses: (statuses: AgentStatus[]) => void;
  setCostInfo: (cost: CostInfo) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentPlan: null,
  agentStatuses: [],
  costInfo: null,
  isSubmitting: false,
  error: null,
};

export const useOrchestratorStore = create<OrchestratorState>((set, get) => ({
  ...initialState,

  submitIntent: async (intent: string, projectId: string) => {
    set({ isSubmitting: true, error: null });
    try {
      const { data } = await apiClient.post('/api/orchestrator/execute', {
        intent,
        projectId,
      });
      set({ currentPlan: data, isSubmitting: false });
    } catch (err: any) {
      set({
        error: err.response?.data?.message ?? err.message,
        isSubmitting: false,
      });
    }
  },

  approvePlan: async (planId: string) => {
    try {
      const { data } = await apiClient.post(`/api/orchestrator/plans/${planId}/approve`);
      set({ currentPlan: data });
    } catch (err: any) {
      set({ error: err.response?.data?.message ?? err.message });
    }
  },

  cancelPipeline: async (planId: string) => {
    try {
      await apiClient.post(`/api/orchestrator/plans/${planId}/cancel`);
      set((state) => ({
        currentPlan: state.currentPlan ? { ...state.currentPlan, status: 'cancelled' } : null,
      }));
    } catch (err: any) {
      set({ error: err.response?.data?.message ?? err.message });
    }
  },

  fetchPlan: async (planId: string) => {
    try {
      const { data } = await apiClient.get(`/api/orchestrator/plans/${planId}`);
      set({ currentPlan: data });
    } catch (err: any) {
      set({ error: err.response?.data?.message ?? err.message });
    }
  },

  fetchWorkerStatuses: async () => {
    try {
      const { data } = await apiClient.get('/api/workers/status');
      set({ agentStatuses: data });
    } catch {
      // silently fail, workers endpoint may not be ready
    }
  },

  updateNodeStatus: (nodeId: string, status: DAGNode['status']) => {
    set((state) => {
      if (!state.currentPlan) return state;
      return {
        currentPlan: {
          ...state.currentPlan,
          dag: state.currentPlan.dag.map((n) => (n.nodeId === nodeId ? { ...n, status } : n)),
        },
      };
    });
  },

  setAgentStatuses: (statuses: AgentStatus[]) => set({ agentStatuses: statuses }),
  setCostInfo: (cost: CostInfo) => set({ costInfo: cost }),
  setError: (error: string | null) => set({ error }),
  reset: () => set(initialState),
}));
