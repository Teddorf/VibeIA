export enum ErrorType {
  NETWORK = 'network',
  RATE_LIMIT = 'rate_limit',
  AUTH = 'auth',
  VALIDATION = 'validation',
  CONFLICT = 'conflict',
  SERVER = 'server',
  QUOTA = 'quota',
  TIMEOUT = 'timeout',
  UNKNOWN = 'unknown',
}

export enum UserAction {
  REAUTH = 'reauth',
  FIX_INPUT = 'fix_input',
  UPGRADE_PLAN = 'upgrade_plan',
  RETRY = 'retry',
  CONTACT_SUPPORT = 'contact_support',
}

export enum BackoffType {
  EXPONENTIAL = 'exponential',
  LINEAR = 'linear',
  NONE = 'none',
}

export enum RecoveryStrategy {
  PARTIAL_ROLLBACK = 'partial_rollback',
  ALTERNATIVE = 'alternative',
  SKIP = 'skip',
  MANUAL = 'manual',
  FULL_ROLLBACK = 'full_rollback',
}

export interface ErrorStrategy {
  retry: boolean;
  maxRetries: number;
  backoff: BackoffType;
  initialDelay?: number;
  maxDelay?: number;
  rollbackOnFailure: boolean;
  userAction?: UserAction;
  alternative?: string;
}

export const ERROR_STRATEGIES: Record<ErrorType, ErrorStrategy> = {
  [ErrorType.NETWORK]: {
    retry: true,
    maxRetries: 3,
    backoff: BackoffType.EXPONENTIAL,
    initialDelay: 1000,
    maxDelay: 30000,
    rollbackOnFailure: true,
  },

  [ErrorType.RATE_LIMIT]: {
    retry: true,
    maxRetries: 5,
    backoff: BackoffType.EXPONENTIAL,
    initialDelay: 60000,
    maxDelay: 300000,
    rollbackOnFailure: false,
  },

  [ErrorType.AUTH]: {
    retry: false,
    maxRetries: 0,
    backoff: BackoffType.NONE,
    rollbackOnFailure: true,
    userAction: UserAction.REAUTH,
  },

  [ErrorType.VALIDATION]: {
    retry: false,
    maxRetries: 0,
    backoff: BackoffType.NONE,
    rollbackOnFailure: true,
    userAction: UserAction.FIX_INPUT,
  },

  [ErrorType.CONFLICT]: {
    retry: true,
    maxRetries: 2,
    backoff: BackoffType.LINEAR,
    initialDelay: 5000,
    rollbackOnFailure: false,
  },

  [ErrorType.SERVER]: {
    retry: true,
    maxRetries: 3,
    backoff: BackoffType.EXPONENTIAL,
    initialDelay: 2000,
    maxDelay: 60000,
    rollbackOnFailure: true,
  },

  [ErrorType.QUOTA]: {
    retry: false,
    maxRetries: 0,
    backoff: BackoffType.NONE,
    rollbackOnFailure: true,
    userAction: UserAction.UPGRADE_PLAN,
  },

  [ErrorType.TIMEOUT]: {
    retry: true,
    maxRetries: 2,
    backoff: BackoffType.LINEAR,
    initialDelay: 5000,
    rollbackOnFailure: true,
  },

  [ErrorType.UNKNOWN]: {
    retry: true,
    maxRetries: 1,
    backoff: BackoffType.LINEAR,
    initialDelay: 3000,
    rollbackOnFailure: true,
  },
};

export interface EnhancedError {
  type: ErrorType;
  code?: string;
  message: string;
  originalError?: Error;
  timestamp: Date;
  context?: Record<string, unknown>;
  retryCount?: number;
  recoverable: boolean;
  suggestedAction?: UserAction;
}

export interface RollbackAction {
  id: string;
  taskId: string;
  provider: string;
  action: string;
  resourceId: string;
  resourceType: string;
  priority: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  executedAt?: Date;
  success?: boolean;
  error?: string;
}

export interface RollbackActionResult {
  actionId: string;
  success: boolean;
  error?: string;
  duration?: number;
}

export interface RollbackResult {
  success: boolean;
  actionsExecuted: number;
  actionsFailed: number;
  results: RollbackActionResult[];
  totalDuration: number;
  resourcesCleaned: string[];
}

export interface RetryContext {
  attempt: number;
  maxAttempts: number;
  lastError?: EnhancedError;
  nextRetryDelay?: number;
  startedAt: Date;
  errors: EnhancedError[];
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  attempts: number;
  totalDuration: number;
  errors: EnhancedError[];
}

export interface FailureAnalysis {
  recoverable: boolean;
  strategy: RecoveryStrategy;
  affectedResources: string[];
  suggestedActions: UserAction[];
  confidence: number;
  details: string;
}

export interface RecoveryResult {
  success: boolean;
  action: RecoveryStrategy;
  resourcesRecovered?: string[];
  resourcesLost?: string[];
  message: string;
  nextSteps?: string[];
}

export interface ErrorEvent {
  id: string;
  error: EnhancedError;
  setupId?: string;
  taskId?: string;
  timestamp: Date;
  handled: boolean;
  recovery?: RecoveryResult;
}

export interface ErrorSummary {
  total: number;
  byType: Record<ErrorType, number>;
  recoverable: number;
  unrecoverable: number;
  retried: number;
  resolved: number;
}

export interface RollbackRequest {
  setupId: string;
  reason?: string;
  force?: boolean;
  tokens?: {
    neon?: string;
    vercel?: string;
    railway?: string;
  };
}

export interface RollbackStatusResponse {
  setupId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  actionsTotal: number;
  actionsCompleted: number;
  actionsFailed: number;
  results?: RollbackActionResult[];
  error?: string;
}

export interface ErrorRecoveryRequest {
  setupId: string;
  errorId: string;
  strategy?: RecoveryStrategy;
}

export interface CostAvoidedReport {
  vercel: { monthly: number; tier: string };
  railway: { monthly: number; tier: string };
  neon: { monthly: number; tier: string };
  totalMonthly: number;
  message: string;
}
