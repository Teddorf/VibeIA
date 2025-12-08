import { Injectable, Logger } from '@nestjs/common';
import {
  RollbackAction,
  RollbackActionResult,
  RollbackResult,
  CostAvoidedReport,
} from './dto/error-handling.dto';
import { RetryService } from './retry.service';

export interface RollbackProvider {
  name: string;
  rollback(resourceId: string, token?: string): Promise<void>;
}

@Injectable()
export class RollbackEngineService {
  private readonly logger = new Logger(RollbackEngineService.name);
  private stacks: Map<string, RollbackAction[]> = new Map();
  private executed: Map<string, Set<string>> = new Map();
  private providers: Map<string, RollbackProvider> = new Map();

  constructor(private readonly retryService: RetryService) {}

  registerProvider(provider: RollbackProvider): void {
    this.providers.set(provider.name, provider);
  }

  initializeStack(setupId: string): void {
    this.stacks.set(setupId, []);
    this.executed.set(setupId, new Set());
  }

  registerAction(setupId: string, action: RollbackAction): void {
    const stack = this.stacks.get(setupId) || [];
    stack.push(action);
    this.stacks.set(setupId, stack);
    this.logger.debug(`Registered rollback action: ${action.id} for ${action.provider}`);
  }

  getStack(setupId: string): RollbackAction[] {
    return this.stacks.get(setupId) || [];
  }

  async rollback(
    setupId: string,
    reason: string,
    tokens?: { neon?: string; vercel?: string; railway?: string },
  ): Promise<RollbackResult> {
    const startTime = Date.now();
    this.logger.log(`Starting rollback for ${setupId}: ${reason}`);

    const stack = this.stacks.get(setupId);
    const executedSet = this.executed.get(setupId) || new Set();

    if (!stack || stack.length === 0) {
      this.logger.log(`No resources to rollback for setup: ${setupId}`);
      return {
        success: true,
        actionsExecuted: 0,
        actionsFailed: 0,
        results: [],
        totalDuration: Date.now() - startTime,
        resourcesCleaned: [],
      };
    }

    const results: RollbackActionResult[] = [];
    const errors: Error[] = [];
    const resourcesCleaned: string[] = [];

    const sortedStack = [...stack].sort((a, b) => b.priority - a.priority);

    for (let i = sortedStack.length - 1; i >= 0; i--) {
      const action = sortedStack[i];

      if (executedSet.has(action.id)) {
        this.logger.debug(`Skipping already executed action: ${action.id}`);
        continue;
      }

      const actionStartTime = Date.now();

      try {
        await this.executeAction(action, tokens);

        const duration = Date.now() - actionStartTime;
        results.push({
          actionId: action.id,
          success: true,
          duration,
        });

        executedSet.add(action.id);
        resourcesCleaned.push(`${action.provider}:${action.resourceType}:${action.resourceId}`);

        this.logger.log(`Successfully rolled back: ${action.provider} ${action.resourceType}`);
      } catch (error) {
        const duration = Date.now() - actionStartTime;
        const errorMessage = error instanceof Error ? error.message : String(error);

        errors.push(error instanceof Error ? error : new Error(errorMessage));
        results.push({
          actionId: action.id,
          success: false,
          error: errorMessage,
          duration,
        });

        this.logger.error(
          `Failed to rollback ${action.provider} resource: ${action.resourceId}`,
          error,
        );
      }
    }

    this.executed.set(setupId, executedSet);

    this.logger.log(
      `Rollback completed for ${setupId}: ${results.filter((r) => r.success).length}/${results.length} actions successful`,
    );

    return {
      success: errors.length === 0,
      actionsExecuted: results.filter((r) => r.success).length,
      actionsFailed: errors.length,
      results,
      totalDuration: Date.now() - startTime,
      resourcesCleaned,
    };
  }

