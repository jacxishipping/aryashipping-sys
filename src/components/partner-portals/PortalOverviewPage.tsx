'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  CheckSquare,
  Users,
  History,
  UserPlus,
  Eye,
  Check,
} from 'lucide-react';
import { DashboardGrid, DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PageHeader, Skeleton, SkeletonParagraph, toast } from '@/components/design-system';
import { formatRelativeTime } from '@/lib/relative-time';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
};

type ShipmentAssignment = {
  id: string;
  assignedAt?: string;
  notes: string | null;
  partnerCustomer: { id: string; name: string } | null;
  shipment: {
    id: string;
    vehicleType: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    status: string;
    serviceType: string;
  };
};

type PortalCustomer = {
  id: string;
  name: string;
  email?: string | null;
  _count?: {
    shipmentAssignments?: number;
  };
};

type PortalMembership = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
  };
};

type PortalActivity = {
  id: string;
  action: string;
  performedAt: string;
  summary: string;
  actor?: { name: string | null; email: string | null };
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.error || 'Request failed') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return data as T;
}

function formatVehicleLabel(shipment: ShipmentAssignment['shipment']) {
  return [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType;
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  tone = 'brand',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  helper: string;
  tone?: 'brand' | 'accent' | 'neutral' | 'warm';
}) {
  const backgrounds = {
    brand: 'linear-gradient(135deg, rgba(var(--brand-primary-rgb),0.16), rgba(var(--brand-primary-rgb),0.06))',
    accent: 'linear-gradient(135deg, rgba(var(--accent-rgb),0.16), rgba(var(--accent-rgb),0.06))',
    neutral: 'linear-gradient(135deg, rgba(15,23,42,0.08), rgba(15,23,42,0.03))',
    warm: 'linear-gradient(135deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))',
  } as const;

  return (
    <div
      style={{ background: backgrounds[tone] }}
      className="grid gap-2 border border-[var(--border)] rounded-xl p-4 content-start"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.78rem] tracking-[0.12em] uppercase text-[var(--text-secondary)] font-medium">
          {label}
        </span>
        <div className="text-[var(--text-secondary)] inline-flex shrink-0">{icon}</div>
      </div>
      <div className="text-[1.45rem] font-extrabold tracking-tight leading-tight text-[var(--text-primary)]">
        {value}
      </div>
      <div className="text-[0.82rem] text-[var(--text-secondary)] break-words">
        {helper}
      </div>
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <div className="grid gap-2 border border-[var(--border)] rounded-xl p-4 bg-[var(--panel)] content-start">
      <div className="flex items-center justify-between gap-2">
        <Skeleton variant="text" width="55%" height={16} />
        <Skeleton variant="rounded" width={22} height={22} />
      </div>
      <Skeleton variant="text" width="35%" height={34} />
      <Skeleton variant="text" width="85%" height={14} />
    </div>
  );
}

