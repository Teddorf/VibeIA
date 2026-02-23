import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LLM_DEFAULTS } from '../config/defaults';
import { VIBE_CONFIG_KEY } from '../config/vibe-config';
import { ModelTier, ModelPricing } from '../agents/protocol';

@Injectable()
export class ModelRouter {
  constructor(private readonly configService: ConfigService) {}

  resolve(tier: ModelTier): string {
    const llmConfig = this.configService.get(`${VIBE_CONFIG_KEY}.llm`);

    switch (tier) {
      case 'fast':
        return llmConfig?.gemini?.planModel ?? LLM_DEFAULTS.gemini.planModel;
      case 'powerful':
        return (
          llmConfig?.anthropic?.planModel ?? LLM_DEFAULTS.anthropic.planModel
        );
      case 'balanced':
      default:
        return llmConfig?.openai?.planModel ?? LLM_DEFAULTS.openai.planModel;
    }
  }

  getMaxTokens(tier: ModelTier): number {
    const llmConfig = this.configService.get(`${VIBE_CONFIG_KEY}.llm`);

    switch (tier) {
      case 'fast':
        return (
          llmConfig?.gemini?.maxOutputTokens ??
          LLM_DEFAULTS.gemini.maxOutputTokens
        );
      case 'powerful':
        return (
          llmConfig?.anthropic?.maxTokensPlan ??
          LLM_DEFAULTS.anthropic.maxTokensPlan
        );
      case 'balanced':
      default:
        return (
          llmConfig?.openai?.maxTokensPlan ?? LLM_DEFAULTS.openai.maxTokensPlan
        );
    }
  }

  getPricing(tier: ModelTier): ModelPricing {
    switch (tier) {
      case 'fast':
        return {
          inputPerMillion: LLM_DEFAULTS.gemini.pricing.inputPerMillion,
          outputPerMillion: LLM_DEFAULTS.gemini.pricing.outputPerMillion,
        };
      case 'powerful':
        return {
          inputPerMillion: LLM_DEFAULTS.anthropic.pricing.inputPerMillion,
          outputPerMillion: LLM_DEFAULTS.anthropic.pricing.outputPerMillion,
        };
      case 'balanced':
      default:
        return {
          inputPerMillion: LLM_DEFAULTS.openai.pricing.inputPerMillion,
          outputPerMillion: LLM_DEFAULTS.openai.pricing.outputPerMillion,
        };
    }
  }
}
