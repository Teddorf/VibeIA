import {
  Injectable,
  BadRequestException,
  Logger,
  Inject,
} from '@nestjs/common';
import { LLM_PROVIDER } from '../../providers/tokens';
import {
  ILLMProvider,
  ILLMProviderOptions,
} from '../../providers/interfaces/llm-provider.interface';
import {
  LLMResponse,
  UserLLMConfig,
} from './interfaces/llm-provider.interface';
import {
  buildPlanPrompt,
  buildImportedProjectPlanPrompt,
} from './prompt-builders/plan-prompt.builder';
import { buildCodePrompt } from './prompt-builders/code-prompt.builder';
import { ImportedProjectWizardData } from './interfaces/llm-provider.interface';
import { InputSanitizer } from './sanitization/input-sanitizer';

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  private adapterMap: Map<string, ILLMProvider>;

  constructor(
    @Inject(LLM_PROVIDER) private readonly llmAdapters: ILLMProvider[],
    private readonly inputSanitizer: InputSanitizer,
  ) {
    this.adapterMap = new Map();
    for (const adapter of llmAdapters) {
      this.adapterMap.set(adapter.name, adapter);
    }
  }

  async generatePlan(
    wizardData: any,
    userConfig: UserLLMConfig,
  ): Promise<LLMResponse> {
    const { apiKeys, preferences } = userConfig;

    const configuredProviders = Object.keys(apiKeys).filter((p) => apiKeys[p]);
    if (configuredProviders.length === 0) {
      throw new BadRequestException(
        'No tienes ningún proveedor de IA configurado. Por favor, configura al menos uno en Ajustes.',
      );
    }

    const providerOrder = this.getProviderOrder(
      preferences,
      configuredProviders,
    );

    // Sanitize user input before building prompts
    const sanitizedWizardData = this.inputSanitizer.sanitizeObject(wizardData);

    // Build the prompt using extracted prompt builders
    const isImportedProject = !!(
      sanitizedWizardData as ImportedProjectWizardData
    ).existingCodebase;
    const prompt = isImportedProject
      ? buildImportedProjectPlanPrompt(
          sanitizedWizardData as ImportedProjectWizardData,
        )
      : buildPlanPrompt(sanitizedWizardData);

    let lastError: Error | null = null;
    for (const providerName of providerOrder) {
      const apiKey = apiKeys[providerName];
      if (!apiKey) continue;

      const adapter = this.adapterMap.get(providerName);
      if (!adapter) continue;

      try {
        this.logger.log(`Generating plan with ${providerName}...`);
        const options: ILLMProviderOptions = { apiKey };
        const result = await adapter.generateJSON(prompt, options);

        return {
          plan: result.data,
          provider: providerName,
          tokensUsed: result.tokensUsed,
          cost: result.cost,
        };
      } catch (error: any) {
        this.logger.warn(`Provider ${providerName} failed: ${error.message}`);
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

    const providerOrder = this.getProviderOrder(
      preferences,
      configuredProviders,
    );

    // Sanitize user input before building prompts
    const sanitizedTask = this.inputSanitizer.sanitizeObject(task);
    const sanitizedContext = this.inputSanitizer.sanitizeObject(context);
    const prompt = buildCodePrompt(sanitizedTask, sanitizedContext);

    let lastError: Error | null = null;
    for (const providerName of providerOrder) {
      const apiKey = apiKeys[providerName];
      if (!apiKey) continue;

      const adapter = this.adapterMap.get(providerName);
      if (!adapter) continue;

      try {
        this.logger.log(`Generating code with ${providerName}...`);
        const options: ILLMProviderOptions = { apiKey };
        const result = await adapter.generateJSON<{
          files: { path: string; content: string }[];
        }>(prompt, options);
        return result.data;
      } catch (error: any) {
        this.logger.warn(
          `Provider ${providerName} failed code gen: ${error.message}`,
        );
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

  private getProviderOrder(
    preferences: UserLLMConfig['preferences'],
    configuredProviders: string[],
  ): string[] {
    const order: string[] = [];

    if (
      preferences.primaryProvider &&
      configuredProviders.includes(preferences.primaryProvider)
    ) {
      order.push(preferences.primaryProvider);
    }

    if (preferences.fallbackEnabled) {
      for (const provider of preferences.fallbackOrder) {
        if (
          configuredProviders.includes(provider) &&
          !order.includes(provider)
        ) {
          order.push(provider);
        }
      }
    }

    for (const provider of configuredProviders) {
      if (!order.includes(provider)) {
        order.push(provider);
      }
    }

    return order;
  }

  estimateCost(wizardData: any, userConfig?: UserLLMConfig): number {
    let providerName = 'anthropic';
    if (userConfig?.preferences?.primaryProvider) {
      providerName = userConfig.preferences.primaryProvider;
    }

    const adapter = this.adapterMap.get(providerName);
    if (!adapter) return 0;

    const prompt = JSON.stringify(wizardData);
    return adapter.estimateCost(prompt);
  }

  getAvailableProviders(): string[] {
    return this.llmAdapters.map((a) => a.name);
  }

  async validateApiKey(provider: string, apiKey: string): Promise<boolean> {
    const adapter = this.adapterMap.get(provider);
    if (!adapter) return false;
    return adapter.validateApiKey(apiKey);
  }
}
