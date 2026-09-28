'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import { Box, Typography } from '@mui/material';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PageHeader, toast } from '@/components/design-system';

type PortalSummary = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  memberships?: Array<{ role: string }>;
  _count?: {
    customers?: number;
    shipmentAssignments?: number;
  };
};

export default function PortalHomePage() {
  const [portals, setPortals] = useState<PortalSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPortals = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/partner-portals', { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load portals');
        }

        setPortals(data.portals || []);
      } catch (error) {
        console.error(error);
        toast.error('Failed to load your portals');
      } finally {
        setLoading(false);
      }
    };

    void fetchPortals();
  }, []);

  const totals = useMemo(() => {
    return portals.reduce(
      (accumulator, portal) => {
        accumulator.customers += portal._count?.customers || 0;
        accumulator.shipments += portal._count?.shipmentAssignments || 0;
        accumulator.active += portal.isActive ? 1 : 0;
        return accumulator;
      },
      { customers: 0, shipments: 0, active: 0 },
    );
  }, [portals]);

  return (
    <DashboardSurface>
      <PageHeader
        title="Partner Workspaces"
        description="A partner-facing slice of the main system where each workspace carries its own shipments, customers, member access, and activity trail."
        meta={[
          { label: 'Workspaces', value: portals.length, helper: 'Portal environments assigned to you' },
          { label: 'Shipments', value: totals.shipments, helper: 'Visible across all partner workspaces' },
          { label: 'Customers', value: totals.customers, helper: 'Portal-managed downstream accounts' },
        ]}
      />

      <DashboardPanel title="My Portals" description="Open a workspace to manage partner shipments, downstream customers, and member access in one place.">
        {loading ? (
          <Box sx={{ color: 'var(--text-secondary)' }}>Loading portals...</Box>
        ) : portals.length === 0 ? (
          <EmptyState icon={<AccountTreeOutlinedIcon />} title="No portal access" description="You are signed in, but no partner portal workspace has been assigned to your account yet." />
        ) : (
          <DashboardGrid className="grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {portals.map((portal) => (
              <Box
                key={portal.id}
                sx={{
                  border: '1px solid var(--border)',
                  background: 'linear-gradient(180deg, rgba(var(--panel-rgb), 0.92), rgba(var(--brand-primary-rgb),0.05))',
                  borderRadius: 3,
                  p: 3,
                  display: 'grid',
                  gap: 2,
                  boxShadow: '0 16px 40px rgba(var(--text-primary-rgb),0.08)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 800, fontSize: '1.08rem', letterSpacing: '-0.02em' }}>{portal.name}</Typography>
                    <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                      {portal.code || 'No workspace code'}
                    </Typography>
                  </Box>
                  <Box sx={{ px: 1.2, py: 0.45, borderRadius: 999, bgcolor: portal.isActive ? 'rgba(var(--brand-primary-rgb),0.12)' : 'rgba(var(--text-primary-rgb),0.06)', color: portal.isActive ? 'var(--brand-primary)' : 'var(--text-secondary)', fontSize: '0.72rem', fontWeight: 700 }}>
                    {portal.isActive ? 'Active' : 'Inactive'}
                  </Box>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 1.25 }}>
                  <Box sx={{ p: 1.4, borderRadius: 2.5, bgcolor: 'rgba(var(--brand-primary-rgb),0.08)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography sx={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Shipments</Typography>
                      <Inventory2OutlinedIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                    </Box>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 800 }}>{portal._count?.shipmentAssignments || 0}</Typography>
                  </Box>
                  <Box sx={{ p: 1.4, borderRadius: 2.5, bgcolor: 'rgba(var(--accent-rgb),0.10)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography sx={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Customers</Typography>
                      <PeopleAltOutlinedIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                    </Box>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 800 }}>{portal._count?.customers || 0}</Typography>
                  </Box>
                  <Box sx={{ p: 1.4, borderRadius: 2.5, bgcolor: 'rgba(var(--text-primary-rgb),0.05)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                      <Typography sx={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>Role</Typography>
                      <GroupOutlinedIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                    </Box>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 800 }}>{portal.memberships?.[0]?.role || 'Member'}</Typography>
                  </Box>
                </Box>

                <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Use this workspace as the partner-facing operating layer for assigned vehicles, customer handoffs, and shared member access.
                </Typography>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Link href={`/portal/${portal.id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" size="sm">
                      Open Workspace
                      <ArrowForwardOutlinedIcon sx={{ fontSize: 16 }} />
                    </Button>
                  </Link>
                  <Link href={`/portal/${portal.id}/shipments`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">Shipments</Button>
                  </Link>
                  <Link href={`/portal/${portal.id}/customers`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">Customers</Button>
                  </Link>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, color: 'var(--text-secondary)', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                  <span>{portal.isActive ? 'Workspace is live for partner operations' : 'Workspace is currently inactive'}</span>
                  <span>{portal.memberships?.[0]?.role === 'ADMIN' ? 'You can manage members and activity' : 'You have member-level access'}</span>
                </Box>
              </Box>
            ))}
          </DashboardGrid>
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}