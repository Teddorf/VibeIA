'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api-client';

// ============================================
// TYPES
// ============================================

type OAuthStatus = 'loading' | 'success' | 'error';
type OAuthProvider = 'github' | 'google' | 'gitlab';

interface OAuthError {
  code: string;
  message: string;
}

const VALID_PROVIDERS: OAuthProvider[] = ['github', 'google', 'gitlab'];

const PROVIDER_NAMES: Record<OAuthProvider, string> = {
  github: 'GitHub',
  google: 'Google',
  gitlab: 'GitLab',
};

// ============================================
// ICONS
// ============================================

const LoadingSpinner = () => (
  <svg data-testid="loading-spinner" className="animate-spin w-12 h-12 text-purple-500" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
  </svg>
);

const SuccessIcon = () => (
  <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ============================================
// ERROR MESSAGES
// ============================================

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: 'Código de autorización no encontrado',
  state_mismatch: 'Error de seguridad: El estado no coincide',
  invalid_provider: 'Proveedor no soportado',
  access_denied: 'Autenticación cancelada',
  invalid_code: 'Error de autenticación: Código inválido',
  server_error: 'Error del servidor',
  network_error: 'Error de conexión',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function OAuthCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<OAuthStatus>('loading');
  const [error, setError] = useState<OAuthError | null>(null);
  const [providerName, setProviderName] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      const provider = params?.provider as string;
      const code = searchParams?.get('code');
      const state = searchParams?.get('state');
      const errorParam = searchParams?.get('error');
      const errorDescription = searchParams?.get('error_description');

      // Validate provider
      if (!provider || !VALID_PROVIDERS.includes(provider as OAuthProvider)) {
        setError({ code: 'invalid_provider', message: ERROR_MESSAGES.invalid_provider });
        setStatus('error');
        return;
      }

      setProviderName(PROVIDER_NAMES[provider as OAuthProvider]);

      // Check for OAuth errors from provider
      if (errorParam) {
        setError({
          code: errorParam,
          message: errorParam === 'access_denied'
            ? ERROR_MESSAGES.access_denied
            : errorDescription || ERROR_MESSAGES.server_error,
        });
        setStatus('error');
        return;
      }

      // Validate code
      if (!code) {
        setError({ code: 'missing_code', message: ERROR_MESSAGES.missing_code });
        setStatus('error');
        return;
      }

      // Validate state (CSRF protection)
      const storedState = localStorage.getItem('oauth_state');
      if (!storedState || storedState !== state) {
        setError({ code: 'state_mismatch', message: ERROR_MESSAGES.state_mismatch });
        setStatus('error');
        localStorage.removeItem('oauth_state');
        return;
      }

      try {
        // Exchange code for tokens
        const result = await authApi.oauthCallback(provider, code);

        // Store tokens
        localStorage.setItem('auth_token', result.accessToken);
        if (result.refreshToken) {
          localStorage.setItem('refresh_token', result.refreshToken);
        }

        // Clean up OAuth state
        localStorage.removeItem('oauth_state');

        // Update status
        setStatus('success');

        // Redirect based on user status
        setTimeout(() => {
          if (result.isNewUser) {
            router.replace('/onboarding');
          } else {
            router.replace('/dashboard');
          }
        }, 1500);
      } catch (err: any) {
        localStorage.removeItem('oauth_state');

        const errorCode = err?.response?.status === 400 ? 'invalid_code' : 'server_error';
        setError({
          code: errorCode,
          message: err?.response?.data?.message || ERROR_MESSAGES[errorCode],
        });
        setStatus('error');
      }
    };

    processCallback();
  }, [params, searchParams, router]);

  const handleRetry = () => {
    router.push('/login');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl text-center">
        {/* Loading State */}
        {status === 'loading' && (
          <div data-testid="oauth-loading" className="space-y-4">
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
            <h1 className="text-xl font-semibold text-white">
              Verificando autenticación
            </h1>
            {providerName && (
              <p className="text-slate-400">
                Conectando con {providerName}...
              </p>
            )}
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <SuccessIcon />
            </div>
            <h1 className="text-xl font-semibold text-white">
              ¡Autenticación exitosa!
            </h1>
            <p className="text-slate-400">
              Redirigiendo...
            </p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && error && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <ErrorIcon />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-white">
                Error de autenticación
              </h1>
              <p className="text-red-400">
                {error.message}
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:from-purple-500 hover:to-cyan-500 transition-all"
              >
                Intentar de nuevo
              </button>
              <Link
                href="/login"
                className="block text-purple-400 hover:text-purple-300 transition-colors"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
