'use client';

import React, { useState, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'failed' | 'paused';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Assignee {
  id: string;
  name: string;
  avatar?: string;
}

export interface SprintTask {
  id: string;
  name: string;
  status: TaskStatus;
  estimatedTime: number;
  priority?: TaskPriority;
  assignee?: Assignee | null;
  description?: string;
}

export interface SprintBoardProps {
  tasks: SprintTask[];
  sprintName: string;
  startDate?: Date;
  endDate?: Date;
  variant?: 'compact' | 'default';
  enableDragDrop?: boolean;
  showFailedColumn?: boolean;
  filterByAssignee?: string;
  filterByPriority?: TaskPriority;
  className?: string;
  onTaskClick?: (task: SprintTask) => void;
  onTaskMove?: (taskId: string, newStatus: TaskStatus) => void;
}

// ============================================
// CONSTANTS
// ============================================

const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: 'todo', label: 'To Do' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
];

const FAILED_COLUMN = { id: 'failed' as TaskStatus, label: 'Failed' };

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const getDaysRemaining = (endDate: Date): number => {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// ============================================
// TASK CARD COMPONENT
// ============================================

interface TaskCardProps {
  task: SprintTask;
  draggable: boolean;
  onClick?: (task: SprintTask) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, draggable, onClick, onDragStart }) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(e, task.id);
  };

  return (
    <div
      data-testid={`task-card-${task.id}`}
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onClick={() => onClick?.(task)}
      className={`
        p-3 bg-slate-700 rounded-lg border border-slate-600
        ${onClick ? 'cursor-pointer hover:bg-slate-650' : ''}
        ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}
      `}
    >
      <h4 className="text-white font-medium text-sm truncate">{task.name}</h4>
      {task.description && (
        <p className="text-slate-400 text-xs mt-1 line-clamp-2">{task.description}</p>
      )}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-slate-400 text-xs">{task.estimatedTime} min</span>
        {task.priority && (
          <span className={`
            px-1.5 py-0.5 rounded text-xs font-medium
            ${task.priority === 'critical' ? 'bg-red-500/20 text-red-400' : ''}
            ${task.priority === 'high' ? 'bg-orange-500/20 text-orange-400' : ''}
            ${task.priority === 'medium' ? 'bg-blue-500/20 text-blue-400' : ''}
            ${task.priority === 'low' ? 'bg-slate-500/20 text-slate-400' : ''}
          `}>
            {task.priority}
          </span>
        )}
      </div>
    </div>
  );
};

// ============================================
// COLUMN COMPONENT
// ============================================

interface ColumnProps {
  id: TaskStatus;
  label: string;
  tasks: SprintTask[];
  enableDragDrop: boolean;
  onTaskClick?: (task: SprintTask) => void;
  onDrop?: (taskId: string, status: TaskStatus) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

const Column: React.FC<ColumnProps> = ({
  id,
  label,
  tasks,
  enableDragDrop,
  onTaskClick,
  onDrop,
  onDragStart,
}) => {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      onDrop?.(taskId, id);
    }
  };

  return (
    <div
      data-testid={`column-${id}`}
      role="region"
      aria-label={`${label} column`}
      onDragOver={enableDragDrop ? handleDragOver : undefined}
      onDrop={enableDragDrop ? handleDrop : undefined}
      className="flex-1 min-w-[250px] bg-slate-800/50 rounded-lg p-3"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold">{label}</h3>
        <span
          data-testid={`count-${id}`}
          className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-sm"
        >
          {tasks.length}
        </span>
      </div>
      <div className="space-y-2">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            draggable={enableDragDrop}
            onClick={onTaskClick}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export function SprintBoard({
  tasks,
  sprintName,
  startDate,
  endDate,
  variant = 'default',
  enableDragDrop = false,
  showFailedColumn = false,
  filterByAssignee,
  filterByPriority,
  className = '',
  onTaskClick,
  onTaskMove,
}: SprintBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (filterByAssignee && task.assignee?.id !== filterByAssignee) return false;
      if (filterByPriority && task.priority !== filterByPriority) return false;
      return true;
    });
  }, [tasks, filterByAssignee, filterByPriority]);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<TaskStatus, SprintTask[]> = {
      todo: [],
      in_progress: [],
      completed: [],
      failed: [],
      paused: [],
    };
    filteredTasks.forEach(task => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    return grouped;
  }, [filteredTasks]);

  // Calculate progress
  const completedCount = tasksByStatus.completed.length;
  const totalCount = filteredTasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Calculate time
  const totalTime = filteredTasks.reduce((sum, t) => sum + t.estimatedTime, 0);
  const completedTime = tasksByStatus.completed.reduce((sum, t) => sum + t.estimatedTime, 0);
  const remainingTime = totalTime - completedTime;

  // Days remaining
  const daysRemaining = endDate ? getDaysRemaining(endDate) : null;

  // Columns to render
  const columns = showFailedColumn ? [...COLUMNS, FAILED_COLUMN] : COLUMNS;

  const handleDragStart = (_e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
  };

  const handleDrop = (taskId: string, newStatus: TaskStatus) => {
    setDraggedTaskId(null);
    onTaskMove?.(taskId, newStatus);
  };

  // Empty state
  if (tasks.length === 0) {
    return (
      <div
        data-testid="sprint-board"
        className={`bg-slate-900 rounded-lg p-6 ${className}`}
      >
        <div data-testid="empty-state" className="text-center py-12">
          <p className="text-slate-400">No tasks in this sprint</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="sprint-board"
      className={`
        bg-slate-900 rounded-lg border border-slate-700
        ${variant === 'compact' ? 'gap-2 p-3' : 'gap-4 p-4'}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-white">{sprintName}</h2>
          {(startDate || endDate) && (
            <div data-testid="sprint-dates" className="text-sm text-slate-400 mt-1">
              {startDate && formatDate(startDate)}
              {startDate && endDate && ' - '}
              {endDate && formatDate(endDate)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {daysRemaining !== null && (
            <span data-testid="days-remaining" className="text-slate-300">
              {daysRemaining} days
            </span>
          )}
          <div className="text-right">
            <div data-testid="total-time" className="text-slate-300 text-sm">
              {totalTime} min
            </div>
            <div data-testid="remaining-time" className="text-slate-400 text-xs">
              {remainingTime} min remaining
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-slate-400">Progress</span>
          <span className="text-sm text-slate-300">{progressPercent}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Sprint progress"
          className="h-2 bg-slate-700 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Columns */}
      <div className={`flex ${variant === 'compact' ? 'gap-2' : 'gap-4'} overflow-x-auto`}>
        {columns.map(column => (
          <Column
            key={column.id}
            id={column.id}
            label={column.label}
            tasks={tasksByStatus[column.id]}
            enableDragDrop={enableDragDrop}
            onTaskClick={onTaskClick}
            onDrop={handleDrop}
            onDragStart={handleDragStart}
          />
        ))}
      </div>
    </div>
  );
}

export default SprintBoard;
