import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { AnthropicProvider } from './providers/anthropic.provider';
import { OpenAIProvider } from './providers/openai.provider';
import { GeminiProvider } from './providers/gemini.provider';
import { LLMProvider, LLMResponse, UserLLMConfig } from './interfaces/llm-provider.interface';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);
  private providers: Map<string, LLMProvider>;

  constructor() {
    this.providers = new Map();
    this.providers.set('anthropic', new AnthropicProvider());
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('gemini', new GeminiProvider());
  }

  /**
   * Generate a plan using the user's configured LLM providers
   */
  async generatePlan(wizardData: any, userConfig: UserLLMConfig): Promise<LLMResponse> {
    const { apiKeys, preferences } = userConfig;

    // Validate user has at least one provider configured
    const configuredProviders = Object.keys(apiKeys).filter((p) => apiKeys[p]);
    if (configuredProviders.length === 0) {
      throw new BadRequestException(
        'No tienes ningún proveedor de IA configurado. Por favor, configura al menos uno en Ajustes.',
      );
    }

    // Determine provider order based on user preferences
    const providerOrder = this.getProviderOrder(preferences, configuredProviders);

    // Try each provider in order
    let lastError: Error | null = null;
    for (const providerName of providerOrder) {
      const apiKey = apiKeys[providerName];
      if (!apiKey) continue;

      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        this.logger.log(`Generating plan with ${providerName}...`);
        return await provider.generatePlan(wizardData, { apiKey });
      } catch (error: any) {
        this.logger.warn(`Provider ${providerName} failed: ${error.message}`);
        lastError = error;

        if (!preferences.fallbackEnabled) {
          throw new BadRequestException(
            `El proveedor ${providerName} falló: ${error.message}. Fallback está deshabilitado.`,
          );
        }
        // Continue to next provider
      }
    }

    // All providers failed
    throw new BadRequestException(
      `Todos los proveedores de IA fallaron. Último error: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * Generate code using the user's configured LLM providers
   */
  async generateCode(
    task: any,
    context: any,
    userConfig: UserLLMConfig,
  ): Promise<{ files: { path: string; content: string }[] }> {
    const { apiKeys, preferences } = userConfig;

    const configuredProviders = Object.keys(apiKeys).filter((p) => apiKeys[p]);
    if (configuredProviders.length === 0) {
      throw new BadRequestException(
        'No tienes ningún proveedor de IA configurado. Por favor, configura al menos uno en Ajustes.',
      );
    }

    const providerOrder = this.getProviderOrder(preferences, configuredProviders);

    let lastError: Error | null = null;
    for (const providerName of providerOrder) {
      const apiKey = apiKeys[providerName];
      if (!apiKey) continue;

      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        this.logger.log(`Generating code with ${providerName}...`);
        return await provider.generateCode(task, context, { apiKey });
      } catch (error: any) {
        this.logger.warn(`Provider ${providerName} failed code gen: ${error.message}`);
        lastError = error;

        if (!preferences.fallbackEnabled) {
          throw new BadRequestException(
            `El proveedor ${providerName} falló: ${error.message}. Fallback está deshabilitado.`,
          );
        }
      }
    }

    throw new BadRequestException(
      `Todos los proveedores de IA fallaron. Último error: ${lastError?.message || 'Unknown error'}`,
    );
  }

  /**
   * Determine provider order based on user preferences
   */
  private getProviderOrder(
    preferences: UserLLMConfig['preferences'],
    configuredProviders: string[],
  ): string[] {
    const order: string[] = [];

    // Add primary provider first if configured
    if (preferences.primaryProvider && configuredProviders.includes(preferences.primaryProvider)) {
      order.push(preferences.primaryProvider);
    }

    // Add remaining providers in fallback order
    if (preferences.fallbackEnabled) {
      for (const provider of preferences.fallbackOrder) {
        if (configuredProviders.includes(provider) && !order.includes(provider)) {
          order.push(provider);
        }
      }
    }

    // Add any remaining configured providers not in fallback order
    for (const provider of configuredProviders) {
      if (!order.includes(provider)) {
        order.push(provider);
      }
    }

    return order;
  }

  /**
   * Estimate cost for a given wizard data (uses first configured provider)
   */
  estimateCost(wizardData: any, userConfig?: UserLLMConfig): number {
    let providerName = 'anthropic';
    if (userConfig?.preferences?.primaryProvider) {
      providerName = userConfig.preferences.primaryProvider;
    }

    const provider = this.providers.get(providerName);
    if (!provider) return 0;

    const prompt = JSON.stringify(wizardData);
    return provider.estimateCost(prompt);
  }

  /**
   * Get available providers list
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Validate an API key for a specific provider
   */
  async validateApiKey(provider: string, apiKey: string): Promise<boolean> {
    const providerInstance = this.providers.get(provider);
    if (!providerInstance) {
      return false;
    }
    return providerInstance.validateApiKey(apiKey);
  }
}