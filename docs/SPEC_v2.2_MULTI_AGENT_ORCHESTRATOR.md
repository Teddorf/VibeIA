# Vibe Coding Platform — Multi-Agent Orchestrator Architecture

## Specification for Implementation — v2.2 (Technology-Agnostic, Zero-Hardcode)

**Version:** 2.2
**Date:** February 2026
**Runtime:** Node.js, TypeScript
**Core Principle:** ZERO hardcoded vendor dependencies. ZERO hardcoded values in business logic. Every external service accessed through abstraction interfaces. Every configurable value externalized.
**Deployment:** Local-first. Must run on any developer machine (Windows, macOS, Linux). Cloud optional.
**Purpose:** This document is the implementation spec for Claude Code. Follow it sequentially by layers.

### Delta vs v2.1

- All 8 undefined types now fully specified (CompiledContext, AgentJobData, AgentConfiguration, ContextUpdate, CostEstimate, ValidationError, WorkerDefaultsConfig, IFileSystemProvider)
- ProviderRegistry redesigned to use NestJS DI (no custom Map-based registry)
- Multi-LLM fallback chain preserved (was regressed in v2.1)
- All 11 existing MongoDB collections mapped to IRepository interfaces
- Sections 8-12 restored to full implementation detail
- Observability architecture added (Section 16)
- Data migration strategy added (Section 17)
- 85+ hardcoded values cataloged with externalization plan
- Hardcode Elimination Manifest added (Appendix D)
- Rate limiting added to LLM layer

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Core Principles & Agnosticism Charter](#2-core-principles--agnosticism-charter)
3. [Abstraction Layer Architecture](#3-abstraction-layer-architecture)
4. [Security Architecture](#4-security-architecture)
5. [Agent Protocol](#5-agent-protocol)
6. [Agent Catalog](#6-agent-catalog)
7. [Orchestrator Engine](#7-orchestrator-engine)
8. [Context Management System](#8-context-management-system)
9. [Worker Pool & Scheduling](#9-worker-pool--scheduling)
10. [Token Optimization Layer](#10-token-optimization-layer)
11. [Data Layer (Database-Agnostic)](#11-data-layer-database-agnostic)
12. [Queue Abstraction Layer](#12-queue-abstraction-layer)
13. [API Endpoints](#13-api-endpoints)
14. [Frontend Integration Points](#14-frontend-integration-points)
15. [Local Installation & Runtime](#15-local-installation--runtime)
16. [Observability Architecture](#16-observability-architecture)
17. [Data Migration Strategy](#17-data-migration-strategy)
18. [Implementation Phases](#18-implementation-phases)
19. [Error Handling & Rollback](#19-error-handling--rollback)
20. [Testing Strategy](#20-testing-strategy)
21. [Gap Analysis: Current Codebase vs Spec](#21-gap-analysis-current-codebase-vs-spec)

---

## 1. Architecture Overview

### 1.1 From Monolithic Conductor to Multi-Agent Orchestrator

```
BEFORE (Monolithic):
User -> AI Conductor (single LLM) -> All 4 Phases -> Output

AFTER (Multi-Agent):
User -> Orchestrator
           |-- Planner (generates execution DAG)
           |-- Scheduler (dispatches to worker pools)
           |-- Context Manager (scoped context per agent)
           +-- Result Evaluator (quality gates between steps)
                    |
           +-------+-------+-------+-------+-------+-------+-------+
           v       v       v       v       v       v       v       v
        Architect Analyst Coder  Reviewer DevOps Tester   Doc   Fixer
        Agent    Agent   Agent  Agent    Agent  Agent   Agent  Agent
        (1..N workers per agent profile)
```

### 1.2 Key Architecture Decisions

- **Agents are TypeScript modules** within the same Node.js process with a standardized interface. Designed to extract to microservices when needed.
- **Agents are NOT all LLM-based**. Each agent is a pipeline of deterministic tools + optional LLM reasoning. LLM is the last resort.
- **The Orchestrator is the ONLY component that talks to the user.** Agents never interact with the user directly.
- **Workers are elastic** with user-configured caps via plan tiers.
- **EVERY external dependency is behind an interface.** LLM, database, queue, VCS, deploy, cache, filesystem, sandbox.
- **Local-first.** MUST run on any developer machine with zero cloud dependencies.
- **NestJS DI is the provider registry.** No custom registry — use injection tokens and module factories.

---

## 2. Core Principles & Agnosticism Charter

### 2.1 Design Principles

1. **Single Responsibility**: Each agent masters ONE domain.
2. **Composability**: Agents combine via typed input/output contracts.
3. **Observability**: Every invocation logged with traceId, inputs, outputs, tokens, duration, model, cost.
4. **Fail-safe**: Failure of one agent does not collapse the pipeline. Retries, fallbacks, rollbacks.
5. **Context Scoping**: Each agent receives MINIMUM context needed. Never the full project.
6. **Deterministic First**: Tools, templates, rules BEFORE LLM. LLM is last resort.
7. **Cost Awareness**: Every LLM call tracked. Token budgets enforced.
8. **Vendor Agnosticism**: NO business logic references a specific vendor. All through adapters.
9. **Local-First**: Core orchestrator runs on localhost. Cloud is opt-in.
10. **Security by Default**: Encrypted credentials, sandboxed execution, no arbitrary code without containment.
11. **Cross-Platform**: MUST run identically on Windows, macOS, Linux. ZERO OS-specific code in business logic.
12. **Zero-Hardcode**: NO magic numbers, model IDs, URLs, timeouts, thresholds, or pricing in source code. ALL externalized to configuration.

### 2.2 Agnosticism Charter

```
+----------------------------+-----------------------------------------------+
| DIMENSION                  | INTERFACE                                     |
+----------------------------+-----------------------------------------------+
| LLM Provider               | ILLMProvider (with fallback chain)            |
| Database                   | IRepository<T> + IDatabaseProvider             |
| Queue / Job System         | IQueueProvider + IQueue                        |
| Version Control            | IVCSProvider                                   |
| Deployment                 | IDeployProvider                                |
| Cache                      | ICacheProvider                                 |
| File System / Code Storage | IFileSystemProvider                            |
| Code Execution Sandbox     | ISandboxProvider + ISandbox                     |
| Operating System           | Platform utility module (no OS code elsewhere) |
+----------------------------+-----------------------------------------------+
```

### 2.3 Cross-Platform Compliance Rules

```typescript
// src/platform/index.ts — Created in Phase 0

export function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

export function joinLines(lines: string[]): string {
  return lines.join('\n');
}

export function getTempDir(subdir?: string): string {
  const base = path.join(os.tmpdir(), 'vibe');
  return subdir ? path.join(base, subdir) : base;
}

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

export function isWindows(): boolean {
  return os.platform() === 'win32';
}
export function isMacOS(): boolean {
  return os.platform() === 'darwin';
}
export function isLinux(): boolean {
  return os.platform() === 'linux';
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function removeDir(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true });
}
```

### 2.4 Zero-Hardcode Rule

**Every configurable value MUST come from `VibeConfig` or environment variables.** The source code MUST NOT contain:

- Model IDs (`claude-sonnet-4-20250514`, `gpt-4o`, etc.)
- API URLs (`https://api.github.com`, etc.)
- Token limits (`8192`, `4096`, etc.)
- Pricing values (`$3/M`, `$15/M`, etc.)
- Rate limit thresholds (`5 req/15min`, etc.)
- Quality gate scores (`80`, `90`, etc.)
- Timeout values (`60000ms`, etc.)
- Provider name strings (`'anthropic'`, `'openai'`, etc.)
- Encryption parameters (`'aes-256-gcm'`, key sizes, etc.)
- JWT expiry times (`'15m'`, `'7d'`, etc.)
- Plan pricing (`$29/mo`, `$99/mo`, etc.)
- Bcrypt salt rounds (`10`)

All these live in configuration. Code references config, never literals.

### 2.5 Constraints

- Maximum task duration: configurable (default: 10 minutes)
- Quality gates between every pipeline step
- Test coverage minimum: configurable (default: 80%)
- All agent outputs must be serializable JSON
- No agent can modify state outside its declared output schema
- Every LLM call traceable to task + agent + pipeline
- No plaintext credentials — encrypted or in env vars
- Generated code executes ONLY inside sandbox
- ZERO OS-specific code outside platform utility module
- ZERO hardcoded values outside configuration files

---

## 3. Abstraction Layer Architecture

### 3.1 NestJS DI as Provider Registry

**No custom ProviderRegistry class.** Use NestJS dependency injection with typed tokens:

```typescript
// src/providers/tokens.ts

export const LLM_PROVIDER = Symbol('ILLMProvider');
export const LLM_FALLBACK_CHAIN = Symbol('ILLMFallbackChain');
export const DATABASE_PROVIDER = Symbol('IDatabaseProvider');
export const QUEUE_PROVIDER = Symbol('IQueueProvider');
export const CACHE_PROVIDER = Symbol('ICacheProvider');
export const VCS_PROVIDER = Symbol('IVCSProvider');
export const DEPLOY_PROVIDER = Symbol('IDeployProvider');
export const SANDBOX_PROVIDER = Symbol('ISandboxProvider');
export const FILESYSTEM_PROVIDER = Symbol('IFileSystemProvider');
export const VIBE_CONFIG = Symbol('VibeConfig');
```

```typescript
// src/providers/providers.module.ts

@Module({
  providers: [
    {
      provide: VIBE_CONFIG,
      useFactory: () => loadVibeConfig(), // reads config file + env vars
    },
    {
      provide: LLM_PROVIDER,
      useFactory: (config: VibeConfig) => createLLMAdapter(config.providers.llm),
      inject: [VIBE_CONFIG],
    },
    {
      provide: LLM_FALLBACK_CHAIN,
      useFactory: (config: VibeConfig) => createLLMFallbackChain(config.providers.llm),
      inject: [VIBE_CONFIG],
    },
    {
      provide: DATABASE_PROVIDER,
      useFactory: (config: VibeConfig) => createDatabaseAdapter(config.providers.database),
      inject: [VIBE_CONFIG],
    },
    // ... same pattern for all providers
  ],
  exports: [
    VIBE_CONFIG,
    LLM_PROVIDER,
    LLM_FALLBACK_CHAIN,
    DATABASE_PROVIDER,
    QUEUE_PROVIDER,
    CACHE_PROVIDER,
    VCS_PROVIDER,
    DEPLOY_PROVIDER,
    SANDBOX_PROVIDER,
    FILESYSTEM_PROVIDER,
  ],
})
export class ProvidersModule {}
```

**Agents inject providers via constructor:**

```typescript
@Injectable()
export class CoderAgent implements IAgent {
  constructor(
    @Inject(LLM_PROVIDER) private llm: ILLMProvider,
    @Inject(VCS_PROVIDER) private vcs: IVCSProvider,
    @Inject(SANDBOX_PROVIDER) private sandbox: ISandboxProvider,
    @Inject(FILESYSTEM_PROVIDER) private fs: IFileSystemProvider,
  ) {}
}
```

### 3.2 Base Provider Interface

```typescript
// src/providers/types.ts

interface IProvider {
  readonly providerId: string;
  readonly providerType: ProviderType;
  initialize(config: ProviderConfig): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
}

type ProviderType =
  | 'llm'
  | 'database'
  | 'queue'
  | 'cache'
  | 'vcs'
  | 'deploy'
  | 'filesystem'
  | 'sandbox';

interface ProviderConfig {
  [key: string]: unknown;
}

interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  details?: string;
  lastCheckedAt: Date;
}
```

### 3.3 LLM Provider Interface

```typescript
// src/providers/llm/ILLMProvider.ts

interface ILLMProvider extends IProvider {
  providerType: 'llm';
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
  listModels(): Promise<ModelInfo[]>;
  getModelPricing(modelId: string): ModelPricing;
  supportsCapability(capability: LLMCapability): boolean;
  validateApiKey(apiKey: string): Promise<boolean>;
}

/**
 * Fallback chain — preserves existing multi-provider behavior.
 * The orchestrator calls chain.complete() which tries providers in order.
 */
interface ILLMFallbackChain {
  readonly providers: ILLMProvider[];
  complete(request: LLMRequest): Promise<LLMResponse>;
  stream(request: LLMRequest): AsyncIterable<LLMStreamChunk>;
  addProvider(provider: ILLMProvider, priority: number): void;
  removeProvider(providerId: string): void;
  getActiveProvider(): ILLMProvider;
}

interface LLMRequest {
  model: string; // Resolved by ModelRouter from tier
  systemPrompt: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number; // From config, NEVER hardcoded
  responseFormat?: 'text' | 'json';
  stopSequences?: string[];
  metadata?: {
    traceId: string; // NEW: for observability
    taskId: string;
    agentId: string;
    pipelineId: string;
  };
}

interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string | LLMContentBlock[];
}

interface LLMContentBlock {
  type: 'text' | 'image';
  text?: string;
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
}

interface LLMResponse {
  content: string;
  model: string;
  usage: TokenUsage;
  finishReason: 'stop' | 'max_tokens' | 'error';
  latencyMs: number;
  cached: boolean;
  providerId: string;
  traceId: string; // NEW: propagated from request
}

interface LLMStreamChunk {
  content: string;
  done: boolean;
  usage?: TokenUsage;
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  totalTokens: number;
}

interface ModelInfo {
  modelId: string;
  displayName: string;
  tier: ModelTier;
  contextWindow: number;
  supportsImages: boolean;
  supportsStreaming: boolean;
  supportsCaching: boolean;
  supportsJson: boolean;
}

interface ModelPricing {
  inputPerMillionTokens: number;
  outputPerMillionTokens: number;
  cachedInputPerMillionTokens?: number;
}

type LLMCapability =
  | 'streaming'
  | 'prompt-caching'
  | 'structured-output'
  | 'image-input'
  | 'function-calling'
  | 'long-context'
  | 'extended-thinking'; // NEW: for o1/o3 style models

type ModelTier = 'fast' | 'balanced' | 'powerful';
```

### 3.4 Database Provider Interface

```typescript
// src/providers/database/IRepository.ts

interface IRepository<T, CreateDTO = Partial<T>, UpdateDTO = Partial<T>> {
  findById(id: string): Promise<T | null>;
  findOne(filter: QueryFilter<T>): Promise<T | null>;
  findMany(filter: QueryFilter<T>, options?: QueryOptions): Promise<T[]>;
  create(data: CreateDTO): Promise<T>;
  createMany(data: CreateDTO[]): Promise<T[]>;
  update(id: string, data: UpdateDTO): Promise<T | null>;
  updateMany(filter: QueryFilter<T>, data: UpdateDTO): Promise<number>;
  delete(id: string): Promise<boolean>;
  deleteMany(filter: QueryFilter<T>): Promise<number>;
  count(filter?: QueryFilter<T>): Promise<number>;
  exists(filter: QueryFilter<T>): Promise<boolean>;
}

interface QueryFilter<T> {
  where: Partial<Record<keyof T, unknown>>;
  tags?: string[];
  dateRange?: { field: keyof T; from?: Date; to?: Date };
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  select?: string[];
}

// --- Orchestrator Repositories (NEW entities) ---

interface IExecutionPlanRepository extends IRepository<ExecutionPlan> {
  findByProjectAndStatus(projectId: string, status: PlanStatus): Promise<ExecutionPlan[]>;
  updateNodeStatus(
    planId: string,
    nodeId: string,
    status: NodeStatus,
    output?: AgentOutput,
  ): Promise<void>;
  getReadyNodes(planId: string): Promise<DAGNode[]>;
}

interface IAgentContextRepository extends IRepository<ContextEntry> {
  findByProjectAndTags(
    projectId: string,
    tags: string[],
    scope?: ContextScope,
  ): Promise<ContextEntry[]>;
  findByProjectAndType(projectId: string, type: ContextType): Promise<ContextEntry[]>;
  invalidateByPipeline(pipelineId: string): Promise<number>;
  compileForAgent(projectId: string, agentId: string, taskTags: string[]): Promise<ContextEntry[]>;
}

interface IAgentExecutionRepository extends IRepository<AgentExecution> {
  getMetricsForPipeline(pipelineId: string): Promise<AggregatedMetrics>;
  getCostForProject(projectId: string, dateRange?: DateRange): Promise<CostSummary>;
}

// --- Existing Entity Repositories (wrap current Mongoose models) ---

interface IUserRepository extends IRepository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByOAuthId(provider: string, oauthId: string): Promise<User | null>;
}

interface IProjectRepository extends IRepository<Project> {
  findByOwner(ownerId: string): Promise<Project[]>;
}

interface IPlanRepository extends IRepository<Plan> {
  findByProject(projectId: string): Promise<Plan[]>;
  updateTaskStatus(
    planId: string,
    phaseIndex: number,
    taskId: string,
    status: string,
  ): Promise<void>;
}

interface ITeamRepository extends IRepository<Team> {
  findBySlug(slug: string): Promise<Team | null>;
  findByOwner(ownerId: string): Promise<Team[]>;
}

interface ITeamMemberRepository extends IRepository<TeamMember> {
  findByTeamAndUser(teamId: string, userId: string): Promise<TeamMember | null>;
  findByTeam(teamId: string): Promise<TeamMember[]>;
}

interface ICredentialRepository extends IRepository<Credential> {
  findByUserAndProvider(userId: string, provider: string): Promise<Credential | null>;
  findActiveByUser(userId: string): Promise<Credential[]>;
}

interface ISetupStateRepository extends IRepository<SetupState> {
  findBySetupId(setupId: string): Promise<SetupState | null>;
}

interface ISecurityAuditRepository extends IRepository<SecurityAudit> {
  findByUserAndDateRange(userId: string, from: Date, to: Date): Promise<SecurityAudit[]>;
}

// --- Database Provider ---

interface IDatabaseProvider extends IProvider {
  providerType: 'database';
  withTransaction<T>(fn: (session: TransactionSession) => Promise<T>): Promise<T>;

  // Orchestrator repositories
  executionPlans: IExecutionPlanRepository;
  agentContext: IAgentContextRepository;
  agentExecutions: IAgentExecutionRepository;
  workerPoolConfigs: IRepository<WorkerPoolConfig>;
  agentProfiles: IRepository<AgentProfile>;

  // Existing entity repositories
  users: IUserRepository;
  projects: IProjectRepository;
  plans: IPlanRepository;
  teams: ITeamRepository;
  teamMembers: ITeamMemberRepository;
  teamInvitations: IRepository<TeamInvitation>;
  gitConnections: IRepository<GitConnection>;
  credentials: ICredentialRepository;
  setupStates: ISetupStateRepository;
  workspaces: IRepository<Workspace>;
  securityAudits: ISecurityAuditRepository;
}
```

### 3.5 Queue Provider Interface

```typescript
interface IQueueProvider extends IProvider {
  providerType: 'queue';
  createQueue(queueName: string, options?: QueueOptions): Promise<IQueue>;
  getQueue(queueName: string): Promise<IQueue | null>;
  onEvent(event: QueueEvent, handler: QueueEventHandler): void;
}

interface IQueue {
  name: string;
  enqueue(jobData: AgentJobData, options?: JobOptions): Promise<string>;
  process(handler: JobHandler, concurrency: number): void;
  setConcurrency(concurrency: number): Promise<void>;
  getDepth(): Promise<number>;
  getActiveCount(): Promise<number>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  drain(): Promise<void>;
}

interface QueueOptions {
  maxRetries?: number;
  retryBackoff?: 'fixed' | 'exponential';
  retryDelayMs?: number;
  jobTimeoutMs?: number;
  removeCompletedAfterMs?: number;
  removeFailedAfterMs?: number;
}
```

### 3.6 VCS Provider Interface

```typescript
interface IVCSProvider extends IProvider {
  providerType: 'vcs';
  createBranch(repo: string, branchName: string, fromRef?: string): Promise<BranchInfo>;
  deleteBranch(repo: string, branchName: string): Promise<void>;
  listBranches(repo: string): Promise<BranchInfo[]>;
  commit(repo: string, branch: string, files: FileChange[], message: string): Promise<CommitInfo>;
  createPullRequest(repo: string, pr: CreatePRInput): Promise<PullRequestInfo>;
  mergePullRequest(repo: string, prId: string, strategy?: MergeStrategy): Promise<MergeResult>;
  getFile(repo: string, filePath: string, ref?: string): Promise<FileContent>;
  getTree(repo: string, dirPath: string, ref?: string): Promise<TreeEntry[]>;
  getDiff(repo: string, base: string, head: string): Promise<DiffResult>;
}
```

### 3.7 Deploy Provider Interface

```typescript
interface IDeployProvider extends IProvider {
  providerType: 'deploy';
  deploy(config: DeployConfig): Promise<DeployResult>;
  getDeploymentStatus(deployId: string): Promise<DeployStatus>;
  rollback(deployId: string): Promise<DeployResult>;
  getDeploymentLogs(deployId: string): Promise<string[]>;
  getDeploymentUrl(deployId: string): Promise<string>;
}
```

### 3.8 Cache Provider Interface

```typescript
interface ICacheProvider extends IProvider {
  providerType: 'cache';
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<number>;
  has(key: string): Promise<boolean>;
  flush(): Promise<void>;
}
```

### 3.9 Sandbox Provider Interface

```typescript
interface ISandboxProvider extends IProvider {
  providerType: 'sandbox';
  createSandbox(config: SandboxConfig): Promise<ISandbox>;
}

interface ISandbox {
  id: string;
  exec(command: string, args?: string[], options?: ExecOptions): Promise<ExecResult>;
  writeFile(filePath: string, content: string): Promise<void>;
  readFile(filePath: string): Promise<string>;
  listFiles(dirPath: string): Promise<string[]>;
  destroy(): Promise<void>;
}

interface SandboxConfig {
  workingDirectory: string;
  memoryLimitMB: number;
  cpuLimit: number;
  timeoutMs: number;
  networkAccess: 'none' | 'restricted' | 'full';
  allowedHosts?: string[];
  env?: Record<string, string>;
}

interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}
```

### 3.10 FileSystem Provider Interface (NEW — was missing in v2.1)

```typescript
// src/providers/filesystem/IFileSystemProvider.ts

interface IFileSystemProvider extends IProvider {
  providerType: 'filesystem';

  readFile(filePath: string): Promise<string>;
  writeFile(filePath: string, content: string): Promise<void>;
  deleteFile(filePath: string): Promise<void>;
  exists(filePath: string): Promise<boolean>;

  readDir(dirPath: string): Promise<string[]>;
  createDir(dirPath: string): Promise<void>;
  deleteDir(dirPath: string): Promise<void>;

  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;

  getMetadata(filePath: string): Promise<FileMetadata>;
  glob(pattern: string, basePath?: string): Promise<string[]>;
}

interface FileMetadata {
  size: number;
  createdAt: Date;
  modifiedAt: Date;
  isDirectory: boolean;
}

// Adapters:
// - LocalFileSystemAdapter: Node.js fs/promises. Default for local-first.
// - S3FileSystemAdapter: For cloud storage.
// - GitRepoFileSystemAdapter: Files within a git repo via IVCSProvider.
```

### 3.11 Configuration System (Zero-Hardcode)

```typescript
// src/config/vibeConfig.ts

interface VibeConfig {
  providers: {
    llm: LLMProviderConfig;
    database: DatabaseProviderConfig;
    queue: QueueProviderConfig;
    cache: CacheProviderConfig;
    vcs: VCSProviderConfig;
    deploy: DeployProviderConfig;
    sandbox: SandboxProviderConfig;
    filesystem: FileSystemProviderConfig;
  };
  security: SecurityConfig;
  workers: WorkerDefaultsConfig;
  observability: ObservabilityConfig;
  rateLimits: RateLimitConfig;
  taskDefaults: TaskDefaultsConfig;
}

interface LLMProviderConfig {
  primary: {
    provider: string; // 'anthropic' | 'openai' | 'google' | 'ollama' | ...
    config: Record<string, unknown>;
  };
  fallbacks?: Array<{
    provider: string;
    config: Record<string, unknown>;
  }>;
  fallbackEnabled: boolean;
  modelMapping: {
    fast: string; // e.g., 'claude-haiku-4-5-20251001'
    balanced: string; // e.g., 'claude-sonnet-4-5-20250929'
    powerful: string; // e.g., 'claude-opus-4-6'
  };
  defaultMaxTokens: {
    planGeneration: number; // e.g., 8192
    codeGeneration: number; // e.g., 8192
    review: number; // e.g., 4096
    validation: number; // e.g., 10
  };
  pricing: Record<string, ModelPricing>; // model ID -> pricing
}

interface DatabaseProviderConfig {
  provider: string;
  config: Record<string, unknown>; // connectionString, filePath, etc.
}

interface QueueProviderConfig {
  provider: string;
  config: Record<string, unknown>;
}

interface CacheProviderConfig {
  provider: string;
  config: Record<string, unknown>;
}

interface VCSProviderConfig {
  provider: string;
  config: Record<string, unknown>;
}

interface DeployProviderConfig {
  provider: string;
  config: Record<string, unknown>;
}

interface SandboxProviderConfig {
  provider: string;
  config: Record<string, unknown>;
  defaults: {
    memoryLimitMB: number;
    cpuLimit: number;
    timeoutMs: number;
    networkAccess: 'none' | 'restricted' | 'full';
  };
}

interface FileSystemProviderConfig {
  provider: string;
  config: Record<string, unknown>;
}

interface WorkerDefaultsConfig {
  maxWorkersPerAgent: Record<string, number>;
  totalConcurrentWorkers: number;
  contextAffinityEnabled: boolean;
  jobTimeoutMs: number;
  maxRetriesPerJob: number;
  retryBackoff: 'fixed' | 'exponential';
  retryDelayMs: number;
}

interface ObservabilityConfig {
  logFormat: 'json' | 'text';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  traceEnabled: boolean;
  metricsEnabled: boolean;
  auditRetentionDays: number;
}

interface RateLimitConfig {
  global: { ttlMs: number; limit: number };
  auth: {
    register: { ttlMs: number; limit: number };
    login: { ttlMs: number; limit: number };
    refresh: { ttlMs: number; limit: number };
    forgotPassword: { ttlMs: number; limit: number };
  };
  llm: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
}

interface TaskDefaultsConfig {
  maxDurationMinutes: number; // default: 10
  qualityGateThresholds: {
    lint: { minScore: number };
    security: { minScore: number };
    test: { minScore: number };
    coverage: { minScore: number };
  };
}

interface SecurityConfig {
  encryption: {
    algorithm: string; // default: 'aes-256-gcm'
    keyLength: number; // default: 32
    ivLength: number; // default: 16
    tagLength: number; // default: 16
  };
  jwt: {
    accessTokenExpiry: string; // default: '15m'
    refreshTokenExpiry: string; // default: '7d'
  };
  bcrypt: {
    saltRounds: number; // default: 10
  };
  sandbox: {
    enabled: boolean;
    networkPolicy: 'none' | 'restricted' | 'full';
    allowedOutboundHosts: string[];
  };
  costLimits: {
    maxTokensPerTask: number;
    maxCostPerPipeline: number;
    maxCostPerDay: number;
    alertThresholdPercent: number;
  };
  sanitization: {
    maxContextEntrySize: number;
    stripHTMLFromContext: boolean;
    blockPromptInjectionPatterns: boolean;
  };
}
```

### 3.12 Preset Configurations

```typescript
const PRESET_LOCAL: VibeConfig = {
  providers: {
    llm: {
      primary: { provider: 'ollama', config: { baseUrl: 'http://localhost:11434' } },
      fallbacks: [],
      fallbackEnabled: false,
      modelMapping: { fast: 'llama3.2:3b', balanced: 'llama3.1:8b', powerful: 'deepseek-r1:32b' },
      defaultMaxTokens: {
        planGeneration: 8192,
        codeGeneration: 8192,
        review: 4096,
        validation: 10,
      },
      pricing: {},
    },
    database: { provider: 'sqlite', config: { filePath: './data/vibe.db' } },
    queue: { provider: 'in-memory', config: {} },
    cache: { provider: 'in-memory', config: {} },
    vcs: { provider: 'local-git', config: {} },
    deploy: { provider: 'none', config: {} },
    sandbox: {
      provider: 'local-process',
      config: {},
      defaults: { memoryLimitMB: 512, cpuLimit: 1, timeoutMs: 600000, networkAccess: 'none' },
    },
    filesystem: { provider: 'local', config: {} },
  },
  // ... security, workers, observability, rateLimits, taskDefaults with defaults
};

const PRESET_CLOUD_ANTHROPIC: VibeConfig = {
  providers: {
    llm: {
      primary: { provider: 'anthropic', config: { apiKey: '${ANTHROPIC_API_KEY}' } },
      fallbacks: [
        { provider: 'openai', config: { apiKey: '${OPENAI_API_KEY}' } },
        { provider: 'google', config: { apiKey: '${GOOGLE_AI_API_KEY}' } },
      ],
      fallbackEnabled: true,
      modelMapping: {
        fast: 'claude-haiku-4-5-20251001',
        balanced: 'claude-sonnet-4-5-20250929',
        powerful: 'claude-opus-4-6',
      },
      defaultMaxTokens: {
        planGeneration: 8192,
        codeGeneration: 8192,
        review: 4096,
        validation: 10,
      },
      pricing: {
        'claude-haiku-4-5-20251001': { inputPerMillionTokens: 0.8, outputPerMillionTokens: 4 },
        'claude-sonnet-4-5-20250929': { inputPerMillionTokens: 3, outputPerMillionTokens: 15 },
        'claude-opus-4-6': { inputPerMillionTokens: 15, outputPerMillionTokens: 75 },
      },
    },
    database: { provider: 'mongodb', config: { connectionString: '${MONGODB_URI}' } },
    queue: { provider: 'bullmq', config: { redisUrl: '${REDIS_URL}' } },
    cache: { provider: 'redis', config: { redisUrl: '${REDIS_URL}' } },
    vcs: { provider: 'github', config: { token: '${GITHUB_TOKEN}' } },
    deploy: { provider: 'vercel', config: { token: '${VERCEL_TOKEN}' } },
    sandbox: {
      provider: 'docker',
      config: {},
      defaults: { memoryLimitMB: 512, cpuLimit: 1, timeoutMs: 600000, networkAccess: 'none' },
    },
    filesystem: { provider: 'local', config: {} },
  },
  // ...
};
```

---

## 4. Security Architecture

Same as v2.1 Section 4, but with ALL values externalized to `SecurityConfig` in `VibeConfig`. No hardcoded algorithms, key sizes, or thresholds.

---

## 5. Agent Protocol — Complete Type Definitions

### 5.1 All Previously-Undefined Types (FIXED)

```typescript
// src/agents/protocol.ts — ALL types now defined

// --- AgentJobData (was undefined in v2.1) ---
interface AgentJobData {
  taskId: string;
  pipelineId: string;
  projectId: string;
  agentId: string;
  taskDefinition: TaskDefinition;
  contextKeys: string[]; // References to ContextEntry IDs for lazy loading
  previousOutputIds: string[]; // References to previous AgentOutput IDs
  configOverrides?: Partial<AgentConfiguration>;
  traceId: string;
}

// --- CompiledContext (was undefined in v2.1) ---
interface CompiledContext {
  entries: ContextEntry[];
  tokenBudget: number; // Max tokens allocated for this context
  tokenCount: number; // Actual tokens used
  compiledAt: Date;
  cacheKey: string; // For cache invalidation
  scope: {
    global: ContextEntry[];
    domainSpecific: ContextEntry[];
    taskSpecific: ContextEntry[];
  };
}

// --- AgentConfiguration (was undefined in v2.1) ---
interface AgentConfiguration {
  modelTierOverride?: ModelTier; // Override agent's default tier
  maxTokensOverride?: number; // Override default max tokens
  timeoutMs: number; // Per-task timeout
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
  deterministicOnly: boolean; // If true, skip LLM entirely
  costBudgetUSD: number; // Max cost for this invocation
}

// --- ContextUpdate (was undefined in v2.1) ---
interface ContextUpdate {
  operation: 'add' | 'update' | 'invalidate' | 'supersede';
  entry: Partial<ContextEntry>;
  targetId?: string; // For update/invalidate/supersede
  reason: string;
}

// --- CostEstimate (was undefined in v2.1) ---
interface CostEstimate {
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  estimatedCachedTokens: number;
  modelTier: ModelTier;
  modelId: string;
  estimatedCostUSD: number;
  confidenceLevel: 'low' | 'medium' | 'high';
}

// --- ValidationError (was undefined in v2.1) ---
interface ValidationError {
  field: string;
  message: string;
  code: string; // 'MISSING_CONTEXT' | 'INVALID_TASK' | etc.
  severity: 'error' | 'warning';
}
```

### 5.2 Agent Interface (unchanged from v2.1)

```typescript
interface IAgent {
  profile: AgentProfile;
  execute(input: AgentInput): Promise<AgentOutput>;
  validateInput(input: AgentInput): ValidationError[] | null;
  estimateCost(input: AgentInput): CostEstimate;
  canHandle(task: TaskDefinition): boolean;
}
```

### 5.3 Full AgentInput / AgentOutput (unchanged, now with all types defined)

Same as v2.1 Section 5.1 — all referenced types are now complete.

---

## 6. Agent Catalog

Same as v2.1 Section 6. No changes needed.

---

## 7. Orchestrator Engine

Same as v2.1 Section 7, but with one critical addition:

### 7.1 Model Router reads from VibeConfig

```typescript
class ModelRouter {
  constructor(@Inject(VIBE_CONFIG) private config: VibeConfig) {}

  resolve(tier: ModelTier): string {
    return this.config.providers.llm.modelMapping[tier]; // from config, NOT hardcoded
  }

  getMaxTokens(purpose: 'planGeneration' | 'codeGeneration' | 'review' | 'validation'): number {
    return this.config.providers.llm.defaultMaxTokens[purpose]; // from config
  }

  getPricing(modelId: string): ModelPricing {
    return this.config.providers.llm.pricing[modelId]; // from config
  }
}
```

---

## 8. Context Management System (RESTORED from v2.0)

### 8.1 Context Store

Same as v2.1 Section 8.1 (ContextEntry, ContextType, ContextScope).

### 8.2 Context Compiler (RESTORED — was condensed in v2.1)

```typescript
class ContextCompiler {
  constructor(
    @Inject(DATABASE_PROVIDER) private db: IDatabaseProvider,
    @Inject(CACHE_PROVIDER) private cache: ICacheProvider,
    @Inject(VIBE_CONFIG) private config: VibeConfig,
  ) {}

  async compile(
    agentId: string,
    task: TaskDefinition,
    pipeline: ExecutionPlan,
    maxTokens?: number,
  ): Promise<CompiledContext> {
    const budget = maxTokens ?? this.config.providers.llm.defaultMaxTokens.codeGeneration;

    // 1. Check cache
    const cacheKey = `ctx:${pipeline.projectId}:${agentId}:${task.tags.join(',')}`;
    const cached = await this.cache.get<CompiledContext>(cacheKey);
    if (cached) return cached;

    // 2. Query context store (database-agnostic)
    const global = await this.db.agentContext.findByProjectAndTags(pipeline.projectId, ['global']);
    const domainSpecific = await this.db.agentContext.findByProjectAndTags(
      pipeline.projectId,
      task.tags,
    );
    const taskSpecific = await this.db.agentContext.findMany({
      where: { projectId: pipeline.projectId },
      tags: [task.id],
    });

    // 3. Trim to token budget (priority: task > domain > global)
    const entries = this.trimToTokenBudget([...taskSpecific, ...domainSpecific, ...global], budget);
    const tokenCount = this.countTokens(entries);

    // 4. Compile result
    const compiled: CompiledContext = {
      entries,
      tokenBudget: budget,
      tokenCount,
      compiledAt: new Date(),
      cacheKey,
      scope: { global, domainSpecific, taskSpecific },
    };

    // 5. Cache for 1 hour
    await this.cache.set(cacheKey, compiled, 3600);
    return compiled;
  }

  private trimToTokenBudget(entries: ContextEntry[], budget: number): ContextEntry[] {
    let currentTokens = 0;
    const result: ContextEntry[] = [];
    for (const entry of entries) {
      const entryTokens = this.estimateTokens(entry);
      if (currentTokens + entryTokens > budget) break;
      result.push(entry);
      currentTokens += entryTokens;
    }
    return result;
  }

  private estimateTokens(entry: ContextEntry): number {
    return Math.ceil(JSON.stringify(entry.content).length / 4);
  }

  private countTokens(entries: ContextEntry[]): number {
    return entries.reduce((sum, e) => sum + this.estimateTokens(e), 0);
  }
}
```

---

## 9. Worker Pool & Scheduling (RESTORED from v2.0)

### 9.1 WorkerPoolManager

```typescript
class WorkerPoolManager {
  constructor(
    @Inject(QUEUE_PROVIDER) private queueProvider: IQueueProvider,
    private agentRegistry: AgentRegistry,
    @Inject(VIBE_CONFIG) private config: VibeConfig,
  ) {}

  async setupAgentQueue(agentId: string, maxWorkers: number): Promise<IQueue> {
    const queue = await this.queueProvider.createQueue(`agent:${agentId}`, {
      maxRetries: this.config.workers.maxRetriesPerJob,
      retryBackoff: this.config.workers.retryBackoff,
      retryDelayMs: this.config.workers.retryDelayMs,
      jobTimeoutMs: this.config.workers.jobTimeoutMs,
    });

    queue.process(async (job) => {
      const agent = this.agentRegistry.get(job.data.agentId);
      return await agent.execute(job.data);
    }, maxWorkers);

    return queue;
  }

  async updateWorkerCount(agentId: string, newCount: number): Promise<void> {
    const queue = await this.queueProvider.getQueue(`agent:${agentId}`);
    if (queue) await queue.setConcurrency(newCount);
  }
}
```

### 9.2 Parallel Worker Conflict Handling

1. Each worker operates on a VCS branch (via `IVCSProvider.createBranch()`)
2. Merge is a separate DAG step after parallel workers complete
3. Merge conflicts handled by Fixer Agent
4. Context affinity: prefer worker that recently handled same module

### 9.3 Plan Limits (from config, NOT hardcoded)

Plan limits are loaded from `VibeConfig.workers` and billing plan tier. The free/pro/enterprise tiers are defined in the billing configuration, not in source code.

---

## 10. Token Optimization Layer (RESTORED from v2.0)

### 10.1 Seven Optimization Layers

```
Layer 1: Deterministic First       <- Eliminate LLM calls entirely
Layer 2: Context Scoping           <- Reduce input tokens per call
Layer 3: Decision Cache            <- Avoid redundant LLM calls (via ICacheProvider)
Layer 4: Model Tiering             <- Use cheaper tiers where possible (via ModelRouter)
Layer 5: Prompt Compilation        <- Minimize system prompt tokens
Layer 6: Early Termination         <- Reduce output tokens on failure
Layer 7: Provider Prompt Caching   <- Use provider's native caching if supported
```

### 10.2 Prompt Compiler

```typescript
interface PromptModule {
  id: string;
  content: string;
  tokenCount: number;
  applicableTo: string[]; // Agent IDs or '*'
  requiredFor: TaskType[]; // Task types or '*'
}

function compileSystemPrompt(agentId: string, taskType: TaskType, modules: PromptModule[]): string {
  return modules
    .filter(
      (m) =>
        (m.applicableTo.includes(agentId) || m.applicableTo.includes('*')) &&
        (m.requiredFor.includes(taskType) || m.requiredFor.includes('*')),
    )
    .map((m) => m.content)
    .join('\n\n');
}
```

### 10.3 Early Termination

```typescript
async function executeWithEarlyTermination(
  llmStream: AsyncIterable<LLMStreamChunk>,
  stopConditions: StopCondition[],
): Promise<{ output: string; terminated: boolean; reason?: string }> {
  let accumulated = '';
  for await (const chunk of llmStream) {
    accumulated += chunk.content;
    for (const condition of stopConditions) {
      if (accumulated.match(condition.pattern) && condition.action === 'abort') {
        return { output: accumulated, terminated: true, reason: condition.reason };
      }
    }
  }
  return { output: accumulated, terminated: false };
}
```

---

## 11. Data Layer (RESTORED — all entities defined)

### 11.1 Orchestrator Entities (NEW)

```typescript
interface ExecutionPlan {
  id: string;
  projectId: string;
  intent: string;
  parsedIntent: ParsedIntent;
  dag: DAGNode[];
  estimatedCost: CostEstimate;
  estimatedDuration: number;
  status: PlanStatus;
  approvedAt?: Date;
  completedAt?: Date;
  errorLog: ErrorLogEntry[];
  createdAt: Date;
  updatedAt: Date;
}

interface AgentExecution {
  id: string;
  projectId: string;
  pipelineId: string;
  taskId: string;
  agentId: string;
  workerId?: string;
  status: 'success' | 'failure' | 'partial' | 'needs-review';
  input: { contextTokens: number; taskSummary: string };
  output: { artifactCount: number; artifactTypes: string[]; qualityPassed: boolean };
  metrics: ExecutionMetrics;
  errorDetails?: string;
  traceId: string;
  createdAt: Date;
}

interface WorkerPoolConfig {
  id: string;
  projectId: string;
  userId: string;
  agentId: string;
  maxWorkers: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 11.2 Existing Entities (11 MongoDB collections — wrapped by IRepository)

The following entities already exist as Mongoose schemas. Phase 1 wraps each as an IRepository adapter:

| Entity         | Collection      | Schema File                                       | Key Indexes                                                             |
| -------------- | --------------- | ------------------------------------------------- | ----------------------------------------------------------------------- |
| User           | users           | modules/users/user.schema.ts                      | email (unique), githubId (sparse), googleId (sparse), gitlabId (sparse) |
| Project        | projects        | schemas/project.schema.ts                         | ownerId                                                                 |
| Plan           | plans           | schemas/plan.schema.ts                            | projectId, userId                                                       |
| Team           | teams           | modules/teams/schemas/team.schema.ts              | slug (unique), ownerId, createdAt                                       |
| TeamMember     | teammembers     | modules/teams/schemas/team-member.schema.ts       | teamId+userId (unique compound)                                         |
| TeamInvitation | teaminvitations | modules/teams/schemas/team-invitation.schema.ts   | token (unique), expiresAt (TTL)                                         |
| GitConnection  | gitconnections  | modules/teams/schemas/git-connection.schema.ts    | teamId+provider                                                         |
| SetupState     | setupstates     | modules/setup/schemas/setup-state.schema.ts       | setupId (unique), userId, status                                        |
| Credential     | credentials     | modules/security/schemas/credential.schema.ts     | userId+provider                                                         |
| Workspace      | workspaces      | modules/security/schemas/workspace.schema.ts      | expiresAt (TTL)                                                         |
| SecurityAudit  | securityaudits  | modules/security/schemas/security-audit.schema.ts | eventType+createdAt, createdAt (TTL 90d)                                |

---

## 12. Queue Abstraction Layer (RESTORED)

### 12.1 InMemoryQueueAdapter (Critical for Local)

```
Limitations:
- Single process only (no horizontal scaling)
- Jobs lost on process restart
- Max ~100 concurrent jobs

Advantages:
- ZERO external dependencies
- Works on Windows, macOS, Linux
- <1ms job dispatch latency
- Perfect for local development
```

Uses Node.js async queues internally. Implements exact same IQueue interface as BullMQ adapter.

---

## 13. API Endpoints

Same as v2.1. No changes.

---

## 14. Frontend Integration Points

Same as v2.1. Zustand store, WebSocket integration, Control Room UI. Socket.io-client MUST be added to frontend package.json.

---

## 15. Local Installation & Runtime

Same as v2.1. Zero external dependencies for local preset.

---

## 16. Observability Architecture (NEW)

### 16.1 Structured Logging

```typescript
interface StructuredLog {
  timestamp: string; // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error';
  traceId: string; // Propagated through all layers
  source: {
    module: string; // 'orchestrator', 'agent:coder', 'provider:anthropic'
    method: string;
  };
  message: string;
  data?: Record<string, unknown>;
  duration?: number; // ms
  tokens?: TokenUsage;
  cost?: number; // USD
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}
```

### 16.2 Trace Propagation

```
User Request (traceId generated)
  -> Orchestrator (traceId propagated)
    -> Planner (traceId in LLMRequest.metadata)
    -> Scheduler (traceId in AgentJobData)
      -> Agent (traceId in AgentInput)
        -> ILLMProvider.complete() (traceId in metadata)
        -> IVCSProvider.commit() (traceId logged)
      -> AgentOutput (traceId stored)
    -> Result Evaluator (traceId logged)
  -> API Response (traceId in header X-Trace-Id)
```

### 16.3 Metrics to Collect

```
- llm.request.count (by provider, model, agent)
- llm.request.duration_ms (by provider, model)
- llm.tokens.input (by provider, model)
- llm.tokens.output (by provider, model)
- llm.cost.usd (by provider, pipeline)
- agent.execution.count (by agent, status)
- agent.execution.duration_ms (by agent)
- pipeline.duration_ms (by complexity)
- queue.depth (by agent)
- queue.active_workers (by agent)
- quality_gate.pass_rate (by gate name)
- provider.health (by provider type)
```

---

## 17. Data Migration Strategy (NEW)

### 17.1 Forward Migration (MongoDB -> Any DB)

```typescript
interface IMigrationTool {
  export(source: IDatabaseProvider, format: 'json' | 'csv'): Promise<ExportResult>;
  import(target: IDatabaseProvider, data: ExportResult): Promise<ImportResult>;
  validate(source: IDatabaseProvider, target: IDatabaseProvider): Promise<ValidationResult>;
}
```

### 17.2 Schema Versioning

Every entity stored with `_schemaVersion: number`. When entity structure changes:

1. Increment version
2. Add migration function: `migrateV1toV2(entity: V1Entity): V2Entity`
3. Repository reads check version and auto-migrate on read

### 17.3 Graceful Degradation

```
If provider is unavailable at startup:
  1. healthCheck() returns { healthy: false }
  2. System starts in degraded mode
  3. Features requiring that provider show "Provider unavailable" in UI
  4. System suggests alternatives: "Configure Ollama for local LLM"
  5. healthCheck() runs on interval, auto-recovers when provider comes back
```

---

## 18. Implementation Phases

### Phase 0: Abstraction Foundation + Cross-Platform + Zero-Hardcode (Weeks 1-2)

**CRITICAL: Must complete before any other phase.**

#### 0.A — Cross-Platform Fixes

- [ ] Create `backend/src/platform/index.ts` (splitLines, getTempDir, normalizePath, etc.)
- [ ] Create `vibeia/src/lib/platform.ts` (frontend equivalent)
- [ ] Fix `.split('\n')` in 9 backend files + 4 frontend files (replace with `splitLines()`)
- [ ] Fix Dockerfile Unix commands
- [ ] Fix workspace.service.ts Linux assumption
- [ ] Create cross-platform deploy script (Node.js based)
- [ ] **SECURITY: Remove `.env` from git, rotate all exposed credentials**
- [ ] Unit tests for platform module

#### 0.B — Zero-Hardcode Extraction

- [ ] Create `backend/src/config/vibeConfig.ts` (VibeConfig interface + loader)
- [ ] Create `backend/src/config/presets.ts` (LOCAL, CLOUD_ANTHROPIC, HYBRID)
- [ ] Create `backend/src/config/defaults.ts` (all default values in one place)
- [ ] Extract 10 hardcoded model IDs to config
- [ ] Extract 8 hardcoded max_tokens to config
- [ ] Extract 12 hardcoded pricing values to config
- [ ] Extract 6 hardcoded rate limits to config
- [ ] Extract 8 hardcoded encryption params to config
- [ ] Extract 8 hardcoded provider name strings to enum
- [ ] Extract quality gate thresholds to config
- [ ] Extract JWT expiry times to config
- [ ] Extract bcrypt salt rounds to config
- [ ] Validate config with Zod schema
- [ ] Wire into NestJS ConfigModule

#### 0.C — Provider Interfaces + DI Tokens

- [ ] Create `backend/src/providers/tokens.ts` (all injection tokens)
- [ ] Define IProvider base interface
- [ ] Define ILLMProvider + ILLMFallbackChain
- [ ] Define IDatabaseProvider + IRepository<T> + all specific repositories
- [ ] Define IQueueProvider + IQueue
- [ ] Define ICacheProvider
- [ ] Define IVCSProvider
- [ ] Define IDeployProvider
- [ ] Define ISandboxProvider + ISandbox
- [ ] Define IFileSystemProvider (NEW)
- [ ] Create ProvidersModule with factory registrations

#### 0.D — Local-First Adapters

- [ ] InMemoryQueueAdapter (IQueueProvider)
- [ ] InMemoryCacheAdapter (ICacheProvider)
- [ ] LocalProcessSandboxAdapter (ISandboxProvider, cross-platform)
- [ ] LocalFileSystemAdapter (IFileSystemProvider)
- [ ] NullDeployAdapter (IDeployProvider)

#### 0.E — Testing

- [ ] Unit tests for config loader + Zod validation
- [ ] Unit tests for all local adapters
- [ ] Unit tests for platform utilities
- [ ] Conformance test templates per provider type
- [ ] Verify ZERO hardcoded values remain (automated grep check)

**Phase 0 Deliverable:** All interfaces defined. NestJS DI wired. Local adapters functional. Config loads presets. Cross-platform issues fixed. `.env` secured. Zero hardcoded values in business logic.

---

### Phase 1: Cloud Adapters + Existing Entity Migration (Weeks 3-4)

- [ ] Wrap AnthropicProvider -> AnthropicAdapter (ILLMProvider)
- [ ] Wrap OpenAIProvider -> OpenAIAdapter (ILLMProvider)
- [ ] Wrap GeminiProvider -> GeminiAdapter (ILLMProvider)
- [ ] Implement LLMFallbackChain (wraps multiple ILLMProvider instances)
- [ ] Implement OllamaAdapter (ILLMProvider)
- [ ] Wrap 11 Mongoose schemas -> MongooseAdapter (IDatabaseProvider)
  - Users, Projects, Plans, Teams, TeamMembers, TeamInvitations,
    GitConnections, Credentials, SetupStates, Workspaces, SecurityAudits
- [ ] Migrate 12 services from @InjectModel to IRepository injection
- [ ] Implement BullMQAdapter (IQueueProvider)
- [ ] Implement RedisAdapter (ICacheProvider)
- [ ] Wrap GitService -> GitHubAdapter (IVCSProvider)
- [ ] Wrap GitLabProvider -> GitLabAdapter (IVCSProvider)
- [ ] Implement LocalGitAdapter (IVCSProvider)
- [ ] Wrap setup executors -> Deploy adapters
- [ ] Implement DockerSandboxAdapter (ISandboxProvider)
- [ ] Input sanitization module for LLM context
- [ ] Conformance tests for all adapters
- [ ] Integration tests

**Deliverable:** All presets functional. Can switch any provider via config. Existing 362 tests still pass.

---

### Phase 2: Agent Protocol + Context Store (Weeks 5-6)

- [ ] Implement all types from Section 5 in `src/agents/protocol.ts`
- [ ] Create entities in `src/entities/`
- [ ] Implement Context Store CRUD via IAgentContextRepository
- [ ] Implement ContextCompiler (Section 8.2)
- [ ] Create AgentRegistry
- [ ] Implement BaseAgent abstract class
- [ ] Schema versioning on all entities
- [ ] Unit tests for Context Compiler

---

### Phase 3: Orchestrator Core (Weeks 7-8)

- [ ] Implement Planner (intent -> DAG via ILLMFallbackChain)
- [ ] Implement ModelRouter (reads all values from VibeConfig)
- [ ] Implement Scheduler (DAG -> queue dispatch)
- [ ] Implement Result Evaluator (quality gates between DAG nodes)
- [ ] Wire orchestrator.ts
- [ ] Structured logging with traceId propagation
- [ ] API endpoints for plan CRUD
- [ ] Integration tests with mock agents

---

### Phase 4: First Agents (Weeks 9-12)

- [ ] Coder Agent (deterministic tools + ILLMProvider)
- [ ] Reviewer Agent (deterministic-first pipeline)
- [ ] DevOps Agent (IVCSProvider + IDeployProvider)
- [ ] E2E test: intent -> plan -> Coder -> Reviewer -> DevOps

---

### Phase 5: Worker Pools (Weeks 13-14)

- [ ] WorkerPoolManager
- [ ] Worker configuration API
- [ ] Elastic scaling, context affinity
- [ ] Plan-based limits from config
- [ ] VCS branch isolation
- [ ] WebSocket events

---

### Phase 6: Token Optimization (Weeks 15-16)

- [ ] Prompt Compiler
- [ ] Decision Cache
- [ ] Early termination
- [ ] Provider prompt caching
- [ ] Cost tracking + cost guard enforcement

---

### Phase 7: Remaining Agents (Weeks 17-20)

- [ ] Analyst, Architect, Tester, Doc, Fixer agents

---

### Phase 8: Frontend Control Room (Weeks 21-22)

- [ ] Migrate React Context -> Zustand
- [ ] Install + integrate socket.io-client
- [ ] DAG visualization
- [ ] Worker panel, cost tracker, provider health panel

---

## 19. Error Handling & Rollback

Same as v2.1. Circuit breaker: failures threshold from config (not hardcoded).

---

## 20. Testing Strategy

### 20.1 Conformance Tests per Provider

### 20.2 Mock Providers

### 20.3 E2E with Local Preset

### 20.4 Zero-Hardcode Verification Test (NEW)

```bash
# Automated check: no hardcoded values in business logic
# Run as part of CI/CD pipeline
grep -rn "claude-\|gpt-\|gemini-\|localhost:\|8192\|4096" backend/src/modules/ \
  --include="*.ts" \
  --exclude="*.spec.ts" \
  --exclude="*.test.ts" \
  | grep -v "config\|constant\|preset" \
  && echo "FAIL: Hardcoded values found" && exit 1 \
  || echo "PASS: No hardcoded values"
```

---

## 21. Gap Analysis: Current Codebase vs Spec

### 21.1 Compliance Score

```
CURRENT COMPLIANCE: 2.5/10

| Area                     | Score | Status    |
|--------------------------|-------|-----------|
| Provider Agnosticism     | 2/10  | CRITICAL  |
| Agent Architecture       | 1/10  | CRITICAL  |
| Orchestrator/DAG         | 1/10  | CRITICAL  |
| Context Management       | 0/10  | MISSING   |
| Worker Pools             | 0/10  | MISSING   |
| Token Optimization       | 1/10  | CRITICAL  |
| Security Architecture    | 5/10  | PARTIAL   |
| Sandbox Execution        | 0/10  | MISSING   |
| Quality Gates            | 6/10  | GOOD BASE |
| API Endpoints            | 4/10  | PARTIAL   |
| Frontend Control Room    | 2/10  | MINIMAL   |
| WebSocket Integration    | 2/10  | BROKEN    |
| Testing Strategy         | 4/10  | BASIC     |
| Local-First              | 1/10  | CRITICAL  |
| Configuration System     | 1/10  | MISSING   |
| Cross-Platform           | 5/10  | PARTIAL   |
| Zero-Hardcode            | 1/10  | CRITICAL  |
| Observability            | 1/10  | MINIMAL   |
```

### 21.2 Hardcoded Values Inventory

85+ hardcoded values found in current codebase:

- 10 model IDs, 8 max_tokens, 12 pricing values, 6 rate limits
- 8 encryption params, 8 provider name strings, 5 URLs
- 4 timeouts, quality gate thresholds, JWT secrets, bcrypt rounds
- Plan pricing ($0/$29/$99/$499), infrastructure costs

ALL must be externalized in Phase 0.B.

### 21.3 Migration Strategy

**DO NOT rewrite. Inject abstraction layers below existing code.**

1. Phase 0: Config + interfaces alongside existing code
2. Phase 1: Wrap existing services as adapters. Migrate 12 services from @InjectModel.
3. Phase 2-3: New orchestrator gradually replaces ExecutionService
4. Phase 4+: Agents consume providers through NestJS DI

Production continues working throughout.

---

## Appendix A: Target File Structure

```
backend/src/
|-- platform/                      # Cross-platform utilities
|   +-- index.ts
|-- config/                        # Configuration system
|   |-- vibeConfig.ts              # Interface + loader
|   |-- presets.ts                 # LOCAL, CLOUD_ANTHROPIC, HYBRID
|   |-- defaults.ts               # All default values
|   +-- configValidation.ts       # Zod schema
|-- providers/
|   |-- tokens.ts                  # NestJS injection tokens
|   |-- providers.module.ts        # Factory registrations
|   |-- types.ts                   # Base interfaces
|   |-- llm/
|   |   |-- ILLMProvider.ts
|   |   |-- ILLMFallbackChain.ts
|   |   |-- adapters/
|   |   +-- __tests__/
|   |-- database/
|   |   |-- IRepository.ts
|   |   |-- IDatabaseProvider.ts
|   |   |-- adapters/
|   |   +-- __tests__/
|   |-- queue/
|   |-- cache/
|   |-- vcs/
|   |-- deploy/
|   |-- sandbox/
|   |-- filesystem/                # NEW
|   |   |-- IFileSystemProvider.ts
|   |   |-- adapters/
|   |   +-- __tests__/
|   +-- __mocks__/
|-- entities/
|-- agents/
|   |-- protocol.ts                # ALL types defined
|   |-- registry.ts
|   |-- base/
|   +-- [agent directories]
|-- orchestrator/
|-- optimization/
|-- observability/                 # NEW
|   |-- logger.ts
|   |-- tracer.ts
|   +-- metrics.ts
|-- modules/                       # EXISTING (preserved, gradually migrated)
+-- __tests__/
```

---

## Appendix B: Environment Variables

```bash
# Provider Selection
VIBE_LLM_PROVIDER=anthropic
VIBE_LLM_FALLBACK_PROVIDERS=openai,google
VIBE_DATABASE_PROVIDER=sqlite
VIBE_QUEUE_PROVIDER=in-memory
VIBE_CACHE_PROVIDER=in-memory
VIBE_VCS_PROVIDER=local-git
VIBE_DEPLOY_PROVIDER=none
VIBE_SANDBOX_PROVIDER=local-process
VIBE_FILESYSTEM_PROVIDER=local

# Provider Credentials
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
GOOGLE_AI_API_KEY=
MONGODB_URI=
REDIS_URL=
GITHUB_TOKEN=

# Security
VIBE_SECRET_KEY=
JWT_SECRET=
JWT_REFRESH_SECRET=

# Cost Controls
VIBE_MAX_COST_PER_PIPELINE=5.00
VIBE_MAX_COST_PER_DAY=50.00
VIBE_MAX_TOKENS_PER_TASK=50000

# Observability
VIBE_LOG_LEVEL=info
VIBE_LOG_FORMAT=json
VIBE_TRACE_ENABLED=true
VIBE_AUDIT_RETENTION_DAYS=90
```

---

## Appendix C: Provider Adapter Compliance Checklist

Every adapter MUST:

- [ ] Implement the full interface (no stubs)
- [ ] Pass conformance test suite
- [ ] Handle connection failures gracefully
- [ ] Support initialize() / shutdown() lifecycle
- [ ] Log via structured logger (never console.log)
- [ ] Never store credentials in logs
- [ ] Read ALL config values from VibeConfig (zero hardcoded)
- [ ] Support timeout configuration
- [ ] Work on Windows, macOS, Linux
- [ ] Propagate traceId in all operations

---

## Appendix D: Hardcode Elimination Manifest

**Every value below MUST be externalized to VibeConfig by end of Phase 0.**

| Category       | Count | Files Affected                                           | Config Target                      |
| -------------- | ----- | -------------------------------------------------------- | ---------------------------------- |
| Model IDs      | 10    | 3 LLM providers                                          | providers.llm.modelMapping         |
| Max Tokens     | 8     | 3 LLM providers                                          | providers.llm.defaultMaxTokens     |
| Pricing        | 12    | 3 LLM providers + billing                                | providers.llm.pricing              |
| Rate Limits    | 6     | auth.controller, app.module                              | rateLimits.\*                      |
| Encryption     | 8     | encryption.service, credential-manager, token-encryption | security.encryption.\*             |
| Provider Names | 8     | users.service, llm.service                               | enum LLMProviderName               |
| URLs           | 5     | main.ts, credential-manager                              | env vars                           |
| Timeouts       | 4     | app.module, main.ts                                      | rateLimits.global.ttlMs            |
| Quality Gates  | 4     | quality-gates.service                                    | taskDefaults.qualityGateThresholds |
| JWT Config     | 3     | auth.constants                                           | security.jwt.\*                    |
| Bcrypt         | 2     | auth.constants, users.service                            | security.bcrypt.saltRounds         |
| Plan Pricing   | 8     | billing.dto                                              | billing config (external)          |
| Infra Costs    | 12    | cost-calculator.service                                  | external pricing config            |

**Total: 85+ values to externalize.**

---

**END OF SPECIFICATION v2.2**

**Implementation order: Phase 0 is MANDATORY. Provider interfaces + zero-hardcode + cross-platform = the architecture.**
