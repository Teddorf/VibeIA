'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { plansApi } from '@/lib/api-client';

type Archetype = {
  id: string;
  name: string;
  description: string;
  bestFor: string[];
  technologies: string[];
};

const archetypes: Archetype[] = [
  {
    id: 'auth-jwt-stateless',
    name: 'JWT Stateless Authentication',
    description: 'Token-based auth without server-side sessions',
    bestFor: ['APIs', 'Microservices', 'Mobile apps'],
    technologies: ['JWT', 'bcrypt', 'Passport.js']
  },
  {
    id: 'auth-session-based',
    name: 'Session-based Authentication',
    description: 'Traditional sessions with Redis/DB storage',
    bestFor: ['Web apps', 'Admin panels'],
    technologies: ['Express-session', 'Redis', 'Connect-mongo']
  },
  {
    id: 'notifications-event-driven',
    name: 'Event-Driven Notifications',
    description: 'Real-time notifications with Pub/Sub',
    bestFor: ['Real-time apps', 'Collaborative tools'],
    technologies: ['Redis Pub/Sub', 'WebSocket', 'Socket.io']
  },
  {
    id: 'payments-stripe-checkout',
    name: 'Stripe Hosted Checkout',
    description: 'Stripe-hosted payment pages',
    bestFor: ['Simple e-commerce', 'Subscriptions'],
    technologies: ['Stripe Checkout', 'Webhooks']
  },
  {
    id: 'file-upload-s3-direct',
    name: 'S3 Direct Upload',
    description: 'Client uploads directly to S3 with presigned URLs',
    bestFor: ['Large files', 'Media platforms'],
    technologies: ['AWS S3', 'Presigned URLs']
  }
];

