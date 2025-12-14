'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import { ApiError, ErrorCode, parseApiError } from '@/lib/api-error';
import { logger } from '@/lib/logger';

interface UseApiErrorOptions {
  /**
   * Mensajes personalizados por código de error
   */
  messages?: Partial<Record<ErrorCode, string>>;

  /**
   * Callback cuando ocurre error 401 (Unauthorized)
   */
  onUnauthorized?: () => void;

  /**
   * Callback cuando ocurre error 403 (Forbidden)
   */
  onForbidden?: () => void;

  /**
   * Callback cuando ocurre error 404 (Not Found)
   */
  onNotFound?: () => void;

  /**
   * Callback cuando ocurre error 5xx (Server Error)
   */
  onServerError?: () => void;

  /**
   * Mostrar toast automáticamente (default: true)
   */
  showToast?: boolean;

  /**
   * Redirigir automáticamente a /login en 401 (default: true)
   */
  redirectOn401?: boolean;

  /**
   * Callback para retry
   */
  onRetry?: () => void;
}

interface HandleErrorResult {
  error: ApiError;
  shouldRetry: boolean;
}

/**
 * Hook para manejo centralizado de errores de API
 *
 * @example
 * ```tsx
 * const { handleError } = useApiError({
 *   onUnauthorized: () => console.log('Session expired'),
 *   messages: {
 *     [ErrorCode.NOT_FOUND]: 'El proyecto no existe',
 *   },
 * });
 *
 * try {
 *   await api.getProject(id);
 * } catch (error) {
 *   const { shouldRetry } = handleError(error);
 *   if (shouldRetry) {
 *     // Implement retry logic
 *   }
 * }
 * ```
 */
export function useApiError(options: UseApiErrorOptions = {}) {
  const router = useRouter();
  const toast = useToast();

  const {
    messages = {},
    onUnauthorized,
    onForbidden,
    onNotFound,
    onServerError,
    showToast = true,
    redirectOn401 = true,
    onRetry,
  } = options;

  const handleError = useCallback((error: unknown): HandleErrorResult => {
    const apiError = parseApiError(error);

    // Log el error
    logger.error('API Error handled', apiError, {
      endpoint: apiError.endpoint,
      method: apiError.method,
      statusCode: apiError.statusCode,
      errorCode: apiError.code,
    });

    // Mensaje a mostrar (custom o default)
    const message = messages[apiError.code] || apiError.userMessage;

    // Mostrar toast si está habilitado
    if (showToast) {
      const toastOptions: Parameters<typeof toast.error>[1] = {
        duration: apiError.isServerError ? 7000 : 5000,
      };

      // Agregar botón de retry si el error es retryable
      if (apiError.isRetryable && onRetry) {
        toastOptions.action = {
          label: 'Reintentar',
          onClick: onRetry,
        };
      }

      // Agregar descripción para errores específicos
      if (apiError.code === ErrorCode.NETWORK_ERROR) {
        toastOptions.description = 'Verifica tu conexión a internet';
      } else if (apiError.code === ErrorCode.RATE_LIMITED && apiError.retryAfter) {
        toastOptions.description = `Intenta de nuevo en ${apiError.retryAfter} segundos`;
      }

      toast.error(message, toastOptions);
    }

    // Handlers específicos por código
    switch (apiError.code) {
      case ErrorCode.UNAUTHORIZED:
        if (onUnauthorized) {
          onUnauthorized();
        } else if (redirectOn401) {
          // Guardar URL actual para volver después del login
          const currentPath = window.location.pathname + window.location.search;
          if (currentPath !== '/login' && currentPath !== '/register') {
            router.push(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
          }
        }
        break;

      case ErrorCode.FORBIDDEN:
        onForbidden?.();
        break;

      case ErrorCode.NOT_FOUND:
        onNotFound?.();
        break;

      case ErrorCode.SERVER_ERROR:
      case ErrorCode.BAD_GATEWAY:
      case ErrorCode.SERVICE_UNAVAILABLE:
      case ErrorCode.GATEWAY_TIMEOUT:
        onServerError?.();
        break;
    }

    return {
      error: apiError,
      shouldRetry: apiError.isRetryable,
    };
  }, [messages, onUnauthorized, onForbidden, onNotFound, onServerError, showToast, redirectOn401, onRetry, router, toast]);

  /**
   * Wrapper para llamadas API con manejo automático de errores
   */
  const withErrorHandling = useCallback(async <T>(
    apiCall: () => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: ApiError) => void;
      successMessage?: string;
    }
  ): Promise<T | null> => {
    try {
      const result = await apiCall();

      if (options?.successMessage) {
        toast.success(options.successMessage);
      }

      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const { error: apiError } = handleError(error);
      options?.onError?.(apiError);
      return null;
    }
  }, [handleError, toast]);

  return {
    handleError,
    withErrorHandling,
  };
}

/**
 * Hook simplificado para mostrar errores
 */
export function useErrorToast() {
  const toast = useToast();

  const showError = useCallback((message: string, description?: string) => {
    toast.error(message, { description });
  }, [toast]);

  const showSuccess = useCallback((message: string, description?: string) => {
    toast.success(message, { description });
  }, [toast]);

  const showWarning = useCallback((message: string, description?: string) => {
    toast.warning(message, { description });
  }, [toast]);

  const showInfo = useCallback((message: string, description?: string) => {
    toast.info(message, { description });
  }, [toast]);

  return {
    showError,
    showSuccess,
    showWarning,
    showInfo,
  };
}
