/**
 * IntegrationsPanel Component
 * Manage connected integrations (GitHub, Vercel, Neon, etc.)
 */
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { integrationsApi } from '@/lib/api-client';

// ============================================
// TYPES
// ============================================

export interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'git' | 'deploy' | 'database' | 'ai' | 'monitoring' | 'other';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  connectedAt?: Date;
  accountInfo?: {
    username?: string;
    email?: string;
  };
  error?: string;
}

type CategoryFilter = 'all' | 'git' | 'deploy' | 'database' | 'ai' | 'monitoring';

// ============================================
// ICONS
// ============================================

const LoadingSpinner = () => (
  <svg data-testid="loading-spinner" className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const IntegrationIcon: React.FC<{ icon: string }> = ({ icon }) => {
  const icons: Record<string, React.ReactNode> = {
    github: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
    vercel: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 22.525H0l12-21.05 12 21.05z"/>
      </svg>
    ),
    neon: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
      </svg>
    ),
    openai: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/>
      </svg>
    ),
  };

  return icons[icon] || <div className="w-8 h-8 rounded-full bg-slate-600" />;
};

// ============================================
// SUB-COMPONENTS
// ============================================

const IntegrationSkeleton: React.FC = () => (
  <div data-testid="loading-skeleton" className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-lg bg-slate-700" />
      <div className="flex-1 space-y-2">
        <div className="h-5 bg-slate-700 rounded w-1/3" />
        <div className="h-4 bg-slate-700 rounded w-2/3" />
      </div>
    </div>
  </div>
);

const ConfirmModal: React.FC<{
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ title, message, onConfirm, onCancel, isLoading }) => (
  <div data-testid="confirm-disconnect-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
    <div className="w-full max-w-md p-6 rounded-lg bg-slate-800 border border-slate-700 space-y-4">
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-slate-400">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
        >
          {isLoading ? <LoadingSpinner /> : 'Confirmar'}
        </button>
      </div>
    </div>
  </div>
);

