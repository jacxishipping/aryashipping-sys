"use client";

import { Box } from '@mui/material';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import {
  SkeletonStatsCard,
  SkeletonTable,
  SkeletonText,
  SkeletonCard,
  SkeletonFormField,
  SkeletonParagraph,
} from './Skeleton';

/**
 * Page-specific skeleton loaders
 * These provide contextual loading states for different page types
 */

// Dashboard/List Page Skeleton (stats + table)
export function DashboardPageSkeleton() {
  return (
    <DashboardSurface>
      {/* Header Skeleton */}
      <Box sx={{ px: 2, pt: 3, pb: 2 }}>
        <SkeletonText width="30%" />
        <Box sx={{ mt: 0.5 }}>
          <SkeletonText width="50%" />
        </Box>
      </Box>

      {/* Stats Cards Skeleton */}
      <Box sx={{ px: 2, mb: 3 }}>
        <DashboardGrid className="grid-cols-1 md:grid-cols-4">
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </DashboardGrid>
      </Box>

      {/* Table Skeleton */}
      <Box sx={{ px: 2, pb: 4 }}>
        <DashboardPanel title="" description="">
          <SkeletonTable rows={8} columns={5} />
        </DashboardPanel>
      </Box>
    </DashboardSurface>
  );
}

// Detail Page Skeleton (info panels)
export function DetailPageSkeleton() {
  return (
    <DashboardSurface>
      {/* Header Skeleton */}
      <Box sx={{ px: 2, pt: 3, pb: 2 }}>
        <SkeletonText width="40%" />
        <Box sx={{ mt: 0.5 }}>
          <SkeletonText width="60%" />
        </Box>
      </Box>

      {/* Stats Cards Skeleton */}
      <Box sx={{ px: 2, mb: 3 }}>
        <DashboardGrid className="grid-cols-1 md:grid-cols-4">
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </DashboardGrid>
      </Box>

      {/* Content Panels Skeleton */}
      <Box sx={{ px: 2, pb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </Box>
        </Box>
      </Box>
    </DashboardSurface>
  );
}

// Form Page Skeleton
export function FormPageSkeleton() {
  return (
    <DashboardSurface>
      {/* Header Skeleton */}
      <Box sx={{ px: 2, pt: 3, pb: 2 }}>
        <SkeletonText width="30%" />
        <Box sx={{ mt: 0.5 }}>
          <SkeletonText width="50%" />
        </Box>
      </Box>

      {/* Form Fields Skeleton */}
      <Box sx={{ px: 2, pb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <DashboardPanel title="" description="">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <SkeletonFormField />
              <SkeletonFormField />
            </Box>
          </DashboardPanel>

          <DashboardPanel title="" description="">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
                <SkeletonFormField />
                <SkeletonFormField />
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2.5 }}>
                <SkeletonFormField />
                <SkeletonFormField />
              </Box>
            </Box>
          </DashboardPanel>

          <DashboardPanel title="" description="">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <SkeletonFormField />
              <SkeletonFormField />
              <SkeletonFormField />
            </Box>
          </DashboardPanel>
        </Box>
      </Box>
    </DashboardSurface>
  );
}

// Compact Skeleton (for smaller sections)
export function CompactSkeleton() {
  return (
    <Box sx={{ p: 3 }}>
      <SkeletonText width="40%" />
      <Box sx={{ mt: 2 }}>
        <SkeletonParagraph lines={4} />
      </Box>
    </Box>
  );
}

// Table Only Skeleton
export function TableSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return <SkeletonTable rows={rows} columns={columns} />;
}

// Stats Grid Skeleton
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <DashboardGrid className="grid-cols-1 md:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonStatsCard key={index} />
      ))}
    </DashboardGrid>
  );
}
