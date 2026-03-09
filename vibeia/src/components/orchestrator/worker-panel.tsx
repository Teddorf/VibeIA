'use client';

import React, { useEffect } from 'react';
import { useOrchestratorStore, type AgentStatus } from '@/stores/orchestrator-store';
import apiClient from '@/lib/api-client';

export function WorkerPanel() {
  const { agentStatuses, fetchWorkerStatuses } = useOrchestratorStore();

  useEffect(() => {
    fetchWorkerStatuses();
    const interval = setInterval(fetchWorkerStatuses, 5000);
    return () => clearInterval(interval);
  }, [fetchWorkerStatuses]);

  const handleUpdateWorkers = async (agentId: string, maxWorkers: number) => {
    try {
      await apiClient.patch(`/api/workers/${agentId}`, { maxWorkers });
      fetchWorkerStatuses();
    } catch (err) {
      console.error('Failed to update workers:', err);
    }
  };

  const handleTogglePause = async (agentId: string, paused: boolean) => {
    try {
      const action = paused ? 'resume' : 'pause';
      await apiClient.post(`/api/workers/${agentId}/${action}`);
      fetchWorkerStatuses();
    } catch (err) {
      console.error('Failed to toggle pause:', err);
    }
  };

  if (agentStatuses.length === 0) {
    return (
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-3 text-white">Worker Pools</h3>
        <p className="text-slate-400 text-sm">No active worker pools</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3 text-white">Worker Pools</h3>
      <div className="space-y-3">
        {agentStatuses.map((agent) => (
          <WorkerCard
            key={agent.agentId}
            agent={agent}
            onUpdateWorkers={handleUpdateWorkers}
            onTogglePause={handleTogglePause}
          />
        ))}
      </div>
    </div>
  );
}

function WorkerCard({
  agent,
  onUpdateWorkers,
  onTogglePause,
}: {
  agent: AgentStatus;
  onUpdateWorkers: (agentId: string, max: number) => void;
  onTogglePause: (agentId: string, paused: boolean) => void;
}) {
  const utilization =
    agent.maxWorkers > 0 ? Math.round((agent.activeCount / agent.maxWorkers) * 100) : 0;

  return (
    <div className="rounded-lg border border-slate-600/50 p-3 bg-slate-700/30">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${agent.paused ? 'bg-orange-400' : 'bg-green-400'}`}
          />
          <span className="font-medium text-sm capitalize text-white">{agent.agentId}</span>
        </div>
        <button
          onClick={() => onTogglePause(agent.agentId, agent.paused)}
          className={`text-xs px-2 py-1 rounded ${
            agent.paused
              ? 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
              : 'bg-orange-900/30 text-orange-400 hover:bg-orange-900/50'
          }`}
        >
          {agent.paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs text-slate-300 mb-2">
        <div>
          <span className="block text-slate-400">Active</span>
          <span className="font-medium">{agent.activeCount}</span>
        </div>
        <div>
          <span className="block text-slate-400">Queue</span>
          <span className="font-medium">{agent.queueDepth}</span>
        </div>
        <div>
          <span className="block text-slate-400">Max</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onUpdateWorkers(agent.agentId, Math.max(1, agent.maxWorkers - 1))}
              className="text-slate-400 hover:text-white"
              aria-label="Decrease max workers"
            >
              −
            </button>
            <span className="font-medium">{agent.maxWorkers}</span>
            <button
              onClick={() => onUpdateWorkers(agent.agentId, agent.maxWorkers + 1)}
              className="text-slate-400 hover:text-white"
              aria-label="Increase max workers"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="w-full bg-slate-700/50 rounded-full h-1.5">
        <div
          className="bg-purple-500 h-1.5 rounded-full transition-all"
          style={{ width: `${utilization}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-500">{utilization}% utilized</span>
    </div>
  );
}
