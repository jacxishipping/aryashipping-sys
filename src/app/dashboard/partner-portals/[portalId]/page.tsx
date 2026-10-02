'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Package,
  Users,
  User,
  ExternalLink,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Check,
  Building2,
  Palette,
  Activity,
  AlertTriangle,
  ArrowLeft
} from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, ConfirmDialog, EmptyState, Modal, PageHeader, Select, FormField, toast } from '@/components/design-system';
import { PortalActivityList } from '@/components/partner-portals/PortalActivityList';
import PortalBrandingSettingsPanel from '@/components/partner-portals/PortalBrandingSettingsPanel';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  customDomain?: string | null;
  customDomainVerifiedAt?: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  notes: string | null;
};

type PortalMembership = {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
};

type PortalActivity = {
  id: string;
  action: string;
  performedAt: string;
  actor: { id: string; name: string | null; email: string | null };
  target: { id: string | null; name: string | null; email: string | null };
  summary: string;
  changes?: Record<string, unknown>;
};

type PortalCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  _count?: { shipmentAssignments: number };
};

type ShipmentAssignment = {
  id: string;
  assignedAt: string;
  partnerCustomer: { id: string; name: string } | null;
  shipment: {
    id: string;
    vehicleType: string;
    vehicleMake: string | null;
    vehicleModel: string | null;
    vehicleYear: number | null;
    vehicleVIN: string | null;
    status: string;
  };
};

type UserOption = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type ShipmentOption = {
  id: string;
  vehicleType: string;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleYear: number | null;
  vehicleVIN: string | null;
  status: string;
  user?: { name: string | null; email: string };
};

type PortalManageTab = 'shipments' | 'members' | 'activity' | 'branding' | 'customers' | 'danger';

const initialInviteForm = {
  name: '',
  email: '',
  phone: '',
  city: '',
  country: '',
  membershipRole: 'STAFF',
};

