import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Avatar Component
 *
 * User avatar with image, initials fallback, and deterministic tint colors.
 * Replaces direct MUI Avatar usage. Zero MUI.
 */

export interface AvatarProps {
  name?: string;
  src?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  icon?: ReactNode;
  ring?: boolean;
  className?: string;
}

const sizeStyles: Record<NonNullable<AvatarProps['size']>, string> = {
  xs: 'h-6 w-6 text-[0.625rem]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
};

const tints = [
  'bg-[rgba(var(--accent-gold-rgb),0.18)] text-[#8a6d1c]',
  'bg-[rgba(var(--info-rgb),0.15)] text-[var(--info-dark)]',
  'bg-[rgba(var(--success-rgb),0.15)] text-[var(--success-dark)]',
  'bg-[rgba(var(--warning-rgb),0.18)] text-[var(--warning-dark)]',
  'bg-[rgba(var(--error-rgb),0.12)] text-[var(--error-dark)]',
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function tintForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return tints[Math.abs(hash) % tints.length];
}

export default function Avatar({
  name = '',
  src,
  size = 'md',
  icon,
  ring = false,
  className,
}: AvatarProps) {
  return (
    <span
      className={cn(
        'ds-avatar inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold',
        sizeStyles[size],
        !src && tintForName(name || '?'),
        ring && 'ring-2 ring-[var(--accent-gold)] ring-offset-2 ring-offset-[var(--panel)]',
        className
      )}
      role="img"
      aria-label={name ? `Avatar for ${name}` : 'Avatar'}
      title={name || undefined}
    >
      {src ? (
        // Plain img: avatar URLs are often remote/blob sources outside next/image config.
        <img src={src} alt={name || 'Avatar'} className="h-full w-full object-cover" />
      ) : (
        icon ?? initialsFromName(name)
      )}
    </span>
  );
}
