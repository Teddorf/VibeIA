'use client';

import { useState } from 'react';
import { Stage1IntentDeclaration } from './Stage1IntentDeclaration';
import { Stage2BusinessAnalysis } from './Stage2BusinessAnalysis';
import { Stage3TechnicalAnalysis } from './Stage3TechnicalAnalysis';
import { Stage4ExecutionPreview } from './Stage4ExecutionPreview';

type WizardData = {
  stage1?: { projectName: string; description: string };
  stage2?: Record\u003cstring, string\u003e;
  stage3?: { selectedArchetypes: string[]; plan: any };
  stage4?: any;
};

export function WizardContainer() {
  const [currentStage, setCurrentStage] = useState(1);
  const [wizardData, setWizardData] = useState\u003cWizardData\u003e({});

  const handleStage1Next = (data: any) =\u003e {
    setWizardData({ ...wizardData, stage1: data });
    setCurrentStage(2);
  };

  const handleStage2Next = (data: any) =\u003e {
    setWizardData({ ...wizardData, stage2: data });
    setCurrentStage(3);
  };

  const handleStage2Back = () =\u003e {
    setCurrentStage(1);
  };

  const handleStage3Next = (data: any) =\u003e {
    setWizardData({ ...wizardData, stage3: data });
    setCurrentStage(4);
  };

  const handleStage3Back = () =\u003e {
    setCurrentStage(2);
  };

  const handleStage4Back = () =\u003e {
    setCurrentStage(3);
  };

  const handleStartExecution = () =\u003e {
    // Phase 2: This will trigger the execution engine
    alert('Execution engine coming in Phase 2! Backend API + LLM integration in progress.');
  };

  return (
    \u003cdiv className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-8"\u003e
      \u003cdiv className="max-w-5xl mx-auto space-y-8"\u003e
        {/* Header */}
        \u003cdiv className="text-center space-y-2"\u003e
          \u003ch1 className="text-4xl font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent"\u003e
            Vibe Coding Platform
          \u003c/h1\u003e
          \u003cp className="text-muted-foreground"\u003e
            Ultra-granular prompts for enterprise-quality code
          \u003c/p\u003e
        \u003c/div\u003e

        {/* Progress Indicator */}
        \u003cdiv className="flex items-center justify-center space-x-4"\u003e
          {[
            { num: 1, label: 'Intent' },
            { num: 2, label: 'Business' },
            { num: 3, label: 'Technical' },
            { num: 4, label: 'Execute' }
          ].map(({ num, label }, idx) =\u003e (
            \u003cdiv key={num} className="flex items-center"\u003e
              \u003cdiv className="flex flex-col items-center"\u003e
                \u003cdiv
                  className={\
                    w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all
                    \
                    \
                    \
                  \`}
                \u003e
                  {currentStage \u003e num ? '' : num}
                \u003c/div\u003e
                \u003cspan className="text-xs mt-1 text-muted-foreground font-medium"\u003e{label}\u003c/span\u003e
              \u003c/div\u003e
              {idx \u003c 3 && (
                \u003cdiv 
                  className={\
                    w-20 h-1 mb-5 transition-all
                    \
                  \`} 
                /\u003e
              )}
            \u003c/div\u003e
          ))}
        \u003c/div\u003e

        {/* Stage Content */}
        {currentStage === 1 && \u003cStage1IntentDeclaration onNext={handleStage1Next} /\u003e}
        {currentStage === 2 && (
          \u003cStage2BusinessAnalysis 
            onNext={handleStage2Next} 
            onBack={handleStage2Back}
            initialData={wizardData.stage2}
          /\u003e
        )}
        {currentStage === 3 && (
          \u003cStage3TechnicalAnalysis
            onNext={handleStage3Next}
            onBack={handleStage3Back}
            businessData={wizardData.stage2}
          /\u003e
        )}
        {currentStage === 4 && (
          \u003cStage4ExecutionPreview
            wizardData={wizardData}
            onBack={handleStage4Back}
            onStartExecution={handleStartExecution}
          /\u003e
        )}
      \u003c/div\u003e
    \u003c/div\u003e
  );
}