export default function PartnerPortalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [memberships, setMemberships] = useState<PortalMembership[]>([]);
  const [customers, setCustomers] = useState<PortalCustomer[]>([]);
  const [assignments, setAssignments] = useState<ShipmentAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [memberRole, setMemberRole] = useState('STAFF');
  const [savingMember, setSavingMember] = useState(false);
  const [memberRoleDrafts, setMemberRoleDrafts] = useState<Record<string, string>>({});
  const [savingMembershipRoleId, setSavingMembershipRoleId] = useState<string | null>(null);
  const [removingMembershipId, setRemovingMembershipId] = useState<string | null>(null);
  const [regeneratingLoginCodeMembershipId, setRegeneratingLoginCodeMembershipId] = useState<string | null>(null);
  const [shipmentSearch, setShipmentSearch] = useState('');
  const [shipmentResults, setShipmentResults] = useState<ShipmentOption[]>([]);
  const [savingShipmentId, setSavingShipmentId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState(initialInviteForm);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [loginCodeResult, setLoginCodeResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [activities, setActivities] = useState<PortalActivity[]>([]);
  const [activeTab, setActiveTab] = useState<PortalManageTab>('shipments');
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [openCreatePortalUserDialog, setOpenCreatePortalUserDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deletingPortal, setDeletingPortal] = useState(false);
  const [pendingRemoveMembership, setPendingRemoveMembership] = useState<PortalMembership | null>(null);
  const [pendingUnassignShipment, setPendingUnassignShipment] = useState<ShipmentAssignment | null>(null);

  const publicSiteHref = useMemo(() => {
    if (portal?.customDomainVerifiedAt && portal?.customDomain) {
      return `https://${portal.customDomain}`;
    }

    return `/portal-site/${portalId}`;
  }, [portal?.customDomain, portal?.customDomainVerifiedAt, portalId]);

  const handleCopyValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied to clipboard`);
    } catch (error) {
      console.error(error);
      toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const renderAccessResult = (
    result: { loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null },
    title: string,
  ) => (
    <div className="border border-[rgba(var(--accent-gold-rgb),0.28)] bg-[rgba(var(--accent-gold-rgb),0.08)] rounded-xl p-4 space-y-2">
      <div className="font-bold text-sm text-[var(--text-primary)]">{title}</div>
      <div className="text-xs text-[var(--text-secondary)]">
        Share the sign-in page and code with this user. The workspace route is where they land after sign-in.
      </div>
      <div className="text-sm"><strong>Name:</strong> {result.name || result.email}</div>
      <div className="text-sm"><strong>Email:</strong> {result.email}</div>
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span><strong>Login Code:</strong> <code className="bg-[var(--background)] px-2 py-0.5 rounded border border-[var(--border)] font-mono">{result.loginCode}</code></span>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.loginCode, 'Login code')}>Copy</Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="truncate max-w-md"><strong>Sign-In Page:</strong> {result.simpleLoginUrl}</span>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.simpleLoginUrl, 'Sign-in page')}>Copy</Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap text-sm">
        <span className="truncate max-w-md"><strong>Workspace Route:</strong> {result.portalUrl}</span>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.portalUrl, 'Workspace route')}>Copy</Button>
      </div>
    </div>
  );

  const canAccess = hasPermission(session?.user?.role, 'customers:manage') || hasPermission(session?.user?.role, 'users:manage');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !canAccess) {
      router.replace('/dashboard');
    }
  }, [canAccess, router, session, status]);

  const fetchPortalData = async () => {
    try {
      setLoading(true);
      const [membershipsResponse, customersResponse, assignmentsResponse] = await Promise.all([
        fetch(`/api/partner-portals/${portalId}/memberships`, { cache: 'no-store' }),
        fetch(`/api/partner-portals/${portalId}/customers`, { cache: 'no-store' }),
        fetch(`/api/partner-portals/${portalId}/shipments`, { cache: 'no-store' }),
      ]);

      const membershipsData = await membershipsResponse.json();
      const customersData = await customersResponse.json();
      const assignmentsData = await assignmentsResponse.json();

      if (!membershipsResponse.ok) throw new Error(membershipsData.error || 'Failed to load memberships');
      if (!customersResponse.ok) throw new Error(customersData.error || 'Failed to load customers');
      if (!assignmentsResponse.ok) throw new Error(assignmentsData.error || 'Failed to load assignments');

      setPortal(membershipsData.portal);
      setMemberships(membershipsData.memberships || []);
      setMemberRoleDrafts(
        Object.fromEntries(
          (membershipsData.memberships || []).map((membership: PortalMembership) => [membership.id, membership.role])
        )
      );
      setCustomers(customersData.customers || []);
      setAssignments(assignmentsData.assignments || []);

      const activityResponse = await fetch(`/api/partner-portals/${portalId}/activity?limit=10`, { cache: 'no-store' });
      const activityData = await activityResponse.json();
      if (activityResponse.ok) {
        setActivities(activityData.activities || []);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load portal details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated' && canAccess) {
      void fetchPortalData();
    }
  }, [portalId, status, canAccess]);

  useEffect(() => {
    if (!canAccess || !openAddMemberDialog) {
      setUsers([]);
      return;
    }

    const controller = new AbortController();

    const fetchUsers = async () => {
      try {
        const query = new URLSearchParams({ page: '1', pageSize: '20' });
        if (memberSearch.trim()) query.set('query', memberSearch.trim());
        const response = await fetch(`/api/users?${query.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (response.ok) {
          setUsers(data.users || []);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error(error);
        }
      }
    };

    void fetchUsers();
    return () => controller.abort();
  }, [memberSearch, canAccess, openAddMemberDialog]);

  useEffect(() => {
    if (!canAccess || shipmentSearch.trim().length < 2) {
      setShipmentResults([]);
      return;
    }

    const controller = new AbortController();
    const fetchShipments = async () => {
      try {
        const query = new URLSearchParams({ page: '1', limit: '20', search: shipmentSearch.trim() });
        const response = await fetch(`/api/shipments?${query.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (response.ok) {
          const assignedIds = new Set(assignments.map((assignment) => assignment.shipment.id));
          setShipmentResults((data.shipments || []).filter((shipment: ShipmentOption) => !assignedIds.has(shipment.id)));
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error(error);
        }
      }
    };

    void fetchShipments();
    return () => controller.abort();
  }, [shipmentSearch, canAccess, assignments]);

  const handleUpdateMembershipRole = async (membership: PortalMembership) => {
    const nextRole = memberRoleDrafts[membership.id] || membership.role;

    if (nextRole === membership.role) {
      return;
    }

    try {
      setSavingMembershipRoleId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: membership.user.id,
          role: nextRole,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update portal role');
      }

      toast.success('Portal role updated');
      await fetchPortalData();
    } catch (error) {
      setMemberRoleDrafts((prev) => ({ ...prev, [membership.id]: membership.role }));
      toast.error(error instanceof Error ? error.message : 'Failed to update portal role');
    } finally {
      setSavingMembershipRoleId(null);
    }
  };

  const handleRemoveMembership = async (membershipId: string) => {
    try {
      setRemovingMembershipId(membershipId);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships/${membershipId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove portal member');
      }

      toast.success('Portal member removed');
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove portal member');
    } finally {
      setRemovingMembershipId(null);
    }
  };

  const handleRegenerateLoginCode = async (membership: PortalMembership) => {
    try {
      setRegeneratingLoginCodeMembershipId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships/${membership.id}/login-code`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to regenerate login code');
      }

      setLoginCodeResult({
        loginCode: data.loginCode,
        simpleLoginUrl: data.simpleLoginUrl,
        portalUrl: data.portalUrl,
        email: data.user.email,
        name: data.user.name,
      });
      toast.success('Login code regenerated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate login code');
    } finally {
      setRegeneratingLoginCodeMembershipId(null);
    }
  };

  const handleAssignShipment = async (shipmentId: string) => {
    try {
      setSavingShipmentId(shipmentId);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign shipment');
      }

      toast.success('Shipment assigned to portal');
      setShipmentSearch('');
      setShipmentResults([]);
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign shipment');
    } finally {
      setSavingShipmentId(null);
    }
  };

  const handleUnassignShipment = async (shipmentId: string) => {
    try {
      setSavingShipmentId(shipmentId);
      const response = await fetch(`/api/partner-portals/${portalId}/shipments/${shipmentId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unassign shipment');
      }

      toast.success('Shipment removed from portal');
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to unassign shipment');
    } finally {
      setSavingShipmentId(null);
    }
  };

  const handleDeletePortal = async () => {
    if (deleteConfirmText !== portal?.name) {
      toast.error('Type the portal name exactly to confirm deletion');
      return;
    }

    try {
      setDeletingPortal(true);
      const response = await fetch(`/api/partner-portals/${portalId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete portal');
      }

      const counts = data.deletedCounts || {};
      const removedParts = [
        counts.memberships ? `${counts.memberships} member${counts.memberships === 1 ? '' : 's'}` : null,
        counts.customers ? `${counts.customers} customer${counts.customers === 1 ? '' : 's'}` : null,
        counts.shipmentAssignments ? `${counts.shipmentAssignments} shipment link${counts.shipmentAssignments === 1 ? '' : 's'}` : null,
      ].filter(Boolean);

      toast.success(`Portal deleted${removedParts.length ? ` along with ${removedParts.join(', ')}` : ''}`);
      router.push('/dashboard/partner-portals');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete portal');
      setDeletingPortal(false);
    }
  };

  const handleInvitePortalUser = async () => {
    if (!inviteForm.name.trim() || !inviteForm.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    try {
      setInviting(true);
      const response = await fetch(`/api/partner-portals/${portalId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invite portal user');
      }

      setInviteResult({
        loginCode: data.loginCode,
        simpleLoginUrl: data.simpleLoginUrl,
        portalUrl: data.portalUrl,
        email: data.user.email,
        name: data.user.name,
      });
      setInviteForm(initialInviteForm);
      setOpenCreatePortalUserDialog(false);
      toast.success('Portal user ready');
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite portal user');
    } finally {
      setInviting(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) {
      toast.error('Select a user first');
      return;
    }

    try {
      setSavingMember(true);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUser.id, role: memberRole }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save portal member');
      }

      toast.success('Portal member saved');
      setSelectedUser(null);
      setMemberSearch('');
      setOpenAddMemberDialog(false);
      await fetchPortalData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save portal member');
    } finally {
      setSavingMember(false);
    }
  };

  const membershipColumns = useMemo<Column<PortalMembership>[]>(() => [
    {
      key: 'user',
      header: 'Member',
      render: (_, row) => row.user.name || row.user.email,
    },
    {
      key: 'email',
      header: 'Email',
      render: (_, row) => row.user.email,
    },
    {
      key: 'role',
      header: 'Portal Role',
      render: (_, row) => (
        <select
          value={memberRoleDrafts[row.id] || row.role}
          onChange={(event) => setMemberRoleDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))}
          className="px-2.5 py-1 text-xs rounded-lg border border-[var(--border)] bg-[var(--background)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-gold)]"
        >
          <option value="ADMIN">ADMIN</option>
          <option value="STAFF">STAFF</option>
        </select>
      ),
    },
    {
      key: 'appRole',
      header: 'App Role',
      render: (_, row) => row.user.role,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex gap-1.5 justify-end flex-nowrap whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleUpdateMembershipRole(row)}
            disabled={savingMembershipRoleId === row.id || (memberRoleDrafts[row.id] || row.role) === row.role}
          >
            {savingMembershipRoleId === row.id ? 'Saving...' : 'Save Role'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleRegenerateLoginCode(row)}
            disabled={regeneratingLoginCodeMembershipId === row.id || (row.user.role !== 'user' && row.role !== 'ADMIN')}
          >
            {regeneratingLoginCodeMembershipId === row.id ? 'Generating...' : 'Generate Code'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setPendingRemoveMembership(row)} disabled={removingMembershipId === row.id}>
            {removingMembershipId === row.id ? 'Removing...' : 'Remove'}
          </Button>
        </div>
      ),
    },
  ], [memberRoleDrafts, regeneratingLoginCodeMembershipId, removingMembershipId, savingMembershipRoleId]);

  const assignmentColumns = useMemo<Column<ShipmentAssignment>[]>(() => [
    {
      key: 'vehicle',
      header: 'Shipment',
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
      header: 'Portal Customer',
      render: (_, row) => row.partnerCustomer?.name || 'Unassigned',
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (_, row) => (
        <div className="flex gap-1.5 justify-end flex-nowrap whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
          <Link href={`/portal/${portalId}/shipments/${row.shipment.id}`} style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">View</Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => setPendingUnassignShipment(row)} disabled={savingShipmentId === row.shipment.id}>
            {savingShipmentId === row.shipment.id ? 'Removing...' : 'Unassign'}
          </Button>
        </div>
      ),
    },
  ], [portalId, savingShipmentId]);

  const customerColumns = useMemo<Column<PortalCustomer>[]>(() => [
    { key: 'name', header: 'Customer', sortable: true },
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
      key: 'count',
      header: 'Assigned Shipments',
      render: (_, row) => row._count?.shipmentAssignments || 0,
    },
  ], []);

  if (status === 'loading' || !session || !canAccess) {
    return null;
  }

  const tabs: { key: PortalManageTab; label: string; icon: any; count?: number }[] = [
    { key: 'shipments', label: 'Shipments', icon: Package, count: assignments.length },
    { key: 'members', label: 'Members', icon: Users, count: memberships.length },
    { key: 'activity', label: 'Activity', icon: Activity, count: activities.length },
    { key: 'branding', label: 'Branding', icon: Palette },
    { key: 'customers', label: 'Customers', icon: User, count: customers.length },
    { key: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  ];

  return (
    <DashboardSurface>
      <PageHeader
        showBreadcrumbs
        title={portal ? portal.name : 'Portal'}
        description={portal?.code ? `Portal code: ${portal.code}` : 'Partner portal detail'}
        meta={[
          { label: 'Shipments', value: assignments.length, helper: 'Assigned to this portal' },
          { label: 'Members', value: memberships.length, helper: 'Users with portal access' },
          { label: 'Customers', value: customers.length, helper: 'Downstream accounts' },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={publicSiteHref}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Button variant="outline" size="sm" icon={<ExternalLink className="w-4 h-4" />}>Open Portal Website</Button>
            </a>
            <Link href="/dashboard/partner-portals" style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>Back to Portals</Button>
            </Link>
          </div>
        }
      />

      <DashboardPanel noHeaderBorder>
        {loading ? (
          <div className="text-[var(--text-secondary)] py-8 text-center">Loading portal details...</div>
        ) : (
          <div className="space-y-6">
            {/* Custom Nav Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--border)] pb-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)] border border-[rgba(var(--accent-gold-rgb),0.25)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--panel-secondary,rgba(255,255,255,0.03))]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                        isActive ? 'bg-[var(--accent-gold)] text-black' : 'bg-[var(--border)] text-[var(--text-secondary)]'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Shipments Tab */}
            {activeTab === 'shipments' && (
              <DashboardPanel title="Assigned Shipments" description="Shipments visible to this partner workspace">
                {assignments.length === 0 ? (
                  <EmptyState icon={<Package className="w-10 h-10" />} title="No assigned shipments" description="Search below and assign the first shipment into this portal." />
                ) : (
                  <DataTable data={assignments} columns={assignmentColumns} keyField="id" />
                )}

                <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-3">
                  <div className="font-bold text-sm text-[var(--text-primary)]">Assign Shipment</div>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Search shipments by vehicle or VIN..."
                      value={shipmentSearch}
                      onChange={(e) => setShipmentSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                    />
                  </div>
                  {shipmentResults.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {shipmentResults.map((shipment) => (
                        <div key={shipment.id} className="border border-[var(--border)] rounded-xl px-4 py-3 flex items-center justify-between gap-3 bg-[var(--background)]">
                          <div>
                            <div className="font-semibold text-sm text-[var(--text-primary)]">
                              {[shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ') || shipment.vehicleType}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                              {shipment.vehicleVIN || 'No VIN'} &bull; {shipment.status} &bull; {shipment.user?.name || shipment.user?.email || 'No owner'}
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => void handleAssignShipment(shipment.id)} disabled={savingShipmentId === shipment.id}>
                            {savingShipmentId === shipment.id ? 'Assigning...' : 'Assign'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : shipmentSearch.trim().length >= 2 ? (
                    <div className="text-xs text-[var(--text-secondary)]">No unassigned search results found.</div>
                  ) : null}
                </div>
              </DashboardPanel>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <DashboardPanel
                title="Portal Members"
                description="Users who can enter this workspace"
                actions={
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUser(null);
                        setMemberSearch('');
                        setOpenAddMemberDialog(true);
                      }}
                    >
                      Add Existing User
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setInviteForm(initialInviteForm);
                        setOpenCreatePortalUserDialog(true);
                      }}
                    >
                      Create Portal User
                    </Button>
                  </div>
                }
              >
                {memberships.length === 0 ? (
                  <EmptyState icon={<Users className="w-10 h-10" />} title="No members" description="Use the member actions to add the first portal user." />
                ) : (
                  <DataTable data={memberships} columns={membershipColumns} keyField="id" />
                )}

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="border border-[var(--border)] rounded-xl p-4 space-y-2 bg-[var(--panel-secondary,rgba(255,255,255,0.02))]">
                    <div className="text-sm font-bold text-[var(--text-primary)]">Add Existing User</div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Link an existing account to this portal and assign the correct workspace role.
                    </p>
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(null);
                          setMemberSearch('');
                          setOpenAddMemberDialog(true);
                        }}
                      >
                        Add Member
                      </Button>
                    </div>
                  </div>

                  <div className="border border-[rgba(var(--accent-gold-rgb),0.24)] rounded-xl p-4 space-y-2 bg-[rgba(var(--accent-gold-rgb),0.06)]">
                    <div className="text-sm font-bold text-[var(--text-primary)]">Create New Portal User</div>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Create a new portal-ready user, then issue an access code and sign-in link immediately.
                    </p>
                    <div className="pt-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setInviteForm(initialInviteForm);
                          setOpenCreatePortalUserDialog(true);
                        }}
                      >
                        Create User
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {inviteResult && renderAccessResult(inviteResult, 'Portal user created')}
                  {loginCodeResult && renderAccessResult(loginCodeResult, 'Portal login code refreshed')}
                </div>
              </DashboardPanel>
            )}

            {/* Activity Tab */}
            {activeTab === 'activity' && (
              <DashboardPanel title="Portal Activity" description="Recent membership and access-code changes for this portal">
                <PortalActivityList
                  activities={activities}
                  emptyTitle="No portal activity yet"
                  emptyDescription="Role changes, member invites, removals, and login-code refreshes will appear here."
                />
                <div className="flex justify-end mt-4">
                  <Link href={`/dashboard/partner-portals/${portalId}/activity`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">View All Activity</Button>
                  </Link>
                </div>
              </DashboardPanel>
            )}

            {/* Branding Tab */}
            {activeTab === 'branding' && (
              <PortalBrandingSettingsPanel
                portalId={portalId}
                portal={portal}
                canEdit={true}
                onSaved={(nextPortal) => setPortal((prev) => prev ? ({ ...prev, ...nextPortal }) : ({
                  id: nextPortal.id,
                  name: nextPortal.name,
                  code: nextPortal.code,
                  companyLabel: nextPortal.companyLabel || null,
                  accentColor: nextPortal.accentColor || null,
                  logoUrl: nextPortal.logoUrl || null,
                  isActive: nextPortal.isActive ?? true,
                  notes: nextPortal.notes || null,
                }))}
              />
            )}

            {/* Customers Tab */}
            {activeTab === 'customers' && (
              <DashboardPanel title="Portal Customers" description="Customers created inside this partner workspace">
                {customers.length === 0 ? (
                  <EmptyState icon={<User className="w-10 h-10" />} title="No portal customers" description="The partner can create their own customers from the portal workspace." />
                ) : (
                  <DataTable data={customers} columns={customerColumns} keyField="id" />
                )}
              </DashboardPanel>
            )}

            {/* Danger Zone Tab */}
            {activeTab === 'danger' && (
              <DashboardPanel title="Danger Zone" description="Irreversible actions for this partner portal">
                <div className="border border-[rgba(var(--error-rgb),0.35)] rounded-xl p-4 bg-[rgba(var(--error-rgb),0.05)] space-y-3">
                  <div className="font-bold text-sm text-[var(--error)]">
                    Delete this portal permanently
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Deleting <strong>{portal?.name || 'this portal'}</strong> permanently removes the workspace along with
                    {' '}{memberships.length} member{memberships.length === 1 ? '' : 's'},
                    {' '}{customers.length} customer{customers.length === 1 ? '' : 's'}, and
                    {' '}{assignments.length} shipment link{assignments.length === 1 ? '' : 's'}.
                    The shipments themselves stay in the main system — only the portal assignments, portal customers, member access, and portal finance records are deleted. This cannot be undone.
                  </p>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDeleteConfirmText('');
                        setOpenDeleteDialog(true);
                      }}
                      className="border-[var(--error)] text-[var(--error)] hover:bg-[rgba(var(--error-rgb),0.1)]"
                    >
                      Delete Portal
                    </Button>
                  </div>
                </div>
              </DashboardPanel>
            )}

            {/* Add Member Dialog */}
            <Modal
              open={openAddMemberDialog}
              onClose={() => {
                if (!savingMember) {
                  setOpenAddMemberDialog(false);
                  setSelectedUser(null);
                  setMemberSearch('');
                }
              }}
              title="Add Existing User To Portal"
              description="Search for an existing application user, then assign their portal role before saving access."
              size="sm"
              actions={
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpenAddMemberDialog(false);
                      setSelectedUser(null);
                      setMemberSearch('');
                    }}
                    disabled={savingMember}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => void handleAddMember()} disabled={savingMember || !selectedUser}>
                    {savingMember ? 'Saving...' : 'Add Member'}
                  </Button>
                </>
              }
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">Search User</label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
                    <input
                      type="text"
                      placeholder="Type name or email..."
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
                    />
                  </div>
                  <div className="mt-2 max-h-48 overflow-y-auto border border-[var(--border)] rounded-lg divide-y divide-[var(--border)] bg-[var(--background)]">
                    {users.length === 0 ? (
                      <div className="p-3 text-center text-xs text-[var(--text-secondary)]">No users found</div>
                    ) : (
                      users.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => setSelectedUser(u)}
                          className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[rgba(var(--accent-gold-rgb),0.06)] ${
                            selectedUser?.id === u.id ? 'bg-[rgba(var(--accent-gold-rgb),0.12)] font-semibold' : ''
                          }`}
                        >
                          <div>
                            <span className="text-[var(--text-primary)]">{u.name || 'Unnamed'}</span>
                            <span className="text-[var(--text-secondary)] font-mono ml-1.5">({u.email})</span>
                          </div>
                          {selectedUser?.id === u.id && <Check className="w-3.5 h-3.5 text-[var(--accent-gold)] shrink-0" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
                <Select
                  label="Portal Role"
                  value={memberRole}
                  onChange={(val) => setMemberRole(String(val))}
                  options={[{ value: 'ADMIN', label: 'ADMIN' }, { value: 'STAFF', label: 'STAFF' }]}
                />
              </div>
            </Modal>

            {/* Create Portal User Dialog */}
            <Modal
              open={openCreatePortalUserDialog}
              onClose={() => {
                if (!inviting) {
                  setOpenCreatePortalUserDialog(false);
                  setInviteForm(initialInviteForm);
                }
              }}
              title="Create Portal User"
              description="Create a portal-ready user profile and generate the initial access code in one step."
              size="md"
              actions={
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpenCreatePortalUserDialog(false);
                      setInviteForm(initialInviteForm);
                    }}
                    disabled={inviting}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={() => void handleInvitePortalUser()} disabled={inviting}>
                    {inviting ? 'Preparing...' : 'Create User And Access Code'}
                  </Button>
                </>
              }
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField label="Name *" value={inviteForm.name} onChange={(e) => setInviteForm((prev) => ({ ...prev, name: e.target.value }))} required />
                <FormField label="Email *" type="email" value={inviteForm.email} onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))} required />
                <FormField label="Phone" value={inviteForm.phone} onChange={(e) => setInviteForm((prev) => ({ ...prev, phone: e.target.value }))} />
                <FormField label="City" value={inviteForm.city} onChange={(e) => setInviteForm((prev) => ({ ...prev, city: e.target.value }))} />
                <FormField label="Country" value={inviteForm.country} onChange={(e) => setInviteForm((prev) => ({ ...prev, country: e.target.value }))} />
                <Select
                  label="Portal Role"
                  value={inviteForm.membershipRole}
                  onChange={(val) => setInviteForm((prev) => ({ ...prev, membershipRole: String(val) }))}
                  options={[{ value: 'ADMIN', label: 'ADMIN' }, { value: 'STAFF', label: 'STAFF' }]}
                />
              </div>
            </Modal>

            {/* Delete Portal Dialog */}
            <Modal
              open={openDeleteDialog}
              onClose={() => {
                if (!deletingPortal) {
                  setOpenDeleteDialog(false);
                  setDeleteConfirmText('');
                }
              }}
              title="Delete Portal Permanently"
              description={
                <>
                  This will permanently delete <strong>{portal?.name}</strong> and all of its members, customers, shipment links, and finance records. The shipments themselves remain in the main system. This action cannot be undone.
                </>
              }
              size="sm"
              actions={
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setOpenDeleteDialog(false);
                      setDeleteConfirmText('');
                    }}
                    disabled={deletingPortal}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => void handleDeletePortal()}
                    disabled={deletingPortal || deleteConfirmText !== portal?.name}
                    className="bg-[var(--error)] hover:bg-[var(--error-dark,red)] text-white"
                  >
                    {deletingPortal ? 'Deleting...' : 'Delete Portal Forever'}
                  </Button>
                </>
              }
            >
              <FormField
                label={`Type "${portal?.name || ''}" to confirm`}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                disabled={deletingPortal}
                placeholder={portal?.name || ''}
              />
            </Modal>

            <ConfirmDialog
              open={pendingRemoveMembership !== null}
              onClose={() => setPendingRemoveMembership(null)}
              onConfirm={() => {
                if (pendingRemoveMembership) {
                  void handleRemoveMembership(pendingRemoveMembership.id);
                }
                setPendingRemoveMembership(null);
              }}
              title="Remove portal member"
              message={`Remove ${pendingRemoveMembership?.user.name || pendingRemoveMembership?.user.email || 'this member'} from the portal? They will immediately lose access to this workspace.`}
              confirmText="Remove member"
              severity="warning"
              loading={removingMembershipId !== null}
            />

            <ConfirmDialog
              open={pendingUnassignShipment !== null}
              onClose={() => setPendingUnassignShipment(null)}
              onConfirm={() => {
                if (pendingUnassignShipment) {
                  void handleUnassignShipment(pendingUnassignShipment.shipment.id);
                }
                setPendingUnassignShipment(null);
              }}
              title="Unassign shipment"
              message={`Remove ${[pendingUnassignShipment?.shipment.vehicleYear, pendingUnassignShipment?.shipment.vehicleMake, pendingUnassignShipment?.shipment.vehicleModel].filter(Boolean).join(' ') || 'this shipment'} from the portal? The partner will no longer see it, but the shipment stays in the main system.`}
              confirmText="Unassign"
              severity="warning"
              loading={savingShipmentId !== null}
            />
          </div>
        )}
      </DashboardPanel>
    </DashboardSurface>
  );
}