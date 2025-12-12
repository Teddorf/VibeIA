'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// ============================================
// TYPES
// ============================================

export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface TeamMember {
  id: string;
  name: string;
  avatar?: string;
}

export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks?: number;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  progress?: number;
  currentPhase?: string;
  createdAt?: Date;
  updatedAt?: Date;
  team?: TeamMember[];
  stats?: ProjectStats;
  isFavorite?: boolean;
}

export interface ProjectCardProps {
  project: Project;
  variant?: 'compact' | 'default' | 'expanded';
  showTimestamps?: boolean;
  showCreated?: boolean;
  showMenu?: boolean;
  showTeam?: boolean;
  showStats?: boolean;
  className?: string;
  onClick?: (project: Project) => void;
  onEdit?: (projectId: string) => void;
  onArchive?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
}

// ============================================
// ICONS
// ============================================

const PhaseIcon = () => (
  <svg
    data-testid="phase-icon"
    className="w-4 h-4 text-purple-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const StarIcon = () => (
  <svg
    data-testid="favorite-icon"
    className="w-4 h-4 text-yellow-400 fill-current"
    viewBox="0 0 24 24"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
  </svg>
);

// ============================================
// HELPER FUNCTIONS
// ============================================

const getStatusBadgeClasses = (status: ProjectStatus): { bg: string; text: string } => {
  const classes: Record<ProjectStatus, { bg: string; text: string }> = {
    active: { bg: 'bg-green-500/20', text: 'text-green-400' },
    paused: { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
    completed: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
    archived: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  };
  return classes[status];
};

const getStatusLabel = (status: ProjectStatus): string => {
  const labels: Record<ProjectStatus, string> = {
    active: 'Active',
    paused: 'Paused',
    completed: 'Completed',
    archived: 'Archived',
  };
  return labels[status];
};

const getVariantPadding = (variant: 'compact' | 'default' | 'expanded'): string => {
  const paddings = {
    compact: 'p-3',
    default: 'p-4',
    expanded: 'p-6',
  };
  return paddings[variant];
};

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// ============================================
// MENU COMPONENT
// ============================================

interface MenuProps {
  isOpen: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

const Menu: React.FC<MenuProps> = ({ isOpen, onEdit, onArchive, onDelete }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-8 z-10 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1">
      <button
        role="menuitem"
        onClick={onEdit}
        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
      >
        Edit
      </button>
      <button
        role="menuitem"
        onClick={onArchive}
        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700"
      >
        Archive
      </button>
      <button
        role="menuitem"
        onClick={onDelete}
        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-slate-700"
      >
        Delete
      </button>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export function ProjectCard({
  project,
  variant = 'default',
  showTimestamps = false,
  showCreated = false,
  showMenu = false,
  showTeam = false,
  showStats = false,
  className = '',
  onClick,
  onEdit,
  onArchive,
  onDelete,
}: ProjectCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick(project);
    } else {
      router.push(`/projects/${project.id}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleClick();
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(project.id);
    setMenuOpen(false);
  };

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    onArchive?.(project.id);
    setMenuOpen(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.(project.id);
    setMenuOpen(false);
  };

  const statusClasses = getStatusBadgeClasses(project.status);
  const isCompact = variant === 'compact';

  return (
    <article
      data-testid="project-card"
      role="article"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={project.name}
      className={`
        bg-slate-800 rounded-lg border border-slate-700 cursor-pointer
        transition-all duration-200
        hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/10
        focus:outline-none focus:ring-2 focus:ring-purple-500
        ${getVariantPadding(variant)}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {project.isFavorite && <StarIcon />}
          <h3
            data-testid="project-name"
            className="text-lg font-semibold text-white truncate"
          >
            {project.name}
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            data-testid="status-badge"
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${statusClasses.bg} ${statusClasses.text}`}
          >
            {getStatusLabel(project.status)}
          </span>

          {showMenu && (
            <div className="relative">
              <button
                onClick={handleMenuClick}
                aria-label="Menu"
                className="p-1 text-slate-400 hover:text-white rounded transition-colors"
              >
                <MenuIcon />
              </button>
              <Menu
                isOpen={menuOpen}
                onEdit={handleEdit}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            </div>
          )}
        </div>
      </div>

      {/* Description (hidden in compact) */}
      {!isCompact && project.description && (
        <p className="text-sm text-slate-400 mb-3 line-clamp-2">{project.description}</p>
      )}

      {/* Progress */}
      {project.progress !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400">Progress</span>
            <span className="text-xs font-medium text-white">{project.progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={project.progress}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1.5 bg-slate-700 rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${project.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Current Phase */}
      {project.currentPhase && (
        <div className="flex items-center gap-2 mb-3">
          <PhaseIcon />
          <span className="text-sm text-slate-300">{project.currentPhase}</span>
        </div>
      )}

      {/* Statistics */}
      {showStats && project.stats && (
        <div className="flex items-center gap-4 mb-3">
          <div className="text-center">
            <span data-testid="stats-total" className="text-lg font-semibold text-white">
              {project.stats.totalTasks}
            </span>
            <span className="text-xs text-slate-400 block">Total</span>
          </div>
          <div className="text-center">
            <span data-testid="stats-completed" className="text-lg font-semibold text-green-400">
              {project.stats.completedTasks}
            </span>
            <span className="text-xs text-slate-400 block">Done</span>
          </div>
        </div>
      )}

      {/* Team Members */}
      {showTeam && project.team && project.team.length > 0 && (
        <div className="flex items-center justify-between mb-3">
          <div data-testid="team-avatars" className="flex -space-x-2">
            {project.team.slice(0, 3).map(member => (
              member.avatar ? (
                <img
                  key={member.id}
                  src={member.avatar}
                  alt={member.name}
                  className="w-8 h-8 rounded-full border-2 border-slate-800"
                />
              ) : (
                <div
                  key={member.id}
                  className="w-8 h-8 rounded-full bg-slate-600 border-2 border-slate-800 flex items-center justify-center text-xs text-white"
                >
                  {member.name.charAt(0)}
                </div>
              )
            ))}
          </div>
          <span data-testid="team-count" className="text-xs text-slate-400">
            {project.team.length}
          </span>
        </div>
      )}

      {/* Timestamps */}
      {showTimestamps && (
        <div className="flex items-center gap-4 text-xs text-slate-500 pt-3 border-t border-slate-700">
          {showCreated && project.createdAt && (
            <span data-testid="created-at">Created: {formatDate(project.createdAt)}</span>
          )}
          {project.updatedAt && (
            <span data-testid="updated-at">Updated: {formatDate(project.updatedAt)}</span>
          )}
        </div>
      )}
    </article>
  );
}

export default ProjectCard;
