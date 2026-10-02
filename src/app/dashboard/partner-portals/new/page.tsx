'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Building2, Palette, User, FileText, Search } from 'lucide-react';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { PageHeader, Button, FormField, toast } from '@/components/design-system';
import { hasPermission } from '@/lib/rbac';

type UserOption = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type PortalForm = {
  name: string;
  code: string;
  companyLabel: string;
  customDomain: string;
  accentColor: string;
  logoUrl: string;
  notes: string;
};

const steps = [
  { label: 'Portal Details', icon: Building2 },
  { label: 'Branding', icon: Palette },
  { label: 'Owner', icon: User },
  { label: 'Review', icon: FileText }
];

const initialForm: PortalForm = {
  name: '',
  code: '',
  companyLabel: '',
  customDomain: '',
  accentColor: '#D4AF37',
  logoUrl: '',
  notes: '',
};

function trimOrUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

export default function NewPartnerPortalPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<PortalForm>(initialForm);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<UserOption | null>(null);
  const [saving, setSaving] = useState(false);

  const canAccess = hasPermission(session?.user?.role, 'customers:manage') || hasPermission(session?.user?.role, 'users:manage');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session || !canAccess) {
      router.replace('/dashboard');
    }
  }, [canAccess, router, session, status]);

  useEffect(() => {
    if (!canAccess) return;

    const controller = new AbortController();
    const fetchUsers = async () => {
      try {
        const query = new URLSearchParams({ page: '1', pageSize: '20' });
        if (userSearch.trim()) query.set('query', userSearch.trim());
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
  }, [canAccess, userSearch]);

  const selectedOwnerLabel = useMemo(() => {
    if (!selectedOwner) return 'Not selected';
    return selectedOwner.name ? `${selectedOwner.name} (${selectedOwner.email})` : selectedOwner.email;
  }, [selectedOwner]);

  const updateForm = (field: keyof PortalForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateStep = (step: number) => {
    if (step === 0) {
      if (!form.name.trim()) {
        toast.error('Portal name is required');
        return false;
      }
      if (form.code.trim() && form.code.trim().length < 2) {
        toast.error('Portal code must be at least 2 characters');
        return false;
      }
    }

    if (step === 1) {
      if (form.accentColor && !/^#([0-9a-fA-F]{6})$/.test(form.accentColor)) {
        toast.error('Accent color must be a 6-digit hex color');
        return false;
      }
    }

    if (step === 2 && !selectedOwner) {
      toast.error('Portal owner is required');
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateStep(activeStep)) return;
    setActiveStep((current) => Math.min(current + 1, steps.length - 1));
  };

  const handleBack = () => {
    setActiveStep((current) => Math.max(current - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(0) || !validateStep(1) || !validateStep(2) || !selectedOwner) return;

    try {
      setSaving(true);
      const response = await fetch('/api/partner-portals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          code: trimOrUndefined(form.code),
          companyLabel: trimOrUndefined(form.companyLabel),
          customDomain: trimOrUndefined(form.customDomain),
          accentColor: trimOrUndefined(form.accentColor),
          logoUrl: trimOrUndefined(form.logoUrl),
          notes: trimOrUndefined(form.notes),
          ownerUserId: selectedOwner.id,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal');
      }

      toast.success('Partner portal created');
      router.push(`/dashboard/partner-portals/${data.portal.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create portal');
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    if (activeStep === 0) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Portal Name *"
            value={form.name}
            onChange={(e) => updateForm('name', e.target.value)}
            placeholder="e.g. Gulf Partner Workspace"
            required
          />
          <FormField
            label="Portal Code"
            value={form.code}
            onChange={(e) => updateForm('code', e.target.value)}
            placeholder="e.g. gulf-partner"
            hint="Optional unique short code for internal reference"
          />
          <FormField
            label="Company Label"
            value={form.companyLabel}
            onChange={(e) => updateForm('companyLabel', e.target.value)}
            placeholder="Name shown in the partner workspace"
          />
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => updateForm('notes', e.target.value)}
              placeholder="Internal notes about this partner portal..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] focus:border-transparent transition-all"
            />
          </div>
        </div>
      );
    }

    if (activeStep === 1) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            label="Custom Domain"
            value={form.customDomain}
            onChange={(e) => updateForm('customDomain', e.target.value)}
            placeholder="portal.partner.com"
            hint="Optional hostname without http:// or paths"
          />
          <FormField
            label="Logo URL"
            value={form.logoUrl}
            onChange={(e) => updateForm('logoUrl', e.target.value)}
            placeholder="https://example.com/logo.png"
          />
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1.5">
              Accent Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.accentColor}
                onChange={(e) => updateForm('accentColor', e.target.value)}
                className="w-12 h-10 rounded border border-[var(--border)] bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={form.accentColor}
                onChange={(e) => updateForm('accentColor', e.target.value)}
                placeholder="#D4AF37"
                className="flex-1 px-3.5 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)] font-mono"
              />
            </div>
            <span className="text-xs text-[var(--text-secondary)] mt-1 block">Used for the partner workspace theme</span>
          </div>
          <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--panel-secondary,var(--panel))] flex flex-col justify-between">
            <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase">Preview</span>
            <div
              className="h-10 rounded-lg my-2 shadow-inner transition-colors duration-300"
              style={{ backgroundColor: form.accentColor || '#D4AF37' }}
            />
            <div className="font-bold text-sm text-[var(--text-primary)]">
              {form.companyLabel || form.name || 'Partner Portal Preview'}
            </div>
          </div>
        </div>
      );
    }

    if (activeStep === 2) {
      return (
        <div className="space-y-4">
          <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
            Portal Owner *
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search users by name or email..."
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-gold)]"
            />
          </div>

          <div className="border border-[var(--border)] rounded-xl max-h-60 overflow-y-auto divide-y divide-[var(--border)] bg-[var(--background)]">
            {users.length === 0 ? (
              <div className="p-4 text-center text-sm text-[var(--text-secondary)]">No users found</div>
            ) : (
              users.map((user) => {
                const isSelected = selectedOwner?.id === user.id;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedOwner(user)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[rgba(var(--accent-gold-rgb),0.06)] transition-colors ${
                      isSelected ? 'bg-[rgba(var(--accent-gold-rgb),0.12)] font-semibold' : ''
                    }`}
                  >
                    <div>
                      <div className="text-sm text-[var(--text-primary)]">{user.name || 'Unnamed User'}</div>
                      <div className="text-xs text-[var(--text-secondary)] font-mono">{user.email} &bull; {user.role}</div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
          {selectedOwner && (
            <div className="p-3 bg-[rgba(var(--accent-gold-rgb),0.08)] border border-[rgba(var(--accent-gold-rgb),0.2)] rounded-lg text-xs text-[var(--text-primary)]">
              Selected Owner: <span className="font-bold text-[var(--accent-gold)]">{selectedOwnerLabel}</span>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          ['Portal Name', form.name || 'Not provided'],
          ['Portal Code', form.code || 'Not provided'],
          ['Company Label', form.companyLabel || form.name || 'Not provided'],
          ['Custom Domain', form.customDomain || 'Not provided'],
          ['Logo URL', form.logoUrl || 'Not provided'],
          ['Accent Color', form.accentColor || 'Not provided'],
          ['Owner', selectedOwnerLabel],
          ['Notes', form.notes || 'Not provided'],
        ].map(([label, value]) => (
          <div key={label} className="border-b border-[var(--border)] pb-2">
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{label}</span>
            <div className="font-medium text-sm text-[var(--text-primary)] mt-0.5 break-words">{value}</div>
          </div>
        ))}
      </div>
    );
  };

  if (status === 'loading' || !session || !canAccess) {
    return null;
  }

  return (
    <DashboardSurface>
      <PageHeader
        title="Create Partner Portal"
        description="Set up the workspace details, branding, owner, and review before creation"
        showBreadcrumbs
        actions={
          <Link href="/dashboard/partner-portals" style={{ textDecoration: 'none' }}>
            <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
          </Link>
        }
      />

      <DashboardPanel>
        <div className="space-y-6">
          {/* Custom Stepper */}
          <div className="grid grid-cols-4 gap-2 border-b border-[var(--border)] pb-4">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeStep === idx;
              const isPast = activeStep > idx;
              return (
                <button
                  key={step.label}
                  type="button"
                  onClick={() => {
                    if (idx < activeStep) setActiveStep(idx);
                  }}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[rgba(var(--accent-gold-rgb),0.12)] text-[var(--accent-gold)] border border-[rgba(var(--accent-gold-rgb),0.3)]'
                      : isPast
                      ? 'text-[var(--text-primary)] hover:bg-[var(--panel-secondary,rgba(255,255,255,0.03))]'
                      : 'text-[var(--text-secondary)] opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 ${
                    isPast ? 'bg-[var(--success)] text-white' : isActive ? 'bg-[var(--accent-gold)] text-black' : 'bg-[var(--border)] text-[var(--text-secondary)]'
                  }`}>
                    {isPast ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span className="truncate hidden md:inline">{step.label}</span>
                </button>
              );
            })}
          </div>

          <div className="min-h-[220px]">{renderStep()}</div>

          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[var(--border)]">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={activeStep === 0 || saving}
              icon={<ChevronLeft className="w-4 h-4" />}
            >
              Back
            </Button>
            {activeStep === steps.length - 1 ? (
              <Button
                variant="primary"
                onClick={() => void handleSubmit()}
                disabled={saving}
                icon={<Check className="w-4 h-4" />}
              >
                {saving ? 'Creating...' : 'Create Portal'}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleNext}
                disabled={saving}
                icon={<ChevronRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            )}
          </div>
        </div>
      </DashboardPanel>
    </DashboardSurface>
  );
}
