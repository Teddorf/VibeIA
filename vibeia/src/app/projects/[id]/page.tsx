'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import { projectsApi } from '@/lib/api-client';
import apiClient from '@/lib/api-client';
import { formatDate, getStatusBadgeClasses } from '@/lib/utils';

interface Project {
  _id: string;
  name: string;
  description?: string;
  repositoryUrl?: string;
  githubRepoId?: string;
  status: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface Plan {
  _id: string;
  projectId: string;
  status: string;
  estimatedTime: number;
  phases: Phase[];
  wizardData?: {
    stage1?: { projectName: string; description: string };
    stage2?: Record<string, string>;
    stage3?: { selectedArchetypes: string[]; plan: any };
  };
  metadata?: {
    llmProvider?: string;
    tokensUsed?: number;
    cost?: number;
    generatedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Phase {
  name: string;
  status: string;
  estimatedTime: number;
  tasks: Task[];
}

interface Task {
  name: string;
  status: string;
  type: string;
  file?: string;
  estimatedTime: number;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: authLoading } = useRequireAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'plans' | 'settings'>('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: '', description: '' });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const projectId = params.id as string;
  const planIdFromUrl = searchParams.get('plan');

  useEffect(() => {
    async function fetchProject() {
      if (authLoading || !projectId) return;

      try {
        setIsLoading(true);
        const projectData = await projectsApi.getById(projectId);
        setProject(projectData);
        setSettingsForm({ name: projectData.name, description: projectData.description || '' });

        // Fetch plans for this project
        const plansRes = await apiClient.get(`/api/plans?projectId=${projectId}`);
        const projectPlans = plansRes.data || [];
        setPlans(projectPlans);

        // Select plan from URL if specified
        if (planIdFromUrl) {
          const plan = projectPlans.find((p: Plan) => p._id === planIdFromUrl);
          if (plan) setSelectedPlan(plan);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load project');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProject();
  }, [projectId, authLoading, planIdFromUrl]);

  // Format date with time for this page
  const formatDateTime = (dateString: string) =>
    formatDate(dateString, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const calculateProgress = (plan: Plan) => {
    if (!plan.phases || plan.phases.length === 0) return 0;
    const totalTasks = plan.phases.reduce((sum, phase) => sum + (phase.tasks?.length || 0), 0);
    const completedTasks = plan.phases.reduce(
      (sum, phase) => sum + (phase.tasks?.filter((t) => t.status === 'completed').length || 0),
      0,
    );
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  };

  const handleDeleteProject = async () => {
    setIsDeleting(true);
    try {
      await projectsApi.delete(projectId);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSettingsMessage(null);
    try {
      const updated = await projectsApi.update(projectId, {
        name: settingsForm.name,
        description: settingsForm.description,
      });
      setProject(updated);
      setSettingsMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (err: any) {
      setSettingsMessage({ type: 'error', text: err.message || 'Failed to save settings' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Project not found</h3>
          <p className="text-slate-400 mb-6">
            {error || 'The project you are looking for does not exist.'}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors">
            Dashboard
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-white">{project.name}</span>
        </nav>

        {/* Project Header */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">{project.name}</h1>
                <p className="text-slate-400 mb-3">{project.description || 'No description'}</p>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusBadgeClasses(project.status)}`}
                  >
                    {project.status}
                  </span>
                  {project.repositoryUrl && (
                    <a
                      href={project.repositoryUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                      </svg>
                      View Repository
                    </a>
                  )}
                </div>
              </div>
            </div>
            <Link
              href={`/new-project?projectId=${project._id}`}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              + Add Feature
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-800/30 rounded-lg p-1 w-fit">
          {(['overview', 'plans', 'settings'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all capitalize ${
                activeTab === tab
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
                  <p className="text-2xl font-bold text-white">{plans.length}</p>
                  <p className="text-sm text-slate-400">Total Plans</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
                  <p className="text-2xl font-bold text-green-400">
                    {plans.filter((p) => p.status === 'completed').length}
                  </p>
                  <p className="text-sm text-slate-400">Completed</p>
                </div>
                <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-4">
                  <p className="text-2xl font-bold text-blue-400">
                    {plans.filter((p) => p.status === 'in_progress').length}
                  </p>
                  <p className="text-sm text-slate-400">In Progress</p>
                </div>
              </div>

              {/* Recent Plans */}
              <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Plans</h3>
                {plans.length === 0 ? (
                  <p className="text-slate-400 text-center py-8">
                    No plans yet. Create your first plan!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {plans.slice(0, 5).map((plan) => (
                      <button
                        key={plan._id}
                        onClick={() => setSelectedPlan(plan)}
                        className={`w-full text-left p-4 rounded-lg border transition-all ${
                          selectedPlan?._id === plan._id
                            ? 'bg-purple-500/20 border-purple-500/50'
                            : 'bg-slate-700/30 border-slate-700/50 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">
                            {plan.phases?.length || 0} Phases Plan
                          </span>
                          <span
                            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusBadgeClasses(plan.status)}`}
                          >
                            {plan.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Est. {plan.estimatedTime || 0} min</span>
                          <span>{formatDateTime(plan.createdAt)}</span>
                        </div>
                        {plan.status === 'in_progress' && (
                          <div className="mt-2">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Progress</span>
                              <span>{calculateProgress(plan)}%</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all"
                                style={{ width: `${calculateProgress(plan)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Plan Details Sidebar */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Plan Details</h3>
              {selectedPlan ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-1">Status</p>
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusBadgeClasses(selectedPlan.status)}`}
                    >
                      {selectedPlan.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-1">Phases</p>
                    <p className="text-white">{selectedPlan.phases?.length || 0} phases</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-1">Estimated Time</p>
                    <p className="text-white">{selectedPlan.estimatedTime || 0} minutes</p>
                  </div>
                  {selectedPlan.metadata?.llmProvider && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase mb-1">LLM Provider</p>
                      <p className="text-white capitalize">{selectedPlan.metadata.llmProvider}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400 uppercase mb-1">Created</p>
                    <p className="text-white">{formatDateTime(selectedPlan.createdAt)}</p>
                  </div>

                  {/* Phases List */}
                  {selectedPlan.phases && selectedPlan.phases.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400 uppercase mb-2">Phase Breakdown</p>
                      <div className="space-y-2">
                        {selectedPlan.phases.map((phase, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-2 h-2 rounded-full ${
                                  phase.status === 'completed'
                                    ? 'bg-green-400'
                                    : phase.status === 'in_progress'
                                      ? 'bg-blue-400'
                                      : 'bg-slate-500'
                                }`}
                              />
                              <span className="text-sm text-white">{phase.name}</span>
                            </div>
                            <span className="text-xs text-slate-400">
                              {phase.tasks?.length || 0} tasks
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPlan.status === 'in_progress' && (
                    <Link
                      href={`/projects/${projectId}/execution/${selectedPlan._id}`}
                      className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-sm font-medium rounded-lg transition-all text-center block"
                    >
                      View Execution
                    </Link>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 text-center py-8">Select a plan to view details</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 overflow-hidden">
            {plans.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-slate-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No plans yet</h3>
                <p className="text-slate-400 mb-6">Generate your first plan for this project.</p>
                <Link
                  href={`/new-project?projectId=${project._id}`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium rounded-lg"
                >
                  Generate Plan
                </Link>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-700/30">
                  <tr>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-3">
                      Plan
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-3">
                      Phases
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-3">
                      Est. Time
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-3">
                      Created
                    </th>
                    <th className="text-left text-xs font-medium text-slate-400 uppercase px-6 py-3">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {plans.map((plan) => (
                    <tr key={plan._id} className="hover:bg-slate-700/20">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-white">
                          {plan.wizardData?.stage1?.projectName || `Plan ${plan._id.slice(-6)}`}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusBadgeClasses(plan.status)}`}
                        >
                          {plan.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {plan.phases?.length || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300">
                        {plan.estimatedTime || 0} min
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {formatDateTime(plan.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedPlan(plan)}
                          className="text-sm text-purple-400 hover:text-purple-300"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-xl border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Project Settings</h3>
            <div className="space-y-6 max-w-xl">
              {settingsMessage && (
                <div
                  className={`p-3 rounded-lg text-sm border ${
                    settingsMessage.type === 'success'
                      ? 'bg-green-500/20 border-green-500/50 text-green-300'
                      : 'bg-red-500/20 border-red-500/50 text-red-300'
                  }`}
                >
                  {settingsMessage.text}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                />
              </div>
              {project.repositoryUrl && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Repository URL
                  </label>
                  <input
                    type="text"
                    value={project.repositoryUrl}
                    disabled
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white disabled:opacity-50"
                  />
                </div>
              )}
              <button
                onClick={handleSaveSettings}
                disabled={
                  isSavingSettings ||
                  (settingsForm.name === project.name &&
                    settingsForm.description === (project.description || ''))
                }
                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingSettings ? 'Saving...' : 'Save Changes'}
              </button>
              <div className="pt-4 border-t border-slate-700">
                <h4 className="text-sm font-medium text-red-400 mb-2">Danger Zone</h4>
                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm font-medium rounded-lg border border-red-500/30 transition-colors"
                  >
                    Delete Project
                  </button>
                ) : (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-3">
                    <p className="text-sm text-red-300">
                      Are you sure you want to delete <strong>{project.name}</strong>? This action
                      cannot be undone.
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteProject}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
