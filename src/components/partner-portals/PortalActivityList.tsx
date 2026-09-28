'use client';

import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import { Box, Typography } from '@mui/material';
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
    return <EmptyState icon={<PeopleOutlineIcon />} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      {activities.map((activity) => (
        <Box key={activity.id} sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 2, display: 'grid', gap: 0.5 }}>
          <Typography sx={{ fontWeight: 600 }}>{activity.summary}</Typography>
          <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {formatRelativeTime(activity.performedAt)} • {new Date(activity.performedAt).toLocaleString()} • {activity.actor.name || activity.actor.email || 'Unknown actor'}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}