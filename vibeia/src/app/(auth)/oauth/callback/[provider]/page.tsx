'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useParams } from 'next/navigation';

// ============================================
// TYPES
// ============================================

type OAuthStatus = 'loading' | 'success' | 'error';
type OAuthProvider = 'github' | 'google' | 'gitlab';

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
// CALLBACK CONTENT COMPONENT
// ============================================

function OAuthCallbackContent() {
  const params = useParams();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<OAuthStatus>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [providerName, setProviderName] = useState<string>('');

  useEffect(() => {
    const processCallback = () => {
      const provider = params?.provider as string;

      // Get params from URL
      const oauthSuccess = searchParams?.get('oauth_success');
      const errorParam = searchParams?.get('error');
      const accessToken = searchParams?.get('access_token');
      const refreshToken = searchParams?.get('refresh_token');
      const userBase64 = searchParams?.get('user');

      // Validate provider
      if (!provider || !VALID_PROVIDERS.includes(provider as OAuthProvider)) {
        setErrorMessage('Proveedor no soportado');
        setStatus('error');
        return;
      }

      setProviderName(PROVIDER_NAMES[provider as OAuthProvider]);

      // Check for OAuth errors
      if (errorParam) {
        setErrorMessage(decodeURIComponent(errorParam));
        setStatus('error');

        // Notify opener window of error
        if (window.opener) {
          window.opener.postMessage({
            type: 'oauth_error',
            provider,
            error: decodeURIComponent(errorParam),
          }, window.location.origin);
        }
        return;
      }

      // Check for success with tokens
      if (oauthSuccess === 'true' && accessToken && refreshToken && userBase64) {
        try {
          const user = JSON.parse(atob(userBase64));

          // Store tokens in localStorage
          localStorage.setItem('auth_token', accessToken);
          localStorage.setItem('refresh_token', refreshToken);
          localStorage.setItem('auth_user', JSON.stringify(user));

          // Clean up OAuth state
          localStorage.removeItem('oauth_state');

          setStatus('success');

          // Notify opener window of success
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth_success',
              provider,
              user,
            }, window.location.origin);

            // Close popup after delay
            setTimeout(() => {
              window.close();
            }, 2000);
          } else {
            // If no opener (direct navigation), redirect to dashboard
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 2000);
          }
        } catch (err) {
          setErrorMessage('Error al procesar la respuesta de autenticacion');
          setStatus('error');
        }
      } else {
        setErrorMessage('Respuesta de autenticacion incompleta');
        setStatus('error');
      }
    };

    processCallback();
  }, [params, searchParams]);

  const handleClose = () => {
    if (window.opener) {
      window.close();
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl text-center">
      {/* Loading State */}
      {status === 'loading' && (
        <div data-testid="oauth-loading" className="space-y-4">
          <div className="flex justify-center">
            <LoadingSpinner />
          </div>
          <h1 className="text-xl font-semibold text-white">
            Verificando autenticacion
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
            Autenticacion exitosa!
          </h1>
          <p className="text-slate-400">
            {window.opener
              ? 'Puedes cerrar esta ventana. Seras redirigido automaticamente...'
              : 'Redirigiendo al dashboard...'}
          </p>
          <p className="text-green-400 text-sm">
            Conectado con {providerName}
          </p>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="space-y-6">
          <div className="flex justify-center">
            <ErrorIcon />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-white">
              Error de autenticacion
            </h1>
            <p className="text-red-400">
              {errorMessage}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:from-purple-500 hover:to-cyan-500 transition-all"
          >
            {window.opener ? 'Cerrar ventana' : 'Volver al inicio'}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// FALLBACK COMPONENT
// ============================================

function CallbackFallback() {
  return (
    <div className="w-full max-w-md p-8 space-y-6 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl text-center">
      <div className="flex justify-center">
        <LoadingSpinner />
      </div>
      <h1 className="text-xl font-semibold text-white">
        Procesando autenticacion...
      </h1>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function OAuthCallbackPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Suspense fallback={<CallbackFallback />}>
        <OAuthCallbackContent />
      </Suspense>
    </div>
  );
}
