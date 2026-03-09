import { loadVibeConfig, type VibeConfig } from './vibe-config';
import { LLM_DEFAULTS } from './defaults';

/**
 * Preset for local development — no cloud services required.
 * Uses loadVibeConfig() to get all defaults, ensuring presets always match schema.
 */
export const LOCAL_PRESET: VibeConfig = loadVibeConfig();

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
