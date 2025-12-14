'use client';

import React, { useState, useEffect } from 'react';
import { recommendationsApi } from '@/lib/api-client';

interface DatabaseProvider {
  id: string;
  name: string;
  type: string;
  score: number;
  pros: string[];
  cons: string[];
  hasBranching: boolean;
  pricing: {
    free: { storage: string; compute: string; price: string };
    starter: { storage: string; compute: string; price: string };
    pro: { storage: string; compute: string; price: string };
  };
}

interface DatabaseRecommendation {
  primary: DatabaseProvider;
  alternatives: DatabaseProvider[];
  reasoning: string[];
  estimatedMonthlyCost: number;
}

interface DeployRecommendation {
  architecture: {
    frontend: { id: string; name: string; setupTime: string };
    backend: { id: string; name: string; setupTime: string };
    database: string;
    cache?: string;
    diagram: string;
  };
  reasoning: string[];
  estimatedMonthlyCost: { mvp: number; growth: number; scale: number };
}

interface CostProjection {
  phases: Array<{
    name: string;
    duration: number;
    totalMonthly: number;
    totalForPhase: number;
  }>;
  year1Total: number;
  costPerUser: number;
  recommendations: string[];
  comparisonWithAWS: {
    managedPlatformsCost: number;
    awsCost: number;
    savings: number;
    savingsPercent: number;
  };
}

interface InfraRecommendationsProps {
  wizardData: {
    stage1: { projectName?: string; description?: string };
    stage2: any;
  };
  onRecommendationsComplete: (recommendations: {
    database: DatabaseRecommendation | null;
    deploy: DeployRecommendation | null;
    cost: CostProjection | null;
  }) => void;
}

