import { InputHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const inputVariants = cva(
  'flex w-full transition-all duration-200 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'border border-brand-gray bg-brand-white text-brand-charcoal placeholder:text-brand-gray focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:border-brand-navy focus-visible:ring-offset-2 hover:border-brand-navy/50',
        filled: 'border-0 bg-neutral-100 text-brand-charcoal placeholder:text-brand-gray focus:bg-brand-white focus:ring-2 focus:ring-brand-navy',
        outline: 'border-2 border-brand-cyan/30 bg-transparent text-brand-charcoal placeholder:text-brand-gray focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20',
        glass: 'glass-subtle border border-white/20 bg-white/5 text-brand-charcoal placeholder:text-brand-gray focus:border-brand-cyan/50 focus:bg-white/10',
        'glass-dark': 'glass-dark border border-brand-white/20 bg-black/10 text-brand-white placeholder:text-neutral-500 focus:border-brand-cyan/50 focus:bg-brand-navy/20',
      },
      size: {
        xs: 'h-7 px-2 text-ui-xs rounded-sm',
        sm: 'h-8 px-3 text-ui-sm rounded-md',
        md: 'h-10 px-4 text-ui-md rounded-md',
        lg: 'h-12 px-4 text-body-md rounded-lg',
        xl: 'h-14 px-4 text-body-lg rounded-xl',
      },
      state: {
        default: '',
        error: 'border-error-500 focus-visible:ring-error-500 bg-error-50',
        success: 'border-success-500 focus-visible:ring-success-500 bg-success-50',
        warning: 'border-warning-500 focus-visible:ring-warning-500 bg-warning-50',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({
    className,
    variant,
    size,
    state,
    type,
    leftIcon,
    rightIcon,
    helperText,
    ...props
  }, ref) => {
    const inputClasses = cn(
      inputVariants({ variant, size, state }),
      leftIcon && 'pl-10',
      rightIcon && 'pr-10',
      className
    );

    return (
      <div className="space-y-1">
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {leftIcon}
            </div>
          )}

          <input
            type={type}
            className={inputClasses}
            ref={ref}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
              {rightIcon}
            </div>
          )}
        </div>

        {helperText && (
          <p className={cn(
            'text-ui-sm',
            state === 'error' && 'text-error-600',
            state === 'success' && 'text-success-600',
            state === 'warning' && 'text-warning-600',
            state === 'default' && 'text-neutral-500'
          )}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input, inputVariants };
