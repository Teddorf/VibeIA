/**
 * Sistema centralizado de manejo de errores HTTP
 * Proporciona tipos, clases y utilidades para manejo consistente de errores
 */

export enum ErrorCode {
  // 4xx Client Errors
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  RATE_LIMITED = 'RATE_LIMITED',

  // 5xx Server Errors
  SERVER_ERROR = 'SERVER_ERROR',
  BAD_GATEWAY = 'BAD_GATEWAY',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',

  // Network Errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  CANCELLED = 'CANCELLED',

  // Validation Errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Unknown
  UNKNOWN = 'UNKNOWN',
}

// Mensajes user-friendly en español
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.BAD_REQUEST]: 'Los datos enviados son inválidos',
  [ErrorCode.UNAUTHORIZED]: 'Tu sesión expiró. Por favor inicia sesión nuevamente',
  [ErrorCode.FORBIDDEN]: 'No tienes permisos para realizar esta acción',
  [ErrorCode.NOT_FOUND]: 'El recurso solicitado no fue encontrado',
  [ErrorCode.METHOD_NOT_ALLOWED]: 'Método no permitido',
  [ErrorCode.CONFLICT]: 'Ya existe un recurso con estos datos',
  [ErrorCode.UNPROCESSABLE_ENTITY]: 'No se pudo procesar la solicitud',
  [ErrorCode.RATE_LIMITED]: 'Demasiadas solicitudes. Intenta en unos momentos',
  [ErrorCode.SERVER_ERROR]: 'Error en el servidor. Estamos trabajando para solucionarlo',
  [ErrorCode.BAD_GATEWAY]: 'Error de conexión con el servidor',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'El servicio no está disponible temporalmente',
  [ErrorCode.GATEWAY_TIMEOUT]: 'El servidor tardó demasiado en responder',
  [ErrorCode.NETWORK_ERROR]: 'Sin conexión a internet. Verifica tu red',
  [ErrorCode.TIMEOUT]: 'La solicitud tardó demasiado. Intenta nuevamente',
  [ErrorCode.CANCELLED]: 'La solicitud fue cancelada',
  [ErrorCode.VALIDATION_ERROR]: 'Por favor revisa los datos ingresados',
  [ErrorCode.UNKNOWN]: 'Ocurrió un error inesperado',
};

export interface ValidationError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: ValidationError[] | Record<string, unknown>;
  public readonly endpoint?: string;
  public readonly method?: string;
  public readonly timestamp: Date;
  public readonly retryAfter?: number;

  constructor(
    statusCode: number,
    code: ErrorCode,
    message: string,
    details?: ValidationError[] | Record<string, unknown>,
    endpoint?: string,
    method?: string,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.endpoint = endpoint;
    this.method = method;
    this.timestamp = new Date();
    this.retryAfter = retryAfter;

    // Mantener stack trace correcto en V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  get isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  get isServerError(): boolean {
    return this.statusCode >= 500;
  }

  get isNetworkError(): boolean {
    return [ErrorCode.NETWORK_ERROR, ErrorCode.TIMEOUT, ErrorCode.CANCELLED].includes(this.code);
  }

  get isRetryable(): boolean {
    return (
      this.isNetworkError ||
      this.code === ErrorCode.RATE_LIMITED ||
      this.code === ErrorCode.SERVICE_UNAVAILABLE ||
      this.code === ErrorCode.GATEWAY_TIMEOUT ||
      this.code === ErrorCode.BAD_GATEWAY
    );
  }

  get isAuthError(): boolean {
    return this.code === ErrorCode.UNAUTHORIZED || this.code === ErrorCode.FORBIDDEN;
  }

  get userMessage(): string {
    return this.message || ERROR_MESSAGES[this.code] || ERROR_MESSAGES[ErrorCode.UNKNOWN];
  }

  toJSON() {
    return {
      name: this.name,
      statusCode: this.statusCode,
      code: this.code,
      message: this.message,
      details: this.details,
      endpoint: this.endpoint,
      method: this.method,
      timestamp: this.timestamp.toISOString(),
      retryAfter: this.retryAfter,
    };
  }
}

/**
 * Parsea cualquier error a ApiError para manejo consistente
 */
