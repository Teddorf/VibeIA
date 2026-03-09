'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Play,
  X,
} from 'lucide-react';

export interface PartialPhase {
  name: string;
  status?: 'complete' | 'generating' | 'pending';
  tasks?: Array<{
    name: string;
    estimatedTime?: number;
  }>;
}

export interface StreamingStats {
  phasesComplete?: number;
  phasesTotal?: number;
  tasksComplete?: number;
  tasksTotal?: number;
  estimatedTime?: number; // in minutes
}

export interface StreamingPlanPreviewProps {
  isGenerating: boolean;
  progress: number;
  currentStage?: 'analyzing' | 'designing' | 'generating' | 'estimating' | 'validating';
  partialPlan?: {
    phases: PartialPhase[];
  };
  aiThinking?: string;
  tokensUsed?: number;
  stats?: StreamingStats;
  error?: string;
  onCancel?: () => void;
  onContinue?: () => void;
  onRetry?: () => void;
}

const STAGES = [
  { id: 'analyzing', label: 'Analizando requisitos', order: 1 },
  { id: 'designing', label: 'Diseñando arquitectura', order: 2 },
  { id: 'generating', label: 'Generando tareas', order: 3 },
  { id: 'estimating', label: 'Estimando tiempos', order: 4 },
  { id: 'validating', label: 'Validando plan', order: 5 },
] as const;

export function StreamingPlanPreview({
  isGenerating,
  progress,
  currentStage,
  partialPlan,
  aiThinking,
  tokensUsed,
  stats,
  error,
  onCancel,
  onContinue,
  onRetry,
}: StreamingPlanPreviewProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());

  const currentStageOrder = useMemo(() => {
    const stage = STAGES.find((s) => s.id === currentStage);
    return stage?.order || 0;
  }, [currentStage]);

  const getStageStatus = (stageId: string) => {
    const stage = STAGES.find((s) => s.id === stageId);
    if (!stage) return 'pending';
    if (stage.order < currentStageOrder) return 'completed';
    if (stage.id === currentStage) return 'in-progress';
    return 'pending';
  };

  const togglePhase = (phaseName: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseName)) {
        next.delete(phaseName);
      } else {
        next.add(phaseName);
      }
      return next;
    });
  };

  const formatTime = (minutes: number) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      return `${hours} hora${hours > 1 ? 's' : ''}`;
    }
    return `${minutes} min`;
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString();
  };

  const isComplete = !isGenerating && progress >= 100 && !error;

  return (
    <div className="space-y-6" aria-live="polite">
      {/* Progress Section */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>
            {currentStage ? STAGES.find((s) => s.id === currentStage)?.label : 'Preparando...'}
          </span>
          <span>{progress}%</span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"
        >
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stage Indicators */}
      <div className="flex justify-between">
        {STAGES.map((stage) => {
          const status = getStageStatus(stage.id);
          return (
            <div
              key={stage.id}
              data-testid={`stage-${stage.id}`}
              className={cn(
                'flex flex-col items-center gap-1',
                status === 'completed' && 'completed',
                status === 'in-progress' && 'in-progress',
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm',
                  status === 'completed' && 'bg-green-500 text-white',
                  status === 'in-progress' && 'bg-primary text-white animate-pulse',
                  status === 'pending' && 'bg-slate-200 dark:bg-slate-700 text-slate-500',
                )}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4" />
                ) : status === 'in-progress' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  stage.order
                )}
              </div>
              <span className="text-xs text-muted-foreground text-center max-w-16">
                {stage.label.split(' ')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* AI Thinking */}
      {isGenerating && aiThinking && (
        <div
          data-testid="ai-thinking"
          className="bg-primary/10 border border-primary/20 rounded-lg p-4"
        >
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm">{aiThinking}</span>
          </div>
        </div>
      )}

      {/* Token Counter */}
      {tokensUsed !== undefined && (
        <div className="text-xs text-muted-foreground">
          Tokens utilizados: {formatNumber(tokensUsed)}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 text-center">
          {stats.phasesTotal !== undefined && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <div className="text-2xl font-bold">
                {stats.phasesComplete || 0}/{stats.phasesTotal}
              </div>
              <div className="text-xs text-muted-foreground">Fases</div>
            </div>
          )}
          {stats.tasksTotal !== undefined && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <div className="text-2xl font-bold">
                {stats.tasksComplete || 0}/{stats.tasksTotal}
              </div>
              <div className="text-xs text-muted-foreground">Tareas</div>
            </div>
          )}
          {stats.estimatedTime !== undefined && (
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
              <div className="text-2xl font-bold">{formatTime(stats.estimatedTime)}</div>
              <div className="text-xs text-muted-foreground">Estimado</div>
            </div>
          )}
        </div>
      )}

      {/* Partial Plan Preview */}
      {partialPlan && partialPlan.phases.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium">Plan generado</h3>
          <div className="space-y-2">
            {partialPlan.phases.map((phase, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <button
                  onClick={() => togglePhase(phase.name)}
                  className="w-full flex items-center justify-between p-3 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <div className="flex items-center gap-2">
                    {expandedPhases.has(phase.name) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="font-medium">{phase.name}</span>
                    {phase.status === 'generating' && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                  </div>
                  {phase.tasks && (
                    <span className="text-sm text-muted-foreground">
                      {phase.tasks.length} tareas
                    </span>
                  )}
                </button>
                {expandedPhases.has(phase.name) && phase.tasks && (
                  <div className="border-t px-3 py-2 bg-slate-50 dark:bg-slate-800/50">
                    <ul className="space-y-1">
                      {phase.tasks.map((task, taskIndex) => (
                        <li key={taskIndex} className="text-sm flex justify-between">
                          <span>{task.name}</span>
                          {task.estimatedTime && (
                            <span className="text-muted-foreground">{task.estimatedTime}min</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skeleton for generating phases */}
      {isGenerating && partialPlan && (
        <div data-testid="phase-skeleton" className="border rounded-lg p-3 animate-pulse">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-48" />
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span>Error: {error}</span>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry} className="mt-3">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          )}
        </div>
      )}

      {/* Completion State */}
      {isComplete && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Check className="w-5 h-5" />
            <span>Plan generado completo</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {isGenerating && onCancel && (
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
        )}
        {isComplete && onContinue && (
          <Button onClick={onContinue}>
            <Play className="w-4 h-4 mr-2" />
            Continuar
          </Button>
        )}
      </div>
    </div>
  );
}
