'use client';

import { useRef } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, ConfirmDialog, FormField, toast } from '@/components/design-system';
import { getPortalBrandIdentity } from '@/lib/partner-portal-branding';
import {
  getPortalCustomDomainVerificationHost,
  getPortalCustomDomainVerificationValue,
  normalizeRequestHost,
} from '@/lib/partner-portal-domains';

type PortalBrandingInfo = {
  id: string;
  name: string;
  code: string | null;
  customDomain?: string | null;
  customDomainVerificationToken?: string | null;
  customDomainVerifiedAt?: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive?: boolean;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type PortalBrandingSettingsPanelProps = {
  portalId: string;
  portal: PortalBrandingInfo | null;
  canEdit: boolean;
  onSaved?: (portal: PortalBrandingInfo) => void;
  compact?: boolean;
};

export default function PortalBrandingSettingsPanel({
  portalId,
  portal,
  canEdit,
  onSaved,
  compact = false,
}: PortalBrandingSettingsPanelProps) {
  const [form, setForm] = useState({ companyLabel: '', accentColor: '', logoUrl: '', customDomain: '' });
  const [saving, setSaving] = useState(false);
  const [verifyingDomain, setVerifyingDomain] = useState(false);
  const [checkingDomain, setCheckingDomain] = useState(false);
  const [disconnectingDomain, setDisconnectingDomain] = useState(false);
  const [confirmDisconnectOpen, setConfirmDisconnectOpen] = useState(false);
  const [domainCheckError, setDomainCheckError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingLogoPreviewUrl, setPendingLogoPreviewUrl] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const appHost = useMemo(() => {
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!configuredUrl) {
      if (typeof window !== 'undefined') {
        return normalizeRequestHost(window.location.host) || '';
      }

      return '';
    }

    try {
      return new URL(configuredUrl).host;
    } catch {
      if (typeof window !== 'undefined') {
        return normalizeRequestHost(window.location.host) || '';
      }

      return '';
    }
  }, []);

  useEffect(() => {
    setForm({
      companyLabel: portal?.companyLabel || '',
      accentColor: portal?.accentColor || '',
      logoUrl: portal?.logoUrl || '',
      customDomain: portal?.customDomain || '',
    });
  }, [portal?.accentColor, portal?.companyLabel, portal?.customDomain, portal?.logoUrl]);

  useEffect(() => () => {
    if (pendingLogoPreviewUrl) {
      URL.revokeObjectURL(pendingLogoPreviewUrl);
    }
  }, [pendingLogoPreviewUrl]);

  const brand = useMemo(
    () => getPortalBrandIdentity({
      name: portal?.name,
      companyLabel: form.companyLabel,
      accentColor: form.accentColor,
      logoUrl: form.logoUrl,
    }),
    [form.accentColor, form.companyLabel, form.logoUrl, portal?.name],
  );

  const publicEntryPreview = useMemo(() => {
    if (form.customDomain) {
      return `https://${form.customDomain}`;
    }

    return appHost ? `https://${appHost}/portal-site/${portalId}` : `/portal-site/${portalId}`;
  }, [appHost, form.customDomain, portalId]);

  const workspacePreview = useMemo(() => {
    if (form.customDomain) {
      return `https://${form.customDomain}`;
    }

    return appHost ? `https://${appHost}/portal/${portalId}` : `/portal/${portalId}`;
  }, [appHost, form.customDomain, portalId]);

  const savedCustomDomain = portal?.customDomain || '';
  const hasUnsavedDomainChange = form.customDomain !== savedCustomDomain;
  const verificationHost = portal?.customDomain ? getPortalCustomDomainVerificationHost(portal.customDomain) : null;
  const verificationValue = portal?.customDomainVerificationToken
    ? getPortalCustomDomainVerificationValue(portal.customDomainVerificationToken)
    : null;

  const handleVerifyDomain = async () => {
    if (!canEdit || !portal?.customDomain) {
      return;
    }

    try {
      setVerifyingDomain(true);
      const response = await fetch(`/api/partner-portals/${portalId}/verify-domain`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify custom domain');
      }

      toast.success('Custom domain verified');
      onSaved?.(data.portal);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to verify custom domain');
    } finally {
      setVerifyingDomain(false);
    }
  };

  const handleCheckDomain = async () => {
    if (!canEdit || !form.customDomain) {
      return;
    }

    try {
      setCheckingDomain(true);
      setDomainCheckError(null);
      const response = await fetch(`/api/partner-portals/${portalId}/check-domain?domain=${encodeURIComponent(form.customDomain)}`, {
        cache: 'no-store',
      });
      const data = await response.json();

      if (!response.ok || !data.valid) {
        setDomainCheckError(data.error || 'Domain is not available');
      } else {
        setDomainCheckError(null);
        toast.success('Domain is available for this portal');
      }
    } catch (error) {
      setDomainCheckError('Failed to check domain availability');
    } finally {
      setCheckingDomain(false);
    }
  };

  const handleDisconnectDomain = () => {
    if (!canEdit || !portal?.customDomain) {
      return;
    }

    setConfirmDisconnectOpen(true);
  };

  const confirmDisconnectDomain = async () => {
    if (!canEdit || !portal?.customDomain) {
      return;
    }

    setConfirmDisconnectOpen(false);
    try {
      setDisconnectingDomain(true);
      const response = await fetch(`/api/partner-portals/${portalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customDomain: '',
          customDomainVerificationToken: null,
          customDomainVerifiedAt: null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect domain');
      }

      setForm((prev) => ({ ...prev, customDomain: '' }));
      toast.success('Custom domain disconnected');
      onSaved?.(data.portal);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to disconnect domain');
    } finally {
      setDisconnectingDomain(false);
    }
  };

  const normalizeLogoFile = async (file: File) => {
    const imageUrl = URL.createObjectURL(file);

    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const nextImage = new Image();
        nextImage.onload = () => resolve(nextImage);
        nextImage.onerror = () => reject(new Error('Failed to read the selected logo image'));
        nextImage.src = imageUrl;
      });

      const targetSize = 512;
      const canvas = document.createElement('canvas');
      canvas.width = targetSize;
      canvas.height = targetSize;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is not available in this browser');
      }

      const cropSize = Math.min(image.width, image.height);
      const sourceX = Math.max(0, (image.width - cropSize) / 2);
      const sourceY = Math.max(0, (image.height - cropSize) / 2);

      context.clearRect(0, 0, targetSize, targetSize);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, targetSize, targetSize);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((nextBlob) => {
          if (!nextBlob) {
            reject(new Error('Failed to normalize the logo image'));
            return;
          }

          resolve(nextBlob);
        }, 'image/png', 0.92);
      });

      const normalizedName = file.name.replace(/\.[^.]+$/, '') || 'portal-logo';
      return new File([blob], `${normalizedName}-normalized.png`, { type: 'image/png' });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  };

  const handleSave = async (nextForm?: Partial<typeof form>) => {
    if (!canEdit) {
      return;
    }

    try {
      setSaving(true);
      const payload = { ...form, ...nextForm };
      const response = await fetch(`/api/partner-portals/${portalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save branding settings');
      }

      setForm(payload);
      toast.success('Portal branding updated');
      onSaved?.(data.portal);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file || !canEdit) {
      return;
    }

    try {
      const normalizedFile = await normalizeLogoFile(file);
      const nextPreviewUrl = URL.createObjectURL(normalizedFile);

      setPendingLogoFile(normalizedFile);
      setPendingLogoPreviewUrl((previousUrl) => {
        if (previousUrl) {
          URL.revokeObjectURL(previousUrl);
        }
        return nextPreviewUrl;
      });
      toast.success('Logo preview prepared');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to prepare portal logo');
    }
  };

  const handleUploadPreparedLogo = async () => {
    if (!pendingLogoFile || !canEdit) {
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', pendingLogoFile);

      const uploadResponse = await fetch(`/api/partner-portals/${portalId}/logo`, {
        method: 'POST',
        body: formData,
      });
      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(uploadData.error || 'Failed to upload portal logo');
      }

      const nextLogoUrl = uploadData.url as string;
      setForm((prev) => ({ ...prev, logoUrl: nextLogoUrl }));
      await handleSave({ logoUrl: nextLogoUrl });
      if (pendingLogoPreviewUrl) {
        URL.revokeObjectURL(pendingLogoPreviewUrl);
      }
      setPendingLogoFile(null);
      setPendingLogoPreviewUrl(null);
      toast.success('Portal logo uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload portal logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDiscardPreparedLogo = () => {
    if (pendingLogoPreviewUrl) {
      URL.revokeObjectURL(pendingLogoPreviewUrl);
    }

    setPendingLogoFile(null);
    setPendingLogoPreviewUrl(null);
  };

  const handleClearLogo = async () => {
    setForm((prev) => ({ ...prev, logoUrl: '' }));
    await handleSave({ logoUrl: '' });
  };

  return (
    <>
    <DashboardPanel
      title="Partner Branding"
      description="Let this portal present a partner identity while still running inside your system."
      footer={canEdit ? 'These settings update the portal shell, workspace headings, preview surfaces, and optional custom-domain routing for this partner.' : 'Portal branding is controlled by portal admins or internal managers.'}
    >
      <div className={`grid gap-6 ${compact ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]'}`}>
        <div className="grid gap-4">
          <FormField
            label="Company Label"
            placeholder="Partner company name shown in the portal"
            value={form.companyLabel}
            onChange={(event) => setForm((prev) => ({ ...prev, companyLabel: event.target.value }))}
            disabled={!canEdit || saving}
          />
          <FormField
            label="Accent Color"
            placeholder="#0f766e"
            helperText="Use a 6-digit hex color. Example: #0f766e"
            value={form.accentColor}
            onChange={(event) => setForm((prev) => ({ ...prev, accentColor: event.target.value }))}
            disabled={!canEdit || saving}
          />
          <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--brand-primary-rgb),0.05)] grid gap-3">
            <span className="text-[11px] tracking-wider uppercase text-[var(--text-secondary)] font-semibold">
              Portal Logo
            </span>
            <p className="text-xs text-[var(--text-secondary)]">
              Upload a logo directly here for the portal. A public URL is optional and only needed if you prefer linking an existing image.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              {(pendingLogoPreviewUrl || form.logoUrl) ? (
                <img
                  src={pendingLogoPreviewUrl || form.logoUrl}
                  alt="Portal logo preview"
                  className="w-14 h-14 rounded-xl object-cover border border-[var(--border)] bg-white"
                />
              ) : (
                <div
                  style={{ backgroundColor: brand.accentColor }}
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-base font-extrabold"
                >
                  {brand.companyLabel.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="grid gap-1">
                <div className="text-sm font-bold text-[var(--text-primary)]">
                  {pendingLogoFile ? 'Logo ready to upload' : form.logoUrl ? 'Logo configured' : 'No logo uploaded yet'}
                </div>
                <div className="text-xs text-[var(--text-secondary)]">
                  {pendingLogoFile ? 'Review the crop preview below, then upload it.' : 'Square logos work best in the portal header and cards.'}
                </div>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {canEdit ? (
                <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={saving || uploadingLogo}>
                  {pendingLogoFile ? 'Choose Different Logo' : form.logoUrl ? 'Replace Logo' : 'Upload Logo'}
                </Button>
              ) : null}
              {canEdit && form.logoUrl ? (
                <Button variant="outline" size="sm" onClick={() => void handleClearLogo()} disabled={saving || uploadingLogo}>
                  Remove Logo
                </Button>
              ) : null}
            </div>
          </div>
          <FormField
            label="Logo URL (Optional)"
            placeholder="https://..."
            helperText="Optional fallback if you want to link an existing public image instead of uploading a file."
            value={form.logoUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
            disabled={!canEdit || saving || uploadingLogo}
          />
          <FormField
            label="Custom Domain"
            placeholder="portal.partner.com"
            value={form.customDomain}
            onChange={(event) => setForm((prev) => ({ ...prev, customDomain: event.target.value.trim().toLowerCase() }))}
            disabled={!canEdit || saving}
            error={Boolean(domainCheckError)}
            helperText={
              <div className="flex flex-col gap-1">
                <span>Hostname only. No http://, https://, ports, or paths. After saving, point this DNS record to the main app host.</span>
                {canEdit && form.customDomain && !hasUnsavedDomainChange && (
                  <span className="text-red-500 text-xs">
                    {domainCheckError || 'Domain is available'}
                  </span>
                )}
              </div>
            }
          />
          {canEdit && form.customDomain && !hasUnsavedDomainChange && (
            <div className="flex gap-2 items-center">
              <Button variant="outline" size="sm" onClick={() => void handleCheckDomain()} disabled={checkingDomain || saving}>
                {checkingDomain ? 'Checking...' : 'Check Availability'}
              </Button>
              {domainCheckError ? (
                <span className="text-xs text-red-500">{domainCheckError}</span>
              ) : null}
            </div>
          )}

          <div className="border border-[var(--border)] rounded-2xl p-4 bg-[rgba(var(--brand-primary-rgb),0.05)] grid gap-2">
            <span className="text-[11px] tracking-wider uppercase text-[var(--text-secondary)] font-semibold">
              Public Entry Preview
            </span>
            <div className="text-sm font-bold text-[var(--text-primary)]">{publicEntryPreview}</div>
            <p className="text-xs text-[var(--text-secondary)]">
              {form.customDomain
                ? `After DNS points ${form.customDomain} to ${appHost || 'this app'}, visitors land on the branded portal site at /. They can sign in there and continue into the workspace.`
                : `Without a custom domain, share /portal-site/${portalId} as the branded entry page. Signed-in members still work inside /portal/${portalId}.`}
            </p>
            <FormField
              label="Workspace Route"
              value={workspacePreview}
              readOnly
              helperText="Use this route when you want to open the actual workspace after sign-in."
            />
          </div>

          {savedCustomDomain ? (
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-slate-500/5 grid gap-2">
              <span className="text-[11px] tracking-wider uppercase text-[var(--text-secondary)] font-semibold">
                Domain Verification
              </span>
              <div className="text-sm font-bold text-[var(--text-primary)]">
                {portal?.customDomainVerifiedAt
                  ? `Verified on ${new Date(portal.customDomainVerifiedAt).toLocaleString()}`
                  : 'Verification pending'}
              </div>
              {hasUnsavedDomainChange ? (
                <p className="text-xs text-[var(--text-secondary)]">
                  Save the custom domain first to generate the correct DNS verification record.
                </p>
              ) : (
                <>
                  <div className="border border-[var(--border)] rounded-xl p-3 bg-[rgba(var(--brand-primary-rgb),0.04)] grid gap-2">
                    <span className="text-[11px] tracking-wider uppercase text-[var(--text-secondary)] font-semibold">
                      DNS Routing Setup
                    </span>
                    <p className="text-xs text-[var(--text-secondary)]">
                      For a subdomain such as {portal?.customDomain}, create a CNAME that points the hostname to {appHost || 'your main app host'}.
                    </p>
                    <FormField label="Recommended Record Type" value="CNAME" readOnly />
                    <FormField label="CNAME Target" value={appHost || ''} readOnly helperText="Some DNS providers want only the label (for example, portal). Others accept the full hostname." />
                    <p className="text-xs text-[var(--text-secondary)]">
                      If you want to use the root domain instead of a subdomain, use ALIAS, ANAME, or CNAME flattening to {appHost || 'your main app host'} when your DNS provider supports it. If your provider only supports A records at the root, use the hosting platform's documented A-record target for this app.
                    </p>
                  </div>

                  <p className="text-xs text-[var(--text-secondary)]">
                    Add this TXT record to prove that you control the domain before it starts routing traffic to the portal.
                  </p>
                  <FormField label="TXT Host" value={verificationHost || ''} readOnly />
                  <FormField label="TXT Value" value={verificationValue || ''} readOnly />
                  <p className="text-xs text-[var(--text-secondary)]">
                    Keep the DNS target pointed at {appHost || 'the main app host'} separately. Verification only proves control of the hostname.
                  </p>
                  {canEdit && !portal?.customDomainVerifiedAt ? (
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => void handleVerifyDomain()} disabled={verifyingDomain || saving}>
                        {verifyingDomain ? 'Verifying...' : 'Verify Domain'}
                      </Button>
                    </div>
                  ) : null}
                  {canEdit && portal?.customDomainVerifiedAt ? (
                    <div className="flex justify-end">
                      <Button variant="outline" size="sm" color="error" onClick={() => void handleDisconnectDomain()} disabled={disconnectingDomain || saving}>
                        {disconnectingDomain ? 'Disconnecting...' : 'Disconnect Domain'}
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          ) : null}

          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            hidden
            onChange={(event) => void handleLogoSelected(event)}
          />

          {pendingLogoPreviewUrl ? (
            <div className="border border-[var(--border)] rounded-2xl p-4 grid gap-3 bg-slate-500/5">
              <span className="text-[11px] tracking-wider uppercase text-[var(--text-secondary)] font-semibold">
                Crop Preview
              </span>
              <p className="text-xs text-[var(--text-secondary)]">
                This is the exact square crop and normalized size that will be uploaded for the portal shell.
              </p>
              <div className="w-40 h-40 rounded-2xl overflow-hidden border border-[var(--border)] bg-white">
                <img src={pendingLogoPreviewUrl} alt="Prepared portal logo preview" className="w-full h-full object-cover" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="primary" size="sm" onClick={() => void handleUploadPreparedLogo()} disabled={saving || uploadingLogo}>
                  {uploadingLogo ? 'Uploading...' : 'Upload Prepared Logo'}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDiscardPreparedLogo} disabled={uploadingLogo}>
                  Discard
                </Button>
              </div>
            </div>
          ) : null}

          {canEdit ? (
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => void handleSave()} disabled={saving || uploadingLogo || Boolean(pendingLogoFile)}>
                {saving ? 'Saving...' : 'Save Branding'}
              </Button>
            </div>
          ) : null}
        </div>

        <div
          style={{
            background: `linear-gradient(145deg, rgba(${brand.accentRgb}, 0.22), rgba(${brand.accentRgb}, 0.08) 42%, rgba(255,255,255,0.94) 100%)`,
          }}
          className="border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm"
        >
          <div className="p-6 grid gap-4">
            <div className="flex items-center gap-3">
              {brand.logoUrl ? (
                <img
                  src={pendingLogoPreviewUrl || brand.logoUrl}
                  alt={`${brand.companyLabel} logo`}
                  className="w-12 h-12 rounded-xl object-cover border border-white/50 bg-white/90"
                />
              ) : (
                <div
                  style={{ backgroundColor: brand.accentColor }}
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-extrabold"
                >
                  {brand.companyLabel.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <span className="text-[10px] tracking-widest uppercase text-[var(--text-secondary)] font-bold">
                  Branding Preview
                </span>
                <div className="text-lg font-extrabold text-[var(--text-primary)]">{brand.companyLabel}</div>
                <div className="text-xs text-[var(--text-secondary)]">{portal?.name || 'Portal Workspace'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/75 border border-[var(--border)]">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                  Partner Label
                </span>
                <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">{brand.companyLabel}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/75 border border-[var(--border)]">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-semibold">
                  Accent
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <div style={{ backgroundColor: brand.accentColor }} className="w-4 h-4 rounded-full border border-black/10" />
                  <span className="text-sm font-bold text-[var(--text-primary)]">{brand.accentColor}</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--text-secondary)]">
              The portal keeps your main system structure, but adds partner-specific identity in the header, navigation, and workspace cards.
            </p>
          </div>
        </div>
      </div>
    </DashboardPanel>

    <ConfirmDialog
      open={confirmDisconnectOpen}
      onClose={() => setConfirmDisconnectOpen(false)}
      onConfirm={() => void confirmDisconnectDomain()}
      title="Disconnect Custom Domain"
      message={`Remove the custom domain ${portal?.customDomain || ''} from this portal?`}
      confirmText="Disconnect"
      severity="warning"
    />
    </>
  );
}
