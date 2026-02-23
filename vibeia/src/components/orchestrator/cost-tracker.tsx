'use client';

import React from 'react';
import { useOrchestratorStore, type CostInfo } from '@/stores/orchestrator-store';

interface CostTrackerProps {
  budgetLimit?: number;
}

export function CostTracker({ budgetLimit = 10 }: CostTrackerProps) {
  const { costInfo, currentPlan } = useOrchestratorStore();

  const totalCost = costInfo?.totalCostUSD ?? currentPlan?.estimatedCost ?? 0;
  const budgetUsedPct = Math.min(100, Math.round((totalCost / budgetLimit) * 100));
  const remaining = Math.max(0, budgetLimit - totalCost);

  return (
    <div className="p-4">
      <h3 className="text-lg font-semibold mb-3">Cost Tracker</h3>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="rounded-lg border p-3 bg-white">
          <span className="text-xs text-gray-400 block">Total Spend</span>
          <span className="text-2xl font-bold text-gray-800">${totalCost.toFixed(4)}</span>
        </div>
        <div className="rounded-lg border p-3 bg-white">
          <span className="text-xs text-gray-400 block">Budget Remaining</span>
          <span
            className={`text-2xl font-bold ${remaining < 1 ? 'text-red-600' : 'text-green-600'}`}
          >
            ${remaining.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Budget Usage</span>
          <span>{budgetUsedPct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              budgetUsedPct > 80
                ? 'bg-red-500'
                : budgetUsedPct > 50
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
            }`}
            style={{ width: `${budgetUsedPct}%` }}
          />
        </div>
      </div>

      {costInfo && Object.keys(costInfo.byAgent).length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Cost by Agent</h4>
          <div className="space-y-1">
            {Object.entries(costInfo.byAgent).map(([agentId, data]) => (
              <div key={agentId} className="flex justify-between text-xs">
                <span className="text-gray-600 capitalize">{agentId}</span>
                <span className="text-gray-800 font-medium">
                  ${data.costUSD.toFixed(4)} ({data.count} calls)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {costInfo && (
        <div className="mt-3 flex gap-4 text-xs text-gray-400">
          <span>Tokens: {costInfo.totalTokensUsed.toLocaleString()}</span>
          <span>Executions: {costInfo.executionCount}</span>
        </div>
      )}
    </div>
  );
}
