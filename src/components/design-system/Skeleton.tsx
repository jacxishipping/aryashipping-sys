"use client";

import { Box } from '@mui/material';
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
  className,
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
    <Box
      className={`${className || ''} ${animation === 'wave' ? 'animate-shimmer' : 'animate-pulse'}`}
      sx={{
        width,
        height: height || getDefaultHeight(),
        borderRadius: getBorderRadius(),
        bgcolor: 'rgba(var(--border-rgb), 0.3)',
        ...style,
        ...(animation === 'wave' && {
          position: 'relative',
          overflow: 'hidden',
          // Note: animate-shimmer from globals.css handles the gradient movement
          background: 'linear-gradient(90deg, transparent, rgba(var(--panel-rgb), 0.5), transparent)',
          backgroundSize: '200% 100%',
        }),
      }}
    />
  );
}

// Text Skeleton (single line)
export function SkeletonText({ width = '100%', className }: { width?: string | number; className?: string }) {
  return <Skeleton variant="text" width={width} animation="pulse" className={className} />;
}

// Paragraph Skeleton (multiple lines)
export function SkeletonParagraph({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? '60%' : '100%'}
          animation="pulse"
        />
      ))}
    </Box>
  );
}

// Avatar Skeleton
export function SkeletonAvatar({ size = 40, className }: { size?: number; className?: string }) {
  return <Skeleton variant="circular" width={size} height={size} animation="pulse" className={className} />;
}

// Card Skeleton
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <Box
      className={className}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid var(--border)',
        bgcolor: 'var(--panel)',
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <SkeletonAvatar size={48} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" animation="pulse" />
          <Skeleton variant="text" width="40%" animation="pulse" />
        </Box>
      </Box>
      <SkeletonParagraph lines={2} />
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Skeleton variant="rounded" width={80} height={32} animation="pulse" />
        <Skeleton variant="rounded" width={80} height={32} animation="pulse" />
      </Box>
    </Box>
  );
}

// Table Row Skeleton
export function SkeletonTableRow({ columns = 4, className }: { columns?: number; className?: string }) {
  return (
    <Box
      className={className}
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: 2,
        p: 2,
        borderBottom: '1px solid var(--border)',
      }}
    >
      {Array.from({ length: columns }).map((_, index) => (
        <Skeleton key={index} variant="text" animation="pulse" />
      ))}
    </Box>
  );
}

// Table Skeleton (multiple rows)
export function SkeletonTable({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <Box className={className}>
      {Array.from({ length: rows }).map((_, index) => (
        <SkeletonTableRow key={index} columns={columns} />
      ))}
    </Box>
  );
}

// Stats Card Skeleton
export function SkeletonStatsCard({ className }: { className?: string }) {
  return (
    <Box
      className={className}
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid var(--border)',
        bgcolor: 'var(--panel)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
      }}
    >
      <Skeleton variant="rounded" width={48} height={48} animation="pulse" />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="40%" animation="pulse" />
        <Skeleton variant="text" width="60%" height={32} animation="pulse" />
      </Box>
    </Box>
  );
}

// Form Field Skeleton
export function SkeletonFormField({ className }: { className?: string }) {
  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <Skeleton variant="text" width="30%" animation="pulse" />
      <Skeleton variant="rounded" width="100%" height={40} animation="pulse" />
    </Box>
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
export function SkeletonGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Box className={className} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {children}
    </Box>
  );
}
