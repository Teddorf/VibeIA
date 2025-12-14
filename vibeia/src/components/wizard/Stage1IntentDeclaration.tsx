'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

export function Stage1IntentDeclaration({ onNext }: { onNext: (data: any) => void }) {
  const [projectName, setProjectName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = () => {
    if (projectName && description) {
      onNext({ projectName, description });
    }
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-3xl">Stage 1: What do you want to build?</CardTitle>
        <CardDescription>
          Tell us about your project. Don't worry about being too specific yet - we'll help you refine it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="project-name" className="text-sm font-medium">
            Project Name
          </label>
          <Input
            id="project-name"
            placeholder="e.g., E-commerce Platform, Task Manager, Blog"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium">
            What do you want to build?
          </label>
          <Textarea
            id="description"
            placeholder="Describe your idea in a few sentences. What problem does it solve? Who is it for?"
            rows={8}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Example: "I want to build a task management app for remote teams. It should allow users to create projects, assign tasks, and track progress in real-time."
          </p>
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit}
            disabled={!projectName || !description}
            size="lg"
          >
            Next: Business Analysis 
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
