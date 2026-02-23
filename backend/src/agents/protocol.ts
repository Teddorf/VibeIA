/**
 * Agent Protocol Types — Spec Section 5
 * All types for the multi-agent orchestrator system.
 */

// ─── Enums & Literal Types ──────────────────────────────────────────────────

export type ModelTier = 'fast' | 'balanced' | 'powerful';

export type TaskType =
  | 'code-generation'
  | 'code-review'
  | 'testing'
  | 'documentation'
  | 'deployment'
  | 'architecture'
  | 'analysis'
  | 'bug-fix'
  | 'refactor';

export type NodeStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'cancelled';

export type PlanStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type ContextType =
  | 'architecture'
  | 'code'
  | 'requirement'
  | 'review'
  | 'test'
  | 'dependency'
  | 'convention'
  | 'decision';

export type ContextScope = 'global' | 'domain' | 'task';

export type ContextUpdateOperation =
  | 'add'
  | 'update'
  | 'invalidate'
  | 'supersede';

// ─── Core Interfaces ────────────────────────────────────────────────────────

export interface AgentProfile {
  id: string;
  name: string;
  role: string;
  capabilities: string[];
  defaultModelTier: ModelTier;
  maxConcurrentTasks: number;
  tags: string[];
}

export interface TaskDefinition {
  id: string;
  type: TaskType;
  description: string;
  tags: string[];
  dependencies: string[];
  priority: number;
  timeoutMs: number;
}

export interface ContextEntry {
  id: string;
  projectId: string;
  type: ContextType;
  scope: ContextScope;
  tags: string[];
  content: unknown;
  tokenCount: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  supersededBy?: string;
  pipelineId?: string;
}

export interface CompiledContext {
  entries: ContextEntry[];
  tokenBudget: number;
  tokenCount: number;
  compiledAt: Date;
  cacheKey: string;
  scope: {
    global: ContextEntry[];
    domainSpecific: ContextEntry[];
    taskSpecific: ContextEntry[];
  };
}

export interface AgentConfiguration {
  modelTierOverride?: ModelTier;
  maxTokensOverride?: number;
  timeoutMs?: number;
  retryPolicy?: RetryPolicy;
  deterministicOnly?: boolean;
  costBudgetUSD?: number;
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
}

export interface AgentInput {
  taskDefinition: TaskDefinition;
  context: CompiledContext;
  previousOutputs: AgentOutput[];
  config: AgentConfiguration;
  traceId: string;
}

export interface ExecutionMetrics {
  startedAt: Date;
  completedAt?: Date;
  durationMs: number;
  tokensUsed: number;
  costUSD: number;
  llmCalls: number;
  retries: number;
}

export interface Artifact {
  type: string;
  path?: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface AgentOutput {
  taskId: string;
  agentId: string;
  status: 'success' | 'failure' | 'partial' | 'needs-review';
  artifacts: Artifact[];
  contextUpdates: ContextUpdate[];
  metrics: ExecutionMetrics;
  traceId: string;
}

export interface ContextUpdate {
  operation: ContextUpdateOperation;
  entry?: Partial<ContextEntry>;
  targetId?: string;
  reason: string;
}

export interface AgentJobData {
  taskId: string;
  pipelineId: string;
  projectId: string;
  agentId: string;
  taskDefinition: TaskDefinition;
  contextKeys: string[];
  previousOutputIds: string[];
  configOverrides?: Partial<AgentConfiguration>;
  traceId: string;
}

export interface CostEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCachedTokens: number;
  modelTier: ModelTier;
  modelId: string;
  estimatedCostUSD: number;
  confidenceLevel: 'low' | 'medium' | 'high';
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export interface ModelPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
  cachedInputPerMillionTokens?: number;
}

// ─── DAG Types ──────────────────────────────────────────────────────────────

export interface DAGNode {
  nodeId: string;
  agentId: string;
  taskDefinition: TaskDefinition;
  dependencies: string[];
  status: NodeStatus;
  output?: AgentOutput;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ParsedIntent {
  intent: string;
  taskType: TaskType;
  complexity: 'simple' | 'moderate' | 'complex';
  requiredAgents: string[];
}

// ─── IAgent Interface ───────────────────────────────────────────────────────

export interface IAgent {
  readonly profile: AgentProfile;
  execute(input: AgentInput): Promise<AgentOutput>;
  validateInput(input: AgentInput): ValidationError[] | null;
  estimateCost(input: AgentInput): CostEstimate;
  canHandle(task: TaskDefinition): boolean;
}