export default function PortalOverviewPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [assignments, setAssignments] = useState<ShipmentAssignment[]>([]);
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [memberships, setMemberships] = useState<PortalMembership[]>([]);
  const [activities, setActivities] = useState<PortalActivity[]>([]);
  const [canViewActivity, setCanViewActivity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [partialLoadWarning, setPartialLoadWarning] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      try {
        setLoading(true);

        const [shipmentsResult, customersResult, membershipsResult, activityResult] = await Promise.allSettled([
          readJson<{ portal: PortalInfo; assignments: ShipmentAssignment[] }>(`/api/partner-portals/${portalId}/shipments`),
          readJson<{ portal: PortalInfo; customers: PortalCustomer[] }>(`/api/partner-portals/${portalId}/customers`),
          readJson<{ portal: PortalInfo; memberships: PortalMembership[] }>(`/api/partner-portals/${portalId}/memberships`),
          readJson<{ portal: PortalInfo; activities: PortalActivity[] }>(`/api/partner-portals/${portalId}/activity?limit=5`),
        ]);

        if (shipmentsResult.status === 'rejected') {
          throw shipmentsResult.reason;
        }

        if (customersResult.status === 'rejected') {
          throw customersResult.reason;
        }

        if (membershipsResult.status === 'rejected') {
          throw membershipsResult.reason;
        }

        if (cancelled) {
          return;
        }

        setPortal(shipmentsResult.value.portal || customersResult.value.portal || membershipsResult.value.portal);
        setAssignments(shipmentsResult.value.assignments || []);
        setCustomers(customersResult.value.customers || []);
        setMemberships(membershipsResult.value.memberships || []);

        if (activityResult.status === 'fulfilled') {
          setActivities(activityResult.value.activities || []);
          setCanViewActivity(true);
        } else {
          setActivities([]);
          const activityError = activityResult.reason as Error & { status?: number };
          if (activityError?.status === 403) {
            setCanViewActivity(false);
            setPartialLoadWarning(null);
          } else {
            setCanViewActivity(true);
            setPartialLoadWarning('Recent activity could not be loaded. It may be temporarily unavailable.');
          }
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load portal overview');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (portalId) {
      void loadOverview();
    }

    return () => {
      cancelled = true;
    };
  }, [portalId]);

  const linkedShipments = assignments.filter((assignment) => assignment.partnerCustomer).length;
  const adminCount = memberships.filter((membership) => membership.role === 'ADMIN').length;
  const statusBreakdown = useMemo(() => {
    const counts = new Map<string, number>();

    assignments.forEach((assignment) => {
      counts.set(assignment.shipment.status, (counts.get(assignment.shipment.status) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
  }, [assignments]);

  const customerCoverage = useMemo(() => {
    const counts = new Map<string, number>();

    assignments.forEach((assignment) => {
      if (!assignment.partnerCustomer?.name) {
        return;
      }

      counts.set(assignment.partnerCustomer.name, (counts.get(assignment.partnerCustomer.name) || 0) + 1);
    });

    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]).slice(0, 5);
  }, [assignments]);

  const recentAssignments = assignments.slice(0, 5);

  return (
    <DashboardSurface>
      <PageHeader
        title={`${portal?.name || 'Portal'} Overview`}
        description={
          loading
            ? 'Loading portal workspace data.'
            : `Workspace activity for ${portal?.name || 'this portal'}.`
        }
        meta={[
          { label: 'Shipments', value: assignments.length, helper: 'Assigned to this portal' },
          { label: 'Customers', value: customers.length, helper: 'Downstream accounts' },
          { label: 'Members', value: memberships.length, helper: `${adminCount} admin${adminCount === 1 ? '' : 's'}` },
        ]}
      />

      {loading ? (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </DashboardGrid>
          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.35fr_1fr]">
            <DashboardPanel title="Operational Snapshot" description="See what is moving through this partner workspace right now.">
              <div className="grid gap-4">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="grid gap-1.5">
                    <div className="flex justify-between items-center">
                      <Skeleton variant="text" width="40%" height={18} />
                      <Skeleton variant="text" width="8%" height={16} />
                    </div>
                    <Skeleton variant="rounded" height={10} />
                  </div>
                ))}
              </div>
            </DashboardPanel>
            <DashboardPanel title="Customer Coverage" description="Track how much of the portal workload is already linked to end customers.">
              <div className="grid gap-3">
                <Skeleton variant="rounded" height={92} />
                <SkeletonParagraph lines={3} />
              </div>
            </DashboardPanel>
          </DashboardGrid>
          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <DashboardPanel title="Recent Shipment Activity" description="The latest vehicles currently visible in this partner workspace.">
              <div className="grid gap-3">
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} variant="rounded" height={96} />
                ))}
              </div>
            </DashboardPanel>
            <DashboardPanel title="Team And Activity" description="Who has access to this workspace and what has changed recently.">
              <div className="grid gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <div key={index} className="flex items-center justify-between gap-4">
                    <div className="flex-1 grid gap-1">
                      <Skeleton variant="text" width="55%" height={16} />
                      <Skeleton variant="text" width="75%" height={13} />
                    </div>
                    <Skeleton variant="rounded" width={64} height={24} />
                  </div>
                ))}
              </div>
            </DashboardPanel>
          </DashboardGrid>
        </>
      ) : assignments.length === 0 && customers.length === 0 && memberships.length === 0 ? (
        <DashboardPanel>
          <div className="grid gap-6">
            <EmptyState
              icon={<LayoutDashboard className="w-10 h-10" />}
              title="Portal workspace is still empty"
              description="This portal is active, but it does not have shipments, customers, or members loaded yet."
            />
            <div className="grid gap-3 border border-[var(--border)] rounded-xl p-4 bg-[var(--panel)]">
              <span className="text-[0.8rem] tracking-[0.14em] uppercase text-[var(--text-secondary)] font-semibold">
                Getting started
              </span>
              {[
                { step: 1, label: 'Invite your team members', href: `/portal/${portalId}/members`, done: memberships.length > 0, description: 'Give teammates their own portal login.' },
                { step: 2, label: 'Add your portal customers', href: `/portal/${portalId}/customers`, done: customers.length > 0, description: 'Create the downstream customer records shipments roll up under.' },
                { step: 3, label: 'Link assigned shipments', href: `/portal/${portalId}/shipments`, done: assignments.length > 0, description: 'Map the shipments shared from the main system to your customers.' },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] ${
                    item.done ? 'bg-[rgba(34,197,94,0.06)]' : 'bg-transparent'
                  }`}
                >
                  <div
                    aria-hidden
                    className={`w-7 h-7 rounded-full grid place-items-center shrink-0 font-extrabold text-[0.8rem] ${
                      item.done
                        ? 'bg-[var(--success)] text-white'
                        : 'bg-[rgba(var(--text-primary-rgb),0.08)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {item.done ? <Check className="w-4 h-4" /> : item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[0.92rem] font-bold text-[var(--text-primary)]">{item.label}</div>
                    <div className="text-[0.8rem] text-[var(--text-secondary)]">{item.description}</div>
                  </div>
                  <Link href={item.href} className="no-underline">
                    <Button variant={item.done ? 'outline' : 'primary'} size="sm">
                      {item.done ? 'Review' : 'Start'}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </DashboardPanel>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Package className="w-5 h-5" />}
              label="Assigned Shipments"
              value={assignments.length}
              helper="Visible to this partner from the main system"
              tone="brand"
            />
            <MetricCard
              icon={<CheckSquare className="w-5 h-5" />}
              label="Linked To Customers"
              value={linkedShipments}
              helper={`${assignments.length - linkedShipments} shipment${assignments.length - linkedShipments === 1 ? '' : 's'} still unlinked`}
              tone="accent"
            />
            <MetricCard
              icon={<Users className="w-5 h-5" />}
              label="Workspace Members"
              value={memberships.length}
              helper="Shared access inside this portal workspace"
              tone="neutral"
            />
            <MetricCard
              icon={<UserPlus className="w-5 h-5" />}
              label="Portal Customers"
              value={customers.length}
              helper="Partner-managed downstream customer records"
              tone="warm"
            />
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.35fr_1fr]">
            <DashboardPanel
              title="Operational Snapshot"
              description="See what is moving through this partner workspace right now."
              actions={
                <Link href={`/portal/${portalId}/shipments`} className="no-underline">
                  <Button variant="outline" size="sm">View all shipments</Button>
                </Link>
              }
            >
              {statusBreakdown.length === 0 ? (
                <div className="text-[var(--text-secondary)]">No shipment movement has been assigned to this portal yet.</div>
              ) : (
                <div className="grid gap-3">
                  {statusBreakdown.map(([status, count]) => {
                    const ratio = assignments.length > 0 ? Math.max(8, Math.round((count / assignments.length) * 100)) : 0;
                    return (
                      <div key={status} className="grid gap-1.5">
                        <div className="flex justify-between gap-2 items-center">
                          <span className="text-[0.9rem] font-semibold text-[var(--text-primary)]">{formatStatusLabel(status)}</span>
                          <span className="text-[0.82rem] text-[var(--text-secondary)]">{count}</span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-[rgba(var(--text-primary-rgb),0.08)] overflow-hidden">
                          <div
                            className="h-full bg-[var(--brand-primary)] rounded-full transition-all"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="Customer Coverage"
              description="Track how much of the portal workload is already linked to end customers."
              actions={
                <Link href={`/portal/${portalId}/customers`} className="no-underline">
                  <Button variant="outline" size="sm">Open customers</Button>
                </Link>
              }
            >
              <div className="grid gap-3">
                <div className="p-3.5 rounded-xl bg-[rgba(var(--brand-primary-rgb),0.07)]">
                  <span className="text-[0.78rem] uppercase tracking-[0.12em] text-[var(--text-secondary)] font-medium">
                    Assignment coverage
                  </span>
                  <div className="text-[1.5rem] font-extrabold text-[var(--text-primary)]">
                    {assignments.length === 0 ? '0%' : `${Math.round((linkedShipments / assignments.length) * 100)}%`}
                  </div>
                  <div className="text-[0.82rem] text-[var(--text-secondary)]">
                    {linkedShipments} of {assignments.length} shipments are already tied to a portal customer.
                  </div>
                </div>

                {customerCoverage.length === 0 ? (
                  <div className="text-[var(--text-secondary)]">No portal customer links have been made yet.</div>
                ) : (
                  customerCoverage.map(([name, count]) => (
                    <div key={name} className="flex items-center justify-between gap-2">
                      <span className="text-[0.9rem] font-semibold text-[var(--text-primary)]">{name}</span>
                      <span className="text-[0.82rem] text-[var(--text-secondary)]">{count} shipment{count === 1 ? '' : 's'}</span>
                    </div>
                  ))
                )}
              </div>
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <DashboardPanel
              title="Recent Shipment Activity"
              description="The latest vehicles currently visible in this partner workspace."
            >
              {recentAssignments.length === 0 ? (
                <div className="text-[var(--text-secondary)]">No shipments are available to show yet.</div>
              ) : (
                <div className="grid gap-3">
                  {recentAssignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="grid gap-1 border border-[var(--border)] rounded-xl p-3.5 bg-[var(--panel)]"
                    >
                      <div className="flex justify-between gap-2 items-center flex-wrap">
                        <span className="text-[0.95rem] font-bold text-[var(--text-primary)]">{formatVehicleLabel(assignment.shipment)}</span>
                        <span className="text-[0.75rem] text-[var(--text-secondary)]">{formatStatusLabel(assignment.shipment.status)}</span>
                      </div>
                      <div className="text-[0.82rem] text-[var(--text-secondary)]">
                        {assignment.partnerCustomer?.name ? `Linked to ${assignment.partnerCustomer.name}` : 'Not linked to a portal customer yet'}
                      </div>
                      <div className="flex justify-between gap-2 items-center flex-wrap pt-1">
                        <span className="text-[0.76rem] text-[var(--text-secondary)]">{assignment.shipment.serviceType.replaceAll('_', ' ')}</span>
                        <Link href={`/portal/${portalId}/shipments/${assignment.shipment.id}`} className="no-underline">
                          <Button variant="outline" size="sm" icon={<Eye className="w-4 h-4" />}>
                            View details
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="Team And Activity"
              description="Who has access to this workspace and what has changed recently."
              actions={
                <Link href={`/portal/${portalId}/members`} className="no-underline">
                  <Button variant="outline" size="sm">Manage members</Button>
                </Link>
              }
            >
              <div className="grid gap-4">
                <div className="grid gap-2.5">
                  {memberships.slice(0, 4).map((membership) => (
                    <div key={membership.id} className="flex justify-between gap-2 items-center">
                      <div>
                        <div className="text-[0.9rem] font-semibold text-[var(--text-primary)]">{membership.user.name || membership.user.email || 'Portal member'}</div>
                        <div className="text-[0.78rem] text-[var(--text-secondary)]">{membership.user.email || 'No email'}</div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-[0.75rem] font-bold whitespace-nowrap ${
                        membership.role === 'ADMIN'
                          ? 'bg-[rgba(var(--brand-primary-rgb),0.12)] text-[var(--brand-primary)]'
                          : 'bg-[rgba(var(--text-primary-rgb),0.06)] text-[var(--text-secondary)]'
                      }`}>
                        {membership.role}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[var(--border)] pt-4 grid gap-2.5">
                  <span className="text-[0.8rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] font-medium">
                    Recent activity
                  </span>
                  {!canViewActivity ? (
                    <div className="text-[var(--text-secondary)] text-[0.85rem]">
                      Activity is available to portal admins so member changes and login access events stay controlled.
                    </div>
                  ) : partialLoadWarning ? (
                    <div className="border border-[rgba(var(--accent-gold-rgb),0.35)] rounded-lg p-2.5 bg-[rgba(var(--accent-gold-rgb),0.08)] text-[0.85rem] text-[var(--text-primary)]">
                      {partialLoadWarning}
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="text-[var(--text-secondary)] text-[0.85rem]">No recent membership activity was recorded for this portal.</div>
                  ) : (
                    activities.map((activity) => (
                      <div key={activity.id} className="grid gap-0.5">
                        <span className="text-[0.88rem] font-semibold text-[var(--text-primary)]">{activity.summary}</span>
                        <span className="text-[0.76rem] text-[var(--text-secondary)]">
                          {formatRelativeTime(activity.performedAt)}
                        </span>
                      </div>
                    ))
                  )}

                  {canViewActivity ? (
                    <Link href={`/portal/${portalId}/activity`} className="no-underline mt-1">
                      <Button variant="outline" size="sm" icon={<History className="w-4 h-4" />}>
                        View all activity
                      </Button>
                    </Link>
                  ) : null}
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>
        </>
      )}
    </DashboardSurface>
  );
}
