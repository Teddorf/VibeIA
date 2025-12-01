'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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

type Plan = {
  phases: Phase[];
  estimatedTime: number;
};

type Phase = {
  name: string;
  tasks: Task[];
  estimatedTime: number;
};

type Task = {
  id: string;
  name: string;
  description: string;
  estimatedTime: number;
  dependencies: string[];
};

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
  const [generatedPlan, setGeneratedPlan] = useState\u003cPlan | null\u003e(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleArchetype = (id: string) =\u003e {
    setSelectedArchetypes(prev =\u003e 
      prev.includes(id) ? prev.filter(a =\u003e a !== id) : [...prev, id]
    );
  };

  const generatePlan = () =\u003e {
    setIsGenerating(true);
    
    // Call backend API to generate plan with LLM
    setTimeout(() =\u003e {
      const plan: Plan = {
        phases: [
          {
            name: 'Phase 1: Infrastructure Setup',
            estimatedTime: 30,
            tasks: [
              {
                id: 't1',
                name: 'Setup Database Connection',
                description: 'Configure MongoDB connection with Mongoose',
                estimatedTime: 10,
                dependencies: []
              },
              {
                id: 't2',
                name: 'Setup Redis Cache',
                description: 'Configure Redis for caching and sessions',
                estimatedTime: 10,
                dependencies: []
              },
              {
                id: 't3',
                name: 'Configure Environment Variables',
                description: 'Setup .env files with all required configs',
                estimatedTime: 10,
                dependencies: []
              }
            ]
          },
          {
            name: 'Phase 2: Authentication',
            estimatedTime: 60,
            tasks: [
              {
                id: 't4',
                name: 'Create User Schema',
                description: 'Define User model with email, password, profile',
                estimatedTime: 10,
                dependencies: ['t1']
              },
              {
                id: 't5',
                name: 'Implement JWT Strategy',
                description: 'Setup Passport JWT strategy and middleware',
                estimatedTime: 20,
                dependencies: ['t4']
              },
              {
                id: 't6',
                name: 'Create Auth Endpoints',
                description: 'POST /auth/register, /auth/login, /auth/refresh',
                estimatedTime: 20,
                dependencies: ['t5']
              },
              {
                id: 't7',
                name: 'Add Auth Tests',
                description: 'Unit and integration tests for auth flow',
                estimatedTime: 10,
                dependencies: ['t6']
              }
            ]
          },
          {
            name: 'Phase 3: Core Features',
            estimatedTime: 90,
            tasks: [
              {
                id: 't8',
                name: 'Implement Main Feature 1',
                description: 'Based on business requirements',
                estimatedTime: 30,
                dependencies: ['t6']
              },
              {
                id: 't9',
                name: 'Implement Main Feature 2',
                description: 'Based on business requirements',
                estimatedTime: 30,
                dependencies: ['t8']
              },
              {
                id: 't10',
                name: 'Add Feature Tests',
                description: 'Comprehensive test coverage',
                estimatedTime: 30,
                dependencies: ['t9']
              }
            ]
          }
        ],
        estimatedTime: 180
      };

      setGeneratedPlan(plan);
      setIsGenerating(false);
    }, 2000);
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

            \u003cdiv className="flex justify-between"\u003e
              \u003cButton onClick={onBack} variant="outline"\u003e
                 Back
              \u003c/Button\u003e
              \u003cButton 
                onClick={generatePlan}
                disabled={selectedArchetypes.length === 0 || isGenerating}
              \u003e
                {isGenerating ? 'Generating Plan...' : 'Generate Implementation Plan '}
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

              {generatedPlan.phases.map((phase, idx) =\u003e (
                \u003cdiv key={idx} className="border rounded-lg p-4"\u003e
                  \u003cdiv className="flex items-center justify-between mb-3"\u003e
                    \u003ch4 className="font-semibold"\u003e{phase.name}\u003c/h4\u003e
                    \u003cspan className="text-sm text-muted-foreground"\u003e
                      {phase.estimatedTime} min
                    \u003c/span\u003e
                  \u003c/div\u003e
                  \u003cdiv className="space-y-2"\u003e
                    {phase.tasks.map(task =\u003e (
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

