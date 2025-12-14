'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stage1IntentDeclaration } from './Stage1IntentDeclaration';
import { Stage2BusinessAnalysis } from './Stage2BusinessAnalysis';
import { Stage3TechnicalAnalysis } from './Stage3TechnicalAnalysis';
import { Stage4ExecutionPreview } from './Stage4ExecutionPreview';
import { ExecutionDashboard } from '@/components/execution/ExecutionDashboard';
import { Progress } from '@/components/ui/progress';

interface WizardContainerProps {
  existingProjectId?: string;
}

export function WizardContainer({ existingProjectId }: WizardContainerProps) {
  const router = useRouter();
  const [stage, setStage] = useState(1);
  const [wizardData, setWizardData] = useState<any>({});
  const [executionInfo, setExecutionInfo] = useState<{ projectId: string; planId: string } | null>(null);

  const handleStageComplete = (data: any) => {
    setWizardData((prev: any) => ({ ...prev, [`stage${stage}`]: data }));
    setStage((prev) => prev + 1);
  };

  const handleBack = () => {
    setStage((prev) => Math.max(1, prev - 1));
  };

  const handleStartExecution = (projectId: string, planId: string) => {
    setExecutionInfo({ projectId, planId });
    setStage(5); // Move to execution view
  };

  const handleExecutionComplete = () => {
    // Navigate to project page on completion
    if (executionInfo?.projectId) {
      router.push(`/projects/${executionInfo.projectId}`);
    } else {
      router.push('/dashboard');
    }
  };

  const progress = (stage / 5) * 100;

  if (stage === 5 && executionInfo) {
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Stage {stage} of 4</span>
          <span>{Math.round(progress)}% Complete</span>
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
        <Stage4ExecutionPreview 
          wizardData={wizardData} 
          onBack={handleBack}
          onStartExecution={handleStartExecution}
        />
      )}
    </div>
  );
}