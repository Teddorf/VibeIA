import { Injectable, Logger } from '@nestjs/common';
import {
  EnhancedError,
  ErrorType,
  RecoveryStrategy,
  FailureAnalysis,
  RecoveryResult,
  UserAction,
  RollbackAction,
} from './dto/error-handling.dto';
import { RollbackEngineService } from './rollback-engine.service';
import { RetryService } from './retry.service';

interface SetupState {
  setupId: string;
  status: string;
  currentTask?: string;
  completedTasks: string[];
  failedTask?: string;
  resources: Map<string, string>;
}

@Injectable()
export class RecoveryService {
  private readonly logger = new Logger(RecoveryService.name);

  private readonly criticalTasks = [
    'create_database',
    'create_frontend_project',
    'create_backend_project',
    'configure_database_connection',
    'create_neon_project',
    'create_vercel_project',
    'create_railway_project',
  ];

  constructor(
    private readonly rollbackEngine: RollbackEngineService,
    private readonly retryService: RetryService,
  ) {}

  analyzeFailure(
    state: SetupState,
    error: EnhancedError,
  ): FailureAnalysis {
    const affectedResources = this.identifyAffectedResources(state);
    const isCritical = this.isTaskCritical(state.failedTask);
    const suggestedActions = this.determineSuggestedActions(error);

    let strategy: RecoveryStrategy;
    let recoverable: boolean;
    let confidence: number;
    let details: string;

    switch (error.type) {
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        strategy = RecoveryStrategy.PARTIAL_ROLLBACK;
        recoverable = true;
        confidence = 0.8;
        details = 'Network issue detected. Will retry after partial rollback.';
        break;

      case ErrorType.RATE_LIMIT:
        strategy = RecoveryStrategy.SKIP;
        recoverable = true;
        confidence = 0.9;
        details = 'Rate limit hit. Will wait and retry automatically.';
        break;

      case ErrorType.CONFLICT:
        strategy = RecoveryStrategy.ALTERNATIVE;
        recoverable = true;
        confidence = 0.7;
        details = 'Resource conflict detected. Will try to use existing resource.';
        break;

      case ErrorType.AUTH:
        strategy = RecoveryStrategy.MANUAL;
        recoverable = false;
        confidence = 1.0;
        details = 'Authentication failed. User must re-authenticate.';
        break;

      case ErrorType.VALIDATION:
        strategy = RecoveryStrategy.MANUAL;
        recoverable = false;
        confidence = 1.0;
        details = 'Validation error. User must fix input.';
        break;

      case ErrorType.QUOTA:
        strategy = RecoveryStrategy.FULL_ROLLBACK;
        recoverable = false;
        confidence = 1.0;
        details = 'Quota exceeded. User must upgrade plan or wait.';
        break;

      case ErrorType.SERVER:
        if (isCritical) {
          strategy = RecoveryStrategy.FULL_ROLLBACK;
          recoverable = false;
          confidence = 0.9;
          details = 'Server error on critical task. Full rollback recommended.';
        } else {
          strategy = RecoveryStrategy.PARTIAL_ROLLBACK;
          recoverable = true;
          confidence = 0.6;
          details = 'Server error. Will attempt partial recovery.';
        }
        break;

      default:
        if (isCritical) {
          strategy = RecoveryStrategy.FULL_ROLLBACK;
          recoverable = false;
          confidence = 0.5;
        } else {
          strategy = RecoveryStrategy.SKIP;
          recoverable = true;
          confidence = 0.4;
        }
        details = 'Unknown error. Recovery uncertain.';
        break;
    }

    return {
      recoverable,
      strategy,
      affectedResources,
      suggestedActions,
      confidence,
      details,
    };
  }

  async attemptRecovery(
    state: SetupState,
    error: EnhancedError,
    tokens?: { neon?: string; vercel?: string; railway?: string },
  ): Promise<RecoveryResult> {
    const analysis = this.analyzeFailure(state, error);

    this.logger.log(
      `Attempting recovery for ${state.setupId}: strategy=${analysis.strategy}, confidence=${analysis.confidence}`,
    );

    if (!analysis.recoverable) {
      return {
        success: false,
        action: analysis.strategy,
        message: analysis.details,
        nextSteps: this.generateNextSteps(analysis),
      };
    }

    switch (analysis.strategy) {
      case RecoveryStrategy.PARTIAL_ROLLBACK:
        return await this.partialRollbackAndRetry(state, analysis, tokens);

      case RecoveryStrategy.ALTERNATIVE:
        return await this.useAlternativeResource(state, analysis);

      case RecoveryStrategy.SKIP:
        return await this.skipNonCritical(state, analysis);

      case RecoveryStrategy.MANUAL:
        return await this.requestManualIntervention(state, analysis);

      case RecoveryStrategy.FULL_ROLLBACK:
      default:
        return await this.performFullRollback(state, tokens);
    }
  }

