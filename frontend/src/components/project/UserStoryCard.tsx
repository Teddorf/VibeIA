'use client';

import React, { useState } from 'react';

// ============================================
// TYPES
// ============================================

export type StoryStatus = 'todo' | 'in_progress' | 'completed';
export type StoryPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'todo' | 'in_progress' | 'completed';

export interface AcceptanceCriterion {
  text: string;
  completed?: boolean;
}

export interface StoryTask {
  id: string;
  name: string;
  status: TaskStatus;
}

export interface Assignee {
  id: string;
  name: string;
  avatar?: string;
}

export interface Epic {
  id: string;
  name: string;
}

export interface UserStory {
  id: string;
  title: string;
  description?: string;
  status: StoryStatus;
  priority?: StoryPriority;
  storyPoints?: number;
  acceptanceCriteria?: (string | AcceptanceCriterion)[];
  tasks?: StoryTask[];
  assignee?: Assignee;
  labels?: string[];
  epic?: Epic;
}

export interface UserStoryCardProps {
  story: UserStory;
  variant?: 'compact' | 'default' | 'expanded';
  draggable?: boolean;
  showPointsLabel?: boolean;
  showTasksProgress?: boolean;
  showActions?: boolean;
  showEpic?: boolean;
  className?: string;
  onClick?: (story: UserStory) => void;
  onStatusChange?: (storyId: string, status: StoryStatus) => void;
  onDragStart?: (e: React.DragEvent, story: UserStory) => void;
}

// ============================================
// ICONS
// ============================================

const CheckIcon = () => (
  <svg
    data-testid="check-icon"
    className="w-3 h-3 text-green-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const DragHandleIcon = () => (
  <svg
    data-testid="drag-handle"
    className="w-4 h-4 text-slate-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const UnassignedIcon = () => (
  <svg
    data-testid="unassigned-indicator"
    className="w-6 h-6 text-slate-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

// ============================================
// HELPER FUNCTIONS
// ============================================

const getStatusIndicatorColor = (status: StoryStatus): string => {
  const colors: Record<StoryStatus, string> = {
    todo: 'bg-slate-500',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
  };
  return colors[status];
};

const getPriorityBadgeClasses = (priority: StoryPriority): { bg: string; text: string } => {
  const classes: Record<StoryPriority, { bg: string; text: string }> = {
    critical: { bg: 'bg-red-500/20', text: 'text-red-400' },
    high: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
    medium: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    low: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  };
  return classes[priority];
};

const getPriorityLabel = (priority: StoryPriority): string => {
  const labels: Record<StoryPriority, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };
  return labels[priority];
};

const getVariantPadding = (variant: 'compact' | 'default' | 'expanded'): string => {
  const paddings = {
    compact: 'p-2',
    default: 'p-4',
    expanded: 'p-6',
  };
  return paddings[variant];
};

const getCriteriaText = (criteria: string | AcceptanceCriterion): string => {
  return typeof criteria === 'string' ? criteria : criteria.text;
};

const getCriteriaCompleted = (criteria: string | AcceptanceCriterion): boolean => {
  return typeof criteria === 'string' ? false : criteria.completed ?? false;
};

// ============================================
// MAIN COMPONENT
// ============================================