  private async executeAction(
    action: RollbackAction,
    tokens?: { neon?: string; vercel?: string; railway?: string },
  ): Promise<void> {
    const provider = this.providers.get(action.provider);

    if (provider) {
      const token = tokens?.[action.provider as keyof typeof tokens];
      await this.executeWithTimeout(
        () => provider.rollback(action.resourceId, token),
        30000,
      );
      return;
    }

    switch (action.provider) {
      case 'neon':
        await this.rollbackNeon(action, tokens?.neon);
        break;
      case 'vercel':
        await this.rollbackVercel(action, tokens?.vercel);
        break;
      case 'railway':
        await this.rollbackRailway(action, tokens?.railway);
        break;
      default:
        throw new Error(`Unknown provider: ${action.provider}`);
    }
  }

  private async rollbackNeon(action: RollbackAction, token?: string): Promise<void> {
    if (!token) {
      this.logger.warn('No Neon token provided for rollback');
      return;
    }

    await this.executeWithTimeout(async () => {
      const response = await fetch(
        `https://console.neon.tech/api/v2/projects/${action.resourceId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok && response.status !== 404) {
        const text = await response.text();
        throw new Error(`Neon rollback failed: ${text}`);
      }
    }, 30000);
  }

  private async rollbackVercel(action: RollbackAction, token?: string): Promise<void> {
    if (!token) {
      this.logger.warn('No Vercel token provided for rollback');
      return;
    }

    await this.executeWithTimeout(async () => {
      const response = await fetch(
        `https://api.vercel.com/v9/projects/${action.resourceId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok && response.status !== 404) {
        const text = await response.text();
        throw new Error(`Vercel rollback failed: ${text}`);
      }
    }, 30000);
  }

  private async rollbackRailway(action: RollbackAction, token?: string): Promise<void> {
    if (!token) {
      this.logger.warn('No Railway token provided for rollback');
      return;
    }

    await this.executeWithTimeout(async () => {
      const query = `
        mutation projectDelete($id: String!) {
          projectDelete(id: $id)
        }
      `;

      const response = await fetch('https://backboard.railway.app/graphql/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          variables: { id: action.resourceId },
        }),
      });

      const result = await response.json();

      if (result.errors && !result.errors.some((e: { message: string }) => e.message.includes('not found'))) {
        throw new Error(`Railway rollback failed: ${JSON.stringify(result.errors)}`);
      }
    }, 30000);
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    return Promise.race([operation(), timeoutPromise]);
  }

  calculateCostAvoided(actions: RollbackAction[]): CostAvoidedReport {
    const providerCosts = {
      vercel: { monthly: 0, tier: 'hobby' },
      railway: { monthly: 0, tier: 'starter' },
      neon: { monthly: 0, tier: 'free' },
    };

    for (const action of actions) {
      switch (action.provider) {
        case 'vercel':
          providerCosts.vercel.monthly = 0;
          providerCosts.vercel.tier = 'hobby';
          break;
        case 'railway':
          providerCosts.railway.monthly = 5;
          providerCosts.railway.tier = 'starter ($5-10/mo)';
          break;
        case 'neon':
          providerCosts.neon.monthly = 0;
          providerCosts.neon.tier = 'free tier';
          break;
      }
    }

    const totalMonthly =
      providerCosts.vercel.monthly +
      providerCosts.railway.monthly +
      providerCosts.neon.monthly;

    return {
      ...providerCosts,
      totalMonthly,
      message:
        totalMonthly > 0
          ? `Total evitado: ~$${totalMonthly}/mes`
          : 'Recursos en tiers gratuitos eliminados correctamente',
    };
  }

  getStatus(setupId: string): {
    pending: number;
    executed: number;
    actions: RollbackAction[];
  } {
    const stack = this.stacks.get(setupId) || [];
    const executedSet = this.executed.get(setupId) || new Set();

    return {
      pending: stack.length - executedSet.size,
      executed: executedSet.size,
      actions: stack,
    };
  }

  clearStack(setupId: string): void {
    this.stacks.delete(setupId);
    this.executed.delete(setupId);
  }

  hasActions(setupId: string): boolean {
    const stack = this.stacks.get(setupId);
    return !!stack && stack.length > 0;
  }
}
