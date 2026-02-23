'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useOrchestratorStore, type DAGNode } from '@/stores/orchestrator-store';
import { DAGView } from '@/components/orchestrator/dag-view';
import { WorkerPanel } from '@/components/orchestrator/worker-panel';
import { CostTracker } from '@/components/orchestrator/cost-tracker';
import { ProviderHealth } from '@/components/orchestrator/provider-health';
import { connectSocket, subscribeToPipeline, disconnectSocket } from '@/lib/socket-client';

export default function OrchestratorPage() {
  const { currentPlan, isSubmitting, error, submitIntent, approvePlan, cancelPipeline, setError } =
    useOrchestratorStore();

  const [intent, setIntent] = useState('');
  const [projectId, setProjectId] = useState('');
  const [selectedNode, setSelectedNode] = useState<DAGNode | null>(null);

  useEffect(() => {
    connectSocket();
    return () => disconnectSocket();
  }, []);

  useEffect(() => {
    if (currentPlan?.id) {
      subscribeToPipeline(currentPlan.id);
    }
  }, [currentPlan?.id]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!intent.trim() || !projectId.trim()) return;
      await submitIntent(intent, projectId);
    },
    [intent, projectId, submitIntent],
  );

  const handleApprove = useCallback(async () => {
    if (currentPlan?.id) {
      await approvePlan(currentPlan.id);
    }
  }, [currentPlan, approvePlan]);

  const handleCancel = useCallback(async () => {
    if (currentPlan?.id) {
      await cancelPipeline(currentPlan.id);
    }
  }, [currentPlan, cancelPipeline]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Orchestrator Control Room</h1>
        <p className="text-gray-500 mt-1">
          Submit intents, monitor agent execution, and manage worker pools
        </p>
      </header>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-6 flex justify-between items-center">
          <span className="text-red-700 text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Intent Submission */}
      <div className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Submit Intent</h2>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            placeholder="Project ID"
            className="border rounded-lg px-3 py-2 text-sm w-48"
          />
          <input
            type="text"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="Describe what you want to build..."
            className="border rounded-lg px-3 py-2 text-sm flex-1"
          />
          <button
            type="submit"
            disabled={isSubmitting || !intent.trim() || !projectId.trim()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Execute'}
          </button>
        </form>
      </div>

      {/* Plan Status + Actions */}
      {currentPlan && (
        <div className="bg-white rounded-lg border p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">Plan: {currentPlan.intent}</h2>
              <div className="flex gap-4 text-sm text-gray-500 mt-1">
                <span>
                  Status: <strong className="capitalize">{currentPlan.status}</strong>
                </span>
                <span>Nodes: {currentPlan.dag.length}</span>
                <span>Est. Cost: ${currentPlan.estimatedCost?.toFixed(4) ?? '?'}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {currentPlan.status === 'pending_approval' && (
                <button
                  onClick={handleApprove}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
                >
                  Approve
                </button>
              )}
              {['pending_approval', 'executing', 'approved'].includes(currentPlan.status) && (
                <button
                  onClick={handleCancel}
                  className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm hover:bg-red-100"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* DAG View - spans 2 columns */}
        <div className="lg:col-span-2 bg-white rounded-lg border">
          <DAGView nodes={currentPlan?.dag ?? []} onNodeClick={setSelectedNode} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Selected Node Detail */}
          {selectedNode && (
            <div className="bg-white rounded-lg border p-4">
              <h3 className="text-lg font-semibold mb-2">Node Detail</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-gray-400">Agent</dt>
                  <dd className="font-medium capitalize">{selectedNode.agentId}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Status</dt>
                  <dd className="font-medium capitalize">{selectedNode.status}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Task</dt>
                  <dd>{selectedNode.taskDefinition.description}</dd>
                </div>
                <div>
                  <dt className="text-gray-400">Dependencies</dt>
                  <dd>
                    {selectedNode.dependencies.length > 0
                      ? selectedNode.dependencies.join(', ')
                      : 'None'}
                  </dd>
                </div>
              </dl>
            </div>
          )}

          {/* Cost Tracker */}
          <div className="bg-white rounded-lg border">
            <CostTracker />
          </div>

          {/* Worker Panel */}
          <div className="bg-white rounded-lg border">
            <WorkerPanel />
          </div>

          {/* Provider Health */}
          <div className="bg-white rounded-lg border">
            <ProviderHealth />
          </div>
        </div>
      </div>
    </div>
  );
}
