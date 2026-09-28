'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Box, Typography } from '@mui/material';
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
    <Box
      sx={{
        border: '1px solid var(--border)',
        borderRadius: 3,
        p: 1.75,
        background: backgrounds[tone],
        display: 'grid',
        gap: 0.85,
        alignContent: 'start',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Typography sx={{ fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
          {label}
        </Typography>
        <Box sx={{ color: 'var(--text-secondary)', display: 'inline-flex', flexShrink: 0 }}>{icon}</Box>
      </Box>
      <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>{value}</Typography>
      <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)', overflowWrap: 'anywhere' }}>{helper}</Typography>
    </Box>
  );
}

function MetricCardSkeleton() {
  return (
    <Box
      sx={{
        border: '1px solid var(--border)',
        borderRadius: 3,
        p: 1.75,
        bgcolor: 'var(--panel)',
        display: 'grid',
        gap: 0.85,
        alignContent: 'start',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
        <Skeleton variant="text" width="55%" height={16} />
        <Skeleton variant="rounded" width={22} height={22} />
      </Box>
      <Skeleton variant="text" width="35%" height={34} />
      <Skeleton variant="text" width="85%" height={14} />
    </Box>
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
          // Distinguish "no permission" from a real failure so admins are not
          // shown the admin-only copy when the activity API actually failed.
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
    };    if (portalId) {
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
              <Box sx={{ display: 'grid', gap: 1.75 }}>
                {[0, 1, 2, 3].map((index) => (
                  <Box key={index} sx={{ display: 'grid', gap: 0.65 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Skeleton variant="text" width="40%" height={18} />
                      <Skeleton variant="text" width="8%" height={16} />
                    </Box>
                    <Skeleton variant="rounded" height={10} />
                  </Box>
                ))}
              </Box>
            </DashboardPanel>
            <DashboardPanel title="Customer Coverage" description="Track how much of the portal workload is already linked to end customers.">
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Skeleton variant="rounded" height={92} />
                <SkeletonParagraph lines={3} />
              </Box>
            </DashboardPanel>
          </DashboardGrid>
          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <DashboardPanel title="Recent Shipment Activity" description="The latest vehicles currently visible in this partner workspace.">
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                {[0, 1, 2].map((index) => (
                  <Skeleton key={index} variant="rounded" height={96} />
                ))}
              </Box>
            </DashboardPanel>
            <DashboardPanel title="Team And Activity" description="Who has access to this workspace and what has changed recently.">
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                {[0, 1, 2, 3].map((index) => (
                  <Box key={index} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                    <Box sx={{ flex: 1, display: 'grid', gap: 0.5 }}>
                      <Skeleton variant="text" width="55%" height={16} />
                      <Skeleton variant="text" width="75%" height={13} />
                    </Box>
                    <Skeleton variant="rounded" width={64} height={24} />
                  </Box>
                ))}
              </Box>
            </DashboardPanel>
          </DashboardGrid>
        </>
      ) : assignments.length === 0 && customers.length === 0 && memberships.length === 0 ? (
        <DashboardPanel>
          <Box sx={{ display: 'grid', gap: 2.5 }}>
            <EmptyState
              icon={<DashboardOutlinedIcon />}
              title="Portal workspace is still empty"
              description="This portal is active, but it does not have shipments, customers, or members loaded yet."
            />
            <Box
              sx={{
                border: '1px solid var(--border)',
                borderRadius: 2.5,
                p: 2,
                bgcolor: 'var(--panel)',
                display: 'grid',
                gap: 1.25,
              }}
            >
              <Typography sx={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Getting started
              </Typography>
              {[
                { step: 1, label: 'Invite your team members', href: `/portal/${portalId}/members`, done: memberships.length > 0, description: 'Give teammates their own portal login.' },
                { step: 2, label: 'Add your portal customers', href: `/portal/${portalId}/customers`, done: customers.length > 0, description: 'Create the downstream customer records shipments roll up under.' },
                { step: 3, label: 'Link assigned shipments', href: `/portal/${portalId}/shipments`, done: assignments.length > 0, description: 'Map the shipments shared from the main system to your customers.' },
              ].map((item) => (
                <Box
                  key={item.step}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    p: 1.25,
                    borderRadius: 2,
                    border: '1px solid var(--border)',
                    bgcolor: item.done ? 'rgba(34,197,94,0.06)' : 'transparent',
                  }}
                >
                  <Box
                    aria-hidden
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      bgcolor: item.done ? 'var(--success)' : 'rgba(var(--text-primary-rgb),0.08)',
                      color: item.done ? '#fff' : 'var(--text-secondary)',
                      fontWeight: 800,
                      fontSize: '0.8rem',
                    }}
                  >
                    {item.done ? '✓' : item.step}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>{item.label}</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.description}</Typography>
                  </Box>
                  <Link href={item.href} style={{ textDecoration: 'none' }}>
                    <Button variant={item.done ? 'outline' : 'primary'} size="sm">
                      {item.done ? 'Review' : 'Start'}
                    </Button>
                  </Link>
                </Box>
              ))}
            </Box>
          </Box>
        </DashboardPanel>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<Inventory2OutlinedIcon fontSize="small" />}
              label="Assigned Shipments"
              value={assignments.length}
              helper="Visible to this partner from the main system"
              tone="brand"
            />
            <MetricCard
              icon={<AssignmentTurnedInOutlinedIcon fontSize="small" />}
              label="Linked To Customers"
              value={linkedShipments}
              helper={`${assignments.length - linkedShipments} shipment${assignments.length - linkedShipments === 1 ? '' : 's'} still unlinked`}
              tone="accent"
            />
            <MetricCard
              icon={<GroupOutlinedIcon fontSize="small" />}
              label="Workspace Members"
              value={memberships.length}
              helper="Shared access inside this portal workspace"
              tone="neutral"
            />
            <MetricCard
              icon={<PersonAddAltOutlinedIcon fontSize="small" />}
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
                <Link href={`/portal/${portalId}/shipments`} style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm">View all shipments</Button>
                </Link>
              }
            >
              {statusBreakdown.length === 0 ? (
                <Box sx={{ color: 'var(--text-secondary)' }}>No shipment movement has been assigned to this portal yet.</Box>
              ) : (
                <Box sx={{ display: 'grid', gap: 1.25 }}>
                  {statusBreakdown.map(([status, count]) => {
                    const ratio = assignments.length > 0 ? Math.max(8, Math.round((count / assignments.length) * 100)) : 0;
                    return (
                      <Box key={status} sx={{ display: 'grid', gap: 0.65 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                          <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{formatStatusLabel(status)}</Typography>
                          <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{count}</Typography>
                        </Box>
                        <Box sx={{ width: '100%', height: 10, borderRadius: 999, bgcolor: 'rgba(var(--text-primary-rgb),0.08)', overflow: 'hidden' }}>
                          <Box sx={{ width: `${ratio}%`, height: '100%', bgcolor: 'var(--brand-primary)', borderRadius: 999 }} />
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="Customer Coverage"
              description="Track how much of the portal workload is already linked to end customers."
              actions={
                <Link href={`/portal/${portalId}/customers`} style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm">Open customers</Button>
                </Link>
              }
            >
              <Box sx={{ display: 'grid', gap: 1.25 }}>
                <Box sx={{ p: 1.5, borderRadius: 2.5, bgcolor: 'rgba(var(--brand-primary-rgb),0.07)' }}>
                  <Typography sx={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                    Assignment coverage
                  </Typography>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 800 }}>{assignments.length === 0 ? '0%' : `${Math.round((linkedShipments / assignments.length) * 100)}%`}</Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {linkedShipments} of {assignments.length} shipments are already tied to a portal customer.
                  </Typography>
                </Box>

                {customerCoverage.length === 0 ? (
                  <Box sx={{ color: 'var(--text-secondary)' }}>No portal customer links have been made yet.</Box>
                ) : (
                  customerCoverage.map(([name, count]) => (
                    <Box key={name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{name}</Typography>
                      <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{count} shipment{count === 1 ? '' : 's'}</Typography>
                    </Box>
                  ))
                )}
              </Box>
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <DashboardPanel
              title="Recent Shipment Activity"
              description="The latest vehicles currently visible in this partner workspace."
            >
              {recentAssignments.length === 0 ? (
                <Box sx={{ color: 'var(--text-secondary)' }}>No shipments are available to show yet.</Box>
              ) : (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  {recentAssignments.map((assignment) => (
                    <Box
                      key={assignment.id}
                      sx={{
                        border: '1px solid var(--border)',
                        borderRadius: 2.5,
                        p: 1.5,
                        display: 'grid',
                        gap: 0.5,
                        bgcolor: 'var(--panel)',
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>{formatVehicleLabel(assignment.shipment)}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{formatStatusLabel(assignment.shipment.status)}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {assignment.partnerCustomer?.name ? `Linked to ${assignment.partnerCustomer.name}` : 'Not linked to a portal customer yet'}
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography sx={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{assignment.shipment.serviceType.replaceAll('_', ' ')}</Typography>
                        <Link href={`/portal/${portalId}/shipments/${assignment.shipment.id}`} style={{ textDecoration: 'none' }}>
                          <Button variant="outline" size="sm">
                            <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
                            View details
                          </Button>
                        </Link>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </DashboardPanel>

            <DashboardPanel
              title="Team And Activity"
              description="Who has access to this workspace and what has changed recently."
              actions={
                <Link href={`/portal/${portalId}/members`} style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm">Manage members</Button>
                </Link>
              }
            >
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ display: 'grid', gap: 1.25 }}>
                  {memberships.slice(0, 4).map((membership) => (
                    <Box key={membership.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'center' }}>
                      <Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{membership.user.name || membership.user.email || 'Portal member'}</Typography>
                        <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{membership.user.email || 'No email'}</Typography>
                      </Box>
                      <Box sx={{ px: 1.2, py: 0.45, borderRadius: 999, bgcolor: membership.role === 'ADMIN' ? 'rgba(var(--brand-primary-rgb),0.12)' : 'rgba(var(--text-primary-rgb),0.06)', color: membership.role === 'ADMIN' ? 'var(--brand-primary)' : 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {membership.role}
                      </Box>
                    </Box>
                  ))}
                </Box>

                <Box sx={{ borderTop: '1px solid var(--border)', pt: 2, display: 'grid', gap: 1.25 }}>
                  <Typography sx={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)' }}>
                    Recent activity
                  </Typography>
                  {!canViewActivity ? (
                    <Box sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      Activity is available to portal admins so member changes and login access events stay controlled.
                    </Box>
                  ) : partialLoadWarning ? (
                    <Box
                      sx={{
                        border: '1px solid rgba(var(--accent-gold-rgb),0.35)',
                        borderRadius: 2,
                        p: 1.25,
                        bgcolor: 'rgba(var(--accent-gold-rgb),0.08)',
                        fontSize: '0.85rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {partialLoadWarning}
                    </Box>
                  ) : activities.length === 0 ? (
                    <Box sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No recent membership activity was recorded for this portal.</Box>
                  ) : (
                    activities.map((activity) => (
                      <Box key={activity.id} sx={{ display: 'grid', gap: 0.25 }}>
                        <Typography sx={{ fontSize: '0.88rem', fontWeight: 600 }}>{activity.summary}</Typography>
                        <Typography sx={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {formatRelativeTime(activity.performedAt)}
                        </Typography>
                      </Box>
                    ))
                  )}

                  {canViewActivity ? (
                    <Link href={`/portal/${portalId}/activity`} style={{ textDecoration: 'none' }}>
                      <Button variant="outline" size="sm">
                        <HistoryOutlinedIcon sx={{ fontSize: 16 }} />
                        View all activity
                      </Button>
                    </Link>
                  ) : null}
                </Box>
              </Box>
            </DashboardPanel>
          </DashboardGrid>
        </>
      )}
    </DashboardSurface>
  );
}