  private async partialRollbackAndRetry(
    state: SetupState,
    analysis: FailureAnalysis,
    tokens?: { neon?: string; vercel?: string; railway?: string },
  ): Promise<RecoveryResult> {
    try {
      const failedTaskActions = this.getActionsForTask(state.setupId, state.failedTask);

      for (const action of failedTaskActions) {
        try {
          await this.rollbackEngine.rollback(state.setupId, 'partial_recovery', tokens);
        } catch {
          this.logger.warn(`Could not rollback action ${action.id}`);
        }
      }

      return {
        success: true,
        action: RecoveryStrategy.PARTIAL_ROLLBACK,
        resourcesRecovered: analysis.affectedResources,
        message: 'Partial rollback completed. Ready for retry.',
        nextSteps: ['Retry the failed task', 'Check service status before retrying'],
      };
    } catch (error) {
      return {
        success: false,
        action: RecoveryStrategy.PARTIAL_ROLLBACK,
        resourcesLost: analysis.affectedResources,
        message: `Partial rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextSteps: ['Consider full rollback', 'Check provider dashboards manually'],
      };
    }
  }

  private async useAlternativeResource(
    state: SetupState,
    analysis: FailureAnalysis,
  ): Promise<RecoveryResult> {
    return {
      success: true,
      action: RecoveryStrategy.ALTERNATIVE,
      resourcesRecovered: analysis.affectedResources,
      message: 'Will attempt to use existing resources where possible.',
      nextSteps: [
        'Check if conflicting resources can be reused',
        'Rename project if needed',
        'Retry with unique identifiers',
      ],
    };
  }

  private async skipNonCritical(
    state: SetupState,
    analysis: FailureAnalysis,
  ): Promise<RecoveryResult> {
    return {
      success: true,
      action: RecoveryStrategy.SKIP,
      message: `Skipping non-critical task: ${state.failedTask}. Setup can continue.`,
      nextSteps: [
        'Complete remaining tasks',
        'Manually configure skipped components later',
        'Check documentation for manual setup steps',
      ],
    };
  }

  private async requestManualIntervention(
    state: SetupState,
    analysis: FailureAnalysis,
  ): Promise<RecoveryResult> {
    return {
      success: false,
      action: RecoveryStrategy.MANUAL,
      message: 'Manual intervention required to continue.',
      nextSteps: this.generateNextSteps(analysis),
    };
  }

  private async performFullRollback(
    state: SetupState,
    tokens?: { neon?: string; vercel?: string; railway?: string },
  ): Promise<RecoveryResult> {
    const result = await this.rollbackEngine.rollback(
      state.setupId,
      'full_recovery',
      tokens,
    );

    return {
      success: result.success,
      action: RecoveryStrategy.FULL_ROLLBACK,
      resourcesRecovered: result.success ? result.resourcesCleaned : undefined,
      message: result.success
        ? 'Full rollback completed successfully.'
        : `Full rollback partially failed: ${result.actionsFailed} actions failed.`,
      nextSteps: result.success
        ? ['Review error and fix root cause', 'Retry setup from the beginning']
        : ['Check provider dashboards manually', 'Clean up remaining resources'],
    };
  }

  private identifyAffectedResources(state: SetupState): string[] {
    const resources: string[] = [];

    state.resources.forEach((resourceId, resourceType) => {
      resources.push(`${resourceType}:${resourceId}`);
    });

    return resources;
  }

  private isTaskCritical(taskName?: string): boolean {
    if (!taskName) return false;
    return this.criticalTasks.some((critical) =>
      taskName.toLowerCase().includes(critical.toLowerCase()),
    );
  }

  private determineSuggestedActions(error: EnhancedError): UserAction[] {
    const actions: UserAction[] = [];

    switch (error.type) {
      case ErrorType.AUTH:
        actions.push(UserAction.REAUTH);
        break;
      case ErrorType.VALIDATION:
        actions.push(UserAction.FIX_INPUT);
        break;
      case ErrorType.QUOTA:
        actions.push(UserAction.UPGRADE_PLAN);
        break;
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
      case ErrorType.SERVER:
        actions.push(UserAction.RETRY);
        break;
      default:
        actions.push(UserAction.CONTACT_SUPPORT);
        break;
    }

    return actions;
  }

  private generateNextSteps(analysis: FailureAnalysis): string[] {
    const steps: string[] = [];

    for (const action of analysis.suggestedActions) {
      switch (action) {
        case UserAction.REAUTH:
          steps.push('Re-authenticate with the service provider');
          steps.push('Check that your API tokens are still valid');
          steps.push('Regenerate tokens if necessary');
          break;
        case UserAction.FIX_INPUT:
          steps.push('Review the input data for errors');
          steps.push('Ensure all required fields are filled correctly');
          steps.push('Check for invalid characters in project names');
          break;
        case UserAction.UPGRADE_PLAN:
          steps.push('Check your current plan limits');
          steps.push('Upgrade to a higher tier if needed');
          steps.push('Wait for quota to reset if applicable');
          break;
        case UserAction.RETRY:
          steps.push('Wait a few minutes and retry');
          steps.push('Check the service status page');
          steps.push('Try again with a different configuration');
          break;
        case UserAction.CONTACT_SUPPORT:
          steps.push('Document the error details');
          steps.push('Contact support with error information');
          steps.push('Check community forums for similar issues');
          break;
      }
    }

    return steps;
  }

  private getActionsForTask(setupId: string, taskName?: string): RollbackAction[] {
    if (!taskName) return [];

    const stack = this.rollbackEngine.getStack(setupId);
    return stack.filter((action) => action.taskId === taskName);
  }

  canRecover(error: EnhancedError): boolean {
    const nonRecoverableTypes = [ErrorType.AUTH, ErrorType.VALIDATION, ErrorType.QUOTA];
    return !nonRecoverableTypes.includes(error.type);
  }

  getRecoveryConfidence(error: EnhancedError, isCriticalTask: boolean): number {
    const baseConfidence: Record<ErrorType, number> = {
      [ErrorType.NETWORK]: 0.8,
      [ErrorType.RATE_LIMIT]: 0.9,
      [ErrorType.CONFLICT]: 0.7,
      [ErrorType.SERVER]: 0.6,
      [ErrorType.TIMEOUT]: 0.75,
      [ErrorType.AUTH]: 0,
      [ErrorType.VALIDATION]: 0,
      [ErrorType.QUOTA]: 0,
      [ErrorType.UNKNOWN]: 0.3,
    };

    let confidence = baseConfidence[error.type] || 0;

    if (isCriticalTask) {
      confidence *= 0.7;
    }

    return confidence;
  }
}
