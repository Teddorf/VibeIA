import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ModelRouter } from './model-router';
import { LLM_DEFAULTS } from '../config/defaults';

describe('ModelRouter', () => {
  let router: ModelRouter;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = { get: jest.fn().mockReturnValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModelRouter,
        { provide: ConfigService, useValue: configService },
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

    it('should use config override when available', () => {
      configService.get.mockReturnValue({
        gemini: { planModel: 'custom-gemini' },
      });
      expect(router.resolve('fast')).toBe('custom-gemini');
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