export function UserStoryCard({
  story,
  variant = 'default',
  draggable = false,
  showPointsLabel = false,
  showTasksProgress = false,
  showActions = false,
  showEpic = false,
  className = '',
  onClick,
  onStatusChange,
  onDragStart,
}: UserStoryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const isCompact = variant === 'compact';
  const hasOnClick = !!onClick;

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    onClick?.(story);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onClick) {
      onClick(story);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('storyId', story.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStart?.(e, story);
  };

  const handleStartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onStatusChange?.(story.id, 'in_progress');
  };

  const completedTasksCount = story.tasks?.filter(t => t.status === 'completed').length ?? 0;
  const totalTasksCount = story.tasks?.length ?? 0;

  return (
    <article
      data-testid="user-story-card"
      data-status={story.status}
      role="article"
      aria-label={story.title}
      tabIndex={hasOnClick ? 0 : undefined}
      draggable={draggable}
      onClick={hasOnClick ? handleClick : undefined}
      onKeyDown={hasOnClick ? handleKeyDown : undefined}
      onDragStart={draggable ? handleDragStart : undefined}
      className={`
        bg-slate-800 rounded-lg border border-slate-700
        ${hasOnClick ? 'cursor-pointer hover:border-purple-500' : ''}
        ${hasOnClick ? 'focus:outline-none focus:ring-2 focus:ring-purple-500' : ''}
        ${getVariantPadding(variant)}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        {draggable && (
          <div className="flex-shrink-0 mt-1 cursor-grab">
            <DragHandleIcon />
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex-shrink-0 mt-1.5">
          <div
            data-testid="status-indicator"
            className={`w-3 h-3 rounded-full ${getStatusIndicatorColor(story.status)} flex items-center justify-center`}
          >
            {story.status === 'completed' && <CheckIcon />}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3
            data-testid="story-title"
            className="text-sm font-medium text-white truncate"
          >
            {story.title}
          </h3>

          {/* Description (hidden in compact) */}
          {!isCompact && story.description && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{story.description}</p>
          )}

          {/* Epic link */}
          {showEpic && story.epic && (
            <div className="mt-2">
              <span className="text-xs text-purple-400">{story.epic.name}</span>
            </div>
          )}

          {/* Labels */}
          {story.labels && story.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {story.labels.map(label => (
                <span
                  key={label}
                  className="px-1.5 py-0.5 text-xs bg-slate-700 text-slate-300 rounded"
                >
                  {label}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Assignee */}
        <div className="flex-shrink-0">
          {story.assignee ? (
            <div data-testid="assignee-avatar">
              <img
                src={story.assignee.avatar}
                alt={story.assignee.name}
                className="w-6 h-6 rounded-full"
              />
            </div>
          ) : (
            <UnassignedIcon />
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
        <div className="flex items-center gap-2">
          {/* Priority Badge */}
          {story.priority && (
            <span
              data-testid="priority-badge"
              className={`px-1.5 py-0.5 text-xs font-medium rounded ${getPriorityBadgeClasses(story.priority).bg} ${getPriorityBadgeClasses(story.priority).text}`}
            >
              {getPriorityLabel(story.priority)}
            </span>
          )}

          {/* Story Points */}
          {story.storyPoints !== undefined && (
            <span
              data-testid="story-points"
              className="px-1.5 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded font-medium"
            >
              {showPointsLabel ? `${story.storyPoints} pts` : story.storyPoints}
            </span>
          )}

          {/* Tasks Count */}
          {story.tasks && story.tasks.length > 0 && (
            <>
              <span data-testid="tasks-count" className="text-xs text-slate-400">
                {story.tasks.length}
              </span>
              {showTasksProgress && (
                <span data-testid="tasks-progress" className="text-xs text-slate-400">
                  {completedTasksCount}/{totalTasksCount}
                </span>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Acceptance Criteria Count & Expand */}
          {story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
            <>
              <span data-testid="criteria-count" className="text-xs text-slate-500">
                {story.acceptanceCriteria.length}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                aria-label={expanded ? 'Collapse' : 'Expand'}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
              >
                <ChevronIcon expanded={expanded} />
              </button>
            </>
          )}

          {/* Start Action */}
          {showActions && story.status === 'todo' && (
            <button
              onClick={handleStartClick}
              aria-label="Start"
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 transition-colors"
            >
              Start
            </button>
          )}
        </div>
      </div>

      {/* Expanded Acceptance Criteria */}
      {expanded && story.acceptanceCriteria && story.acceptanceCriteria.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <h4 className="text-xs font-medium text-slate-400 mb-2">Acceptance Criteria</h4>
          <ul className="space-y-1">
            {story.acceptanceCriteria.map((criteria, index) => (
              <li
                key={index}
                data-completed={getCriteriaCompleted(criteria)}
                className={`text-xs flex items-center gap-2 ${
                  getCriteriaCompleted(criteria) ? 'text-green-400 line-through' : 'text-slate-300'
                }`}
              >
                {getCriteriaCompleted(criteria) && <CheckIcon />}
                {getCriteriaText(criteria)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

export default UserStoryCard;
