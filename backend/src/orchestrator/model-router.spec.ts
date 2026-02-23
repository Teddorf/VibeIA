import { Test, TestingModule } from '@nestjs/testing';
import { ModelRouter } from './model-router';
import { VIBE_CONFIG } from '../providers/tokens';
import { loadVibeConfig, VibeConfig } from '../config/vibe-config';

describe('ModelRouter', () => {
  let router: ModelRouter;
  let config: VibeConfig;

  beforeEach(async () => {
    config = loadVibeConfig();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ModelRouter, { provide: VIBE_CONFIG, useValue: config }],
    }).compile();

    router = module.get(ModelRouter);
  });

  describe('resolve', () => {
    it('should return gemini model for fast tier', () => {
      expect(router.resolve('fast')).toBe(
        config.providers.llm.modelMapping.fast,
      );
    });

    it('should return anthropic model for powerful tier', () => {
      expect(router.resolve('powerful')).toBe(
        config.providers.llm.modelMapping.powerful,
      );
    });

    it('should return openai model for balanced tier', () => {
      expect(router.resolve('balanced')).toBe(
        config.providers.llm.modelMapping.balanced,
      );
    });
  });

  describe('getMaxTokens', () => {
    it('should return max tokens for each tier', () => {
      expect(router.getMaxTokens('fast')).toBe(
        config.llm.gemini.maxOutputTokens,
      );
      expect(router.getMaxTokens('powerful')).toBe(
        config.llm.anthropic.maxTokensPlan,
      );
      expect(router.getMaxTokens('balanced')).toBe(
        config.llm.openai.maxTokensPlan,
      );
    });
  });

  describe('getPricing', () => {
    it('should return pricing for each tier with new field names', () => {
      const fast = router.getPricing('fast');
      expect(fast.inputPerMillionTokens).toBe(
        config.providers.llm.pricing.fast.inputPerMillionTokens,
      );

      const powerful = router.getPricing('powerful');
      expect(powerful.inputPerMillionTokens).toBe(
        config.providers.llm.pricing.powerful.inputPerMillionTokens,
      );

      const balanced = router.getPricing('balanced');
      expect(balanced.inputPerMillionTokens).toBe(
        config.providers.llm.pricing.balanced.inputPerMillionTokens,
      );
    });
  });
});
