import { Injectable, Logger } from '@nestjs/common';
import {
  ErrorType,
  ErrorStrategy,
  BackoffType,
  EnhancedError,
  RetryContext,
  RetryResult,
  ERROR_STRATEGIES,
} from './dto/error-handling.dto';

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    errorType?: ErrorType,
    customStrategy?: Partial<ErrorStrategy>,
  ): Promise<RetryResult<T>> {
    const strategy = this.getStrategy(errorType, customStrategy);
    const context: RetryContext = {
      attempt: 0,
      maxAttempts: strategy.maxRetries + 1,
      startedAt: new Date(),
      errors: [],
    };

    while (context.attempt < context.maxAttempts) {
      context.attempt++;

      try {
        const result = await operation();

        return {
          success: true,
          result,
          attempts: context.attempt,
          totalDuration: Date.now() - context.startedAt.getTime(),
          errors: context.errors,
        };
      } catch (error) {
        const enhancedError = this.classifyError(error);
        context.errors.push(enhancedError);
        context.lastError = enhancedError;

        this.logger.warn(
          `Attempt ${context.attempt}/${context.maxAttempts} failed: ${enhancedError.message}`,
        );

        if (!this.shouldRetry(context, strategy, enhancedError)) {
          break;
        }

        const delay = this.calculateDelay(context.attempt, strategy);
        context.nextRetryDelay = delay;

        this.logger.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }

    return {
      success: false,
      attempts: context.attempt,
      totalDuration: Date.now() - context.startedAt.getTime(),
      errors: context.errors,
    };
  }

  classifyError(error: unknown): EnhancedError {
    const baseError: EnhancedError = {
      type: ErrorType.UNKNOWN,
      message: error instanceof Error ? error.message : String(error),
      originalError: error instanceof Error ? error : undefined,
      timestamp: new Date(),
      recoverable: true,
    };

    if (!(error instanceof Error)) {
      return baseError;
    }

    const message = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    if (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('econnreset') ||
      message.includes('fetch failed') ||
      message.includes('socket hang up')
    ) {
      return { ...baseError, type: ErrorType.NETWORK };
    }

    if (
      message.includes('rate limit') ||
      message.includes('too many requests') ||
      message.includes('429')
    ) {
      return { ...baseError, type: ErrorType.RATE_LIMIT };
    }

    if (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('401') ||
      message.includes('invalid token') ||
      message.includes('expired token')
    ) {
      return {
        ...baseError,
        type: ErrorType.AUTH,
        recoverable: false,
        suggestedAction: ERROR_STRATEGIES[ErrorType.AUTH].userAction,
      };
    }

    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('400') ||
      message.includes('bad request')
    ) {
      return {
        ...baseError,
        type: ErrorType.VALIDATION,
        recoverable: false,
        suggestedAction: ERROR_STRATEGIES[ErrorType.VALIDATION].userAction,
      };
    }

    if (
      message.includes('conflict') ||
      message.includes('already exists') ||
      message.includes('409') ||
      message.includes('duplicate')
    ) {
      return { ...baseError, type: ErrorType.CONFLICT };
    }

    if (
      message.includes('internal server error') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503')
    ) {
      return { ...baseError, type: ErrorType.SERVER };
    }

    if (
      message.includes('quota') ||
      message.includes('limit exceeded') ||
      message.includes('403') ||
      message.includes('plan limit')
    ) {
      return {
        ...baseError,
        type: ErrorType.QUOTA,
        recoverable: false,
        suggestedAction: ERROR_STRATEGIES[ErrorType.QUOTA].userAction,
      };
    }

    if (
      message.includes('timeout') ||
      message.includes('timed out') ||
      errorName.includes('timeout')
    ) {
      return { ...baseError, type: ErrorType.TIMEOUT };
    }

    return baseError;
  }

  getStrategy(
    errorType?: ErrorType,
    customStrategy?: Partial<ErrorStrategy>,
  ): ErrorStrategy {
    const baseStrategy = errorType
      ? ERROR_STRATEGIES[errorType]
      : ERROR_STRATEGIES[ErrorType.UNKNOWN];

    return {
      ...baseStrategy,
      ...customStrategy,
    };
  }

  calculateDelay(attempt: number, strategy: ErrorStrategy): number {
    const initialDelay = strategy.initialDelay || 1000;
    const maxDelay = strategy.maxDelay || 60000;

    let delay: number;

    switch (strategy.backoff) {
      case BackoffType.EXPONENTIAL:
        delay = initialDelay * Math.pow(2, attempt - 1);
        break;

      case BackoffType.LINEAR:
        delay = initialDelay * attempt;
        break;

      case BackoffType.NONE:
      default:
        delay = initialDelay;
        break;
    }

    const jitter = delay * 0.1 * Math.random();
    delay = delay + jitter;

    return Math.min(delay, maxDelay);
  }

  shouldRetry(
    context: RetryContext,
    strategy: ErrorStrategy,
    error: EnhancedError,
  ): boolean {
    if (!strategy.retry) {
      return false;
    }

    if (context.attempt >= context.maxAttempts) {
      return false;
    }

    if (!error.recoverable) {
      return false;
    }

    const nonRetryableTypes = [
      ErrorType.AUTH,
      ErrorType.VALIDATION,
      ErrorType.QUOTA,
    ];

    if (nonRetryableTypes.includes(error.type)) {
      return false;
    }

    return true;
  }

  async executeWithTimeout<T>(
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

  async executeWithTimeoutAndRetry<T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    errorType?: ErrorType,
    customStrategy?: Partial<ErrorStrategy>,
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(
      () => this.executeWithTimeout(operation, timeoutMs),
      errorType || ErrorType.TIMEOUT,
      customStrategy,
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getRetryDelayForError(error: EnhancedError, attempt: number): number {
    const strategy = this.getStrategy(error.type);
    return this.calculateDelay(attempt, strategy);
  }

  isRetryable(error: EnhancedError): boolean {
    const strategy = this.getStrategy(error.type);
    return strategy.retry && error.recoverable;
  }

  getMaxRetriesForError(error: EnhancedError): number {
    const strategy = this.getStrategy(error.type);
    return strategy.maxRetries;
  }
}
