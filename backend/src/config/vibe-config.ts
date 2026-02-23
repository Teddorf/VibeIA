import { z } from 'zod';
import {
  LLM_DEFAULTS,
  AUTH_DEFAULTS,
  QUALITY_GATE_DEFAULTS,
  ENCRYPTION_DEFAULTS,
  SECURITY_DEFAULTS,
} from './defaults';

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const AnthropicConfigSchema = z.object({
  planModel: z.string().default(LLM_DEFAULTS.anthropic.planModel),
  validationModel: z.string().default(LLM_DEFAULTS.anthropic.validationModel),
  maxTokensPlan: z.number().default(LLM_DEFAULTS.anthropic.maxTokensPlan),
});

const OpenAIConfigSchema = z.object({
  planModel: z.string().default(LLM_DEFAULTS.openai.planModel),
  validationModel: z.string().default(LLM_DEFAULTS.openai.validationModel),
  maxTokensPlan: z.number().default(LLM_DEFAULTS.openai.maxTokensPlan),
});

const GeminiConfigSchema = z.object({
  planModel: z.string().default(LLM_DEFAULTS.gemini.planModel),
  fallbackModel: z.string().default(LLM_DEFAULTS.gemini.fallbackModel),
  maxOutputTokens: z.number().default(LLM_DEFAULTS.gemini.maxOutputTokens),
});

const LLMConfigSchema = z.object({
  anthropic: AnthropicConfigSchema.default(() =>
    AnthropicConfigSchema.parse({}),
  ),
  openai: OpenAIConfigSchema.default(() => OpenAIConfigSchema.parse({})),
  gemini: GeminiConfigSchema.default(() => GeminiConfigSchema.parse({})),
});

const AuthConfigSchema = z.object({
  bcryptSaltRounds: z.number().default(AUTH_DEFAULTS.bcryptSaltRounds),
  accessTokenExpiry: z.string().default(AUTH_DEFAULTS.accessTokenExpiry),
  refreshTokenExpiry: z.string().default(AUTH_DEFAULTS.refreshTokenExpiry),
});

const QualityGateItemSchema = (minScore: number) =>
  z.object({ minScore: z.number().default(minScore) });

const QualityGatesConfigSchema = z.object({
  lint: QualityGateItemSchema(QUALITY_GATE_DEFAULTS.lint.minScore).default(
    () => ({ minScore: QUALITY_GATE_DEFAULTS.lint.minScore }),
  ),
  security: QualityGateItemSchema(
    QUALITY_GATE_DEFAULTS.security.minScore,
  ).default(() => ({ minScore: QUALITY_GATE_DEFAULTS.security.minScore })),
  test: QualityGateItemSchema(QUALITY_GATE_DEFAULTS.test.minScore).default(
    () => ({ minScore: QUALITY_GATE_DEFAULTS.test.minScore }),
  ),
  coverage: QualityGateItemSchema(
    QUALITY_GATE_DEFAULTS.coverage.minScore,
  ).default(() => ({ minScore: QUALITY_GATE_DEFAULTS.coverage.minScore })),
});

const EncryptionConfigSchema = z.object({
  algorithm: z.string().default(ENCRYPTION_DEFAULTS.algorithm),
  keyLength: z.number().default(ENCRYPTION_DEFAULTS.keyLength),
  ivLength: z.number().default(ENCRYPTION_DEFAULTS.ivLength),
});

// ─── SPEC v2.2 Sections ─────────────────────────────────────────────────────

const ModelMappingSchema = z.object({
  fast: z.string().default(LLM_DEFAULTS.gemini.planModel),
  balanced: z.string().default(LLM_DEFAULTS.openai.planModel),
  powerful: z.string().default(LLM_DEFAULTS.anthropic.planModel),
});

const ProvidersConfigSchema = z.object({
  llm: z
    .object({
      modelMapping: ModelMappingSchema.default(() =>
        ModelMappingSchema.parse({}),
      ),
      fallbackOrder: z
        .array(z.string())
        .default(['anthropic', 'openai', 'gemini']),
    })
    .default(() => ({
      modelMapping: ModelMappingSchema.parse({}),
      fallbackOrder: ['anthropic', 'openai', 'gemini'],
    })),
});

