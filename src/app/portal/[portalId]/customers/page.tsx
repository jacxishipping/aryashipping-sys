'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import FmdGoodOutlinedIcon from '@mui/icons-material/FmdGoodOutlined';
import {
  Box,
  Typography,
} from '@mui/material';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, ConfirmDialog, EmptyState, Modal, PageHeader, Skeleton, SkeletonTable, toast , FormField } from '@/components/design-system';
import { DataTable, type Column } from '@/components/ui/DataTable';

type PortalCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address?: string | null;
  city: string | null;
  country: string | null;
  notes?: string | null;
  createdAt: string;
  _count?: {
    shipmentAssignments: number;
  };
  memberships?: Array<{
    id: string;
    role: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
    };
  }>;
};

type CustomerViewer = {
  canManageCustomers: boolean;
  customerScoped: boolean;
  partnerCustomerId: string | null;
};

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
};

export default function PortalCustomersPage() {
  const params = useParams();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [viewer, setViewer] = useState<CustomerViewer>({ canManageCustomers: true, customerScoped: false, partnerCustomerId: null });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [issuingAccessCustomerId, setIssuingAccessCustomerId] = useState<string | null>(null);
  const [accessResult, setAccessResult] = useState<{ name: string; email: string; loginCode: string; simpleLoginUrl: string; portalUrl: string } | null>(null);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', country: '', notes: '' });

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/partner-portals/${portalId}/customers`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load customers');
      }

      setPortal(data.portal);
      setCustomers(data.customers || []);
      setViewer(data.viewer || { canManageCustomers: true, customerScoped: false, partnerCustomerId: null });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load portal customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomers();
  }, [portalId]);

  const filteredCustomers = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) {
      return customers;
    }

    return customers.filter((customer) => {
      const location = [customer.city, customer.country].filter(Boolean).join(' ').toLowerCase();
      return customer.name.toLowerCase().includes(value)
        || (customer.email || '').toLowerCase().includes(value)
        || (customer.phone || '').toLowerCase().includes(value)
        || location.includes(value);
    });
  }, [customers, query]);

  const totalAssignedShipments = customers.reduce((sum, customer) => sum + (customer._count?.shipmentAssignments || 0), 0);
  const locationsTracked = new Set(customers.map((customer) => [customer.city, customer.country].filter(Boolean).join(', ')).filter(Boolean)).size;

  const columns = useMemo<Column<PortalCustomer>[]>(() => [
    { key: 'name', header: 'Customer', sortable: true },
    {
      key: 'portalAccess',
      header: 'Portal Access',
      render: (_, row) => row.memberships?.[0]?.user?.email || 'Not enabled',
    },
    {
      key: 'email',
      header: 'Email',
      render: (_, row) => row.email || '—',
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (_, row) => row.phone || '—',
    },
    {
      key: 'location',
      header: 'Location',
      render: (_, row) => [row.city, row.country].filter(Boolean).join(', ') || '—',
    },
    {
      key: 'shipments',
      header: 'Assigned Shipments',
      render: (_, row) => row._count?.shipmentAssignments || 0,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
          {viewer.canManageCustomers ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingCustomerId(row.id);
                  setForm({
                    name: row.name,
                    email: row.email || '',
                    phone: row.phone || '',
                    city: row.city || '',
                    country: row.country || '',
                    notes: row.notes || '',
                  });
                }}
              >
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleIssueCustomerAccess(row)}
                disabled={issuingAccessCustomerId === row.id}
              >
                {issuingAccessCustomerId === row.id ? 'Issuing...' : row.memberships?.[0] ? 'Refresh Login' : 'Grant Login'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void handleDeleteCustomer(row.id)}
                disabled={deletingCustomerId === row.id}
              >
                {deletingCustomerId === row.id ? 'Deleting...' : 'Delete'}
              </Button>
            </>
          ) : 'Read only'}
        </Box>
      ),
    },
  ], [deletingCustomerId, issuingAccessCustomerId, viewer.canManageCustomers]);

  const resetForm = () => {
    setForm({ name: '', email: '', phone: '', city: '', country: '', notes: '' });
    setEditingCustomerId(null);
  };

  const handleSaveCustomer = async () => {
    if (!form.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    try {
      setCreating(true);
      const response = await fetch(editingCustomerId ? `/api/partner-portals/${portalId}/customers/${editingCustomerId}` : `/api/partner-portals/${portalId}/customers`, {
        method: editingCustomerId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save customer');
      }

      toast.success(editingCustomerId ? 'Customer updated' : 'Customer created');
      resetForm();
      await fetchCustomers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save customer');
    } finally {
      setCreating(false);
    }
  };

  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [accessEmailTarget, setAccessEmailTarget] = useState<PortalCustomer | null>(null);
  const [accessEmail, setAccessEmail] = useState('');

  const handleDeleteCustomer = (customerId: string) => {
    setDeleteCustomerId(customerId);
  };

  const confirmDeleteCustomer = async () => {
    if (!deleteCustomerId) return;
    const customerId = deleteCustomerId;
    setDeleteCustomerId(null);

    try {
      setDeletingCustomerId(customerId);
      const response = await fetch(`/api/partner-portals/${portalId}/customers/${customerId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete customer');
      }

      toast.success('Customer deleted');
      if (editingCustomerId === customerId) {
        resetForm();
      }
      await fetchCustomers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete customer');
    } finally {
      setDeletingCustomerId(null);
    }
  };

  const handleIssueCustomerAccess = (customer: PortalCustomer) => {
    if (customer.email?.trim()) {
      void runIssueCustomerAccess(customer, customer.email.trim());
      return;
    }
    setAccessEmailTarget(customer);
    setAccessEmail('');
  };

  const confirmIssueCustomerAccess = () => {
    if (!accessEmailTarget) return;
    const email = accessEmail.trim();
    if (!email) {
      toast.error('An email address is required before portal access can be issued');
      return;
    }
    const customer = accessEmailTarget;
    setAccessEmailTarget(null);
    void runIssueCustomerAccess(customer, email);
  };

  const runIssueCustomerAccess = async (customer: PortalCustomer, email: string) => {
    try {
      setIssuingAccessCustomerId(customer.id);
      const response = await fetch(`/api/partner-portals/${portalId}/customers/${customer.id}/access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name: customer.name }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to issue portal access');
      }

      setAccessResult({
        name: data.customer?.name || customer.name,
        email: data.customer?.email || email,
        loginCode: data.loginCode,
        simpleLoginUrl: data.simpleLoginUrl,
        portalUrl: data.portalUrl,
      });
      toast.success('Portal customer access issued');
      await fetchCustomers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to issue portal access');
    } finally {
      setIssuingAccessCustomerId(null);
    }
  };

  return (
    <DashboardSurface>
      <PageHeader
        title={portal ? `${portal.companyLabel || portal.name} Customers` : 'My Customers'}
        description={viewer.customerScoped
          ? 'Your customer profile in this portal. Staff-only customer management is hidden for customer logins.'
          : 'Create and maintain the downstream customer records your portal uses to own the shipment handoff layer.'}
        meta={[
          { label: 'Customers', value: customers.length, helper: 'Accounts created in this portal' },
          { label: 'Assigned Shipments', value: totalAssignedShipments, helper: 'Total load mapped to portal customers' },
          { label: 'Locations', value: locationsTracked, helper: 'Cities or countries currently represented' },
        ]}
      />

      {loading ? (
        <DashboardGrid className="grid-cols-1 gap-3 lg:grid-cols-[0.95fr_1.35fr]">
          <DashboardPanel title="Customer Directory" description="Capture the downstream customer identity for this portal.">
            <Box sx={{ display: 'grid', gap: 2 }}>
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} variant="rounded" height={48} />
              ))}
            </Box>
          </DashboardPanel>
          <DashboardPanel title="Portal Customers" description="Accounts created inside this partner workspace.">
            <SkeletonTable rows={5} columns={4} />
          </DashboardPanel>
        </DashboardGrid>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 lg:grid-cols-[0.95fr_1.35fr]">
            <DashboardPanel
              title={viewer.canManageCustomers ? (editingCustomerId ? 'Edit Customer' : 'Create Customer') : 'Customer Access'}
              description={viewer.canManageCustomers
                ? 'Capture the downstream customer identity that shipments in this portal should roll up under.'
                : 'Customer-scoped logins can review their profile and shipments, but they cannot change the portal customer directory.'}
            >
              {viewer.canManageCustomers ? (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <FormField label="Customer Name" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                  <FormField label="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
                  <FormField label="Phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
                  <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                    <FormField label="City" value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
                    <FormField label="Country" value={form.country} onChange={(event) => setForm((prev) => ({ ...prev, country: event.target.value }))} />
                  </Box>
                  <FormField label="Notes" multiline minRows={3} value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, pt: 1 }}>
                    {editingCustomerId ? (
                      <Button variant="outline" onClick={resetForm} disabled={creating}>
                        Cancel
                      </Button>
                    ) : null}
                    <Button variant="primary" onClick={() => void handleSaveCustomer()} disabled={creating}>
                      {creating ? 'Saving...' : editingCustomerId ? 'Save Changes' : 'Create Customer'}
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ color: 'var(--text-secondary)' }}>
                  This login is tied to a single portal customer. Staff-only customer creation, editing, and deletion are disabled.
                </Box>
              )}
            </DashboardPanel>

            <DashboardPanel title="Customer Directory" description="Search, review, and refine the customer roster tied to this portal workspace.">
              <Box sx={{ display: 'grid', gap: 2.5 }}>
                {accessResult ? (
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.8, display: 'grid', gap: 0.8, bgcolor: 'rgba(var(--brand-primary-rgb),0.05)' }}>
                    <Typography sx={{ fontWeight: 700 }}>Portal customer login issued</Typography>
                    <Typography sx={{ color: 'var(--text-secondary)' }}>
                      Share the sign-in page and code with {accessResult.name}. The workspace route is where they land after sign-in.
                    </Typography>
                    <Typography sx={{ color: 'var(--text-secondary)' }}>Email: {accessResult.email}</Typography>
                    <Typography sx={{ color: 'var(--text-secondary)' }}>Login code: {accessResult.loginCode}</Typography>
                    <Typography sx={{ color: 'var(--text-secondary)' }}>Sign-in page: {accessResult.simpleLoginUrl}</Typography>
                    <Typography sx={{ color: 'var(--text-secondary)' }}>Workspace route: {accessResult.portalUrl}</Typography>
                  </Box>
                ) : null}

                <DashboardGrid className="grid-cols-1 gap-3 md:grid-cols-3">
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.8, bgcolor: 'rgba(var(--brand-primary-rgb),0.08)', display: 'grid', gap: 0.65 }}>
                    <Typography sx={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Directory Size</Typography>
                    <Typography sx={{ fontSize: '1.4rem', fontWeight: 800 }}>{customers.length}</Typography>
                    <GroupsOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
                  </Box>
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.8, bgcolor: 'rgba(var(--accent-rgb),0.08)', display: 'grid', gap: 0.65 }}>
                    <Typography sx={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Shipment Load</Typography>
                    <Typography sx={{ fontSize: '1.4rem', fontWeight: 800 }}>{totalAssignedShipments}</Typography>
                    <Inventory2OutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
                  </Box>
                  <Box sx={{ border: '1px solid var(--border)', borderRadius: 2.5, p: 1.8, bgcolor: 'rgba(var(--text-primary-rgb),0.05)', display: 'grid', gap: 0.65 }}>
                    <Typography sx={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Geographies</Typography>
                    <Typography sx={{ fontSize: '1.4rem', fontWeight: 800 }}>{locationsTracked}</Typography>
                    <FmdGoodOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
                  </Box>
                </DashboardGrid>

                <FormField
                  label="Search customers"
                  placeholder="Search by name, email, phone, city, or country"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />

                {customers.length === 0 ? (
                  <EmptyState icon={<PersonOutlineIcon />} title="No customers yet" description="Create your first portal customer, then assign shipments to them from the Assigned Shipments page." />
                ) : filteredCustomers.length === 0 ? (
                  <Box sx={{ color: 'var(--text-secondary)' }}>No customers matched your current search.</Box>
                ) : (
                  <DataTable data={filteredCustomers} columns={columns} keyField="id" />
                )}
              </Box>
            </DashboardPanel>
          </DashboardGrid>
        </>
      )}

      <ConfirmDialog
        open={deleteCustomerId !== null}
        onClose={() => setDeleteCustomerId(null)}
        onConfirm={() => void confirmDeleteCustomer()}
        title="Delete Portal Customer"
        message="Delete this portal customer? Shipments linked to it will become unassigned."
        confirmText="Delete"
        severity="error"
      />

      <Modal
        open={accessEmailTarget !== null}
        onClose={() => setAccessEmailTarget(null)}
        title="Issue Portal Access"
        description={`Enter the email address that should receive portal login access for ${accessEmailTarget?.name || 'this customer'}.`}
        size="sm"
        actions={
          <>
            <Button variant="outline" onClick={() => setAccessEmailTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={confirmIssueCustomerAccess} disabled={!accessEmail.trim()}>Issue Access</Button>
          </>
        }
      >
        <FormField
          autoFocus
          fullWidth
          label="Email address"
          placeholder="customer@example.com"
          value={accessEmail}
          onChange={(event) => setAccessEmail(event.target.value)}
        />
      </Modal>
    </DashboardSurface>
  );
}