'use client';

import React, { Component, ReactNode } from 'react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary global para capturar errores de renderizado de React
 * Muestra una UI de fallback amigable cuando algo sale mal
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log a sistema de monitoreo
    logger.error('React Error Boundary caught error', error, {
      componentStack: errorInfo.componentStack || undefined,
    });

    this.setState({ errorInfo });

    // Callback opcional
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    // Usar fallback custom si se proporciona
    if (this.props.fallback) {
      return this.props.fallback;
    }

    // Fallback por defecto
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 text-center">
          {/* Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-2">
            Algo salio mal
          </h1>

          {/* Description */}
          <p className="text-slate-400 mb-6">
            Ha ocurrido un error inesperado. Nuestro equipo ha sido notificado y estamos
            trabajando para solucionarlo.
          </p>

          {/* Error details (solo en desarrollo) */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <div className="mb-6 p-4 bg-slate-900/50 rounded-lg text-left overflow-auto max-h-40">
              <p className="text-red-400 text-sm font-mono break-all">
                {this.state.error.message}
              </p>
              {this.state.errorInfo?.componentStack && (
                <pre className="text-slate-500 text-xs mt-2 whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all"
            >
              Intentar de nuevo
            </button>
            <button
              onClick={this.handleGoHome}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all"
            >
              Ir al Dashboard
            </button>
          </div>

          {/* Reload hint */}
          <p className="mt-6 text-slate-500 text-sm">
            Si el problema persiste,{' '}
            <button
              onClick={this.handleReload}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              recarga la pagina
            </button>
          </p>
        </div>
      </div>
    );
  }
}

/**
 * HOC para envolver componentes con Error Boundary
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WithErrorBoundary = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithErrorBoundary;
}

/**
 * Error Boundary para secciones específicas (no toda la página)
 * Muestra un mensaje más pequeño y permite reintentar
 */
export function SectionErrorBoundary({
  children,
  fallbackMessage = 'Error al cargar esta sección',
}: {
  children: ReactNode;
  fallbackMessage?: string;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 text-red-400 mb-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="font-medium">{fallbackMessage}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="text-sm text-red-300 hover:text-red-200 underline"
          >
            Recargar pagina
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}

export default ErrorBoundary;
