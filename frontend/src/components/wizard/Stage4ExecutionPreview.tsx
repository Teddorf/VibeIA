'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type WizardData = {
  stage1?: { projectName: string; description: string };
  stage2?: Record\u003cstring, string\u003e;
  stage3?: { selectedArchetypes: string[]; plan: any };
};

export function Stage4ExecutionPreview({ 
  wizardData, 
  onBack, 
  onStartExecution 
}: { 
  wizardData: WizardData; 
  onBack: () =\u003e void;
  onStartExecution: () =\u003e void;
}) {
  const { stage1, stage2, stage3 } = wizardData;
  const plan = stage3?.plan;

  return (
    \u003cCard className="w-full max-w-4xl mx-auto"\u003e
      \u003cCardHeader\u003e
        \u003cCardTitle className="text-3xl"\u003eStage 4: Ready to Execute\u003c/CardTitle\u003e
        \u003cCardDescription\u003e
          Review your project plan before we start building
        \u003c/CardDescription\u003e
      \u003c/CardHeader\u003e
      \u003cCardContent className="space-y-6"\u003e
        {/* Project Overview */}
        \u003cdiv className="bg-primary/5 border border-primary/20 rounded-lg p-6"\u003e
          \u003ch3 className="text-2xl font-bold mb-2"\u003e{stage1?.projectName}\u003c/h3\u003e
          \u003cp className="text-muted-foreground"\u003e{stage1?.description}\u003c/p\u003e
        \u003c/div\u003e

        {/* Business Requirements */}
        \u003cdiv className="border rounded-lg p-4"\u003e
          \u003ch4 className="font-semibold mb-3"\u003e Business Requirements\u003c/h4\u003e
          \u003cdiv className="grid gap-2 text-sm"\u003e
            {stage2 && Object.entries(stage2).map(([key, value]) =\u003e (
              \u003cdiv key={key} className="flex gap-2"\u003e
                \u003cspan className="font-medium text-muted-foreground min-w-[150px]"\u003e
                  {key.replace(/_/g, ' ').replace(/\b\w/g, l =\u003e l.toUpperCase())}:
                \u003c/span\u003e
                \u003cspan\u003e{value}\u003c/span\u003e
              \u003c/div\u003e
            ))}
          \u003c/div\u003e
        \u003c/div\u003e

        {/* Selected Archetypos */}
        \u003cdiv className="border rounded-lg p-4"\u003e
          \u003ch4 className="font-semibold mb-3"\u003e Architecture Patterns\u003c/h4\u003e
          \u003cdiv className="flex flex-wrap gap-2"\u003e
            {stage3?.selectedArchetypes.map(archetype =\u003e (
              \u003cspan 
                key={archetype}
                className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
              \u003e
                {archetype}
              \u003c/span\u003e
            ))}
          \u003c/div\u003e
        \u003c/div\u003e

        {/* Execution Plan Summary */}
        {plan && (
          \u003cdiv className="border rounded-lg p-4"\u003e
            \u003cdiv className="flex items-center justify-between mb-3"\u003e
              \u003ch4 className="font-semibold"\u003e Execution Plan\u003c/h4\u003e
              \u003cspan className="text-sm font-medium text-primary"\u003e
                Total: {plan.estimatedTime} min (~{Math.round(plan.estimatedTime / 60)} hours)
              \u003c/span\u003e
            \u003c/div\u003e
            \u003cdiv className="space-y-3"\u003e
              {plan.phases.map((phase: any, idx: number) =\u003e (
                \u003cdiv key={idx} className="pl-4 border-l-2 border-primary/30"\u003e
                  \u003cdiv className="flex items-center justify-between"\u003e
                    \u003cspan className="font-medium"\u003e{phase.name}\u003c/span\u003e
                    \u003cspan className="text-sm text-muted-foreground"\u003e
                      {phase.tasks.length} tasks  {phase.estimatedTime} min
                    \u003c/span\u003e
                  \u003c/div\u003e
                \u003c/div\u003e
              ))}
            \u003c/div\u003e
          \u003c/div\u003e
        )}

        {/* What Happens Next */}
        \u003cdiv className="bg-blue-50 border border-blue-200 rounded-lg p-4"\u003e
          \u003ch4 className="font-semibold text-blue-900 mb-2"\u003e What happens when you click Start?\u003c/h4\u003e
          \u003cul className="text-sm text-blue-800 space-y-1 list-disc list-inside"\u003e
            \u003cli\u003eWe'll create a new Git repository for your project\u003c/li\u003e
            \u003cli\u003eGenerate code for each task using AI (Claude/GPT-4)\u003c/li\u003e
            \u003cli\u003eRun quality gates (linting, security, tests) on every task\u003c/li\u003e
            \u003cli\u003eCommit each task individually with clear messages\u003c/li\u003e
            \u003cli\u003ePause for manual tasks when needed (e.g., API keys setup)\u003c/li\u003e
            \u003cli\u003eGenerate comprehensive documentation\u003c/li\u003e
          \u003c/ul\u003e
        \u003c/div\u003e

        {/* Phase 2 Notice */}
        \u003cdiv className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"\u003e
          \u003ch4 className="font-semibold text-yellow-900 mb-2"\u003e Phase 2 In Development\u003c/h4\u003e
          \u003cp className="text-sm text-yellow-800"\u003e
            The execution engine is currently being built. For now, this wizard demonstrates the 
            ultra-granular planning approach. Backend API and LLM integration coming soon!
          \u003c/p\u003e
        \u003c/div\u003e

        {/* Actions */}
        \u003cdiv className="flex justify-between pt-4"\u003e
          \u003cButton onClick={onBack} variant="outline"\u003e
             Back to Plan
          \u003c/Button\u003e
          \u003cButton 
            onClick={onStartExecution}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          \u003e
            Start Execution (Coming Soon) 
          \u003c/Button\u003e
        \u003c/div\u003e
      \u003c/CardContent\u003e
    \u003c/Card\u003e
  );
}
