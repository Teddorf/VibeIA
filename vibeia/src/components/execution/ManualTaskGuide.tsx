'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface RequiredInput {
  name: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'file';
  placeholder?: string;
  helpText?: string;
  validation?: {
    required?: boolean;
    pattern?: string;
    minLength?: number;
  };
}

interface ValidationResult {
  rule: string;
  passed: boolean;
  message: string;
}

interface ManualTask {
  id: string;
  type: string;
  title: string;
  description: string;
  instructions: string[];
  requiredInputs: RequiredInput[];
  estimatedMinutes: number;
  category: string;
}

interface ManualTaskGuideProps {
  task: ManualTask;
  onComplete: (inputs: Record<string, string>) => void;
  onSkip?: () => void;
  isValidating?: boolean;
  validationResults?: ValidationResult[];
}

export function ManualTaskGuide({
  task,
  onComplete,
  onSkip,
  isValidating = false,
  validationResults = [],
}: ManualTaskGuideProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [currentStep, setCurrentStep] = useState(0);

  const handleInputChange = (name: string, value: string) => {
    setInputs((prev) => ({ ...prev, [name]: value }));
  };

  const togglePasswordVisibility = (name: string) => {
    setShowPassword((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const handleSubmit = () => {
    onComplete(inputs);
  };

  const allRequiredFilled = task.requiredInputs
    .filter((input) => input.validation?.required)
    .every((input) => inputs[input.name]?.trim());

  const failedValidations = validationResults.filter((r) => !r.passed);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'api_setup':
        return '🔑';
      case 'environment':
        return '⚙️';
      case 'external_service':
        return '🌐';
      case 'manual_config':
        return '🛠️';
      case 'verification':
        return '✅';
      default:
        return '📋';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-2 border-yellow-500/50 bg-yellow-900/20">
      <CardHeader className="border-b border-yellow-500/30">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{getCategoryIcon(task.category)}</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-medium bg-yellow-500/20 text-yellow-300 rounded">
                MANUAL STEP REQUIRED
              </span>
              <span className="text-xs text-muted-foreground">~{task.estimatedMinutes} min</span>
            </div>
            <CardTitle className="text-xl mt-1">{task.title}</CardTitle>
            <CardDescription>{task.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Instructions */}
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <span>📝</span> Instructions
          </h4>
          <ol className="space-y-2">
            {task.instructions.map((instruction, idx) => (
              <li
                key={idx}
                className={`flex gap-3 p-2 rounded transition-colors ${
                  idx === currentStep ? 'bg-blue-900/20 border-l-2 border-blue-500' : ''
                }`}
                onClick={() => setCurrentStep(idx)}
              >
                <span
                  className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx < currentStep
                      ? 'bg-green-500 text-white'
                      : idx === currentStep
                        ? 'bg-blue-500 text-white'
                        : 'bg-slate-600/50 text-slate-300'
                  }`}
                >
                  {idx < currentStep ? '✓' : idx + 1}
                </span>
                <span className="text-sm">{instruction}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Required Inputs */}
        {task.requiredInputs.length > 0 && (
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <span>📥</span> Required Information
            </h4>
            <div className="space-y-4">
              {task.requiredInputs.map((input) => {
                const validation = validationResults.find((r) => r.rule === input.name);
                const hasError = validation && !validation.passed;

                return (
                  <div key={input.name} className="space-y-1">
                    <label className="text-sm font-medium flex items-center gap-1">
                      {input.label}
                      {input.validation?.required && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <Input
                        type={
                          input.type === 'password' && !showPassword[input.name]
                            ? 'password'
                            : 'text'
                        }
                        placeholder={input.placeholder}
                        value={inputs[input.name] || ''}
                        onChange={(e) => handleInputChange(input.name, e.target.value)}
                        className={hasError ? 'border-red-500' : ''}
                      />
                      {input.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(input.name)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          {showPassword[input.name] ? '🙈' : '👁️'}
                        </button>
                      )}
                    </div>
                    {input.helpText && (
                      <p className="text-xs text-muted-foreground">{input.helpText}</p>
                    )}
                    {hasError && <p className="text-xs text-red-500">{validation.message}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Validation Errors Summary */}
        {failedValidations.length > 0 && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
              <span>⚠️</span> Validation Failed
            </h4>
            <ul className="text-sm text-red-300 space-y-1">
              {failedValidations.map((v, idx) => (
                <li key={idx}>• {v.message}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          {onSkip && (
            <Button variant="ghost" onClick={onSkip} disabled={isValidating}>
              Skip for now
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button
              onClick={handleSubmit}
              disabled={!allRequiredFilled || isValidating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isValidating ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Validating...
                </>
              ) : (
                <>
                  <span className="mr-2">✓</span>
                  Complete & Continue
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
