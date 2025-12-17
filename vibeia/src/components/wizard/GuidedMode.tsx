'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import {
  Rocket,
  ShoppingCart,
  Server,
  Layout,
  Smartphone,
  Settings,
  Info,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

export interface GuidedModeConfig {
  projectType: string;
  projectName: string;
  description: string;
  features: string[];
  stack: string;
  infra: string;
}

interface GuidedModeProps {
  onComplete: (config: GuidedModeConfig) => void;
  onBack?: () => void;
}

interface ProjectType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  suggestedFeatures: string[];
  aiMessage: string;
}

const PROJECT_TYPES: ProjectType[] = [
  {
    id: 'saas',
    name: 'SaaS',
    description: 'Software como servicio con suscripciones',
    icon: <Rocket className="w-6 h-6" />,
    suggestedFeatures: ['auth', 'payments', 'dashboard', 'api'],
    aiMessage: 'Los proyectos SaaS típicamente necesitan autenticación de usuarios, sistema de pagos y un dashboard administrativo.',
  },
  {
    id: 'ecommerce',
    name: 'E-commerce',
    description: 'Tienda online con carrito de compras',
    icon: <ShoppingCart className="w-6 h-6" />,
    suggestedFeatures: ['auth', 'payments', 'cart', 'inventory'],
    aiMessage: 'Para E-commerce recomiendo incluir carrito de compras, pagos seguros y gestión de inventario.',
  },
  {
    id: 'api',
    name: 'API',
    description: 'Backend API REST o GraphQL',
    icon: <Server className="w-6 h-6" />,
    suggestedFeatures: ['auth', 'docs', 'rate-limiting'],
    aiMessage: 'Una API robusta necesita autenticación, documentación automática y rate limiting.',
  },
  {
    id: 'landing',
    name: 'Landing',
    description: 'Página de aterrizaje promocional',
    icon: <Layout className="w-6 h-6" />,
    suggestedFeatures: ['analytics', 'forms', 'seo'],
    aiMessage: 'Las landings efectivas incluyen formularios de captura, analytics y optimización SEO.',
  },
  {
    id: 'mobile',
    name: 'Mobile',
    description: 'Aplicación móvil híbrida',
    icon: <Smartphone className="w-6 h-6" />,
    suggestedFeatures: ['auth', 'push-notifications', 'offline'],
    aiMessage: 'Apps móviles necesitan autenticación, notificaciones push y soporte offline.',
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Proyecto personalizado',
    icon: <Settings className="w-6 h-6" />,
    suggestedFeatures: [],
    aiMessage: 'Cuéntame más sobre tu proyecto para poder ayudarte mejor.',
  },
];

const TOTAL_STEPS = 6;

export function GuidedMode({ onComplete, onBack }: GuidedModeProps) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [aiResponse, setAiResponse] = useState<'yes' | 'no' | null>(null);

  const currentType = useMemo(() => {
    return PROJECT_TYPES.find((t) => t.id === selectedType);
  }, [selectedType]);

  const canProceed = useMemo(() => {
    switch (step) {
      case 1:
        return selectedType !== null;
      case 2:
        return projectName.trim().length > 0;
      default:
        return true;
    }
  }, [step, selectedType, projectName]);

  const handleTypeSelect = useCallback((typeId: string) => {
    setSelectedType(typeId);
    setAiResponse(null);
  }, []);

  const handleTypeKeyDown = useCallback(
    (e: React.KeyboardEvent, typeId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleTypeSelect(typeId);
      }
    },
    [handleTypeSelect]
  );

  const handleNext = () => {
    if (step < TOTAL_STEPS && canProceed) {
      setStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((prev) => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleAiYes = () => {
    setAiResponse('yes');
    if (currentType) {
      setSelectedFeatures(currentType.suggestedFeatures);
    }
  };

  const handleAiNo = () => {
    setAiResponse('no');
  };

  const getAiMessage = () => {
    if (!selectedType) {
      return 'Selecciona un tipo de proyecto para empezar. Te ayudaré a configurar todo paso a paso.';
    }

    if (step === 2 && currentType) {
      return `Para tu proyecto SaaS, te sugiero empezar con un nombre descriptivo que refleje su propósito.`;
    }

    if (aiResponse === 'yes') {
      return 'Excelente elección. He pre-seleccionado las features recomendadas para ti.';
    }

    if (aiResponse === 'no') {
      return 'Entendido. Puedes personalizar las features manualmente en el siguiente paso.';
    }

    return currentType?.aiMessage || '';
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Tipo de Proyecto</h2>
        <p className="text-muted-foreground">
          Selecciona el tipo que mejor describe tu proyecto
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {PROJECT_TYPES.map((type) => (
          <div
            key={type.id}
            data-testid={`type-${type.id}`}
            tabIndex={0}
            role="button"
            aria-pressed={selectedType === type.id}
            onClick={() => handleTypeSelect(type.id)}
            onKeyDown={(e) => handleTypeKeyDown(e, type.id)}
            className={cn(
              'relative p-4 rounded-lg border-2 cursor-pointer transition-all',
              'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary',
              selectedType === type.id
                ? 'border-primary bg-primary/5 selected'
                : 'border-border'
            )}
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                {type.icon}
              </div>
              <button
                data-testid={`info-icon-${type.id}`}
                className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                onClick={(e) => e.stopPropagation()}
              >
                <Info className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <h3 className="mt-3 font-semibold">{type.name}</h3>
            <p className="text-sm text-muted-foreground">{type.description}</p>
            <a
              href="#"
              className="text-xs text-primary hover:underline mt-2 inline-block"
              onClick={(e) => e.stopPropagation()}
            >
              Aprender más
            </a>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Detalles del Proyecto</h2>
        <p className="text-muted-foreground">
          Cuéntanos más sobre tu proyecto
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="project-name">Nombre del Proyecto</Label>
          <Input
            id="project-name"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            placeholder="Mi Proyecto Increíble"
          />
        </div>

        <div>
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe brevemente tu proyecto..."
            rows={4}
          />
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      default:
        return (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Paso {step} - En construcción
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with step indicator */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Paso {step} de {TOTAL_STEPS}
        </div>
        <button
          onClick={onBack}
          className="text-sm text-primary hover:underline"
        >
          Saltar al modo estándar
        </button>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content - 2 columns */}
        <div className="lg:col-span-2">{renderCurrentStep()}</div>

        {/* AI Assistant - 1 column */}
        <div
          data-testid="ai-assistant"
          className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-4 h-fit"
        >
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="font-medium">Asistente IA</span>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{getAiMessage()}</p>

          {selectedType && step === 1 && currentType && aiResponse === null && (
            <div className="space-y-2">
              <p className="text-sm font-medium">
                ¿Te gustaría que pre-configure las features sugeridas?
              </p>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAiYes}>
                  Sí
                </Button>
                <Button size="sm" variant="outline" onClick={handleAiNo}>
                  No
                </Button>
              </div>
            </div>
          )}

          {selectedType && currentType && (
            <div className="mt-4 pt-4 border-t border-primary/20">
              <p className="text-xs text-muted-foreground mb-2">
                Features sugeridas:
              </p>
              <div className="flex flex-wrap gap-1">
                {currentType.suggestedFeatures.map((f) => (
                  <span
                    key={f}
                    className="text-xs px-2 py-1 bg-primary/10 rounded-full"
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={step === 1 && !onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 1 ? 'Volver' : 'Atrás'}
        </Button>
        <Button onClick={handleNext} disabled={!canProceed}>
          Siguiente
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
