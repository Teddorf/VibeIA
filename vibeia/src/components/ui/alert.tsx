import * as React from 'react';
import { cn } from '@/lib/utils';

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive' | 'warning' | 'success';
}

function Alert({ className, variant = 'default', ...props }: AlertProps) {
  const variants = {
    default: 'bg-slate-800/50 border-slate-700/50 text-slate-300',
    destructive: 'bg-red-900/20 border-red-500/50 text-red-400',
    warning: 'bg-yellow-900/20 border-yellow-500/50 text-yellow-400',
    success: 'bg-green-900/20 border-green-500/50 text-green-400',
  };

  return (
    <div
      role="alert"
      className={cn('relative w-full rounded-lg border p-4', variants[variant], className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
  );
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn('text-sm opacity-80', className)} {...props} />;
}

export { Alert, AlertTitle, AlertDescription };
