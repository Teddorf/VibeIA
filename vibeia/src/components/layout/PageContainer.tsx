'use client';

import React, { useId } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Breadcrumbs, BreadcrumbItem } from './Breadcrumbs';

// ============================================
// TYPES
// ============================================

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export interface PageContainerProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
  error?: string;
  onRetry?: () => void;
  isEmpty?: boolean;
  emptyState?: EmptyStateProps;
  variant?: 'full' | 'narrow' | 'default';
  noPadding?: boolean;
  showBack?: boolean;
  backHref?: string;
  className?: string;
}

// ============================================
// LOADING SKELETON
// ============================================

const LoadingSkeleton = () => (
  <div data-testid="page-loading" className="space-y-4 animate-pulse">
    <div className="h-8 bg-slate-700 rounded w-1/3" />
    <div className="h-4 bg-slate-700 rounded w-1/2" />
    <div className="space-y-3 mt-8">
      <div className="h-32 bg-slate-700 rounded" />
      <div className="h-32 bg-slate-700 rounded" />
    </div>
  </div>
);

// ============================================
// ERROR STATE
// ============================================

const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
      <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    </div>
    <p className="text-lg font-medium text-white mb-2">Something went wrong</p>
    <p className="text-slate-400 mb-4">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        Retry
      </button>
    )}
  </div>
);

// ============================================
// EMPTY STATE
// ============================================

const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 mb-4 rounded-full bg-slate-700 flex items-center justify-center">
      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    </div>
    <p className="text-lg font-medium text-white mb-2">{title}</p>
    {description && <p className="text-slate-400 mb-4">{description}</p>}
    {action}
  </div>
);

// ============================================
// BACK BUTTON
// ============================================

const BackButton = ({ href }: { href?: string }) => {
  const router = useRouter();

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 rounded"
        aria-label="Go back"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back</span>
      </Link>
    );
  }

  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 rounded"
      aria-label="Go back"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span>Back</span>
    </button>
  );
};

// ============================================
// COMPONENT
// ============================================

export function PageContainer({
  title,
  description,
  breadcrumbs,
  actions,
  children,
  loading = false,
  loadingComponent,
  error,
  onRetry,
  isEmpty = false,
  emptyState,
  variant = 'default',
  noPadding = false,
  showBack = false,
  backHref,
  className = '',
}: PageContainerProps) {
  const titleId = useId();

  const variantClasses = {
    full: 'max-w-full',
    narrow: 'max-w-3xl',
    default: 'max-w-7xl',
  };

  const paddingClasses = noPadding ? '' : 'px-4 sm:px-6 lg:px-8 py-6';

  // Render content based on state
  const renderContent = () => {
    if (loading) {
      return loadingComponent || <LoadingSkeleton />;
    }

    if (error) {
      return <ErrorState message={error} onRetry={onRetry} />;
    }

    if (isEmpty && emptyState) {
      return <EmptyState {...emptyState} />;
    }

    return children;
  };

  return (
    <article
      role="article"
      aria-labelledby={titleId}
      data-testid="page-container"
      className={`
        mx-auto
        ${variantClasses[variant]}
        ${paddingClasses}
        ${className}
      `}
    >
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-4">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      )}

      {/* Back button */}
      {showBack && (
        <div className="mb-4">
          <BackButton href={backHref} />
        </div>
      )}

      {/* Page header */}
      <div
        data-testid="page-header"
        className="flex items-center justify-between mb-6"
      >
        <div data-testid="page-title-section">
          <h1
            id={titleId}
            className="text-2xl font-bold text-white truncate"
          >
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-slate-400">{description}</p>
          )}
        </div>

        {actions && (
          <div data-testid="page-actions" className="ml-auto flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>

      {/* Main content */}
      <div className="mt-6">
        {renderContent()}
      </div>
    </article>
  );
}

export default PageContainer;
