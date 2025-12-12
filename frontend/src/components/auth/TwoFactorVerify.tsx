/**
 * TwoFactorVerify Component
 * 6-digit code input for 2FA verification during login
 */
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { authApi } from '@/lib/api-client';

// ============================================
// TYPES
// ============================================

interface TwoFactorVerifyProps {
  onSuccess: () => void;
  onCancel?: () => void;
  onUseBackupCode?: () => void;
}

// ============================================
// ICONS
// ============================================

const ShieldIcon = () => (
  <svg className="w-12 h-12 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LoadingSpinner = () => (
  <svg data-testid="loading-spinner" className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const TwoFactorVerify: React.FC<TwoFactorVerifyProps> = ({
  onSuccess,
  onCancel,
  onUseBackupCode,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Handle digit input
  const handleChange = useCallback((index: number, value: string) => {
    // Only accept single digit
    const digit = value.replace(/\D/g, '').slice(0, 1);

    setDigits((prev) => {
      const newDigits = [...prev];
      newDigits[index] = digit;
      return newDigits;
    });

    // Move to next input if digit entered
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Clear error on input
    if (error) setError(null);
  }, [error]);

  // Handle backspace
  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move to previous input and clear it
        setDigits((prev) => {
          const newDigits = [...prev];
          newDigits[index - 1] = '';
          return newDigits;
        });
        inputRefs.current[index - 1]?.focus();
      }
    }
  }, [digits]);

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length > 0) {
      const newDigits = Array(6).fill('');
      for (let i = 0; i < pastedData.length; i++) {
        newDigits[i] = pastedData[i];
      }
      setDigits(newDigits);

      // Focus last filled input or next empty one
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  }, []);

  // Verify code
  const handleVerify = useCallback(async () => {
    const code = digits.join('');
    if (code.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      await authApi.validate2FACode(code);
      onSuccess();
    } catch (err) {
      setError('Código inválido. Intenta de nuevo.');
      setDigits(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [digits, onSuccess]);

  const isComplete = digits.every((d) => d !== '');

  return (
    <div data-testid="2fa-verify-form" className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <ShieldIcon />
        </div>
        <h2 className="text-xl font-semibold text-white">
          Verificación en dos pasos
        </h2>
        <p className="text-slate-400 text-sm">
          Ingresa el código de 6 dígitos de tu aplicación de autenticación
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-400 text-sm text-center"
        >
          {error}
        </div>
      )}

      {/* Code Inputs */}
      <div className="flex justify-center gap-2">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            aria-label={`Dígito ${index + 1} de 6`}
            className="w-12 h-14 text-center text-xl font-bold rounded-lg bg-slate-700/50 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          />
        ))}
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={handleVerify}
          disabled={!isComplete || isLoading}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {isLoading ? <LoadingSpinner /> : 'Verificar'}
        </button>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-3 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Backup Code Option */}
      {onUseBackupCode && (
        <div className="text-center">
          <button
            onClick={onUseBackupCode}
            className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
          >
            ¿Usar código de respaldo?
          </button>
        </div>
      )}
    </div>
  );
};

export default TwoFactorVerify;
