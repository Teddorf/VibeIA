import { cn } from '@/lib/utils';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-3',
  lg: 'w-12 h-12 border-4',
};

/**
 * Spinner de carga accesible
 * Incluye aria-label para lectores de pantalla
 */
export function Spinner({ size = 'md', className, label = 'Cargando...' }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'inline-block rounded-full border-purple-500 border-t-transparent animate-spin',
        sizeClasses[size],
        className
      )}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
}

/**
 * Overlay de carga que cubre el contenido
 */
export function LoadingOverlay({ isLoading, children, message = 'Cargando...' }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50"
          role="alert"
          aria-busy="true"
        >
          <div className="text-center">
            <Spinner size="lg" label={message} />
            <p className="mt-3 text-slate-300 text-sm">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

/**
 * Skeleton loader para contenido que está cargando
 */
export function Skeleton({ className, variant = 'text', width, height }: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-slate-700/50';

  const variantClasses = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton para cards
 */
export function CardSkeleton() {
  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton height={60} variant="rectangular" />
      <div className="flex gap-2">
        <Skeleton width={80} height={32} variant="rectangular" />
        <Skeleton width={80} height={32} variant="rectangular" />
      </div>
    </div>
  );
}

/**
 * Skeleton para lista de items
 */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1 space-y-2">
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default Spinner;
