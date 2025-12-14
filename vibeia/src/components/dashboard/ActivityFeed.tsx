'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';

// ============================================
// TYPES
// ============================================

export type ActivityType =
  | 'project_created'
  | 'project_updated'
  | 'task_completed'
  | 'task_failed'
  | 'plan_generated'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_paused'
  | 'error'
  | 'comment';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: Date;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskName?: string;
  planId?: string;
  executionId?: string;
  userId?: string;
  userName?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface ActivityFeedProps {
  activities: ActivityItem[];
  isLoading?: boolean;
  maxItems?: number;
  filterType?: ActivityType;
  showFilters?: boolean;
  groupByDate?: boolean;
  onActivityClick?: (activity: ActivityItem) => void;
  onViewAll?: () => void;
}

// ============================================
// ICONS
// ============================================

const ProjectIcon = () => (
  <svg data-testid="icon-project_created" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const TaskCompletedIcon = () => (
  <svg data-testid="icon-task_completed" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const TaskFailedIcon = () => (
  <svg data-testid="icon-task_failed" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const PlanIcon = () => (
  <svg data-testid="icon-plan_generated" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const ExecutionIcon = () => (
  <svg data-testid="icon-execution_started" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon = () => (
  <svg data-testid="icon-error" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const CommentIcon = () => (
  <svg data-testid="icon-comment" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const getActivityIcon = (type: ActivityType) => {
  switch (type) {
    case 'project_created':
    case 'project_updated':
      return <ProjectIcon />;
    case 'task_completed':
      return <TaskCompletedIcon />;
    case 'task_failed':
      return <TaskFailedIcon />;
    case 'plan_generated':
      return <PlanIcon />;
    case 'execution_started':
    case 'execution_completed':
    case 'execution_paused':
      return <ExecutionIcon />;
    case 'error':
      return <ErrorIcon />;
    case 'comment':
      return <CommentIcon />;
    default:
      return <ProjectIcon />;
  }
};

const getActivityColor = (type: ActivityType) => {
  switch (type) {
    case 'project_created':
    case 'project_updated':
      return 'bg-blue-500/20 text-blue-400';
    case 'task_completed':
    case 'execution_completed':
      return 'bg-green-500/20 text-green-400';
    case 'task_failed':
    case 'error':
      return 'bg-red-500/20 text-red-400';
    case 'plan_generated':
      return 'bg-purple-500/20 text-purple-400';
    case 'execution_started':
      return 'bg-cyan-500/20 text-cyan-400';
    case 'execution_paused':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'comment':
      return 'bg-slate-500/20 text-slate-400';
    default:
      return 'bg-slate-500/20 text-slate-400';
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'hace un momento';
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return 'ayer';
  if (diffDays < 7) return `hace ${diffDays} días`;
  return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
};

const getDateGroupLabel = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const activityDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (activityDate.getTime() === today.getTime()) return 'Hoy';
  if (activityDate.getTime() === yesterday.getTime()) return 'Ayer';
  if (activityDate.getTime() >= weekAgo.getTime()) return 'Esta semana';
  return 'Anteriores';
};

// ============================================
// SKELETON LOADER
// ============================================

function ActivitySkeleton() {
  return (
    <div data-testid="activity-skeleton" className="flex items-start gap-3 p-3 animate-pulse">
      <div className="w-10 h-10 rounded-lg bg-slate-700" />
      <div className="flex-1">
        <div className="h-4 w-32 bg-slate-700 rounded mb-2" />
        <div className="h-3 w-48 bg-slate-700 rounded" />
      </div>
      <div className="h-3 w-16 bg-slate-700 rounded" />
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ActivityFeed({
  activities,
  isLoading = false,
  maxItems,
  filterType,
  showFilters = false,
  groupByDate = false,
  onActivityClick,
  onViewAll,
}: ActivityFeedProps) {
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(new Set());
  const [prevActivityIds, setPrevActivityIds] = useState<Set<string>>(new Set());

  // Detect new activities
  useEffect(() => {
    const currentIds = new Set(activities.map((a) => a.id));
    const newIds = new Set<string>();

    currentIds.forEach((id) => {
      if (!prevActivityIds.has(id)) {
        newIds.add(id);
      }
    });

    if (newIds.size > 0 && prevActivityIds.size > 0) {
      setNewActivityIds(newIds);
      // Clear new status after animation
      setTimeout(() => setNewActivityIds(new Set()), 3000);
    }

    setPrevActivityIds(currentIds);
  }, [activities]);

  // Filter and limit activities
  const displayedActivities = useMemo(() => {
    let result = activities;

    if (filterType) {
      result = result.filter((a) => a.type === filterType);
    }

    if (maxItems) {
      result = result.slice(0, maxItems);
    }

    return result;
  }, [activities, filterType, maxItems]);

  // Group by date if enabled
  const groupedActivities = useMemo(() => {
    if (!groupByDate) return null;

    const groups: Record<string, ActivityItem[]> = {};
    displayedActivities.forEach((activity) => {
      const label = getDateGroupLabel(activity.timestamp);
      if (!groups[label]) groups[label] = [];
      groups[label].push(activity);
    });

    return groups;
  }, [displayedActivities, groupByDate]);

  const hasMoreActivities = maxItems && activities.length > maxItems;

  // Loading state
  if (isLoading) {
    return (
      <div data-testid="activity-feed" aria-live="polite" className="space-y-2">
        {[1, 2, 3].map((i) => (
          <ActivitySkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state
  if (activities.length === 0) {
    return (
      <div
        data-testid="activity-feed"
        aria-live="polite"
        className="py-8 text-center"
      >
        <div data-testid="empty-state" className="text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p>No hay actividad reciente</p>
        </div>
      </div>
    );
  }

  // Render activity item
  const renderActivityItem = (activity: ActivityItem) => {
    const isNew = newActivityIds.has(activity.id);
    const isError = activity.type === 'error' || activity.type === 'task_failed';

    return (
      <li
        key={activity.id}
        data-testid={`activity-item-${activity.id}`}
        onClick={() => onActivityClick?.(activity)}
        className={`
          flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer
          hover:bg-slate-700/50
          ${isError ? 'error bg-red-500/5 border-l-2 border-red-500' : ''}
          ${isNew ? 'new bg-purple-500/10 animate-pulse' : ''}
        `}
      >
        <div className={`p-2 rounded-lg ${getActivityColor(activity.type)}`}>
          {getActivityIcon(activity.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-white">{activity.title}</p>
          <p className="text-sm text-slate-400 truncate">{activity.description}</p>
          {activity.projectName && activity.projectId && (
            <Link
              href={`/projects/${activity.projectId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors"
            >
              {activity.projectName}
            </Link>
          )}
        </div>
        <span
          data-testid={`activity-timestamp-${activity.id}`}
          className="text-xs text-slate-500 whitespace-nowrap"
        >
          {formatRelativeTime(activity.timestamp)}
        </span>
      </li>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filter dropdown */}
      {showFilters && (
        <div data-testid="filter-dropdown" className="flex justify-end">
          <select className="px-3 py-1.5 rounded-lg bg-slate-700 border border-slate-600 text-sm text-white">
            <option value="">Todos</option>
            <option value="project_created">Proyectos</option>
            <option value="task_completed">Tareas</option>
            <option value="plan_generated">Planes</option>
            <option value="error">Errores</option>
          </select>
        </div>
      )}

      {/* Activity list */}
      <ul
        data-testid="activity-feed"
        role="list"
        aria-live="polite"
        className="space-y-1"
      >
        {groupByDate && groupedActivities ? (
          Object.entries(groupedActivities).map(([label, items]) => (
            <React.Fragment key={label}>
              <li
                data-testid="date-group-header"
                className="px-3 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider"
              >
                {label}
              </li>
              {items.map(renderActivityItem)}
            </React.Fragment>
          ))
        ) : (
          displayedActivities.map(renderActivityItem)
        )}
      </ul>

      {/* View all button */}
      {hasMoreActivities && (
        <div className="text-center pt-2">
          <button
            onClick={onViewAll}
            className="px-4 py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors"
          >
            Ver todo ({activities.length - (maxItems || 0)} más)
          </button>
        </div>
      )}
    </div>
  );
}

export default ActivityFeed;
