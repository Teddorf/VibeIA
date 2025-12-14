'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { profileApi, githubApi } from '@/lib/api-client';

// ============================================
// TYPES
// ============================================

type OnboardingStep = 1 | 2 | 3;

interface OnboardingData {
  name: string;
  avatarFile: File | null;
  avatarPreview: string | null;
  role: string;
  experienceLevel: string;
  interests: string[];
}

interface StepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  errors: Record<string, string>;
}

// ============================================
// CONSTANTS
// ============================================

const ROLES = [
  { id: 'developer', label: 'Desarrollador' },
  { id: 'designer', label: 'Diseñador' },
  { id: 'product_manager', label: 'Product Manager' },
  { id: 'other', label: 'Otro' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Principiante', description: '0-2 años' },
  { id: 'intermediate', label: 'Intermedio', description: '2-5 años' },
  { id: 'advanced', label: 'Avanzado', description: '5+ años' },
];

const INTERESTS = [
  { id: 'web', label: 'Web Development' },
  { id: 'mobile', label: 'Mobile Apps' },
  { id: 'ai_ml', label: 'AI/ML' },
  { id: 'backend', label: 'Backend/APIs' },
  { id: 'devops', label: 'DevOps' },
  { id: 'data', label: 'Data Science' },
];

const STORAGE_KEY = 'onboarding_progress';

// ============================================
// ICONS
// ============================================

const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const CameraIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

// ============================================
// STEP COMPONENTS
// ============================================

function Step1Welcome({ data, updateData, errors }: StepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateData({ avatarFile: file });
      const reader = new FileReader();
      reader.onload = (e) => {
        updateData({ avatarPreview: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">¡Bienvenido a VibeCoding!</h2>
        <p className="mt-2 text-slate-400">Cuéntanos un poco sobre ti</p>
      </div>

      {/* Avatar Upload */}
      <div data-testid="avatar-upload" className="flex flex-col items-center space-y-3">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="relative w-24 h-24 rounded-full bg-slate-700 border-2 border-dashed border-slate-500 flex items-center justify-center cursor-pointer hover:border-purple-500 transition-colors overflow-hidden"
        >
          {data.avatarPreview ? (
            <img
              data-testid="avatar-preview"
              src={data.avatarPreview}
              alt="Avatar preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <UserIcon />
          )}
          <div className="absolute bottom-0 right-0 p-1 bg-purple-600 rounded-full">
            <CameraIcon />
          </div>
        </div>
        <input
          ref={fileInputRef}
          data-testid="avatar-input"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-sm text-slate-400">Haz clic para subir una foto</p>
      </div>

      {/* Name Input */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1">
          Nombre
        </label>
        <input
          id="name"
          type="text"
          value={data.name}
          onChange={(e) => updateData({ name: e.target.value })}
          placeholder="Tu nombre"
          className="w-full px-4 py-3 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-400">{errors.name}</p>
        )}
      </div>
    </div>
  );
}

function Step2Preferences({ data, updateData, errors }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Preferencias</h2>
        <p className="mt-2 text-slate-400">Personaliza tu experiencia</p>
      </div>

      {/* Role Selection */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-3">¿Cuál es tu rol?</p>
        <div className="grid grid-cols-2 gap-3">
          {ROLES.map((role) => (
            <label
              key={role.id}
              className={`
                flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                ${data.role === role.id
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                }
              `}
            >
              <input
                type="radio"
                name="role"
                value={role.id}
                checked={data.role === role.id}
                onChange={(e) => updateData({ role: e.target.value })}
                className="sr-only"
              />
              {role.label}
            </label>
          ))}
        </div>
        {errors.role && (
          <p className="mt-1 text-sm text-red-400">{errors.role}</p>
        )}
      </div>

      {/* Experience Level */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-3">Nivel de experiencia</p>
        <div className="space-y-2">
          {EXPERIENCE_LEVELS.map((level) => (
            <label
              key={level.id}
              className={`
                flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                ${data.experienceLevel === level.id
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                }
              `}
            >
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  name="experience"
                  value={level.id}
                  checked={data.experienceLevel === level.id}
                  onChange={(e) => updateData({ experienceLevel: e.target.value })}
                  className="sr-only"
                />
                <span className="text-white">{level.label}</span>
              </div>
              <span className="text-sm text-slate-400">{level.description}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Interests */}
      <div>
        <p className="text-sm font-medium text-slate-300 mb-3">¿Qué te interesa? (opcional)</p>
        <div className="grid grid-cols-2 gap-2">
          {INTERESTS.map((interest) => (
            <label
              key={interest.id}
              className={`
                flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all
                ${data.interests.includes(interest.id)
                  ? 'border-purple-500 bg-purple-500/20'
                  : 'border-slate-600 bg-slate-700/50 hover:border-slate-500'
                }
              `}
            >
              <input
                type="checkbox"
                checked={data.interests.includes(interest.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    updateData({ interests: [...data.interests, interest.id] });
                  } else {
                    updateData({ interests: data.interests.filter((i) => i !== interest.id) });
                  }
                }}
                className="sr-only"
              />
              <span className={`text-sm ${data.interests.includes(interest.id) ? 'text-white' : 'text-slate-300'}`}>
                {interest.label}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3Integrations({ data, updateData }: StepProps) {
  const { user } = useAuth();
  const [isConnecting, setIsConnecting] = useState(false);
  const isGitHubConnected = !!user?.githubId;

  const handleConnectGitHub = async () => {
    setIsConnecting(true);
    try {
      const { url } = await githubApi.getAuthUrl();
      window.location.href = url;
    } catch (error) {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Conectar integraciones</h2>
        <p className="mt-2 text-slate-400">Conecta tus herramientas favoritas (opcional)</p>
      </div>

      {/* GitHub Connection */}
      <div className="p-4 rounded-lg border border-slate-600 bg-slate-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-800 rounded-lg">
              <GitHubIcon />
            </div>
            <div>
              <p className="font-medium text-white">GitHub</p>
              <p className="text-sm text-slate-400">Importa repositorios y sincroniza código</p>
            </div>
          </div>
          {isGitHubConnected ? (
            <span className="flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">
              <CheckIcon />
              Conectado
            </span>
          ) : (
            <button
              onClick={handleConnectGitHub}
              disabled={isConnecting}
              className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {isConnecting ? 'Conectando...' : 'Conectar con GitHub'}
            </button>
          )}
        </div>
      </div>

      {/* Skip message */}
      <p className="text-center text-sm text-slate-400">
        Puedes conectar más integraciones después desde la configuración
      </p>
    </div>
  );
}

// ============================================
// STEP INDICATOR
// ============================================

function StepIndicator({ currentStep }: { currentStep: OnboardingStep }) {
  const steps = [
    { step: 1, label: 'Perfil' },
    { step: 2, label: 'Preferencias' },
    { step: 3, label: 'Integraciones' },
  ];

  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map(({ step, label }, index) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div
              data-testid={`step-indicator-${step}`}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                ${currentStep >= step
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-400'
                }
                ${currentStep === step ? 'active ring-2 ring-purple-400 ring-offset-2 ring-offset-slate-800' : ''}
              `}
            >
              {currentStep > step ? <CheckIcon /> : step}
            </div>
            <span className="mt-1 text-xs text-slate-400">{label}</span>
          </div>
          {index < steps.length - 1 && (
            <div className={`w-12 h-0.5 ${currentStep > step ? 'bg-purple-600' : 'bg-slate-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ============================================
// SUCCESS ANIMATION
// ============================================

function SuccessAnimation() {
  return (
    <div data-testid="success-animation" className="flex flex-col items-center justify-center py-12 space-y-4">
      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center animate-bounce">
        <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-white">¡Todo listo!</h2>
      <p className="text-slate-400">Redirigiendo al dashboard...</p>
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function OnboardingPage() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [data, setData] = useState<OnboardingData>({
    name: user?.name || '',
    avatarFile: null,
    avatarPreview: null,
    role: '',
    experienceLevel: '',
    interests: [],
  });

  // Load saved progress
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const { step, data: savedData } = JSON.parse(saved);
        setCurrentStep(step);
        setData((prev) => ({ ...prev, ...savedData }));
      } catch {
        // Ignore invalid data
      }
    }
  }, []);

  // Save progress on change
  useEffect(() => {
    const toSave = {
      step: currentStep,
      data: {
        name: data.name,
        role: data.role,
        experienceLevel: data.experienceLevel,
        interests: data.interests,
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [currentStep, data]);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const validateStep = useCallback((step: OnboardingStep): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!data.name.trim()) {
        newErrors.name = 'El nombre es requerido';
      } else if (data.name.trim().length < 3) {
        newErrors.name = 'El nombre debe tener al menos 3 caracteres';
      }
    }

    if (step === 2) {
      if (!data.role) {
        newErrors.role = 'Selecciona tu rol';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [data]);

  const handleNext = useCallback(() => {
    if (!validateStep(currentStep)) return;

    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as OnboardingStep);
    }
  }, [currentStep, validateStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as OnboardingStep);
    }
  }, [currentStep]);

  const handleComplete = useCallback(async () => {
    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    setError(null);

    try {
      // Upload avatar if provided
      let avatarUrl: string | undefined;
      if (data.avatarFile) {
        const result = await profileApi.uploadAvatar(data.avatarFile);
        avatarUrl = result.avatarUrl;
      }

      // Update profile
      await profileApi.updateProfile({
        name: data.name,
        avatarUrl,
      });

      // Update preferences
      await profileApi.updatePreferences({
        role: data.role,
        experienceLevel: data.experienceLevel,
        interests: data.interests,
      });

      // Clear saved progress
      localStorage.removeItem(STORAGE_KEY);

      // Refresh user data
      await refreshUser?.();

      // Show success and redirect
      setIsComplete(true);
      setTimeout(() => {
        router.replace('/dashboard');
      }, 1500);
    } catch (err) {
      setError('Error al guardar los datos. Intenta de nuevo.');
      setIsLoading(false);
    }
  }, [currentStep, data, validateStep, router, refreshUser]);

  const handleSkip = useCallback(() => {
    localStorage.setItem('onboarding_skipped', 'true');
    localStorage.removeItem(STORAGE_KEY);
    router.replace('/dashboard');
  }, [router]);

  // Show success animation
  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="w-full max-w-md p-8 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl">
          <SuccessAnimation />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-12 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Step Indicator */}
        <StepIndicator currentStep={currentStep} />

        {/* Main Card */}
        <div className="p-8 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-2xl">
          {/* Error message */}
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm">
              {error}
            </div>
          )}

          {/* Step Content */}
          {currentStep === 1 && <Step1Welcome data={data} updateData={updateData} errors={errors} />}
          {currentStep === 2 && <Step2Preferences data={data} updateData={updateData} errors={errors} />}
          {currentStep === 3 && <Step3Integrations data={data} updateData={updateData} errors={errors} />}

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between">
            {currentStep > 1 ? (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Volver
              </button>
            ) : (
              <div />
            )}

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-cyan-500 transition-all"
              >
                Continuar
              </button>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={handleSkip}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Omitir por ahora
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isLoading}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-semibold rounded-lg hover:from-purple-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? 'Guardando...' : 'Finalizar'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Skip link */}
        <div className="text-center">
          <button
            onClick={handleSkip}
            className="text-sm text-slate-400 hover:text-purple-400 transition-colors"
          >
            Completar después
          </button>
        </div>
      </div>
    </div>
  );
}
