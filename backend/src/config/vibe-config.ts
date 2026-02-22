import { z } from 'zod';
import {
  LLM_DEFAULTS,
  AUTH_DEFAULTS,
  QUALITY_GATE_DEFAULTS,
  ENCRYPTION_DEFAULTS,
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

const VibeConfigSchema = z.object({
  llm: LLMConfigSchema.default(() => LLMConfigSchema.parse({})),
  auth: AuthConfigSchema.default(() => AuthConfigSchema.parse({})),
  qualityGates: QualityGatesConfigSchema.default(() =>
    QualityGatesConfigSchema.parse({}),
  ),
  encryption: EncryptionConfigSchema.default(() =>
    EncryptionConfigSchema.parse({}),
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
