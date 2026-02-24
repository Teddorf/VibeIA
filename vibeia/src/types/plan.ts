export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
export type PlanStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';

export interface PlanTask {
  id?: string;
  name: string;
  description?: string;
  status: TaskStatus;
  type: string;
  file?: string;
  estimatedTime: number;
  dependencies?: string[];
}

export interface Phase {
  name: string;
  status: PlanStatus;
  estimatedTime: number;
  tasks: PlanTask[];
}

export interface Plan {
  _id: string;
  projectId: string;
  userId?: string;
  status: PlanStatus;
  estimatedTime: number;
  phases: Phase[];
  wizardData?: {
    stage1?: { projectName: string; description: string };
    stage2?: Record<string, string>;
    stage3?: { selectedArchetypes: string[]; plan: unknown };
  };
  metadata?: {
    llmProvider?: string;
    tokensUsed?: number;
    cost?: number;
    generatedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanDto {
  projectId: string;
  wizardData: {
    stage1: { projectName: string; description: string };
    stage2: Record<string, string>;
    stage3: { selectedArchetypes: string[]; plan: unknown };
  };
}
