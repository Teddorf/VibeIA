/**
 * SPEC v2.2 Compliance Verification
 * Ensures all required interfaces, tokens, types exist and are correctly shaped.
 */

// ─── Import verification ────────────────────────────────────────────────────
import {
  IProvider,
  ProviderType,
  ProviderConfig,
  HealthStatus,
} from '../provider.interface';

import {
  ILLMProvider,
  LLMRequest,
  LLMResponse,
  LLMStreamChunk,
  TokenUsage,
  ModelInfo,
  ModelPricingSpec,
  LLMCapability,
  LLMMessage,
  LLMContentBlock,
} from '../llm-provider.interface';

import { ILLMFallbackChain } from '../llm-fallback-chain.interface';

import {
  IRepository,
  FindOptions,
  QueryFilter,
  QueryOptions,
} from '../database-provider.interface';

import { ICacheProvider } from '../cache-provider.interface';

import { IQueueProvider, IQueue } from '../queue-provider.interface';

import {
  IFileSystemProvider,
  FileMetadata,
} from '../filesystem-provider.interface';

import {
  ISandboxProvider,
  ISandbox,
  ISandboxExecResult,
  SandboxConfig,
} from '../sandbox-provider.interface';

import { IVCSProvider } from '../vcs-provider.interface';

import { IExecutionPlanRepository } from '../execution-plan-repository.interface';

import { IAgentContextRepository } from '../agent-context-repository.interface';

import {
  IAgentExecutionRepository,
  PipelineMetrics,
} from '../agent-execution-repository.interface';

import {
  LLM_PROVIDER,
  LLM_FALLBACK_CHAIN,
  VIBE_CONFIG,
  CACHE_PROVIDER,
  QUEUE_PROVIDER,
  DATABASE_PROVIDER,
  VCS_PROVIDER,
  DEPLOY_PROVIDER,
  SANDBOX_PROVIDER,
  FILESYSTEM_PROVIDER,
} from '../../tokens';

import {
  CompiledContext,
  AgentOutput,
  ModelPricing,
  ContextUpdateOperation,
  IAgent,
  ValidationError,
  CostEstimate,
  AgentInput,
} from '../../../agents/protocol';

