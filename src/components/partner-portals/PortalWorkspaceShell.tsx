'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Package,
  Users,
  UserCheck,
  History,
  Sliders,
  Layers,
  Wallet,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/design-system';
import { getPortalBrandIdentity } from '@/lib/partner-portal-branding';
import { normalizeRequestHost } from '@/lib/partner-portal-domains';

type PortalSummary = {
  id: string;
  name: string;
  code: string | null;
  customDomain?: string | null;
  companyLabel?: string | null;
  accentColor?: string | null;
  logoUrl?: string | null;
  isActive: boolean;
  memberships?: Array<{
    role: string;
    partnerCustomerId?: string | null;
    partnerCustomer?: {
      id: string;
      name: string;
    } | null;
  }>;
  _count?: {
    customers?: number;
    shipmentAssignments?: number;
  };
};

type PortalWorkspaceShellProps = {
  children: React.ReactNode;
};

const workspaceNav = [
  { label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" />, suffix: '' },
  { label: 'Shipments', icon: <Package className="w-4 h-4" />, suffix: '/shipments' },
  { label: 'Customers', icon: <Users className="w-4 h-4" />, suffix: '/customers' },
  { label: 'Finance', icon: <Wallet className="w-4 h-4" />, suffix: '/finance' },
  { label: 'Members', icon: <UserCheck className="w-4 h-4" />, suffix: '/members' },
  { label: 'Activity', icon: <History className="w-4 h-4" />, suffix: '/activity' },
  { label: 'Settings', icon: <Sliders className="w-4 h-4" />, suffix: '/settings' },
];

function isWorkspaceRouteActive(pathname: string, href: string) {
  if (href.endsWith('/activity')) {
    return pathname === href;
  }

  if (href.endsWith('/settings')) {
    return pathname === href;
  }

  if (href.endsWith('/members')) {
    return pathname === href;
  }

  if (href.endsWith('/customers')) {
    return pathname === href;
  }

  if (href.endsWith('/finance')) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  if (href.endsWith('/shipments')) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return pathname === href;
}

export default function PortalWorkspaceShell({ children }: PortalWorkspaceShellProps) {
  const params = useParams();
  const pathname = usePathname();
  const portalId = typeof params.portalId === 'string' ? params.portalId : null;
  const [portal, setPortal] = useState<PortalSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchPortal = async () => {
      if (!portalId) {
        setPortal(null);
        return;
      }

      try {
        const response = await fetch(`/api/partner-portals/${portalId}`, { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load portal workspace');
        }

        if (!cancelled) {
          setPortal(data.portal || null);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setPortal(null);
        }
      }
    };

    void fetchPortal();

    return () => {
      cancelled = true;
    };
  }, [portalId]);

  const usingCustomDomain = useMemo(() => {
    if (!portal?.customDomain || typeof window === 'undefined') {
      return false;
    }

    return normalizeRequestHost(window.location.host) === portal.customDomain;
  }, [portal?.customDomain]);

  const portalBaseHref = useMemo(() => {
    if (!portalId) {
      return '/portal';
    }

    return usingCustomDomain ? '' : `/portal/${portalId}`;
  }, [portalId, usingCustomDomain]);

  const navItems = useMemo(() => {
    if (!portalId) {
      return [];
    }

    const currentMembership = portal?.memberships?.[0];
    const customerScoped = Boolean(currentMembership?.partnerCustomerId);
    const financeSuffix = customerScoped && currentMembership?.partnerCustomerId
      ? `/finance/${currentMembership.partnerCustomerId}`
      : '/finance';
    const allowedSuffixes = customerScoped
      ? new Set(['/shipments', financeSuffix])
      : null;

    return workspaceNav
      .map((item) => {
        const suffix = item.suffix === '/finance' ? financeSuffix : item.suffix;
        return {
          ...item,
          suffix,
          href: `${portalBaseHref}${suffix || ''}` || '/',
        };
      })
      .filter((item) => !allowedSuffixes || allowedSuffixes.has(item.suffix));
  }, [portal?.memberships, portalBaseHref, portalId]);

  const brand = useMemo(() => getPortalBrandIdentity(portal), [portal]);
  const hasPortalWorkspace = Boolean(portalId);
  const portalAccessLabel = portal?.memberships?.[0]?.partnerCustomer?.name
    ? `${portal.memberships[0].partnerCustomer.name} Customer`
    : portal?.memberships?.[0]?.role || 'Member';

  const mobileNavRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasPortalWorkspace) {
      return;
    }

    const container = mobileNavRef.current;
    if (!container) {
      return;
    }

    const activePill = container.querySelector<HTMLElement>('[data-nav-active="true"]');
    activePill?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [pathname, hasPortalWorkspace]);

  return (
    <div
      style={{ borderTop: `4px solid ${brand.accentColor}` }}
      className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] flex flex-col"
    >
      <header
        style={{
          background: hasPortalWorkspace
            ? `linear-gradient(135deg, rgba(${brand.accentRgb}, 0.15), rgba(${brand.accentRgb}, 0.06) 46%, rgba(255,255,255,0.94) 100%)`
            : `linear-gradient(135deg, rgba(${brand.accentRgb}, 0.22), rgba(${brand.accentRgb}, 0.10) 46%, rgba(255,255,255,0.9) 100%)`,
        }}
        className={`px-4 md:px-6 xl:px-8 ${
          hasPortalWorkspace ? 'py-3 md:py-3.5' : 'py-4 md:py-6'
        } border-b border-[var(--border)] backdrop-blur-md sticky top-0 z-30`}
      >
        <div className={`flex flex-col md:flex-row items-start md:items-center justify-between ${hasPortalWorkspace ? 'gap-3' : 'gap-4'}`}>
          <div className={`grid ${hasPortalWorkspace ? 'gap-1' : 'gap-1.5'}`}>
            <span className="text-[0.75rem] tracking-[0.18em] uppercase text-[var(--text-secondary)] font-medium">
              {portalId ? 'Partner Workspace' : 'Partner Portal'}
            </span>
            <div className="flex items-center gap-3 flex-wrap">
              {portalId ? (
                brand.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={brand.logoUrl}
                    alt={`${brand.companyLabel} logo`}
                    className={`${hasPortalWorkspace ? 'w-9 h-9' : 'w-11 h-11'} rounded-lg object-cover bg-white/85 border border-white/50`}
                  />
                ) : (
                  <div
                    style={{ backgroundColor: brand.accentColor }}
                    className={`${
                      hasPortalWorkspace ? 'w-9 h-9 text-[0.9rem]' : 'w-11 h-11 text-[1rem]'
                    } rounded-lg grid place-items-center text-white font-extrabold`}
                  >
                    {brand.companyLabel.slice(0, 1).toUpperCase()}
                  </div>
                )
              ) : null}
              <div>
                <h1 className={`${hasPortalWorkspace ? 'text-base md:text-xl' : 'text-lg md:text-2xl'} font-extrabold tracking-tight leading-tight m-0 text-[var(--text-primary)]`}>
                  {portalId ? brand.companyLabel : 'Shared Customer Portal'}
                </h1>
                {portalId ? (
                  <span className={`${hasPortalWorkspace ? 'text-[0.78rem]' : 'text-[0.82rem]'} text-[var(--text-secondary)]`}>
                    {portal?.name || 'Portal Workspace'}
                  </span>
                ) : null}
              </div>
            </div>
            {hasPortalWorkspace ? (
              <p className="text-[var(--text-secondary)] text-[0.82rem] max-w-3xl m-0">
                Access: {portalAccessLabel}
              </p>
            ) : (
              <p className="text-[var(--text-secondary)] text-sm max-w-3xl m-0">
                Open a portal workspace to manage assigned shipments, customer handoffs, team members, and partner activity.
              </p>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Link href="/portal" className="no-underline">
              <Button
                variant={pathname === '/portal' ? 'primary' : 'outline'}
                size="sm"
                icon={<ArrowLeft className="w-4 h-4" />}
              >
                My Portals
              </Button>
            </Link>
            {portalId ? (
              <Link href={`${portalBaseHref}/shipments` || '/'} className="no-underline">
                <Button variant="outline" size="sm">Open Shipments</Button>
              </Link>
            ) : null}
          </div>
        </div>

        {portalId ? (
          <div
            ref={mobileNavRef}
            className="mt-3 flex lg:hidden overflow-x-auto gap-2 pb-1 pr-2 no-scrollbar"
            style={{ scrollbarWidth: 'none' }}
          >
            {navItems.map((item) => {
              const active = isWorkspaceRouteActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className="no-underline" aria-current={active ? 'page' : undefined}>
                  <div
                    data-nav-active={active ? 'true' : undefined}
                    style={{
                      borderColor: active ? brand.accentColor : 'var(--border)',
                      backgroundColor: active ? `rgba(${brand.accentRgb}, 0.10)` : 'var(--panel)',
                      color: active ? brand.accentColor : 'var(--text-primary)',
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-full whitespace-nowrap shrink-0 border text-[0.85rem] font-semibold"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : null}
      </header>

      <div className="flex flex-1 min-h-0">
        {portalId ? (
          <aside className="w-72 border-r border-[var(--border)] p-4 hidden lg:block bg-[var(--panel)] backdrop-blur-md shrink-0">
            <div className="border border-[var(--border)] rounded-2xl p-4 bg-[var(--panel)] shadow-sm grid gap-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.82rem] tracking-[0.14em] uppercase text-[var(--text-secondary)] font-semibold">
                  Workspace
                </span>
              </div>
              <div>
                <div className="text-[1.1rem] font-extrabold text-[var(--text-primary)]">{brand.companyLabel}</div>
                <div className="text-[0.85rem] text-[var(--text-secondary)]">
                  {portal?.name || 'Partner-facing view of your shared operations'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div
                  style={{ backgroundColor: `rgba(${brand.accentRgb}, 0.08)` }}
                  className="p-2.5 rounded-lg"
                >
                  <span className="text-[0.7rem] uppercase tracking-[0.12em] text-[var(--text-secondary)] font-medium">
                    Shipments
                  </span>
                  <div className="text-[1.1rem] font-bold text-[var(--text-primary)]">{portal?._count?.shipmentAssignments || 0}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[rgba(var(--accent-rgb),0.10)]">
                  <span className="text-[0.7rem] uppercase tracking-[0.12em] text-[var(--text-secondary)] font-medium">
                    Customers
                  </span>
                  <div className="text-[1.1rem] font-bold text-[var(--text-primary)]">{portal?._count?.customers || 0}</div>
                </div>
                <div
                  style={{ backgroundColor: `rgba(${brand.accentRgb}, 0.08)` }}
                  className="p-2.5 rounded-lg col-span-2"
                >
                  <span className="text-[0.7rem] uppercase tracking-[0.12em] text-[var(--text-secondary)] font-medium">
                    Access
                  </span>
                  <div className="text-[0.85rem] font-bold text-[var(--text-primary)] break-words">{portalAccessLabel}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[rgba(var(--text-primary-rgb),0.04)]">
                <Layers className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                <span className="text-[0.85rem] text-[var(--text-secondary)]">
                  Finance access: <strong className="text-[var(--text-primary)]">Read-only</strong>
                </span>
              </div>
            </div>

            <nav aria-label="Portal workspace" className="grid gap-2 mt-4">
              {navItems.map((item) => {
                const active = isWorkspaceRouteActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} className="no-underline" aria-current={active ? 'page' : undefined}>
                    <div
                      style={{
                        borderColor: active ? brand.accentColor : 'var(--border)',
                        backgroundColor: active ? `rgba(${brand.accentRgb}, 0.10)` : 'transparent',
                        color: active ? brand.accentColor : 'var(--text-primary)',
                      }}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-[0.92rem] font-semibold transition-all hover:bg-[rgba(var(--brand-primary-rgb),0.06)]"
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : null}

        <main className="flex-1 min-w-0 pb-8 lg:pb-12">
          {children}
        </main>
      </div>
    </div>
  );
}
