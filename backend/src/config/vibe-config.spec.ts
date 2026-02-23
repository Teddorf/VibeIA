import { loadVibeConfig, VIBE_CONFIG_KEY } from './vibe-config';
import { LOCAL_PRESET, CLOUD_ANTHROPIC_PRESET } from './presets';
import {
  LLM_DEFAULTS,
  AUTH_DEFAULTS,
  QUALITY_GATE_DEFAULTS,
  ENCRYPTION_DEFAULTS,
  SECURITY_DEFAULTS,
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

    it('should include providers section with model mapping', () => {
      const config = loadVibeConfig();
      expect(config.providers.llm.modelMapping.fast).toBe(
        LLM_DEFAULTS.gemini.planModel,
      );
      expect(config.providers.llm.modelMapping.balanced).toBe(
        LLM_DEFAULTS.openai.planModel,
      );
      expect(config.providers.llm.modelMapping.powerful).toBe(
        LLM_DEFAULTS.anthropic.planModel,
      );
      expect(config.providers.llm.fallbackOrder).toEqual([
        'anthropic',
        'openai',
        'gemini',
      ]);
    });

    it('should include security cost limits', () => {
      const config = loadVibeConfig();
      expect(config.security.costLimits.maxCostPerPipeline).toBe(10.0);
      expect(config.security.costLimits.maxCostPerDay).toBe(50.0);
    });

    it('should include workers config', () => {
      const config = loadVibeConfig();
      expect(config.workers.maxPerAgent).toBe(2);
      expect(config.workers.totalMax).toBe(10);
      expect(config.workers.contextAffinityEnabled).toBe(true);
    });

    it('should include observability config', () => {
      const config = loadVibeConfig();
      expect(config.observability.logFormat).toBe('text');
      expect(config.observability.logLevel).toBe('info');
    });

    it('should include rate limits config', () => {
      const config = loadVibeConfig();
      expect(config.rateLimits.global.maxRequests).toBe(
        SECURITY_DEFAULTS.rateLimits.global.maxRequests,
      );
      expect(config.rateLimits.llm.requestsPerMinute).toBe(
        SECURITY_DEFAULTS.rateLimits.llm.maxRequests,
      );
      expect(config.rateLimits.llm.tokensPerMinute).toBe(100000);
    });

    it('should include task defaults config', () => {
      const config = loadVibeConfig();
      expect(config.taskDefaults.timeoutMs).toBe(30000);
      expect(config.taskDefaults.costBudgetUSD).toBe(10.0);
      expect(config.taskDefaults.tokenBudget).toBe(4096);
      expect(config.taskDefaults.contextCacheTtlMs).toBe(5 * 60 * 1000);
      expect(config.taskDefaults.decisionCacheTtlMs).toBe(10 * 60 * 1000);
      expect(config.taskDefaults.reviewRequiredForTypes).toEqual([
        'code-generation',
        'refactor',
      ]);
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

    it('LOCAL_PRESET should include SPEC v2.2 sections', () => {
      expect(LOCAL_PRESET.providers).toBeDefined();
      expect(LOCAL_PRESET.security).toBeDefined();
      expect(LOCAL_PRESET.workers).toBeDefined();
      expect(LOCAL_PRESET.observability).toBeDefined();
      expect(LOCAL_PRESET.rateLimits).toBeDefined();
      expect(LOCAL_PRESET.taskDefaults).toBeDefined();
    });
  });
});
