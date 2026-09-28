import { DashboardPageSkeleton } from '@/components/design-system';

/**
 * Route-level loading boundary for the entire dashboard.
 *
 * Any navigation to a dashboard segment shows this skeleton instantly while
 * the target page's JavaScript chunk loads, instead of keeping the previous
 * page frozen on screen. Nested routes inherit this boundary unless they
 * define their own `loading.tsx`.
 */
export default function DashboardLoading() {
  return <DashboardPageSkeleton />;
}
