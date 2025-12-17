'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Stage1IntentDeclaration } from './Stage1IntentDeclaration';
import { Stage2BusinessAnalysis } from './Stage2BusinessAnalysis';
import { Stage3TechnicalAnalysis } from './Stage3TechnicalAnalysis';
import { Stage3InfraStep } from './Stage3InfraStep';
import { Stage4ExecutionPreview } from './Stage4ExecutionPreview';
import { ExecutionDashboard } from '@/components/execution/ExecutionDashboard';
import { Progress } from '@/components/ui/progress';
import { useWizardProgress } from './hooks/useWizardProgress';
import { Button } from '@/components/ui/button';

interface WizardContainerProps {
  existingProjectId?: string;
}

const TOTAL_STAGES = 5; // 1: Intent, 2: Business, 3: Technical, 3.5: Infra, 4: Preview

export function WizardContainer({ existingProjectId }: WizardContainerProps) {
  const router = useRouter();
  const [stage, setStage] = useState(1);
  const [wizardData, setWizardData] = useState<any>({});
  const [executionInfo, setExecutionInfo] = useState<{ projectId: string; planId: string } | null>(null);
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);

  // Auto-save progress
  const {
    savedProgress,
    hasRestorable,
    updateProgress,
    restoreProgress,
    clearProgress,
  } = useWizardProgress();

  // Show restore prompt on mount if there's saved progress
  useEffect(() => {
    if (hasRestorable && stage === 1 && Object.keys(wizardData).length === 0) {
      setShowRestorePrompt(true);
    }
  }, [hasRestorable, stage, wizardData]);

  // Save progress on data changes
  useEffect(() => {
    if (Object.keys(wizardData).length > 0) {
      updateProgress({
        ...wizardData,
        currentStage: stage,
      });
    }
  }, [wizardData, stage, updateProgress]);

  const handleRestoreProgress = () => {
    if (savedProgress) {
      setWizardData(savedProgress);
      setStage(savedProgress.currentStage || 1);
    }
    setShowRestorePrompt(false);
  };

  const handleStartFresh = () => {
    clearProgress();
    setShowRestorePrompt(false);
  };

  const handleStageComplete = (data: any) => {
    setWizardData((prev: any) => ({ ...prev, [`stage${stage}`]: data }));
    setStage((prev) => prev + 1);
  };

  const handleBack = () => {
    setStage((prev) => Math.max(1, prev - 1));
  };

  const handleStartExecution = (projectId: string, planId: string) => {
    setExecutionInfo({ projectId, planId });
    clearProgress(); // Clear saved progress on execution start
    setStage(6); // Move to execution view (after 5 stages)
  };

  const handleExecutionComplete = () => {
    // Navigate to project page on completion
    if (executionInfo?.projectId) {
      router.push(`/projects/${executionInfo.projectId}`);
    } else {
      router.push('/dashboard');
    }
  };

  const progress = Math.min((stage / TOTAL_STAGES) * 100, 100);

  // Execution view
  if (stage === 6 && executionInfo) {
    return (
      <div className="p-6">
        <ExecutionDashboard
          planId={executionInfo.planId}
          projectId={executionInfo.projectId}
          projectName={wizardData.stage1?.projectName || 'My Project'}
          onComplete={handleExecutionComplete}
        />
        <div className="max-w-6xl mx-auto mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Restore prompt
  if (showRestorePrompt) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Progreso encontrado</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Encontramos un proyecto sin terminar. ¿Deseas continuar donde lo dejaste?
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="outline" onClick={handleStartFresh}>
              Empezar de nuevo
            </Button>
            <Button onClick={handleRestoreProgress}>
              Continuar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Paso {stage} de {TOTAL_STAGES}</span>
          <span>{Math.round(progress)}% Completo</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {stage === 1 && (
        <Stage1IntentDeclaration onNext={handleStageComplete} />
      )}

      {stage === 2 && (
        <Stage2BusinessAnalysis
          onNext={handleStageComplete}
          onBack={handleBack}
          initialData={wizardData.stage2}
          viewMode="all"
        />
      )}

      {stage === 3 && (
        <Stage3TechnicalAnalysis
          onNext={handleStageComplete}
          onBack={handleBack}
          businessData={wizardData}
        />
      )}

      {stage === 4 && (
        <Stage3InfraStep
          context={{
            projectName: wizardData.stage1?.projectName || '',
            description: wizardData.stage1?.description || '',
            techStack: wizardData.stage3?.selectedArchetypes || [],
            scale: wizardData.stage2?.scalability,
            stage2Data: wizardData.stage2,
          }}
          onNext={handleStageComplete}
          onBack={handleBack}
        />
      )}

      {stage === 5 && (
        <Stage4ExecutionPreview
          wizardData={wizardData}
          onBack={handleBack}
          onStartExecution={handleStartExecution}
        />
      )}
    </div>
  );
}