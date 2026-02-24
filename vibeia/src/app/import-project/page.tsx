'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { githubApi, codebaseAnalysisApi, projectsApi } from '@/lib/api-client';

interface Repository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  language: string | null;
  default_branch: string;
  stargazers_count: number;
  updated_at: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface Branch {
  name: string;
  protected: boolean;
}

interface CodebaseAnalysis {
  structure: {
    hasBackend: boolean;
    hasFrontend: boolean;
    isMonorepo: boolean;
    totalFiles: number;
    directories: string[];
  };
  techStack: {
    languages: { name: string; percentage: number }[];
    frameworks: { name: string; confidence: string }[];
    databases: string[];
    testing: string[];
    buildTools: string[];
  };
  dependencies: {
    total: number;
    production: { name: string; version: string }[];
    development: { name: string; version: string }[];
  };
  codeQuality: {
    hasLinting: boolean;
    hasTypeScript: boolean;
    hasTests: boolean;
    hasCI: boolean;
  };
  suggestions: string[];
}

type Step = 'select' | 'analyze' | 'configure' | 'importing';

export default function ImportProjectPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>('select');

  // Repositories state
  const [repos, setRepos] = useState<Repository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [reposError, setReposError] = useState<string | null>(null);

  // Selected repository state
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Analysis state
  const [analysis, setAnalysis] = useState<CodebaseAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Import configuration
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // GitHub connection check
  const [githubConnected, setGithubConnected] = useState(false);
  const [checkingGithub, setCheckingGithub] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      checkGitHubConnection();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // Filter repos based on search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      setFilteredRepos(
        repos.filter(
          (repo) =>
            repo.name.toLowerCase().includes(query) ||
            repo.description?.toLowerCase().includes(query) ||
            repo.language?.toLowerCase().includes(query),
        ),
      );
    } else {
      setFilteredRepos(repos);
    }
  }, [searchQuery, repos]);

  const checkGitHubConnection = async () => {
    try {
      setCheckingGithub(true);
      const status = await githubApi.getConnectionStatus();
      setGithubConnected(status.connected);
      if (status.connected) {
        loadRepositories();
      }
    } catch {
      setGithubConnected(false);
    } finally {
      setCheckingGithub(false);
    }
  };

  const loadRepositories = async () => {
    try {
      setLoadingRepos(true);
      setReposError(null);
      const response = await githubApi.listRepos();
      setRepos(response.repositories || []);
      setFilteredRepos(response.repositories || []);
    } catch (err: any) {
      setReposError(err.response?.data?.message || 'Error al cargar repositorios');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSelectRepo = async (repo: Repository) => {
    setSelectedRepo(repo);
    setProjectName(repo.name);
    setProjectDescription(repo.description || '');
    setSelectedBranch(repo.default_branch);

    // Load branches
    try {
      setLoadingBranches(true);
      const [owner, repoName] = repo.full_name.split('/');
      const branchList = await githubApi.listBranches(owner, repoName);
      setBranches(branchList);
    } catch {
      setBranches([{ name: repo.default_branch, protected: false }]);
    } finally {
      setLoadingBranches(false);
    }

    setStep('analyze');
  };

  const handleAnalyze = async () => {
    if (!selectedRepo) return;

    try {
      setAnalyzing(true);
      setAnalysisError(null);
      const [owner, repoName] = selectedRepo.full_name.split('/');
      const result = await codebaseAnalysisApi.analyze(owner, repoName, selectedBranch);
      setAnalysis(result);
      setStep('configure');
    } catch (err: any) {
      setAnalysisError(err.response?.data?.message || 'Error al analizar el repositorio');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleImport = async () => {
    if (!selectedRepo) return;

    try {
      setImporting(true);
      setImportError(null);
      setStep('importing');

      const project = await projectsApi.importFromGitHub({
        githubRepoFullName: selectedRepo.full_name,
        branch: selectedBranch,
        name: projectName || selectedRepo.name,
        description: projectDescription || selectedRepo.description || '',
      });

      // Redirect to the new project
      router.push(`/projects/${project._id}`);
    } catch (err: any) {
      setImportError(err.response?.data?.message || 'Error al importar el proyecto');
      setStep('configure');
    } finally {
      setImporting(false);
    }
  };

  const handleBack = () => {
    if (step === 'analyze') {
      setSelectedRepo(null);
      setStep('select');
    } else if (step === 'configure') {
      setAnalysis(null);
      setStep('analyze');
    }
  };

  if (authLoading || checkingGithub) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      </div>
    );
  }

  if (!githubConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-slate-700/50 flex items-center justify-center mb-6">
              <svg className="w-10 h-10 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">
              Conecta GitHub para importar proyectos
            </h1>
            <p className="text-slate-400 mb-8 max-w-md mx-auto">
              Para importar un proyecto existente, primero necesitas conectar tu cuenta de GitHub.
            </p>
            <button
              onClick={() => router.push('/settings')}
              className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-slate-800 rounded-md hover:bg-slate-700"
            >
              Ir a Configuración
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Importar Proyecto</h1>
          <p className="mt-2 text-slate-400">
            Selecciona un repositorio de GitHub para importar y analizar
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-xl">
            <StepIndicator
              number={1}
              label="Seleccionar"
              active={step === 'select'}
              completed={step !== 'select'}
            />
            <div
              className={`flex-1 h-1 mx-4 ${step !== 'select' ? 'bg-purple-600' : 'bg-slate-700'}`}
            />
            <StepIndicator
              number={2}
              label="Analizar"
              active={step === 'analyze'}
              completed={step === 'configure' || step === 'importing'}
            />
            <div
              className={`flex-1 h-1 mx-4 ${step === 'configure' || step === 'importing' ? 'bg-purple-600' : 'bg-slate-700'}`}
            />
            <StepIndicator
              number={3}
              label="Importar"
              active={step === 'configure' || step === 'importing'}
              completed={false}
            />
          </div>
        </div>

        {/* Step Content */}
        {step === 'select' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Tus Repositorios</h2>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar repositorios..."
                    className="pl-10 pr-4 py-2 border border-slate-600 rounded-md text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400 bg-slate-700/50"
                  />
                  <svg
                    className="absolute left-3 top-2.5 h-4 w-4 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {reposError && (
              <div className="px-6 py-4 bg-red-500/20 border-b border-red-500/50">
                <p className="text-sm text-red-300">{reposError}</p>
              </div>
            )}

            <div className="divide-y divide-slate-700/50 max-h-[600px] overflow-y-auto">
              {loadingRepos ? (
                <div className="px-6 py-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto mb-4"></div>
                  <p className="text-slate-400">Cargando repositorios...</p>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-slate-400">
                    {searchQuery ? 'No se encontraron repositorios' : 'No tienes repositorios'}
                  </p>
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <div
                    key={repo.id}
                    onClick={() => handleSelectRepo(repo)}
                    className="px-6 py-4 hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <img
                          src={repo.owner.avatar_url}
                          alt={repo.owner.login}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-white">{repo.full_name}</h3>
                            {repo.private && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-400">
                                Privado
                              </span>
                            )}
                          </div>
                          {repo.description && (
                            <p className="text-sm text-slate-400 line-clamp-1">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-1 text-xs text-slate-500">
                            {repo.language && <span>{repo.language}</span>}
                            <span>⭐ {repo.stargazers_count}</span>
                            <span>
                              Actualizado {new Date(repo.updated_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {step === 'analyze' && selectedRepo && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <button
                onClick={handleBack}
                className="flex items-center text-sm text-slate-400 hover:text-white mb-4"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Volver
              </button>
              <h2 className="text-lg font-semibold text-white">Analizar Repositorio</h2>
            </div>

            <div className="px-6 py-6">
              {/* Selected repo info */}
              <div className="flex items-center space-x-4 mb-6 pb-6 border-b border-slate-700/50">
                <img
                  src={selectedRepo.owner.avatar_url}
                  alt={selectedRepo.owner.login}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h3 className="font-medium text-white">{selectedRepo.full_name}</h3>
                  {selectedRepo.description && (
                    <p className="text-sm text-slate-400">{selectedRepo.description}</p>
                  )}
                </div>
              </div>

              {/* Branch selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rama a analizar
                </label>
                {loadingBranches ? (
                  <div className="animate-pulse bg-slate-700 h-10 rounded-md"></div>
                ) : (
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400 bg-slate-700/50"
                  >
                    {branches.map((branch) => (
                      <option key={branch.name} value={branch.name}>
                        {branch.name} {branch.protected && '(protegida)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {analysisError && (
                <div className="mb-6 bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                  {analysisError}
                </div>
              )}

              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {analyzing ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Analizando código...
                  </span>
                ) : (
                  'Analizar Repositorio'
                )}
              </button>
            </div>
          </div>
        )}

        {step === 'configure' && selectedRepo && analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Analysis Results */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <button
                  onClick={handleBack}
                  className="flex items-center text-sm text-slate-400 hover:text-white mb-4"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Volver
                </button>
                <h2 className="text-lg font-semibold text-white">Análisis del Código</h2>
              </div>

              <div className="px-6 py-4 space-y-6">
                {/* Structure */}
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Estructura</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.structure.hasBackend && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-300">
                        Backend
                      </span>
                    )}
                    {analysis.structure.hasFrontend && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300">
                        Frontend
                      </span>
                    )}
                    {analysis.structure.isMonorepo && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300">
                        Monorepo
                      </span>
                    )}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/50 text-slate-300">
                      {analysis.structure.totalFiles} archivos
                    </span>
                  </div>
                </div>

                {/* Tech Stack */}
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Tech Stack</h3>
                  <div className="space-y-2">
                    {analysis.techStack.languages.length > 0 && (
                      <div>
                        <span className="text-xs text-slate-400">Lenguajes:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysis.techStack.languages.slice(0, 5).map((lang) => (
                            <span
                              key={lang.name}
                              className="text-xs px-2 py-1 bg-slate-700/50 rounded"
                            >
                              {lang.name} ({lang.percentage}%)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.techStack.frameworks.length > 0 && (
                      <div>
                        <span className="text-xs text-slate-400">Frameworks:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {analysis.techStack.frameworks.map((fw) => (
                            <span
                              key={fw.name}
                              className="text-xs px-2 py-1 bg-blue-500/20 text-blue-300 rounded"
                            >
                              {fw.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Code Quality */}
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Calidad del Código</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <QualityBadge label="Linting" enabled={analysis.codeQuality.hasLinting} />
                    <QualityBadge label="TypeScript" enabled={analysis.codeQuality.hasTypeScript} />
                    <QualityBadge label="Tests" enabled={analysis.codeQuality.hasTests} />
                    <QualityBadge label="CI/CD" enabled={analysis.codeQuality.hasCI} />
                  </div>
                </div>

                {/* Dependencies */}
                <div>
                  <h3 className="text-sm font-medium text-slate-300 mb-2">Dependencias</h3>
                  <p className="text-sm text-slate-400">
                    {analysis.dependencies.total} dependencias totales (
                    {analysis.dependencies.production.length} producción,{' '}
                    {analysis.dependencies.development.length} desarrollo)
                  </p>
                </div>

                {/* Suggestions */}
                {analysis.suggestions.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-slate-300 mb-2">Sugerencias</h3>
                    <ul className="list-disc list-inside text-sm text-slate-400 space-y-1">
                      {analysis.suggestions.slice(0, 3).map((suggestion, index) => (
                        <li key={index}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Import Configuration */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-lg font-semibold text-white">Configurar Proyecto</h2>
              </div>

              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Nombre del Proyecto
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400 bg-slate-700/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Descripción
                  </label>
                  <textarea
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-600 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-slate-400 bg-slate-700/50"
                  />
                </div>

                <div className="pt-4 border-t border-slate-700/50">
                  <h3 className="text-sm font-medium text-slate-300 mb-2">
                    Resumen de importación
                  </h3>
                  <ul className="text-sm text-slate-400 space-y-1">
                    <li>📁 Repositorio: {selectedRepo.full_name}</li>
                    <li>🌿 Rama: {selectedBranch}</li>
                    <li>📊 {analysis.structure.totalFiles} archivos analizados</li>
                  </ul>
                </div>

                {importError && (
                  <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                    {importError}
                  </div>
                )}

                <button
                  onClick={handleImport}
                  disabled={importing || !projectName.trim()}
                  className="w-full px-4 py-3 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importing ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Importando proyecto...
                    </span>
                  ) : (
                    'Importar Proyecto'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="px-6 py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
              <h2 className="text-lg font-semibold text-white mb-2">Importando proyecto...</h2>
              <p className="text-slate-400">Esto puede tomar unos segundos</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper Components
function StepIndicator({
  number,
  label,
  active,
  completed,
}: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
          completed
            ? 'bg-purple-600 text-white'
            : active
              ? 'bg-purple-600 text-white'
              : 'bg-slate-700 text-slate-400'
        }`}
      >
        {completed ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          number
        )}
      </div>
      <span className={`mt-1 text-xs ${active ? 'text-purple-400 font-medium' : 'text-slate-400'}`}>
        {label}
      </span>
    </div>
  );
}

function QualityBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div
      className={`flex items-center space-x-2 px-3 py-2 rounded-md ${
        enabled ? 'bg-green-500/20' : 'bg-slate-700/30'
      }`}
    >
      {enabled ? (
        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      )}
      <span className={`text-sm ${enabled ? 'text-green-300' : 'text-slate-400'}`}>{label}</span>
    </div>
  );
}
