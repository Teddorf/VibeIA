/**
 * Sistema de logging mejorado con buffer y envío a backend
 * Soporta diferentes niveles de log y contexto estructurado
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  url?: string;
  userId?: string;
  userAgent?: string;
  errorCode?: string;
  stackTrace?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context: LogContext;
}

class Logger {
  private static instance: Logger;
  private buffer: LogEntry[] = [];
  private flushInterval = 10000; // 10 segundos
  private maxBufferSize = 50;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isInitialized = false;

  private constructor() {
    this.init();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.isInitialized = true;

    // Auto-flush periódico
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval);

    // Flush antes de cerrar
    window.addEventListener('beforeunload', () => this.flush());

    // Capturar errores no manejados
    window.addEventListener('error', (event) => {
      this.error('Uncaught error', event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Capturar promesas rechazadas no manejadas
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled promise rejection', event.reason);
    });
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : 'N/A',
        userId: this.getCurrentUserId(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
        ...context,
      },
    };

    this.buffer.push(entry);

    // Si es error o buffer está lleno, flush inmediato
    if (level === 'error' || this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }

    // En desarrollo, también loggear a consola
    if (process.env.NODE_ENV === 'development') {
      const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log';
      console[consoleMethod](`[${level.toUpperCase()}]`, message, context);
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = { ...context };

    if (error instanceof Error) {
      errorContext.errorMessage = error.message;
      errorContext.stackTrace = error.stack;
      errorContext.errorName = error.name;
    } else if (error) {
      errorContext.errorDetails = String(error);
    }

    this.log('error', message, errorContext);

    // En producción, también loggear al console.error (Vercel lo captura)
    if (process.env.NODE_ENV === 'production') {
      console.error(`[ERROR] ${message}`, errorContext.errorMessage || '');
    }
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      this.log('debug', message, context);
    }
  }

  /**
   * Log de llamadas API (para tracking de performance y errores)
   */
  apiCall(method: string, endpoint: string, statusCode?: number, duration?: number, error?: Error) {
    const context: LogContext = {
      method,
      endpoint,
      statusCode,
      duration,
    };

    if (error) {
      this.error(`API ${method} ${endpoint} failed`, error, context);
    } else if (statusCode && statusCode >= 400) {
      this.warn(`API ${method} ${endpoint} returned ${statusCode}`, context);
    } else {
      this.info(`API ${method} ${endpoint} completed`, context);
    }
  }

  private async flush() {
    if (this.buffer.length === 0) return;

    const logs = [...this.buffer];
    this.buffer = [];

    // En producción, enviar a backend (si está disponible)
    if (process.env.NODE_ENV === 'production') {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
        await fetch(`${apiUrl}/api/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ logs, source: 'frontend' }),
          keepalive: true,
        }).catch(() => {
          // Silently fail - no queremos logs infinitos si el endpoint no existe
        });
      } catch {
        // Ignorar errores de envío de logs
      }
    }
  }

  private getCurrentUserId(): string | undefined {
    try {
      if (typeof window === 'undefined') return undefined;
      const userStr = localStorage.getItem('auth_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user?.id;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Destruir el logger (para cleanup en tests)
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
    this.isInitialized = false;
  }
}

// Singleton instance
const loggerInstance = Logger.getInstance();

// Export compatible con la API anterior
export const logger = {
  info: (message: string, context?: LogContext) => loggerInstance.info(message, context),
  warn: (message: string, context?: LogContext) => loggerInstance.warn(message, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => loggerInstance.error(message, error, context),
  debug: (message: string, context?: LogContext) => loggerInstance.debug(message, context),
  apiCall: (method: string, endpoint: string, statusCode?: number, duration?: number, error?: Error) =>
    loggerInstance.apiCall(method, endpoint, statusCode, duration, error),
};

// Export para uso avanzado
export { Logger, loggerInstance };
export type { LogLevel, LogContext, LogEntry };
