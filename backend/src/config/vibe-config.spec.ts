import { loadVibeConfig, VIBE_CONFIG_KEY } from './vibe-config';
import { LOCAL_PRESET, CLOUD_ANTHROPIC_PRESET } from './presets';
import {
  LLM_DEFAULTS,
  AUTH_DEFAULTS,
  QUALITY_GATE_DEFAULTS,
  ENCRYPTION_DEFAULTS,
} from './defaults';

describe('VibeConfig', () => {
  describe('loadVibeConfig', () => {
    it('should return a config with all defaults applied', () => {
      const config = loadVibeConfig();
      expect(config).toBeDefined();
      expect(config.llm.anthropic.planModel).toBe(
        LLM_DEFAULTS.anthropic.planModel,
      );
      expect(config.llm.openai.planModel).toBe(LLM_DEFAULTS.openai.planModel);
      expect(config.llm.gemini.planModel).toBe(LLM_DEFAULTS.gemini.planModel);
      expect(config.auth.bcryptSaltRounds).toBe(AUTH_DEFAULTS.bcryptSaltRounds);
      expect(config.qualityGates.lint.minScore).toBe(
        QUALITY_GATE_DEFAULTS.lint.minScore,
      );
      expect(config.encryption.algorithm).toBe(ENCRYPTION_DEFAULTS.algorithm);
    });
  });

  describe('VIBE_CONFIG_KEY', () => {
    it('should be "vibe"', () => {
      expect(VIBE_CONFIG_KEY).toBe('vibe');
    });
  });

  describe('presets', () => {
    it('LOCAL_PRESET should match defaults', () => {
      expect(LOCAL_PRESET.auth.bcryptSaltRounds).toBe(
        AUTH_DEFAULTS.bcryptSaltRounds,
      );
      expect(LOCAL_PRESET.qualityGates.security.minScore).toBe(
        QUALITY_GATE_DEFAULTS.security.minScore,
      );
    });

    it('CLOUD_ANTHROPIC_PRESET should use claude-sonnet model', () => {
      expect(CLOUD_ANTHROPIC_PRESET.llm.anthropic.planModel).toBe(
        'claude-sonnet-4-20250514',
      );
    });
  });
});
