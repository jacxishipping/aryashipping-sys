'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { siteBrandAssets } from '@/lib/site-branding';

type SiteLogoVariant = 'header' | 'main' | 'dashboard';
type SiteLogoTheme = 'light' | 'dark';

type SiteLogoProps = {
  variant?: SiteLogoVariant;
  theme?: SiteLogoTheme;
  className?: string;
  priority?: boolean;
};

type SiteMarkProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

const logoConfig: Record<SiteLogoVariant, { src: string; width: number; height: number; labelClassName: string; caption?: string }> = {
  header: {
    src: siteBrandAssets.headerLogo,
    width: 186,
    height: 56,
    labelClassName: 'text-sm font-bold uppercase tracking-[0.22em] sm:text-base',
  },
  main: {
    src: siteBrandAssets.mainLogo,
    width: 232,
    height: 108,
    labelClassName: 'text-2xl font-bold tracking-tight',
    caption: 'Vehicle Logistics',
  },
  dashboard: {
    src: siteBrandAssets.headerLogo,
    width: 132,
    height: 40,
    labelClassName: 'text-lg font-bold tracking-tight',
  },
};

function SiteMarkFallback({ size, className }: { size: number; className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-xl bg-[var(--accent-gold)] font-extrabold text-[var(--background)] shadow-sm',
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      J
    </div>
  );
}

export function SiteMark({ size = 40, className, priority = false }: SiteMarkProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <SiteMarkFallback size={size} className={className} />;
  }

  return (
    <Image
      src={siteBrandAssets.favicon}
      alt="Jacxi Shipping icon"
      width={size}
      height={size}
      priority={priority}
      className={cn('h-auto w-auto object-contain', className)}
      onError={() => setHasError(true)}
    />
  );
}

export default function SiteLogo({ variant = 'header', theme = 'light', className, priority = false }: SiteLogoProps) {
  const [hasError, setHasError] = useState(false);
  const config = logoConfig[variant];
  const fallbackTextClassName = theme === 'dark' ? 'text-white' : 'text-[var(--text-primary)]';
  const fallbackSubtextClassName = theme === 'dark' ? 'text-slate-300' : 'text-[var(--text-secondary)]';

  const fallback = useMemo(() => {
    const markSize = variant === 'main' ? 48 : variant === 'dashboard' ? 32 : 40;

    return (
      <div className={cn('flex items-center gap-3', className)}>
        <SiteMarkFallback size={markSize} />
        <div className="min-w-0">
          <div className={cn(config.labelClassName, fallbackTextClassName)}>JACXI SHIPPING</div>
          {config.caption ? <div className={cn('text-sm', fallbackSubtextClassName)}>{config.caption}</div> : null}
        </div>
      </div>
    );
  }, [className, config.caption, config.labelClassName, fallbackSubtextClassName, fallbackTextClassName, variant]);

  if (hasError) {
    return fallback;
  }

  return (
    <Image
      src={config.src}
      alt="Jacxi Shipping logo"
      width={config.width}
      height={config.height}
      priority={priority}
      className={cn('h-auto w-auto max-w-full object-contain', className)}
      onError={() => setHasError(true)}
    />
  );
}