export function parseApiError(error: unknown): ApiError {
  // Ya es ApiError
  if (error instanceof ApiError) {
    return error;
  }

  // Error de Axios con response
  if (isAxiosError(error) && error.response) {
    const { status, data, headers } = error.response;
    const endpoint = error.config?.url;
    const method = error.config?.method?.toUpperCase();

    let code: ErrorCode;
    let message: string;
    let details: ValidationError[] | Record<string, unknown> | undefined;
    let retryAfter: number | undefined;

    // Extraer mensaje del backend si existe (asegurar que sea string)
    const backendMessage = typeof data?.message === 'string'
      ? data.message
      : typeof data?.error === 'string'
        ? data.error
        : undefined;

    // Helper para extraer details de forma segura
    const extractDetails = (): ValidationError[] | Record<string, unknown> | undefined => {
      const possibleDetails = data?.errors || data?.details;
      if (Array.isArray(possibleDetails) || (typeof possibleDetails === 'object' && possibleDetails !== null)) {
        return possibleDetails as ValidationError[] | Record<string, unknown>;
      }
      return undefined;
    };

    switch (status) {
      case 400:
        code = ErrorCode.BAD_REQUEST;
        message = backendMessage || ERROR_MESSAGES[ErrorCode.BAD_REQUEST];
        details = extractDetails();
        break;
      case 401:
        code = ErrorCode.UNAUTHORIZED;
        message = ERROR_MESSAGES[code];
        break;
      case 403:
        code = ErrorCode.FORBIDDEN;
        message = backendMessage || ERROR_MESSAGES[code];
        break;
      case 404:
        code = ErrorCode.NOT_FOUND;
        message = backendMessage || ERROR_MESSAGES[code];
        break;
      case 405:
        code = ErrorCode.METHOD_NOT_ALLOWED;
        message = ERROR_MESSAGES[code];
        break;
      case 409:
        code = ErrorCode.CONFLICT;
        message = backendMessage || ERROR_MESSAGES[code];
        break;
      case 422:
        code = ErrorCode.UNPROCESSABLE_ENTITY;
        message = backendMessage || ERROR_MESSAGES[code];
        details = extractDetails();
        break;
      case 429:
        code = ErrorCode.RATE_LIMITED;
        message = ERROR_MESSAGES[code];
        retryAfter = parseInt(headers?.['retry-after'] || '5', 10);
        break;
      case 500:
        code = ErrorCode.SERVER_ERROR;
        message = ERROR_MESSAGES[code];
        break;
      case 502:
        code = ErrorCode.BAD_GATEWAY;
        message = ERROR_MESSAGES[code];
        break;
      case 503:
        code = ErrorCode.SERVICE_UNAVAILABLE;
        message = ERROR_MESSAGES[code];
        retryAfter = parseInt(headers?.['retry-after'] || '30', 10);
        break;
      case 504:
        code = ErrorCode.GATEWAY_TIMEOUT;
        message = ERROR_MESSAGES[code];
        break;
      default:
        code = status >= 500 ? ErrorCode.SERVER_ERROR : ErrorCode.UNKNOWN;
        message = backendMessage || `Error ${status}: ${data?.error || 'Desconocido'}`;
    }

    return new ApiError(status, code, message, details, endpoint, method, retryAfter);
  }

  // Error de Axios sin response (network error)
  if (isAxiosError(error) && error.request) {
    const endpoint = error.config?.url;
    const method = error.config?.method?.toUpperCase();

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return new ApiError(0, ErrorCode.TIMEOUT, ERROR_MESSAGES[ErrorCode.TIMEOUT], undefined, endpoint, method);
    }

    if (error.code === 'ERR_CANCELED') {
      return new ApiError(0, ErrorCode.CANCELLED, ERROR_MESSAGES[ErrorCode.CANCELLED], undefined, endpoint, method);
    }

    return new ApiError(0, ErrorCode.NETWORK_ERROR, ERROR_MESSAGES[ErrorCode.NETWORK_ERROR], undefined, endpoint, method);
  }

  // Error genérico de JavaScript
  if (error instanceof Error) {
    return new ApiError(0, ErrorCode.UNKNOWN, error.message || ERROR_MESSAGES[ErrorCode.UNKNOWN]);
  }

  // Cualquier otra cosa
  return new ApiError(0, ErrorCode.UNKNOWN, typeof error === 'string' ? error : ERROR_MESSAGES[ErrorCode.UNKNOWN]);
}

/**
 * Type guard para errores de Axios
 */
function isAxiosError(error: unknown): error is {
  response?: {
    status: number;
    data: Record<string, unknown>;
    headers?: Record<string, string>;
  };
  request?: unknown;
  config?: {
    url?: string;
    method?: string;
  };
  code?: string;
  message?: string;
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    ('response' in error || 'request' in error || 'config' in error)
  );
}

/**
 * Obtiene el mensaje user-friendly para un código de error
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[ErrorCode.UNKNOWN];
}

/**
 * Helper para crear errores de validación
 */
export function createValidationError(errors: ValidationError[]): ApiError {
  return new ApiError(
    400,
    ErrorCode.VALIDATION_ERROR,
    ERROR_MESSAGES[ErrorCode.VALIDATION_ERROR],
    errors
  );
}
