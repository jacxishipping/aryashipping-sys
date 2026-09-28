import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const progressVariants = cva(
  'relative h-2 w-full overflow-hidden rounded-full bg-neutral-200',
  {
    variants: {
      variant: {
        default: 'bg-neutral-200',
        brand: 'bg-brand-navy/20',
        success: 'bg-success-200',
        warning: 'bg-warning-200',
        error: 'bg-error-200',
      },
      size: {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3',
        xl: 'h-4',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

const progressIndicatorVariants = cva(
  'h-full w-full flex-1 transition-all duration-300 ease-in-out',
  {
    variants: {
      variant: {
        default: 'bg-brand-cyan',
        brand: 'bg-gradient-to-r from-brand-cyan to-brand-cyan-dark',
        success: 'bg-success-500',
        warning: 'bg-warning-500',
        error: 'bg-error-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface ProgressProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof progressVariants> {
  value?: number;
  max?: number;
  showValue?: boolean;
  animated?: boolean;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({
    className,
    variant,
    size,
    value = 0,
    max = 100,
    showValue = false,
    animated = true,
    ...props
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
      <div className="space-y-1">
        <div
          ref={ref}
          className={cn(progressVariants({ variant, size }), className)}
          {...props}
        >
          <div
            className={cn(
              progressIndicatorVariants({ variant }),
              animated && 'transition-all duration-500 ease-out'
            )}
            style={{ transform: `translateX(-${100 - percentage}%)` }}
          />
        </div>

        {showValue && (
          <div className="flex justify-between items-center text-ui-xs text-neutral-600">
            <span>Progress</span>
            <span>{Math.round(percentage)}%</span>
          </div>
        )}
      </div>
    );
  }
);
Progress.displayName = 'Progress';

export { Progress, progressVariants, progressIndicatorVariants };
