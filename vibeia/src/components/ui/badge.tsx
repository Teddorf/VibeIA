import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  const variants = {
    default: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    secondary: 'bg-slate-700/50 text-slate-300 border-slate-600/50',
    destructive: 'bg-red-500/20 text-red-300 border-red-500/30',
    outline: 'bg-transparent text-slate-300 border-slate-600',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
