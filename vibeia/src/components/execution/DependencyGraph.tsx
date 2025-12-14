'use client';

import React, { useState, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'failed' | 'paused';

export interface GraphTask {
  id: string;
  name: string;
  status: TaskStatus;
  dependencies: string[];
  isBlocked?: boolean;
}

export interface DependencyGraphProps {
  tasks: GraphTask[];
  layout?: 'horizontal' | 'vertical';
  enableZoom?: boolean;
  showCriticalPath?: boolean;
  showLegend?: boolean;
  highlightConnections?: boolean;
  className?: string;
  onNodeClick?: (task: GraphTask) => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getStatusColor = (status: TaskStatus, isBlocked?: boolean): string => {
  if (isBlocked) return 'border-red-500';
  const colors: Record<TaskStatus, string> = {
    todo: 'border-slate-500',
    in_progress: 'border-blue-500',
    completed: 'border-green-500',
    failed: 'border-red-500',
    paused: 'border-yellow-500',
  };
  return colors[status];
};

const getEdgeColor = (sourceStatus: TaskStatus): string => {
  if (sourceStatus === 'completed') return 'stroke-green-500';
  return 'stroke-slate-500';
};

const detectCircularDependencies = (tasks: GraphTask[]): boolean => {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const hasCycle = (taskId: string): boolean => {
    if (recursionStack.has(taskId)) return true;
    if (visited.has(taskId)) return false;

    visited.add(taskId);
    recursionStack.add(taskId);

    const task = tasks.find(t => t.id === taskId);
    if (task) {
      for (const depId of task.dependencies) {
        if (hasCycle(depId)) return true;
      }
    }

    recursionStack.delete(taskId);
    return false;
  };

  for (const task of tasks) {
    if (hasCycle(task.id)) return true;
  }

  return false;
};

// ============================================
// NODE COMPONENT
// ============================================

interface NodeProps {
  task: GraphTask;
  isOnCriticalPath?: boolean;
  isHighlighted?: boolean;
  onClick?: () => void;
  onHover?: (hovering: boolean) => void;
}

const BlockedIcon = ({ taskId }: { taskId: string }) => (
  <svg
    data-testid={`blocked-icon-${taskId}`}
    className="w-4 h-4 text-red-500 absolute -top-1 -right-1"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const Node: React.FC<NodeProps> = ({ task, isOnCriticalPath, isHighlighted, onClick, onHover }) => {
  return (
    <button
      data-testid={`node-${task.id}`}
      data-status={task.status}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      className={`
        relative px-4 py-2 rounded-lg border-2 bg-slate-800 text-white
        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500
        ${getStatusColor(task.status, task.isBlocked)}
        ${isOnCriticalPath ? 'ring-2 ring-orange-500' : ''}
        ${isHighlighted ? 'ring-2' : ''}
      `}
    >
      <span className="text-sm font-medium">{task.name}</span>
      {task.isBlocked && <BlockedIcon taskId={task.id} />}
    </button>
  );
};

// ============================================
// LEGEND COMPONENT
// ============================================

const Legend: React.FC = () => (
  <div data-testid="graph-legend" className="flex flex-wrap gap-4 p-3 bg-slate-800 rounded-lg">
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded border-2 border-green-500" />
      <span className="text-xs text-slate-300">Completed</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded border-2 border-blue-500" />
      <span className="text-xs text-slate-300">In Progress</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded border-2 border-slate-500" />
      <span className="text-xs text-slate-300">Pending</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-4 h-4 rounded border-2 border-red-500" />
      <span className="text-xs text-slate-300">Blocked</span>
    </div>
  </div>
);

// ============================================
// ZOOM CONTROLS COMPONENT
// ============================================

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}

const ZoomControls: React.FC<ZoomControlsProps> = ({ onZoomIn, onZoomOut, onReset }) => (
  <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
    <button
      onClick={onZoomIn}
      aria-label="Zoom in"
      className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </button>
    <button
      onClick={onZoomOut}
      aria-label="Zoom out"
      className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 12H6" />
      </svg>
    </button>
    <button
      onClick={onReset}
      aria-label="Reset zoom"
      className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    </button>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

export function DependencyGraph({
  tasks,
  layout = 'horizontal',
  enableZoom = false,
  showCriticalPath = false,
  showLegend = false,
  highlightConnections = false,
  className = '',
  onNodeClick,
}: DependencyGraphProps) {
  const [zoom, setZoom] = useState(1);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Detect circular dependencies
  const hasCircular = useMemo(() => detectCircularDependencies(tasks), [tasks]);

  // Build edges - filter out invalid dependency references
  const edges = useMemo(() => {
    const validEdges: { from: string; to: string; fromStatus: TaskStatus }[] = [];
    const taskIds = new Set(tasks.map(t => t.id));

    tasks.forEach(task => {
      task.dependencies.forEach(depId => {
        if (taskIds.has(depId)) {
          const depTask = tasks.find(t => t.id === depId);
          if (depTask) {
            validEdges.push({
              from: depId,
              to: task.id,
              fromStatus: depTask.status,
            });
          }
        }
      });
    });

    return validEdges;
  }, [tasks]);

  // Calculate critical path (simplified - longest chain)
  const criticalPathNodes = useMemo(() => {
    if (!showCriticalPath) return new Set<string>();

    // Simple implementation: find nodes with most downstream dependencies
    const downstreamCounts = new Map<string, number>();

    const countDownstream = (taskId: string, visited: Set<string> = new Set()): number => {
      if (visited.has(taskId)) return 0;
      visited.add(taskId);

      const dependents = tasks.filter(t => t.dependencies.includes(taskId));
      let count = dependents.length;
      dependents.forEach(dep => {
        count += countDownstream(dep.id, visited);
      });
      return count;
    };

    tasks.forEach(task => {
      downstreamCounts.set(task.id, countDownstream(task.id));
    });

    // Find the longest chain
    const maxCount = Math.max(...Array.from(downstreamCounts.values()));
    const criticalNodes = new Set<string>();
    downstreamCounts.forEach((count, taskId) => {
      if (count >= maxCount - 1) criticalNodes.add(taskId);
    });

    return criticalNodes;
  }, [tasks, showCriticalPath]);

  // Get connected edges for highlighting
  const connectedEdges = useMemo(() => {
    if (!hoveredNodeId || !highlightConnections) return new Set<string>();

    const connected = new Set<string>();
    edges.forEach(edge => {
      if (edge.from === hoveredNodeId || edge.to === hoveredNodeId) {
        connected.add(`${edge.from}-${edge.to}`);
      }
    });
    return connected;
  }, [hoveredNodeId, highlightConnections, edges]);

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.2, 2));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  const handleNodeHover = (taskId: string, hovering: boolean) => {
    setHoveredNodeId(hovering ? taskId : null);
  };

  // Empty state
  if (tasks.length === 0) {
    return (
      <div
        data-testid="dependency-graph"
        data-layout={layout}
        className={`bg-slate-900 rounded-lg p-6 ${className}`}
      >
        <div data-testid="empty-state" className="text-center py-12">
          <p className="text-slate-400">No tasks to display</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="dependency-graph"
      data-layout={layout}
      className={`bg-slate-900 rounded-lg border border-slate-700 p-4 ${className}`}
    >
      {/* Controls */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Dependency Graph</h3>
        {enableZoom && (
          <ZoomControls
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
          />
        )}
      </div>

      {/* Circular dependency warning */}
      {hasCircular && (
        <div data-testid="circular-warning" className="mb-4 p-3 bg-red-500/20 border border-red-500 rounded-lg">
          <p className="text-red-400 text-sm">Warning: Circular dependencies detected</p>
        </div>
      )}

      {/* Graph Container */}
      <div
        data-testid="graph-container"
        className="overflow-auto"
        style={{ transform: enableZoom ? `scale(${zoom})` : undefined, transformOrigin: 'top left' }}
      >
        {/* SVG for edges */}
        <svg className="absolute inset-0 pointer-events-none" style={{ minWidth: '100%', minHeight: '200px' }}>
          {edges.map(edge => {
            const isHighlighted = connectedEdges.has(`${edge.from}-${edge.to}`);
            const isOnCriticalPath = showCriticalPath && criticalPathNodes.has(edge.from) && criticalPathNodes.has(edge.to);

            return (
              <line
                key={`${edge.from}-${edge.to}`}
                data-testid={`edge-${edge.from}-${edge.to}`}
                x1="0"
                y1="0"
                x2="100"
                y2="100"
                strokeWidth={2}
                className={`
                  ${getEdgeColor(edge.fromStatus)}
                  ${isHighlighted ? 'stroke-purple-500' : ''}
                  ${isOnCriticalPath ? 'stroke-orange-500' : ''}
                `}
              />
            );
          })}
        </svg>

        {/* Nodes */}
        <div className={`flex ${layout === 'vertical' ? 'flex-col' : 'flex-row'} flex-wrap gap-4 relative z-10`}>
          {tasks.map(task => (
            <Node
              key={task.id}
              task={task}
              isOnCriticalPath={criticalPathNodes.has(task.id)}
              isHighlighted={hoveredNodeId === task.id}
              onClick={() => onNodeClick?.(task)}
              onHover={(hovering) => handleNodeHover(task.id, hovering)}
            />
          ))}
        </div>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="mt-4">
          <Legend />
        </div>
      )}
    </div>
  );
}

export default DependencyGraph;
