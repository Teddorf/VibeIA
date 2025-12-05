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
  const [selectedArchetypes, setSelectedArchetypes] = useState<string[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleArchetype = (id: string) =\u003e {
    setSelectedArchetypes(prev =\u003e
  prev.includes(id) ? prev.filter(a =\u003e a !== id) : [...prev, id]
    );
};

const generatePlan = async() =\u003e {
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
    };

    const generatePlan = async () => {
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

    const handleNext = () => {
      if (generatedPlan) {
        onNext({
          selectedArchetypes,
          plan: generatedPlan
        });
      }
    };

    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-3xl">Stage 3: Technical Analysis</CardTitle>
          <CardDescription>
            Select architectural patterns and generate your implementation plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!generatedPlan ? (
            <>
              {/* Archetype Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Select Architecture Patterns</h3>
                <p className="text-sm text-muted-foreground">
                  Based on your requirements, we recommend these patterns:
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  {archetypes.map(archetype => (
                    <div
                      key={archetype.id}
                      onClick={() => toggleArchetype(archetype.id)}
                      className={`
                      p-4 border rounded-lg cursor-pointer transition-all
                      ${selectedArchetypes.includes(archetype.id)
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'hover:border-primary/50'}
                    `}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold">{archetype.name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {archetype.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {archetype.technologies.map(tech => (
                              <span
                                key={tech}
                                className="text-xs bg-slate-100 px-2 py-1 rounded"
                              >
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="ml-4">
                          {selectedArchetypes.includes(archetype.id) && (
                            <svg className="w-6 h-6 text-primary" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-between">
                <Button onClick={onBack} variant="outline">
                  Back
                </Button>
                <Button
                  onClick={generatePlan}
                  disabled={selectedArchetypes.length === 0 || isGenerating}
                >
                  {isGenerating ? 'Generating Plan with AI...' : 'Generate Implementation Plan '}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Generated Plan Display */}
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900"> Plan Generated Successfully</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Total estimated time: {generatedPlan.estimatedTime} minutes ({Math.round(generatedPlan.estimatedTime / 60)} hours)
                  </p>
                </div>

                {generatedPlan.phases.map((phase: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{phase.name}</h4>
                      <span className="text-sm text-muted-foreground">
                        {phase.estimatedTime} min
                      </span>
                    </div>
                    <div className="space-y-2">
                      {phase.tasks.map((task: any) => (
                        <div key={task.id} className="pl-4 border-l-2 border-slate-200">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-sm">{task.name}</p>
                              <p className="text-xs text-muted-foreground">{task.description}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {task.estimatedTime}min
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button
                  onClick={() => setGeneratedPlan(null)}
                  variant="outline"
                >
                  Modify Selection
                </Button>
                <Button onClick={handleNext}>
                  Next: Start Execution
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }
