import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RollbackEngineService } from './rollback-engine.service';
import { RecoveryService } from './recovery.service';
import { RetryService } from './retry.service';
import {
  RollbackRequest,
  RollbackStatusResponse,
  ErrorRecoveryRequest,
  ErrorType,
  EnhancedError,
  RecoveryStrategy,
  ERROR_STRATEGIES,
} from './dto/error-handling.dto';

@Controller('api/error-handling')
@UseGuards(ThrottlerGuard)
export class ErrorHandlingController {
  constructor(
    private readonly rollbackEngine: RollbackEngineService,
    private readonly recoveryService: RecoveryService,
    private readonly retryService: RetryService,
  ) {}

  // Infrastructure rollback - Admin only
  @Roles('admin')
  @Post('rollback')
  @HttpCode(HttpStatus.OK)
  async rollback(@Body() request: RollbackRequest) {
    const result = await this.rollbackEngine.rollback(
      request.setupId,
      request.reason || 'manual_rollback',
      request.tokens,
    );

    const costAvoided = this.rollbackEngine.calculateCostAvoided(
      this.rollbackEngine.getStack(request.setupId),
    );

    return {
      success: result.success,
      setupId: request.setupId,
      actionsExecuted: result.actionsExecuted,
      actionsFailed: result.actionsFailed,
      results: result.results,
      totalDuration: result.totalDuration,
      resourcesCleaned: result.resourcesCleaned,
      costAvoided,
    };
  }

  // Rollback status - Admin only
  @Roles('admin')
  @Get('rollback/status/:setupId')
  async getRollbackStatus(
    @Param('setupId') setupId: string,
  ): Promise<RollbackStatusResponse> {
    const status = this.rollbackEngine.getStatus(setupId);

    return {
      setupId,
      status: status.pending > 0 ? 'pending' : 'completed',
      progress:
        status.actions.length > 0
          ? Math.round((status.executed / status.actions.length) * 100)
          : 100,
      actionsTotal: status.actions.length,
      actionsCompleted: status.executed,
      actionsFailed: 0,
    };
  }

  // Infrastructure recovery - Admin only
  @Roles('admin')
  @Post('recover')
  @HttpCode(HttpStatus.OK)
  async attemptRecovery(@Body() request: ErrorRecoveryRequest) {
    const error: EnhancedError = {
      type: ErrorType.UNKNOWN,
      message: 'Recovery requested',
      timestamp: new Date(),
      recoverable: true,
    };

    const state = {
      setupId: request.setupId,
      status: 'failed',
      completedTasks: [],
      resources: new Map<string, string>(),
    };

    const result = await this.recoveryService.attemptRecovery(state, error);

    return {
      success: result.success,
      action: result.action,
      resourcesRecovered: result.resourcesRecovered,
      resourcesLost: result.resourcesLost,
      message: result.message,
      nextSteps: result.nextSteps,
    };
  }

  // Error analysis - requires authentication but not admin
  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  async analyzeError(
    @Body()
    body: {
      errorMessage: string;
      errorCode?: string;
      setupId?: string;
      taskName?: string;
    },
  ) {
    const classifiedError = this.retryService.classifyError(
      new Error(body.errorMessage),
    );

    const isRetryable = this.retryService.isRetryable(classifiedError);
    const maxRetries = this.retryService.getMaxRetriesForError(classifiedError);
    const retryDelay = this.retryService.getRetryDelayForError(classifiedError, 1);

    const state = {
      setupId: body.setupId || 'unknown',
      status: 'failed',
      failedTask: body.taskName,
      completedTasks: [],
      resources: new Map<string, string>(),
    };

    const analysis = this.recoveryService.analyzeFailure(state, classifiedError);

    return {
      error: {
        type: classifiedError.type,
        message: classifiedError.message,
        recoverable: classifiedError.recoverable,
        suggestedAction: classifiedError.suggestedAction,
      },
      retry: {
        retryable: isRetryable,
        maxRetries,
        initialDelay: retryDelay,
      },
      recovery: {
        strategy: analysis.strategy,
        confidence: analysis.confidence,
        details: analysis.details,
        suggestedActions: analysis.suggestedActions,
      },
      nextSteps: this.generateNextSteps(classifiedError, analysis),
    };
  }

  @Public()
  @Get('strategies')
  getStrategies() {
    const strategies = Object.entries(ERROR_STRATEGIES).map(([type, strategy]) => ({
      errorType: type,
      retry: strategy.retry,
      maxRetries: strategy.maxRetries,
      backoff: strategy.backoff,
      initialDelay: strategy.initialDelay,
      maxDelay: strategy.maxDelay,
      rollbackOnFailure: strategy.rollbackOnFailure,
      userAction: strategy.userAction,
    }));

    return {
      strategies,
      errorTypes: Object.values(ErrorType),
      recoveryStrategies: Object.values(RecoveryStrategy),
    };
  }

  @Public()
  @Get('health')
  getHealth() {
    return {
      status: 'healthy',
      services: {
        retryService: 'available',
        rollbackEngine: 'available',
        recoveryService: 'available',
      },
      timestamp: new Date().toISOString(),
    };
  }

  private generateNextSteps(
    error: EnhancedError,
    analysis: { strategy: RecoveryStrategy; suggestedActions: unknown[] },
  ): string[] {
    const steps: string[] = [];

    switch (error.type) {
      case ErrorType.NETWORK:
        steps.push('Check your internet connection');
        steps.push('Verify the service is accessible');
        steps.push('Wait a few seconds and retry');
        break;

      case ErrorType.RATE_LIMIT:
        steps.push('Wait for rate limit to reset (usually 1-5 minutes)');
        steps.push('Reduce request frequency');
        steps.push('Consider upgrading your plan for higher limits');
        break;

      case ErrorType.AUTH:
        steps.push('Check your API tokens are valid');
        steps.push('Regenerate tokens if expired');
        steps.push('Verify token permissions');
        break;

      case ErrorType.VALIDATION:
        steps.push('Review input data for errors');
        steps.push('Check character limits and formatting');
        steps.push('Ensure unique names for projects');
        break;

      case ErrorType.QUOTA:
        steps.push('Check current usage against limits');
        steps.push('Upgrade your plan if needed');
        steps.push('Wait for quota reset period');
        break;

      case ErrorType.SERVER:
        steps.push('Check service status page');
        steps.push('Wait and retry later');
        steps.push('Contact support if issue persists');
        break;

      default:
        steps.push('Review error details');
        steps.push('Try again');
        steps.push('Contact support if issue persists');
    }

    if (analysis.strategy === RecoveryStrategy.FULL_ROLLBACK) {
      steps.push('Clean up created resources');
      steps.push('Fix the underlying issue');
      steps.push('Start fresh setup');
    }

    return steps;
  }
}
