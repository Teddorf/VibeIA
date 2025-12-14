/**
 * TwoFactorSetup Component
 * Enable/disable Two-Factor Authentication
 */
'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { authApi } from '@/lib/api-client';

// ============================================
// TYPES
// ============================================

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onEnabled?: () => void;
  onDisabled?: () => void;
}

interface SetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

type SetupStep = 'initial' | 'setup' | 'verify' | 'backup' | 'disable';

// ============================================
// ICONS
// ============================================

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const LoadingSpinner = () => (
  <svg data-testid="loading-spinner" className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({
  isEnabled,
  onEnabled,
  onDisabled,
}) => {
  const [step, setStep] = useState<SetupStep>('initial');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const codeInputRef = useRef<HTMLInputElement>(null);

  // Focus verification input when shown
  useEffect(() => {
    if (step === 'setup' && codeInputRef.current) {
      codeInputRef.current.focus();
    }
  }, [step]);

  // Initialize 2FA setup
  const handleInitSetup = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authApi.setup2FA();
      setSetupData(response);
      setStep('setup');
    } catch (err) {
      setError('Error al iniciar la configuración');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify 2FA code
  const handleVerify = useCallback(async () => {
    if (!setupData || verificationCode.length !== 6) return;

    setIsLoading(true);
    setError(null);

    try {
      await authApi.verify2FA(verificationCode, setupData.secret);
      setStep('backup');
      onEnabled?.();
    } catch (err) {
      setError('Código inválido. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [verificationCode, setupData, onEnabled]);

  // Disable 2FA
  const handleDisable = useCallback(async () => {
    if (!password) return;

    setIsLoading(true);
    setError(null);

    try {
      await authApi.disable2FA(password);
      setStep('initial');
      setPassword('');
      onDisabled?.();
    } catch (err) {
      setError('Error al deshabilitar 2FA');
    } finally {
      setIsLoading(false);
    }
  }, [password, onDisabled]);

  // Copy secret to clipboard
  const handleCopySecret = useCallback(async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [setupData]);

  // Validate verification code (only digits, 6 chars)
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerificationCode(value);
  }, []);

  const isValidCode = verificationCode.length === 6;

  return (
    <div className="space-y-4">
      {/* Status Indicator */}
      <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
        <div className={`p-2 rounded-full ${isEnabled ? 'bg-green-600/20' : 'bg-slate-700'}`}>
          <ShieldIcon />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-white">Autenticación de dos factores</h3>
          <p data-testid="2fa-status" className="text-sm text-slate-400">
            {isEnabled ? 'Habilitado' : 'Deshabilitado'}
          </p>
        </div>
        {step === 'initial' && (
          <button
            onClick={isEnabled ? () => setStep('disable') : handleInitSetup}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isEnabled
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            } disabled:opacity-50`}
          >
            {isLoading ? <LoadingSpinner /> : isEnabled ? 'Deshabilitar' : 'Habilitar'}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-900/30 border border-red-700 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Setup Step - QR Code and Verification */}
      {step === 'setup' && setupData && (
        <div className="space-y-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <h4 className="font-medium text-white">Configurar autenticador</h4>
          <p className="text-sm text-slate-400">
            Escanea el código QR con tu aplicación de autenticación (Google Authenticator, Authy, etc.)
          </p>

          {/* QR Code */}
          <div className="flex justify-center p-4 bg-white rounded-lg">
            <img
              data-testid="qr-code"
              src={setupData.qrCodeUrl}
              alt="Código QR para 2FA"
              className="w-48 h-48"
            />
          </div>

          {/* Secret Key */}
          <div className="space-y-2">
            <p className="text-sm text-slate-400">
              O ingresa este código manualmente:
            </p>
            <div className="flex items-center gap-2">
              <code
                data-testid="secret-key"
                className="flex-1 p-3 rounded-lg bg-slate-900 text-purple-400 font-mono text-sm break-all"
              >
                {setupData.secret}
              </code>
              <button
                onClick={handleCopySecret}
                className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
                aria-label="Copiar código"
              >
                {copied ? <CheckIcon /> : <CopyIcon />}
              </button>
            </div>
          </div>

          {/* Verification Code Input */}
          <div className="space-y-2">
            <label htmlFor="verification-code" className="block text-sm font-medium text-slate-300">
              Código de verificación
            </label>
            <input
              ref={codeInputRef}
              id="verification-code"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Ingresa el código de 6 dígitos"
              value={verificationCode}
              onChange={handleCodeChange}
              className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 text-center text-lg tracking-widest"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep('initial');
                setSetupData(null);
                setVerificationCode('');
              }}
              className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleVerify}
              disabled={!isValidCode || isLoading}
              className="flex-1 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : 'Verificar'}
            </button>
          </div>
        </div>
      )}

      {/* Backup Codes Step */}
      {step === 'backup' && setupData && (
        <div className="space-y-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="flex items-center gap-2 text-green-400">
            <CheckIcon />
            <h4 className="font-medium">¡2FA habilitado correctamente!</h4>
          </div>
          <p className="text-sm text-slate-400">
            Guarda estos códigos de respaldo en un lugar seguro. Los necesitarás si pierdes acceso a tu autenticador.
          </p>

          {/* Backup Codes */}
          <div data-testid="backup-codes" className="grid grid-cols-2 gap-2">
            {setupData.backupCodes.map((code, index) => (
              <code
                key={index}
                className="p-2 rounded bg-slate-900 text-purple-400 font-mono text-center"
              >
                {code}
              </code>
            ))}
          </div>

          <button
            onClick={() => setStep('initial')}
            className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Disable Confirmation Modal */}
      {step === 'disable' && (
        <div data-testid="confirm-modal" className="space-y-4 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <h4 className="font-medium text-white">Confirmar deshabilitación</h4>
          <p className="text-sm text-slate-400">
            Ingresa tu contraseña para deshabilitar la autenticación de dos factores.
          </p>

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          <div className="flex gap-3">
            <button
              onClick={() => {
                setStep('initial');
                setPassword('');
              }}
              className="flex-1 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDisable}
              disabled={!password || isLoading}
              className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : 'Confirmar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TwoFactorSetup;
