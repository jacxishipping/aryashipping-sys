'use client';

import { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  priority?: boolean;
  sizes?: string;
  quality?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  objectFit = 'cover',
  priority = false,
  sizes,
  quality = 75,
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
    onLoad?.();
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-[var(--background)] border border-[var(--border)] rounded',
          className
        )}
        style={fill ? undefined : { width, height }}
      >
        <div className="text-center p-4">
          <svg
            className="w-12 h-12 mx-auto text-[var(--text-secondary)] opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-xs text-[var(--text-secondary)] mt-2">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)} style={fill ? undefined : { width, height }}>
      {/* Loading skeleton */}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-r from-[var(--background)] via-[var(--panel)] to-[var(--background)]',
            'animate-shimmer bg-[length:200%_100%]'
          )}
        />
      )}

      {/* Image */}
      <Image
        src={src}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        fill={fill}
        sizes={sizes}
        quality={quality}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoading ? 'opacity-0' : 'opacity-100',
          className
        )}
        style={{ objectFit }}
        unoptimized={src.startsWith('http')}
      />
    </div>
  );
}
