'use client';

import React from 'react';

// ============================================
// TYPES
// ============================================

export interface DashboardStatsData {
  totalProjects: number;
  activeProjects: number;
  completedTasks: number;
  pendingTasks: number;
  totalPlans: number;
  successRate: number;
  trends?: {
    totalProjects?: number;
    activeProjects?: number;
    completedTasks?: number;
    pendingTasks?: number;
    successRate?: number;
  };
}

export interface DashboardStatsProps {
  stats: DashboardStatsData | null;
  isLoading?: boolean;
  variant?: 'full' | 'compact';
  showTrends?: boolean;
}

// ============================================
// ICONS
// ============================================

const FolderIcon = () => (
  <svg data-testid="stat-icon-projects" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
  </svg>
);

const ActiveIcon = () => (
  <svg data-testid="stat-icon-active" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const CheckIcon = () => (
  <svg data-testid="stat-icon-completed" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ClockIcon = () => (
  <svg data-testid="stat-icon-pending" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg data-testid="stat-icon-success" className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const TrendUpIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

// ============================================
// STAT CARD COMPONENT
// ============================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  trend?: number;
  showTrend?: boolean;
  color: string;
  bgColor: string;
}

function StatCard({ icon, label, value, trend, showTrend, color, bgColor }: StatCardProps) {
  const ariaLabel = `${value} ${label.toLowerCase()}`;

  return (
    <li
      role="listitem"
      aria-label={ariaLabel}
      className={`p-4 rounded-xl ${bgColor} border border-slate-700/50`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-slate-400">{label}</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-bold text-white">{value}</p>
            {showTrend && trend !== undefined && trend !== 0 && (
              <span
                data-testid={trend > 0 ? 'trend-positive' : 'trend-negative'}
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  trend > 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {trend > 0 ? <TrendUpIcon /> : <TrendDownIcon />}
                {trend > 0 ? '+' : ''}{trend}%
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

// ============================================
// SKELETON LOADER
// ============================================

function StatSkeleton() {
  return (
    <div data-testid="stat-skeleton" className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-slate-700" />
        <div className="flex-1">
          <div className="h-4 w-24 bg-slate-700 rounded mb-2" />
          <div className="h-8 w-16 bg-slate-700 rounded" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function DashboardStats({
  stats,
  isLoading = false,
  variant = 'full',
  showTrends = false,
}: DashboardStatsProps) {
  const isCompact = variant === 'compact';

  // Loading state
  if (isLoading || !stats) {
    return (
      <div
        data-testid="stats-container"
        className={`grid gap-4 ${isCompact ? 'grid-cols-2 compact' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}
      >
        {[1, 2, 3, 4].map((i) => (
          <StatSkeleton key={i} />
        ))}
      </div>
    );
  }

  const statItems = [
    {
      icon: <FolderIcon />,
      label: 'Proyectos Totales',
      value: stats.totalProjects,
      trend: stats.trends?.totalProjects,
      color: 'bg-blue-500/20 text-blue-400',
      bgColor: 'bg-slate-800/50',
    },
    {
      icon: <ActiveIcon />,
      label: 'Proyectos Activos',
      value: stats.activeProjects,
      trend: stats.trends?.activeProjects,
      color: 'bg-purple-500/20 text-purple-400',
      bgColor: 'bg-slate-800/50',
    },
    {
      icon: <CheckIcon />,
      label: 'Tareas Completadas',
      value: stats.completedTasks,
      trend: stats.trends?.completedTasks,
      color: 'bg-green-500/20 text-green-400',
      bgColor: 'bg-slate-800/50',
    },
    {
      icon: <ClockIcon />,
      label: 'Tareas Pendientes',
      value: stats.pendingTasks,
      trend: stats.trends?.pendingTasks,
      color: 'bg-yellow-500/20 text-yellow-400',
      bgColor: 'bg-slate-800/50',
    },
    {
      icon: <ChartIcon />,
      label: 'Tasa de Éxito',
      value: `${stats.successRate}%`,
      trend: stats.trends?.successRate,
      color: 'bg-cyan-500/20 text-cyan-400',
      bgColor: 'bg-slate-800/50',
    },
  ];

  return (
    <ul
      data-testid="stats-container"
      role="list"
      className={`grid gap-4 ${isCompact ? 'grid-cols-2 compact' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}
    >
      {statItems.map((item, index) => (
        <StatCard
          key={index}
          icon={item.icon}
          label={item.label}
          value={item.value}
          trend={item.trend}
          showTrend={showTrends}
          color={item.color}
          bgColor={item.bgColor}
        />
      ))}
    </ul>
  );
}

export default DashboardStats;
