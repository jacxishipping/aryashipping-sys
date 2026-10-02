"use client";

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
      <div className="px-2 pt-3 pb-2">
        <SkeletonText width="30%" />
        <div className="mt-1">
          <SkeletonText width="50%" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="px-2 mb-3">
        <DashboardGrid className="grid-cols-1 md:grid-cols-4">
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </DashboardGrid>
      </div>

      {/* Table Skeleton */}
      <div className="px-2 pb-4">
        <DashboardPanel title="" description="">
          <SkeletonTable rows={8} columns={5} />
        </DashboardPanel>
      </div>
    </DashboardSurface>
  );
}

// Detail Page Skeleton (info panels)
export function DetailPageSkeleton() {
  return (
    <DashboardSurface>
      {/* Header Skeleton */}
      <div className="px-2 pt-3 pb-2">
        <SkeletonText width="40%" />
        <div className="mt-1">
          <SkeletonText width="60%" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="px-2 mb-3">
        <DashboardGrid className="grid-cols-1 md:grid-cols-4">
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </DashboardGrid>
      </div>

      {/* Content Panels Skeleton */}
      <div className="px-2 pb-4">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    </DashboardSurface>
  );
}

// Form Page Skeleton
export function FormPageSkeleton() {
  return (
    <DashboardSurface>
      {/* Header Skeleton */}
      <div className="px-2 pt-3 pb-2">
        <SkeletonText width="30%" />
        <div className="mt-1">
          <SkeletonText width="50%" />
        </div>
      </div>

      {/* Form Fields Skeleton */}
      <div className="px-2 pb-4">
        <div className="flex flex-col gap-4">
          <DashboardPanel title="" description="">
            <div className="flex flex-col gap-4">
              <SkeletonFormField />
              <SkeletonFormField />
            </div>
          </DashboardPanel>

          <DashboardPanel title="" description="">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonFormField />
                <SkeletonFormField />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SkeletonFormField />
                <SkeletonFormField />
              </div>
            </div>
          </DashboardPanel>

          <DashboardPanel title="" description="">
            <div className="flex flex-col gap-4">
              <SkeletonFormField />
              <SkeletonFormField />
              <SkeletonFormField />
            </div>
          </DashboardPanel>
        </div>
      </div>
    </DashboardSurface>
  );
}

// Compact Skeleton (for smaller sections)
export function CompactSkeleton() {
  return (
    <div className="p-4">
      <SkeletonText width="40%" />
      <div className="mt-3">
        <SkeletonParagraph lines={4} />
      </div>
    </div>
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
