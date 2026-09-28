import { cn } from '@/lib/utils';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  animation = 'pulse',
  className,
  style,
  ...props
}: SkeletonProps) {
  const baseClasses = 'bg-[var(--panel)] relative overflow-hidden';
  
  const variantClasses = {
    text: 'h-4 rounded',
    rectangular: 'rounded',
    circular: 'rounded-full',
    rounded: 'rounded-xl',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: '',
  };

  const dimensionStyles = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    ...style,
  };

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        animationClasses[animation],
        className
      )}
      style={dimensionStyles}
      {...props}
    >
      {animation === 'wave' && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      )}
    </div>
  );
}

// Skeleton variants for common use cases
export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '80%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('p-4 border border-[var(--border)] rounded-xl bg-[var(--background)] space-y-4', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" width="60%" height={20} animation="pulse" />
          <Skeleton variant="text" width="40%" height={16} animation="pulse" />
        </div>
        <Skeleton variant="circular" width={40} height={40} animation="pulse" />
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" width="100%" animation="pulse" />
        <Skeleton variant="text" width="80%" animation="pulse" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rectangular" width={80} height={32} animation="pulse" />
        <Skeleton variant="rectangular" width={80} height={32} animation="pulse" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" height={20} className="flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" height={16} className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 40 }: { size?: number }) {
  return <Skeleton variant="circular" width={size} height={size} />;
}

export function SkeletonImage({ aspectRatio = '16/9', className }: { aspectRatio?: string; className?: string }) {
  return (
    <Skeleton
      variant="rectangular"
      className={cn('w-full', className)}
      style={{ aspectRatio }}
    />
  );
}
