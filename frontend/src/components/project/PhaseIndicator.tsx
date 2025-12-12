'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// ============================================
// TYPES
// ============================================

export type PhaseStatus = 'pending' | 'current' | 'completed' | 'locked';

export interface Phase {
  id: number;
  name: string;
  status: PhaseStatus;
  href: string;
  description?: string;
  estimatedTime?: string;
}

export interface PhaseIndicatorProps {
  projectId: string;
  currentPhase: number;
  phases: Phase[];
  variant?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showEstimatedTime?: boolean;
  onPhaseClick?: (phase: Phase) => void;
  className?: string;
}

// ============================================
// ICONS
// ============================================

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const LockIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

// ============================================
// HELPER FUNCTIONS
// ============================================

const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
  };
  return sizes[size];
};

const getStatusClasses = (status: PhaseStatus) => {
  const statusStyles = {
    completed: 'bg-green-500 text-white',
    current: 'bg-purple-500 text-white ring-2 ring-purple-300 ring-offset-2 ring-offset-slate-900',
    pending: 'bg-slate-700 text-slate-400 opacity-50',
    locked: 'bg-slate-800 text-slate-500 opacity-50',
  };
  return statusStyles[status];
};

// ============================================
// COMPONENT
// ============================================

export function PhaseIndicator({
  projectId,
  currentPhase,
  phases,
  variant = 'horizontal',
  size = 'md',
  showEstimatedTime = false,
  onPhaseClick,
  className = '',
}: PhaseIndicatorProps) {
  const router = useRouter();
  const [hoveredPhase, setHoveredPhase] = useState<number | null>(null);

  // Calculate progress
  const completedCount = phases.filter(p => p.status === 'completed').length;
  const progressPercentage = phases.length > 0 ? Math.round((completedCount / phases.length) * 100) : 0;

  const handlePhaseClick = (phase: Phase) => {
    // Only navigate if phase is clickable (completed or current)
    if (phase.status === 'completed' || phase.status === 'current') {
      onPhaseClick?.(phase);
      router.push(phase.href);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, phase: Phase) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePhaseClick(phase);
    }
  };

  const isClickable = (status: PhaseStatus) => status === 'completed' || status === 'current';

  return (
    <nav
      aria-label="Phase progress"
      data-testid="phase-indicator"
      className={`
        flex items-center gap-2
        ${variant === 'vertical' ? 'flex-col' : 'flex-row'}
        ${className}
      `}
    >
      {/* Progress Bar */}
      <div
        role="progressbar"
        aria-valuenow={progressPercentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Project progress: ${progressPercentage}%`}
        className="sr-only"
      >
        {progressPercentage}% complete
      </div>

      {/* Visual Progress Bar */}
      <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-700 -translate-y-1/2 -z-10">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Phases */}
      <div className={`flex ${variant === 'vertical' ? 'flex-col gap-4' : 'flex-row gap-4'} relative`}>
        {phases.map((phase, index) => {
          const showTooltip = hoveredPhase === phase.id && phase.description;

          return (
            <div
              key={phase.id}
              className="flex flex-col items-center gap-2 relative"
            >
              {/* Phase Circle */}
              <button
                data-testid={`phase-${phase.id}`}
                data-status={phase.status}
                onClick={() => handlePhaseClick(phase)}
                onKeyDown={(e) => handleKeyDown(e, phase)}
                onMouseEnter={() => setHoveredPhase(phase.id)}
                onMouseLeave={() => setHoveredPhase(null)}
                disabled={!isClickable(phase.status)}
                aria-current={phase.status === 'current' ? 'step' : undefined}
                aria-disabled={!isClickable(phase.status)}
                className={`
                  flex items-center justify-center rounded-full font-semibold
                  transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900
                  ${getSizeClasses(size)}
                  ${getStatusClasses(phase.status)}
                  ${isClickable(phase.status) ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}
                `}
              >
                {phase.status === 'completed' ? (
                  <span data-testid={`check-icon-${phase.id}`}>
                    <CheckIcon />
                  </span>
                ) : phase.status === 'locked' ? (
                  <span data-testid={`lock-icon-${phase.id}`}>
                    <LockIcon />
                  </span>
                ) : (
                  phase.id
                )}
              </button>

              {/* Phase Name */}
              <span className={`text-center ${phase.status === 'current' ? 'text-white font-medium' : 'text-slate-400'}`}>
                {phase.name}
              </span>

              {/* Estimated Time */}
              {showEstimatedTime && phase.estimatedTime && (
                <span className="text-xs text-slate-500">{phase.estimatedTime}</span>
              )}

              {/* Tooltip */}
              {showTooltip && (
                <div
                  role="tooltip"
                  className="absolute -bottom-16 left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-50"
                >
                  {phase.description}
                </div>
              )}

              {/* Connector Line (except last) */}
              {index < phases.length - 1 && variant === 'horizontal' && (
                <div
                  className={`absolute top-4 left-full w-8 h-0.5 ${
                    phase.status === 'completed' ? 'bg-green-500' : 'bg-slate-700'
                  }`}
                  style={{ marginLeft: '0.5rem' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
}

export default PhaseIndicator;
