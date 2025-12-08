'use client';

import { useState, useEffect } from 'react';
import { errorHandlingApi } from '@/lib/api-client';

interface ErrorInfo {
  type: string;
  message: string;
  code?: string;
  recoverable: boolean;
  suggestedAction?: string;
}

interface RetryInfo {
  retryable: boolean;
  maxRetries: number;
  initialDelay: number;
  currentAttempt?: number;
}

interface RecoveryInfo {
  strategy: string;
  confidence: number;
  details: string;
  suggestedActions: string[];
}

interface RollbackResult {
  actionId: string;
  success: boolean;
  error?: string;
  duration?: number;
}

interface CostAvoided {
  vercel: { monthly: number; tier: string };
  railway: { monthly: number; tier: string };
  neon: { monthly: number; tier: string };
  totalMonthly: number;
  message: string;
}

interface ErrorRecoveryUIProps {
  setupId: string;
  error: ErrorInfo;
  taskName?: string;
  onRetry?: () => void;
  onCancel?: () => void;
  onRollbackComplete?: () => void;
  tokens?: { neon?: string; vercel?: string; railway?: string };
}

export default function ErrorRecoveryUI({
  setupId,
  error,
  taskName,
  onRetry,
  onCancel,
  onRollbackComplete,
  tokens,
}: ErrorRecoveryUIProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<{
    error: ErrorInfo;
    retry: RetryInfo;
    recovery: RecoveryInfo;
    nextSteps: string[];
  } | null>(null);
  const [rollbackProgress, setRollbackProgress] = useState<{
    status: string;
    progress: number;
    results?: RollbackResult[];
    costAvoided?: CostAvoided;
  } | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  useEffect(() => {
    analyzeError();
  }, [error]);

  useEffect(() => {
    if (retryCountdown !== null && retryCountdown > 0) {
      const timer = setTimeout(() => {
        setRetryCountdown(retryCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (retryCountdown === 0) {
      handleRetry();
    }
  }, [retryCountdown]);

  const analyzeError = async () => {
    try {
      const result = await errorHandlingApi.analyzeError({
        errorMessage: error.message,
        errorCode: error.code,
        setupId,
        taskName,
      });
      setAnalysis(result);
    } catch {
      console.error('Failed to analyze error');
    }
  };

  const handleRetry = async () => {
    setRetryCountdown(null);
    if (onRetry) {
      onRetry();
    }
  };

  const handleAutoRetry = () => {
    if (analysis?.retry.initialDelay) {
      setRetryCountdown(Math.ceil(analysis.retry.initialDelay / 1000));
    } else {
      handleRetry();
    }
  };

  const handleRollback = async () => {
    setLoading(true);
    setRollbackProgress({ status: 'in_progress', progress: 0 });

    try {
      const result = await errorHandlingApi.rollback({
        setupId,
        reason: `Error recovery: ${error.message}`,
        tokens,
      });

      setRollbackProgress({
        status: result.success ? 'completed' : 'failed',
        progress: 100,
        results: result.results,
        costAvoided: result.costAvoided,
      });

      if (result.success && onRollbackComplete) {
        onRollbackComplete();
      }
    } catch (err) {
      setRollbackProgress({
        status: 'failed',
        progress: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const getErrorIcon = () => {
    switch (error.type) {
      case 'network':
      case 'timeout':
        return '🌐';
      case 'rate_limit':
        return '⏱️';
      case 'auth':
        return '🔐';
      case 'validation':
        return '📝';
      case 'quota':
        return '📊';
      case 'server':
        return '🖥️';
      default:
        return '⚠️';
    }
  };

  const getErrorColor = () => {
    switch (error.type) {
      case 'network':
      case 'timeout':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'rate_limit':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'auth':
      case 'validation':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'quota':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (rollbackProgress?.status === 'completed') {
    return (
      <div className="border rounded-lg p-6 space-y-6 bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <span className="text-3xl">✅</span>
          <div>
            <h3 className="text-lg font-semibold text-green-800">Cleanup Completed</h3>
            <p className="text-sm text-green-600">All resources have been cleaned up successfully.</p>
          </div>
        </div>

        {rollbackProgress.results && rollbackProgress.results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-green-800">Resources Cleaned:</h4>
            <ul className="text-sm text-green-700 list-disc list-inside">
              {rollbackProgress.results
                .filter((r) => r.success)
                .map((result, i) => (
                  <li key={i}>{result.actionId}</li>
                ))}
            </ul>
          </div>
        )}

        {rollbackProgress.costAvoided && (
          <div className="border-t border-green-200 pt-4">
            <h4 className="font-medium text-green-800 mb-2">Costs Avoided</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-green-700">Vercel</p>
                <p className="font-medium">${rollbackProgress.costAvoided.vercel.monthly}/mo</p>
                <p className="text-xs text-green-600">{rollbackProgress.costAvoided.vercel.tier}</p>
              </div>
              <div>
                <p className="text-green-700">Railway</p>
                <p className="font-medium">${rollbackProgress.costAvoided.railway.monthly}/mo</p>
                <p className="text-xs text-green-600">{rollbackProgress.costAvoided.railway.tier}</p>
              </div>
              <div>
                <p className="text-green-700">Neon</p>
                <p className="font-medium">${rollbackProgress.costAvoided.neon.monthly}/mo</p>
                <p className="text-xs text-green-600">{rollbackProgress.costAvoided.neon.tier}</p>
              </div>
            </div>
            <p className="mt-2 text-green-800 font-medium">
              {rollbackProgress.costAvoided.message}
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onRetry}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
          >
            Retry Setup
          </button>
          <button
            onClick={onCancel}
            className="flex-1 border border-green-300 text-green-700 py-2 px-4 rounded-lg hover:bg-green-100 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-6 space-y-6 ${getErrorColor()}`}>
      {/* Error Header */}
      <div className="flex items-start gap-3">
        <span className="text-3xl">{getErrorIcon()}</span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold">Setup Error</h3>
          <p className="text-sm mt-1">{error.message}</p>
          {taskName && (
            <p className="text-xs mt-1 opacity-75">
              Failed at: {taskName}
            </p>
          )}
        </div>
      </div>

      {/* Auto Recovery */}
      {retryCountdown !== null && (
        <div className="bg-white/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Auto-retrying...</span>
            <span className="text-2xl font-bold">{retryCountdown}s</span>
          </div>
          <div className="h-2 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-current transition-all duration-1000"
              style={{
                width: `${(1 - retryCountdown / (analysis?.retry.initialDelay || 5000 / 1000)) * 100}%`,
              }}
            />
          </div>
          <button
            onClick={() => setRetryCountdown(null)}
            className="mt-2 text-sm underline opacity-75 hover:opacity-100"
          >
            Cancel auto-retry
          </button>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && !retryCountdown && (
        <>
          {/* Retry Info */}
          {analysis.retry.retryable && (
            <div className="bg-white/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Recovery Options</h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="opacity-75">Max retries:</span>{' '}
                  {analysis.retry.maxRetries}
                </p>
                <p>
                  <span className="opacity-75">Wait time:</span>{' '}
                  {Math.round(analysis.retry.initialDelay / 1000)}s before retry
                </p>
                <p>
                  <span className="opacity-75">Strategy:</span>{' '}
                  {analysis.recovery.strategy.replace('_', ' ')}
                </p>
                <p>
                  <span className="opacity-75">Confidence:</span>{' '}
                  {Math.round(analysis.recovery.confidence * 100)}%
                </p>
              </div>
            </div>
          )}

          {/* Next Steps */}
          {analysis.nextSteps.length > 0 && (
            <div className="bg-white/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Recommended Steps</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {analysis.nextSteps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {/* Rollback Progress */}
      {rollbackProgress?.status === 'in_progress' && (
        <div className="bg-white/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Rolling back resources...</span>
            <span>{rollbackProgress.progress}%</span>
          </div>
          <div className="h-2 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-current transition-all"
              style={{ width: `${rollbackProgress.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      {!retryCountdown && rollbackProgress?.status !== 'in_progress' && (
        <div className="flex flex-col sm:flex-row gap-3">
          {analysis?.retry.retryable && (
            <button
              onClick={handleAutoRetry}
              disabled={loading}
              className="flex-1 bg-current text-white py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: 'currentColor' }}
            >
              <span className="text-white">Wait & Retry</span>
            </button>
          )}
          <button
            onClick={handleRetry}
            disabled={loading}
            className="flex-1 border border-current py-2 px-4 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            Retry Now
          </button>
          <button
            onClick={handleRollback}
            disabled={loading}
            className="flex-1 border border-current py-2 px-4 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
          >
            {loading ? 'Rolling back...' : 'Rollback & Clean Up'}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-white/50 py-2 px-4 rounded-lg hover:bg-white/70 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
