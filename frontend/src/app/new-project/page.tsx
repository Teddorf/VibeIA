'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useRequireAuth } from '@/contexts/AuthContext';
import { WizardContainer } from '@/components/wizard/WizardContainer';

export default function NewProjectPage() {
  const { isLoading } = useRequireAuth();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return <WizardContainer existingProjectId={projectId || undefined} />;
}
