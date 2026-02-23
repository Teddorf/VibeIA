import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { TraceContext } from './trace';
import { VIBE_CONFIG } from '../providers/tokens';
import { VibeConfig } from '../config/vibe-config';
import { TokenUsage } from '../providers/interfaces/llm-provider.interface';

export interface LogContext {
  traceId?: string;
  source?: string;
  method?: string;
  durationMs?: number;
  tokensUsed?: number;
  costUSD?: number;
  tokens?: TokenUsage;
  error?: Error;
  [key: string]: unknown;
}

export interface StructuredLog {
  timestamp: string;
  level: string;
  traceId: string;
  source: { module: string; method?: string };
  message: string;
  data?: Record<string, unknown>;
  duration?: number;
  tokens?: TokenUsage;
  cost?: number;
  error?: { message: string; stack?: string };
}

@Injectable()
export class StructuredLogger {
  private readonly logger = new Logger('Orchestrator');

  constructor(
    private readonly traceContext: TraceContext,
    @Inject(VIBE_CONFIG) private readonly config: VibeConfig,
  ) {}

  log(message: string, context?: LogContext): void {
    this.emit('info', message, context);
  }
  warn(message: string, context?: LogContext): void {
    this.emit('warn', message, context);
  }
  error(message: string, context?: LogContext): void {
    this.emit('error', message, context);
  }
  debug(message: string, context?: LogContext): void {
    this.emit('debug', message, context);
  }

  private emit(level: string, message: string, context?: LogContext): void {
    if (this.config.observability.logFormat === 'json') {
      this.emitJson(level, message, context);
    } else {
      this.emitText(level, message, context);
    }
  }

  private emitJson(level: string, message: string, context?: LogContext): void {
    const log: StructuredLog = {
      timestamp: new Date().toISOString(),
      level,
      traceId: context?.traceId ?? this.traceContext.getTraceId(),
      source: {
        module: context?.source ?? 'Orchestrator',
        method: context?.method,
      },
      message,
    };
    if (context?.durationMs !== undefined) log.duration = context.durationMs;
    if (context?.tokens) log.tokens = context.tokens;
    if (context?.costUSD !== undefined) log.cost = context.costUSD;
    if (context?.error)
      log.error = {
        message: context.error.message,
        stack: context.error.stack,
      };
    const fn =
      level === 'error'
        ? 'error'
        : level === 'warn'
          ? 'warn'
          : level === 'debug'
            ? 'debug'
            : 'log';
    this.logger[fn](JSON.stringify(log));
  }

  private emitText(level: string, message: string, context?: LogContext): void {
    const traceId = context?.traceId ?? this.traceContext.getTraceId();
    const parts = [`[${traceId}]`];
    if (context?.source) parts.push(`[${context.source}]`);
    parts.push(message);
    if (context?.durationMs !== undefined)
      parts.push(`(${context.durationMs}ms)`);
    if (context?.tokensUsed !== undefined)
      parts.push(`tokens=${context.tokensUsed}`);
    if (context?.costUSD !== undefined)
      parts.push(`cost=$${context.costUSD.toFixed(6)}`);
    const text = parts.join(' ');
    const fn =
      level === 'error'
        ? 'error'
        : level === 'warn'
          ? 'warn'
          : level === 'debug'
            ? 'debug'
            : 'log';
    this.logger[fn](text);
  }
}
