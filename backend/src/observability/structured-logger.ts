import { Injectable, Logger, Scope } from '@nestjs/common';
import { TraceContext } from './trace';

export interface LogContext {
  traceId?: string;
  source?: string;
  durationMs?: number;
  tokensUsed?: number;
  costUSD?: number;
  [key: string]: unknown;
}

@Injectable()
export class StructuredLogger {
  private readonly logger = new Logger('Orchestrator');

  constructor(private readonly traceContext: TraceContext) {}

  log(message: string, context?: LogContext): void {
    this.logger.log(this.format(message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.logger.warn(this.format(message, context));
  }

  error(message: string, context?: LogContext): void {
    this.logger.error(this.format(message, context));
  }

  debug(message: string, context?: LogContext): void {
    this.logger.debug(this.format(message, context));
  }

  private format(message: string, context?: LogContext): string {
    const traceId = context?.traceId ?? this.traceContext.getTraceId();
    const parts = [`[${traceId}]`];

    if (context?.source) parts.push(`[${context.source}]`);
    parts.push(message);

    if (context?.durationMs !== undefined) {
      parts.push(`(${context.durationMs}ms)`);
    }
    if (context?.tokensUsed !== undefined) {
      parts.push(`tokens=${context.tokensUsed}`);
    }
    if (context?.costUSD !== undefined) {
      parts.push(`cost=$${context.costUSD.toFixed(6)}`);
    }

    return parts.join(' ');
  }
}
