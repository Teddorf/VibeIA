export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type ExecutionPlanStatus =
  | 'pending_approval'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface DAGNode {
  nodeId: string;
  agentId: string;
  taskDefinition: {
    id: string;
    name: string;
    description?: string;
  };
  dependencies: string[];
  status: NodeStatus;
}

export interface ExecutionPlan {
  _id: string;
  projectId: string;
  intent: string;
  dag: DAGNode[];
  status: ExecutionPlanStatus;
  estimatedCost?: number;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionMetrics {
  startedAt?: string;
  completedAt?: string;
  durationMs: number;
  tokensUsed: number;
  costUSD: number;
  llmCalls: number;
  retries: number;
}

export interface AgentOutput {
  taskId: string;
  agentId: string;
  traceId: string;
  status: 'success' | 'failed' | 'partial';
  result?: unknown;
  metrics?: ExecutionMetrics;
}

export type ExecutionEventType =
  | 'plan_created'
  | 'execution_started'
  | 'node_completed'
  | 'node_failed'
  | 'node_evaluation_failed'
  | 'pipeline_completed'
  | 'pipeline_cancelled';

export interface ExecutionEvent {
  type: ExecutionEventType;
  planId: string;
  timestamp: string;
  data: Record<string, unknown>;
}
