'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, FormField, PageHeader, Select, toast } from '@/components/design-system';
import { PortalActivityList, type PortalActivityItem } from '@/components/partner-portals/PortalActivityList';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
};

type PortalActivityPageContentProps = {
  mode: 'dashboard' | 'portal';
};

export default function PortalActivityPageContent({ mode }: PortalActivityPageContentProps) {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [activities, setActivities] = useState<PortalActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [actorFilter, setActorFilter] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchActivity = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({ limit: '100' });
        if (actionFilter !== 'ALL') {
          query.set('action', actionFilter);
        }
        if (actorFilter.trim()) {
          query.set('actor', actorFilter.trim());
        }

        const response = await fetch(`/api/partner-portals/${portalId}/activity?${query.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load portal activity');
        }

        setPortal(data.portal);
        setActivities(data.activities || []);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error(error);
          toast.error(error instanceof Error ? error.message : 'Failed to load portal activity');
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchActivity();

    return () => controller.abort();
  }, [actionFilter, actorFilter, portalId]);

  const backHref = mode === 'dashboard' ? `/dashboard/partner-portals/${portalId}` : `/portal/${portalId}/members`;
  const backLabel = mode === 'dashboard' ? 'Back to Portal' : 'Back to Members';

  return (
    <DashboardSurface>
      <PageHeader
        showBreadcrumbs={mode === 'dashboard'}
        title={portal ? `${portal.name} Activity` : 'Portal Activity'}
        description="View all portal membership and access-code activity."
        meta={[
          { label: 'Events', value: activities.length, helper: 'Membership and access activity' },
        ]}
        actions={
          <Link href={backHref} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">{backLabel}</Button>
          </Link>
        }
      />

      <DashboardPanel noHeaderBorder>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-3">
            <Select label="Action" value={actionFilter} onChange={(value) => setActionFilter(String(value))} options={[{ value: 'ALL', label: 'All actions' }, { value: 'CREATE', label: 'Create' }, { value: 'UPDATE', label: 'Update' }, { value: 'DELETE', label: 'Delete' }]} />
            <FormField label="Actor" placeholder="Filter by actor name or email" value={actorFilter} onChange={(event) => setActorFilter(event.target.value)} />
          </div>

          {loading ? (
            <div className="text-sm text-[var(--text-secondary)]">Loading portal activity...</div>
          ) : (
            <PortalActivityList
              activities={activities}
              emptyTitle="No matching activity"
              emptyDescription="Try a different action or actor filter."
            />
          )}
        </div>
      </DashboardPanel>
    </DashboardSurface>
  );
}