'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary global de Next.js (incluye el layout root)
 * Se muestra cuando ocurre un error en el layout principal
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log el error a console (no podemos usar el logger aquí porque
    // puede no estar inicializado si el error es en el layout)
    console.error('[GLOBAL ERROR]', error);
  }, [error]);

  return (
    <html lang="es">
      <body className="bg-slate-900">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 p-8 text-center">
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
                  d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-2">
              Error critico
            </h1>

            {/* Description */}
            <p className="text-slate-400 mb-6">
              Ha ocurrido un error grave en la aplicacion. Por favor, recarga
              la pagina para continuar.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={reset}
                className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-all"
              >
                Intentar de nuevo
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-all"
              >
                Ir al inicio
              </button>
            </div>

            {/* Error digest */}
            {error.digest && (
              <p className="mt-6 text-slate-600 text-xs">
                Codigo de error: {error.digest}
              </p>
            )}
          </div>
        </div>
      </body>
    </html>
  );
}
