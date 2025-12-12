'use client';

import React from 'react';
import {
  getTaskStatusColor,
  getPriorityStyle,
  getInitials,
  type TaskStatus,
  type TaskPriority,
} from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export type { TaskStatus, TaskPriority };
export type QualityGateStatus = 'passed' | 'failed' | 'pending';

export interface Assignee {
  id: string;
  name: string;
  avatar?: string;
}

export interface QualityGates {
  lint?: QualityGateStatus;
  tests?: QualityGateStatus;
  security?: QualityGateStatus;
}

export interface Task {
  id: string;
  name: string;
  description?: string;
  status: TaskStatus;
  estimatedTime?: number;
  timeSpent?: number;
  priority?: TaskPriority;
  assignee?: Assignee | null;
  dependencies?: string[];
  isBlocked?: boolean;
  labels?: string[];
  qualityGates?: QualityGates;
  isAIGenerated?: boolean;
}

export interface TaskCardProps {
  task: Task;
  variant?: 'compact' | 'default' | 'expanded';
  showActions?: boolean;
  showQualityGates?: boolean;
  draggable?: boolean;
  className?: string;
  onClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, newStatus: TaskStatus) => void;
  onAssign?: (taskId: string) => void;
  onDragStart?: (e: React.DragEvent, task: Task) => void;
}

// ============================================
// ICONS
// ============================================

const CheckIcon = () => (
  <svg data-testid="check-icon" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ClockIcon = () => (
  <svg data-testid="timer-icon" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const AlertIcon = () => (
  <svg data-testid="time-warning" className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const LinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

const BlockedIcon = () => (
  <svg data-testid="blocked-indicator" className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
  </svg>
);

const DragHandle = () => (
  <div data-testid="drag-handle" className="cursor-grab active:cursor-grabbing">
    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
    </svg>
  </div>
);

const AIBadge = () => (
  <span data-testid="ai-badge" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
    AI
  </span>
);

// ============================================
// HELPER FUNCTIONS
// ============================================

const getVariantPadding = (variant: 'compact' | 'default' | 'expanded'): string => {
  const paddings = {
    compact: 'p-2',
    default: 'p-4',
    expanded: 'p-6',
  };
  return paddings[variant];
};

// ============================================
// COMPONENT
// ============================================

export function TaskCard({
  task,
  variant = 'default',
  showActions = false,
  showQualityGates = false,
  draggable = false,
  className = '',
  onClick,
  onStatusChange,
  onAssign,
  onDragStart,
}: TaskCardProps) {
  const handleClick = () => {
    onClick?.(task);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(task);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    onDragStart?.(e, task);
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    onStatusChange?.(task.id, newStatus);
  };

  const handleAssign = () => {
    onAssign?.(task.id);
  };

  const showTimeWarning = task.estimatedTime && task.estimatedTime > 10;

  return (
    <article
      data-testid="task-card"
      data-status={task.status}
      draggable={draggable}
      onDragStart={handleDragStart}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
      tabIndex={onClick ? 0 : undefined}
      role="article"
      aria-label={task.name}
      className={`
        bg-slate-800 rounded-lg border border-slate-700
        ${getVariantPadding(variant)}
        ${onClick ? 'cursor-pointer hover:bg-slate-750 focus:ring-2 focus:ring-purple-500 focus:outline-none' : ''}
        ${className}
      `}
    >
      {/* Header Row */}
      <div className="flex items-start gap-2">
        {/* Drag Handle */}
        {draggable && <DragHandle />}

        {/* Status Indicator */}
        <div
          data-testid="status-indicator"
          className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${getTaskStatusColor(task.status)}`}
        >
          {task.status === 'completed' && <CheckIcon />}
        </div>

        {/* Task Name */}
        <div className="flex-1 min-w-0">
          <h3 data-testid="task-name" className="text-white font-medium truncate">
            {task.name}
          </h3>

          {/* Description (not shown in compact) */}
          {variant !== 'compact' && task.description && (
            <p className="text-slate-400 text-sm mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* AI Badge */}
        {task.isAIGenerated && <AIBadge />}
      </div>

      {/* Meta Row */}
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {/* Priority Badge */}
        {task.priority && (
          <span
            data-testid="priority-badge"
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityStyle(task.priority).bg} ${getPriorityStyle(task.priority).text}`}
          >
            {getPriorityStyle(task.priority).label}
          </span>
        )}

        {/* Time Estimate */}
        {task.estimatedTime !== undefined && (
          <div className="flex items-center gap-1 text-sm text-slate-400">
            {task.timeSpent !== undefined ? (
              <>
                <ClockIcon />
                <span>{task.timeSpent}/{task.estimatedTime} min</span>
              </>
            ) : (
              <span>{task.estimatedTime} min</span>
            )}
            {showTimeWarning && <AlertIcon />}
          </div>
        )}

        {/* Dependencies */}
        {task.dependencies && task.dependencies.length > 0 && (
          <div className="flex items-center gap-1 text-sm text-slate-400">
            <LinkIcon />
            <span data-testid="dependency-count">{task.dependencies.length}</span>
          </div>
        )}

        {/* Blocked Indicator */}
        {task.isBlocked && <BlockedIcon />}

        {/* Assignee */}
        <div className="ml-auto">
          {task.assignee ? (
            <div data-testid="assignee-avatar" className="flex items-center">
              {task.assignee.avatar ? (
                <img
                  src={task.assignee.avatar}
                  alt={task.assignee.name}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white font-medium">
                  {getInitials(task.assignee.name)}
                </div>
              )}
            </div>
          ) : (
            <div
              data-testid="unassigned-indicator"
              className="w-6 h-6 rounded-full border-2 border-dashed border-slate-600 flex items-center justify-center"
            >
              <span className="text-slate-500 text-xs">?</span>
            </div>
          )}
        </div>
      </div>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {task.labels.map((label, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Quality Gates */}
      {showQualityGates && task.qualityGates && (
        <div className="flex items-center gap-2 mt-3">
          {Object.entries(task.qualityGates).map(([gate, status]) => (
            <div
              key={gate}
              data-testid={`quality-gate-${gate}`}
              data-status={status}
              className={`
                px-2 py-1 rounded text-xs font-medium
                ${status === 'passed' ? 'bg-green-500/20 text-green-400' : ''}
                ${status === 'failed' ? 'bg-red-500/20 text-red-400' : ''}
                ${status === 'pending' ? 'bg-slate-500/20 text-slate-400' : ''}
              `}
            >
              {gate}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      {showActions && (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-700">
          {task.status === 'todo' && (
            <>
              <button
                onClick={() => handleStatusChange('in_progress')}
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 transition-colors"
              >
                Start
              </button>
              <button
                onClick={handleAssign}
                className="px-3 py-1 bg-slate-600 text-white rounded text-sm hover:bg-slate-500 transition-colors"
              >
                Assign
              </button>
            </>
          )}

          {task.status === 'in_progress' && (
            <>
              <button
                onClick={() => handleStatusChange('paused')}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-500 transition-colors"
              >
                Pause
              </button>
              <button
                onClick={() => handleStatusChange('completed')}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-500 transition-colors"
              >
                Complete
              </button>
            </>
          )}

          {task.status === 'paused' && (
            <button
              onClick={() => handleStatusChange('in_progress')}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-500 transition-colors"
            >
              Resume
            </button>
          )}
        </div>
      )}
    </article>
  );
}

export default TaskCard;
