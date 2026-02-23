'use client';

import React from 'react';
import type { DAGNode } from '@/stores/orchestrator-store';

interface DAGViewProps {
  nodes: DAGNode[];
  onNodeClick?: (node: DAGNode) => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-200 text-gray-700 border-gray-300',
  queued: 'bg-blue-100 text-blue-700 border-blue-300',
  running: 'bg-yellow-100 text-yellow-700 border-yellow-400 animate-pulse',
  completed: 'bg-green-100 text-green-700 border-green-400',
  failed: 'bg-red-100 text-red-700 border-red-400',
  skipped: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-orange-100 text-orange-700 border-orange-300',
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
  const placed = new Set<string>();

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
    placed.add(node.nodeId);
  }

  return layers;
}

export function DAGView({ nodes, onNodeClick }: DAGViewProps) {
  if (!nodes || nodes.length === 0) {
    return <div className="text-center text-gray-500 py-8">No execution plan available</div>;
  }

  const layers = buildLayers(nodes);

  return (
    <div className="space-y-4 p-4">
      <h3 className="text-lg font-semibold">Execution DAG</h3>
      <div className="space-y-6">
        {layers.map((layer, layerIdx) => (
          <div key={layerIdx} className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-16 shrink-0">Layer {layerIdx}</span>
            <div className="flex flex-wrap gap-3">
              {layer.map((node) => (
                <button
                  key={node.nodeId}
                  onClick={() => onNodeClick?.(node)}
                  className={`rounded-lg border-2 px-4 py-3 text-left transition-all hover:shadow-md ${STATUS_COLORS[node.status] ?? STATUS_COLORS.pending}`}
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
            {layerIdx < layers.length - 1 && <span className="text-gray-300 text-xl ml-2">→</span>}
          </div>
        ))}
      </div>

      <div className="flex gap-4 mt-4 text-xs text-gray-500">
        {Object.entries(STATUS_ICONS).map(([status, icon]) => (
          <span key={status} className="flex items-center gap-1">
            <span>{icon}</span> {status}
          </span>
        ))}
      </div>
    </div>
  );
}
