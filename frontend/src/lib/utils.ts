import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Format a date to a readable string
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormatOptions (defaults to short month, numeric day/year)
 */
export function formatDate(
  date: Date | string | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  },
  locale: string = 'en-US'
): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale, options);
}

// ============================================
// STATUS COLOR UTILITIES
// ============================================

export type TaskStatus = 'todo' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
export type ProjectStatus = 'active' | 'completed' | 'paused' | 'failed' | 'archived';

/**
 * Get simple background color class for a task status
 */
export function getTaskStatusColor(status: TaskStatus): string {
  const colors: Record<string, string> = {
    todo: 'bg-slate-500',
    pending: 'bg-slate-500',
    in_progress: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    paused: 'bg-yellow-500',
  };
  return colors[status] || 'bg-slate-500';
}

/**
 * Get full badge classes for status display (bg, text, border)
 */
export function getStatusBadgeClasses(status: string): string {
  const classes: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    in_progress: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    paused: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
    active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    pending: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    todo: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };
  return classes[status] || 'bg-slate-500/20 text-slate-400 border-slate-500/30';
}

// ============================================
// STRING UTILITIES
// ============================================

/**
 * Get initials from a name (e.g., "John Doe" -> "JD")
 * @param name - Full name
 * @param maxLength - Maximum number of initials (default: 2)
 */
export function getInitials(name: string, maxLength: number = 2): string {
  if (!name) return '';
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, maxLength);
}

// ============================================
// PRIORITY UTILITIES
// ============================================

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export function getPriorityStyle(priority: TaskPriority): { bg: string; text: string; label: string } {
  const styles: Record<TaskPriority, { bg: string; text: string; label: string }> = {
    low: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Low' },
    medium: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Medium' },
    high: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'High' },
    critical: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Critical' },
  };
  return styles[priority] || styles.medium;
}
