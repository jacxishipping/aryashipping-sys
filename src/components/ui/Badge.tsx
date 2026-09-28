import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200',
        secondary: 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200',
        destructive: 'bg-error-100 text-error-800 hover:bg-error-200',
        success: 'bg-success-100 text-success-800 hover:bg-success-200',
        warning: 'bg-warning-100 text-warning-800 hover:bg-warning-200',
        info: 'bg-info-100 text-info-800 hover:bg-info-200',
        outline: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50',
          // Brand variants
          brand: 'bg-brand-navy text-brand-white hover:bg-brand-navy-light',
          'brand-cyan': 'bg-brand-cyan text-white hover:bg-brand-cyan-dark',
          'brand-gold': 'bg-brand-gold text-brand-charcoal hover:bg-brand-gold-light',
          // Status variants (for shipments)
          'status-pickup-scheduled': 'bg-blue-50 text-blue-700 border border-blue-200',
          'status-picked-up': 'bg-sky-50 text-sky-700 border border-sky-200',
          'status-in-transit': 'bg-blue-50 text-blue-700 border border-blue-200',
        'status-at-port': 'bg-purple-50 text-purple-700 border border-purple-200',
        'status-customs-clearance': 'bg-orange-50 text-orange-700 border border-orange-200',
        'status-out-for-delivery': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        'status-delivered': 'bg-green-50 text-green-700 border border-green-200',
        'status-delayed': 'bg-red-50 text-red-700 border border-red-200',
        'status-cancelled': 'bg-gray-50 text-gray-700 border border-gray-200',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
