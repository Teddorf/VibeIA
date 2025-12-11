'use client';

import { useEffect } from 'react';
import { logger } from '@/lib/logger';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Página de error global de Next.js
 * Se muestra cuando ocurre un error no manejado en una ruta
 */
export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log el error
    logger.error('Unhandled page error', error, {
      digest: error.digest,
    });
  }, [error]);

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
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Error inesperado
        </h1>

        {/* Description */}
        <p className="text-slate-400 mb-6">
          Ha ocurrido un problema al cargar esta pagina. Nuestro equipo ha sido
          notificado automaticamente.
        </p>

        {/* Error details (solo en desarrollo) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-slate-900/50 rounded-lg text-left overflow-auto max-h-32">
            <p className="text-red-400 text-sm font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-slate-500 text-xs mt-2">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium rounded-lg transition-all"
          >
            Intentar de nuevo
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all"
          >
            Ir al Dashboard
          </button>
        </div>

        {/* Reload hint */}
        <p className="mt-6 text-slate-500 text-sm">
          Si el problema persiste,{' '}
          <button
            onClick={() => window.location.reload()}
            className="text-purple-400 hover:text-purple-300 underline"
          >
            recarga la pagina
          </button>
        </p>
      </div>
    </div>
  );
}
