'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ManualTaskGuide } from './ManualTaskGuide';
import { executionApi, manualTasksApi, qualityGatesApi } from '@/lib/api-client';

interface Task {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  type?: string;
  files?: { path: string; content: string }[];
  qualityReport?: QualityReport;
}

interface Phase {
  name: string;
  tasks: Task[];
  estimatedTime: number;
}

interface Plan {
  _id: string;
  projectId: string;
  phases: Phase[];
  status: string;
  estimatedTime: number;
}

interface QualityReport {
  passed: boolean;
  overallScore: number;
  report: string;
}

interface ManualTask {
  id: string;
  type: string;
  title: string;
  description: string;
  instructions: string[];
  requiredInputs: any[];
  estimatedMinutes: number;
  category: string;
}

interface ValidationResult {
  rule: string;
  passed: boolean;
  message: string;
}

interface ExecutionDashboardProps {
  planId: string;
  projectId: string;
  projectName: string;
  onComplete?: () => void;
}

export function ExecutionDashboard({
  planId,
  projectId,
  projectName,
  onComplete,
}: ExecutionDashboardProps) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [manualTask, setManualTask] = useState<ManualTask | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  }, []);

  // Load plan on mount
  useEffect(() => {
    const loadPlan = async () => {
      try {
        const data = await executionApi.getStatus(planId);
        setPlan(data);
        addLog(`Plan loaded: ${data.phases.length} phases`);
      } catch (err: any) {
        setError(err.message || 'Failed to load plan');
        addLog(`Error: ${err.message}`);
      }
    };
    loadPlan();
  }, [planId, addLog]);

  const calculateProgress = () => {
    if (!plan) return 0;
    const totalTasks = plan.phases.reduce((sum, p) => sum + p.tasks.length, 0);
    const completedTasks = plan.phases.reduce(
      (sum, p) => sum + p.tasks.filter(t => t.status === 'completed').length,
      0
    );
    return (completedTasks / totalTasks) * 100;
  };

  const getCurrentTask = (): Task | null => {
    if (!plan) return null;
    const phase = plan.phases[currentPhaseIndex];
    if (!phase) return null;
    return phase.tasks[currentTaskIndex] || null;
  };

  const executeNextTask = async () => {
    if (!plan || isPaused) return;

    const task = getCurrentTask();
    if (!task) {
      // All tasks completed
      addLog('All tasks completed!');
      setIsExecuting(false);
      onComplete?.();
      return;
    }

    // Check if this is a manual task
    try {
      const detection = await manualTasksApi.detect({
        name: task.name,
        description: task.description,
        type: task.type,
      });

      if (detection.isManual) {
        addLog(`Manual task detected: ${detection.task.title}`);
        setManualTask(detection.task);
        setIsPaused(true);
        // Update task status to paused
        updateTaskStatus(task.id, 'paused');
        return;
      }
    } catch (err) {
      addLog(`Warning: Could not check for manual task`);
    }

    // Execute automated task
    addLog(`Executing: ${task.name}`);
    updateTaskStatus(task.id, 'in_progress');

    try {
      // Simulate task execution (in real app, this calls the execution API)
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Run quality gates on generated files
      if (task.files && task.files.length > 0) {
        addLog(`Running quality gates on ${task.files.length} files...`);
        const qualityResult = await qualityGatesApi.check(task.files);

        if (!qualityResult.passed) {
          addLog(`Quality gate failed: ${qualityResult.report}`);
          updateTaskStatus(task.id, 'failed');
          setError(`Quality gate failed for task: ${task.name}`);
          setIsExecuting(false);
          return;
        }
        addLog(`Quality gate passed (Score: ${qualityResult.overallScore})`);
      }

      updateTaskStatus(task.id, 'completed');
      addLog(`Completed: ${task.name}`);

      // Move to next task
      moveToNextTask();

    } catch (err: any) {
      addLog(`Failed: ${task.name} - ${err.message}`);
      updateTaskStatus(task.id, 'failed');
      setError(err.message);
      setIsExecuting(false);
    }
  };

  const updateTaskStatus = (taskId: string, status: Task['status']) => {
    if (!plan) return;

    setPlan(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        phases: prev.phases.map((phase, pIdx) => ({
          ...phase,
          tasks: phase.tasks.map(task =>
            task.id === taskId ? { ...task, status } : task
          ),
        })),
      };
    });
  };

  const moveToNextTask = () => {
    if (!plan) return;

    const phase = plan.phases[currentPhaseIndex];
    if (currentTaskIndex < phase.tasks.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
    } else if (currentPhaseIndex < plan.phases.length - 1) {
      setCurrentPhaseIndex(prev => prev + 1);
      setCurrentTaskIndex(0);
      addLog(`Moving to phase: ${plan.phases[currentPhaseIndex + 1].name}`);
    } else {
      // All done
      addLog('Execution completed!');
      setIsExecuting(false);
    }
  };

  const handleManualTaskComplete = async (inputs: Record<string, string>) => {
    if (!manualTask) return;

    setIsValidating(true);
    try {
      // Validate inputs
      const result = await manualTasksApi.validate(manualTask.type, inputs);
      setValidationResults(result.results);

      if (result.valid) {
        addLog(`Manual task completed: ${manualTask.title}`);
        const currentTask = getCurrentTask();
        if (currentTask) {
          updateTaskStatus(currentTask.id, 'completed');
        }
        setManualTask(null);
        setIsPaused(false);
        moveToNextTask();

        // Continue execution
        if (isExecuting) {
          setTimeout(() => executeNextTask(), 500);
        }
      }
    } catch (err: any) {
      addLog(`Validation error: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSkipManualTask = () => {
    const currentTask = getCurrentTask();
    if (currentTask) {
      updateTaskStatus(currentTask.id, 'completed');
      addLog(`Skipped manual task: ${currentTask.name}`);
    }
    setManualTask(null);
    setIsPaused(false);
    moveToNextTask();

    if (isExecuting) {
      setTimeout(() => executeNextTask(), 500);
    }
  };

  const startExecution = () => {
    setIsExecuting(true);
    setError(null);
    addLog('Starting execution...');
    executeNextTask();
  };

  const pauseExecution = () => {
    setIsPaused(true);
    addLog('Execution paused');
  };

  const resumeExecution = () => {
    setIsPaused(false);
    addLog('Execution resumed');
    if (manualTask === null) {
      executeNextTask();
    }
  };

  // Auto-execute next task when state changes
  useEffect(() => {
    if (isExecuting && !isPaused && !manualTask) {
      const timer = setTimeout(() => executeNextTask(), 100);
      return () => clearTimeout(timer);
    }
  }, [currentPhaseIndex, currentTaskIndex, isExecuting, isPaused, manualTask]);

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '⏳';
      case 'failed': return '❌';
      case 'paused': return '⏸️';
      default: return '⬜';
    }
  };

  if (!plan) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p>Loading execution plan...</p>
        </CardContent>
      </Card>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{projectName}</CardTitle>
              <CardDescription>Execution Dashboard</CardDescription>
            </div>
            <div className="flex gap-2">
              {!isExecuting && (
                <Button onClick={startExecution} className="bg-green-600 hover:bg-green-700">
                  Start Execution
                </Button>
              )}
              {isExecuting && !isPaused && (
                <Button onClick={pauseExecution} variant="outline">
                  Pause
                </Button>
              )}
              {isExecuting && isPaused && !manualTask && (
                <Button onClick={resumeExecution} className="bg-blue-600 hover:bg-blue-700">
                  Resume
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Overall Progress</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-red-500 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <span className="text-xl">❌</span>
              <span className="font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Task Guide (when paused) */}
      {manualTask && (
        <ManualTaskGuide
          task={manualTask}
          onComplete={handleManualTaskComplete}
          onSkip={handleSkipManualTask}
          isValidating={isValidating}
          validationResults={validationResults}
        />
      )}

      {/* Phases and Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Phase List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Phases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plan.phases.map((phase, idx) => {
              const phaseProgress = (phase.tasks.filter(t => t.status === 'completed').length / phase.tasks.length) * 100;
              const isActive = idx === currentPhaseIndex;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border transition-colors ${
                    isActive ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-medium ${isActive ? 'text-blue-700' : ''}`}>
                      {idx + 1}. {phase.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {phase.tasks.filter(t => t.status === 'completed').length}/{phase.tasks.length}
                    </span>
                  </div>
                  <Progress value={phaseProgress} className="h-1" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Current Phase Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {plan.phases[currentPhaseIndex]?.name || 'Tasks'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {plan.phases[currentPhaseIndex]?.tasks.map((task, idx) => (
                <div
                  key={task.id}
                  className={`p-2 rounded border flex items-center gap-2 ${
                    idx === currentTaskIndex ? 'bg-blue-50 border-blue-300' : ''
                  }`}
                >
                  <span>{getStatusIcon(task.status)}</span>
                  <span className="text-sm flex-1">{task.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execution Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-48 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-gray-500">Waiting for execution to start...</p>
            ) : (
              logs.map((log, idx) => (
                <div key={idx} className="py-0.5">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
