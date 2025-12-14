'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api-client';

// ============================================
// TYPES
// ============================================

type VerificationStatus = 'loading' | 'success' | 'error';

interface VerificationError {
  code: string;
  message: string;
}

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
  <svg data-testid="success-icon" className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ErrorIcon = () => (
  <svg data-testid="error-icon" className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EmailIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

// ============================================
// ERROR MESSAGES
// ============================================

const ERROR_MESSAGES: Record<string, string> = {
  missing_token: 'Token no proporcionado',
  invalid_token: 'Token inválido o expirado',
  expired: 'El enlace ha expirado',
  already_verified: 'Este email ya ha sido verificado',
  network: 'Error de conexión',
  server: 'Error del servidor',
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [error, setError] = useState<VerificationError | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [showResendForm, setShowResendForm] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // Verify email on mount
  useEffect(() => {
    const verifyEmail = async () => {
      // Validate token presence
      if (!token || token.trim() === '') {
        setError({ code: 'missing_token', message: ERROR_MESSAGES.missing_token });
        setStatus('error');
        return;
      }

      // Basic token format validation (prevent XSS)
      const tokenPattern = /^[a-zA-Z0-9_-]+$/;
      if (!tokenPattern.test(token)) {
        setError({ code: 'invalid_token', message: ERROR_MESSAGES.invalid_token });
        setStatus('error');
        return;
      }

      try {
        await authApi.verifyEmail(token);
        setStatus('success');
      } catch (err: any) {
        const statusCode = err?.response?.status;
        let errorCode = 'server';

        if (statusCode === 400) errorCode = 'invalid_token';
        else if (statusCode === 410) errorCode = 'expired';
        else if (statusCode === 409) errorCode = 'already_verified';
        else if (!err.response) errorCode = 'network';

        setError({
          code: errorCode,
          message: err?.response?.data?.message || ERROR_MESSAGES[errorCode],
        });
        setStatus('error');
      }
    };

    verifyEmail();
  }, [token]);

  // Countdown and redirect after success
  useEffect(() => {
    if (status !== 'success') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.replace('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status, router]);

  // Handle resend verification email
  const handleResend = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;

    setResendStatus('loading');
    try {
      await authApi.resendVerificationEmail(resendEmail);
      setResendStatus('success');
    } catch {
      setResendStatus('error');
    }
  }, [resendEmail]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="w-full max-w-md p-8 space-y-6 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl text-center">
        {/* Loading State */}
        {status === 'loading' && (
          <div data-testid="verification-loading" className="space-y-4">
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
            <h1 className="text-xl font-semibold text-white">
              Verificando email
            </h1>
            <p className="text-slate-400">
              Por favor espera...
            </p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div role="status" className="space-y-4">
            <div className="flex justify-center">
              <SuccessIcon />
            </div>
            <h1 className="text-xl font-semibold text-white">
              ¡Email verificado!
            </h1>
            <p className="text-slate-400">
              Tu email ha sido verificado exitosamente.
            </p>
            <p className="text-sm text-slate-500">
              Redirigiendo en {countdown} segundos...
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 py-3 px-6 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:from-purple-500 hover:to-cyan-500 transition-all"
            >
              Iniciar sesión
            </Link>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && error && (
          <div role="status" className="space-y-6">
            <div className="flex justify-center">
              <ErrorIcon />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-white">
                Error de verificación
              </h1>
              <p className="text-red-400">
                {error.message}
              </p>
            </div>

            {/* Resend Form */}
            {!showResendForm ? (
              <div className="space-y-3">
                <button
                  onClick={() => setShowResendForm(true)}
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:from-purple-500 hover:to-cyan-500 transition-all"
                >
                  Reenviar email de verificación
                </button>
                <Link
                  href="/login"
                  className="block text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-4">
                <div className="text-left">
                  <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <EmailIcon />
                    </div>
                    <input
                      id="email"
                      type="email"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      required
                      placeholder="tu@email.com"
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {resendStatus === 'success' && (
                  <p className="text-green-400 text-sm">
                    ¡Email enviado! Revisa tu bandeja de entrada.
                  </p>
                )}

                {resendStatus === 'error' && (
                  <p className="text-red-400 text-sm">
                    Error al enviar el email. Intenta de nuevo.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={resendStatus === 'loading'}
                  className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {resendStatus === 'loading' ? 'Enviando...' : 'Reenviar email'}
                </button>

                <button
                  type="button"
                  onClick={() => setShowResendForm(false)}
                  className="block w-full text-purple-400 hover:text-purple-300 transition-colors"
                >
                  Cancelar
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
