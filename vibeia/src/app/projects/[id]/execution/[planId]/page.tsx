'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useRequireAuth } from '@/contexts/AuthContext';
import { useProject } from '@/hooks/queries/useProjects';
import { ExecutionDashboard } from '@/components/execution/ExecutionDashboard';

export default function ExecutionPage() {
  useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const planId = params.planId as string;

  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-700" />
          <div className="h-4 w-32 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-slate-400">
        <Link href="/dashboard" className="hover:text-white transition-colors">
          Dashboard
        </Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} className="hover:text-white transition-colors">
          {project?.name || 'Project'}
        </Link>
        <span>/</span>
        <span className="text-white">Execution</span>
      </nav>

      {/* Execution Dashboard */}
      <ExecutionDashboard
        planId={planId}
        projectId={projectId}
        projectName={project?.name || 'Project'}
        onComplete={() => router.push(`/projects/${projectId}`)}
      />
    </div>
  );
}
