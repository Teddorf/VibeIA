'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Plus,
  GripVertical,
  Undo2,
  Redo2,
  Save,
  Clock,
} from 'lucide-react';

export interface PlanTask {
  id: string;
  name: string;
  estimatedTime?: number;
  description?: string;
}

export interface PlanPhase {
  name: string;
  tasks: PlanTask[];
}

export interface Plan {
  phases: PlanPhase[];
  estimatedTime?: number;
}

interface PlanEditorProps {
  plan: Plan;
  onSave: (plan: Plan) => void;
}

interface EditState {
  phaseIndex: number | null;
  taskId: string | null;
  phaseName: number | null;
}

export function PlanEditor({ plan: initialPlan, onSave }: PlanEditorProps) {
  const [plan, setPlan] = useState<Plan>(() => ({
    ...initialPlan,
    phases: initialPlan.phases.map((phase) => ({
      ...phase,
      tasks: phase.tasks.map((task) => ({ ...task })),
    })),
  }));
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());
  const [editState, setEditState] = useState<EditState>({
    phaseIndex: null,
    taskId: null,
    phaseName: null,
  });
  const [newTaskName, setNewTaskName] = useState('');
  const [addingTaskPhase, setAddingTaskPhase] = useState<number | null>(null);
  const [history, setHistory] = useState<Plan[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [deleteConfirmPhase, setDeleteConfirmPhase] = useState<number | null>(null);

  // Calculate total time
  const totalTime = useMemo(() => {
    return plan.phases.reduce((total, phase) => {
      return (
        total +
        phase.tasks.reduce((phaseTotal, task) => phaseTotal + (task.estimatedTime || 0), 0)
      );
    }, 0);
  }, [plan]);

  // Push to history
  const pushHistory = useCallback(
    (newPlan: Plan) => {
      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, JSON.parse(JSON.stringify(newPlan))];
      });
      setHistoryIndex((prev) => prev + 1);
      setHasUnsavedChanges(true);
    },
    [historyIndex]
  );

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex((prev) => prev - 1);
      setPlan(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    } else if (historyIndex === 0) {
      // Go back to initial state
      setPlan(
        JSON.parse(
          JSON.stringify({
            ...initialPlan,
            phases: initialPlan.phases.map((phase) => ({
              ...phase,
              tasks: phase.tasks.map((task) => ({ ...task })),
            })),
          })
        )
      );
      setHistoryIndex(-1);
      setHasUnsavedChanges(false);
    }
  }, [historyIndex, history, initialPlan]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((prev) => prev + 1);
      setPlan(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  }, [historyIndex, history]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          undo();
        } else if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Toggle phase expansion
  const togglePhase = (index: number) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Start editing task
  const startEditTask = (phaseIndex: number, taskId: string) => {
    setExpandedPhases((prev) => new Set(prev).add(phaseIndex));
    setEditState({ phaseIndex, taskId, phaseName: null });
  };

  // Update task name
  const updateTaskName = (phaseIndex: number, taskId: string, name: string) => {
    const newPlan = {
      ...plan,
      phases: plan.phases.map((phase, pi) =>
        pi === phaseIndex
          ? {
              ...phase,
              tasks: phase.tasks.map((task) =>
                task.id === taskId ? { ...task, name } : task
              ),
            }
          : phase
      ),
    };
    setPlan(newPlan);
  };

  // Update task time
  const updateTaskTime = (phaseIndex: number, taskId: string, time: number) => {
    const newPlan = {
      ...plan,
      phases: plan.phases.map((phase, pi) =>
        pi === phaseIndex
          ? {
              ...phase,
              tasks: phase.tasks.map((task) =>
                task.id === taskId ? { ...task, estimatedTime: time } : task
              ),
            }
          : phase
      ),
    };
    setPlan(newPlan);
    pushHistory(newPlan);
  };

  // Delete task
  const deleteTask = (phaseIndex: number, taskId: string) => {
    const newPlan = {
      ...plan,
      phases: plan.phases.map((phase, pi) =>
        pi === phaseIndex
          ? {
              ...phase,
              tasks: phase.tasks.filter((task) => task.id !== taskId),
            }
          : phase
      ),
    };
    setPlan(newPlan);
    pushHistory(newPlan);
  };

  // Add task
  const addTask = (phaseIndex: number) => {
    if (!newTaskName.trim()) return;

    const newTask: PlanTask = {
      id: `t${Date.now()}`,
      name: newTaskName.trim(),
      estimatedTime: 10,
    };

    const newPlan = {
      ...plan,
      phases: plan.phases.map((phase, pi) =>
        pi === phaseIndex
          ? {
              ...phase,
              tasks: [...phase.tasks, newTask],
            }
          : phase
      ),
    };
    setPlan(newPlan);
    pushHistory(newPlan);
    setNewTaskName('');
    setAddingTaskPhase(null);
  };

  // Update phase name
  const updatePhaseName = (phaseIndex: number, name: string) => {
    const newPlan = {
      ...plan,
      phases: plan.phases.map((phase, pi) =>
        pi === phaseIndex ? { ...phase, name } : phase
      ),
    };
    setPlan(newPlan);
  };

  // Commit phase name change
  const commitPhaseName = () => {
    if (editState.phaseName !== null) {
      pushHistory(plan);
    }
    setEditState({ phaseIndex: null, taskId: null, phaseName: null });
  };

  // Add phase
  const addPhase = () => {
    const newPhase: PlanPhase = {
      name: 'Nueva Fase',
      tasks: [],
    };
    const newPlan = {
      ...plan,
      phases: [...plan.phases, newPhase],
    };
    setPlan(newPlan);
    pushHistory(newPlan);
  };

  // Delete phase
  const deletePhase = (phaseIndex: number) => {
    const newPlan = {
      ...plan,
      phases: plan.phases.filter((_, pi) => pi !== phaseIndex),
    };
    setPlan(newPlan);
    pushHistory(newPlan);
    setDeleteConfirmPhase(null);
  };

  // Save plan
  const handleSave = () => {
    onSave({ ...plan, estimatedTime: totalTime });
    setHasUnsavedChanges(false);
  };

  // Get task count text
  const getTaskCountText = (count: number) => {
    return count === 1 ? '1 tarea' : `${count} tareas`;
  };

  const canUndo = historyIndex >= 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium">{totalTime} min</span>
          </div>
          {hasUnsavedChanges && (
            <span className="text-sm text-amber-600">Cambios sin guardar</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Deshacer"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Rehacer"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-2">
        {plan.phases.map((phase, phaseIndex) => (
          <div
            key={phaseIndex}
            className="border rounded-lg overflow-hidden"
            data-testid={`droppable-phase-${phaseIndex}`}
          >
            {/* Phase header */}
            <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800">
              <button
                onClick={() => togglePhase(phaseIndex)}
                className="flex items-center gap-2 flex-1 text-left"
                aria-expanded={expandedPhases.has(phaseIndex)}
              >
                {expandedPhases.has(phaseIndex) ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
                {editState.phaseName === phaseIndex ? (
                  <Input
                    value={phase.name}
                    onChange={(e) => updatePhaseName(phaseIndex, e.target.value)}
                    onBlur={commitPhaseName}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        commitPhaseName();
                      }
                    }}
                    className="h-8 w-auto"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="font-medium"
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditState({ phaseIndex: null, taskId: null, phaseName: phaseIndex });
                    }}
                  >
                    {phase.name}
                  </span>
                )}
              </button>
              <span className="text-sm text-muted-foreground">
                {getTaskCountText(phase.tasks.length)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                data-testid={`delete-phase-${phaseIndex}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmPhase(phaseIndex);
                }}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>

            {/* Delete phase confirmation */}
            {deleteConfirmPhase === phaseIndex && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border-t flex items-center justify-between">
                <span className="text-sm">Eliminar esta fase?</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirmPhase(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deletePhase(phaseIndex)}
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            )}

            {/* Tasks */}
            {expandedPhases.has(phaseIndex) && (
              <div className="border-t">
                {phase.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 p-3 border-b last:border-b-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    <div
                      data-testid={`drag-handle-${task.id}`}
                      draggable="true"
                      className="cursor-grab text-muted-foreground"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    {editState.taskId === task.id ? (
                      <div className="flex-1 flex items-center gap-4">
                        <div className="flex-1">
                          <Input
                            value={task.name}
                            onChange={(e) =>
                              updateTaskName(phaseIndex, task.id, e.target.value)
                            }
                            className="h-8"
                            autoFocus
                          />
                        </div>
                        <div className="w-24">
                          <Label htmlFor={`time-${task.id}`} className="sr-only">
                            Tiempo
                          </Label>
                          <Input
                            id={`time-${task.id}`}
                            type="number"
                            value={task.estimatedTime || 0}
                            onChange={(e) =>
                              updateTaskTime(
                                phaseIndex,
                                task.id,
                                parseInt(e.target.value) || 0
                              )
                            }
                            className="h-8"
                            aria-label="Tiempo estimado"
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setEditState({ phaseIndex: null, taskId: null, phaseName: null })
                          }
                        >
                          Listo
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1">{task.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {task.estimatedTime}min
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`edit-task-${task.id}`}
                          onClick={() => startEditTask(phaseIndex, task.id)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`delete-task-${task.id}`}
                          onClick={() => deleteTask(phaseIndex, task.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </div>
                ))}

                {/* Add task */}
                {addingTaskPhase === phaseIndex ? (
                  <div className="p-3 flex items-center gap-2">
                    <Input
                      value={newTaskName}
                      onChange={(e) => setNewTaskName(e.target.value)}
                      placeholder="Nombre de tarea"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          addTask(phaseIndex);
                        }
                      }}
                      autoFocus
                    />
                    <Button size="sm" onClick={() => addTask(phaseIndex)}>
                      Agregar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAddingTaskPhase(null);
                        setNewTaskName('');
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <button
                    data-testid={`add-task-phase-${phaseIndex}`}
                    onClick={() => setAddingTaskPhase(phaseIndex)}
                    className="w-full p-3 text-sm text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Agregar tarea
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add phase button */}
      <Button variant="outline" onClick={addPhase} className="w-full">
        <Plus className="w-4 h-4 mr-2" />
        Agregar fase
      </Button>
    </div>
  );
}
