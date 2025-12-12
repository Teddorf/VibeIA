'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  source: string;
}

export interface LogViewerProps {
  logs: LogEntry[];
  variant?: 'compact' | 'default' | 'expanded';
  showTimestamps?: boolean;
  showIcons?: boolean;
  showSource?: boolean;
  showSearch?: boolean;
  showFilters?: boolean;
  showCopyButton?: boolean;
  showExport?: boolean;
  highlightMatches?: boolean;
  autoScroll?: boolean;
  isStreaming?: boolean;
  wrapLongLines?: boolean;
  maxLogs?: number;
  filterLevel?: LogLevel;
  filterSource?: string;
  className?: string;
}

// ============================================
// ICONS
// ============================================

const InfoIcon = () => (
  <svg data-testid="icon-info" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SuccessIcon = () => (
  <svg data-testid="icon-success" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WarningIcon = () => (
  <svg data-testid="icon-warning" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ErrorIcon = () => (
  <svg data-testid="icon-error" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

// ============================================
// HELPER FUNCTIONS
// ============================================

const getLevelColor = (level: LogLevel): string => {
  const colors: Record<LogLevel, string> = {
    info: 'text-blue-400',
    success: 'text-green-400',
    warning: 'text-yellow-400',
    error: 'text-red-400',
    debug: 'text-slate-400',
  };
  return colors[level];
};

const getLevelIcon = (level: LogLevel) => {
  switch (level) {
    case 'info':
    case 'debug':
      return <InfoIcon />;
    case 'success':
      return <SuccessIcon />;
    case 'warning':
      return <WarningIcon />;
    case 'error':
      return <ErrorIcon />;
    default:
      return null;
  }
};

const getVariantTextSize = (variant: 'compact' | 'default' | 'expanded'): string => {
  const sizes = {
    compact: 'text-xs',
    default: 'text-sm',
    expanded: 'text-base',
  };
  return sizes[variant];
};

const formatTimestamp = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
};

const highlightText = (text: string, searchTerm: string): React.ReactNode => {
  if (!searchTerm) return text;

  const regex = new RegExp(`(${searchTerm})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, index) =>
    regex.test(part) ? (
      <span key={index} data-testid="highlight-match" className="bg-yellow-500/30 rounded px-0.5">
        {part}
      </span>
    ) : (
      part
    )
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export function LogViewer({
  logs,
  variant = 'default',
  showTimestamps = false,
  showIcons = false,
  showSource = false,
  showSearch = false,
  showFilters = false,
  showCopyButton = false,
  showExport = false,
  highlightMatches = false,
  autoScroll = false,
  isStreaming = false,
  wrapLongLines = false,
  maxLogs,
  filterLevel,
  filterSource,
  className = '',
}: LogViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [enabledLevels, setEnabledLevels] = useState<Set<LogLevel>>(
    new Set(['info', 'success', 'warning', 'error', 'debug'])
  );
  const [isAtBottom, setIsAtBottom] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = logs;

    // Apply level filter prop
    if (filterLevel) {
      result = result.filter(log => log.level === filterLevel);
    }

    // Apply source filter prop
    if (filterSource) {
      result = result.filter(log => log.source === filterSource);
    }

    // Apply UI level filters
    if (showFilters) {
      result = result.filter(log => enabledLevels.has(log.level));
    }

    // Apply search filter
    if (searchTerm) {
      result = result.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply max logs limit
    if (maxLogs) {
      result = result.slice(-maxLogs);
    }

    return result;
  }, [logs, filterLevel, filterSource, enabledLevels, showFilters, searchTerm, maxLogs]);

  // Auto-scroll effect
  useEffect(() => {
    if (autoScroll && isAtBottom) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll, isAtBottom]);

  // Handle scroll
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
  };

  // Handle level toggle
  const handleLevelToggle = (level: LogLevel) => {
    setEnabledLevels(prev => {
      const next = new Set(prev);
      if (next.has(level)) {
        next.delete(level);
      } else {
        next.add(level);
      }
      return next;
    });
  };

  // Handle copy
  const handleCopy = async (message: string) => {
    await navigator.clipboard.writeText(message);
  };

  // Handle scroll to bottom
  const handleScrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
    setIsAtBottom(true);
  };

  // Empty state
  if (logs.length === 0) {
    return (
      <div
        data-testid="log-viewer"
        role="log"
        aria-live="polite"
        className={`bg-slate-900 rounded-lg p-4 ${getVariantTextSize(variant)} ${className}`}
      >
        <div data-testid="empty-state" className="text-center py-8">
          <p className="text-slate-400">No logs available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="log-viewer"
      role="log"
      aria-live="polite"
      className={`bg-slate-900 rounded-lg border border-slate-700 ${getVariantTextSize(variant)} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-medium">Logs</h3>
          {isStreaming && (
            <div data-testid="streaming-indicator" className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-slate-400">Live</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showExport && (
            <button
              aria-label="Export logs"
              className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
            >
              Export
            </button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      {(showSearch || showFilters) && (
        <div className="p-3 border-b border-slate-700 space-y-2">
          {showSearch && (
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-800 border border-slate-600 rounded text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          )}

          {showFilters && (
            <div className="flex flex-wrap gap-2">
              {(['info', 'success', 'warning', 'error'] as LogLevel[]).map(level => (
                <label key={level} className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={enabledLevels.has(level)}
                    onChange={() => handleLevelToggle(level)}
                    aria-label={level}
                    className="rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500"
                  />
                  <span className={getLevelColor(level)}>{level}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Log Container */}
      <div
        ref={containerRef}
        data-testid="log-container"
        aria-relevant="additions"
        onScroll={handleScroll}
        className="max-h-96 overflow-y-auto p-3 font-mono space-y-1"
      >
        {filteredLogs.map(log => (
          <div
            key={log.id}
            data-testid={`log-entry-${log.id}`}
            data-level={log.level}
            className={`
              flex items-start gap-2 py-1 px-2 rounded hover:bg-slate-800/50
              ${getLevelColor(log.level)}
              ${wrapLongLines ? 'whitespace-pre-wrap' : 'whitespace-nowrap'}
            `}
          >
            {showIcons && <span className="flex-shrink-0 mt-0.5">{getLevelIcon(log.level)}</span>}

            {showTimestamps && (
              <span data-testid={`timestamp-${log.id}`} className="text-slate-500 flex-shrink-0">
                {formatTimestamp(log.timestamp)}
              </span>
            )}

            {showSource && (
              <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-xs flex-shrink-0">
                {log.source}
              </span>
            )}

            <span className="flex-1 min-w-0">
              {highlightMatches && searchTerm
                ? highlightText(log.message, searchTerm)
                : log.message}
            </span>

            {showCopyButton && (
              <button
                onClick={() => handleCopy(log.message)}
                aria-label="Copy log"
                className="flex-shrink-0 p-1 text-slate-500 hover:text-white transition-colors"
              >
                <CopyIcon />
              </button>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Scroll to bottom button */}
      {autoScroll && !isAtBottom && (
        <div className="p-2 border-t border-slate-700 text-center">
          <button
            onClick={handleScrollToBottom}
            aria-label="Scroll to bottom"
            className="px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-500 transition-colors"
          >
            Scroll to bottom
          </button>
        </div>
      )}
    </div>
  );
}

export default LogViewer;
