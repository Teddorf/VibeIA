/**
 * RollbackPanel Component
 * Manage setup states and rollback operations
 */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { rollbackApi } from '@/lib/api-client';

// ============================================
// TYPES
// ============================================

export interface SetupTask {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

export interface SetupState {
  id: string;
  setupId: string;
  projectId: string;
  projectName: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  tasks: SetupTask[];
  urls?: {
    frontend?: string;
    backend?: string;
    database?: string;
  };
  error?: string;
}

export interface RollbackAction {
  id: string;
  setupId: string;
  type: string;
  description: string;
  resourceId: string;
  status: 'pending' | 'completed' | 'failed';
  canUndo: boolean;
}

type StatusFilter = 'all' | 'completed' | 'failed' | 'in_progress';

// ============================================
// ICONS
// ============================================

const LoadingSpinner = () => (
  <svg data-testid="loading-spinner" className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const UndoIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);

// ============================================
// SUB-COMPONENTS
// ============================================

const SetupSkeleton: React.FC = () => (
  <div data-testid="loading-skeleton" className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 rounded-full bg-slate-700" />
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-slate-700 rounded w-1/3" />
        <div className="h-4 bg-slate-700 rounded w-2/3" />
        <div className="h-2 bg-slate-700 rounded w-full mt-2" />
      </div>
    </div>
  </div>
);

interface RollbackModalProps {
  setup: SetupState;
  actions: RollbackAction[];
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const RollbackModal: React.FC<RollbackModalProps> = ({
  setup,
  actions,
  isLoading,
  onConfirm,
  onCancel,
}) => (
  <div data-testid="rollback-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className="w-full max-w-lg p-6 rounded-lg bg-slate-800 border border-slate-700 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <WarningIcon />
        <h3 className="text-lg font-semibold text-white">
          Confirmar Rollback
        </h3>
      </div>

      {/* Warning */}
      <p className="text-slate-400">
        Esta acción es <span className="text-red-400 font-semibold">permanente e irreversible</span>.
        Se eliminarán los siguientes recursos de <span className="text-white font-medium">{setup.projectName}</span>:
      </p>

      {/* Actions List */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {actions.map((action) => (
          <div
            key={action.id}
            className="flex items-center gap-2 p-2 rounded bg-slate-900/50 text-sm"
          >
            <UndoIcon />
            <span className="text-slate-300">{action.description}</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end pt-4 border-t border-slate-700">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading ? <LoadingSpinner /> : <UndoIcon />}
          Confirmar Rollback
        </button>
      </div>
    </div>
  </div>
);

interface SetupCardProps {
  setup: SetupState;
  onRollback: (setup: SetupState) => void;
}

const SetupCard: React.FC<SetupCardProps> = ({ setup, onRollback }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = {
    completed: 'border-green-500/50 bg-green-900/20',
    failed: 'border-red-500/50 bg-red-900/20',
    in_progress: 'border-blue-500/50 bg-blue-900/20',
    pending: 'border-slate-600 bg-slate-800/50',
    rolled_back: 'border-slate-600 bg-slate-800/50',
  };

  const statusIcons = {
    completed: <CheckIcon />,
    failed: <XIcon />,
    in_progress: <LoadingSpinner />,
    pending: null,
    rolled_back: <UndoIcon />,
  };

  const statusLabels = {
    completed: 'Completado',
    failed: 'Fallido',
    in_progress: 'En progreso',
    pending: 'Pendiente',
    rolled_back: 'Rollback aplicado',
  };

  const canRollback = setup.status === 'completed' || setup.status === 'failed';

  return (
    <div
      data-testid={`setup-card-${setup.setupId}`}
      data-status={setup.status}
      className={`rounded-lg border ${statusColors[setup.status]} overflow-hidden`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              setup.status === 'completed' ? 'bg-green-600/20 text-green-400' :
              setup.status === 'failed' ? 'bg-red-600/20 text-red-400' :
              setup.status === 'in_progress' ? 'bg-blue-600/20 text-blue-400' :
              'bg-slate-700 text-slate-400'
            }`}>
              {statusIcons[setup.status]}
            </div>
            <div>
              <h3 className="font-semibold text-white">{setup.projectName}</h3>
              <p className="text-sm text-slate-400">
                {statusLabels[setup.status]} • {new Date(setup.startedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canRollback && (
              <button
                onClick={() => onRollback(setup)}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors flex items-center gap-1"
              >
                <UndoIcon /> Rollback
              </button>
            )}
            {setup.status === 'in_progress' && (
              <button
                disabled
                className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 text-slate-500 cursor-not-allowed"
              >
                Rollback
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {setup.status === 'in_progress' && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progreso</span>
              <span>{setup.progress}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                role="progressbar"
                aria-valuenow={setup.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${setup.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error Message */}
        {setup.error && (
          <p className="mt-2 text-sm text-red-400">{setup.error}</p>
        )}

        {/* URLs */}
        {setup.urls && setup.status === 'completed' && (
          <div className="mt-3 flex flex-wrap gap-2">
            {setup.urls.frontend && (
              <a
                href={setup.urls.frontend}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <ExternalLinkIcon />
                {setup.urls.frontend}
              </a>
            )}
            {setup.urls.backend && (
              <a
                href={setup.urls.backend}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-slate-700 text-slate-300 hover:text-white transition-colors"
              >
                <ExternalLinkIcon />
                Backend
              </a>
            )}
          </div>
        )}
      </div>

      {/* Tasks Expansion */}
      <div className="border-t border-slate-700">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-2 flex items-center justify-between text-sm text-slate-400 hover:bg-slate-700/30 transition-colors"
        >
          <span>Ver tareas ({setup.tasks.length})</span>
          <ChevronDownIcon />
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-2">
            {setup.tasks.map((task, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-2 rounded bg-slate-900/50"
              >
                {task.status === 'completed' && (
                  <span className="text-green-400"><CheckIcon /></span>
                )}
                {task.status === 'failed' && (
                  <span className="text-red-400"><XIcon /></span>
                )}
                {task.status === 'in_progress' && (
                  <span className="text-blue-400"><LoadingSpinner /></span>
                )}
                {task.status === 'pending' && (
                  <span className="w-4 h-4 rounded-full border border-slate-500" />
                )}
                <span className={`text-sm ${
                  task.status === 'failed' ? 'text-red-400' :
                  task.status === 'completed' ? 'text-slate-300' :
                  'text-slate-400'
                }`}>
                  {task.name}
                </span>
                {task.error && (
                  <span className="text-xs text-red-400 ml-auto">{task.error}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const RollbackPanel: React.FC = () => {
  const [setups, setSetups] = useState<SetupState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Rollback modal state
  const [selectedSetup, setSelectedSetup] = useState<SetupState | null>(null);
  const [rollbackActions, setRollbackActions] = useState<RollbackAction[]>([]);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [rollbackResult, setRollbackResult] = useState<'success' | 'error' | null>(null);

  // Fetch setup states
  const fetchSetups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await rollbackApi.getSetupStates();
      setSetups(data);
    } catch (err) {
      setError('Error al cargar los estados de setup');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSetups();
  }, [fetchSetups]);

  // Filter setups
  const filteredSetups = useMemo(() => {
    if (statusFilter === 'all') return setups;
    return setups.filter((setup) => setup.status === statusFilter);
  }, [setups, statusFilter]);

  // Handle rollback click
  const handleRollbackClick = useCallback(async (setup: SetupState) => {
    setSelectedSetup(setup);
    try {
      const actions = await rollbackApi.getRollbackActions(setup.setupId);
      setRollbackActions(actions);
    } catch {
      setRollbackActions([]);
    }
  }, []);

  // Execute rollback
  const executeRollback = useCallback(async () => {
    if (!selectedSetup) return;

    setIsRollingBack(true);
    setRollbackResult(null);

    try {
      await rollbackApi.executeRollback(selectedSetup.setupId);
      setRollbackResult('success');
      await fetchSetups();
      setTimeout(() => {
        setSelectedSetup(null);
        setRollbackResult(null);
      }, 2000);
    } catch {
      setRollbackResult('error');
    } finally {
      setIsRollingBack(false);
    }
  }, [selectedSetup, fetchSetups]);

  // Close modal
  const closeModal = useCallback(() => {
    if (!isRollingBack) {
      setSelectedSetup(null);
      setRollbackActions([]);
      setRollbackResult(null);
    }
  }, [isRollingBack]);

  if (isLoading) {
    return (
      <div data-testid="rollback-panel" className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Rollback de Setups</h2>
        <div className="space-y-4">
          <SetupSkeleton />
          <SetupSkeleton />
          <SetupSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="rollback-panel" className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Rollback de Setups</h2>
        <div className="p-6 rounded-lg bg-red-900/20 border border-red-700 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchSetups}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (setups.length === 0) {
    return (
      <div data-testid="rollback-panel" className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Rollback de Setups</h2>
        <div data-testid="empty-rollback" className="p-8 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
          <p className="text-slate-400">No hay setups disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="rollback-panel" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Rollback de Setups</h2>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'completed', 'failed', 'in_progress'] as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              statusFilter === status
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {status === 'all' ? 'Todos' :
             status === 'completed' ? 'Completados' :
             status === 'failed' ? 'Fallidos' :
             'En progreso'}
          </button>
        ))}
      </div>

      {/* Setups List */}
      <div className="space-y-4">
        {filteredSetups.map((setup) => (
          <SetupCard
            key={setup.id}
            setup={setup}
            onRollback={handleRollbackClick}
          />
        ))}
      </div>

      {/* Empty filtered state */}
      {filteredSetups.length === 0 && (
        <div className="p-8 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
          <p className="text-slate-400">No hay setups con este estado</p>
        </div>
      )}

      {/* Rollback Modal */}
      {selectedSetup && (
        <>
          {rollbackResult === 'success' ? (
            <div data-testid="rollback-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="w-full max-w-md p-6 rounded-lg bg-slate-800 border border-green-700 text-center space-y-4">
                <div className="text-green-400 flex justify-center">
                  <CheckIcon />
                </div>
                <p className="text-white">Rollback completado exitosamente</p>
              </div>
            </div>
          ) : rollbackResult === 'error' ? (
            <div data-testid="rollback-confirm-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
              <div className="w-full max-w-md p-6 rounded-lg bg-slate-800 border border-red-700 text-center space-y-4">
                <div className="text-red-400 flex justify-center">
                  <XIcon />
                </div>
                <p className="text-red-400">Error al ejecutar el rollback. Intenta de nuevo.</p>
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          ) : (
            <RollbackModal
              setup={selectedSetup}
              actions={rollbackActions}
              isLoading={isRollingBack}
              onConfirm={executeRollback}
              onCancel={closeModal}
            />
          )}
        </>
      )}
    </div>
  );
};

export default RollbackPanel;
