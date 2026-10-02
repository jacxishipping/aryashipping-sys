"use client";

import { CSSProperties, ReactNode } from 'react';

/**
 * Enhanced Skeleton Loaders
 * 
 * Multiple variants for different content types.
 * Content-aware skeletons improve perceived performance.
 * Uses global animations from globals.css for smoother effects.
 */

interface SkeletonProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
  className?: string;
  style?: CSSProperties;
}

export function Skeleton({
  variant = 'text',
  width = '100%',
  height,
  animation = 'pulse',
  className = '',
  style,
}: SkeletonProps) {
  const getDefaultHeight = () => {
    switch (variant) {
      case 'text':
        return '1em';
      case 'circular':
        return width;
      case 'rectangular':
        return 100;
      case 'rounded':
        return 100;
      default:
        return '1em';
    }
  };

  const getBorderRadius = () => {
    switch (variant) {
      case 'text':
        return '4px';
      case 'circular':
        return '50%';
      case 'rectangular':
        return '8px';
      case 'rounded':
        return '16px';
      default:
        return '4px';
    }
  };

  return (
    <div
      className={`${className} ${animation === 'wave' ? 'animate-shimmer' : 'animate-pulse'}`}
      style={{
        width,
        height: height || getDefaultHeight(),
        borderRadius: getBorderRadius(),
        backgroundColor: 'rgba(var(--border-rgb), 0.3)',
        ...(animation === 'wave' && {
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(90deg, transparent, rgba(var(--panel-rgb), 0.5), transparent)',
          backgroundSize: '200% 100%',
        }),
        ...style,
      }}
    />
  );
}

// Text Skeleton (single line)
export function SkeletonText({ width = '100%', className }: { width?: string | number; className?: string }) {
  return <Skeleton variant="text" width={width} animation="pulse" className={className} />;
}

// Paragraph Skeleton (multiple lines)
export function SkeletonParagraph({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? '60%' : '100%'}
          animation="pulse"
        />
      ))}
    </div>
  );
}

// Avatar Skeleton
export function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return <Skeleton variant="circular" width={size} height={size} animation="pulse" className={className} />;
}

// Card Skeleton
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar size={48} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" animation="pulse" />
          <Skeleton variant="text" width="40%" animation="pulse" />
        </div>
      </div>
      <SkeletonParagraph lines={2} />
      <div className="flex gap-2 mt-2">
        <Skeleton variant="rounded" width={80} height={32} animation="pulse" />
        <Skeleton variant="rounded" width={80} height={32} animation="pulse" />
      </div>
    </div>
  );
}

// Table Row Skeleton
export function SkeletonTableRow({ columns = 4, className = '' }: { columns?: number; className?: string }) {
  return (
    <div
      className={`grid gap-4 p-4 border-b border-[var(--border)] ${className}`}
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} variant="text" animation="pulse" />
      ))}
    </div>
  );
}

// Table Skeleton (multiple rows)
export function SkeletonTable({ rows = 5, columns = 4, className = '' }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={className}>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonTableRow key={index} columns={columns} />
      ))}
    </div>
  );
}

// Stats Card Skeleton
export function SkeletonStatsCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 rounded-2xl border border-[var(--border)] bg-[var(--panel)] flex items-center gap-3 ${className}`}>
      <Skeleton variant="rounded" width={48} height={48} animation="pulse" />
      <div className="flex-1">
        <Skeleton variant="text" width="40%" animation="pulse" />
        <Skeleton variant="text" width="60%" height={32} animation="pulse" />
      </div>
    </div>
  );
}

// Form Field Skeleton
export function SkeletonFormField({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <Skeleton variant="text" width="30%" animation="pulse" />
      <Skeleton variant="rounded" width="100%" height={40} animation="pulse" />
    </div>
  );
}

// Image Skeleton
export function SkeletonImage({ 
  width = '100%', 
  height = 200, 
  aspectRatio,
  className 
}: { 
  width?: string | number; 
  height?: string | number;
  aspectRatio?: string;
  className?: string;
}) {
  return (
    <Skeleton
      variant="rounded"
      width={width}
      height={height}
      animation="wave"
      className={className}
      style={{ aspectRatio }}
    />
  );
}

// Container for skeleton group
export function SkeletonGroup({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {children}
    </div>
  );
}
