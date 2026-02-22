import { DynamicModule, Module } from '@nestjs/common';
import {
  QUEUE_PROVIDER,
  CACHE_PROVIDER,
  DEPLOY_PROVIDER,
  SANDBOX_PROVIDER,
  FILESYSTEM_PROVIDER,
} from './tokens';
import { InMemoryQueueAdapter } from './adapters/in-memory-queue.adapter';
import { InMemoryCacheAdapter } from './adapters/in-memory-cache.adapter';
import { LocalProcessSandboxAdapter } from './adapters/local-process-sandbox.adapter';
import { LocalFileSystemAdapter } from './adapters/local-filesystem.adapter';
import { NullDeployAdapter } from './adapters/null-deploy.adapter';

@Module({})
export class ProvidersModule {
  static forRoot(): DynamicModule {
    const providers = [
      { provide: QUEUE_PROVIDER, useClass: InMemoryQueueAdapter },
      { provide: CACHE_PROVIDER, useClass: InMemoryCacheAdapter },
      { provide: SANDBOX_PROVIDER, useClass: LocalProcessSandboxAdapter },
      { provide: FILESYSTEM_PROVIDER, useClass: LocalFileSystemAdapter },
      { provide: DEPLOY_PROVIDER, useClass: NullDeployAdapter },
    ];

    return {
      module: ProvidersModule,
      global: true,
      providers,
      exports: providers.map((p) => p.provide),
    };
  }
}
