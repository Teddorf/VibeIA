'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { llmSettingsApi, githubApi, googleApi, gitlabApi } from '@/lib/api-client';
import OAuthConnectionCard from '@/components/settings/OAuthConnectionCard';

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

interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
  name?: string;
  connectedAt?: string;
}

interface GitLabConnectionStatus {
  connected: boolean;
  username?: string;
  email?: string;
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

  // Google state
  const [googleStatus, setGoogleStatus] = useState<GoogleConnectionStatus | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  // GitLab state
  const [gitlabStatus, setGitlabStatus] = useState<GitLabConnectionStatus | null>(null);
  const [gitlabLoading, setGitlabLoading] = useState(false);
  const [gitlabError, setGitlabError] = useState<string | null>(null);

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
      loadGoogleStatus();
      loadGitLabStatus();
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

  const loadGoogleStatus = async () => {
    try {
      const status = await googleApi.getConnectionStatus();
      setGoogleStatus(status);
    } catch (err: any) {
      setGoogleStatus({ connected: false });
    }
  };

  const loadGitLabStatus = async () => {
    try {
      const status = await gitlabApi.getConnectionStatus();
      setGitlabStatus(status);
    } catch (err: any) {
      setGitlabStatus({ connected: false });
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

  // Google handlers
  const handleConnectGoogle = async () => {
    try {
      setGoogleLoading(true);
      setGoogleError(null);
      const { url } = await googleApi.getAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      setGoogleError(err.response?.data?.message || 'Error al conectar con Google');
      setGoogleLoading(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    if (!confirm('¿Estás seguro de desconectar tu cuenta de Google?')) {
      return;
    }
    try {
      setGoogleLoading(true);
      setGoogleError(null);
      await googleApi.disconnect();
      setGoogleStatus({ connected: false });
    } catch (err: any) {
      setGoogleError(err.response?.data?.message || 'Error al desconectar Google');
    } finally {
      setGoogleLoading(false);
    }
  };

  // GitLab handlers
  const handleConnectGitLab = async () => {
    try {
      setGitlabLoading(true);
      setGitlabError(null);
      const { url } = await gitlabApi.getAuthUrl();
      window.location.href = url;
    } catch (err: any) {
      setGitlabError(err.response?.data?.message || 'Error al conectar con GitLab');
      setGitlabLoading(false);
    }
  };

  const handleDisconnectGitLab = async () => {
    if (!confirm('¿Estás seguro de desconectar tu cuenta de GitLab?')) {
      return;
    }
    try {
      setGitlabLoading(true);
      setGitlabError(null);
      await gitlabApi.disconnect();
      setGitlabStatus({ connected: false });
    } catch (err: any) {
      setGitlabError(err.response?.data?.message || 'Error al desconectar GitLab');
    } finally {
      setGitlabLoading(false);
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
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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

        {/* OAuth Connections Section */}
        <div className="bg-white shadow rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Conexiones OAuth</h2>
            <p className="text-sm text-gray-500 mt-1">
              Conecta tus cuentas para importar repositorios y usar inicio de sesion social
            </p>
          </div>

          <div className="px-6 py-4 space-y-4">
            {/* GitHub */}
            <OAuthConnectionCard
              provider="github"
              title="GitHub"
              description="Importa repositorios y usa GitHub para iniciar sesion"
              connected={githubStatus?.connected || false}
              userInfo={githubStatus?.username ? { username: githubStatus.username } : undefined}
              isLoading={githubLoading}
              error={githubError || undefined}
              onConnect={handleConnectGitHub}
              onDisconnect={handleDisconnectGitHub}
            />

            {/* Google */}
            <OAuthConnectionCard
              provider="google"
              title="Google"
              description="Usa tu cuenta de Google para iniciar sesion"
              connected={googleStatus?.connected || false}
              userInfo={googleStatus?.email ? { email: googleStatus.email, name: googleStatus.name } : undefined}
              isLoading={googleLoading}
              error={googleError || undefined}
              onConnect={handleConnectGoogle}
              onDisconnect={handleDisconnectGoogle}
            />

            {/* GitLab */}
            <OAuthConnectionCard
              provider="gitlab"
              title="GitLab"
              description="Importa repositorios de GitLab y usa GitLab para iniciar sesion"
              connected={gitlabStatus?.connected || false}
              userInfo={gitlabStatus?.username ? { username: gitlabStatus.username, email: gitlabStatus.email } : undefined}
              isLoading={gitlabLoading}
              error={gitlabError || undefined}
              onConnect={handleConnectGitLab}
              onDisconnect={handleDisconnectGitLab}
            />

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
      </div>
    </div>
  );
}
