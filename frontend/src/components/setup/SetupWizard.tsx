'use client';

import { useState, useEffect } from 'react';
import { setupApi } from '@/lib/api-client';

type SetupStep = 'providers' | 'tokens' | 'config' | 'executing' | 'complete';
type Provider = 'neon' | 'vercel' | 'railway';

interface SetupTask {
  id: string;
  name: string;
  provider: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  steps: { id: string; name: string; status: string; message?: string }[];
  error?: string;
}

interface SetupResult {
  setupId: string;
  success: boolean;
  status: string;
  progress: number;
  tasks: SetupTask[];
  urls?: {
    frontend?: string;
    backend?: string;
    database?: string;
    dashboards: {
      neon?: string;
      vercel?: string;
      railway?: string;
    };
  };
  credentials?: {
    databaseUrl?: string;
    redisUrl?: string;
  };
  nextSteps?: string[];
  generatedEnvFile?: string;
}

export function SetupWizard({
  projectId,
  projectName,
}: {
  projectId?: string;
  projectName?: string;
}) {
  const [step, setStep] = useState<SetupStep>('providers');
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>([]);
  const [tokens, setTokens] = useState<{
    neon?: string;
    vercel?: string;
    railway?: string;
  }>({});
  const [tokenValidation, setTokenValidation] = useState<{
    neon?: { valid: boolean; error?: string };
    vercel?: { valid: boolean; error?: string };
    railway?: { valid: boolean; error?: string };
  }>({});
  const [config, setConfig] = useState({
    projectName: projectName || '',
    neonRegion: 'aws-us-east-1',
    vercelFramework: 'nextjs',
  });
  const [result, setResult] = useState<SetupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleProvider = (provider: Provider) => {
    setSelectedProviders((prev) =>
      prev.includes(provider)
        ? prev.filter((p) => p !== provider)
        : [...prev, provider]
    );
  };

  const validateToken = async (provider: Provider, token: string) => {
    if (!token) return;

    try {
      let result;
      switch (provider) {
        case 'neon':
          result = await setupApi.validateNeonToken(token);
          break;
        case 'vercel':
          result = await setupApi.validateVercelToken(token);
          break;
        case 'railway':
          result = await setupApi.validateRailwayToken(token);
          break;
      }

      setTokenValidation((prev) => ({
        ...prev,
        [provider]: { valid: result.valid, error: result.error },
      }));
    } catch (err) {
      setTokenValidation((prev) => ({
        ...prev,
        [provider]: { valid: false, error: 'Failed to validate token' },
      }));
    }
  };

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    setStep('executing');

    try {
      const setupResult = await setupApi.startSetup({
        projectId: projectId || 'temp-' + Date.now(),
        projectName: config.projectName,
        enableNeon: selectedProviders.includes('neon'),
        enableVercel: selectedProviders.includes('vercel'),
        enableRailway: selectedProviders.includes('railway'),
        neonConfig: selectedProviders.includes('neon')
          ? { projectName: config.projectName, region: config.neonRegion }
          : undefined,
        vercelConfig: selectedProviders.includes('vercel')
          ? { projectName: config.projectName, framework: config.vercelFramework }
          : undefined,
        railwayConfig: selectedProviders.includes('railway')
          ? { projectName: config.projectName }
          : undefined,
        tokens,
      });

      setResult(setupResult);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✅';
      case 'in_progress':
        return '⏳';
      case 'failed':
        return '❌';
      case 'rolled_back':
        return '↩️';
      default:
        return '⏸️';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Progress Steps */}
      <div className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          {['providers', 'tokens', 'config', 'executing', 'complete'].map(
            (s, idx) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === s
                      ? 'bg-blue-600 text-white'
                      : idx <
                        ['providers', 'tokens', 'config', 'executing', 'complete'].indexOf(
                          step
                        )
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {idx + 1}
                </div>
                {idx < 4 && (
                  <div
                    className={`w-16 h-1 mx-2 ${
                      idx <
                      ['providers', 'tokens', 'config', 'executing', 'complete'].indexOf(step)
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            )
          )}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Providers</span>
          <span>Tokens</span>
          <span>Config</span>
          <span>Setup</span>
          <span>Done</span>
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Select Providers */}
        {step === 'providers' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Select Infrastructure Providers</h2>
            <p className="text-gray-600">
              Choose which services to configure automatically for your project.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Neon */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedProviders.includes('neon')
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleProvider('neon')}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🐘</span>
                  <input
                    type="checkbox"
                    checked={selectedProviders.includes('neon')}
                    onChange={() => toggleProvider('neon')}
                    className="h-5 w-5"
                  />
                </div>
                <h3 className="font-semibold">Neon</h3>
                <p className="text-sm text-gray-600">Serverless PostgreSQL</p>
                <ul className="text-xs text-gray-500 mt-2">
                  <li>• Auto-scaling</li>
                  <li>• Database branching</li>
                  <li>• Free tier available</li>
                </ul>
              </div>

              {/* Vercel */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedProviders.includes('vercel')
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleProvider('vercel')}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">▲</span>
                  <input
                    type="checkbox"
                    checked={selectedProviders.includes('vercel')}
                    onChange={() => toggleProvider('vercel')}
                    className="h-5 w-5"
                  />
                </div>
                <h3 className="font-semibold">Vercel</h3>
                <p className="text-sm text-gray-600">Frontend Hosting</p>
                <ul className="text-xs text-gray-500 mt-2">
                  <li>• Edge network</li>
                  <li>• Preview deploys</li>
                  <li>• Automatic SSL</li>
                </ul>
              </div>

              {/* Railway */}
              <div
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedProviders.includes('railway')
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleProvider('railway')}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🚂</span>
                  <input
                    type="checkbox"
                    checked={selectedProviders.includes('railway')}
                    onChange={() => toggleProvider('railway')}
                    className="h-5 w-5"
                  />
                </div>
                <h3 className="font-semibold">Railway</h3>
                <p className="text-sm text-gray-600">Backend Hosting</p>
                <ul className="text-xs text-gray-500 mt-2">
                  <li>• Auto-deploy from Git</li>
                  <li>• Built-in Redis</li>
                  <li>• Easy scaling</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setStep('tokens')}
                disabled={selectedProviders.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Enter Tokens */}
        {step === 'tokens' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Enter API Tokens</h2>
            <p className="text-gray-600">
              Provide your API tokens for each selected provider.
            </p>

            <div className="space-y-4">
              {selectedProviders.includes('neon') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Neon API Token
                    <a
                      href="https://console.neon.tech/app/settings/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 text-xs"
                    >
                      Get token →
                    </a>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={tokens.neon || ''}
                      onChange={(e) => setTokens({ ...tokens, neon: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-md"
                      placeholder="neon_..."
                    />
                    <button
                      onClick={() => validateToken('neon', tokens.neon || '')}
                      className="px-3 py-2 border rounded-md hover:bg-gray-50"
                    >
                      Validate
                    </button>
                  </div>
                  {tokenValidation.neon && (
                    <p
                      className={`text-sm mt-1 ${
                        tokenValidation.neon.valid ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tokenValidation.neon.valid ? '✓ Token is valid' : tokenValidation.neon.error}
                    </p>
                  )}
                </div>
              )}

              {selectedProviders.includes('vercel') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vercel API Token
                    <a
                      href="https://vercel.com/account/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 text-xs"
                    >
                      Get token →
                    </a>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={tokens.vercel || ''}
                      onChange={(e) => setTokens({ ...tokens, vercel: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-md"
                      placeholder="..."
                    />
                    <button
                      onClick={() => validateToken('vercel', tokens.vercel || '')}
                      className="px-3 py-2 border rounded-md hover:bg-gray-50"
                    >
                      Validate
                    </button>
                  </div>
                  {tokenValidation.vercel && (
                    <p
                      className={`text-sm mt-1 ${
                        tokenValidation.vercel.valid ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tokenValidation.vercel.valid
                        ? '✓ Token is valid'
                        : tokenValidation.vercel.error}
                    </p>
                  )}
                </div>
              )}

              {selectedProviders.includes('railway') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Railway API Token
                    <a
                      href="https://railway.app/account/tokens"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-blue-600 text-xs"
                    >
                      Get token →
                    </a>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={tokens.railway || ''}
                      onChange={(e) => setTokens({ ...tokens, railway: e.target.value })}
                      className="flex-1 px-3 py-2 border rounded-md"
                      placeholder="..."
                    />
                    <button
                      onClick={() => validateToken('railway', tokens.railway || '')}
                      className="px-3 py-2 border rounded-md hover:bg-gray-50"
                    >
                      Validate
                    </button>
                  </div>
                  {tokenValidation.railway && (
                    <p
                      className={`text-sm mt-1 ${
                        tokenValidation.railway.valid ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {tokenValidation.railway.valid
                        ? '✓ Token is valid'
                        : tokenValidation.railway.error}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('providers')}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep('config')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Configuration */}
        {step === 'config' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Configure Setup</h2>
            <p className="text-gray-600">Customize the setup for your project.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={config.projectName}
                  onChange={(e) => setConfig({ ...config, projectName: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="my-awesome-app"
                />
              </div>

              {selectedProviders.includes('neon') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Neon Region
                  </label>
                  <select
                    value={config.neonRegion}
                    onChange={(e) => setConfig({ ...config, neonRegion: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="aws-us-east-1">US East (N. Virginia)</option>
                    <option value="aws-us-west-2">US West (Oregon)</option>
                    <option value="aws-eu-central-1">EU (Frankfurt)</option>
                    <option value="aws-ap-southeast-1">Asia Pacific (Singapore)</option>
                  </select>
                </div>
              )}

              {selectedProviders.includes('vercel') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Framework
                  </label>
                  <select
                    value={config.vercelFramework}
                    onChange={(e) =>
                      setConfig({ ...config, vercelFramework: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="nextjs">Next.js</option>
                    <option value="react">React</option>
                    <option value="vue">Vue</option>
                    <option value="svelte">Svelte</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep('tokens')}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={startSetup}
                disabled={!config.projectName}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Start Setup
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Executing */}
        {step === 'executing' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Setting Up Infrastructure</h2>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {result.tasks.map((task) => (
                  <div key={task.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {getStatusIcon(task.status)} {task.name}
                      </span>
                      <span className="text-sm text-gray-500 capitalize">{task.status}</span>
                    </div>
                    {task.steps.length > 0 && (
                      <ul className="text-sm text-gray-600 space-y-1">
                        {task.steps.map((s) => (
                          <li key={s.id}>
                            {getStatusIcon(s.status)} {s.name}
                            {s.message && (
                              <span className="text-gray-400 ml-2">- {s.message}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {task.error && <p className="text-red-600 text-sm mt-2">{task.error}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Complete */}
        {step === 'complete' && result && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-2">{result.success ? '🎉' : '❌'}</div>
              <h2 className="text-xl font-semibold">
                {result.success ? 'Setup Complete!' : 'Setup Failed'}
              </h2>
            </div>

            {result.urls && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-2">Your URLs</h3>
                <dl className="space-y-1 text-sm">
                  {result.urls.frontend && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Frontend:</dt>
                      <dd>
                        <a
                          href={result.urls.frontend}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {result.urls.frontend}
                        </a>
                      </dd>
                    </div>
                  )}
                  {result.urls.backend && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Backend:</dt>
                      <dd>
                        <a
                          href={result.urls.backend}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {result.urls.backend}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {result.urls?.dashboards && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium mb-2">Dashboard Links</h3>
                <dl className="space-y-1 text-sm">
                  {result.urls.dashboards.neon && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Neon:</dt>
                      <dd>
                        <a
                          href={result.urls.dashboards.neon}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Open Dashboard
                        </a>
                      </dd>
                    </div>
                  )}
                  {result.urls.dashboards.vercel && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Vercel:</dt>
                      <dd>
                        <a
                          href={result.urls.dashboards.vercel}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Open Dashboard
                        </a>
                      </dd>
                    </div>
                  )}
                  {result.urls.dashboards.railway && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Railway:</dt>
                      <dd>
                        <a
                          href={result.urls.dashboards.railway}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Open Dashboard
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {result.generatedEnvFile && (
              <div>
                <h3 className="font-medium mb-2">Generated .env File</h3>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-green-400 text-sm whitespace-pre-wrap">
                    {result.generatedEnvFile}
                  </pre>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(result.generatedEnvFile || '')}
                  className="mt-2 px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
                >
                  Copy to Clipboard
                </button>
              </div>
            )}

            {result.nextSteps && result.nextSteps.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Next Steps</h3>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  {result.nextSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SetupWizard;
