'use client';

import React, { useState, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export type GateStatus = 'passed' | 'failed' | 'pending' | 'skipped';

export interface GateResult {
  status: GateStatus;
  message: string;
  details: string[];
  progress?: number;
  completedAt?: Date;
  duration?: number;
}

export interface QualityGates {
  [gateName: string]: GateResult;
}

export interface QualityGatePanelProps {
  gates: QualityGates;
  taskId: string;
  variant?: 'compact' | 'default' | 'expanded';
  showTimestamps?: boolean;
  skippableGates?: string[];
  className?: string;
  onRetry?: (gateName: string) => void;
  onSkip?: (gateName: string) => void;
}

// ============================================
// ICONS
// ============================================

const CheckIcon = ({ gateName }: { gateName: string }) => (
  <svg
    data-testid={`check-icon-${gateName}`}
    className="w-5 h-5 text-green-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = ({ gateName }: { gateName: string }) => (
  <svg
    data-testid={`x-icon-${gateName}`}
    className="w-5 h-5 text-red-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const Spinner = ({ gateName }: { gateName: string }) => (
  <svg
    data-testid={`spinner-${gateName}`}
    className="w-5 h-5 text-yellow-500 animate-spin"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const SkipIcon = ({ gateName }: { gateName: string }) => (
  <svg
    data-testid={`skip-icon-${gateName}`}
    className="w-5 h-5 text-slate-400"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
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

// ============================================
// HELPER FUNCTIONS
// ============================================

const getStatusIcon = (status: GateStatus, gateName: string) => {
  switch (status) {
    case 'passed':
      return <CheckIcon gateName={gateName} />;
    case 'failed':
      return <XIcon gateName={gateName} />;
    case 'pending':
      return <Spinner gateName={gateName} />;
    case 'skipped':
      return <SkipIcon gateName={gateName} />;
    default:
      return null;
  }
};

const getStatusBorderColor = (status: GateStatus): string => {
  const colors: Record<GateStatus, string> = {
    passed: 'border-green-500',
    failed: 'border-red-500',
    pending: 'border-yellow-500',
    skipped: 'border-slate-500',
  };
  return colors[status];
};

const formatGateName = (name: string): string => {
  return name.charAt(0).toUpperCase() + name.slice(1);
};

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const getVariantPadding = (variant: 'compact' | 'default' | 'expanded'): string => {
  const paddings = {
    compact: 'p-2',
    default: 'p-4',
    expanded: 'p-6',
  };
  return paddings[variant];
};

// ============================================
// GATE ITEM COMPONENT
// ============================================

interface GateItemProps {
  name: string;
  result: GateResult;
  showTimestamps?: boolean;
  isSkippable?: boolean;
  onRetry?: () => void;
  onSkip?: () => void;
}

const GateItem: React.FC<GateItemProps> = ({
  name,
  result,
  showTimestamps,
  isSkippable,
  onRetry,
  onSkip,
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = result.details && result.details.length > 0;

  return (
    <div
      data-testid={`gate-${name}`}
      data-status={result.status}
      className={`
        bg-slate-800 rounded-lg border-l-4 p-3
        ${getStatusBorderColor(result.status)}
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {getStatusIcon(result.status, name)}
          <div>
            <h4 className="text-white font-medium">{formatGateName(name)}</h4>
            <p
              data-testid={`message-${name}`}
              className="text-sm text-slate-400 truncate max-w-[300px]"
            >
              {result.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Duration */}
          {showTimestamps && result.duration !== undefined && (
            <span className="text-xs text-slate-500">{formatDuration(result.duration)}</span>
          )}

          {/* Progress bar for pending */}
          {result.status === 'pending' && result.progress !== undefined && (
            <div
              data-testid={`progress-${name}`}
              role="progressbar"
              aria-valuenow={result.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden"
            >
              <div
                className="h-full bg-yellow-500"
                style={{ width: `${result.progress}%` }}
              />
            </div>
          )}

          {/* Actions */}
          {result.status === 'failed' && onRetry && (
            <button
              onClick={onRetry}
              aria-label={`Retry ${name}`}
              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-500 transition-colors"
            >
              Retry
            </button>
          )}

          {isSkippable && result.status === 'failed' && onSkip && (
            <button
              onClick={onSkip}
              aria-label={`Skip ${name}`}
              className="px-2 py-1 text-xs bg-slate-600 text-white rounded hover:bg-slate-500 transition-colors"
            >
              Skip
            </button>
          )}

          {/* Expand button */}
          {hasDetails && (
            <button
              data-testid="expand-button"
              onClick={() => setExpanded(!expanded)}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <ChevronIcon expanded={expanded} />
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <ul className="space-y-1">
            {result.details.map((detail, index) => (
              <li key={index} className="text-sm text-slate-400 font-mono">
                {detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export function QualityGatePanel({
  gates,
  taskId,
  variant = 'default',
  showTimestamps = false,
  skippableGates = [],
  className = '',
  onRetry,
  onSkip,
}: QualityGatePanelProps) {
  const gateEntries = Object.entries(gates);

  // Calculate overall status
  const overallStatus = useMemo((): { status: GateStatus; message: string } => {
    if (gateEntries.length === 0) {
      return { status: 'skipped', message: 'No quality gates configured' };
    }

    const statuses = gateEntries.map(([, result]) => result.status);

    if (statuses.includes('failed')) {
      const failedCount = statuses.filter(s => s === 'failed').length;
      return { status: 'failed', message: `${failedCount} gate${failedCount > 1 ? 's' : ''} failed` };
    }

    if (statuses.includes('pending')) {
      return { status: 'pending', message: 'Gates running...' };
    }

    if (statuses.every(s => s === 'passed' || s === 'skipped')) {
      return { status: 'passed', message: 'All gates passed' };
    }

    return { status: 'pending', message: 'Checking...' };
  }, [gateEntries]);

  // Empty state
  if (gateEntries.length === 0) {
    return (
      <div
        data-testid="quality-gate-panel"
        role="region"
        aria-label="Quality gates panel"
        className={`bg-slate-900 rounded-lg ${getVariantPadding(variant)} ${className}`}
      >
        <div data-testid="empty-state" className="text-center py-8">
          <p className="text-slate-400">No quality gates configured</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="quality-gate-panel"
      role="region"
      aria-label="Quality gates panel"
      className={`bg-slate-900 rounded-lg border border-slate-700 ${getVariantPadding(variant)} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Quality Gates</h3>
        <div
          data-testid="overall-status"
          data-status={overallStatus.status}
          role="status"
          className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${overallStatus.status === 'passed' ? 'bg-green-500/20 text-green-400' : ''}
            ${overallStatus.status === 'failed' ? 'bg-red-500/20 text-red-400' : ''}
            ${overallStatus.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : ''}
          `}
        >
          {overallStatus.message}
        </div>
      </div>

      {/* Gate list */}
      <div className="space-y-3">
        {gateEntries.map(([name, result]) => (
          <GateItem
            key={name}
            name={name}
            result={result}
            showTimestamps={showTimestamps}
            isSkippable={skippableGates.includes(name)}
            onRetry={onRetry ? () => onRetry(name) : undefined}
            onSkip={onSkip ? () => onSkip(name) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export default QualityGatePanel;
