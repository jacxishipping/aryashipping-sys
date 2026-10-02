'use client';

import { Users } from 'lucide-react';
import { EmptyState } from '@/components/design-system';
import { formatRelativeTime } from '@/lib/relative-time';

export type PortalActivityItem = {
  id: string;
  action: string;
  performedAt: string;
  actor: { id: string; name: string | null; email: string | null };
  target: { id: string | null; name: string | null; email: string | null };
  summary: string;
  changes?: Record<string, unknown>;
};

type PortalActivityListProps = {
  activities: PortalActivityItem[];
  emptyTitle: string;
  emptyDescription: string;
};

export function PortalActivityList({ activities, emptyTitle, emptyDescription }: PortalActivityListProps) {
  if (activities.length === 0) {
    return <EmptyState icon={<Users className="w-10 h-10" />} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="grid gap-3">
      {activities.map((activity) => (
        <div key={activity.id} className="border border-[var(--border)] rounded-xl p-4 grid gap-1 bg-[var(--panel)]">
          <div className="font-semibold text-sm text-[var(--text-primary)]">{activity.summary}</div>
          <div className="text-xs text-[var(--text-secondary)]">
            {formatRelativeTime(activity.performedAt)} • {new Date(activity.performedAt).toLocaleString()} • {activity.actor.name || activity.actor.email || 'Unknown actor'}
          </div>
        </div>
      ))}
    </div>
  );
}