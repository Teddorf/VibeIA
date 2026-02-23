import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  QUEUE_PROVIDER,
  CACHE_PROVIDER,
  DEPLOY_PROVIDER,
  SANDBOX_PROVIDER,
  FILESYSTEM_PROVIDER,
  LLM_PROVIDER,
  VCS_PROVIDER,
  VIBE_CONFIG,
  LLM_FALLBACK_CHAIN,
} from './tokens';
import { VIBE_CONFIG_KEY, loadVibeConfig } from '../config/vibe-config';
import { LLMFallbackChainAdapter } from './adapters/llm-fallback-chain.adapter';
import { InMemoryQueueAdapter } from './adapters/in-memory-queue.adapter';
import { InMemoryCacheAdapter } from './adapters/in-memory-cache.adapter';
import { LocalProcessSandboxAdapter } from './adapters/local-process-sandbox.adapter';
import { LocalFileSystemAdapter } from './adapters/local-filesystem.adapter';
import { NullDeployAdapter } from './adapters/null-deploy.adapter';
import { AnthropicLLMAdapter } from './adapters/anthropic-llm.adapter';
import { OpenAILLMAdapter } from './adapters/openai-llm.adapter';
import { GeminiLLMAdapter } from './adapters/gemini-llm.adapter';
import { LocalGitVCSAdapter } from './adapters/local-git-vcs.adapter';

@Module({})
export class ProvidersModule {
  static forRoot(): DynamicModule {
    const providers = [
      { provide: QUEUE_PROVIDER, useClass: InMemoryQueueAdapter },
      { provide: CACHE_PROVIDER, useClass: InMemoryCacheAdapter },
      { provide: SANDBOX_PROVIDER, useClass: LocalProcessSandboxAdapter },
      { provide: FILESYSTEM_PROVIDER, useClass: LocalFileSystemAdapter },
      { provide: DEPLOY_PROVIDER, useClass: NullDeployAdapter },
      { provide: VCS_PROVIDER, useClass: LocalGitVCSAdapter },
      AnthropicLLMAdapter,
      OpenAILLMAdapter,
      GeminiLLMAdapter,
      {
        provide: LLM_PROVIDER,
        useFactory: (
          anthropic: AnthropicLLMAdapter,
          openai: OpenAILLMAdapter,
          gemini: GeminiLLMAdapter,
        ) => [anthropic, openai, gemini],
        inject: [AnthropicLLMAdapter, OpenAILLMAdapter, GeminiLLMAdapter],
      },
      LLMFallbackChainAdapter,
      {
        provide: LLM_FALLBACK_CHAIN,
        useExisting: LLMFallbackChainAdapter,
      },
      {
        provide: VIBE_CONFIG,
        useFactory: (config: ConfigService) => {
          const raw = config.get(VIBE_CONFIG_KEY);
          return raw ?? loadVibeConfig();
        },
        inject: [ConfigService],
      },
    ];

    return {
      module: ProvidersModule,
      global: true,
      providers,
      exports: [
        QUEUE_PROVIDER,
        CACHE_PROVIDER,
        SANDBOX_PROVIDER,
        FILESYSTEM_PROVIDER,
        DEPLOY_PROVIDER,
        VCS_PROVIDER,
        LLM_PROVIDER,
        AnthropicLLMAdapter,
        OpenAILLMAdapter,
        GeminiLLMAdapter,
        VIBE_CONFIG,
        LLM_FALLBACK_CHAIN,
      ],
    };
  }
}
