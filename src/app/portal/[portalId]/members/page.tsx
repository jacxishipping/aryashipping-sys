'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import BrandingWatermarkOutlinedIcon from '@mui/icons-material/BrandingWatermarkOutlined';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import {
  Box,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useSession } from 'next-auth/react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, ConfirmDialog, EmptyState, Modal, PageHeader, Select, Skeleton, SkeletonTable, toast , FormField } from '@/components/design-system';
import { PortalActivityList } from '@/components/partner-portals/PortalActivityList';
import { DataTable, type Column } from '@/components/ui/DataTable';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
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

const initialInviteForm = {
  name: '',
  email: '',
  phone: '',
  city: '',
  country: '',
  membershipRole: 'STAFF',
};

export default function PortalMembersPage() {
  const params = useParams();
  const { data: session } = useSession();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [memberships, setMemberships] = useState<PortalMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberRoleDrafts, setMemberRoleDrafts] = useState<Record<string, string>>({});
  const [savingMembershipRoleId, setSavingMembershipRoleId] = useState<string | null>(null);
  const [removingMembershipId, setRemovingMembershipId] = useState<string | null>(null);
  const [pendingRemoveMembership, setPendingRemoveMembership] = useState<PortalMembership | null>(null);
  const [regeneratingLoginCodeMembershipId, setRegeneratingLoginCodeMembershipId] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState(initialInviteForm);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [loginCodeResult, setLoginCodeResult] = useState<{ loginCode: string; simpleLoginUrl: string; portalUrl: string; email: string; name: string | null } | null>(null);
  const [activities, setActivities] = useState<PortalActivity[]>([]);
  const [openCreatePortalUserDialog, setOpenCreatePortalUserDialog] = useState(false);

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.user.id === session?.user?.id) || null,
    [memberships, session?.user?.id],
  );
  const canManageMembers = currentMembership?.role === 'ADMIN';
  const adminCount = memberships.filter((membership) => membership.role === 'ADMIN').length;
  const customerAppUsers = memberships.filter((membership) => membership.user.role === 'user').length;

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, { cache: 'no-store' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load portal members');
      }

      setPortal(data.portal);
      setMemberships(data.memberships || []);
      setMemberRoleDrafts(
        Object.fromEntries((data.memberships || []).map((membership: PortalMembership) => [membership.id, membership.role]))
      );

      const activityResponse = await fetch(`/api/partner-portals/${portalId}/activity?limit=10`, { cache: 'no-store' });
      const activityData = await activityResponse.json();
      if (activityResponse.ok) {
        setActivities(activityData.activities || []);
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to load portal members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMemberships();
  }, [portalId]);

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
    <Box sx={{ border: '1px solid rgba(var(--accent-gold-rgb), 0.28)', bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)', borderRadius: 2, p: 2, display: 'grid', gap: 0.75 }}>
      <Typography sx={{ fontWeight: 700 }}>{title}</Typography>
      <Typography sx={{ color: 'var(--text-secondary)' }}>
        Share the sign-in page and code with this user. The workspace route is where they land after sign-in.
      </Typography>
      <Typography><strong>Name:</strong> {result.name || result.email}</Typography>
      <Typography><strong>Email:</strong> {result.email}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography><strong>Login Code:</strong> {result.loginCode}</Typography>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.loginCode, 'Login code')}>Copy</Button>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography><strong>Sign-In Page:</strong> {result.simpleLoginUrl}</Typography>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.simpleLoginUrl, 'Sign-in page')}>Copy</Button>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography><strong>Workspace Route:</strong> {result.portalUrl}</Typography>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.portalUrl, 'Workspace route')}>Copy</Button>
      </Box>
    </Box>
  );

  const handleUpdateMembershipRole = async (membership: PortalMembership) => {
    const nextRole = memberRoleDrafts[membership.id] || membership.role;

    if (!canManageMembers || nextRole === membership.role) {
      return;
    }

    try {
      setSavingMembershipRoleId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: membership.user.id, role: nextRole }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update portal role');
      }

      toast.success('Portal role updated');
      await fetchMemberships();
    } catch (error) {
      setMemberRoleDrafts((prev) => ({ ...prev, [membership.id]: membership.role }));
      toast.error(error instanceof Error ? error.message : 'Failed to update portal role');
    } finally {
      setSavingMembershipRoleId(null);
    }
  };

  const handleRemoveMembership = async (membershipId: string) => {
    if (!canManageMembers) {
      return;
    }

    try {
      setRemovingMembershipId(membershipId);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships/${membershipId}`, { method: 'DELETE' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove portal member');
      }

      toast.success('Portal member removed');
      await fetchMemberships();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove portal member');
    } finally {
      setRemovingMembershipId(null);
    }
  };

  const handleRegenerateLoginCode = async (membership: PortalMembership) => {
    if (!canManageMembers) {
      return;
    }

    try {
      setRegeneratingLoginCodeMembershipId(membership.id);
      const response = await fetch(`/api/partner-portals/${portalId}/memberships/${membership.id}/login-code`, { method: 'POST' });
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

  const handleInvitePortalUser = async () => {
    if (!canManageMembers) {
      return;
    }

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
      await fetchMemberships();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite portal user');
    } finally {
      setInviting(false);
    }
  };

  const columns = useMemo<Column<PortalMembership>[]>(() => [
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
      render: (_, row) => canManageMembers ? (
        <TextField
          select
          size="small"
          value={memberRoleDrafts[row.id] || row.role}
          onChange={(event) => setMemberRoleDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="ADMIN">ADMIN</MenuItem>
          <MenuItem value="STAFF">STAFF</MenuItem>
        </TextField>
      ) : row.role,
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
      render: (_, row) => canManageMembers ? (
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'nowrap', whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
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
        </Box>
      ) : 'Read only',
    },
  ], [canManageMembers, memberRoleDrafts, regeneratingLoginCodeMembershipId, removingMembershipId, savingMembershipRoleId]);

  return (
    <DashboardSurface>
      <PageHeader
        title={portal ? `${portal.companyLabel || portal.name} Members` : 'Portal Members'}
        description={canManageMembers ? 'Manage partner access, portal roles, branding, and invitation workflows from one workspace.' : 'View the member roster for this portal workspace.'}
        meta={[
          { label: 'Members', value: memberships.length, helper: 'Users assigned to this portal' },
          { label: 'Admins', value: adminCount, helper: 'Members who can manage access' },
          { label: 'Portal Users', value: customerAppUsers, helper: 'Customer-style accounts using login codes' },
        ]}
        actions={canManageMembers ? (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
            <Link href={`/portal/${portalId}/settings`} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Open Settings</Button>
            </Link>
          </Box>
        ) : undefined}
      />

      {loading ? (
        <DashboardPanel title="Portal Members" description="People who can access this partner workspace.">
          <SkeletonTable rows={5} columns={4} />
        </DashboardPanel>
      ) : memberships.length === 0 ? (
        <DashboardPanel>
          <EmptyState icon={<PeopleOutlineIcon />} title="No members" description="This portal does not have any members yet." />
        </DashboardPanel>
      ) : (
        <Box sx={{ display: 'grid', gap: 3 }}>
          {!canManageMembers ? (
            <DashboardPanel>
              <EmptyState icon={<Inventory2OutlinedIcon />} title="Portal admin access required" description="Only portal admins can invite members, change roles, remove members, regenerate access codes, or update branding." />
            </DashboardPanel>
          ) : null}

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.9fr]">
            <DashboardPanel title="Member Directory" description="Control who can enter the workspace and what role boundary they hold inside the portal.">
              <DataTable data={memberships} columns={columns} keyField="id" />
            </DashboardPanel>

            <DashboardPanel title="Access Snapshot" description="Keep an operational view of account ownership and recent portal changes.">
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Box sx={{ p: 1.75, borderRadius: 2.5, bgcolor: 'rgba(var(--brand-primary-rgb),0.07)' }}>
                  <Typography sx={{ fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Admin Coverage</Typography>
                  <Typography sx={{ fontSize: '1.45rem', fontWeight: 800 }}>{adminCount}</Typography>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>At least one portal admin is always preserved for access continuity.</Typography>
                </Box>
                <Box sx={{ display: 'grid', gap: 1.2 }}>
                  {memberships.slice(0, 4).map((membership) => (
                    <Box key={membership.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, p: 1.2, borderRadius: 2, bgcolor: 'rgba(var(--text-primary-rgb),0.04)' }}>
                      <Box>
                        <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{membership.user.name || membership.user.email}</Typography>
                        <Typography sx={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{membership.user.email}</Typography>
                      </Box>
                      <Box sx={{ px: 1.1, py: 0.45, borderRadius: 999, bgcolor: membership.role === 'ADMIN' ? 'rgba(var(--brand-primary-rgb),0.12)' : 'rgba(var(--text-primary-rgb),0.06)', color: membership.role === 'ADMIN' ? 'var(--brand-primary)' : 'var(--text-secondary)', fontSize: '0.74rem', fontWeight: 700 }}>
                        {membership.role}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </DashboardPanel>
          </DashboardGrid>

          {canManageMembers ? (
            <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1fr]">
              <DashboardPanel title="Member Actions" description="Launch the member creation flow from a dedicated action instead of editing fields inline.">
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ border: '1px solid rgba(var(--accent-gold-rgb), 0.24)', borderRadius: 2.5, p: 2.25, display: 'grid', gap: 1.25, bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)' }}>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 700 }}>Create New Portal User</Typography>
                    <Typography sx={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                      Create a portal-ready user profile, assign the workspace role, and issue the initial access code from a single modal.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          setInviteForm(initialInviteForm);
                          setOpenCreatePortalUserDialog(true);
                        }}
                      >
                        Add New Portal User
                      </Button>
                    </Box>
                  </Box>

                  {inviteResult ? renderAccessResult(inviteResult, 'Portal user created') : null}
                  {loginCodeResult ? renderAccessResult(loginCodeResult, 'Portal login code refreshed') : null}
                </Box>
              </DashboardPanel>

            </DashboardGrid>
          ) : null}

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1fr_0.95fr]">
            {canManageMembers ? (
              <DashboardPanel title="Portal Activity" description="Recent membership and access-code changes for this portal">
                <PortalActivityList
                  activities={activities}
                  emptyTitle="No portal activity yet"
                  emptyDescription="Role changes, member invites, removals, and login-code refreshes will appear here."
                />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                  <Link href={`/portal/${portalId}/activity`} style={{ textDecoration: 'none' }}>
                    <Button variant="outline" size="sm">View All Activity</Button>
                  </Link>
                </Box>
              </DashboardPanel>
            ) : null}

            <DashboardPanel title="Access Guidance" description="What this page controls inside the partner workspace.">
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <BadgeOutlinedIcon sx={{ color: 'var(--text-secondary)', mt: 0.3 }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Roles stay local to the portal</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Portal ADMIN and STAFF only affect this workspace, not the broader app.</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <AdminPanelSettingsOutlinedIcon sx={{ color: 'var(--text-secondary)', mt: 0.3 }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Access codes are customer-friendly</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Portal admins can regenerate login codes for customer-style accounts without changing your main auth model.</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <BrandingWatermarkOutlinedIcon sx={{ color: 'var(--text-secondary)', mt: 0.3 }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Branding moved into settings</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Logo upload, accent color, and company label now live on the dedicated Settings page so member management stays focused.</Typography>
                  </Box>
                </Box>
              </Box>
            </DashboardPanel>
          </DashboardGrid>

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
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
              <FormField label="Name" value={inviteForm.name} onChange={(event) => setInviteForm((prev) => ({ ...prev, name: event.target.value }))} />
              <FormField label="Email" value={inviteForm.email} onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))} />
              <FormField label="Phone" value={inviteForm.phone} onChange={(event) => setInviteForm((prev) => ({ ...prev, phone: event.target.value }))} />
              <FormField label="City" value={inviteForm.city} onChange={(event) => setInviteForm((prev) => ({ ...prev, city: event.target.value }))} />
              <FormField label="Country" value={inviteForm.country} onChange={(event) => setInviteForm((prev) => ({ ...prev, country: event.target.value }))} />
              <Select label="Portal Role" value={inviteForm.membershipRole} onChange={(value) => setInviteForm((prev) => ({ ...prev, membershipRole: String(value) }))} options={[{ value: 'ADMIN', label: 'ADMIN' }, { value: 'STAFF', label: 'STAFF' }]} />
            </Box>
          </Modal>
        </Box>
      )}

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
    </DashboardSurface>
  );
}