interface IntegrationCardProps {
  integration: Integration;
  onConnect: (id: string) => Promise<void>;
  onDisconnect: (id: string) => Promise<void>;
  onRefresh: (id: string) => Promise<void>;
  onTest: (id: string) => Promise<{ success: boolean }>;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onConnect,
  onDisconnect,
  onRefresh,
  onTest,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      await onConnect(integration.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setIsLoading(true);
    try {
      await onDisconnect(integration.id);
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await onRefresh(integration.id);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTest = async () => {
    setIsLoading(true);
    setTestResult(null);
    try {
      const result = await onTest(integration.id);
      setTestResult(result.success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setIsLoading(false);
    }
  };

  const statusColors = {
    connected: 'border-green-500/50 bg-green-900/20',
    disconnected: 'border-slate-600 bg-slate-800/50',
    error: 'border-red-500/50 bg-red-900/20',
    pending: 'border-yellow-500/50 bg-yellow-900/20',
  };

  return (
    <>
      <div
        data-testid={`integration-card-${integration.id}`}
        data-status={integration.status}
        className={`p-4 rounded-lg border ${statusColors[integration.status]} transition-colors`}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="text-white">
            <IntegrationIcon icon={integration.icon} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-white">{integration.name}</h3>
              {integration.status === 'connected' && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-600/20 text-green-400">
                  <CheckIcon /> Conectado
                </span>
              )}
              {integration.status === 'error' && (
                <span className="flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-600/20 text-red-400">
                  <XIcon /> Error
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mb-2">{integration.description}</p>

            {/* Account Info */}
            {integration.status === 'connected' && integration.accountInfo && (
              <div className="text-xs text-slate-500">
                {integration.accountInfo.username && (
                  <span className="mr-2">{integration.accountInfo.username}</span>
                )}
                {integration.accountInfo.email && (
                  <span>{integration.accountInfo.email}</span>
                )}
              </div>
            )}

            {/* Error Message */}
            {integration.status === 'error' && integration.error && (
              <p className="text-xs text-red-400 mt-1">{integration.error}</p>
            )}

            {/* Test Result */}
            {testResult === 'success' && (
              <p className="text-xs text-green-400 mt-1">Conexión exitosa</p>
            )}
            {testResult === 'error' && (
              <p className="text-xs text-red-400 mt-1">Error de conexión</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {integration.status === 'disconnected' && (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
              >
                {isLoading ? <LoadingSpinner /> : 'Conectar'}
              </button>
            )}

            {integration.status === 'connected' && (
              <>
                <button
                  onClick={handleTest}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50"
                  aria-label="Probar conexión"
                >
                  {isLoading ? <LoadingSpinner /> : 'Probar'}
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
                  aria-label="Actualizar credenciales"
                >
                  <RefreshIcon /> Actualizar
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 transition-colors disabled:opacity-50"
                >
                  Desconectar
                </button>
              </>
            )}

            {integration.status === 'error' && (
              <button
                onClick={handleConnect}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors disabled:opacity-50"
              >
                {isLoading ? <LoadingSpinner /> : 'Reconectar'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Disconnect Modal */}
      {showConfirm && (
        <ConfirmModal
          title="Desconectar integración"
          message={`¿Estás seguro de que deseas desconectar ${integration.name}?`}
          onConfirm={handleDisconnect}
          onCancel={() => setShowConfirm(false)}
          isLoading={isLoading}
        />
      )}
    </>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const IntegrationsPanel: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch integrations
  const fetchIntegrations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await integrationsApi.getIntegrations();
      setIntegrations(data);
    } catch (err) {
      setError('Error al cargar las integraciones');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    return integrations.filter((integration) => {
      // Category filter
      if (categoryFilter !== 'all' && integration.category !== categoryFilter) {
        return false;
      }

      // Search filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          integration.name.toLowerCase().includes(term) ||
          integration.description.toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [integrations, categoryFilter, searchTerm]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(integrations.map((i) => i.category));
    return Array.from(cats);
  }, [integrations]);

  // Handlers
  const handleConnect = async (id: string) => {
    await integrationsApi.connectIntegration(id);
    await fetchIntegrations();
  };

  const handleDisconnect = async (id: string) => {
    await integrationsApi.disconnectIntegration(id);
    await fetchIntegrations();
  };

  const handleRefresh = async (id: string) => {
    await integrationsApi.refreshIntegration(id);
    await fetchIntegrations();
  };

  const handleTest = async (id: string) => {
    return await integrationsApi.testConnection(id);
  };

  // Category labels
  const categoryLabels: Record<string, string> = {
    all: 'Todos',
    git: 'Git',
    deploy: 'Deploy',
    database: 'Database',
    ai: 'AI',
    monitoring: 'Monitoring',
  };

  if (isLoading) {
    return (
      <div data-testid="integrations-panel" className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Integraciones</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <IntegrationSkeleton />
          <IntegrationSkeleton />
          <IntegrationSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="integrations-panel" className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Integraciones</h2>
        <div className="p-6 rounded-lg bg-red-900/20 border border-red-700 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchIntegrations}
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (integrations.length === 0) {
    return (
      <div data-testid="integrations-panel" className="space-y-6">
        <h2 className="text-xl font-semibold text-white">Integraciones</h2>
        <div data-testid="empty-integrations" className="p-8 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
          <p className="text-slate-400">No hay integraciones disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="integrations-panel" className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Integraciones</h2>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Buscar integración..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              categoryFilter === 'all'
                ? 'bg-purple-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {categoryLabels.all}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setCategoryFilter(category as CategoryFilter)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                categoryFilter === category
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {categoryLabels[category] || category}
            </button>
          ))}
        </div>
      </div>

      {/* Integrations Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredIntegrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onRefresh={handleRefresh}
            onTest={handleTest}
          />
        ))}
      </div>

      {/* Empty filtered state */}
      {filteredIntegrations.length === 0 && (
        <div className="p-8 rounded-lg bg-slate-800/50 border border-slate-700 text-center">
          <p className="text-slate-400">No se encontraron integraciones</p>
        </div>
      )}
    </div>
  );
};

export default IntegrationsPanel;
