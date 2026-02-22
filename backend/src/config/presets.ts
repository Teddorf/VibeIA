import type { VibeConfig } from './vibe-config';
import {
  LLM_DEFAULTS,
  AUTH_DEFAULTS,
  QUALITY_GATE_DEFAULTS,
  ENCRYPTION_DEFAULTS,
} from './defaults';

/**
 * Preset for local development — no cloud services required.
 */
export const LOCAL_PRESET: VibeConfig = {
  llm: {
    anthropic: {
      planModel: LLM_DEFAULTS.anthropic.planModel,
      validationModel: LLM_DEFAULTS.anthropic.validationModel,
      maxTokensPlan: LLM_DEFAULTS.anthropic.maxTokensPlan,
    },
    openai: {
      planModel: LLM_DEFAULTS.openai.planModel,
      validationModel: LLM_DEFAULTS.openai.validationModel,
      maxTokensPlan: LLM_DEFAULTS.openai.maxTokensPlan,
    },
    gemini: {
      planModel: LLM_DEFAULTS.gemini.planModel,
      fallbackModel: LLM_DEFAULTS.gemini.fallbackModel,
      maxOutputTokens: LLM_DEFAULTS.gemini.maxOutputTokens,
    },
  },
  auth: {
    bcryptSaltRounds: AUTH_DEFAULTS.bcryptSaltRounds,
    accessTokenExpiry: AUTH_DEFAULTS.accessTokenExpiry,
    refreshTokenExpiry: AUTH_DEFAULTS.refreshTokenExpiry,
  },
  qualityGates: {
    lint: { minScore: QUALITY_GATE_DEFAULTS.lint.minScore },
    security: { minScore: QUALITY_GATE_DEFAULTS.security.minScore },
    test: { minScore: QUALITY_GATE_DEFAULTS.test.minScore },
    coverage: { minScore: QUALITY_GATE_DEFAULTS.coverage.minScore },
  },
  encryption: {
    algorithm: ENCRYPTION_DEFAULTS.algorithm,
    keyLength: ENCRYPTION_DEFAULTS.keyLength,
    ivLength: ENCRYPTION_DEFAULTS.ivLength,
  },
};

/**
 * Preset for cloud deployment with Anthropic as primary LLM.
 */
export const CLOUD_ANTHROPIC_PRESET: VibeConfig = {
  ...LOCAL_PRESET,
  llm: {
    ...LOCAL_PRESET.llm,
    anthropic: {
      ...LOCAL_PRESET.llm.anthropic,
      planModel: 'claude-sonnet-4-20250514',
    },
  },
};
