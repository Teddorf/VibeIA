// Setup State and Task Types
export enum SetupTaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  ROLLED_BACK = 'rolled_back',
}

export enum SetupProvider {
  NEON = 'neon',
  VERCEL = 'vercel',
  RAILWAY = 'railway',
}

export interface SetupConfig {
  projectName: string;
  projectId?: string;
  repoFullName?: string;
  repoId?: string;
  teamSlug?: string;
  frontendPath?: string;
  backendPath?: string;
  needsRedis?: boolean;
  region?: string;
}

// Neon Setup DTOs
export interface NeonProjectConfig {
  projectName: string;
  region?: string;
  pgVersion?: number;
}

export interface NeonSetupResult {
  projectId: string;
  databaseId: string;
  connectionStrings: {
    main: string;
    pooled: string;
  };
  dashboardUrl: string;
  branches: {
    main: string;
    preview?: string;
  };
}

// Vercel Setup DTOs
export interface VercelProjectConfig {
  projectName: string;
  framework?: string;
  gitRepository?: {
    type: string;
    repo: string;
  };
  rootDirectory?: string;
  teamSlug?: string;
}

export interface VercelEnvironmentVariable {
  key: string;
  value: string;
  target: ('production' | 'preview' | 'development')[];
}

export interface VercelSetupResult {
  projectId: string;
  url: string;
  dashboardUrl: string;
  deploymentId?: string;
  deploymentStatus?: string;
}

// Railway Setup DTOs
export interface RailwayProjectConfig {
  projectName: string;
  description?: string;
  isPublic?: boolean;
}

export interface RailwayServiceConfig {
  name: string;
  repoFullName: string;
  branch?: string;
  buildCommand?: string;
  startCommand?: string;
  rootDirectory?: string;
  resources?: {
    replicas?: number;
    memory?: number;
    cpu?: number;
  };
  healthcheck?: {
    path: string;
    interval: number;
  };
}

export interface RailwaySetupResult {
  projectId: string;
  services: {
    api?: {
      id: string;
      url: string;
    };
    redis?: {
      id: string;
      connectionString: string;
    };
  };
  dashboardUrl: string;
}

// Setup Task Types
export interface SetupTask {
  id: string;
  name: string;
  provider: SetupProvider;
  status: SetupTaskStatus;
  estimatedDuration?: number; // in seconds
  steps: SetupStep[];
  result?: NeonSetupResult | VercelSetupResult | RailwaySetupResult;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface SetupStep {
  id: string;
  name: string;
  status: SetupTaskStatus;
  message?: string;
}

export interface RollbackAction {
  taskId: string;
  provider: SetupProvider;
  action: string;
  resourceId: string;
  executedAt?: Date;
}

// Setup Orchestrator DTOs
export interface SetupOrchestratorConfig {
  projectId: string;
  projectName: string;
  userId?: string; // Track who initiated the setup
  providers: {
    neon?: NeonProjectConfig;
    vercel?: VercelProjectConfig;
    railway?: RailwayProjectConfig;
  };
  envVars?: Record<string, string>;
}

export interface SetupState {
  status: SetupTaskStatus;
  tasks: SetupTask[];
  urls: {
    frontend?: string;
    backend?: string;
    database?: string;
    dashboards: {
      neon?: string;
      vercel?: string;
      railway?: string;
    };
  };
  credentials: {
    databaseUrl?: string;
    redisUrl?: string;
  };
  currentTaskIndex: number;
  progress: number; // 0-100
  startedAt?: Date;
  completedAt?: Date;
}

export interface SetupResult {
  success: boolean;
  state: SetupState;
  urls: SetupState['urls'];
  credentials: SetupState['credentials'];
  nextSteps: string[];
  generatedEnvFile?: string;
}

// API Request/Response DTOs
export class StartSetupDto {
  projectId: string;
  projectName: string;
  enableNeon?: boolean;
  enableVercel?: boolean;
  enableRailway?: boolean;
  neonConfig?: NeonProjectConfig;
  vercelConfig?: VercelProjectConfig;
  railwayConfig?: RailwayProjectConfig & { serviceConfig?: RailwayServiceConfig };
  envVars?: Record<string, string>;
}

export class SetupStatusResponse {
  setupId: string;
  status: SetupTaskStatus;
  progress: number;
  currentTask?: string;
  tasks: SetupTask[];
  urls?: SetupState['urls'];
  error?: string;
}

export class ValidateTokensDto {
  neonToken?: string;
  vercelToken?: string;
  railwayToken?: string;
}

export class TokenValidationResult {
  provider: SetupProvider;
  valid: boolean;
  accountInfo?: {
    name?: string;
    email?: string;
    plan?: string;
  };
  error?: string;
}
