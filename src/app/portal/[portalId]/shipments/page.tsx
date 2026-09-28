'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AssignmentTurnedInOutlinedIcon from '@mui/icons-material/AssignmentTurnedInOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { Box, MenuItem, TextField, Typography } from '@mui/material';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, ConfirmDialog, EmptyState, PageHeader, Skeleton, SkeletonParagraph, SkeletonTable, toast } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';

type PortalCustomer = {
  id: string;
  name: string;
};

type ShipmentAssignment = {
  id: string;
  notes: string | null;
  noteSource?: 'MANUAL' | 'PORTAL_DEFAULT' | null;
  partnerCustomer: { id: string; name: string; email: string | null; phone: string | null } | null;
  shipment: {
    id: string;
    vehicleType: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    vehicleVIN: string | null;
    status: string;
    serviceType: string;
    createdAt: string;
  };
};

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  requireCustomerLinkForReady?: boolean;
};

function formatShipmentLabel(shipment: ShipmentAssignment['shipment']) {
  return [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType;
}

function formatStatusLabel(status: string) {
  return status.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function getPortalReadiness(portal: PortalInfo | null, assignment: ShipmentAssignment) {
  const requiresCustomerLink = portal?.requireCustomerLinkForReady !== false;

  if (requiresCustomerLink && !assignment.partnerCustomer) {
    return { label: 'Waiting for customer link', tone: 'warning' as const };
  }

  return { label: 'Ready for partner handling', tone: 'ready' as const };
}

function getAssignmentNoteSource(assignment: ShipmentAssignment) {
  if (assignment.noteSource === 'PORTAL_DEFAULT') {
    return { label: 'Portal default', tone: 'default' as const };
  }

  if (assignment.noteSource === 'MANUAL') {
    return { label: 'Manual note', tone: 'manual' as const };
  }

  return { label: 'No notes', tone: 'none' as const };
}

export default function PortalShipmentsPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [assignments, setAssignments] = useState<ShipmentAssignment[]>([]);
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [readinessFilter, setReadinessFilter] = useState<'all' | 'ready' | 'not-ready'>('all');
  const [selectedCustomers, setSelectedCustomers] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<'LINK_CUSTOMER' | 'SET_NOTES' | ''>('');
  const [bulkCustomerId, setBulkCustomerId] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [selectedShipmentIds, setSelectedShipmentIds] = useState<string[]>([]);
  const [bulkUnassignTargets, setBulkUnassignTargets] = useState<string[] | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [shipmentsResponse, customersResponse] = await Promise.all([
        fetch(`/api/partner-portals/${portalId}/shipments`, { cache: 'no-store' }),
        fetch(`/api/partner-portals/${portalId}/customers`, { cache: 'no-store' }),
      ]);

      const shipmentsData = await shipmentsResponse.json();
      const customersData = await customersResponse.json();

      if (!shipmentsResponse.ok) {
        throw new Error(shipmentsData.error || 'Failed to load assigned shipments');
      }

      if (!customersResponse.ok) {
        throw new Error(customersData.error || 'Failed to load customers');
      }

      setPortal(shipmentsData.portal);
      setAssignments(shipmentsData.assignments || []);
      setCustomers(customersData.customers || []);
      setLastRefreshedAt(new Date());
      setSelectedCustomers(
        Object.fromEntries(
          (shipmentsData.assignments || []).map((assignment: ShipmentAssignment) => [assignment.shipment.id, assignment.partnerCustomer?.id || ''])
        )
      );
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load portal shipments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, [portalId]);

  const filteredAssignments = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      const readiness = getPortalReadiness(portal, assignment).tone;
      if (readinessFilter === 'ready' && readiness !== 'ready') {
        return false;
      }

      if (readinessFilter === 'not-ready' && readiness === 'ready') {
        return false;
      }

      const vehicle = formatShipmentLabel(assignment.shipment).toLowerCase();
      const vin = assignment.shipment.vehicleVIN?.toLowerCase() || '';
      const status = assignment.shipment.status.toLowerCase();
      const customer = assignment.partnerCustomer?.name?.toLowerCase() || '';
      return vehicle.includes(value) || vin.includes(value) || status.includes(value) || customer.includes(value);
    });
  }, [assignments, portal, query, readinessFilter]);

  const linkedCount = filteredAssignments.filter((assignment) => assignment.partnerCustomer).length;
  const unlinkedCount = filteredAssignments.length - linkedCount;
  const uniqueStatuses = new Set(filteredAssignments.map((assignment) => assignment.shipment.status)).size;
  const readyCount = filteredAssignments.filter((assignment) => getPortalReadiness(portal, assignment).tone === 'ready').length;
  const topCustomers = useMemo(() => {
    const counts = new Map<string, number>();
    assignments.forEach((assignment) => {
      if (assignment.partnerCustomer?.name) {
        counts.set(assignment.partnerCustomer.name, (counts.get(assignment.partnerCustomer.name) || 0) + 1);
      }
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [assignments]);

  const handleLinkCustomer = async (shipmentId: string) => {
    try {
      setSavingId(shipmentId);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments/${shipmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerCustomerId: selectedCustomers[shipmentId] || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update assignment');
      }

      toast.success('Shipment customer link updated');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update shipment assignment');
    } finally {
      setSavingId(null);
    }
  };

  const runBulkAction = async (
    action: 'UNASSIGN' | 'LINK_CUSTOMER' | 'SET_NOTES' | 'CLEAR_NOTES',
    shipmentIds: string[],
    options?: { partnerCustomerId?: string | null; notes?: string },
  ) => {
    if (shipmentIds.length === 0) {
      toast.error('Select at least one shipment first');
      return;
    }

    try {
      setBulkBusy(true);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          shipmentIds,
          ...(action === 'LINK_CUSTOMER' ? { partnerCustomerId: options?.partnerCustomerId || null } : {}),
          ...(action === 'SET_NOTES' ? { notes: options?.notes || '' } : {}),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Bulk action failed');
      }

      const labels: Record<string, string> = {
        UNASSIGN: 'removed from portal',
        LINK_CUSTOMER: options?.partnerCustomerId ? 'linked to customer' : 'unlinked from customers',
        SET_NOTES: 'notes updated',
        CLEAR_NOTES: 'notes cleared',
      };

      toast.success(`${data.updatedCount} shipment${data.updatedCount === 1 ? '' : 's'} ${labels[action]}`);
      setBulkAction('');
      setBulkCustomerId('');
      setBulkNotes('');
      await fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Bulk action failed');
    } finally {
      setBulkBusy(false);
    }
  };

  const handleBulkDelete = (selectedIds: string[]) => {
    setBulkUnassignTargets(selectedIds);
  };

  const handleBulkLinkCustomer = (selectedIds: string[]) => {
    void runBulkAction('LINK_CUSTOMER', selectedIds, {
      partnerCustomerId: bulkCustomerId || null,
    });
  };

  const handleBulkSetNotes = (selectedIds: string[]) => {
    void runBulkAction('SET_NOTES', selectedIds, { notes: bulkNotes });
  };

  const columns = useMemo<Column<ShipmentAssignment>[]>(() => [
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (_, row) => [row.shipment.vehicleYear, row.shipment.vehicleMake, row.shipment.vehicleModel].filter(Boolean).join(' ') || row.shipment.vehicleType,
    },
    {
      key: 'vin',
      header: 'VIN',
      render: (_, row) => row.shipment.vehicleVIN || '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => row.shipment.status,
    },
    {
      key: 'customer',
      header: 'My Customer',
      render: (_, row) => row.partnerCustomer?.name || 'Unassigned',
    },
    {
      key: 'readiness',
      header: 'Ready State',
      render: (_, row) => {
        const readiness = getPortalReadiness(portal, row);
        return (
          <Box
            component="span"
            role="status"
            aria-label={readiness.label}
            sx={{ px: 1.2, py: 0.45, borderRadius: 999, display: 'inline-flex', alignItems: 'center', bgcolor: readiness.tone === 'ready' ? 'rgba(var(--success-rgb),0.12)' : 'rgba(var(--warning-rgb),0.14)', color: readiness.tone === 'ready' ? 'var(--success)' : 'var(--warning)', fontSize: '0.75rem', fontWeight: 700 }}
          >
            {readiness.label}
          </Box>
        );
      },
    },
    {
      key: 'noteSource',
      header: 'Notes Source',
      render: (_, row) => {
        const noteSource = getAssignmentNoteSource(row);
        return (
          <Box sx={{ px: 1.2, py: 0.45, borderRadius: 999, display: 'inline-flex', alignItems: 'center', bgcolor: noteSource.tone === 'manual' ? 'rgba(var(--brand-primary-rgb),0.12)' : noteSource.tone === 'default' ? 'rgba(var(--info-rgb),0.12)' : 'rgba(var(--text-primary-rgb),0.08)', color: noteSource.tone === 'manual' ? 'var(--brand-primary)' : noteSource.tone === 'default' ? 'var(--info)' : 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 700 }}>
            {noteSource.label}
          </Box>
        );
      },
    },
    {
      key: 'assign',
      header: 'Link To Customer',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', minWidth: 280 }}>
          <TextField
            select
            size="small"
            fullWidth
            value={selectedCustomers[row.shipment.id] || ''}
            onChange={(event) => setSelectedCustomers((prev) => ({ ...prev, [row.shipment.id]: event.target.value }))}
          >
            <MenuItem value="">Unassigned</MenuItem>
            {customers.map((customer) => (
              <MenuItem key={customer.id} value={customer.id}>{customer.name}</MenuItem>
            ))}
          </TextField>
          <Button variant="outline" size="sm" onClick={() => void handleLinkCustomer(row.shipment.id)} disabled={savingId === row.shipment.id}>
            {savingId === row.shipment.id ? 'Saving...' : 'Save'}
          </Button>
        </Box>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          <Link href={`/portal/${portalId}/shipments/${row.shipment.id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">
              <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
              View
            </Button>
          </Link>
        </Box>
      ),
    },
  ], [customers, portal, portalId, savingId, selectedCustomers]);

  return (
    <DashboardSurface>
      <PageHeader
        title={portal ? `${portal.companyLabel || portal.name} Shipments` : 'Assigned Shipments'}
        description="Work through the shipment layer your team received from the main system, then map each unit to your own portal customers."
        meta={[
          { label: 'Assigned', value: assignments.length, helper: 'Shared from the main workspace' },
          { label: 'Linked', value: assignments.filter((assignment) => assignment.partnerCustomer).length, helper: 'Already mapped to portal customers' },
          { label: 'Customers', value: customers.length, helper: 'Available for assignment handoff' },
        ]}
        actions={
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            {lastRefreshedAt ? (
              <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }} aria-live="polite">
                Updated {lastRefreshedAt.toLocaleTimeString()}
              </Typography>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void fetchData()} disabled={loading}>
              Refresh
            </Button>
            <Link href={`/portal/${portalId}/customers`} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Open Customers</Button>
            </Link>
          </Box>
        }
      />

      {loading ? (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {[0, 1, 2, 3, 4].map((index) => (
              <Box key={index} sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'var(--panel)', display: 'grid', gap: 0.75 }}>
                <Skeleton variant="text" width="60%" height={14} />
                <Skeleton variant="text" width="35%" height={34} />
              </Box>
            ))}
          </DashboardGrid>
          <DashboardPanel title="Shipment Workspace" description="Search, review, and link assigned shipments to portal customers.">
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Skeleton variant="rounded" height={56} />
              <Skeleton variant="rounded" height={48} />
              <SkeletonTable rows={6} columns={5} />
            </Box>
          </DashboardPanel>
        </>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(var(--brand-primary-rgb),0.08)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Assigned Units</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{filteredAssignments.length}</Typography>
              <LocalShippingOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(var(--accent-rgb),0.08)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Customer Linked</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{linkedCount}</Typography>
              <AssignmentTurnedInOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(var(--text-primary-rgb),0.05)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Needs Handoff</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{unlinkedCount}</Typography>
              <PersonOutlineOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(var(--warning-rgb),0.08)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Active Statuses</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{uniqueStatuses}</Typography>
              <Inventory2OutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
            <Box sx={{ border: '1px solid var(--border)', borderRadius: 3, p: 2, bgcolor: 'rgba(var(--success-rgb),0.08)', display: 'grid', gap: 0.75 }}>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Ready Now</Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800 }}>{readyCount}</Typography>
              <CheckCircleOutlineOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
            </Box>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.9fr]">
            <DashboardPanel title="Shipment Workspace" description="Search, review, and link assigned shipments to portal customers.">
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField
                  label="Search shipments"
                  placeholder="Search by vehicle, VIN, status, or customer"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <TextField
                  select
                  label="Ready filter"
                  value={readinessFilter}
                  onChange={(event) => setReadinessFilter(event.target.value as 'all' | 'ready' | 'not-ready')}
                  sx={{ maxWidth: 240 }}
                >
                  <MenuItem value="all">All shipments</MenuItem>
                  <MenuItem value="ready">Ready only</MenuItem>
                  <MenuItem value="not-ready">Not ready only</MenuItem>
                </TextField>

                <Box
                  sx={{
                    border: '1px solid var(--border)',
                    borderRadius: 2.5,
                    p: 1.75,
                    bgcolor: 'var(--panel)',
                    display: 'grid',
                    gap: 1.25,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, flexWrap: 'wrap' }}>
                    <Typography sx={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                      Bulk actions
                    </Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Select rows in the table below, then apply an action to all of them at once.
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <TextField
                      select
                      size="small"
                      label="Action"
                      value={bulkAction}
                      onChange={(event) => setBulkAction(event.target.value as 'LINK_CUSTOMER' | 'SET_NOTES' | '')}
                      sx={{ minWidth: 200 }}
                    >
                      <MenuItem value="">Choose action...</MenuItem>
                      <MenuItem value="LINK_CUSTOMER">Link / unlink customer</MenuItem>
                      <MenuItem value="SET_NOTES">Set notes</MenuItem>
                    </TextField>

                    {bulkAction === 'LINK_CUSTOMER' ? (
                      <TextField
                        select
                        size="small"
                        label="Customer"
                        value={bulkCustomerId}
                        onChange={(event) => setBulkCustomerId(event.target.value)}
                        sx={{ minWidth: 220 }}
                      >
                        <MenuItem value="">Unassigned (unlink all)</MenuItem>
                        {customers.map((customer) => (
                          <MenuItem key={customer.id} value={customer.id}>{customer.name}</MenuItem>
                        ))}
                      </TextField>
                    ) : null}

                    {bulkAction === 'SET_NOTES' ? (
                      <TextField
                        size="small"
                        label="Notes"
                        placeholder="Note to apply to selected shipments"
                        value={bulkNotes}
                        onChange={(event) => setBulkNotes(event.target.value)}
                        sx={{ minWidth: 260, maxWidth: 380 }}
                      />
                    ) : null}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!bulkAction || bulkBusy || selectedShipmentIds.length === 0}
                      onClick={() => {
                        if (bulkAction === 'LINK_CUSTOMER') {
                          handleBulkLinkCustomer(selectedShipmentIds);
                        } else if (bulkAction === 'SET_NOTES') {
                          handleBulkSetNotes(selectedShipmentIds);
                        }
                      }}
                    >
                      {bulkBusy
                        ? 'Applying...'
                        : `Apply to ${selectedShipmentIds.length} selected`}
                    </Button>
                    {selectedShipmentIds.length === 0 && !bulkBusy ? (
                      <Typography sx={{ fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }} role="status">
                        Select shipments using the checkboxes in the table to enable this.
                      </Typography>
                    ) : null}
                  </Box>
                  <Typography sx={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Tip: use the checkboxes in the table and the toolbar that appears above it to remove shipments from the portal in bulk. Removing a shipment only unassigns it from this portal — the shipment itself stays untouched in the main system.
                  </Typography>
                </Box>

                {assignments.length === 0 ? (
                  <EmptyState icon={<Inventory2OutlinedIcon />} title="No assigned shipments" description="Your portal does not have any shipments assigned yet. Ask the internal team to assign shipments to this portal first." />
                ) : filteredAssignments.length === 0 ? (
                  <Box sx={{ color: 'var(--text-secondary)' }}>No shipments matched the current search and ready-state filters.</Box>
                ) : (
                  <DataTable
                    data={filteredAssignments}
                    columns={columns}
                    keyField="id"
                    selectable
                    onSelectionChange={setSelectedShipmentIds}
                    onDelete={handleBulkDelete}
                    onExport={(rows) => {
                      const csv = [
                        ['Vehicle', 'VIN', 'Status', 'Customer', 'Ready State'].join(','),
                        ...rows.map((row) => [
                          formatShipmentLabel(row.shipment),
                          row.shipment.vehicleVIN || '',
                          row.shipment.status,
                          row.partnerCustomer?.name || 'Unassigned',
                          getPortalReadiness(portal, row).label,
                        ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')),
                      ].join('\n');
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const anchor = document.createElement('a');
                      anchor.href = url;
                      anchor.download = `portal-shipments-${new Date().toISOString().slice(0, 10)}.csv`;
                      anchor.click();
                      URL.revokeObjectURL(url);
                    }}
                  />
                )}
              </Box>
            </DashboardPanel>

            <DashboardPanel title="Assignment Board" description="Use customer mapping to turn shared logistics into partner-owned workload.">
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ p: 1.75, borderRadius: 2.5, bgcolor: 'rgba(var(--brand-primary-rgb),0.07)' }}>
                  <Typography sx={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Coverage</Typography>
                  <Typography sx={{ fontSize: '1.45rem', fontWeight: 800 }}>{assignments.length === 0 ? '0%' : `${Math.round((assignments.filter((assignment) => assignment.partnerCustomer).length / assignments.length) * 100)}%`}</Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {assignments.filter((assignment) => assignment.partnerCustomer).length} of {assignments.length} shipments are already linked to portal customers.
                  </Typography>
                </Box>

                <Box sx={{ display: 'grid', gap: 1.25 }}>
                  <Typography sx={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Top customer destinations</Typography>
                  {topCustomers.length === 0 ? (
                    <Box sx={{ color: 'var(--text-secondary)' }}>No shipment links have been created yet.</Box>
                  ) : (
                    topCustomers.map(([name, count]) => (
                      <Box key={name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 1.25, borderRadius: 2, bgcolor: 'rgba(var(--text-primary-rgb),0.04)' }}>
                        <Typography sx={{ fontSize: '0.92rem', fontWeight: 600 }}>{name}</Typography>
                        <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{count} linked</Typography>
                      </Box>
                    ))
                  )}
                </Box>

                <Box sx={{ display: 'grid', gap: 1.25 }}>
                  <Typography sx={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Recent portal-visible units</Typography>
                  {assignments.slice(0, 4).map((assignment) => (
                    <Box key={assignment.id} sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.5, display: 'grid', gap: 0.4 }}>
                      <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>{formatShipmentLabel(assignment.shipment)}</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{formatStatusLabel(assignment.shipment.status)}</Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {assignment.partnerCustomer?.name || 'Awaiting portal customer link'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: getAssignmentNoteSource(assignment).tone === 'manual' ? 'var(--brand-primary)' : getAssignmentNoteSource(assignment).tone === 'default' ? 'var(--info)' : 'var(--text-secondary)', fontWeight: 700 }}>
                        {getAssignmentNoteSource(assignment).label}
                      </Typography>
                      <Typography sx={{ fontSize: '0.8rem', color: getPortalReadiness(portal, assignment).tone === 'ready' ? 'var(--success)' : 'var(--warning)', fontWeight: 700 }}>
                        {getPortalReadiness(portal, assignment).label}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </DashboardPanel>
          </DashboardGrid>
        </>
      )}

      <ConfirmDialog
        open={bulkUnassignTargets !== null}
        onClose={() => setBulkUnassignTargets(null)}
        onConfirm={() => {
          if (bulkUnassignTargets) {
            void runBulkAction('UNASSIGN', bulkUnassignTargets);
          }
          setBulkUnassignTargets(null);
        }}
        title="Remove shipments from portal"
        message={`Remove ${bulkUnassignTargets?.length || 0} shipment${(bulkUnassignTargets?.length || 0) === 1 ? '' : 's'} from this portal? The shipments stay in the main system but will no longer be visible to this portal.`}
        confirmText="Remove"
        severity="warning"
        loading={bulkBusy}
      />
    </DashboardSurface>
  );
}