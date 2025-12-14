/**
 * KanbanBoard Component
 * Drag-and-drop task management board
 */
'use client';

import React, { useState, useCallback, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: 'low' | 'medium' | 'high';
  estimatedTime?: number;
  assignee?: {
    id: string;
    name: string;
    avatar?: string;
  };
  labels?: string[];
  completedAt?: Date;
  errorMessage?: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  color: 'slate' | 'blue' | 'green' | 'red' | 'yellow' | 'purple';
}

export interface KanbanBoardProps {
  tasks: KanbanTask[];
  columns: KanbanColumn[];
  onTaskMove?: (taskId: string, newStatus: string) => void;
  onTaskClick?: (task: KanbanTask) => void;
  onAddTask?: (columnId: string) => void;
  isDragDisabled?: boolean;
  isLoading?: boolean;
  showSearch?: boolean;
  showContextMenu?: boolean;
  filterPriority?: 'low' | 'medium' | 'high';
  filterAssignee?: string;
  filterLabel?: string;
}

// ============================================
// CONSTANTS
// ============================================

const COLUMN_COLORS: Record<string, { bg: string; border: string; header: string }> = {
  slate: { bg: 'bg-slate-800/50', border: 'border-slate-700', header: 'bg-slate-700' },
  blue: { bg: 'bg-blue-900/30', border: 'border-blue-700', header: 'bg-blue-700' },
  green: { bg: 'bg-green-900/30', border: 'border-green-700', header: 'bg-green-700' },
  red: { bg: 'bg-red-900/30', border: 'border-red-700', header: 'bg-red-700' },
  yellow: { bg: 'bg-yellow-900/30', border: 'border-yellow-700', header: 'bg-yellow-700' },
  purple: { bg: 'bg-purple-900/30', border: 'border-purple-700', header: 'bg-purple-700' },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-500',
  medium: 'bg-yellow-500',
  high: 'bg-red-500',
};

// ============================================
// SUB-COMPONENTS
// ============================================

const PriorityIndicator: React.FC<{ priority: string }> = ({ priority }) => (
  <div
    data-testid={`priority-${priority}`}
    className={`w-2 h-2 rounded-full ${PRIORITY_COLORS[priority] || 'bg-slate-500'}`}
    title={`Prioridad: ${priority}`}
  />
);

