'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WizardMode, ExperienceLevel } from './hooks/useWizardMode';

interface WizardModeSelectorProps {
  onSelect: (mode: WizardMode) => void;
  userExperience?: ExperienceLevel | null;
  showChangeOption?: boolean;
}

interface ModeCardData {
  id: WizardMode;
  name: string;
  description: string;
  estimatedTime: string;
  idealFor: string;
  icon: string;
  features: string[];
}

const MODES: ModeCardData[] = [
  {
    id: 'guided',
    name: 'Guiado',
    description: 'Paso a paso con ayuda',
    estimatedTime: '~10 min',
    idealFor: 'Primera vez',
    icon: '🎯',
    features: ['Tutorial interactivo', 'Tooltips explicativos', 'Ejemplos en cada paso'],
  },
  {
    id: 'standard',
    name: 'Estándar',
    description: 'Flujo normal con opciones',
    estimatedTime: '~5 min',
    idealFor: 'La mayoría',
    icon: '⚡',
    features: ['4 etapas claras', 'Skip opcional', 'Recomendaciones de infra'],
  },
  {
    id: 'expert',
    name: 'Experto',
    description: 'Modo rápido sin fricciones',
    estimatedTime: '~1 min',
    idealFor: 'Devs senior',
    icon: '🚀',
    features: ['Una sola pantalla', 'Import YAML/JSON', 'Templates predefinidos'],
  },
];

const EXPERIENCE_TO_MODE: Record<ExperienceLevel, WizardMode> = {
  beginner: 'guided',
  intermediate: 'standard',
  advanced: 'expert',
};

const STORAGE_KEY = 'wizard_mode_preference';

export function WizardModeSelector({
  onSelect,
  userExperience,
  showChangeOption = false,
}: WizardModeSelectorProps) {
  const [rememberPreference, setRememberPreference] = useState(false);
  const [selectedMode, setSelectedMode] = useState<WizardMode | null>(null);
  const [autoSelected, setAutoSelected] = useState(false);

  // Check for saved preference on mount
  useEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY);
    if (savedMode && ['guided', 'standard', 'expert'].includes(savedMode)) {
      setAutoSelected(true);
      onSelect(savedMode as WizardMode);
    }
  }, [onSelect]);

  // Get recommended mode based on experience
  const getRecommendedMode = (): WizardMode | null => {
    if (!userExperience) return null;
    return EXPERIENCE_TO_MODE[userExperience];
  };

  const recommendedMode = getRecommendedMode();

  const handleModeSelect = useCallback(
    (mode: WizardMode) => {
      setSelectedMode(mode);

      if (rememberPreference) {
        localStorage.setItem(STORAGE_KEY, mode);
      }

      onSelect(mode);
    },
    [rememberPreference, onSelect],
  );

  const handleChangeMode = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setAutoSelected(false);
    setSelectedMode(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, mode: WizardMode) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleModeSelect(mode);
      }
    },
    [handleModeSelect],
  );

  // If showing change option (means user has saved preference)
  if (showChangeOption && autoSelected) {
    return (
      <div className="text-center py-4">
        <button
          onClick={handleChangeMode}
          className="text-purple-400 hover:text-purple-300 underline text-sm"
        >
          Cambiar modo
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">¿Cómo prefieres crear tu proyecto?</h2>
        <p className="text-slate-400">Elige el modo que mejor se adapte a tu experiencia</p>
      </div>

      {/* Mode Cards */}
      <div
        role="group"
        aria-label="Seleccionar modo del wizard"
        className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
      >
        {MODES.map((mode) => {
          const isRecommended = recommendedMode === mode.id;
          const isSelected = selectedMode === mode.id;

          return (
            <div
              key={mode.id}
              data-testid={`mode-${mode.id}`}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => handleModeSelect(mode.id)}
              onKeyDown={(e) => handleKeyDown(e, mode.id)}
              className={`
                relative p-6 rounded-xl border-2 cursor-pointer transition-all
                hover:border-purple-500 hover:bg-slate-800/50
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900
                ${isSelected ? 'border-purple-500 bg-slate-800/70' : 'border-slate-700 bg-slate-800/30'}
                ${isRecommended ? 'ring-2 ring-purple-500/50 suggested' : ''}
              `}
            >
              {/* Recommended Badge */}
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 text-xs font-medium bg-purple-500 text-white rounded-full">
                    Recomendado
                  </span>
                </div>
              )}

              {/* Icon */}
              <div data-testid="mode-icon" className="text-4xl mb-4 text-center">
                {mode.icon}
              </div>

              {/* Name */}
              <h3 className="text-lg font-semibold text-white text-center mb-2">{mode.name}</h3>

              {/* Description */}
              <p className="text-slate-400 text-sm text-center mb-3">{mode.description}</p>

              {/* Estimated Time */}
              <div className="text-center mb-4">
                <span className="text-purple-400 font-medium">{mode.estimatedTime}</span>
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-4">
                {mode.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center text-sm text-slate-300">
                    <svg
                      className="w-4 h-4 mr-2 text-green-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              {/* Ideal For */}
              <div className="text-center pt-3 border-t border-slate-700">
                <span className="text-xs text-slate-500">Ideal para: </span>
                <span className="text-xs text-slate-300">{mode.idealFor}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Remember Preference */}
      <div className="flex items-center justify-center">
        <label className="flex items-center cursor-pointer group">
          <input
            type="checkbox"
            checked={rememberPreference}
            onChange={(e) => setRememberPreference(e.target.checked)}
            aria-label="Recordar mi preferencia"
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-purple-500 focus:ring-purple-500 focus:ring-offset-slate-900"
          />
          <span className="ml-2 text-sm text-slate-400 group-hover:text-slate-300">
            Recordar mi preferencia
          </span>
        </label>
      </div>
    </div>
  );
}

export default WizardModeSelector;
