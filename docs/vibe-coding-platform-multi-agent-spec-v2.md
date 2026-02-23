# Vibe Coding Platform — Multi-Agent Orchestrator Architecture

## Specification for Implementation — v2.0 (Technology-Agnostic)

**Version:** 2.0
**Date:** February 2026
**Runtime:** Node.js, TypeScript
**Core Principle:** ZERO hardcoded vendor dependencies. Every external service accessed through abstraction interfaces.
**Deployment:** Local-first. Must run on any developer machine. Cloud optional.
**Purpose:** This document is the implementation spec for Claude Code. Follow it sequentially by layers.

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
16. [Implementation Phases](#16-implementation-phases)
17. [Error Handling & Rollback](#17-error-handling--rollback)
18. [Testing Strategy](#18-testing-strategy)

---

## 1. Architecture Overview

### 1.1 From Monolithic Conductor to Multi-Agent Orchestrator

The platform evolves from a single AI Conductor (one LLM handling all phases) to a **Level 2 Pipeline Composer** architecture where a central Orchestrator composes, dispatches, and validates pipelines of specialized agents.

```
BEFORE (Monolithic):
User → AI Conductor (single LLM) → All 4 Phases → Output

AFTER (Multi-Agent):
User → Orchestrator
           ├── Planner (generates execution DAG)
           ├── Scheduler (dispatches to worker pools)
           ├── Context Manager (scoped context per agent)
           └── Result Evaluator (quality gates between steps)
                    │
           ┌───────┼───────┬───────┬───────┬───────┬───────┬───────┐
           ▼       ▼       ▼       ▼       ▼       ▼       ▼       ▼
        Architect Analyst Coder  Reviewer DevOps Tester   Doc   Fixer
        Agent    Agent   Agent  Agent    Agent  Agent   Agent  Agent
        (1..N workers per agent profile)
```

### 1.2 Key Architecture Decisions

- **Agents are NOT microservices** (yet). They are TypeScript modules within the same Node.js process with a standardized interface. Designed to extract to microservices when needed.
- **Agents are NOT all LLM-based**. Each agent is a pipeline of deterministic tools + optional LLM reasoning. The LLM is invoked only when deterministic tools are insufficient.
- **The Orchestrator is the ONLY component that talks to the user**. Agents never interact with the user directly.
- **Workers are elastic with user-configured caps**. The user sets max workers per agent profile. The system scales 0-to-max based on available parallelizable tasks in the DAG.
- **EVERY external dependency is behind an interface**. LLM providers, databases, queues, VCS, deployment targets — all accessed via adapters. Swap any component without touching business logic.
- **Local-first**. The system MUST run on a developer machine with zero cloud dependencies. Cloud services are optional enhancements.

---

## 2. Core Principles & Agnosticism Charter

### 2.1 Design Principles

1. **Single Responsibility**: Each agent masters ONE domain. No agent does two things.
2. **Composability**: Agents combine into pipelines via typed input/output contracts.
3. **Observability**: Every agent invocation is logged with inputs, outputs, tokens consumed, duration, model used.
4. **Fail-safe**: Failure of one agent does not collapse the pipeline. The orchestrator handles retries, fallbacks, and rollbacks.
5. **Context Scoping**: Each agent receives the MINIMUM context needed. Never the full project context.
6. **Deterministic First**: Use tools, templates, and rules before invoking LLM. LLM is the last resort, not the first.
7. **Cost Awareness**: Every LLM invocation has a cost. The system optimizes for minimum tokens with maximum quality.
8. **Vendor Agnosticism**: NO business logic may reference a specific vendor. All vendor interaction through adapters.
9. **Local-First**: The core orchestrator runs entirely on localhost. Cloud features are opt-in extensions.
10. **Security by Default**: Credentials encrypted at rest, sandboxed execution, no arbitrary code without containment.

### 2.2 Agnosticism Charter

This is the contract that EVERY module in the system must respect. Violations are architectural bugs.

```
┌────────────────────────────┬───────────────────────────────────────────────┐
│ DIMENSION                  │ WHAT IT MEANS                                 │
├────────────────────────────┼───────────────────────────────────────────────┤
│ LLM Provider               │ Anthropic, OpenAI, Google Gemini, Mistral,   │
│                            │ Ollama (local), LM Studio, Azure OpenAI,     │
│                            │ AWS Bedrock — all via ILLMProvider interface  │
├────────────────────────────┼───────────────────────────────────────────────┤
│ Database                   │ MongoDB, PostgreSQL, MySQL, SQLite (local),   │
│                            │ Supabase, PlanetScale, Turso, Neon           │
│                            │ — all via IRepository interfaces             │
├────────────────────────────┼───────────────────────────────────────────────┤
│ Queue / Job System         │ BullMQ+Redis, RabbitMQ, In-Memory (local),   │
│                            │ SQS, Inngest, Temporal                       │
│                            │ — all via IQueueProvider interface            │
├────────────────────────────┼───────────────────────────────────────────────┤
│ Version Control            │ GitHub, GitLab, Bitbucket, local Git         │
│                            │ — all via IVCSProvider interface              │
├────────────────────────────┼───────────────────────────────────────────────┤
│ Deployment                 │ Vercel, Railway, Fly.io, Render, AWS,        │
│                            │ self-hosted, Docker, none (local only)        │
│                            │ — all via IDeployProvider interface            │
├────────────────────────────┼───────────────────────────────────────────────┤
│ Cache                      │ Redis, Memcached, In-Memory (local),         │
│                            │ SQLite cache layer                            │
│                            │ — all via ICacheProvider interface             │
├────────────────────────────┼───────────────────────────────────────────────┤
│ File System / Code Storage │ Local filesystem, S3, GCS, Git repo          │
│                            │ — all via IFileSystemProvider interface        │
├────────────────────────────┼───────────────────────────────────────────────┤
│ Operating System           │ Windows, macOS, Linux                         │
│                            │ — no OS-specific paths, commands, or tools    │
├────────────────────────────┼───────────────────────────────────────────────┤
│ Code Execution Sandbox     │ Docker, Firecracker, E2B, local process,     │
│                            │ WASM sandbox                                  │
│                            │ — all via ISandboxProvider interface           │
└────────────────────────────┴───────────────────────────────────────────────┘
```

### 2.3 Constraints

- Maximum task duration: 10 minutes (inherited from existing spec)
- Quality gates between every pipeline step
- 80% test coverage minimum for generated code
- All agent outputs must be serializable JSON
- No agent can modify state outside its declared output schema
- Every LLM call must be traceable to a specific task, agent, and pipeline
- No plaintext credentials anywhere — secrets are always encrypted or in env vars
- Generated code executes ONLY inside a sandbox, never in the host process

---

## 3. Abstraction Layer Architecture

### 3.1 Provider Interface Pattern

Every external service follows the same pattern:

```typescript
// src/providers/types.ts

/**
 * Every provider interface follows this contract:
 * 1. Interface defines WHAT operations are available
 * 2. Adapters implement HOW for a specific vendor
 * 3. ProviderRegistry maps provider IDs to adapter instances
 * 4. Configuration declares WHICH provider to use (config file or env var)
 * 5. Business logic ONLY references the interface, NEVER the adapter
 */

interface IProvider {
  readonly providerId: string; // 'anthropic', 'openai', 'local-ollama', etc.
  readonly providerType: ProviderType; // 'llm', 'database', 'queue', 'vcs', etc.
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
  [key: string]: any; // Provider-specific config
}

interface HealthStatus {
  healthy: boolean;
  latencyMs: number;
  details?: string;
}
```

### 3.2 LLM Provider Interface

```typescript
// src/providers/llm/ILLMProvider.ts

/**
 * Unified interface for ALL LLM providers.
 * Abstracts away provider-specific APIs, model names, and capabilities.
 */
interface ILLMProvider extends IProvider {
  providerType: 'llm';

  /**
   * Send a completion request to the LLM.
   * This is the ONLY way any part of the system talks to an LLM.
   */
  complete(request: LLMRequest): Promise<LLMResponse>;

  /**
   * Stream a completion request. Returns an async iterable of chunks.
   */
  stream(request: LLMRequest): AsyncIterable<LLMStreamChunk>;

  /**
   * List available models from this provider.
   */
  listModels(): Promise<ModelInfo[]>;

  /**
   * Get cost per token for a specific model.
   */
  getModelPricing(modelId: string): ModelPricing;

  /**
   * Check if this provider supports a specific capability.
   */
  supportsCapability(capability: LLMCapability): boolean;
}

// ─── Request / Response Types (provider-agnostic) ───

interface LLMRequest {
  model: string; // Provider-specific model ID resolved by ModelRouter
  systemPrompt: string;
  messages: LLMMessage[];
  temperature?: number; // 0-1
  maxTokens?: number;
  responseFormat?: 'text' | 'json'; // Structured output when supported
  stopSequences?: string[];
  metadata?: {
    // For tracing, NOT sent to provider
    taskId: string;
    agentId: string;
    pipelineId: string;
  };
}

interface LLMMessage {
  role: 'user' | 'assistant';
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
  model: string; // Actual model used (may differ from requested)
  usage: TokenUsage;
  finishReason: 'stop' | 'max_tokens' | 'error';
  latencyMs: number;
  cached: boolean; // Whether prompt caching was used
  providerId: string; // Which provider handled this
}

interface LLMStreamChunk {
  content: string;
  done: boolean;
  usage?: TokenUsage; // Only on final chunk
}

interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number; // 0 if provider doesn't support caching
  totalTokens: number;
}

interface ModelInfo {
  modelId: string; // Provider-specific: 'claude-sonnet-4-20250514', 'gpt-4o', etc.
  displayName: string; // Human-readable: 'Claude Sonnet 4'
  tier: ModelTier; // Normalized tier for routing
  contextWindow: number; // Max tokens
  supportsImages: boolean;
  supportsStreaming: boolean;
  supportsCaching: boolean; // Prompt caching support
  supportsJson: boolean; // Structured output support
}

interface ModelPricing {
  inputPerMillionTokens: number; // USD
  outputPerMillionTokens: number; // USD
  cachedInputPerMillionTokens?: number; // USD, if caching supported
}

type LLMCapability =
  | 'streaming'
  | 'prompt-caching'
  | 'structured-output'
  | 'image-input'
  | 'function-calling'
  | 'long-context'; // >100K tokens

// ─── Model Tier System (Provider-Agnostic) ───

/**
 * Model tiers are ABSTRACT performance levels, NOT vendor-specific names.
 * The ModelRouter maps tiers to actual vendor model IDs.
 *
 * 'fast'    = Cheapest, fastest. For boilerplate, templates, simple tasks.
 *             Examples: Haiku, GPT-4o-mini, Gemini Flash
 *
 * 'balanced'= Good reasoning at moderate cost. For most business logic.
 *             Examples: Sonnet, GPT-4o, Gemini Pro
 *
 * 'powerful'= Maximum reasoning capability. For architecture, security, complex logic.
 *             Examples: Opus, o1/o3, Gemini Ultra
 */
type ModelTier = 'fast' | 'balanced' | 'powerful';
```

### 3.3 LLM Adapter Examples

```typescript
// src/providers/llm/adapters/AnthropicAdapter.ts
class AnthropicAdapter implements ILLMProvider {
  providerId = 'anthropic';
  providerType = 'llm' as const;

  private client: Anthropic;

  async initialize(config: ProviderConfig) {
    this.client = new Anthropic({ apiKey: config.apiKey });
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: request.model,
      system: request.systemPrompt,
      messages: this.mapMessages(request.messages),
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
    });
    return this.mapResponse(response);
  }

  // ... mapping functions to/from provider format
}

// src/providers/llm/adapters/OpenAIAdapter.ts
class OpenAIAdapter implements ILLMProvider {
  providerId = 'openai';
  // ... same interface, different implementation
}

// src/providers/llm/adapters/OllamaAdapter.ts (LOCAL — no API key needed)
class OllamaAdapter implements ILLMProvider {
  providerId = 'ollama';
  // Connects to localhost:11434 — fully local, no cloud dependency
}

// src/providers/llm/adapters/LMStudioAdapter.ts (LOCAL)
class LMStudioAdapter implements ILLMProvider {
  providerId = 'lmstudio';
  // Connects to localhost:1234 — OpenAI-compatible API, fully local
}
```

### 3.4 Database Provider Interface

```typescript
// src/providers/database/IRepository.ts

/**
 * Repository pattern. Business logic NEVER writes raw queries.
 * Each entity has a repository. Each repository has a consistent interface.
 * The adapter translates to the specific database dialect.
 */

// ─── Generic Repository Interface ───

interface IRepository<T, CreateDTO, UpdateDTO> {
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
  where: Partial<Record<keyof T, any>>; // Field-level filters
  tags?: string[]; // For tag-based filtering (Context Store)
  dateRange?: {
    field: keyof T;
    from?: Date;
    to?: Date;
  };
}

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
  select?: string[]; // Field projection
}

// ─── Specific Repositories (business logic uses THESE, not raw DB) ───

interface IExecutionPlanRepository extends IRepository<
  ExecutionPlan,
  CreatePlanDTO,
  UpdatePlanDTO
> {
  findByProjectAndStatus(projectId: string, status: PlanStatus): Promise<ExecutionPlan[]>;
  updateNodeStatus(
    planId: string,
    nodeId: string,
    status: NodeStatus,
    output?: AgentOutput,
  ): Promise<void>;
  getReadyNodes(planId: string): Promise<DAGNode[]>;
}

interface IAgentContextRepository extends IRepository<
  ContextEntry,
  CreateContextDTO,
  UpdateContextDTO
> {
  findByProjectAndTags(
    projectId: string,
    tags: string[],
    scope?: ContextScope,
  ): Promise<ContextEntry[]>;
  findByProjectAndType(projectId: string, type: ContextType): Promise<ContextEntry[]>;
  invalidateByPipeline(pipelineId: string): Promise<number>;
  compileForAgent(projectId: string, agentId: string, taskTags: string[]): Promise<ContextEntry[]>;
}

interface IAgentExecutionRepository extends IRepository<
  AgentExecution,
  CreateExecutionDTO,
  UpdateExecutionDTO
> {
  getMetricsForPipeline(pipelineId: string): Promise<AggregatedMetrics>;
  getCostForProject(projectId: string, dateRange?: DateRange): Promise<CostSummary>;
}

interface IWorkerPoolConfigRepository extends IRepository<
  WorkerPoolConfig,
  CreatePoolConfigDTO,
  UpdatePoolConfigDTO
> {
  getForProject(projectId: string): Promise<WorkerPoolConfig[]>;
  getForProjectAndAgent(projectId: string, agentId: string): Promise<WorkerPoolConfig | null>;
}

// ─── Database Provider (manages connection + exposes repositories) ───

interface IDatabaseProvider extends IProvider {
  providerType: 'database';

  // Transaction support (critical for scheduler atomicity)
  withTransaction<T>(fn: (session: TransactionSession) => Promise<T>): Promise<T>;

  // Repository access
  executionPlans: IExecutionPlanRepository;
  agentContext: IAgentContextRepository;
  agentExecutions: IAgentExecutionRepository;
  workerPoolConfigs: IWorkerPoolConfigRepository;
  agentProfiles: IRepository<AgentProfile, CreateAgentProfileDTO, UpdateAgentProfileDTO>;
}

// Adapter examples:
// - MongooseAdapter: implements with Mongoose schemas
// - PrismaAdapter: implements with Prisma client (supports Postgres, MySQL, SQLite)
// - DrizzleAdapter: implements with Drizzle ORM
// - SQLiteAdapter: implements with better-sqlite3 (LOCAL, zero-config)
// - KnexAdapter: implements with Knex query builder (supports any SQL db)
```

### 3.5 Queue Provider Interface

```typescript
// src/providers/queue/IQueueProvider.ts

interface IQueueProvider extends IProvider {
  providerType: 'queue';

  /**
   * Create a named queue for an agent profile.
   */
  createQueue(queueName: string, options?: QueueOptions): Promise<IQueue>;

  /**
   * Get an existing queue by name.
   */
  getQueue(queueName: string): Promise<IQueue | null>;

  /**
   * Subscribe to queue events globally.
   */
  onEvent(event: QueueEvent, handler: QueueEventHandler): void;
}

interface IQueue {
  name: string;

  /**
   * Add a job to the queue.
   */
  enqueue(jobData: AgentJobData, options?: JobOptions): Promise<string>; // Returns job ID

  /**
   * Process jobs from the queue with configurable concurrency.
   * This is the worker registration.
   */
  process(handler: JobHandler, concurrency: number): void;

  /**
   * Update the concurrency (number of workers) dynamically.
   * Called when user changes worker count in UI.
   */
  setConcurrency(concurrency: number): Promise<void>;

  /**
   * Get current queue depth (pending jobs).
   */
  getDepth(): Promise<number>;

  /**
   * Get active job count.
   */
  getActiveCount(): Promise<number>;

  /**
   * Pause processing.
   */
  pause(): Promise<void>;

  /**
   * Resume processing.
   */
  resume(): Promise<void>;

  /**
   * Remove all pending jobs.
   */
  drain(): Promise<void>;
}

interface QueueOptions {
  maxRetries?: number;
  retryBackoff?: 'fixed' | 'exponential';
  retryDelayMs?: number;
  jobTimeoutMs?: number; // Max time per job
  removeCompletedAfterMs?: number;
  removeFailedAfterMs?: number;
}

interface JobOptions {
  priority?: number; // Lower = higher priority
  delay?: number; // Delay before processing (ms)
  attempts?: number; // Override queue default
}

type JobHandler = (job: QueueJob) => Promise<AgentOutput>;

interface QueueJob {
  id: string;
  data: AgentJobData;
  attemptsMade: number;
  updateProgress(percent: number): Promise<void>;
}

type QueueEvent = 'completed' | 'failed' | 'stalled' | 'progress';
type QueueEventHandler = (jobId: string, data: any) => void;

// Adapter implementations:
// - BullMQAdapter: Redis-backed, production-grade (requires Redis)
// - InMemoryQueueAdapter: LOCAL, zero-dependency, single-process. Uses async queues.
//   Perfect for local dev and single-machine installation.
// - RabbitMQAdapter: For enterprise deployments
// - TemporalAdapter: For complex workflow orchestration
// - InngestAdapter: Managed, serverless-friendly
```

### 3.6 VCS Provider Interface

```typescript
// src/providers/vcs/IVCSProvider.ts

interface IVCSProvider extends IProvider {
  providerType: 'vcs';

  createBranch(repo: string, branchName: string, fromRef?: string): Promise<BranchInfo>;
  deleteBranch(repo: string, branchName: string): Promise<void>;
  listBranches(repo: string): Promise<BranchInfo[]>;
  getBranch(repo: string, branchName: string): Promise<BranchInfo | null>;

  commit(repo: string, branch: string, files: FileChange[], message: string): Promise<CommitInfo>;
  getCommit(repo: string, commitSha: string): Promise<CommitInfo>;

  createPullRequest(repo: string, pr: CreatePRInput): Promise<PullRequestInfo>;
  mergePullRequest(repo: string, prId: string, strategy?: MergeStrategy): Promise<MergeResult>;

  getFile(repo: string, path: string, ref?: string): Promise<FileContent>;
  getTree(repo: string, path: string, ref?: string): Promise<TreeEntry[]>;

  getDiff(repo: string, base: string, head: string): Promise<DiffResult>;
}

type MergeStrategy = 'merge' | 'squash' | 'rebase';

interface FileChange {
  path: string;
  content: string;
  operation: 'create' | 'update' | 'delete';
}

// Adapters:
// - GitHubAdapter: Uses GitHub REST/GraphQL API
// - GitLabAdapter: Uses GitLab API
// - BitbucketAdapter: Uses Bitbucket API
// - LocalGitAdapter: Uses `simple-git` library on local filesystem. ZERO cloud dependency.
//   Perfect for local installation.
```

### 3.7 Deploy Provider Interface

```typescript
// src/providers/deploy/IDeployProvider.ts

interface IDeployProvider extends IProvider {
  providerType: 'deploy';

  deploy(config: DeployConfig): Promise<DeployResult>;
  getDeploymentStatus(deployId: string): Promise<DeployStatus>;
  rollback(deployId: string): Promise<DeployResult>;
  getDeploymentLogs(deployId: string): Promise<string[]>;
  getDeploymentUrl(deployId: string): Promise<string>;
}

interface DeployConfig {
  projectPath: string;
  environment: 'preview' | 'staging' | 'production';
  branch?: string;
  envVars?: Record<string, string>;
}

// Adapters:
// - VercelAdapter
// - RailwayAdapter
// - FlyIOAdapter
// - DockerComposeAdapter: LOCAL deployment using Docker Compose
// - NullDeployAdapter: No-op adapter for local-only mode. Returns localhost URLs.
```

### 3.8 Cache Provider Interface

```typescript
// src/providers/cache/ICacheProvider.ts

interface ICacheProvider extends IProvider {
  providerType: 'cache';

  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  deletePattern(pattern: string): Promise<number>; // Delete by prefix/glob
  has(key: string): Promise<boolean>;
  flush(): Promise<void>;
}

// Adapters:
// - RedisAdapter: Production-grade, shared across processes
// - InMemoryAdapter: LOCAL, uses Map<string, {value, expiry}>. Single process.
// - SQLiteCacheAdapter: LOCAL, persistent cache in SQLite file
```

### 3.9 Sandbox Provider Interface

```typescript
// src/providers/sandbox/ISandboxProvider.ts

/**
 * Code generated by agents MUST execute inside a sandbox.
 * The sandbox prevents:
 * - File system access outside project directory
 * - Network access to unauthorized endpoints
 * - Process spawning beyond defined limits
 * - Memory/CPU consumption beyond limits
 */
interface ISandboxProvider extends IProvider {
  providerType: 'sandbox';

  /**
   * Create an isolated execution environment.
   */
  createSandbox(config: SandboxConfig): Promise<ISandbox>;
}

interface ISandbox {
  id: string;

  /**
   * Execute a command inside the sandbox.
   */
  exec(command: string, args?: string[], options?: ExecOptions): Promise<ExecResult>;

  /**
   * Write a file inside the sandbox.
   */
  writeFile(path: string, content: string): Promise<void>;

  /**
   * Read a file from the sandbox.
   */
  readFile(path: string): Promise<string>;

  /**
   * List files in the sandbox.
   */
  listFiles(path: string): Promise<string[]>;

  /**
   * Destroy the sandbox and all its resources.
   */
  destroy(): Promise<void>;
}

interface SandboxConfig {
  workingDirectory: string;
  memoryLimitMB: number; // Default: 512
  cpuLimit: number; // Default: 1 core
  timeoutMs: number; // Default: 600000 (10 min)
  networkAccess: 'none' | 'restricted' | 'full';
  allowedHosts?: string[]; // Only if networkAccess = 'restricted'
  env?: Record<string, string>;
}

interface ExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

// Adapters:
// - DockerSandboxAdapter: Creates Docker containers per sandbox
// - LocalProcessAdapter: Uses child_process with resource limits (simpler, less isolated)
// - E2BSandboxAdapter: Uses E2B cloud sandboxes
// - WASMSandboxAdapter: Uses WASM for lightweight isolation
```

### 3.10 Provider Registry & Configuration

```typescript
// src/providers/registry.ts

/**
 * Central registry where all provider adapters are registered.
 * Configured via a single config file or environment variables.
 */
class ProviderRegistry {
  private providers: Map<ProviderType, IProvider> = new Map();

  register(provider: IProvider): void {
    this.providers.set(provider.providerType, provider);
  }

  get<T extends IProvider>(type: ProviderType): T {
    const provider = this.providers.get(type);
    if (!provider) throw new Error(`No provider registered for type: ${type}`);
    return provider as T;
  }

  get llm(): ILLMProvider {
    return this.get('llm');
  }
  get database(): IDatabaseProvider {
    return this.get('database');
  }
  get queue(): IQueueProvider {
    return this.get('queue');
  }
  get cache(): ICacheProvider {
    return this.get('cache');
  }
  get vcs(): IVCSProvider {
    return this.get('vcs');
  }
  get deploy(): IDeployProvider {
    return this.get('deploy');
  }
  get sandbox(): ISandboxProvider {
    return this.get('sandbox');
  }

  async healthCheckAll(): Promise<Record<ProviderType, HealthStatus>> {
    /* ... */
  }
  async shutdownAll(): Promise<void> {
    /* ... */
  }
}

// ─── Configuration File ───

// vibe.config.ts (project root) — user configures their providers here
interface VibeConfig {
  providers: {
    llm: {
      provider:
        | 'anthropic'
        | 'openai'
        | 'google'
        | 'ollama'
        | 'lmstudio'
        | 'azure-openai'
        | 'bedrock';
      config: Record<string, any>; // Provider-specific: apiKey, baseUrl, etc.
      modelMapping: {
        // Map abstract tiers to specific models
        fast: string; // e.g., 'claude-haiku-4-5-20251001' or 'gpt-4o-mini'
        balanced: string; // e.g., 'claude-sonnet-4-5-20250929' or 'gpt-4o'
        powerful: string; // e.g., 'claude-opus-4-6' or 'o3'
      };
    };
    database: {
      provider: 'mongodb' | 'postgresql' | 'mysql' | 'sqlite';
      config: Record<string, any>; // connectionString, filePath for SQLite, etc.
    };
    queue: {
      provider: 'bullmq' | 'in-memory' | 'rabbitmq' | 'temporal' | 'inngest';
      config: Record<string, any>;
    };
    cache: {
      provider: 'redis' | 'in-memory' | 'sqlite';
      config: Record<string, any>;
    };
    vcs: {
      provider: 'github' | 'gitlab' | 'bitbucket' | 'local-git';
      config: Record<string, any>;
    };
    deploy: {
      provider: 'vercel' | 'railway' | 'flyio' | 'docker' | 'none';
      config: Record<string, any>;
    };
    sandbox: {
      provider: 'docker' | 'local-process' | 'e2b' | 'wasm';
      config: Record<string, any>;
    };
  };
  security: SecurityConfig;
  workerDefaults: WorkerDefaultsConfig;
}
```

### 3.11 Preset Configurations

```typescript
// Presets for common setups — user selects one and optionally overrides

const PRESET_LOCAL: Partial<VibeConfig> = {
  // Everything runs locally, zero cloud dependencies
  providers: {
    llm: {
      provider: 'ollama',
      config: { baseUrl: 'http://localhost:11434' },
      modelMapping: { fast: 'llama3.2:3b', balanced: 'llama3.1:8b', powerful: 'deepseek-r1:32b' },
    },
    database: { provider: 'sqlite', config: { filePath: './data/vibe.db' } },
    queue: { provider: 'in-memory', config: {} },
    cache: { provider: 'in-memory', config: {} },
    vcs: { provider: 'local-git', config: {} },
    deploy: { provider: 'none', config: {} },
    sandbox: { provider: 'local-process', config: {} },
  },
};

const PRESET_CLOUD_ANTHROPIC: Partial<VibeConfig> = {
  providers: {
    llm: {
      provider: 'anthropic',
      config: { apiKey: '${ANTHROPIC_API_KEY}' },
      modelMapping: {
        fast: 'claude-haiku-4-5-20251001',
        balanced: 'claude-sonnet-4-5-20250929',
        powerful: 'claude-opus-4-6',
      },
    },
    database: { provider: 'mongodb', config: { connectionString: '${MONGODB_URI}' } },
    queue: { provider: 'bullmq', config: { redisUrl: '${REDIS_URL}' } },
    cache: { provider: 'redis', config: { redisUrl: '${REDIS_URL}' } },
    vcs: { provider: 'github', config: { token: '${GITHUB_TOKEN}' } },
    deploy: { provider: 'vercel', config: { token: '${VERCEL_TOKEN}' } },
    sandbox: { provider: 'docker', config: {} },
  },
};

const PRESET_CLOUD_OPENAI: Partial<VibeConfig> = {
  providers: {
    llm: {
      provider: 'openai',
      config: { apiKey: '${OPENAI_API_KEY}' },
      modelMapping: { fast: 'gpt-4o-mini', balanced: 'gpt-4o', powerful: 'o3' },
    },
    // ... rest same as cloud preset
  },
};

const PRESET_HYBRID: Partial<VibeConfig> = {
  // Local DB + queue, cloud LLM + VCS
  providers: {
    llm: {
      provider: 'anthropic',
      config: { apiKey: '${ANTHROPIC_API_KEY}' },
      modelMapping: {
        fast: 'claude-haiku-4-5-20251001',
        balanced: 'claude-sonnet-4-5-20250929',
        powerful: 'claude-opus-4-6',
      },
    },
    database: { provider: 'sqlite', config: { filePath: './data/vibe.db' } },
    queue: { provider: 'in-memory', config: {} },
    cache: { provider: 'in-memory', config: {} },
    vcs: { provider: 'github', config: { token: '${GITHUB_TOKEN}' } },
    deploy: { provider: 'none', config: {} },
    sandbox: { provider: 'local-process', config: {} },
  },
};
```

---

## 4. Security Architecture

### 4.1 Threat Model

```
┌──────────────────────────┬────────────────────────────────────────────────┐
│ THREAT                   │ MITIGATION                                     │
├──────────────────────────┼────────────────────────────────────────────────┤
│ LLM prompt injection     │ Agent outputs are NEVER executed as code       │
│ via malicious context     │ without going through the Reviewer Agent       │
│                          │ AND the sandbox. Input sanitization on all      │
│                          │ context entries.                                │
├──────────────────────────┼────────────────────────────────────────────────┤
│ Generated code with      │ ALL generated code runs in sandbox first.      │
│ malicious payloads       │ Reviewer Agent runs security scanner.           │
│                          │ No code reaches production without passing      │
│                          │ security quality gate.                          │
├──────────────────────────┼────────────────────────────────────────────────┤
│ Credential leakage       │ Credentials NEVER stored in plaintext.          │
│                          │ Provider configs use env var references.         │
│                          │ No credential is ever passed as LLM context.    │
│                          │ Secrets encrypted at rest with AES-256-GCM.     │
├──────────────────────────┼────────────────────────────────────────────────┤
│ Supply chain attacks     │ Dependency scanning via npm audit / Snyk.       │
│ in generated dependencies│ Reviewer Agent checks new dependencies against │
│                          │ known vulnerability databases.                  │
├──────────────────────────┼────────────────────────────────────────────────┤
│ Runaway LLM costs        │ Per-pipeline cost cap (configurable).           │
│                          │ Per-task token limit. Per-project daily cap.    │
│                          │ Circuit breaker on repeated failures.           │
├──────────────────────────┼────────────────────────────────────────────────┤
│ Unauthorized agent       │ Every agent invocation requires valid           │
│ execution                │ pipeline + task reference. No ad-hoc calls.     │
│                          │ Audit log for every execution.                  │
├──────────────────────────┼────────────────────────────────────────────────┤
│ Data exfiltration via    │ Sandbox has no network access by default.       │
│ generated code           │ Restricted mode allows only whitelisted hosts.  │
│                          │ All outbound traffic logged.                    │
├──────────────────────────┼────────────────────────────────────────────────┤
│ Local installation       │ Config file has file permissions 600.           │
│ credential theft         │ Encryption key derived from machine-specific    │
│                          │ identifier + user passphrase.                   │
│                          │ Optional: OS keychain integration.              │
└──────────────────────────┴────────────────────────────────────────────────┘
```

### 4.2 Security Configuration

```typescript
// Part of vibe.config.ts

interface SecurityConfig {
  // ─── Credential Management ───
  secrets: {
    encryptionMethod: 'aes-256-gcm' | 'os-keychain';
    /**
     * If 'aes-256-gcm': encryption key derived from VIBE_SECRET_KEY env var
     * If 'os-keychain': uses OS credential manager (macOS Keychain, Windows Credential Manager, Linux Secret Service)
     */
  };

  // ─── Execution Sandboxing ───
  sandbox: {
    enabled: boolean; // MUST be true in production. Can be false for local dev.
    networkPolicy: 'none' | 'restricted' | 'full';
    allowedOutboundHosts: string[]; // Only if networkPolicy = 'restricted'
    maxMemoryMB: number;
    maxCPUCores: number;
    maxExecutionTimeMs: number;
  };

  // ─── Cost Controls ───
  costLimits: {
    maxTokensPerTask: number; // Default: 50000
    maxCostPerPipeline: number; // USD. Default: 5.00
    maxCostPerDay: number; // USD per project. Default: 50.00
    alertThresholdPercent: number; // Alert user at this % of limit. Default: 80
  };

  // ─── Audit & Compliance ───
  audit: {
    logAllLLMCalls: boolean; // Log full request/response (careful: may contain sensitive data)
    logLevel: 'minimal' | 'standard' | 'verbose';
    retentionDays: number; // How long to keep execution logs
  };

  // ─── Input Sanitization ───
  sanitization: {
    maxContextEntrySize: number; // Max bytes per context entry. Default: 100KB
    stripHTMLFromContext: boolean; // Remove HTML tags from user-provided context
    blockPromptInjectionPatterns: boolean; // Check for known injection patterns
  };
}
```

### 4.3 Credential Flow

```
User provides API key → Encrypted with AES-256-GCM → Stored in local config file (600 permissions)
                                                       OR stored in OS Keychain
                                    │
                                    ▼
         At runtime: decrypted → injected into provider adapter → NEVER logged
                                    │
                                    ▼
         Provider adapter sends to API → response received → credential NOT in response logs
                                    │
                                    ▼
         Context Store: NEVER contains credentials. Sanitization strips API keys, tokens, passwords.
```

### 4.4 Agent Execution Security Chain

```
1. Orchestrator receives task
2. Context Compiler builds scoped context
   → Sanitization: strip any credential-like patterns (regex for API keys, tokens, passwords)
   → Size limit: cap context to configured max
3. Agent receives sanitized context + task
4. If agent generates code:
   a. Code goes to Reviewer Agent FIRST
   b. Reviewer runs deterministic security scanner
   c. If scanner finds critical issues → REJECT, never reaches sandbox
   d. If scanner passes → code goes to Sandbox
5. Sandbox executes code:
   a. Network disabled by default
   b. Filesystem access limited to project directory
   c. Process spawning limited
   d. Timeout enforced
   e. Resource limits enforced
6. Results come back through the same sandbox boundary
7. Audit log records: who, what, when, result, resources consumed
```

---

## 5. Agent Protocol

### 5.1 Base Agent Interface

This is the contract ALL agents must implement. Define in `src/agents/protocol.ts`:

```typescript
// ─── Core Types ───

interface AgentProfile {
  id: string; // Unique identifier: 'coder', 'reviewer', etc.
  name: string; // Display name: 'Coder Agent'
  version: string; // Semver: '1.0.0'
  description: string; // What this agent does
  skills: string[]; // Capability tags: ['code-generation', 'refactoring']
  defaultModelTier: ModelTier; // Abstract tier, NOT vendor model name
  maxConcurrentWorkers: number; // Default max workers (user can override up to plan limit)
  estimatedTokensPerTask: number; // Average tokens per invocation (for cost estimation)
  tools: AgentTool[]; // Deterministic tools available to this agent
  systemPromptModules: string[]; // Which prompt modules this agent needs
  requiredProviders: ProviderType[]; // Which provider types this agent needs access to
}

interface AgentTool {
  id: string; // 'eslint', 'typescript-compiler', 'vcs-api', etc.
  type: 'deterministic' | 'llm-assisted';
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
}

// ─── Execution Types ───

interface AgentInput {
  taskId: string;
  pipelineId: string;
  projectId: string;
  context: CompiledContext; // Scoped context from Context Compiler
  taskDefinition: TaskDefinition;
  previousOutputs: AgentOutput[];
  configuration: AgentConfiguration;
  providers: ProviderRegistry; // Agent accesses providers through this, NEVER directly
}

interface AgentOutput {
  agentId: string;
  taskId: string;
  pipelineId: string;
  status: 'success' | 'failure' | 'partial' | 'needs-review';
  artifacts: Artifact[];
  metrics: ExecutionMetrics;
  qualityReport: QualityReport;
  contextUpdates: ContextUpdate[];
  nextStepRecommendation?: string;
}

interface Artifact {
  type:
    | 'code-file'
    | 'test-file'
    | 'config-file'
    | 'document'
    | 'review-comment'
    | 'architecture-decision'
    | 'deployment-result'
    | 'error-report';
  path?: string;
  content: string;
  metadata: Record<string, any>;
}

interface ExecutionMetrics {
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  tokensInput: number;
  tokensOutput: number;
  tokensCached: number;
  modelUsed: string; // Actual model string (provider-specific)
  modelTier: ModelTier; // Abstract tier used
  providerId: string; // Which LLM provider was used
  llmCallCount: number;
  toolCallCount: number;
  costEstimateUSD: number;
}

interface QualityReport {
  passed: boolean;
  checks: QualityCheck[];
}

interface QualityCheck {
  name: string;
  passed: boolean;
  details?: string;
  severity: 'critical' | 'warning' | 'info';
}

// ─── Agent Execution Interface ───

interface IAgent {
  profile: AgentProfile;

  /**
   * Execute the agent's task. This is the main entry point.
   * The agent MUST:
   * 1. Run deterministic tools first
   * 2. Only invoke LLM (via providers.llm) if deterministic tools are insufficient
   * 3. Return a typed AgentOutput
   * 4. Never exceed the task timeout
   * 5. Never access state outside its declared inputs
   * 6. NEVER reference a specific LLM provider — use providers.llm interface
   * 7. NEVER reference a specific database — use providers.database interface
   * 8. NEVER reference a specific VCS — use providers.vcs interface
   */
  execute(input: AgentInput): Promise<AgentOutput>;

  validateInput(input: AgentInput): ValidationError[] | null;

  estimateCost(input: AgentInput): CostEstimate;

  canHandle(task: TaskDefinition): boolean;
}
```

### 5.2 Task Definition

```typescript
interface TaskDefinition {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  complexity: 'low' | 'medium' | 'high';
  tags: string[];
  acceptanceCriteria: string[];
  estimatedMinutes: number; // Max 10
  dependencies: string[];
  requiredAgents: string[];
  optionalAgents?: string[];
}

type TaskType =
  | 'code-generation'
  | 'code-modification'
  | 'bug-fix'
  | 'test-generation'
  | 'code-review'
  | 'architecture-decision'
  | 'deployment'
  | 'documentation'
  | 'analysis'
  | 'refactoring'
  | 'security-fix'
  | 'configuration';
```

---

## 6. Agent Catalog

### 6.1 Architect Agent

```yaml
id: architect
name: Architect Agent
defaultModelTier: powerful
skills:
  [system-design, stack-selection, scalability-analysis, architecture-patterns, database-design]
requiredProviders: [llm, database]
tools:
  - id: dependency-analyzer       (deterministic)
  - id: architecture-validator    (deterministic)
triggers: [new project, tech requirements change, scalability requirement, tech selection needed]
inputs: Intention Document, Business Requirements, Current Architecture
outputs: Architecture Decision Records, System Diagrams config, Tech Stack Config
```

### 6.2 Analyst Agent

```yaml
id: analyst
name: Analyst Agent
defaultModelTier: balanced
skills: [user-story-writing, requirements-extraction, feature-prioritization, acceptance-criteria]
requiredProviders: [llm, database]
tools:
  - id: story-template-engine     (deterministic)
triggers: [Phase 2 Business Analysis, new feature request, requirement refinement]
inputs: Intention Document, User conversations, Existing features
outputs: User Stories, Acceptance Criteria, Feature Map, PRD sections
```

### 6.3 Coder Agent

```yaml
id: coder
name: Coder Agent
defaultModelTier: balanced
skills: [code-generation, refactoring, api-design, database-schemas, migration-writing]
requiredProviders: [llm, database, vcs, sandbox]
tools:
  - id: code-template-engine      (deterministic)
  - id: prettier-formatter        (deterministic)
  - id: import-resolver           (deterministic)
triggers: [task type code-generation or code-modification]
inputs: Task Definition, Architecture Context, Source files, Code conventions
outputs: Source code files, Migration files, Type definitions
```

**Complexity-based model routing:**

- `low` complexity (boilerplate, config, CRUD): tier `fast`
- `medium` complexity (business logic, API design): tier `balanced`
- `high` complexity (complex algorithms, architectural patterns): tier `powerful`

### 6.4 Reviewer Agent

```yaml
id: reviewer
name: Reviewer Agent
defaultModelTier: balanced
skills: [code-review, security-scanning, performance-audit, best-practices-validation]
requiredProviders: [llm, sandbox]
tools:
  - id: linter-runner             (deterministic) — runs project linter (ESLint, Biome, etc.)
  - id: type-checker              (deterministic) — runs project type checker (tsc, etc.)
  - id: security-scanner          (deterministic) — runs security scan (npm audit, semgrep, etc.)
  - id: complexity-analyzer       (deterministic)
  - id: duplication-detector      (deterministic)
triggers: [task completed by Coder, PR created, quality gate check]
inputs: Source code, PR diff, Security rules, Project conventions
outputs: Review comments, Approval/Rejection, Security report, Quality metrics
```

**CRITICAL: Deterministic tools run FIRST. LLM only if ALL deterministic checks pass.**

1. Run linter (deterministic) → if fails, REJECT. Zero tokens spent.
2. Run type checker (deterministic) → if fails, REJECT. Zero tokens.
3. Run security scanner (deterministic) → if critical, REJECT. Zero tokens.
4. Run complexity analyzer (deterministic) → flag if above threshold.
5. Run duplication detector (deterministic) → flag if above threshold.
6. ONLY IF all deterministic checks pass → LLM semantic review.

### 6.5 DevOps Agent

```yaml
id: devops
name: DevOps Agent
defaultModelTier: fast
skills: [vcs-operations, database-branching, deployment, environment-config, ci-cd]
requiredProviders: [llm, vcs, deploy, database]
tools:
  - id: vcs-api                   (deterministic) — uses IVCSProvider
  - id: db-branch-manager         (deterministic) — uses IDatabaseProvider branching if supported
  - id: deployer                  (deterministic) — uses IDeployProvider
  - id: env-manager               (deterministic)
triggers: [deploy requested, branch merge, infrastructure change, env config]
inputs: Deployment config, Environment state, VCS state
outputs: Deploy status, Branch URLs, Infrastructure changes
```

**~90% deterministic.** LLM only for diagnosing unexpected errors.

### 6.6 Tester Agent

```yaml
id: tester
name: Tester Agent
defaultModelTier: balanced
skills: [unit-test-generation, integration-test-generation, e2e-test-generation, coverage-analysis]
requiredProviders: [llm, sandbox]
tools:
  - id: test-template-engine      (deterministic)
  - id: test-runner               (deterministic) — runs project test framework (vitest, jest, etc.)
  - id: coverage-reporter         (deterministic)
triggers: [feature completed by Coder, pre-deployment, regression check]
inputs: Source code, Acceptance Criteria, Function signatures
outputs: Test files, Coverage report, Test results, Bug reports
```

### 6.7 Doc Agent

```yaml
id: doc
name: Doc Agent
defaultModelTier: fast
skills: [api-documentation, readme-generation, changelog, user-guides, jsdoc]
requiredProviders: [llm, vcs]
tools:
  - id: jsdoc-extractor           (deterministic)
  - id: openapi-generator         (deterministic)
  - id: changelog-parser          (deterministic)
triggers: [feature shipped, API changed, release created]
inputs: Source code, VCS history, PR descriptions, Architecture decisions
outputs: API docs, README sections, Changelogs, User guides
```

### 6.8 Fixer Agent

```yaml
id: fixer
name: Fixer Agent
defaultModelTier: balanced
skills: [error-analysis, debugging, hotfix-generation, root-cause-analysis]
requiredProviders: [llm, vcs, sandbox]
tools:
  - id: stack-trace-parser        (deterministic)
  - id: error-pattern-matcher     (deterministic)
  - id: vcs-bisect-runner         (deterministic) — uses IVCSProvider
triggers: [production error, test failure, user bug report]
inputs: Error logs, Stack traces, Reproduction steps, Recent changes
outputs: Fix PR, Root cause analysis, Prevention recommendations
```

---

## 7. Orchestrator Engine

### 7.1 Architecture

```
src/orchestrator/
├── orchestrator.ts          # Main coordinator
├── planner.ts               # Intent → Execution DAG
├── scheduler.ts             # DAG → Queue dispatch
├── contextManager.ts        # Context Store read/write + Context Compiler
├── resultEvaluator.ts       # Quality gates + pipeline flow control
├── modelRouter.ts           # Task → model tier → actual model resolution
└── types.ts                 # Shared types
```

**CRITICAL: The Orchestrator accesses ALL external services through ProviderRegistry. No direct imports of Anthropic SDK, Mongoose, BullMQ, etc.**

### 7.2 Planner

```typescript
interface ExecutionPlan {
  id: string;
  projectId: string;
  intent: string;
  parsedIntent: ParsedIntent;
  dag: DAGNode[];
  estimatedCost: CostEstimate;
  estimatedDuration: number;
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'failed' | 'rolled-back' | 'paused';
  createdAt: Date;
  approvedAt?: Date;
  completedAt?: Date;
}

interface ParsedIntent {
  category: 'feature' | 'bugfix' | 'refactor' | 'infrastructure' | 'documentation';
  domain: string[];
  complexity: 'low' | 'medium' | 'high';
  affectedModules: string[];
  requiresArchitectureDecision: boolean;
  requiresDataMigration: boolean;
}

interface DAGNode {
  id: string;
  taskDefinition: TaskDefinition;
  agentId: string;
  dependencies: string[];
  status: 'pending' | 'ready' | 'queued' | 'running' | 'completed' | 'failed' | 'skipped';
  workerId?: string;
  output?: AgentOutput;
  retryCount: number;
  maxRetries: number;
}
```

**Planner pipeline:**

1. Receive raw intent from user
2. Call LLM via `providers.llm.complete()` (NOT via Anthropic SDK directly)
3. Generate DAG from parsed intent using rule-based templates
4. Calculate cost estimate using `providers.llm.getModelPricing()`
5. Return ExecutionPlan for user approval

**Auto-approve rules:**

- `low` complexity: auto-approve
- `medium` complexity: show plan, auto-approve after 30s
- `high` complexity: require explicit approval

### 7.3 Scheduler

Fully deterministic. No LLM. Dispatches through `providers.queue`.

```typescript
interface IScheduler {
  start(plan: ExecutionPlan): Promise<void>;
  pause(planId: string): Promise<void>;
  resume(planId: string): Promise<void>;
  cancel(planId: string): Promise<void>;
  getStatus(planId: string): Promise<PlanExecutionStatus>;
  updateWorkerPool(agentId: string, maxWorkers: number): Promise<void>;
}
```

**Context Affinity:** When dispatching to a worker pool with multiple workers, prefer the worker that most recently handled a task in the same module. Reduces context loading overhead.

### 7.4 Model Router (Provider-Agnostic)

```typescript
/**
 * The Model Router resolves abstract ModelTier to actual model IDs
 * using the configuration in vibe.config.ts.
 *
 * Business logic says: "use tier 'fast' for this task"
 * Model Router says: "tier 'fast' maps to 'claude-haiku-4-5-20251001'" (or 'gpt-4o-mini', etc.)
 */
class ModelRouter {
  constructor(private config: VibeConfig) {}

  resolve(tier: ModelTier): string {
    return this.config.providers.llm.modelMapping[tier];
  }

  /**
   * Select the appropriate tier for a task + agent combination.
   * Returns the ABSTRACT tier, not the model ID.
   */
  selectTier(task: TaskDefinition, agent: AgentProfile): ModelTier {
    // Agent-level overrides
    if (agent.id === 'architect') return 'powerful';
    if (agent.id === 'devops' || agent.id === 'doc') return 'fast';

    // Task complexity overrides
    if (task.complexity === 'low') return 'fast';
    if (task.complexity === 'high') return 'powerful';

    // Task type overrides
    if (task.type === 'security-fix') return 'powerful';
    if (task.tags.includes('boilerplate')) return 'fast';

    // Fallback to agent default
    return agent.defaultModelTier;
  }

  /**
   * Estimate cost for a model tier using the configured provider's pricing.
   */
  estimateCost(tier: ModelTier, estimatedTokens: number): number {
    const modelId = this.resolve(tier);
    const pricing = this.providers.llm.getModelPricing(modelId);
    return (
      ((estimatedTokens / 1_000_000) *
        (pricing.inputPerMillionTokens + pricing.outputPerMillionTokens)) /
      2
    );
  }
}
```

### 7.5 Result Evaluator

Quality gates between pipeline steps. Fully deterministic.

```typescript
const QUALITY_GATES: Record<string, QualityGate[]> = {
  'coder→reviewer': [
    { name: 'code-compiles', type: 'deterministic', required: true },
    { name: 'no-syntax-errors', type: 'deterministic', required: true },
    { name: 'follows-conventions', type: 'deterministic', required: true },
  ],
  'coder→tester': [{ name: 'exports-testable', type: 'deterministic', required: true }],
  'tester→reviewer': [
    {
      name: 'coverage-minimum',
      type: 'deterministic',
      required: true,
      config: { minCoverage: 80 },
    },
    { name: 'all-tests-pass', type: 'deterministic', required: true },
  ],
  'reviewer→devops': [
    { name: 'review-approved', type: 'agent-output', required: true },
    { name: 'no-critical-security', type: 'deterministic', required: true },
  ],
};
```

---

## 8. Context Management System

### 8.1 Context Store

Accessed exclusively through `providers.database.agentContext` repository. NOT through any specific DB library.

```typescript
interface ContextEntry {
  id: string; // UUID, NOT database-specific ObjectId
  projectId: string;
  contextType: ContextType;
  scope: ContextScope;
  tags: string[];
  content: Record<string, any>; // Flexible structured content
  source: {
    agentId: string;
    taskId?: string;
    pipelineId?: string;
  };
  validUntil?: Date;
  supersedes?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

type ContextType =
  | 'architecture-decision'
  | 'code-convention'
  | 'business-requirement'
  | 'technical-constraint'
  | 'project-structure'
  | 'dependency-info'
  | 'error-history'
  | 'deployment-config'
  | 'agent-decision'
  | 'user-preference';

type ContextScope =
  | { type: 'global' }
  | { type: 'module'; module: string }
  | { type: 'task'; taskId: string }
  | { type: 'pipeline'; pipelineId: string };
```

### 8.2 Context Compiler

```typescript
class ContextCompiler {
  constructor(
    private db: IDatabaseProvider,
    private cache: ICacheProvider,
  ) {}

  async compile(
    agentId: string,
    task: TaskDefinition,
    pipeline: ExecutionPlan,
    maxTokens?: number,
  ): Promise<CompiledContext> {
    // 1. Check cache first
    const cacheKey = `ctx:${pipeline.projectId}:${agentId}:${task.tags.join(',')}`;
    const cached = await this.cache.get<CompiledContext>(cacheKey);
    if (cached) return cached;

    // 2. Query context store through repository (database-agnostic)
    const global = await this.db.agentContext.findMany({
      where: { projectId: pipeline.projectId },
      tags: ['global'],
    });

    const domainSpecific = await this.db.agentContext.findByProjectAndTags(
      pipeline.projectId,
      task.tags,
    );

    // 3. Compile, cap tokens, cache result
    const compiled = { global, domainSpecific /* ... */ };
    await this.cache.set(cacheKey, compiled, 3600); // 1hr TTL
    return compiled;
  }
}
```

---

## 9. Worker Pool & Scheduling

### 9.1 Worker Pool Architecture

All queue operations go through `providers.queue`. No BullMQ-specific code.

```typescript
class WorkerPoolManager {
  constructor(
    private queueProvider: IQueueProvider,
    private agentRegistry: AgentRegistry,
  ) {}

  async setupAgentQueue(agentId: string, maxWorkers: number): Promise<IQueue> {
    const queue = await this.queueProvider.createQueue(`agent:${agentId}`, {
      maxRetries: 3,
      retryBackoff: 'exponential',
      retryDelayMs: 2000,
      jobTimeoutMs: 600000, // 10 minutes
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

### 9.2 Worker Configuration by Plan

```typescript
const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxWorkersPerAgent: {
      coder: 1,
      reviewer: 1,
      tester: 1,
      devops: 1,
      architect: 1,
      analyst: 1,
      doc: 1,
      fixer: 1,
    },
    totalConcurrentWorkers: 2,
    modelTiersAvailable: ['fast', 'balanced'],
  },
  pro: {
    maxWorkersPerAgent: {
      coder: 3,
      reviewer: 2,
      tester: 2,
      devops: 1,
      architect: 1,
      analyst: 1,
      doc: 1,
      fixer: 2,
    },
    totalConcurrentWorkers: 8,
    modelTiersAvailable: ['fast', 'balanced', 'powerful'],
  },
  enterprise: {
    maxWorkersPerAgent: {
      coder: 10,
      reviewer: 5,
      tester: 5,
      devops: 3,
      architect: 2,
      analyst: 2,
      doc: 2,
      fixer: 3,
    },
    totalConcurrentWorkers: 30,
    modelTiersAvailable: ['fast', 'balanced', 'powerful'],
  },
};
```

### 9.3 Handling Parallel Worker Conflicts

1. Each worker operates on a VCS branch (via `providers.vcs.createBranch()`)
2. Merge is a separate DAG step after parallel workers complete
3. Merge conflicts handled by Fixer Agent
4. Database isolation: provider-specific (e.g., schema prefixing, branch databases if supported)

---

## 10. Token Optimization Layer

### 10.1 Optimization Stack

```
Layer 1: Deterministic First          ← Eliminate LLM calls entirely
Layer 2: Context Scoping              ← Reduce input tokens per call
Layer 3: Decision Cache               ← Avoid redundant LLM calls (via providers.cache)
Layer 4: Model Tiering                ← Use cheaper tiers where possible (via ModelRouter)
Layer 5: Prompt Compilation           ← Minimize system prompt tokens
Layer 6: Early Termination            ← Reduce output tokens on failure
Layer 7: Provider Prompt Caching      ← Use provider's native caching if supported
```

**Layer 7 is provider-aware but not provider-dependent:**

```typescript
// The system checks if the provider supports caching
if (providers.llm.supportsCapability('prompt-caching')) {
  // Use provider's native prompt caching
} else {
  // Fall back to our own Context Compiler caching
}
```

### 10.2 Prompt Compiler

```typescript
// System prompts are modular. Agent declares needed modules.
// Prompt Compiler assembles minimum prompt per invocation.

interface PromptModule {
  id: string;
  content: string;
  tokenCount: number;
  applicableTo: string[]; // Agent IDs or '*'
  requiredFor: TaskType[]; // Task types or '*'
}

function compileSystemPrompt(agentId: string, taskType: TaskType): string {
  return PROMPT_MODULES.filter(
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

## 11. Data Layer (Database-Agnostic)

### 11.1 Entity Definitions

These are the LOGICAL entities. No database-specific schemas. Each database adapter maps these to its native format.

```typescript
// src/entities/ExecutionPlan.ts
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

// src/entities/ContextEntry.ts
interface ContextEntry {
  id: string;
  projectId: string;
  contextType: ContextType;
  scope: ContextScope;
  tags: string[];
  content: Record<string, any>;
  source: { agentId: string; taskId?: string; pipelineId?: string };
  validUntil?: Date;
  supersedes?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// src/entities/AgentExecution.ts
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
  createdAt: Date;
}

// src/entities/AgentProfile.ts
interface AgentProfileEntity {
  id: string;
  agentId: string;
  name: string;
  version: string;
  description: string;
  skills: string[];
  defaultModelTier: ModelTier;
  maxConcurrentWorkers: number;
  estimatedTokensPerTask: number;
  tools: AgentTool[];
  systemPromptModules: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// src/entities/WorkerPoolConfig.ts
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

### 11.2 Indexing Requirements (Adapter Must Implement)

```
ExecutionPlan:    [projectId + status], [dag.status]
ContextEntry:     [projectId + contextType + scope.type], [projectId + tags], [validUntil (TTL)]
AgentExecution:   [projectId + createdAt], [agentId + createdAt], [pipelineId]
WorkerPoolConfig: [projectId + agentId] (unique)
AgentProfile:     [agentId] (unique)
```

### 11.3 Adapter Structure

```
src/providers/database/adapters/
├── MongooseAdapter.ts         # Maps entities to Mongoose schemas
├── PrismaAdapter.ts           # Uses Prisma with any SQL DB
├── SQLiteAdapter.ts           # Direct SQLite for local installation
├── DrizzleAdapter.ts          # Drizzle ORM for TypeScript-first SQL
└── index.ts                   # Adapter factory
```

---

## 12. Queue Abstraction Layer

### 12.1 Adapter Structure

```
src/providers/queue/adapters/
├── BullMQAdapter.ts           # Redis-backed (requires Redis)
├── InMemoryQueueAdapter.ts    # Zero-dependency, local-only, single-process
├── RabbitMQAdapter.ts         # Enterprise messaging
├── TemporalAdapter.ts         # Complex workflow orchestration
└── index.ts
```

### 12.2 In-Memory Queue (Critical for Local Installation)

```typescript
/**
 * In-Memory Queue Adapter — enables the multi-agent system to run
 * on ANY machine without Redis or any external queue service.
 *
 * Limitations:
 * - Single process only (no horizontal scaling)
 * - Jobs lost on process restart (acceptable for local dev)
 * - Max ~100 concurrent jobs (sufficient for local use)
 *
 * Advantages:
 * - ZERO external dependencies
 * - Works on Windows, macOS, Linux
 * - <1ms job dispatch latency
 * - Perfect for getting started
 */
class InMemoryQueueAdapter implements IQueueProvider {
  // Uses Node.js async queues + worker threads for concurrency
  // Implements exact same IQueue interface as BullMQ adapter
}
```

---

## 13. API Endpoints

Same as v1 — provider-agnostic by design since they operate on entities, not database-specific types.

```
POST   /api/orchestrator/plan
GET    /api/orchestrator/plan/:id
POST   /api/orchestrator/plan/:id/approve
POST   /api/orchestrator/plan/:id/pause
POST   /api/orchestrator/plan/:id/resume
POST   /api/orchestrator/plan/:id/cancel
POST   /api/orchestrator/plan/:id/rollback

GET    /api/workers/config/:projectId
PUT    /api/workers/config/:projectId/:agentId
GET    /api/workers/status/:projectId

GET    /api/agents
GET    /api/agents/:agentId
GET    /api/agents/:agentId/executions
POST   /api/agents/:agentId/estimate

GET    /api/context/:projectId
GET    /api/context/:projectId/:type
POST   /api/context/:projectId
DELETE /api/context/:projectId/:id

GET    /api/pipelines/:projectId
GET    /api/pipelines/:pipelineId/dag
GET    /api/pipelines/:pipelineId/logs
GET    /api/pipelines/:pipelineId/cost

# Provider management
GET    /api/providers/health           # Health check all providers
GET    /api/providers/config           # Get current provider configuration
PUT    /api/providers/config           # Update provider configuration
GET    /api/providers/llm/models       # List available models from current LLM provider
```

### 13.1 WebSocket Events

```
pipeline:started / completed / failed
task:queued / started / progress / completed / failed
worker:active / idle / error
qualitygate:checking / passed / failed
cost:update
provider:health-changed              # NEW: alert on provider health issues
```

---

## 14. Frontend Integration Points

### 14.1 Control Room View

Same as v1. Additionally:

**Provider Status Panel:** Shows health status of all configured providers (LLM connected, DB connected, Queue running, etc.). Alerts when a provider degrades.

**Model Configuration:** User can see and adjust which LLM models map to which tier. Can switch providers mid-project (e.g., start with OpenAI, switch to Anthropic).

### 14.2 State Management (Zustand)

```typescript
interface OrchestratorState {
  activePipeline: ExecutionPlan | null;
  dagNodes: Map<string, DAGNode>;
  workerConfigs: Map<string, WorkerPoolConfig>;
  workerStatuses: Map<string, WorkerStatus[]>;
  activityFeed: ActivityEntry[];
  currentCost: CostTracker;
  providerHealth: Record<ProviderType, HealthStatus>; // NEW

  updateWorkerCount: (agentId: string, count: number) => Promise<void>;
  approvePlan: (planId: string) => Promise<void>;
  pausePipeline: (planId: string) => Promise<void>;
  resumePipeline: (planId: string) => Promise<void>;
  cancelPipeline: (planId: string) => Promise<void>;
  switchLLMProvider: (provider: string, config: any) => Promise<void>; // NEW
}
```

---

## 15. Local Installation & Runtime

### 15.1 Installation Requirements

```
Minimum Requirements:
- Node.js 20+
- npm or pnpm
- Git (for local VCS provider)
- 4GB RAM (8GB recommended)
- No Docker required (unless using Docker sandbox provider)
- No Redis required (in-memory queue default)
- No external database required (SQLite default)
```

### 15.2 Getting Started (Zero-Config Local)

```bash
# 1. Install
npx create-vibe-platform my-project
cd my-project

# 2. Configure (interactive CLI — or use preset)
npx vibe init
# → Choose preset: Local (Ollama) | Cloud (Anthropic) | Cloud (OpenAI) | Hybrid | Custom
# → If Cloud: enter API key (encrypted and stored locally)
# → Generates vibe.config.ts

# 3. Start
npx vibe start
# → Starts orchestrator on localhost:3000
# → All providers initialized from config
# → Web UI available at http://localhost:3000

# Or with Docker for full isolation:
docker compose up
```

### 15.3 Local Preset Stack

```
┌─────────────────────┬──────────────────────────────────────┐
│ Component           │ Local Default                        │
├─────────────────────┼──────────────────────────────────────┤
│ LLM                 │ Ollama (localhost:11434)              │
│                     │ OR LM Studio (localhost:1234)         │
│                     │ OR any OpenAI-compatible local server │
├─────────────────────┼──────────────────────────────────────┤
│ Database            │ SQLite (./data/vibe.db)               │
├─────────────────────┼──────────────────────────────────────┤
│ Queue               │ In-Memory (single process)           │
├─────────────────────┼──────────────────────────────────────┤
│ Cache               │ In-Memory (Map-based)                │
├─────────────────────┼──────────────────────────────────────┤
│ VCS                 │ Local Git (simple-git)               │
├─────────────────────┼──────────────────────────────────────┤
│ Deploy              │ None (NullDeployAdapter)             │
├─────────────────────┼──────────────────────────────────────┤
│ Sandbox             │ Local Process (child_process)        │
├─────────────────────┼──────────────────────────────────────┤
│ Web UI              │ localhost:3000                        │
└─────────────────────┴──────────────────────────────────────┘
```

### 15.4 OS Compatibility

```typescript
// No OS-specific code allowed. Use these patterns:

// ❌ WRONG
import { exec } from 'child_process';
exec('ls -la /tmp/project'); // Unix-only

// ✅ CORRECT
import path from 'path';
import os from 'os';
const tempDir = path.join(os.tmpdir(), 'vibe-project');
// Use fs.readdir instead of ls
```

---

## 16. Implementation Phases

### Phase 0: Abstraction Foundation (Weeks 1-2)

**Goal:** Provider interfaces + Registry + Configuration system

- [ ] Define all provider interfaces (Section 3)
- [ ] Implement ProviderRegistry
- [ ] Implement vibe.config.ts schema + validation
- [ ] Implement preset configurations
- [ ] Implement config CLI (`npx vibe init`)
- [ ] Implement InMemoryQueueAdapter (local-first)
- [ ] Implement InMemoryCacheAdapter (local-first)
- [ ] Implement SQLiteAdapter (local-first database)
- [ ] Implement LocalGitAdapter (local-first VCS)
- [ ] Unit tests for all interfaces and local adapters

**Deliverable:** `npx vibe init --preset local` works. All local adapters functional.

### Phase 1: Cloud Adapters (Weeks 3-4)

**Goal:** At least one cloud adapter per provider type

- [ ] Implement AnthropicAdapter (LLM)
- [ ] Implement OpenAIAdapter (LLM)
- [ ] Implement OllamaAdapter (LLM — local AI)
- [ ] Implement MongooseAdapter (Database)
- [ ] Implement BullMQAdapter (Queue)
- [ ] Implement RedisAdapter (Cache)
- [ ] Implement GitHubAdapter (VCS)
- [ ] Implement VercelAdapter (Deploy) [optional]
- [ ] Implement DockerSandboxAdapter (Sandbox)
- [ ] Integration tests per adapter
- [ ] Security: credential encryption module
- [ ] Security: input sanitization module

**Deliverable:** All presets functional. Can switch providers via config.

### Phase 2: Agent Protocol + Context Store (Weeks 5-6)

**Goal:** Agent Protocol types + Context system working

- [ ] Define all TypeScript types in `src/agents/protocol.ts`
- [ ] Define all entities in `src/entities/`
- [ ] Implement Context Store CRUD via repository
- [ ] Implement Context Compiler (filter by projectId + tags)
- [ ] Create agent registry module
- [ ] Unit tests for Context Compiler and entities

**Deliverable:** Types compiled, context CRUD working through any configured DB.

### Phase 3: Orchestrator Core (Weeks 7-8)

**Goal:** Planner + Scheduler + Result Evaluator

- [ ] Implement Planner (LLM call via ILLMProvider to generate DAG)
- [ ] Implement ModelRouter (tier → model resolution)
- [ ] Implement Scheduler (DAG → queue dispatch via IQueueProvider)
- [ ] Implement Result Evaluator (quality gates)
- [ ] Wire orchestrator.ts
- [ ] API endpoints for plan CRUD
- [ ] Integration tests with mock agents

**Deliverable:** Create plan from intent, schedule tasks to any configured queue.

### Phase 4: First Agents (Weeks 9-12)

**Goal:** Coder + Reviewer + DevOps functional

- [ ] Implement BaseAgent abstract class
- [ ] Implement Coder Agent (uses providers.llm, providers.vcs, providers.sandbox)
- [ ] Implement Reviewer Agent (deterministic-first + providers.llm)
- [ ] Implement DevOps Agent (providers.vcs, providers.deploy)
- [ ] End-to-end test: intent → plan → Coder → Reviewer → DevOps

**Deliverable:** Complete pipeline with 3 agents on any provider combination.

### Phase 5: Worker Pools (Weeks 13-14)

**Goal:** Configurable concurrent workers

- [ ] Implement WorkerPoolManager (via IQueueProvider)
- [ ] Worker configuration API endpoints
- [ ] Elastic scaling (0-to-max)
- [ ] Context affinity for dispatch
- [ ] Plan-based limits enforcement
- [ ] Parallel execution with VCS branch isolation
- [ ] WebSocket events for worker status

**Deliverable:** User sets N workers, tasks execute in parallel.

### Phase 6: Token Optimization (Weeks 15-16)

**Goal:** Cost optimization layer

- [ ] Prompt Compiler implementation
- [ ] Decision Cache (via ICacheProvider)
- [ ] Early termination on streaming
- [ ] Provider-specific prompt caching (if supported)
- [ ] Cost tracking per pipeline
- [ ] Benchmark: tokens per pipeline vs target

**Deliverable:** Measurable cost reduction. Works across all LLM providers.

### Phase 7: Remaining Agents (Weeks 17-20)

- [ ] Analyst Agent, Architect Agent, Tester Agent, Doc Agent, Fixer Agent

### Phase 8: Frontend Control Room (Weeks 21-22)

- [ ] DAG visualization, Worker panel, Activity Feed, Cost tracker, Provider health panel

---

## 17. Error Handling & Rollback

Same as v1, but ALL rollback operations go through provider interfaces:

```typescript
interface RollbackStep {
  type: 'vcs-revert' | 'db-cleanup' | 'deploy-rollback' | 'context-invalidate';
  provider: ProviderType; // Which provider handles this
  target: string;
  status: 'pending' | 'completed' | 'failed';
}
```

Circuit breaker: 3 failures in 5 minutes → pause agent → alert user.

---

## 18. Testing Strategy

### 18.1 Provider Adapter Testing

Every adapter must pass a **conformance test suite** that validates it implements the interface correctly:

```typescript
// src/providers/llm/__tests__/conformance.test.ts
// This test suite runs against ANY ILLMProvider adapter

function runLLMConformanceTests(adapter: ILLMProvider) {
  test('complete returns valid LLMResponse', async () => {
    /* ... */
  });
  test('stream returns async iterable', async () => {
    /* ... */
  });
  test('listModels returns non-empty array', async () => {
    /* ... */
  });
  test('getModelPricing returns valid pricing', async () => {
    /* ... */
  });
}

// Run against all adapters
runLLMConformanceTests(new AnthropicAdapter());
runLLMConformanceTests(new OpenAIAdapter());
runLLMConformanceTests(new OllamaAdapter());
```

### 18.2 Mock Providers for Testing

```typescript
// src/providers/__mocks__/MockLLMProvider.ts
class MockLLMProvider implements ILLMProvider {
  // Returns predetermined responses. Zero cost. Used in all unit/integration tests.
}

// src/providers/__mocks__/MockDatabaseProvider.ts
class MockDatabaseProvider implements IDatabaseProvider {
  // In-memory repositories. Fast. Used in all tests.
}
```

### 18.3 Full-Stack Tests

End-to-end tests run with local preset (SQLite + InMemory + MockLLM) to validate the entire pipeline works without any cloud dependency.

---

## Appendix A: File Structure

```
src/
├── providers/                        # ←── NEW: ALL external service abstractions
│   ├── types.ts                      # Base provider interfaces
│   ├── registry.ts                   # Provider registration + lookup
│   ├── llm/
│   │   ├── ILLMProvider.ts
│   │   ├── adapters/
│   │   │   ├── AnthropicAdapter.ts
│   │   │   ├── OpenAIAdapter.ts
│   │   │   ├── GeminiAdapter.ts
│   │   │   ├── OllamaAdapter.ts
│   │   │   ├── LMStudioAdapter.ts
│   │   │   └── AzureOpenAIAdapter.ts
│   │   └── __tests__/
│   │       └── conformance.test.ts
│   ├── database/
│   │   ├── IRepository.ts
│   │   ├── IDatabaseProvider.ts
│   │   ├── adapters/
│   │   │   ├── MongooseAdapter.ts
│   │   │   ├── PrismaAdapter.ts
│   │   │   ├── SQLiteAdapter.ts
│   │   │   └── DrizzleAdapter.ts
│   │   └── __tests__/
│   ├── queue/
│   │   ├── IQueueProvider.ts
│   │   ├── adapters/
│   │   │   ├── BullMQAdapter.ts
│   │   │   ├── InMemoryQueueAdapter.ts
│   │   │   └── RabbitMQAdapter.ts
│   │   └── __tests__/
│   ├── cache/
│   │   ├── ICacheProvider.ts
│   │   ├── adapters/
│   │   │   ├── RedisAdapter.ts
│   │   │   ├── InMemoryAdapter.ts
│   │   │   └── SQLiteCacheAdapter.ts
│   │   └── __tests__/
│   ├── vcs/
│   │   ├── IVCSProvider.ts
│   │   ├── adapters/
│   │   │   ├── GitHubAdapter.ts
│   │   │   ├── GitLabAdapter.ts
│   │   │   └── LocalGitAdapter.ts
│   │   └── __tests__/
│   ├── deploy/
│   │   ├── IDeployProvider.ts
│   │   ├── adapters/
│   │   │   ├── VercelAdapter.ts
│   │   │   ├── RailwayAdapter.ts
│   │   │   ├── DockerComposeAdapter.ts
│   │   │   └── NullDeployAdapter.ts
│   │   └── __tests__/
│   ├── sandbox/
│   │   ├── ISandboxProvider.ts
│   │   ├── adapters/
│   │   │   ├── DockerSandboxAdapter.ts
│   │   │   ├── LocalProcessAdapter.ts
│   │   │   └── E2BSandboxAdapter.ts
│   │   └── __tests__/
│   └── __mocks__/                    # Mock providers for testing
│       ├── MockLLMProvider.ts
│       ├── MockDatabaseProvider.ts
│       └── MockQueueProvider.ts
├── entities/                          # ←── NEW: DB-agnostic entity definitions
│   ├── ExecutionPlan.ts
│   ├── ContextEntry.ts
│   ├── AgentExecution.ts
│   ├── AgentProfile.ts
│   └── WorkerPoolConfig.ts
├── security/                          # ←── NEW: Security module
│   ├── credentialManager.ts           # Encrypt/decrypt credentials
│   ├── inputSanitizer.ts             # Strip credentials from context
│   ├── costGuard.ts                  # Enforce cost limits
│   └── auditLogger.ts               # Log all agent executions
├── config/
│   ├── vibeConfig.ts                 # Config schema + validation
│   ├── presets.ts                    # Preset configurations
│   └── cli.ts                        # `npx vibe init` CLI
├── agents/
│   ├── protocol.ts
│   ├── registry.ts
│   ├── base/
│   │   └── BaseAgent.ts
│   ├── architect/ coder/ reviewer/ devops/ tester/ analyst/ doc/ fixer/
│   └── mocks/
├── orchestrator/
│   ├── orchestrator.ts
│   ├── planner.ts
│   ├── scheduler.ts
│   ├── resultEvaluator.ts
│   ├── contextManager.ts
│   ├── contextCompiler.ts
│   ├── modelRouter.ts                # ←── CHANGED: provider-agnostic tier routing
│   └── types.ts
├── optimization/
│   ├── promptCompiler.ts
│   ├── earlyTermination.ts
│   └── costTracker.ts
├── queues/
│   ├── workerPoolManager.ts
│   └── events.ts
├── api/
│   ├── orchestrator/
│   ├── workers/
│   ├── agents/
│   ├── context/
│   └── providers/                    # ←── NEW: Provider management endpoints
├── websocket/
│   └── orchestratorEvents.ts
└── __tests__/
    ├── conformance/                  # Provider conformance test suites
    └── e2e/                          # End-to-end pipeline tests (local preset)
```

---

## Appendix B: Environment Variables

```bash
# ─── Provider Selection (alternative to vibe.config.ts) ───
VIBE_LLM_PROVIDER=anthropic           # or: openai, google, ollama, lmstudio
VIBE_DATABASE_PROVIDER=sqlite         # or: mongodb, postgresql, mysql
VIBE_QUEUE_PROVIDER=in-memory         # or: bullmq, rabbitmq
VIBE_CACHE_PROVIDER=in-memory         # or: redis
VIBE_VCS_PROVIDER=local-git           # or: github, gitlab, bitbucket
VIBE_DEPLOY_PROVIDER=none             # or: vercel, railway, flyio, docker
VIBE_SANDBOX_PROVIDER=local-process   # or: docker, e2b

# ─── Provider-Specific Credentials (only those needed for chosen providers) ───
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
GITHUB_TOKEN=ghp_...
VERCEL_TOKEN=...
RAILWAY_TOKEN=...

# ─── Security ───
VIBE_SECRET_KEY=...                   # For encrypting stored credentials
VIBE_AUDIT_LOG_LEVEL=standard

# ─── Cost Controls ───
VIBE_MAX_COST_PER_PIPELINE=5.00
VIBE_MAX_COST_PER_DAY=50.00
VIBE_MAX_TOKENS_PER_TASK=50000
```

---

## Appendix C: Provider Adapter Compliance Checklist

Every new adapter MUST:

- [ ] Implement the full interface (no NotImplementedError stubs in production)
- [ ] Pass the conformance test suite for its provider type
- [ ] Handle connection failures gracefully (return HealthStatus.unhealthy, don't throw)
- [ ] Support `initialize()` / `shutdown()` lifecycle
- [ ] Log all external calls at debug level
- [ ] Never store credentials in logs or error messages
- [ ] Support timeout configuration
- [ ] Include README in adapter directory with setup instructions

---

**END OF SPECIFICATION v2.0**

When implementing, follow the phases in Section 16 strictly. Phase 0 (Abstraction Foundation) is MANDATORY before any other phase. The provider interfaces ARE the architecture — everything else builds on them.