export function InfraRecommendations({
  wizardData,
  onRecommendationsComplete,
}: InfraRecommendationsProps) {
  const [step, setStep] = useState<'database' | 'deploy' | 'cost' | 'summary'>('database');
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [dbRequirements, setDbRequirements] = useState({
    dataType: 'relational',
    dataVolume: 'small',
    trafficLevel: 'low',
    needsBranching: true,
    budget: 'startup',
    needsAuth: false,
    needsStorage: false,
    needsRealtime: false,
  });

  const [deployRequirements, setDeployRequirements] = useState({
    components: ['frontend', 'backend'],
    needsPreviewDeployments: true,
    trafficTier: 'mvp',
    infraComplexity: 'simple',
    budget: 'startup',
    devOpsLevel: 'low',
  });

  const [costInputs, setCostInputs] = useState({
    mvpUsers: 100,
    growthUsers: 1000,
    scaleUsers: 10000,
    mvpStorageGB: 0.5,
    growthStorageGB: 5,
    scaleStorageGB: 25,
  });

  // Results
  const [dbRecommendation, setDbRecommendation] = useState<DatabaseRecommendation | null>(null);
  const [deployRecommendation, setDeployRecommendation] = useState<DeployRecommendation | null>(null);
  const [costProjection, setCostProjection] = useState<CostProjection | null>(null);

  const handleDatabaseSubmit = async () => {
    setIsLoading(true);
    try {
      const result = await recommendationsApi.getDatabaseRecommendation(dbRequirements);
      setDbRecommendation(result);
      setStep('deploy');
    } catch (error) {
      console.error('Failed to get database recommendation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeploySubmit = async () => {
    setIsLoading(true);
    try {
      const result = await recommendationsApi.getDeployRecommendation(deployRequirements);
      setDeployRecommendation(result);
      setStep('cost');
    } catch (error) {
      console.error('Failed to get deploy recommendation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCostSubmit = async () => {
    setIsLoading(true);
    try {
      const result = await recommendationsApi.calculateCost(costInputs);
      setCostProjection(result);
      setStep('summary');
    } catch (error) {
      console.error('Failed to calculate cost:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onRecommendationsComplete({
      database: dbRecommendation,
      deploy: deployRecommendation,
      cost: costProjection,
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress Tabs */}
      <div className="flex border-b border-slate-700">
        {['database', 'deploy', 'cost', 'summary'].map((s, i) => (
          <button
            key={s}
            onClick={() => {
              if (
                (s === 'database') ||
                (s === 'deploy' && dbRecommendation) ||
                (s === 'cost' && deployRecommendation) ||
                (s === 'summary' && costProjection)
              ) {
                setStep(s as typeof step);
              }
            }}
            className={`px-4 py-2 text-sm font-medium capitalize ${
              step === s
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {i + 1}. {s === 'cost' ? 'Cost Calculator' : s}
          </button>
        ))}
      </div>

      {/* Database Step */}
      {step === 'database' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Database Configuration</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Data Type
              </label>
              <select
                value={dbRequirements.dataType}
                onChange={(e) => setDbRequirements({ ...dbRequirements, dataType: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
              >
                <option value="relational">Relational (users, orders, products)</option>
                <option value="document">Document (flexible JSON)</option>
                <option value="mixed">Mixed (relational + documents)</option>
                <option value="time_series">Time-series / Analytics</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Expected Data Volume
              </label>
              <select
                value={dbRequirements.dataVolume}
                onChange={(e) => setDbRequirements({ ...dbRequirements, dataVolume: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
              >
                <option value="small">&lt; 1 GB (MVP, small project)</option>
                <option value="medium">1-10 GB (Startup)</option>
                <option value="large">10-100 GB (Medium business)</option>
                <option value="enterprise">&gt; 100 GB (Enterprise)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Expected Traffic
              </label>
              <select
                value={dbRequirements.trafficLevel}
                onChange={(e) => setDbRequirements({ ...dbRequirements, trafficLevel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
              >
                <option value="low">&lt; 100 requests/min</option>
                <option value="medium">100-1,000 requests/min</option>
                <option value="high">1,000-10,000 requests/min</option>
                <option value="very_high">&gt; 10,000 requests/min</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Monthly Budget
              </label>
              <select
                value={dbRequirements.budget}
                onChange={(e) => setDbRequirements({ ...dbRequirements, budget: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
              >
                <option value="free">$0-10 (Free/Hobby)</option>
                <option value="startup">$10-50 (Startup)</option>
                <option value="growth">$50-200 (Growth)</option>
                <option value="enterprise">$200+ (Enterprise)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dbRequirements.needsBranching}
                onChange={(e) => setDbRequirements({ ...dbRequirements, needsBranching: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-slate-300">
                Need database branching? (Isolated DB per Git branch)
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dbRequirements.needsAuth}
                onChange={(e) => setDbRequirements({ ...dbRequirements, needsAuth: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-slate-300">Need built-in authentication?</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dbRequirements.needsRealtime}
                onChange={(e) => setDbRequirements({ ...dbRequirements, needsRealtime: e.target.checked })}
                className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
              />
              <span className="text-slate-300">Need real-time subscriptions?</span>
            </label>
          </div>

          <button
            onClick={handleDatabaseSubmit}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium rounded-lg disabled:opacity-50"
          >
            {isLoading ? 'Getting Recommendations...' : 'Get Database Recommendation'}
          </button>
        </div>
      )}

      {/* Deploy Step */}
      {step === 'deploy' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Deployment Configuration</h3>

          {dbRecommendation && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400 font-medium">
                Recommended Database: {dbRecommendation.primary.name}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                {dbRecommendation.primary.type} - Score: {dbRecommendation.primary.score}%
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Expected Traffic
              </label>
              <select
                value={deployRequirements.trafficTier}
                onChange={(e) => setDeployRequirements({ ...deployRequirements, trafficTier: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
              >
                <option value="mvp">&lt; 1,000 users/day (MVP)</option>
                <option value="small">1,000-10,000 users/day</option>
                <option value="growth">10,000-100,000 users/day</option>
                <option value="scale">&gt; 100,000 users/day</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Infrastructure Complexity
              </label>
              <select
                value={deployRequirements.infraComplexity}
                onChange={(e) => setDeployRequirements({ ...deployRequirements, infraComplexity: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
              >
                <option value="simple">Simple (Frontend + API + DB)</option>
                <option value="medium">Medium (+ Redis/Cache + Storage)</option>
                <option value="complex">Complex (+ Queue + Workers)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Monthly Budget
              </label>
              <select
                value={deployRequirements.budget}
                onChange={(e) => setDeployRequirements({ ...deployRequirements, budget: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
              >
                <option value="hobby">$0-20 (Hobby/MVP)</option>
                <option value="startup">$20-100 (Startup)</option>
                <option value="growth">$100-500 (Growth)</option>
                <option value="enterprise">$500+ (Enterprise)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                DevOps Experience
              </label>
              <select
                value={deployRequirements.devOpsLevel}
                onChange={(e) => setDeployRequirements({ ...deployRequirements, devOpsLevel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
              >
                <option value="low">Low (want managed/simple)</option>
                <option value="medium">Medium (basic configs OK)</option>
                <option value="high">High (want full control)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={deployRequirements.needsPreviewDeployments}
              onChange={(e) => setDeployRequirements({ ...deployRequirements, needsPreviewDeployments: e.target.checked })}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-500 focus:ring-purple-500"
            />
            <span className="text-slate-300">Need preview deployments per PR?</span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('database')}
              className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
            >
              Back
            </button>
            <button
              onClick={handleDeploySubmit}
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Getting Recommendations...' : 'Get Deploy Recommendation'}
            </button>
          </div>
        </div>
      )}

      {/* Cost Step */}
      {step === 'cost' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Cost Projection</h3>

          {deployRecommendation && (
            <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
              <p className="text-cyan-400 font-medium">
                Recommended Stack: {deployRecommendation.architecture.frontend.name} + {deployRecommendation.architecture.backend.name}
              </p>
              <p className="text-slate-400 text-sm mt-1">
                Database: {deployRecommendation.architecture.database}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                MVP Users/Day
              </label>
              <input
                type="number"
                value={costInputs.mvpUsers}
                onChange={(e) => setCostInputs({ ...costInputs, mvpUsers: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Growth Users/Day
              </label>
              <input
                type="number"
                value={costInputs.growthUsers}
                onChange={(e) => setCostInputs({ ...costInputs, growthUsers: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Scale Users/Day
              </label>
              <input
                type="number"
                value={costInputs.scaleUsers}
                onChange={(e) => setCostInputs({ ...costInputs, scaleUsers: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white"
              />
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('deploy')}
              className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
            >
              Back
            </button>
            <button
              onClick={handleCostSubmit}
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {isLoading ? 'Calculating...' : 'Calculate Cost Projection'}
            </button>
          </div>
        </div>
      )}

      {/* Summary Step */}
      {step === 'summary' && costProjection && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-white">Infrastructure Summary</h3>

          {/* Database */}
          {dbRecommendation && (
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <h4 className="text-purple-400 font-medium mb-2">Database: {dbRecommendation.primary.name}</h4>
              <p className="text-slate-400 text-sm">{dbRecommendation.primary.type}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {dbRecommendation.primary.pros.slice(0, 3).map((pro, i) => (
                  <span key={i} className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded">
                    {pro}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Deploy */}
          {deployRecommendation && (
            <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
              <h4 className="text-cyan-400 font-medium mb-2">Deployment Architecture</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-500">Frontend:</span>
                  <span className="text-white ml-2">{deployRecommendation.architecture.frontend.name}</span>
                </div>
                <div>
                  <span className="text-slate-500">Backend:</span>
                  <span className="text-white ml-2">{deployRecommendation.architecture.backend.name}</span>
                </div>
              </div>
            </div>
          )}

          {/* Cost Projection */}
          <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
            <h4 className="text-yellow-400 font-medium mb-4">Cost Projection</h4>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {costProjection.phases.map((phase) => (
                <div key={phase.name} className="text-center">
                  <p className="text-slate-400 text-sm">{phase.name}</p>
                  <p className="text-2xl font-bold text-white">${phase.totalMonthly}</p>
                  <p className="text-slate-500 text-xs">/month</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-700 pt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-slate-400 text-sm">Year 1 Total</p>
                <p className="text-xl font-bold text-white">${costProjection.year1Total}</p>
              </div>
              <div>
                <p className="text-slate-400 text-sm">vs AWS Savings</p>
                <p className="text-xl font-bold text-green-400">
                  {costProjection.comparisonWithAWS.savingsPercent}%
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('cost')}
              className="px-4 py-2 border border-slate-600 text-slate-300 rounded-lg hover:bg-slate-700"
            >
              Back
            </button>
            <button
              onClick={handleComplete}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-medium rounded-lg"
            >
              Continue to Plan Generation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
