import { Test, TestingModule } from '@nestjs/testing';
import { ModelRouter } from './model-router';
import { LLM_DEFAULTS } from '../config/defaults';
import { VIBE_CONFIG } from '../providers/tokens';
import { loadVibeConfig } from '../config/vibe-config';

describe('ModelRouter', () => {
  let router: ModelRouter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelRouter,
        { provide: VIBE_CONFIG, useValue: loadVibeConfig() },
      ],
    }).compile();

    router = module.get(ModelRouter);
  });

  describe('resolve', () => {
    it('should return gemini model for fast tier', () => {
      expect(router.resolve('fast')).toBe(LLM_DEFAULTS.gemini.planModel);
    });

    it('should return anthropic model for powerful tier', () => {
      expect(router.resolve('powerful')).toBe(LLM_DEFAULTS.anthropic.planModel);
    });

    it('should return openai model for balanced tier', () => {
      expect(router.resolve('balanced')).toBe(LLM_DEFAULTS.openai.planModel);
    });
  });

  describe('getMaxTokens', () => {
    it('should return max tokens for each tier', () => {
      expect(router.getMaxTokens('fast')).toBe(
        LLM_DEFAULTS.gemini.maxOutputTokens,
      );
      expect(router.getMaxTokens('powerful')).toBe(
        LLM_DEFAULTS.anthropic.maxTokensPlan,
      );
      expect(router.getMaxTokens('balanced')).toBe(
        LLM_DEFAULTS.openai.maxTokensPlan,
      );
    });
  });

  describe('getPricing', () => {
    it('should return pricing for each tier with new field names', () => {
      const fast = router.getPricing('fast');
      expect(fast.inputPerMillionTokens).toBe(
        LLM_DEFAULTS.gemini.pricing.inputPerMillion,
      );

      const powerful = router.getPricing('powerful');
      expect(powerful.inputPerMillionTokens).toBe(
        LLM_DEFAULTS.anthropic.pricing.inputPerMillion,
      );

      const balanced = router.getPricing('balanced');
      expect(balanced.inputPerMillionTokens).toBe(
        LLM_DEFAULTS.openai.pricing.inputPerMillion,
      );
    });
  });
});