export function Stage3TechnicalAnalysis({ 
  onNext, 
  onBack, 
  businessData 
}: { 
  onNext: (data: any) => void; 
  onBack: () => void; 
  businessData: any;
}) {
  const [selectedArchetypes, setSelectedArchetypes] = useState\u003cstring[]\u003e([]);
  const [generatedPlan, setGeneratedPlan] = useState\u003cany | null\u003e(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState\u003cstring | null\u003e(null);

  const toggleArchetype = (id: string) =\u003e {
    setSelectedArchetypes(prev =\u003e 
      prev.includes(id) ? prev.filter(a =\u003e a !== id) : [...prev, id]
    );
  };

  const generatePlan = async () =\u003e {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Prepare wizard data for the API
      // We need to reconstruct the full wizard data context here or pass it down
      // For now, we'll assume businessData is Stage 2, and we need Stage 1
      // Ideally, the parent should pass the full context, but let's assume we pass what we have
      
      // NOTE: In a real app, we should pass the full wizard state. 
      // For this demo, we'll construct a payload with available data.
      const wizardPayload = {
        stage1: businessData.stage1 || { 
           // We might need to pass stage1 data as props too if we want it here
           // For now, let's assume businessData contains enough context or we update props
           projectName: 'Project', // Placeholder if not passed
           description: 'Generated from Wizard' 
        },
        stage2: businessData,
        stage3: { selectedArchetypes }
      };

      const response = await plansApi.generate(wizardPayload);
      
      // The API returns the full plan document. We want the 'phases' and 'estimatedTime'
      // The structure from backend is: { ...planDocument, phases: [...], estimatedTime: ... }
      
      setGeneratedPlan({
        phases: response.phases,
        estimatedTime: response.estimatedTime
      });
    } catch (err: any) {
      console.error('Plan generation failed:', err);
      setError(err.message || 'Failed to generate plan. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () =\u003e {
    if (generatedPlan) {
      onNext({ 
        selectedArchetypes, 
        plan: generatedPlan 
      });
    }
  };

  return (
    \u003cCard className="w-full max-w-4xl mx-auto"\u003e
      \u003cCardHeader\u003e
        \u003cCardTitle className="text-3xl"\u003eStage 3: Technical Analysis\u003c/CardTitle\u003e
        \u003cCardDescription\u003e
          Select architectural patterns and generate your implementation plan
        \u003c/CardDescription\u003e
      \u003c/CardHeader\u003e
      \u003cCardContent className="space-y-6"\u003e
        {!generatedPlan ? (
          \u003c\u003e
            {/* Archetype Selection */}
            \u003cdiv className="space-y-4"\u003e
              \u003ch3 className="text-lg font-semibold"\u003eSelect Architecture Patterns\u003c/h3\u003e
              \u003cp className="text-sm text-muted-foreground"\u003e
                Based on your requirements, we recommend these patterns:
              \u003c/p\u003e
              
              \u003cdiv className="grid gap-4 md:grid-cols-2"\u003e
                {archetypes.map(archetype =\u003e (
                  \u003cdiv
                    key={archetype.id}
                    onClick={() =\u003e toggleArchetype(archetype.id)}
                    className={\
                      p-4 border rounded-lg cursor-pointer transition-all
                      \
                    \`}
                  \u003e
                    \u003cdiv className="flex items-start justify-between"\u003e
                      \u003cdiv className="flex-1"\u003e
                        \u003ch4 className="font-semibold"\u003e{archetype.name}\u003c/h4\u003e
                        \u003cp className="text-sm text-muted-foreground mt-1"\u003e
                          {archetype.description}
                        \u003c/p\u003e
                        \u003cdiv className="mt-2 flex flex-wrap gap-1"\u003e
                          {archetype.technologies.map(tech =\u003e (
                            \u003cspan 
                              key={tech}
                              className="text-xs bg-slate-100 px-2 py-1 rounded"
                            \u003e
                              {tech}
                            \u003c/span\u003e
                          ))}
                        \u003c/div\u003e
                      \u003c/div\u003e
                      \u003cdiv className="ml-4"\u003e
                        {selectedArchetypes.includes(archetype.id) && (
                          \u003csvg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20"\u003e
                            \u003cpath fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /\u003e
                          \u003c/svg\u003e
                        )}
                      \u003c/div\u003e
                    \u003c/div\u003e
                  \u003c/div\u003e
                ))}
              \u003c/div\u003e
            \u003c/div\u003e

            {error && (
              \u003cdiv className="bg-red-50 text-red-600 p-3 rounded-md text-sm"\u003e
                {error}
              \u003c/div\u003e
            )}

            \u003cdiv className="flex justify-between"\u003e
              \u003cButton onClick={onBack} variant="outline"\u003e
                 Back
              \u003c/Button\u003e
              \u003cButton 
                onClick={generatePlan}
                disabled={selectedArchetypes.length === 0 || isGenerating}
              \u003e
                {isGenerating ? 'Generating Plan with AI...' : 'Generate Implementation Plan '}
              \u003c/Button\u003e
            \u003c/div\u003e
          \u003c/\u003e
        ) : (
          \u003c\u003e
            {/* Generated Plan Display */}
            \u003cdiv className="space-y-6"\u003e
              \u003cdiv className="bg-green-50 border border-green-200 rounded-lg p-4"\u003e
                \u003ch3 className="font-semibold text-green-900"\u003e Plan Generated Successfully\u003c/h3\u003e
                \u003cp className="text-sm text-green-700 mt-1"\u003e
                  Total estimated time: {generatedPlan.estimatedTime} minutes ({Math.round(generatedPlan.estimatedTime / 60)} hours)
                \u003c/p\u003e
              \u003c/div\u003e

              {generatedPlan.phases.map((phase: any, idx: number) =\u003e (
                \u003cdiv key={idx} className="border rounded-lg p-4"\u003e
                  \u003cdiv className="flex items-center justify-between mb-3"\u003e
                    \u003ch4 className="font-semibold"\u003e{phase.name}\u003c/h4\u003e
                    \u003cspan className="text-sm text-muted-foreground"\u003e
                      {phase.estimatedTime} min
                    \u003c/span\u003e
                  \u003c/div\u003e
                  \u003cdiv className="space-y-2"\u003e
                    {phase.tasks.map((task: any) =\u003e (
                      \u003cdiv key={task.id} className="pl-4 border-l-2 border-slate-200"\u003e
                        \u003cdiv className="flex items-start justify-between"\u003e
                          \u003cdiv\u003e
                            \u003cp className="font-medium text-sm"\u003e{task.name}\u003c/p\u003e
                            \u003cp className="text-xs text-muted-foreground"\u003e{task.description}\u003c/p\u003e
                          \u003c/div\u003e
                          \u003cspan className="text-xs text-muted-foreground"\u003e
                            {task.estimatedTime}min
                          \u003c/span\u003e
                        \u003c/div\u003e
                      \u003c/div\u003e
                    ))}
                  \u003c/div\u003e
                \u003c/div\u003e
              ))}
            \u003c/div\u003e

            \u003cdiv className="flex justify-between"\u003e
              \u003cButton 
                onClick={() =\u003e setGeneratedPlan(null)} 
                variant="outline"
              \u003e
                 Modify Selection
              \u003c/Button\u003e
              \u003cButton onClick={handleNext}\u003e
                Next: Start Execution 
              \u003c/Button\u003e
            \u003c/div\u003e
          \u003c/\u003e
        )}
      \u003c/CardContent\u003e
    \u003c/Card\u003e
  );
}

