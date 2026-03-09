'use client';

import React from 'react';
import type { DAGNode } from '@/stores/orchestrator-store';

interface DAGViewProps {
  nodes: DAGNode[];
  onNodeClick?: (node: DAGNode) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-700/50 text-slate-300 border-slate-500',
  queued: 'bg-blue-900/30 text-blue-300 border-blue-500/50',
  running: 'bg-yellow-900/30 text-yellow-300 border-yellow-500/50 animate-pulse',
  completed: 'bg-green-900/30 text-green-300 border-green-500/50',
  failed: 'bg-red-900/30 text-red-300 border-red-500/50',
  skipped: 'bg-slate-800/50 text-slate-500 border-slate-600',
  cancelled: 'bg-orange-900/30 text-orange-300 border-orange-500/50',
};

const STATUS_ICONS: Record<string, string> = {
  pending: '○',
  queued: '◎',
  running: '●',
  completed: '✓',
  failed: '✗',
  skipped: '—',
  cancelled: '⊘',
};

function buildLayers(nodes: DAGNode[]): DAGNode[][] {
  const layers: DAGNode[][] = [];

  const getLayer = (node: DAGNode): number => {
    if (node.dependencies.length === 0) return 0;
    let maxDepLayer = 0;
    for (const depId of node.dependencies) {
      const depNode = nodes.find((n) => n.nodeId === depId);
      if (depNode) {
        maxDepLayer = Math.max(maxDepLayer, getLayer(depNode) + 1);
      }
    }
    return maxDepLayer;
  };

  for (const node of nodes) {
    const layer = getLayer(node);
    if (!layers[layer]) layers[layer] = [];
    layers[layer].push(node);
  }

  return layers;
}

export function DAGView({ nodes, onNodeClick }: DAGViewProps) {
  if (!nodes || nodes.length === 0) {
    return <div className="text-center text-slate-400 py-8">No execution plan available</div>;
  }

  const layers = buildLayers(nodes);

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold text-white">Execution DAG</h3>
      <div className="space-y-6">
        {layers.map((layer, layerIdx) => (
          <div key={layerIdx} className="flex items-center gap-2">
            <span className="text-xs text-slate-500 w-16 shrink-0">Layer {layerIdx}</span>
            <div className="flex flex-wrap gap-3">
              {layer.map((node) => (
                <button
                  key={node.nodeId}
                  onClick={() => onNodeClick?.(node)}
                  className={`rounded-lg border-2 px-4 py-3 text-left transition-all hover:brightness-125 ${STATUS_COLORS[node.status] ?? STATUS_COLORS.pending}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{STATUS_ICONS[node.status]}</span>
                    <span className="font-medium text-sm">{node.agentId}</span>
                  </div>
                  <div className="text-xs opacity-75 max-w-[200px] truncate">
                    {node.taskDefinition.description}
                  </div>
                  <div className="text-xs mt-1 opacity-60">{node.taskDefinition.type}</div>
                </button>
              ))}
            </div>
            {layerIdx < layers.length - 1 && <span className="text-slate-600 text-xl ml-2">→</span>}
          </div>
        ))}
      </div>

      <div className="flex gap-4 mt-4 text-xs text-slate-500">
        {Object.entries(STATUS_ICONS).map(([status, icon]) => (
          <span key={status} className="flex items-center gap-1">
            <span>{icon}</span> {status}
          </span>
        ))}
      </div>
    </div>
  );
}
