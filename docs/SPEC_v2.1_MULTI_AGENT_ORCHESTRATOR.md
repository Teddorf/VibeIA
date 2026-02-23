# Vibe Coding Platform — Multi-Agent Orchestrator Architecture

## Specification for Implementation — v2.1 (Technology-Agnostic)

**Version:** 2.1
**Date:** February 2026
**Runtime:** Node.js, TypeScript
**Core Principle:** ZERO hardcoded vendor dependencies. Every external service accessed through abstraction interfaces.
**Deployment:** Local-first. Must run on any developer machine. Cloud optional.
**Purpose:** This document is the implementation spec for Claude Code. Follow it sequentially by layers.
**Delta vs v2.0:** Phase 0 expanded with cross-platform compliance, codebase gap analysis, and migration strategy from existing MVP.

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
19. [Gap Analysis: Current Codebase vs Spec](#19-gap-analysis-current-codebase-vs-spec)

---

## 1. Architecture Overview

### 1.1 From Monolithic Conductor to Multi-Agent Orchestrator

The platform evolves from a single AI Conductor (one LLM handling all phases) to a **Level 2 Pipeline Composer** architecture where a central Orchestrator composes, dispatches, and validates pipelines of specialized agents.

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
11. **Cross-Platform**: MUST run identically on Windows, macOS, and Linux. ZERO OS-specific code in business logic.

### 2.2 Agnosticism Charter

This is the contract that EVERY module in the system must respect. Violations are architectural bugs.

```
+----------------------------+-----------------------------------------------+
| DIMENSION                  | WHAT IT MEANS                                 |
+----------------------------+-----------------------------------------------+
| LLM Provider               | Anthropic, OpenAI, Google Gemini, Mistral,    |
|                            | Ollama (local), LM Studio, Azure OpenAI,      |
|                            | AWS Bedrock -- all via ILLMProvider interface  |
+----------------------------+-----------------------------------------------+
| Database                   | MongoDB, PostgreSQL, MySQL, SQLite (local),    |
|                            | Supabase, PlanetScale, Turso, Neon            |
|                            | -- all via IRepository interfaces              |
+----------------------------+-----------------------------------------------+
| Queue / Job System         | BullMQ+Redis, RabbitMQ, In-Memory (local),    |
|                            | SQS, Inngest, Temporal                        |
|                            | -- all via IQueueProvider interface             |
+----------------------------+-----------------------------------------------+
| Version Control            | GitHub, GitLab, Bitbucket, local Git           |
|                            | -- all via IVCSProvider interface               |
+----------------------------+-----------------------------------------------+
| Deployment                 | Vercel, Railway, Fly.io, Render, AWS,          |
|                            | self-hosted, Docker, none (local only)         |
|                            | -- all via IDeployProvider interface            |
+----------------------------+-----------------------------------------------+
| Cache                      | Redis, Memcached, In-Memory (local),           |
|                            | SQLite cache layer                             |
|                            | -- all via ICacheProvider interface             |
+----------------------------+-----------------------------------------------+
| File System / Code Storage | Local filesystem, S3, GCS, Git repo            |
|                            | -- all via IFileSystemProvider interface        |
+----------------------------+-----------------------------------------------+
| Operating System           | Windows, macOS, Linux                          |
|                            | -- no OS-specific paths, commands, or tools    |
+----------------------------+-----------------------------------------------+
| Code Execution Sandbox     | Docker, Firecracker, E2B, local process,       |
|                            | WASM sandbox                                   |
|                            | -- all via ISandboxProvider interface           |
+----------------------------+-----------------------------------------------+
```

### 2.3 Cross-Platform Compliance Rules

**MANDATORY for all code in the system. Violations are bugs.**

```typescript
// === LINE ENDINGS ===
// NEVER: string.split('\n')
// ALWAYS: string.split(/\r?\n/)
// Or use the platform utility:
import { splitLines } from '@vibe/platform';

// === FILE PATHS ===
// NEVER: '/tmp/project' or 'C:\\Users\\project'
// ALWAYS: path.join(os.tmpdir(), 'vibe-project')
import path from 'path';
import os from 'os';

// === DIRECTORY LISTING ===
// NEVER: exec('ls -la /tmp/project')
// ALWAYS: fs.readdir(dirPath)

// === FILE OPERATIONS ===
// NEVER: exec('rm -rf dir') or exec('del /s dir')
// ALWAYS: fs.rm(dirPath, { recursive: true, force: true })

// === TEMP DIRECTORIES ===
// NEVER: '/tmp/' or '%TEMP%'
// ALWAYS: os.tmpdir()

// === NEWLINE WRITING ===
// NEVER: hardcoded '\n' in file output for system files
// ALWAYS: os.EOL for system files, '\n' only for git-tracked source files

// === SHELL COMMANDS ===
// NEVER: bash-specific syntax in exec()
// ALWAYS: cross-platform alternatives or platform detection:
import { platform } from 'os';
if (platform() === 'win32') {
  /* windows path */
}

// === PATH SEPARATORS ===
// NEVER: concatenate with '/' or '\\'
// ALWAYS: path.join(), path.resolve(), path.sep

// === EXECUTABLE NAMES ===
// NEVER: 'node' (may need 'node.exe' on some Windows configs)
// ALWAYS: process.execPath for Node, or use cross-spawn package
```

### 2.4 Platform Utility Module

```typescript
// src/platform/index.ts — MUST be created in Phase 0

/**
 * Cross-platform utilities. Every module MUST use these
 * instead of direct OS-specific calls.
 */
export function splitLines(text: string): string[] {
  return text.split(/\r?\n/);
}

export function joinLines(lines: string[]): string {
  return lines.join('\n'); // Git-normalized for source files
}

export function getTempDir(subdir?: string): string {
  const base = path.join(os.tmpdir(), 'vibe');
  return subdir ? path.join(base, subdir) : base;
}

export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/'); // Normalize to forward slashes for consistency
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

export async function listDir(dirPath: string): Promise<string[]> {
  return fs.readdir(dirPath);
}
```

### 2.5 Constraints

- Maximum task duration: 10 minutes (inherited from existing spec)
- Quality gates between every pipeline step
- 80% test coverage minimum for generated code
- All agent outputs must be serializable JSON
- No agent can modify state outside its declared output schema
- Every LLM call must be traceable to a specific task, agent, and pipeline
- No plaintext credentials anywhere — secrets are always encrypted or in env vars
- Generated code executes ONLY inside a sandbox, never in the host process
- ZERO OS-specific code outside the platform utility module

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

// --- Request / Response Types (provider-agnostic) ---

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

// --- Model Tier System (Provider-Agnostic) ---

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

// src/providers/llm/adapters/OllamaAdapter.ts (LOCAL -- no API key needed)
class OllamaAdapter implements ILLMProvider {
  providerId = 'ollama';
  // Connects to localhost:11434 -- fully local, no cloud dependency
}

// src/providers/llm/adapters/LMStudioAdapter.ts (LOCAL)
class LMStudioAdapter implements ILLMProvider {
  providerId = 'lmstudio';
  // Connects to localhost:1234 -- OpenAI-compatible API, fully local
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

// --- Generic Repository Interface ---

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

// --- Specific Repositories (business logic uses THESE, not raw DB) ---

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

// --- Database Provider (manages connection + exposes repositories) ---

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
```

### 3.5 Queue Provider Interface

```typescript
// src/providers/queue/IQueueProvider.ts

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

interface JobOptions {
  priority?: number;
  delay?: number;
  attempts?: number;
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

  getFile(repo: string, filePath: string, ref?: string): Promise<FileContent>;
  getTree(repo: string, dirPath: string, ref?: string): Promise<TreeEntry[]>;

  getDiff(repo: string, base: string, head: string): Promise<DiffResult>;
}

type MergeStrategy = 'merge' | 'squash' | 'rebase';

interface FileChange {
  path: string;
  content: string;
  operation: 'create' | 'update' | 'delete';
}
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
```

### 3.8 Cache Provider Interface

```typescript
// src/providers/cache/ICacheProvider.ts

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
// src/providers/sandbox/ISandboxProvider.ts

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
```

### 3.10 Provider Registry & Configuration

```typescript
// src/providers/registry.ts

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

// --- Configuration File ---

// vibe.config.ts (project root) -- user configures their providers here
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
      config: Record<string, any>;
      modelMapping: {
        fast: string;
        balanced: string;
        powerful: string;
      };
    };
    database: {
      provider: 'mongodb' | 'postgresql' | 'mysql' | 'sqlite';
      config: Record<string, any>;
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
const PRESET_LOCAL: Partial<VibeConfig> = {
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

const PRESET_HYBRID: Partial<VibeConfig> = {
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
+--------------------------+------------------------------------------------+
| THREAT                   | MITIGATION                                     |
+--------------------------+------------------------------------------------+
| LLM prompt injection     | Agent outputs NEVER executed as code without   |
| via malicious context    | Reviewer Agent AND sandbox. Input sanitization.|
+--------------------------+------------------------------------------------+
| Generated code with      | ALL generated code runs in sandbox first.      |
| malicious payloads       | Reviewer Agent runs security scanner.          |
+--------------------------+------------------------------------------------+
| Credential leakage       | NEVER stored in plaintext. Env var references. |
|                          | NEVER passed as LLM context. AES-256-GCM.     |
+--------------------------+------------------------------------------------+
| Supply chain attacks     | npm audit / Snyk. Reviewer checks new deps.    |
+--------------------------+------------------------------------------------+
| Runaway LLM costs        | Per-pipeline cap. Per-task token limit.         |
|                          | Per-project daily cap. Circuit breaker.         |
+--------------------------+------------------------------------------------+
| Unauthorized agent exec  | Valid pipeline + task reference required.       |
|                          | Audit log for every execution.                 |
+--------------------------+------------------------------------------------+
| Data exfiltration        | Sandbox has no network by default.             |
|                          | All outbound traffic logged.                   |
+--------------------------+------------------------------------------------+
| Local credential theft   | Config 600 permissions. Machine-specific key.  |
|                          | Optional OS keychain integration.              |
+--------------------------+------------------------------------------------+
```

### 4.2 Security Configuration

```typescript
interface SecurityConfig {
  secrets: {
    encryptionMethod: 'aes-256-gcm' | 'os-keychain';
  };
  sandbox: {
    enabled: boolean;
    networkPolicy: 'none' | 'restricted' | 'full';
    allowedOutboundHosts: string[];
    maxMemoryMB: number;
    maxCPUCores: number;
    maxExecutionTimeMs: number;
  };
  costLimits: {
    maxTokensPerTask: number; // Default: 50000
    maxCostPerPipeline: number; // USD. Default: 5.00
    maxCostPerDay: number; // USD per project. Default: 50.00
    alertThresholdPercent: number; // Default: 80
  };
  audit: {
    logAllLLMCalls: boolean;
    logLevel: 'minimal' | 'standard' | 'verbose';
    retentionDays: number;
  };
  sanitization: {
    maxContextEntrySize: number; // Default: 100KB
    stripHTMLFromContext: boolean;
    blockPromptInjectionPatterns: boolean;
  };
}
```

---

## 5. Agent Protocol

### 5.1 Base Agent Interface

```typescript
// src/agents/protocol.ts

interface AgentProfile {
  id: string;
  name: string;
  version: string;
  description: string;
  skills: string[];
  defaultModelTier: ModelTier;
  maxConcurrentWorkers: number;
  estimatedTokensPerTask: number;
  tools: AgentTool[];
  systemPromptModules: string[];
  requiredProviders: ProviderType[];
}

interface AgentTool {
  id: string;
  type: 'deterministic' | 'llm-assisted';
  description: string;
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
}

interface AgentInput {
  taskId: string;
  pipelineId: string;
  projectId: string;
  context: CompiledContext;
  taskDefinition: TaskDefinition;
  previousOutputs: AgentOutput[];
  configuration: AgentConfiguration;
  providers: ProviderRegistry;
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
  modelUsed: string;
  modelTier: ModelTier;
  providerId: string;
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

interface IAgent {
  profile: AgentProfile;
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
  estimatedMinutes: number;
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

- **id:** architect | **tier:** powerful
- **skills:** system-design, stack-selection, scalability-analysis, architecture-patterns, database-design
- **tools:** dependency-analyzer (deterministic), architecture-validator (deterministic)

### 6.2 Analyst Agent

- **id:** analyst | **tier:** balanced
- **skills:** user-story-writing, requirements-extraction, feature-prioritization, acceptance-criteria
- **tools:** story-template-engine (deterministic)

### 6.3 Coder Agent

- **id:** coder | **tier:** balanced (varies by complexity)
- **skills:** code-generation, refactoring, api-design, database-schemas, migration-writing
- **tools:** code-template-engine, prettier-formatter, import-resolver (all deterministic)
- **Complexity routing:** low=fast, medium=balanced, high=powerful

### 6.4 Reviewer Agent

- **id:** reviewer | **tier:** balanced
- **skills:** code-review, security-scanning, performance-audit, best-practices-validation
- **tools:** linter-runner, type-checker, security-scanner, complexity-analyzer, duplication-detector (all deterministic)
- **CRITICAL:** Deterministic tools run FIRST. LLM only if ALL pass.

### 6.5 DevOps Agent

- **id:** devops | **tier:** fast
- **skills:** vcs-operations, database-branching, deployment, environment-config, ci-cd
- **tools:** vcs-api, db-branch-manager, deployer, env-manager (all deterministic)
- **~90% deterministic.** LLM only for unexpected errors.

### 6.6 Tester Agent

- **id:** tester | **tier:** balanced
- **skills:** unit-test-generation, integration-test-generation, e2e-test-generation, coverage-analysis
- **tools:** test-template-engine, test-runner, coverage-reporter (all deterministic)

### 6.7 Doc Agent

- **id:** doc | **tier:** fast
- **skills:** api-documentation, readme-generation, changelog, user-guides, jsdoc
- **tools:** jsdoc-extractor, openapi-generator, changelog-parser (all deterministic)

### 6.8 Fixer Agent

- **id:** fixer | **tier:** balanced
- **skills:** error-analysis, debugging, hotfix-generation, root-cause-analysis
- **tools:** stack-trace-parser, error-pattern-matcher, vcs-bisect-runner (all deterministic)

---

## 7. Orchestrator Engine

### 7.1 Architecture

```
src/orchestrator/
|-- orchestrator.ts          # Main coordinator
|-- planner.ts               # Intent -> Execution DAG
|-- scheduler.ts             # DAG -> Queue dispatch
|-- contextManager.ts        # Context Store read/write + Context Compiler
|-- resultEvaluator.ts       # Quality gates + pipeline flow control
|-- modelRouter.ts           # Task -> model tier -> actual model resolution
+-- types.ts                 # Shared types
```

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

### 7.3 Model Router (Provider-Agnostic)

```typescript
class ModelRouter {
  constructor(private config: VibeConfig) {}

  resolve(tier: ModelTier): string {
    return this.config.providers.llm.modelMapping[tier];
  }

  selectTier(task: TaskDefinition, agent: AgentProfile): ModelTier {
    if (agent.id === 'architect') return 'powerful';
    if (agent.id === 'devops' || agent.id === 'doc') return 'fast';
    if (task.complexity === 'low') return 'fast';
    if (task.complexity === 'high') return 'powerful';
    if (task.type === 'security-fix') return 'powerful';
    if (task.tags.includes('boilerplate')) return 'fast';
    return agent.defaultModelTier;
  }
}
```

### 7.4 Result Evaluator — Quality Gates

```typescript
const QUALITY_GATES: Record<string, QualityGate[]> = {
  'coder->reviewer': [
    { name: 'code-compiles', type: 'deterministic', required: true },
    { name: 'no-syntax-errors', type: 'deterministic', required: true },
    { name: 'follows-conventions', type: 'deterministic', required: true },
  ],
  'tester->reviewer': [
    {
      name: 'coverage-minimum',
      type: 'deterministic',
      required: true,
      config: { minCoverage: 80 },
    },
    { name: 'all-tests-pass', type: 'deterministic', required: true },
  ],
  'reviewer->devops': [
    { name: 'review-approved', type: 'agent-output', required: true },
    { name: 'no-critical-security', type: 'deterministic', required: true },
  ],
};
```

---

## 8. Context Management System

### 8.1 Context Store

```typescript
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

Queries context store through repository, filters by project + agent + tags, caps tokens, caches result via ICacheProvider.

---

## 9. Worker Pool & Scheduling

Worker pools managed via IQueueProvider. Each agent gets a named queue. Concurrency is configurable per agent per plan tier (free/pro/enterprise). Context affinity preferred for dispatch.

### 9.1 Plan Limits

```typescript
const PLAN_LIMITS = {
  free: { totalConcurrentWorkers: 2, modelTiers: ['fast', 'balanced'] },
  pro: { totalConcurrentWorkers: 8, modelTiers: ['fast', 'balanced', 'powerful'] },
  enterprise: { totalConcurrentWorkers: 30, modelTiers: ['fast', 'balanced', 'powerful'] },
};
```

---

## 10. Token Optimization Layer

7 layers: Deterministic First > Context Scoping > Decision Cache > Model Tiering > Prompt Compilation > Early Termination > Provider Prompt Caching.

---

## 11. Data Layer (Database-Agnostic)

Logical entities: ExecutionPlan, ContextEntry, AgentExecution, AgentProfile, WorkerPoolConfig. Each DB adapter maps these to native format. Indexing requirements specified per entity.

---

## 12. Queue Abstraction Layer

InMemoryQueueAdapter is critical for local installation. Zero dependencies, single process, <1ms dispatch. BullMQ for production.

---

## 13. API Endpoints

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
POST   /api/context/:projectId
DELETE /api/context/:projectId/:id

GET    /api/pipelines/:projectId
GET    /api/pipelines/:pipelineId/dag
GET    /api/pipelines/:pipelineId/logs
GET    /api/pipelines/:pipelineId/cost

GET    /api/providers/health
GET    /api/providers/config
PUT    /api/providers/config
GET    /api/providers/llm/models
```

### 13.1 WebSocket Events

```
pipeline:started / completed / failed
task:queued / started / progress / completed / failed
worker:active / idle / error
qualitygate:checking / passed / failed
cost:update
provider:health-changed
```

---

## 14. Frontend Integration Points

Zustand store for OrchestratorState. Control Room with DAG visualization, worker panel, activity feed, cost tracker, provider health panel.

---

## 15. Local Installation & Runtime

```
Minimum Requirements:
- Node.js 20+
- npm or pnpm
- Git
- 4GB RAM (8GB recommended)
- No Docker, Redis, or external DB required
```

### 15.1 Local Preset Stack

| Component | Local Default                 |
| --------- | ----------------------------- |
| LLM       | Ollama (localhost:11434)      |
| Database  | SQLite (./data/vibe.db)       |
| Queue     | In-Memory                     |
| Cache     | In-Memory                     |
| VCS       | Local Git (simple-git)        |
| Deploy    | None (NullDeployAdapter)      |
| Sandbox   | Local Process (child_process) |

---

## 16. Implementation Phases

### Phase 0: Abstraction Foundation + Cross-Platform Compliance (Weeks 1-2)

**Goal:** Provider interfaces + Registry + Configuration system + Cross-platform fixes for existing code.

**CRITICAL: This phase MUST complete before any other phase begins.**

#### 0.A — Cross-Platform Fixes (existing codebase)

These fixes are applied to the EXISTING code to establish cross-platform compliance:

- [ ] **Create platform utility module** (`backend/src/platform/index.ts`)
  - `splitLines()`, `joinLines()`, `getTempDir()`, `normalizePath()`
  - `isWindows()`, `isMacOS()`, `isLinux()`
  - `ensureDir()`, `removeDir()`, `listDir()`

- [ ] **Fix `.split('\n')` in 9 files** (replace with `splitLines()`)
  - `backend/src/modules/codebase-analysis/analyzers/dependencies.analyzer.ts` (3 instances)
  - `backend/src/modules/quality-gates/quality-gates.service.ts` (1 instance)
  - `backend/src/modules/security/security-scanner.service.ts` (2 instances)
  - `backend/src/modules/documentation/api-docs-generator.service.ts` (1 instance)
  - `vibeia/src/components/documentation/DocumentationGenerator.tsx` (3 instances)
  - `vibeia/src/components/wizard/ExpertMode.tsx` (1 instance)

- [ ] **Fix Dockerfile Unix commands**
  - `backend/Dockerfile`: Replace `ls -la` with portable check

- [ ] **Fix workspace service Linux assumption**
  - `backend/src/modules/security/workspace.service.ts`: Make base image configurable

- [ ] **Add `process.platform` detection** where shell commands are used

- [ ] **Create cross-platform deploy script** (replace bash-only `deploy.sh`)
  - Option A: Node.js script (`deploy.mjs`) that works everywhere
  - Option B: Keep both `.sh` and `.bat` but add PowerShell script for Windows

- [ ] **Remove `.env` from git tracking** (SECURITY FIX)
  - Add `backend/.env` to `.gitignore`
  - Rotate all exposed credentials (API keys, OAuth secrets, JWT secrets)
  - Ensure `.env.example` is complete with placeholder values

- [ ] **Unit tests for platform module** — test on both `\n` and `\r\n` inputs

#### 0.B — Provider Interfaces

- [ ] Define `IProvider` base interface (`backend/src/providers/types.ts`)
- [ ] Define `ILLMProvider` interface (`backend/src/providers/llm/ILLMProvider.ts`)
- [ ] Define `IDatabaseProvider` + `IRepository<T>` interfaces
- [ ] Define `IQueueProvider` + `IQueue` interfaces
- [ ] Define `ICacheProvider` interface
- [ ] Define `IVCSProvider` interface
- [ ] Define `IDeployProvider` interface
- [ ] Define `ISandboxProvider` + `ISandbox` interfaces
- [ ] Define `ProviderType`, `ProviderConfig`, `HealthStatus` types

#### 0.C — Provider Registry

- [ ] Implement `ProviderRegistry` class
- [ ] Typed getters for each provider type
- [ ] `healthCheckAll()` method
- [ ] `shutdownAll()` lifecycle method
- [ ] Register as NestJS provider (injectable)

#### 0.D — Configuration System

- [ ] Define `VibeConfig` TypeScript interface
- [ ] Implement config loader (reads `vibe.config.ts` or env vars)
- [ ] Implement config validator (Zod schema)
- [ ] Implement preset configurations (LOCAL, CLOUD_ANTHROPIC, CLOUD_OPENAI, HYBRID)
- [ ] Wire config into NestJS ConfigModule

#### 0.E — Local-First Adapters

- [ ] Implement `InMemoryQueueAdapter` (IQueueProvider)
  - Async queue with configurable concurrency
  - Job retry with exponential backoff
  - Progress tracking
  - All IQueue methods
- [ ] Implement `InMemoryCacheAdapter` (ICacheProvider)
  - Map-based with TTL support
  - Pattern-based deletion
- [ ] Implement `LocalProcessSandboxAdapter` (ISandboxProvider)
  - child_process with resource limits
  - Cross-platform command execution
  - Timeout enforcement
- [ ] Implement `NullDeployAdapter` (IDeployProvider)
  - No-op adapter returning localhost URLs

#### 0.F — Testing

- [ ] Unit tests for ProviderRegistry
- [ ] Unit tests for config loader + validator
- [ ] Unit tests for InMemoryQueueAdapter (enqueue, process, concurrency, retry)
- [ ] Unit tests for InMemoryCacheAdapter (get, set, TTL, pattern delete)
- [ ] Unit tests for platform utilities (cross-platform)
- [ ] Conformance test template for each provider type

**Phase 0 Deliverable:** `ProviderRegistry` works. All local adapters functional. Config system loads presets. Cross-platform issues fixed. `.env` secured.

---

### Phase 1: Cloud Adapters (Weeks 3-4)

**Goal:** Wrap existing providers as adapters of new interfaces.

- [ ] Wrap existing `AnthropicProvider` -> `AnthropicAdapter` (ILLMProvider)
- [ ] Wrap existing `OpenAIProvider` -> `OpenAIAdapter` (ILLMProvider)
- [ ] Wrap existing `GeminiProvider` -> `GeminiAdapter` (ILLMProvider)
- [ ] Implement `OllamaAdapter` (ILLMProvider — local AI)
- [ ] Wrap existing Mongoose schemas -> `MongooseAdapter` (IDatabaseProvider)
- [ ] Implement `BullMQAdapter` (IQueueProvider)
- [ ] Implement `RedisAdapter` (ICacheProvider)
- [ ] Wrap existing `GitService` -> `GitHubAdapter` (IVCSProvider)
- [ ] Wrap existing `GitLabProvider` -> `GitLabAdapter` (IVCSProvider)
- [ ] Implement `LocalGitAdapter` (IVCSProvider — simple-git)
- [ ] Wrap existing setup executors -> Deploy adapters
- [ ] Implement `DockerSandboxAdapter` (ISandboxProvider)
- [ ] Security: input sanitization module for LLM context
- [ ] Integration tests per adapter
- [ ] Conformance test suite execution for all adapters

**Phase 1 Deliverable:** All presets functional. Can switch providers via config. Existing functionality preserved.

---

### Phase 2: Agent Protocol + Context Store (Weeks 5-6)

- [ ] Define all TypeScript types in `src/agents/protocol.ts`
- [ ] Define all entities in `src/entities/`
- [ ] Implement Context Store CRUD via IAgentContextRepository
- [ ] Implement Context Compiler (filter by projectId + tags + scope)
- [ ] Create AgentRegistry module
- [ ] Implement BaseAgent abstract class
- [ ] Unit tests for Context Compiler and entities

**Deliverable:** Types compiled, context CRUD working through any configured DB.

---

### Phase 3: Orchestrator Core (Weeks 7-8)

- [ ] Implement Planner (intent -> DAG via ILLMProvider)
- [ ] Implement ModelRouter (tier -> model resolution via config)
- [ ] Implement Scheduler (DAG -> queue dispatch via IQueueProvider)
- [ ] Implement Result Evaluator (quality gates between DAG nodes)
- [ ] Wire orchestrator.ts as coordinator
- [ ] API endpoints for plan CRUD
- [ ] Integration tests with mock agents

**Deliverable:** Create plan from intent, schedule tasks to any configured queue.

---

### Phase 4: First Agents (Weeks 9-12)

- [ ] Implement Coder Agent (extract from LlmService.generateCode)
- [ ] Implement Reviewer Agent (deterministic-first + ILLMProvider)
- [ ] Implement DevOps Agent (IVCSProvider + IDeployProvider)
- [ ] End-to-end test: intent -> plan -> Coder -> Reviewer -> DevOps

**Deliverable:** Complete pipeline with 3 agents on any provider combination.

---

### Phase 5: Worker Pools (Weeks 13-14)

- [ ] Implement WorkerPoolManager (via IQueueProvider)
- [ ] Worker configuration API endpoints
- [ ] Elastic scaling (0-to-max)
- [ ] Context affinity for dispatch
- [ ] Plan-based limits enforcement
- [ ] Parallel execution with VCS branch isolation
- [ ] WebSocket events for worker status

**Deliverable:** User sets N workers, tasks execute in parallel.

---

### Phase 6: Token Optimization (Weeks 15-16)

- [ ] Prompt Compiler with modular system prompts
- [ ] Decision Cache (via ICacheProvider)
- [ ] Early termination on streaming
- [ ] Provider-specific prompt caching (if supported)
- [ ] Cost tracking per pipeline
- [ ] Cost guard enforcement (per-task, per-pipeline, per-day limits)

**Deliverable:** Measurable cost reduction. Works across all LLM providers.

---

### Phase 7: Remaining Agents (Weeks 17-20)

- [ ] Analyst Agent
- [ ] Architect Agent
- [ ] Tester Agent
- [ ] Doc Agent
- [ ] Fixer Agent

---

### Phase 8: Frontend Control Room (Weeks 21-22)

- [ ] Migrate React Context -> Zustand for orchestrator state
- [ ] Install and integrate socket.io-client
- [ ] DAG visualization (enhance DependencyGraph component)
- [ ] Worker panel with scale controls
- [ ] Activity Feed with real-time updates
- [ ] Cost tracker widget
- [ ] Provider health panel
- [ ] Model configuration UI

---

## 17. Error Handling & Rollback

All rollback operations go through provider interfaces. Circuit breaker: 3 failures in 5 minutes -> pause agent -> alert user.

```typescript
interface RollbackStep {
  type: 'vcs-revert' | 'db-cleanup' | 'deploy-rollback' | 'context-invalidate';
  provider: ProviderType;
  target: string;
  status: 'pending' | 'completed' | 'failed';
}
```

---

## 18. Testing Strategy

### 18.1 Provider Conformance Tests

Every adapter must pass a conformance test suite:

```typescript
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
```

### 18.2 Mock Providers

```typescript
class MockLLMProvider implements ILLMProvider {
  /* predetermined responses */
}
class MockDatabaseProvider implements IDatabaseProvider {
  /* in-memory repos */
}
class MockQueueProvider implements IQueueProvider {
  /* sync execution */
}
```

### 18.3 E2E Tests

Run with local preset (SQLite + InMemory + MockLLM) to validate entire pipeline without cloud dependency.

---

## 19. Gap Analysis: Current Codebase vs Spec

### 19.1 Compliance Score by Area

```
OVERALL SPEC COMPLIANCE: 2.5/10

| Area                         | Score | Status    |
|------------------------------|-------|-----------|
| Provider Agnosticism         | 2/10  | CRITICAL  |
| Agent Architecture           | 1/10  | CRITICAL  |
| Orchestrator/DAG Engine      | 1/10  | CRITICAL  |
| Context Management           | 0/10  | MISSING   |
| Worker Pools                 | 0/10  | MISSING   |
| Token Optimization           | 1/10  | CRITICAL  |
| Security Architecture        | 5/10  | PARTIAL   |
| Sandbox Execution            | 0/10  | MISSING   |
| Quality Gates                | 6/10  | GOOD BASE |
| API Endpoints                | 4/10  | PARTIAL   |
| Frontend Control Room        | 2/10  | MINIMAL   |
| WebSocket Integration        | 2/10  | BROKEN    |
| Testing Strategy             | 4/10  | BASIC     |
| Local-First Capability       | 1/10  | CRITICAL  |
| Configuration System         | 1/10  | MISSING   |
| Cross-Platform Compliance    | 5/10  | PARTIAL   |
```

### 19.2 Assets to Preserve

| Asset                               | Maps To                      |
| ----------------------------------- | ---------------------------- |
| NestJS 20-module architecture       | Refactorable, not rewritable |
| LLM Provider interface + 3 adapters | Base for ILLMProvider        |
| Quality Gates service               | Evolves to Result Evaluator  |
| Setup Orchestrator with rollback    | Pattern for agent rollback   |
| Security module (AES-256-GCM)       | Reusable directly            |
| Auth (JWT + 3 OAuth providers)      | Production-ready, keep as-is |
| Teams + Billing modules             | Business logic preserved     |
| Frontend wizard (4 stages)          | Maintained                   |
| DependencyGraph component           | Base for DAG visualization   |
| 362 + 83 tests                      | Safety net for refactoring   |

### 19.3 Migration Strategy

**DO NOT rewrite. Inject abstraction layers below existing code.**

1. Phase 0: Create interfaces + registry alongside existing code
2. Phase 1: Wrap existing services as adapters
3. Phase 2-3: Build new orchestrator that gradually replaces ExecutionService
4. Phase 4+: New agents consume providers through registry

Existing production deployment continues working throughout migration.

---

## Appendix A: File Structure (Target)

```
backend/src/
|-- platform/                          # Cross-platform utilities (Phase 0)
|   +-- index.ts
|-- providers/                         # ALL external service abstractions
|   |-- types.ts
|   |-- registry.ts
|   |-- llm/
|   |   |-- ILLMProvider.ts
|   |   |-- adapters/
|   |   |   |-- AnthropicAdapter.ts
|   |   |   |-- OpenAIAdapter.ts
|   |   |   |-- GeminiAdapter.ts
|   |   |   |-- OllamaAdapter.ts
|   |   |   +-- LMStudioAdapter.ts
|   |   +-- __tests__/
|   |       +-- conformance.test.ts
|   |-- database/
|   |   |-- IRepository.ts
|   |   |-- IDatabaseProvider.ts
|   |   |-- adapters/
|   |   |   |-- MongooseAdapter.ts
|   |   |   |-- SQLiteAdapter.ts
|   |   |   +-- PrismaAdapter.ts
|   |   +-- __tests__/
|   |-- queue/
|   |   |-- IQueueProvider.ts
|   |   |-- adapters/
|   |   |   |-- BullMQAdapter.ts
|   |   |   +-- InMemoryQueueAdapter.ts
|   |   +-- __tests__/
|   |-- cache/
|   |   |-- ICacheProvider.ts
|   |   |-- adapters/
|   |   |   |-- RedisAdapter.ts
|   |   |   |-- InMemoryAdapter.ts
|   |   |   +-- SQLiteCacheAdapter.ts
|   |   +-- __tests__/
|   |-- vcs/
|   |   |-- IVCSProvider.ts
|   |   |-- adapters/
|   |   |   |-- GitHubAdapter.ts
|   |   |   |-- GitLabAdapter.ts
|   |   |   +-- LocalGitAdapter.ts
|   |   +-- __tests__/
|   |-- deploy/
|   |   |-- IDeployProvider.ts
|   |   |-- adapters/
|   |   |   |-- VercelAdapter.ts
|   |   |   |-- DockerComposeAdapter.ts
|   |   |   +-- NullDeployAdapter.ts
|   |   +-- __tests__/
|   |-- sandbox/
|   |   |-- ISandboxProvider.ts
|   |   |-- adapters/
|   |   |   |-- DockerSandboxAdapter.ts
|   |   |   |-- LocalProcessAdapter.ts
|   |   |   +-- E2BSandboxAdapter.ts
|   |   +-- __tests__/
|   +-- __mocks__/
|       |-- MockLLMProvider.ts
|       |-- MockDatabaseProvider.ts
|       +-- MockQueueProvider.ts
|-- entities/                          # DB-agnostic entity definitions
|   |-- ExecutionPlan.ts
|   |-- ContextEntry.ts
|   |-- AgentExecution.ts
|   |-- AgentProfile.ts
|   +-- WorkerPoolConfig.ts
|-- security/                          # Security module
|   |-- credentialManager.ts
|   |-- inputSanitizer.ts
|   |-- costGuard.ts
|   +-- auditLogger.ts
|-- config/
|   |-- vibeConfig.ts
|   |-- presets.ts
|   +-- configLoader.ts
|-- agents/
|   |-- protocol.ts
|   |-- registry.ts
|   |-- base/
|   |   +-- BaseAgent.ts
|   |-- architect/ coder/ reviewer/ devops/ tester/ analyst/ doc/ fixer/
|   +-- mocks/
|-- orchestrator/
|   |-- orchestrator.ts
|   |-- planner.ts
|   |-- scheduler.ts
|   |-- resultEvaluator.ts
|   |-- contextManager.ts
|   |-- contextCompiler.ts
|   |-- modelRouter.ts
|   +-- types.ts
|-- optimization/
|   |-- promptCompiler.ts
|   |-- earlyTermination.ts
|   +-- costTracker.ts
|-- modules/                           # EXISTING modules (preserved)
|   |-- auth/
|   |-- users/
|   |-- projects/
|   |-- plans/
|   |-- execution/
|   |-- llm/
|   |-- git/
|   |-- quality-gates/
|   |-- manual-tasks/
|   |-- recommendations/
|   |-- documentation/
|   |-- setup/
|   |-- error-handling/
|   |-- security/
|   |-- billing/
|   |-- teams/
|   |-- events/
|   +-- config/
+-- __tests__/
    |-- conformance/
    +-- e2e/
```

---

## Appendix B: Environment Variables

```bash
# Provider Selection
VIBE_LLM_PROVIDER=anthropic
VIBE_DATABASE_PROVIDER=sqlite
VIBE_QUEUE_PROVIDER=in-memory
VIBE_CACHE_PROVIDER=in-memory
VIBE_VCS_PROVIDER=local-git
VIBE_DEPLOY_PROVIDER=none
VIBE_SANDBOX_PROVIDER=local-process

# Provider Credentials (only for chosen providers)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
GITHUB_TOKEN=ghp_...

# Security
VIBE_SECRET_KEY=...
VIBE_AUDIT_LOG_LEVEL=standard

# Cost Controls
VIBE_MAX_COST_PER_PIPELINE=5.00
VIBE_MAX_COST_PER_DAY=50.00
VIBE_MAX_TOKENS_PER_TASK=50000
```

---

## Appendix C: Provider Adapter Compliance Checklist

Every new adapter MUST:

- [ ] Implement the full interface (no NotImplementedError stubs)
- [ ] Pass the conformance test suite for its provider type
- [ ] Handle connection failures gracefully (return unhealthy, don't throw)
- [ ] Support `initialize()` / `shutdown()` lifecycle
- [ ] Log all external calls at debug level
- [ ] Never store credentials in logs or error messages
- [ ] Support timeout configuration
- [ ] Work on Windows, macOS, and Linux
- [ ] Include README in adapter directory with setup instructions

---

**END OF SPECIFICATION v2.1**

**Implementation order: Phase 0 is MANDATORY before any other phase. The provider interfaces ARE the architecture.**
