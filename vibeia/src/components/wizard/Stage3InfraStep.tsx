'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { recommendationsApi } from '@/lib/api-client';

interface Provider {
  id: string;
  name: string;
  type: string;
  description: string;
  pros: string[];
  cons: string[];
  pricing: Record<string, string>;
  recommended: boolean;
}

interface CostEstimate {
  monthly: {
    database: number;
    deploy: number;
    total: number;
  };
  phases: {
    mvp: { monthly: number; database: number; deploy: number };
    growth: { monthly: number; database: number; deploy: number };
    scale: { monthly: number; database: number; deploy: number };
  };
  savingsVsAWS: number;
}

interface Stage3InfraStepProps {
  context: {
    projectName: string;
    description: string;
    techStack?: string[];
    scale?: string;
    stage2Data?: Record<string, string>;
  };
  onNext: (data: {
    database?: Provider;
    deploy?: Provider;
    costEstimate?: CostEstimate;
    autoDetect: boolean;
  }) => void;
  onBack: () => void;
}

export function Stage3InfraStep({ context, onNext, onBack }: Stage3InfraStepProps) {
  // State
  const [databaseProviders, setDatabaseProviders] = useState<Provider[]>([]);
  const [deployProviders, setDeployProviders] = useState<Provider[]>([]);
  const [selectedDatabase, setSelectedDatabase] = useState<Provider | null>(null);
  const [selectedDeploy, setSelectedDeploy] = useState<Provider | null>(null);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // Fetch providers on mount
  const fetchProviders = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [dbProviders, deployProvs] = await Promise.all([
        recommendationsApi.getDatabaseProviders(),
        recommendationsApi.getDeployProviders(),
      ]);

      setDatabaseProviders(dbProviders);
      setDeployProviders(deployProvs);

      // Pre-select recommended options
      const recommendedDb = dbProviders.find((p: Provider) => p.recommended);
      const recommendedDeploy = deployProvs.find((p: Provider) => p.recommended);

      if (recommendedDb) setSelectedDatabase(recommendedDb);
      if (recommendedDeploy) setSelectedDeploy(recommendedDeploy);

      // Calculate initial cost
      if (recommendedDb || recommendedDeploy) {
        const cost = await recommendationsApi.calculateCost({
          mvpUsers: 100,
          growthUsers: 1000,
          scaleUsers: 10000,
        });
        setCostEstimate(cost);
      }
    } catch (err) {
      setError('Error al cargar proveedores. Por favor, intenta de nuevo.');
      console.error('Failed to fetch providers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Update cost when selections change
  useEffect(() => {
    const updateCost = async () => {
      if (isLoading || (!selectedDatabase && !selectedDeploy)) return;

      try {
        const cost = await recommendationsApi.calculateCost({
          mvpUsers: 100,
          growthUsers: 1000,
          scaleUsers: 10000,
        });
        setCostEstimate(cost);
      } catch (err) {
        console.error('Failed to calculate cost:', err);
      }
    };

    updateCost();
  }, [selectedDatabase, selectedDeploy, isLoading]);

  // Handlers
  const handleDatabaseSelect = (provider: Provider) => {
    setSelectedDatabase(provider);
  };

  const handleDeploySelect = (provider: Provider) => {
    setSelectedDeploy(provider);
  };

  const handleAutoDetect = () => {
    onNext({ autoDetect: true });
  };

  const handleNext = () => {
    onNext({
      database: selectedDatabase || undefined,
      deploy: selectedDeploy || undefined,
      costEstimate: costEstimate || undefined,
      autoDetect: false,
    });
  };

  const handleRetry = () => {
    fetchProviders();
  };

  const canProceed = selectedDatabase !== null && selectedDeploy !== null;

  // Loading state
  if (isLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Infraestructura</CardTitle>
          <CardDescription>Cargando proveedores...</CardDescription>
        </CardHeader>
        <CardContent>
          <div data-testid="loading-skeleton" className="space-y-4">
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
            <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Infraestructura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={handleRetry}>Reintentar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty providers state
  if (databaseProviders.length === 0 && deployProviders.length === 0) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Infraestructura</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-slate-500">No hay proveedores disponibles</p>
          <div className="flex justify-between mt-6">
            <Button onClick={onBack} variant="outline">
              Atrás
            </Button>
            <Button onClick={handleAutoDetect}>Auto-detectar</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl">Infraestructura</CardTitle>
        <CardDescription>
          Selecciona tu base de datos y plataforma de deploy, o deja que detectemos automáticamente
          la mejor opción.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* Status for screen readers */}
        <div role="status" className="sr-only" aria-live="polite">
          {selectedDatabase && `Base de datos seleccionada: ${selectedDatabase.name}`}
          {selectedDeploy && `, Deploy seleccionado: ${selectedDeploy.name}`}
        </div>

        {/* Database Section */}
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-purple-500/10 text-purple-500 rounded-full flex items-center justify-center text-sm font-bold">
              1
            </span>
            Base de Datos
          </h3>
          <div
            data-testid="database-section"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {databaseProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                type="db"
                isSelected={selectedDatabase?.id === provider.id}
                onSelect={() => handleDatabaseSelect(provider)}
              />
            ))}
          </div>
        </section>

        {/* Deploy Section */}
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-cyan-500/10 text-cyan-500 rounded-full flex items-center justify-center text-sm font-bold">
              2
            </span>
            Plataforma de Deploy
          </h3>
          <div
            data-testid="deploy-section"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {deployProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                type="deploy"
                isSelected={selectedDeploy?.id === provider.id}
                onSelect={() => handleDeploySelect(provider)}
              />
            ))}
          </div>
        </section>

        {/* Cost Estimation Section */}
        <section>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-8 h-8 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center text-sm font-bold">
              3
            </span>
            Estimación de Costos
          </h3>

          {costEstimate && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">MVP</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${costEstimate.phases.mvp.monthly}
                  </p>
                  <p className="text-xs text-slate-400">/mes</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Growth</p>
                  <p
                    data-testid="monthly-cost"
                    className="text-2xl font-bold text-slate-900 dark:text-white"
                  >
                    ${costEstimate.phases.growth.monthly}
                  </p>
                  <p className="text-xs text-slate-400">/mes</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-500 mb-1">Scale</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    ${costEstimate.phases.scale.monthly}
                  </p>
                  <p className="text-xs text-slate-400">/mes</p>
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-700 pt-4 flex items-center justify-between">
                <span className="text-sm text-slate-500">Ahorro vs AWS tradicional</span>
                <span className="text-lg font-bold text-green-500">
                  {costEstimate.savingsVsAWS}%
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Comparison Toggle */}
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={() => setShowComparison(!showComparison)}>
            {showComparison ? 'Ocultar comparación' : 'Comparar proveedores'}
          </Button>
        </div>

        {/* Comparison Table */}
        {showComparison && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" role="table">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left py-2 px-3">Proveedor</th>
                  <th className="text-left py-2 px-3">Tipo</th>
                  <th className="text-left py-2 px-3">Free Tier</th>
                  <th className="text-left py-2 px-3">Pro</th>
                </tr>
              </thead>
              <tbody>
                {[...databaseProviders, ...deployProviders].map((provider) => (
                  <tr key={provider.id} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="py-2 px-3 font-medium">{provider.name}</td>
                    <td className="py-2 px-3 text-slate-500">{provider.type}</td>
                    <td className="py-2 px-3">{provider.pricing.free}</td>
                    <td className="py-2 px-3">
                      {provider.pricing.pro || provider.pricing.starter}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Auto-detect Option */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 text-center">
          <p className="text-sm text-slate-500 mb-3">
            ¿No estás seguro? Podemos detectar automáticamente la mejor opción basada en tu
            proyecto.
          </p>
          <Button variant="outline" onClick={handleAutoDetect}>
            Auto-detectar
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
          <Button onClick={onBack} variant="outline">
            Atrás
          </Button>
          <Button onClick={handleNext} disabled={!canProceed}>
            Siguiente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Provider Card Component
interface ProviderCardProps {
  provider: Provider;
  type: 'db' | 'deploy';
  isSelected: boolean;
  onSelect: () => void;
}

function ProviderCard({ provider, type, isSelected, onSelect }: ProviderCardProps) {
  const testId = type === 'db' ? `db-option-${provider.id}` : `deploy-option-${provider.id}`;

  return (
    <button
      data-testid={testId}
      aria-selected={isSelected}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`
        relative p-4 rounded-lg border-2 text-left transition-all
        hover:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
        ${
          isSelected
            ? 'selected border-purple-500 bg-purple-50 dark:bg-purple-900/20'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
        }
      `}
    >
      {/* Recommended Badge */}
      {provider.recommended && (
        <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-purple-500 text-white text-xs font-medium rounded-full">
          Recomendado
        </span>
      )}

      {/* Provider Info */}
      <div className="space-y-2">
        <h4 className="font-semibold text-slate-900 dark:text-white">{provider.name}</h4>
        <p className="text-xs text-slate-500">{provider.type}</p>

        {/* Pros */}
        <div className="flex flex-wrap gap-1 mt-2">
          {provider.pros.slice(0, 2).map((pro, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded"
            >
              {pro}
            </span>
          ))}
        </div>

        {/* Pricing */}
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mt-2">
          Desde {provider.pricing.free}
        </p>
      </div>

      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-3 left-3 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
}
