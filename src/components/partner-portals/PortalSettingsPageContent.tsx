'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import AltRouteOutlinedIcon from '@mui/icons-material/AltRouteOutlined';
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import { Box, FormControlLabel, Switch, TextField, Typography } from '@mui/material';
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
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <a
              href={portal?.customDomainVerifiedAt && portal?.customDomain ? `https://${portal.customDomain}` : `/portal-site/${portalId}`}
              target={portal?.customDomainVerifiedAt && portal?.customDomain ? '_blank' : undefined}
              rel={portal?.customDomainVerifiedAt && portal?.customDomain ? 'noreferrer' : undefined}
              style={{ textDecoration: 'none' }}
            >
              <Button variant="outline" size="sm">Open Public Site</Button>
            </a>
            <Link href={`/portal/${portalId}/members`} style={{ textDecoration: 'none' }}>
              <Button variant="outline" size="sm">Back To Members</Button>
            </Link>
          </Box>
        }
      />

      {loading ? (
        <DashboardPanel title="Loading settings" description="Fetching portal branding and access details.">
          <Box sx={{ color: 'var(--text-secondary)' }}>Loading portal settings...</Box>
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
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box sx={{ p: 1.75, borderRadius: 2.5, bgcolor: 'rgba(var(--brand-primary-rgb),0.07)', display: 'grid', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NotificationsActiveOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Shipment Assignment Alerts</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Notify portal members when a new shipment is assigned into this workspace.
                  </Typography>
                  <FormControlLabel
                    control={<Switch checked={Boolean(portal?.notifyOnShipmentAssigned)} disabled={!canManageSettings || savingOperationalSettings} onChange={(event) => void handleSaveOperationalSettings({ notifyOnShipmentAssigned: event.target.checked })} />}
                    label={portal?.notifyOnShipmentAssigned ? 'Enabled' : 'Disabled'}
                  />
                </Box>

                <Box sx={{ p: 1.75, borderRadius: 2.5, bgcolor: 'rgba(var(--accent-rgb),0.08)', display: 'grid', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AltRouteOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Single-Customer Auto Link</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    When this portal has exactly one customer, automatically link newly assigned shipments to that customer.
                  </Typography>
                  <FormControlLabel
                    control={<Switch checked={Boolean(portal?.autoAssignToSingleCustomer)} disabled={!canManageSettings || savingOperationalSettings} onChange={(event) => void handleSaveOperationalSettings({ autoAssignToSingleCustomer: event.target.checked })} />}
                    label={portal?.autoAssignToSingleCustomer ? 'Enabled' : 'Disabled'}
                  />
                </Box>

                <Box sx={{ p: 1.75, borderRadius: 2.5, bgcolor: 'rgba(15,23,42,0.05)', display: 'grid', gap: 1.25 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <StickyNote2OutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Default Shipment Notes</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Pre-fill notes when a shipment is newly assigned into this portal and no specific note is provided.
                  </Typography>
                  <TextField
                    multiline
                    minRows={3}
                    value={defaultShipmentNotesDraft}
                    onChange={(event) => setDefaultShipmentNotesDraft(event.target.value)}
                    placeholder="Example: Confirm customer handoff within 24 hours and keep delivery milestones updated."
                    disabled={!canManageSettings || savingOperationalSettings}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="outline" size="sm" onClick={() => void handleSaveOperationalSettings({ defaultShipmentNotes: defaultShipmentNotesDraft })} disabled={!canManageSettings || savingOperationalSettings}>
                      Save Default Notes
                    </Button>
                  </Box>
                </Box>

                <Box sx={{ p: 1.75, borderRadius: 2.5, bgcolor: 'rgba(34,197,94,0.08)', display: 'grid', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlineOutlinedIcon sx={{ color: 'var(--text-secondary)' }} />
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Ready-State Rule</Typography>
                  </Box>
                  <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Control whether a shipment must be linked to a portal customer before portal staff can treat it as ready.
                  </Typography>
                  <FormControlLabel
                    control={<Switch checked={Boolean(portal?.requireCustomerLinkForReady)} disabled={!canManageSettings || savingOperationalSettings} onChange={(event) => void handleSaveOperationalSettings({ requireCustomerLinkForReady: event.target.checked })} />}
                    label={portal?.requireCustomerLinkForReady ? 'Customer link required for ready state' : 'Ready state can exist without a customer link'}
                  />
                </Box>
              </Box>
            </DashboardPanel>
          </DashboardGrid>

          <DashboardGrid className="grid-cols-1 gap-3 xl:grid-cols-[1.15fr_0.85fr]">
            <DashboardPanel title="Workspace Guidance" description="What belongs on this page as the portal grows.">
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <PaletteOutlinedIcon sx={{ color: 'var(--text-secondary)', mt: 0.3 }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Brand identity stays separate</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Logo, label, color, and custom-domain changes now live in settings, not inside the member administration surface.</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <ImageOutlinedIcon sx={{ color: 'var(--text-secondary)', mt: 0.3 }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Logo uploads stay portal-scoped</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Portal admins can upload a logo directly without relying on external links.</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <VerifiedUserOutlinedIcon sx={{ color: 'var(--text-secondary)', mt: 0.3 }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Settings are admin-controlled</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Portal staff can view the current setup, but only admins can change it.</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }}>
                  <TuneOutlinedIcon sx={{ color: 'var(--text-secondary)', mt: 0.3 }} />
                  <Box>
                    <Typography sx={{ fontSize: '0.92rem', fontWeight: 700 }}>Future settings have a home now</Typography>
                    <Typography sx={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>As the portal grows, this page can keep absorbing partner-visible defaults without overloading members or shipment screens.</Typography>
                  </Box>
                </Box>
              </Box>
            </DashboardPanel>

            <DashboardPanel title="Behavior Summary" description="How these settings affect the live partner workflow.">
              <Box sx={{ display: 'grid', gap: 1.5 }}>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Notification policy</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>{portal?.notifyOnShipmentAssigned ? 'Portal members are notified when shipments are assigned.' : 'Shipment assignment notifications are muted for this portal.'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Customer assignment default</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>{portal?.autoAssignToSingleCustomer ? 'New shipments auto-link when exactly one portal customer exists.' : 'New shipments arrive unlinked and require manual customer selection.'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Default notes</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>{portal?.defaultShipmentNotes?.trim() ? portal.defaultShipmentNotes : 'No default assignment note is configured.'}</Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.8rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Ready-state rule</Typography>
                  <Typography sx={{ fontSize: '0.95rem', fontWeight: 700 }}>{portal?.requireCustomerLinkForReady ? 'Shipments stay waiting until a portal customer is linked.' : 'Shipments can be treated as ready even before a portal customer is linked.'}</Typography>
                </Box>
              </Box>
            </DashboardPanel>
          </DashboardGrid>

          {!canManageSettings ? (
            <DashboardPanel>
              <EmptyState
                icon={<VerifiedUserOutlinedIcon />}
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