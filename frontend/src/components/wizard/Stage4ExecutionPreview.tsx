'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { projectsApi, executionApi } from '@/lib/api-client';

type WizardData = {
  stage1?: { projectName: string; description: string };
  stage2?: Record<string, string>;
  stage3?: { selectedArchetypes: string[]; plan: any };
};

export function Stage4ExecutionPreview({
  wizardData,
  onBack,
  onStartExecution
}: {
  wizardData: WizardData;
  onBack: () => void;
  onStartExecution: (projectId: string, planId: string) => void;
}) {
  const { stage1, stage2, stage3 } = wizardData;
  const plan = stage3?.plan;
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!stage1 || !plan) return;

    setIsStarting(true);
    setError(null);

    try {
      // 1. Create Project (userId is now taken from auth token on backend)
      const project = await projectsApi.create(
        stage1.projectName,
        stage1.description
      );

      // 2. Start Execution
      // Note: In a real app, we would associate the plan with the project here if not already done
      // For MVP, we assume the plan ID is sufficient
      await executionApi.start(plan._id);

      // 3. Navigate to Execution View (handled by parent)
      onStartExecution(project._id, plan._id);

    } catch (err: any) {
      console.error('Failed to start execution:', err);
      setError(err.message || 'Failed to start execution. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl">Stage 4: Ready to Execute</CardTitle>
        <CardDescription>
          Review your project plan before we start building
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Project Overview */}
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
          <h3 className="text-2xl font-bold mb-2">{stage1?.projectName}</h3>
          <p className="text-muted-foreground">{stage1?.description}</p>
        </div>

        {/* Business Requirements */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">📋 Business Requirements</h4>
          <div className="grid gap-2 text-sm">
            {stage2 && Object.entries(stage2).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="font-medium text-muted-foreground min-w-[150px]">
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                </span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Archetypes */}
        <div className="border rounded-lg p-4">
          <h4 className="font-semibold mb-3">🏗️ Architecture Patterns</h4>
          <div className="flex flex-wrap gap-2">
            {stage3?.selectedArchetypes.map(archetype => (
              <span
                key={archetype}
                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
              >
                {archetype}
              </span>
            ))}
          </div>
        </div>

        {/* Execution Plan Summary */}
        {plan && (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold">📅 Execution Plan</h4>
              <span className="text-sm font-medium text-primary">
                Total: {plan.estimatedTime} min (~{Math.round(plan.estimatedTime / 60)} hours)
              </span>
            </div>
            <div className="space-y-3">
              {plan.phases.map((phase: any, idx: number) => (
                <div key={idx} className="pl-4 border-l-2 border-primary/30">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{phase.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {phase.tasks.length} tasks • {phase.estimatedTime} min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What Happens Next */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">🚀 What happens when you click Start?</h4>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>We'll create a new Git repository for your project</li>
            <li>Generate code for each task using AI (Claude/GPT-4)</li>
            <li>Run quality gates (linting, security, tests) on every task</li>
            <li>Commit each task individually with clear messages</li>
            <li>Pause for manual tasks when needed (e.g., API keys setup)</li>
            <li>Generate comprehensive documentation</li>
          </ul>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-4">
          <Button onClick={onBack} variant="outline" disabled={isStarting}>
            Back to Plan
          </Button>
          <Button
            onClick={handleStart}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
            disabled={isStarting}
          >
            {isStarting ? 'Starting Engine...' : 'Start Execution 🚀'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