const SecurityConfigSchema = z.object({
  costLimits: z
    .object({
      maxCostPerPipeline: z.number().default(10.0),
      maxCostPerDay: z.number().default(50.0),
    })
    .default(() => ({
      maxCostPerPipeline: 10.0,
      maxCostPerDay: 50.0,
    })),
});

const WorkersConfigSchema = z.object({
  maxPerAgent: z.number().default(2),
  totalMax: z.number().default(10),
  contextAffinityEnabled: z.boolean().default(true),
});

const ObservabilityConfigSchema = z.object({
  logFormat: z.enum(['json', 'text']).default('text'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const LLMRateLimitsSchema = z.object({
  requestsPerMinute: z
    .number()
    .default(SECURITY_DEFAULTS.rateLimits.llm.maxRequests),
  tokensPerMinute: z.number().default(100000),
});

const RateLimitsConfigSchema = z.object({
  global: z
    .object({
      windowMs: z
        .number()
        .default(SECURITY_DEFAULTS.rateLimits.global.windowMs),
      maxRequests: z
        .number()
        .default(SECURITY_DEFAULTS.rateLimits.global.maxRequests),
    })
    .default(() => ({
      windowMs: SECURITY_DEFAULTS.rateLimits.global.windowMs,
      maxRequests: SECURITY_DEFAULTS.rateLimits.global.maxRequests,
    })),
  auth: z
    .object({
      windowMs: z.number().default(SECURITY_DEFAULTS.rateLimits.auth.windowMs),
      maxRequests: z
        .number()
        .default(SECURITY_DEFAULTS.rateLimits.auth.maxRequests),
    })
    .default(() => ({
      windowMs: SECURITY_DEFAULTS.rateLimits.auth.windowMs,
      maxRequests: SECURITY_DEFAULTS.rateLimits.auth.maxRequests,
    })),
  llm: LLMRateLimitsSchema.default(() => LLMRateLimitsSchema.parse({})),
});

const TaskDefaultsConfigSchema = z.object({
  timeoutMs: z.number().default(30000),
  costBudgetUSD: z.number().default(10.0),
  tokenBudget: z.number().default(4096),
  contextCacheTtlMs: z.number().default(5 * 60 * 1000),
  decisionCacheTtlMs: z.number().default(10 * 60 * 1000),
  reviewRequiredForTypes: z
    .array(z.string())
    .default(['code-generation', 'refactor']),
});

// ─── Combined Schema ─────────────────────────────────────────────────────────

const VibeConfigSchema = z.object({
  llm: LLMConfigSchema.default(() => LLMConfigSchema.parse({})),
  auth: AuthConfigSchema.default(() => AuthConfigSchema.parse({})),
  qualityGates: QualityGatesConfigSchema.default(() =>
    QualityGatesConfigSchema.parse({}),
  ),
  encryption: EncryptionConfigSchema.default(() =>
    EncryptionConfigSchema.parse({}),
  ),
  providers: ProvidersConfigSchema.default(() =>
    ProvidersConfigSchema.parse({}),
  ),
  security: SecurityConfigSchema.default(() => SecurityConfigSchema.parse({})),
  workers: WorkersConfigSchema.default(() => WorkersConfigSchema.parse({})),
  observability: ObservabilityConfigSchema.default(() =>
    ObservabilityConfigSchema.parse({}),
  ),
  rateLimits: RateLimitsConfigSchema.default(() =>
    RateLimitsConfigSchema.parse({}),
  ),
  taskDefaults: TaskDefaultsConfigSchema.default(() =>
    TaskDefaultsConfigSchema.parse({}),
  ),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type VibeConfig = z.infer<typeof VibeConfigSchema>;

// ─── Config Key ──────────────────────────────────────────────────────────────

export const VIBE_CONFIG_KEY = 'vibe';

// ─── Loader ──────────────────────────────────────────────────────────────────

/**
 * Load and validate the VibeConfig from environment.
 * Returns a fully resolved config with defaults applied.
 */
export function loadVibeConfig(): VibeConfig {
  return VibeConfigSchema.parse({});
}
