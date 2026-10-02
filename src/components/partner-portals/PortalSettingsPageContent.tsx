'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Sliders,
  Palette,
  Image as ImageIcon,
  ShieldCheck,
  Bell,
  GitFork,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { DashboardGrid, DashboardPanel, DashboardSurface } from '@/components/dashboard/DashboardSurface';
import { Button, EmptyState, PageHeader, toast } from '@/components/design-system';
import PortalBrandingSettingsPanel from '@/components/partner-portals/PortalBrandingSettingsPanel';

type PortalInfo = {
  id: string;
  name: string;
  code: string | null;
  customDomain?: string | null;
  customDomainVerifiedAt?: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  notifyOnShipmentAssigned?: boolean;
  autoAssignToSingleCustomer?: boolean;
  defaultShipmentNotes?: string | null;
  requireCustomerLinkForReady?: boolean;
  isActive?: boolean;
  notes?: string | null;
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

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className={`inline-flex items-center gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] ${
          checked ? 'bg-[var(--brand-primary)]' : 'bg-[rgba(var(--text-primary-rgb),0.2)]'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
      <span className="text-[0.875rem] font-medium text-[var(--text-primary)]">{label}</span>
    </label>
  );
}

export default function PortalSettingsPageContent() {
  const params = useParams();
  const { data: session } = useSession();
  const portalId = String(params.portalId || '');
  const [portal, setPortal] = useState<PortalInfo | null>(null);
  const [memberships, setMemberships] = useState<PortalMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingOperationalSettings, setSavingOperationalSettings] = useState(false);
  const [defaultShipmentNotesDraft, setDefaultShipmentNotesDraft] = useState('');

  const currentMembership = useMemo(
    () => memberships.find((membership) => membership.user.id === session?.user?.id) || null,
    [memberships, session?.user?.id],
  );
  const canManageSettings = currentMembership?.role === 'ADMIN';

  useEffect(() => {
    let cancelled = false;

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [portalResponse, membershipsResponse] = await Promise.all([
          fetch(`/api/partner-portals/${portalId}`, { cache: 'no-store' }),
          fetch(`/api/partner-portals/${portalId}/memberships`, { cache: 'no-store' }),
        ]);

        const portalData = await portalResponse.json();
        const membershipsData = await membershipsResponse.json();

        if (!portalResponse.ok) {
          throw new Error(portalData.error || 'Failed to load portal settings');
        }

        if (!membershipsResponse.ok) {
          throw new Error(membershipsData.error || 'Failed to load portal members');
        }

        if (!cancelled) {
          setPortal(portalData.portal || null);
          setDefaultShipmentNotesDraft(portalData.portal?.defaultShipmentNotes || '');
          setMemberships(membershipsData.memberships || []);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : 'Failed to load portal settings');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (portalId) {
      void fetchSettings();
    }

    return () => {
      cancelled = true;
    };
  }, [portalId]);

  const handleSaveOperationalSettings = async (updates: Partial<PortalInfo>) => {
    try {
      setSavingOperationalSettings(true);
      const response = await fetch(`/api/partner-portals/${portalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save portal settings');
      }

      setPortal(data.portal || null);
      setDefaultShipmentNotesDraft(data.portal?.defaultShipmentNotes || '');
      toast.success('Portal settings updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save portal settings');
    } finally {
      setSavingOperationalSettings(false);
    }
  };

  return (
    <DashboardSurface>
      <PageHeader
        title={portal ? `${portal.companyLabel || portal.name} Settings` : 'Portal Settings'}
        description="Control the branded identity of this partner workspace without mixing it into member management."
        meta={[
          { label: 'Brand Label', value: portal?.companyLabel || portal?.name || 'Portal', helper: 'Shown in the portal shell' },
          { label: 'Custom Domain', value: portal?.customDomain || 'Standard path', helper: portal?.customDomain ? (portal?.customDomainVerifiedAt ? 'Verified and ready to route portal traffic' : 'Saved, but still waiting for DNS verification') : 'Uses the default /portal route' },
          { label: 'Public Site', value: portal?.customDomainVerifiedAt && portal?.customDomain ? portal.customDomain : `/portal-site/${portalId}`, helper: 'Branded landing page shown before login' },
          { label: 'Logo', value: portal?.logoUrl ? 'Configured' : 'Not set', helper: 'Upload or replace the partner mark' },
          { label: 'Notifications', value: portal?.notifyOnShipmentAssigned ? 'On' : 'Off', helper: 'Shipment assignment alerts' },
        ]}
        actions={
          <div className="flex gap-2 flex-wrap">
            <a
              href={portal?.customDomainVerifiedAt && portal?.customDomain ? `https://${portal.customDomain}` : `/portal-site/${portalId}`}
              target={portal?.customDomainVerifiedAt && portal?.customDomain ? '_blank' : undefined}
              rel={portal?.customDomainVerifiedAt && portal?.customDomain ? 'noreferrer' : undefined}
              className="no-underline"
            >
              <Button variant="outline" size="sm">Open Public Site</Button>
            </a>
            <Link href={`/portal/${portalId}/members`} className="no-underline">
              <Button variant="outline" size="sm">Back To Members</Button>
            </Link>
          </div>
        }
      />

      {loading ? (
        <DashboardPanel title="Loading settings" description="Fetching portal branding and access details.">
          <div className="text-[var(--text-secondary)]">Loading portal settings...</div>
        </DashboardPanel>
      ) : (
        <>
          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <PortalBrandingSettingsPanel
              portalId={portalId}
              portal={portal}
              canEdit={canManageSettings}
              onSaved={(nextPortal) => setPortal(nextPortal)}
            />

            <DashboardPanel title="Operational Defaults" description="Use portal-level defaults to shape partner notifications and customer assignment behavior.">
              <div className="grid gap-4">
                <div className="p-4 rounded-xl bg-[rgba(var(--brand-primary-rgb),0.07)] grid gap-2">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-[var(--text-secondary)]" />
                    <span className="text-[0.92rem] font-bold text-[var(--text-primary)]">Shipment Assignment Alerts</span>
                  </div>
                  <p className="text-[0.82rem] text-[var(--text-secondary)] m-0">
                    Notify portal members when a new shipment is assigned into this workspace.
                  </p>
                  <ToggleSwitch
                    checked={Boolean(portal?.notifyOnShipmentAssigned)}
                    disabled={!canManageSettings || savingOperationalSettings}
                    onChange={(checked) => void handleSaveOperationalSettings({ notifyOnShipmentAssigned: checked })}
                    label={portal?.notifyOnShipmentAssigned ? 'Enabled' : 'Disabled'}
                  />
                </div>

                <div className="p-4 rounded-xl bg-[rgba(var(--accent-rgb),0.08)] grid gap-2">
                  <div className="flex items-center gap-2">
                    <GitFork className="w-5 h-5 text-[var(--text-secondary)]" />
                    <span className="text-[0.92rem] font-bold text-[var(--text-primary)]">Single-Customer Auto Link</span>
                  </div>
                  <p className="text-[0.82rem] text-[var(--text-secondary)] m-0">
                    When this portal has exactly one customer, automatically link newly assigned shipments to that customer.
                  </p>
                  <ToggleSwitch
                    checked={Boolean(portal?.autoAssignToSingleCustomer)}
                    disabled={!canManageSettings || savingOperationalSettings}
                    onChange={(checked) => void handleSaveOperationalSettings({ autoAssignToSingleCustomer: checked })}
                    label={portal?.autoAssignToSingleCustomer ? 'Enabled' : 'Disabled'}
                  />
                </div>

                <div className="p-4 rounded-xl bg-[rgba(15,23,42,0.05)] grid gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[var(--text-secondary)]" />
                    <span className="text-[0.92rem] font-bold text-[var(--text-primary)]">Default Shipment Notes</span>
                  </div>
                  <p className="text-[0.82rem] text-[var(--text-secondary)] m-0">
                    Pre-fill notes when a shipment is newly assigned into this portal and no specific note is provided.
                  </p>
                  <textarea
                    rows={3}
                    value={defaultShipmentNotesDraft}
                    onChange={(event) => setDefaultShipmentNotesDraft(event.target.value)}
                    placeholder="Example: Confirm customer handoff within 24 hours and keep delivery milestones updated."
                    disabled={!canManageSettings || savingOperationalSettings}
                    className="w-full p-2.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--text-primary)] text-[0.875rem] focus:outline-none focus:border-[var(--brand-primary)] resize-y disabled:opacity-50"
                  />
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleSaveOperationalSettings({ defaultShipmentNotes: defaultShipmentNotesDraft })}
                      disabled={!canManageSettings || savingOperationalSettings}
                    >
                      Save Default Notes
                    </Button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[rgba(34,197,94,0.08)] grid gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[var(--text-secondary)]" />
                    <span className="text-[0.92rem] font-bold text-[var(--text-primary)]">Ready-State Rule</span>
                  </div>
                  <p className="text-[0.82rem] text-[var(--text-secondary)] m-0">
                    Control whether a shipment must be linked to a portal customer before portal staff can treat it as ready.
                  </p>
                  <ToggleSwitch
                    checked={Boolean(portal?.requireCustomerLinkForReady)}
                    disabled={!canManageSettings || savingOperationalSettings}
                    onChange={(checked) => void handleSaveOperationalSettings({ requireCustomerLinkForReady: checked })}
                    label={portal?.requireCustomerLinkForReady ? 'Customer link required for ready state' : 'Ready state can exist without a customer link'}
                  />
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <DashboardPanel title="Workspace Guidance" description="What belongs on this page as the portal grows.">
              <div className="grid gap-3.5">
                <div className="flex gap-3 items-start">
                  <Palette className="w-5 h-5 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[0.92rem] font-bold text-[var(--text-primary)]">Brand identity stays separate</div>
                    <div className="text-[0.82rem] text-[var(--text-secondary)]">Logo, label, color, and custom-domain changes now live in settings, not inside the member administration surface.</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <ImageIcon className="w-5 h-5 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[0.92rem] font-bold text-[var(--text-primary)]">Logo uploads stay portal-scoped</div>
                    <div className="text-[0.82rem] text-[var(--text-secondary)]">Portal admins can upload a logo directly without relying on external links.</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <ShieldCheck className="w-5 h-5 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[0.92rem] font-bold text-[var(--text-primary)]">Settings are admin-controlled</div>
                    <div className="text-[0.82rem] text-[var(--text-secondary)]">Portal staff can view the current setup, but only admins can change it.</div>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <Sliders className="w-5 h-5 text-[var(--text-secondary)] mt-0.5 shrink-0" />
                  <div>
                    <div className="text-[0.92rem] font-bold text-[var(--text-primary)]">Future settings have a home now</div>
                    <div className="text-[0.82rem] text-[var(--text-secondary)]">As the portal grows, this page can keep absorbing partner-visible defaults without overloading members or shipment screens.</div>
                  </div>
                </div>
              </div>
            </DashboardPanel>

            <DashboardPanel title="Behavior Summary" description="How these settings affect the live partner workflow.">
              <div className="grid gap-3.5">
                <div>
                  <div className="text-[0.8rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] font-semibold">Notification policy</div>
                  <div className="text-[0.95rem] font-bold text-[var(--text-primary)]">{portal?.notifyOnShipmentAssigned ? 'Portal members are notified when shipments are assigned.' : 'Shipment assignment notifications are muted for this portal.'}</div>
                </div>
                <div>
                  <div className="text-[0.8rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] font-semibold">Customer assignment default</div>
                  <div className="text-[0.95rem] font-bold text-[var(--text-primary)]">{portal?.autoAssignToSingleCustomer ? 'New shipments auto-link when exactly one portal customer exists.' : 'New shipments arrive unlinked and require manual customer selection.'}</div>
                </div>
                <div>
                  <div className="text-[0.8rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] font-semibold">Default notes</div>
                  <div className="text-[0.95rem] font-bold text-[var(--text-primary)]">{portal?.defaultShipmentNotes?.trim() ? portal.defaultShipmentNotes : 'No default assignment note is configured.'}</div>
                </div>
                <div>
                  <div className="text-[0.8rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] font-semibold">Ready-state rule</div>
                  <div className="text-[0.95rem] font-bold text-[var(--text-primary)]">{portal?.requireCustomerLinkForReady ? 'Shipments stay waiting until a portal customer is linked.' : 'Shipments can be treated as ready even before a portal customer is linked.'}</div>
                </div>
              </div>
            </DashboardPanel>
          </DashboardGrid>

          {!canManageSettings ? (
            <DashboardPanel>
              <EmptyState
                icon={<ShieldCheck className="w-10 h-10" />}
                title="Portal admin access required"
                description="Only portal admins can save branding and settings changes for this workspace."
              />
            </DashboardPanel>
          ) : null}
        </>
      )}
    </DashboardSurface>
  );
}