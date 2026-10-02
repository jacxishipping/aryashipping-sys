'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Package, Users, Palette, BadgeCheck, ShieldAlert } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { DashboardSurface, DashboardPanel, DashboardGrid } from '@/components/dashboard/DashboardSurface';
import { Button, ConfirmDialog, EmptyState, FormField, Modal, PageHeader, Select, SkeletonTable, toast } from '@/components/design-system';
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
    <div className="p-4 rounded-xl border border-[rgba(var(--accent-gold-rgb),0.28)] bg-[rgba(var(--accent-gold-rgb),0.08)] grid gap-2">
      <div className="font-bold text-[var(--text-primary)]">{title}</div>
      <p className="text-sm text-[var(--text-secondary)]">
        Share the sign-in page and code with this user. The workspace route is where they land after sign-in.
      </p>
      <p className="text-sm text-[var(--text-primary)]"><strong>Name:</strong> {result.name || result.email}</p>
      <p className="text-sm text-[var(--text-primary)]"><strong>Email:</strong> {result.email}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-[var(--text-primary)]"><strong>Login Code:</strong> {result.loginCode}</span>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.loginCode, 'Login code')}>Copy</Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-[var(--text-primary)]"><strong>Sign-In Page:</strong> {result.simpleLoginUrl}</span>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.simpleLoginUrl, 'Sign-in page')}>Copy</Button>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-[var(--text-primary)]"><strong>Workspace Route:</strong> {result.portalUrl}</span>
        <Button variant="outline" size="sm" onClick={() => void handleCopyValue(result.portalUrl, 'Workspace route')}>Copy</Button>
      </div>
    </div>
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
        <select
          aria-label="Portal Role"
          value={memberRoleDrafts[row.id] || row.role}
          onChange={(event) => setMemberRoleDrafts((prev) => ({ ...prev, [row.id]: event.target.value }))}
          className="h-8 px-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)]"
        >
          <option value="ADMIN">ADMIN</option>
          <option value="STAFF">STAFF</option>
        </select>
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
        <div className="flex gap-2 justify-end flex-nowrap whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
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
          <div className="flex gap-2 flex-wrap">
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
            <Link href={`/portal/${portalId}/settings`} className="no-underline">
              <Button variant="outline" size="sm">Open Settings</Button>
            </Link>
          </div>
        ) : undefined}
      />

      {loading ? (
        <DashboardPanel title="Portal Members" description="People who can access this partner workspace.">
          <SkeletonTable rows={5} columns={4} />
        </DashboardPanel>
      ) : memberships.length === 0 ? (
        <DashboardPanel>
          <EmptyState icon={<Users className="w-8 h-8 text-[var(--text-secondary)]" />} title="No members" description="This portal does not have any members yet." />
        </DashboardPanel>
      ) : (
        <div className="grid gap-6">
          {!canManageMembers ? (
            <DashboardPanel>
              <EmptyState icon={<Package className="w-8 h-8 text-[var(--text-secondary)]" />} title="Portal admin access required" description="Only portal admins can invite members, change roles, remove members, regenerate access codes, or update branding." />
            </DashboardPanel>
          ) : null}

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.35fr_0.9fr]">
            <DashboardPanel title="Member Directory" description="Control who can enter the workspace and what role boundary they hold inside the portal.">
              <DataTable data={memberships} columns={columns} keyField="id" />
            </DashboardPanel>

            <DashboardPanel title="Access Snapshot" description="Keep an operational view of account ownership and recent portal changes.">
              <div className="grid gap-3">
                <div className="p-4 rounded-xl bg-[rgba(var(--brand-primary-rgb),0.07)]">
                  <div className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">Admin Coverage</div>
                  <div className="text-2xl font-extrabold text-[var(--text-primary)]">{adminCount}</div>
                  <div className="text-xs text-[var(--text-secondary)]">At least one portal admin is always preserved for access continuity.</div>
                </div>
                <div className="grid gap-2">
                  {memberships.slice(0, 4).map((membership) => (
                    <div key={membership.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[rgba(var(--text-primary-rgb),0.04)]">
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{membership.user.name || membership.user.email}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{membership.user.email}</div>
                      </div>
                      <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${membership.role === 'ADMIN' ? 'bg-[rgba(var(--brand-primary-rgb),0.12)] text-[var(--brand-primary)]' : 'bg-[rgba(var(--text-primary-rgb),0.06)] text-[var(--text-secondary)]'}`}>
                        {membership.role}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>

          {canManageMembers ? (
            <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1fr]">
              <DashboardPanel title="Member Actions" description="Launch the member creation flow from a dedicated action instead of editing fields inline.">
                <div className="grid gap-4">
                  <div className="border border-[rgba(var(--accent-gold-rgb),0.24)] rounded-xl p-5 grid gap-3 bg-[rgba(var(--accent-gold-rgb),0.08)]">
                    <div className="text-base font-bold text-[var(--text-primary)]">Create New Portal User</div>
                    <p className="text-sm text-[var(--text-secondary)]">
                      Create a portal-ready user profile, assign the workspace role, and issue the initial access code from a single modal.
                    </p>
                    <div className="flex justify-start">
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
                    </div>
                  </div>

                  {inviteResult ? renderAccessResult(inviteResult, 'Portal user created') : null}
                  {loginCodeResult ? renderAccessResult(loginCodeResult, 'Portal login code refreshed') : null}
                </div>
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
                <div className="flex justify-end mt-4">
                  <Link href={`/portal/${portalId}/activity`} className="no-underline">
                    <Button variant="outline" size="sm">View All Activity</Button>
                  </Link>
                </div>
              </DashboardPanel>
            ) : null}

            <DashboardPanel title="Access Guidance" description="What this page controls inside the partner workspace.">
              <div className="grid gap-4">
                <div className="flex gap-3 items-start">
                  <BadgeCheck className="w-5 h-5 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Roles stay local to the portal</div>
                    <div className="text-xs text-[var(--text-secondary)]">Portal ADMIN and STAFF only affect this workspace, not the broader app.</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <ShieldAlert className="w-5 h-5 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Access codes are customer-friendly</div>
                    <div className="text-xs text-[var(--text-secondary)]">Portal admins can regenerate login codes for customer-style accounts without changing your main auth model.</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Palette className="w-5 h-5 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Branding moved into settings</div>
                    <div className="text-xs text-[var(--text-secondary)]">Logo upload, accent color, and company label now live on the dedicated Settings page so member management stays focused.</div>
                  </div>
                </div>
              </div>
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
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <FormField label="Name" value={inviteForm.name} onChange={(e: any) => setInviteForm((prev) => ({ ...prev, name: e?.target ? e.target.value : e }))} />
              <FormField label="Email" value={inviteForm.email} onChange={(e: any) => setInviteForm((prev) => ({ ...prev, email: e?.target ? e.target.value : e }))} />
              <FormField label="Phone" value={inviteForm.phone} onChange={(e: any) => setInviteForm((prev) => ({ ...prev, phone: e?.target ? e.target.value : e }))} />
              <FormField label="City" value={inviteForm.city} onChange={(e: any) => setInviteForm((prev) => ({ ...prev, city: e?.target ? e.target.value : e }))} />
              <FormField label="Country" value={inviteForm.country} onChange={(e: any) => setInviteForm((prev) => ({ ...prev, country: e?.target ? e.target.value : e }))} />
              <Select label="Portal Role" value={inviteForm.membershipRole} onChange={(value) => setInviteForm((prev) => ({ ...prev, membershipRole: String(value) }))} options={[{ value: 'ADMIN', label: 'ADMIN' }, { value: 'STAFF', label: 'STAFF' }]} />
            </div>
          </Modal>
        </div>
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