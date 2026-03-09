import { Injectable, Inject } from '@nestjs/common';
import { VIBE_CONFIG } from '../providers/tokens';
import { VibeConfig } from '../config/vibe-config';
import { ModelTier, ModelPricing } from '../agents/protocol';

@Injectable()
export class ModelRouter {
  constructor(@Inject(VIBE_CONFIG) private readonly config: VibeConfig) {}

  resolve(tier: ModelTier): string {
    return this.config.providers.llm.modelMapping[tier];
  }

  getMaxTokens(tier: ModelTier): number {
    switch (tier) {
      case 'fast':
        return this.config.llm.gemini.maxOutputTokens;
      case 'powerful':
        return this.config.llm.anthropic.maxTokensPlan;
      case 'balanced':
      default:
        return this.config.llm.openai.maxTokensPlan;
    }
  }

  getPricing(tier: ModelTier): ModelPricing {
    const pricing = this.config.providers.llm.pricing[tier];
    return {
      inputPerMillionTokens: pricing.inputPerMillionTokens,
      outputPerMillionTokens: pricing.outputPerMillionTokens,
    };
  }
}