describe('SPEC v2.2 Compliance', () => {
  describe('Provider Interfaces', () => {
    it('IProvider base interface should have required methods', () => {
      const methods: (keyof IProvider)[] = [
        'providerId',
        'providerType',
        'initialize',
        'healthCheck',
        'shutdown',
      ];
      // Type-level check: if this compiles, the interface has the members
      expect(methods).toHaveLength(5);
    });

    it('ILLMProvider should have SPEC v2.2 methods', () => {
      const specMethods: (keyof ILLMProvider)[] = [
        'complete',
        'stream',
        'listModels',
        'getModelPricing',
        'supportsCapability',
      ];
      expect(specMethods).toHaveLength(5);
    });

    it('ILLMProvider should retain legacy methods', () => {
      const legacyMethods: (keyof ILLMProvider)[] = [
        'generateText',
        'generateJSON',
        'validateApiKey',
        'estimateCost',
      ];
      expect(legacyMethods).toHaveLength(4);
    });

    it('ILLMFallbackChain should have required members', () => {
      const members: (keyof ILLMFallbackChain)[] = [
        'providers',
        'complete',
        'stream',
        'addProvider',
        'removeProvider',
        'getActiveProvider',
      ];
      expect(members).toHaveLength(6);
    });
  });

  describe('Repository Interfaces', () => {
    it('IRepository should have SPEC alias methods', () => {
      const aliasMethods: (keyof IRepository<any>)[] = [
        'findMany',
        'createMany',
        'exists',
      ];
      expect(aliasMethods).toHaveLength(3);
    });

    it('IExecutionPlanRepository should have specialized methods', () => {
      const methods: (keyof IExecutionPlanRepository)[] = [
        'findByProjectAndStatus',
        'updateNodeStatus',
        'getReadyNodes',
      ];
      expect(methods).toHaveLength(3);
    });

    it('IAgentContextRepository should have specialized methods', () => {
      const methods: (keyof IAgentContextRepository)[] = [
        'findByProjectAndTags',
        'findByProjectAndType',
        'invalidateByPipeline',
        'compileForAgent',
      ];
      expect(methods).toHaveLength(4);
    });

    it('IAgentExecutionRepository should have specialized methods', () => {
      const methods: (keyof IAgentExecutionRepository)[] = [
        'getMetricsForPipeline',
        'getCostForProject',
      ];
      expect(methods).toHaveLength(2);
    });
  });

  describe('Cache & Queue Interfaces', () => {
    it('ICacheProvider should have SPEC alias methods', () => {
      const methods: (keyof ICacheProvider)[] = [
        'delete',
        'flush',
        'deletePattern',
      ];
      expect(methods).toHaveLength(3);
    });

    it('IQueue should have SPEC methods', () => {
      const methods: (keyof IQueue<any>)[] = [
        'enqueue',
        'setConcurrency',
        'getDepth',
        'getActiveCount',
        'pause',
        'resume',
        'drain',
      ];
      expect(methods).toHaveLength(7);
    });
  });

  describe('FileSystem & Sandbox Interfaces', () => {
    it('IFileSystemProvider should have SPEC methods', () => {
      const methods: (keyof IFileSystemProvider)[] = [
        'deleteFile',
        'readDir',
        'createDir',
        'deleteDir',
        'copy',
        'move',
        'getMetadata',
        'glob',
      ];
      expect(methods).toHaveLength(8);
    });

    it('ISandbox should have id and listFiles', () => {
      const members: (keyof ISandbox)[] = ['id', 'listFiles'];
      expect(members).toHaveLength(2);
    });

    it('ISandboxExecResult should have durationMs', () => {
      const result: ISandboxExecResult = {
        stdout: '',
        stderr: '',
        exitCode: 0,
        durationMs: 100,
      };
      expect(result.durationMs).toBe(100);
    });
  });

  describe('DI Tokens', () => {
    it('LLM_FALLBACK_CHAIN token should exist', () => {
      expect(LLM_FALLBACK_CHAIN).toBeDefined();
      expect(typeof LLM_FALLBACK_CHAIN).toBe('symbol');
    });

    it('VIBE_CONFIG token should exist', () => {
      expect(VIBE_CONFIG).toBeDefined();
      expect(typeof VIBE_CONFIG).toBe('symbol');
    });

    it('all provider tokens should exist', () => {
      expect(LLM_PROVIDER).toBeDefined();
      expect(CACHE_PROVIDER).toBeDefined();
      expect(QUEUE_PROVIDER).toBeDefined();
      expect(DATABASE_PROVIDER).toBeDefined();
      expect(VCS_PROVIDER).toBeDefined();
      expect(DEPLOY_PROVIDER).toBeDefined();
      expect(SANDBOX_PROVIDER).toBeDefined();
      expect(FILESYSTEM_PROVIDER).toBeDefined();
    });
  });

  describe('Protocol Types', () => {
    it('CompiledContext.scope should be object with entry arrays', () => {
      const scope: CompiledContext['scope'] = {
        global: [],
        domainSpecific: [],
        taskSpecific: [],
      };
      expect(scope).toHaveProperty('global');
      expect(scope).toHaveProperty('domainSpecific');
      expect(scope).toHaveProperty('taskSpecific');
      expect(Array.isArray(scope.global)).toBe(true);
    });

    it('AgentOutput.status should allow needs-review', () => {
      const output: Pick<AgentOutput, 'status'> = { status: 'needs-review' };
      expect(output.status).toBe('needs-review');
    });

    it('ModelPricing should have inputPerMillionTokens', () => {
      const pricing: ModelPricing = {
        inputPerMillionTokens: 3.0,
        outputPerMillionTokens: 15.0,
      };
      expect(pricing.inputPerMillionTokens).toBe(3.0);
      expect(pricing.outputPerMillionTokens).toBe(15.0);
    });

    it('ContextUpdateOperation should include supersede', () => {
      const op: ContextUpdateOperation = 'supersede';
      expect(op).toBe('supersede');
    });

    it('IAgent.validateInput should return ValidationError[] | null', () => {
      // Type-level check: null is assignable
      const result: ReturnType<IAgent['validateInput']> = null;
      expect(result).toBeNull();
    });

    it('IAgent.estimateCost should accept AgentInput', () => {
      // Type-level check — verifying the signature compiles
      type EstimateCostParam = Parameters<IAgent['estimateCost']>[0];
      const check: EstimateCostParam extends AgentInput ? true : false = true;
      expect(check).toBe(true);
    });
  });

  describe('SPEC v2.2 Type Shapes', () => {
    it('LLMRequest should have required fields', () => {
      const request: LLMRequest = {
        messages: [{ role: 'user', content: 'test' }],
        model: 'test',
        maxTokens: 100,
      };
      expect(request.messages).toHaveLength(1);
    });

    it('LLMResponse should have required fields', () => {
      const response: LLMResponse = {
        content: 'test',
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          cachedTokens: 0,
          totalTokens: 15,
        },
        model: 'test',
        finishReason: 'stop',
        latencyMs: 100,
        cached: false,
        providerId: 'test',
      };
      expect(response.providerId).toBe('test');
    });

    it('TokenUsage should have cachedTokens', () => {
      const usage: TokenUsage = {
        inputTokens: 10,
        outputTokens: 5,
        cachedTokens: 3,
        totalTokens: 18,
      };
      expect(usage.cachedTokens).toBe(3);
    });

    it('PipelineMetrics should have required fields', () => {
      const metrics: PipelineMetrics = {
        totalExecutions: 10,
        completedExecutions: 8,
        failedExecutions: 2,
        totalCostUSD: 1.5,
        totalTokensUsed: 5000,
        averageDurationMs: 200,
      };
      expect(metrics.totalExecutions).toBe(10);
    });

    it('SandboxConfig should have optional fields', () => {
      const config: SandboxConfig = {};
      expect(config).toBeDefined();
      const full: SandboxConfig = {
        image: 'node:18',
        memoryMb: 512,
        cpus: 2,
        timeoutMs: 30000,
        env: { NODE_ENV: 'test' },
        workDir: '/tmp',
      };
      expect(full.image).toBe('node:18');
    });

    it('FileMetadata should have required fields', () => {
      const meta: FileMetadata = {
        size: 100,
        isDirectory: false,
        isFile: true,
        modifiedAt: new Date(),
        createdAt: new Date(),
      };
      expect(meta.isFile).toBe(true);
    });
  });
});
