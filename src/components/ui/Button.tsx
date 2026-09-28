import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[hsl(var(--cyber-blue))] text-[rgb(var(--platinum-white))] hover:bg-[hsl(var(--cyber-blue)/.9)]',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-[hsl(var(--cyber-blue))] text-[hsl(var(--cyber-blue))] hover:bg-[hsl(var(--cyber-blue)/.1)]',
        secondary: 'bg-[rgb(var(--royal-navy))] text-[rgb(var(--platinum-white))] border border-white/10 hover:bg-[rgb(var(--royal-navy))]/90',
        ghost: 'bg-transparent text-[rgb(var(--platinum-white))] hover:bg-white/5',
        link: 'text-[hsl(var(--cyber-blue))] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 rounded-md',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-12 rounded-md px-8 text-base',
        icon: 'h-10 w-10 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