const AssigneeAvatar: React.FC<{ assignee: KanbanTask['assignee'] }> = ({ assignee }) => {
  if (!assignee) return null;

  return (
    <div data-testid="assignee-avatar" className="flex items-center gap-1">
      {assignee.avatar ? (
        <img
          src={assignee.avatar}
          alt={assignee.name}
          className="w-6 h-6 rounded-full"
        />
      ) : (
        <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs text-white">
          {assignee.name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
};

const TaskLabel: React.FC<{ label: string }> = ({ label }) => (
  <span className="px-2 py-0.5 text-xs rounded-full bg-slate-600 text-slate-200">
    {label}
  </span>
);

const TaskSkeleton: React.FC = () => (
  <div data-testid="task-skeleton" className="p-3 rounded-lg bg-slate-700/50 animate-pulse">
    <div className="h-4 bg-slate-600 rounded w-3/4 mb-2" />
    <div className="h-3 bg-slate-600 rounded w-1/2" />
  </div>
);

const ContextMenu: React.FC<{
  x: number;
  y: number;
  onClose: () => void;
}> = ({ x, y, onClose }) => (
  <div
    data-testid="context-menu"
    className="fixed z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[150px]"
    style={{ left: x, top: y }}
    onClick={onClose}
  >
    <button className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700">
      Editar
    </button>
    <button className="w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700">
      Duplicar
    </button>
    <button className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700">
      Eliminar
    </button>
  </div>
);

// ============================================
// TASK CARD COMPONENT
// ============================================

interface TaskCardProps {
  task: KanbanTask;
  isDragDisabled?: boolean;
  onClick?: (task: KanbanTask) => void;
  onContextMenu?: (e: React.MouseEvent, task: KanbanTask) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  isDragDisabled = false,
  onClick,
  onContextMenu,
}) => {
  const handleClick = () => {
    onClick?.(task);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(task);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu?.(e, task);
  };

  return (
    <div
      data-testid={`task-card-${task.id}`}
      draggable={!isDragDisabled}
      className="p-3 rounded-lg bg-slate-700/70 border border-slate-600 hover:border-purple-500 transition-colors cursor-pointer"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onContextMenu={handleContextMenu}
      tabIndex={0}
      role="button"
      aria-label={`Tarea: ${task.title}. Prioridad: ${task.priority}. ${task.description || ''}`}
    >
      {/* Header with priority and time */}
      <div className="flex items-center justify-between mb-2">
        <PriorityIndicator priority={task.priority} />
        {task.estimatedTime && (
          <span className="text-xs text-slate-400">{task.estimatedTime} min</span>
        )}
      </div>

      {/* Title */}
      <h4 className="text-sm font-medium text-white mb-1">{task.title}</h4>

      {/* Description */}
      {task.description && (
        <p className="text-xs text-slate-400 mb-2 line-clamp-2">{task.description}</p>
      )}

      {/* Error message for failed tasks */}
      {task.errorMessage && (
        <p className="text-xs text-red-400 mb-2 bg-red-900/30 p-2 rounded">
          {task.errorMessage}
        </p>
      )}

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {task.labels.map((label) => (
            <TaskLabel key={label} label={label} />
          ))}
        </div>
      )}

      {/* Footer with assignee */}
      {task.assignee && (
        <div className="flex items-center justify-end mt-2">
          <AssigneeAvatar assignee={task.assignee} />
        </div>
      )}
    </div>
  );
};

// ============================================
// COLUMN COMPONENT
// ============================================

interface ColumnProps {
  column: KanbanColumn;
  tasks: KanbanTask[];
  isDragDisabled?: boolean;
  isLoading?: boolean;
  onTaskClick?: (task: KanbanTask) => void;
  onTaskContextMenu?: (e: React.MouseEvent, task: KanbanTask) => void;
  onAddTask?: (columnId: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, columnId: string) => void;
  isDragOver: boolean;
}

const Column: React.FC<ColumnProps> = ({
  column,
  tasks,
  isDragDisabled,
  isLoading,
  onTaskClick,
  onTaskContextMenu,
  onAddTask,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
  isDragOver,
}) => {
  const colors = COLUMN_COLORS[column.color] || COLUMN_COLORS.slate;

  return (
    <div
      data-testid={`column-${column.id}`}
      className={`flex flex-col w-72 min-w-72 rounded-lg ${colors.bg} border ${colors.border} ${
        isDragOver ? 'drag-over ring-2 ring-purple-500' : ''
      }`}
      role="region"
      aria-label={column.title}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, column.id)}
    >
      {/* Column Header */}
      <div className={`p-3 rounded-t-lg ${colors.header}`}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">{column.title}</h3>
          <span
            data-testid={`count-${column.id}`}
            className="px-2 py-0.5 text-xs rounded-full bg-white/20 text-white"
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Tasks */}
      <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[calc(100vh-250px)]">
        {isLoading ? (
          <>
            <TaskSkeleton />
            <TaskSkeleton />
            <TaskSkeleton />
          </>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No hay tareas</p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isDragDisabled={isDragDisabled}
              onClick={onTaskClick}
              onContextMenu={onTaskContextMenu}
            />
          ))
        )}
      </div>

      {/* Add Task Button */}
      {onAddTask && (
        <div className="p-2 border-t border-slate-700">
          <button
            onClick={() => onAddTask(column.id)}
            className="w-full py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            + Agregar tarea
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  tasks,
  columns,
  onTaskMove,
  onTaskClick,
  onAddTask,
  isDragDisabled = false,
  isLoading = false,
  showSearch = false,
  showContextMenu = false,
  filterPriority,
  filterAssignee,
  filterLabel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    task: KanbanTask;
  } | null>(null);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Priority filter
      if (filterPriority && task.priority !== filterPriority) return false;

      // Assignee filter
      if (filterAssignee && task.assignee?.id !== filterAssignee) return false;

      // Label filter
      if (filterLabel && !task.labels?.includes(filterLabel)) return false;

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(term);
        const matchesDescription = task.description?.toLowerCase().includes(term);
        if (!matchesTitle && !matchesDescription) return false;
      }

      return true;
    });
  }, [tasks, filterPriority, filterAssignee, filterLabel, searchTerm]);

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<string, KanbanTask[]> = {};
    columns.forEach((col) => {
      grouped[col.id] = filteredTasks.filter((task) => task.status === col.id);
    });
    return grouped;
  }, [filteredTasks, columns]);

  // Drag handlers
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    if (e.dataTransfer) {
      e.dataTransfer.setData('taskId', taskId);
      e.dataTransfer.effectAllowed = 'move';
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumnId(columnId);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the column entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverColumnId(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, columnId: string) => {
      e.preventDefault();
      const taskId = e.dataTransfer?.getData('taskId') || draggedTaskId;
      if (taskId && onTaskMove) {
        onTaskMove(taskId, columnId);
      }
      setDraggedTaskId(null);
      setDragOverColumnId(null);
    },
    [draggedTaskId, onTaskMove]
  );

  // Context menu handler
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, task: KanbanTask) => {
      if (!showContextMenu) return;
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, task });
    },
    [showContextMenu]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Close context menu on click outside
  React.useEffect(() => {
    if (contextMenu) {
      const handleClick = () => closeContextMenu();
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu, closeContextMenu]);

  // Empty state
  if (!isLoading && tasks.length === 0) {
    return (
      <div data-testid="kanban-board" className="overflow-x-auto">
        <div data-testid="empty-board" className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <svg
              className="w-16 h-16 mx-auto text-slate-500 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-lg font-medium text-white mb-1">No hay tareas</h3>
            <p className="text-slate-400">Crea una tarea para comenzar</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="kanban-board" className="space-y-4 overflow-x-auto">
      {/* Search */}
      {showSearch && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar tareas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      )}

      {/* Columns */}
      <div className="flex gap-4 pb-4">
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={tasksByColumn[column.id] || []}
            isDragDisabled={isDragDisabled}
            isLoading={isLoading}
            onTaskClick={onTaskClick}
            onTaskContextMenu={handleContextMenu}
            onAddTask={onAddTask}
            onDragOver={handleDragOver}
            onDragEnter={(e) => handleDragEnter(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            isDragOver={dragOverColumnId === column.id}
          />
        ))}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} />
      )}
    </div>
  );
};

export default KanbanBoard;
