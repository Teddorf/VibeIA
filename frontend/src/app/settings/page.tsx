'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { llmSettingsApi, githubApi } from '@/lib/api-client';
import Header from '@/components/layout/Header';

interface ProviderInfo {
  name: string;
  description: string;
  recommended: boolean;
  freeCredits: boolean;
  pricing: string;
  signupUrl: string;
  docsUrl: string;
  keyFormat: string;
}

interface KeyStatus {
  provider: string;
  isConfigured: boolean;
  isActive: boolean;
  maskedKey?: string;
  addedAt?: string;
}

interface LLMPreferences {
  primaryProvider: string | null;
  fallbackEnabled: boolean;
  fallbackOrder: string[];
}

interface GitHubConnectionStatus {
  connected: boolean;
  username?: string;
  connectedAt?: string;
}

export default function SettingsPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [providersInfo, setProvidersInfo] = useState<Record<string, ProviderInfo>>({});
  const [keys, setKeys] = useState<KeyStatus[]>([]);
  const [preferences, setPreferences] = useState<LLMPreferences | null>(null);
  const [hasAnyConfigured, setHasAnyConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GitHub state
  const [githubStatus, setGithubStatus] = useState<GitHubConnectionStatus | null>(null);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);

  // Form state
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ provider: string; success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
      loadGitHubStatus();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await llmSettingsApi.getMyKeys();
      setKeys(data.keys);
      setPreferences(data.preferences);
      setHasAnyConfigured(data.hasAnyConfigured);
      setProvidersInfo(data.providersInfo);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar la configuracion');
    } finally {
      setLoading(false);
    }
  };

  const loadGitHubStatus = async () => {
    try {
      const status = await githubApi.getConnectionStatus();
      setGithubStatus(status);
    } catch (err: any) {
      // GitHub not connected is not an error
      setGithubStatus({ connected: false });
    }
  };

  const handleConnectGitHub = async () => {
    try {
      setGithubLoading(true);
      setGithubError(null);
      const { authUrl } = await githubApi.getAuthUrl();
      // Redirect to GitHub OAuth
      window.location.href = authUrl;
    } catch (err: any) {
      setGithubError(err.response?.data?.message || 'Error al conectar con GitHub');
      setGithubLoading(false);
    }
  };

  const handleDisconnectGitHub = async () => {
    if (!confirm('¿Estás seguro de desconectar tu cuenta de GitHub? Perderás acceso a tus repositorios.')) {
      return;
    }
    try {
      setGithubLoading(true);
      setGithubError(null);
      await githubApi.disconnect();
      setGithubStatus({ connected: false });
    } catch (err: any) {
      setGithubError(err.response?.data?.message || 'Error al desconectar GitHub');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleSaveKey = async () => {
    if (!selectedProvider || !apiKeyInput.trim()) return;

    try {
      setSaving(true);
      setError(null);
      await llmSettingsApi.setKey(selectedProvider, apiKeyInput.trim());
      setApiKeyInput('');
      setSelectedProvider(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar la API key');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async (provider: string) => {
    if (!confirm(`Estas seguro de eliminar la API key de ${providersInfo[provider]?.name || provider}?`)) {
      return;
    }

    try {
      setError(null);
      await llmSettingsApi.removeKey(provider);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al eliminar la API key');
    }
  };

  const handleTestKey = async (provider: string) => {
    try {
      setTesting(provider);
      setTestResult(null);
      const result = await llmSettingsApi.testKey(provider);
      setTestResult({
        provider,
        success: result.success,
        message: result.success ? 'API key valida!' : result.error,
      });
    } catch (err: any) {
      setTestResult({
        provider,
        success: false,
        message: err.response?.data?.message || 'Error al probar la API key',
      });
    } finally {
      setTesting(null);
    }
  };

  const handleSetPrimary = async (provider: string) => {
    try {
      setError(null);
      await llmSettingsApi.updatePreferences({ primaryProvider: provider });
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al actualizar preferencias');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          <p className="mt-2 text-gray-600">
            Configura tus integraciones y proveedores de IA
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* GitHub Connection Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Conexión con GitHub</h2>
            <p className="text-sm text-gray-500 mt-1">
              Conecta tu cuenta de GitHub para importar proyectos existentes
            </p>
          </div>

          <div className="px-6 py-4">
            {githubError && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {githubError}
              </div>
            )}

            {githubStatus?.connected ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-gray-900 flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">@{githubStatus.username}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        Conectado
                      </span>
                    </div>
                    {githubStatus.connectedAt && (
                      <p className="text-sm text-gray-500">
                        Conectado el {new Date(githubStatus.connectedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => router.push('/import-project')}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                  >
                    Importar proyecto
                  </button>
                  <button
                    onClick={handleDisconnectGitHub}
                    disabled={githubLoading}
                    className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50 disabled:opacity-50"
                  >
                    {githubLoading ? 'Desconectando...' : 'Desconectar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Conecta tu cuenta de GitHub
                </h3>
                <p className="text-sm text-gray-500 mb-4 max-w-md mx-auto">
                  Conecta GitHub para importar tus repositorios existentes y generar planes de mejora personalizados basados en tu código.
                </p>
                <button
                  onClick={handleConnectGitHub}
                  disabled={githubLoading}
                  className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
                >
                  {githubLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Conectando...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                        <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                      </svg>
                      Conectar con GitHub
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LLM Configuration Section Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Proveedores de IA</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configura tu proveedor de Inteligencia Artificial para generar planes y código
          </p>
        </div>

        {!hasAnyConfigured && (
          <div className="mb-6 bg-amber-50 border border-amber-200 px-4 py-4 rounded-lg">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-amber-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-amber-800">Configuracion requerida</h3>
                <p className="mt-1 text-sm text-amber-700">
                  Para usar VibeIA necesitas configurar al menos un proveedor de IA.
                  Te recomendamos <strong>OpenAI</strong> para empezar - tiene $5 de creditos gratis.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Configuration */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Tus Proveedores de IA</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {keys.map((key) => {
              const info = providersInfo[key.provider];
              const isPrimary = preferences?.primaryProvider === key.provider;

              return (
                <div key={key.provider} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        key.isConfigured ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {key.isConfigured ? (
                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-sm font-medium text-gray-900">{info?.name || key.provider}</h3>
                          {isPrimary && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Principal
                            </span>
                          )}
                          {info?.recommended && !key.isConfigured && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Recomendado
                            </span>
                          )}
                          {info?.freeCredits && !key.isConfigured && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              Creditos gratis
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">{info?.description}</p>
                        {key.isConfigured && key.maskedKey && (
                          <p className="text-xs text-gray-400 mt-1">API Key: {key.maskedKey}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {key.isConfigured ? (
                        <>
                          <button
                            onClick={() => handleTestKey(key.provider)}
                            disabled={testing === key.provider}
                            className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            {testing === key.provider ? 'Probando...' : 'Probar'}
                          </button>
                          {!isPrimary && (
                            <button
                              onClick={() => handleSetPrimary(key.provider)}
                              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                            >
                              Usar principal
                            </button>
                          )}
                          <button
                            onClick={() => handleRemoveKey(key.provider)}
                            className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800"
                          >
                            Eliminar
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setSelectedProvider(key.provider)}
                          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                        >
                          Configurar
                        </button>
                      )}
                    </div>
                  </div>

                  {testResult && testResult.provider === key.provider && (
                    <div className={`mt-3 px-3 py-2 rounded text-sm ${
                      testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {testResult.message}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Add API Key Modal/Section */}
        {selectedProvider && (
          <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Configurar {providersInfo[selectedProvider]?.name || selectedProvider}
              </h2>
              <button
                onClick={() => {
                  setSelectedProvider(null);
                  setApiKeyInput('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4">
              {/* Step by step guide */}
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-3">Como obtener tu API Key:</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-700">
                  <li>
                    Ve a{' '}
                    <a
                      href={providersInfo[selectedProvider]?.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline font-medium"
                    >
                      {providersInfo[selectedProvider]?.signupUrl}
                    </a>
                  </li>
                  <li>Crea una cuenta o inicia sesion</li>
                  <li>Busca la seccion de "API Keys" o "Claves de API"</li>
                  <li>Crea una nueva API key y copiala</li>
                  <li>Pegala aqui abajo</li>
                </ol>
                <p className="mt-3 text-xs text-blue-600">
                  Precio: {providersInfo[selectedProvider]?.pricing}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={providersInfo[selectedProvider]?.keyFormat || 'Pega tu API key aqui'}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Tu API key se guarda encriptada y nunca se comparte.
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setSelectedProvider(null);
                      setApiKeyInput('');
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveKey}
                    disabled={saving || !apiKeyInput.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Guardando...' : 'Guardar API Key'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Cual proveedor elegir?</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Para empezar (Gratis)</h3>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>OpenAI</strong> te da $5 de creditos gratis al registrarte.
                  Perfecto para probar la plataforma.
                </p>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                  Recomendado para nuevos usuarios
                </span>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Mejor calidad</h3>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Claude (Anthropic)</strong> ofrece la mejor calidad de codigo
                  y razonamiento. Ideal para proyectos complejos.
                </p>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Mejor para produccion
                </span>
              </div>

              <div className="border rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">100% Gratis</h3>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Gemini (Google)</strong> tiene un tier gratuito generoso.
                  Bueno para proyectos personales.
                </p>
                <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                  Sin costo
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
