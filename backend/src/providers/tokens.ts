/**
 * DI injection tokens for provider interfaces.
 * Use these Symbols with @Inject() in NestJS.
 */
export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
export const DATABASE_PROVIDER = Symbol('DATABASE_PROVIDER');
export const QUEUE_PROVIDER = Symbol('QUEUE_PROVIDER');
export const CACHE_PROVIDER = Symbol('CACHE_PROVIDER');
export const VCS_PROVIDER = Symbol('VCS_PROVIDER');
export const DEPLOY_PROVIDER = Symbol('DEPLOY_PROVIDER');
export const SANDBOX_PROVIDER = Symbol('SANDBOX_PROVIDER');
export const FILESYSTEM_PROVIDER = Symbol('FILESYSTEM_PROVIDER');
export const GIT_HOST_PROVIDER = Symbol('GIT_HOST_PROVIDER');
