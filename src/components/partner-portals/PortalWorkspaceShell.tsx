'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, usePathname } from 'next/navigation';
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import { Box, Typography } from '@mui/material';
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
  { label: 'Overview', icon: <SpaceDashboardOutlinedIcon fontSize="small" />, suffix: '' },
  { label: 'Shipments', icon: <Inventory2OutlinedIcon fontSize="small" />, suffix: '/shipments' },
  { label: 'Customers', icon: <PeopleAltOutlinedIcon fontSize="small" />, suffix: '/customers' },
  { label: 'Finance', icon: <AccountBalanceWalletOutlinedIcon fontSize="small" />, suffix: '/finance' },
  { label: 'Members', icon: <GroupOutlinedIcon fontSize="small" />, suffix: '/members' },
  { label: 'Activity', icon: <HistoryOutlinedIcon fontSize="small" />, suffix: '/activity' },
  { label: 'Settings', icon: <TuneOutlinedIcon fontSize="small" />, suffix: '/settings' },
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
        // Fetch only this portal so branding renders in one round trip
        // instead of loading the full portal list and filtering client-side.
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

  // Keep the active nav pill visible on mobile by scrolling it into view
  // whenever the route changes.
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
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'var(--background)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        borderTop: `4px solid ${brand.accentColor}`,
      }}
    >
      <Box
        sx={{
          px: { xs: 2, md: 3, xl: 4 },
          py: hasPortalWorkspace ? { xs: 1.25, md: 1.5 } : { xs: 2, md: 2.5 },
          borderBottom: '1px solid var(--border)',
          background: hasPortalWorkspace
            ? `linear-gradient(135deg, rgba(${brand.accentRgb}, 0.15), rgba(${brand.accentRgb}, 0.06) 46%, rgba(255,255,255,0.94) 100%)`
            : `linear-gradient(135deg, rgba(${brand.accentRgb}, 0.22), rgba(${brand.accentRgb}, 0.10) 46%, rgba(255,255,255,0.9) 100%)`,
          backdropFilter: 'blur(18px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: { xs: 'flex-start', md: 'center' },
            justifyContent: 'space-between',
            gap: hasPortalWorkspace ? 1.5 : 2,
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          <Box sx={{ display: 'grid', gap: hasPortalWorkspace ? 0.35 : 0.5 }}>
            <Typography sx={{ fontSize: '0.75rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              {portalId ? 'Partner Workspace' : 'Partner Portal'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
              {portalId ? (
                brand.logoUrl ? (
                  <Box component="img" src={brand.logoUrl} alt={`${brand.companyLabel} logo`} sx={{ width: hasPortalWorkspace ? 36 : 44, height: hasPortalWorkspace ? 36 : 44, borderRadius: 2, objectFit: 'cover', bgcolor: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.5)' }} />
                ) : (
                  <Box sx={{ width: hasPortalWorkspace ? 36 : 44, height: hasPortalWorkspace ? 36 : 44, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: brand.accentColor, color: '#fff', fontWeight: 800, fontSize: hasPortalWorkspace ? '0.9rem' : '1rem' }}>
                    {brand.companyLabel.slice(0, 1).toUpperCase()}
                  </Box>
                )
              ) : null}
              <Box>
                <Typography sx={{ fontSize: hasPortalWorkspace ? { xs: '1rem', md: '1.2rem' } : { xs: '1.15rem', md: '1.5rem' }, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {portalId ? brand.companyLabel : 'Shared Customer Portal'}
                </Typography>
                {portalId ? (
                  <Typography sx={{ fontSize: hasPortalWorkspace ? '0.78rem' : '0.82rem', color: 'var(--text-secondary)' }}>
                    {portal?.name || 'Portal Workspace'}
                  </Typography>
                ) : null}
              </Box>
            </Box>
            {hasPortalWorkspace ? (
              <Typography sx={{ color: 'var(--text-secondary)', fontSize: '0.82rem', maxWidth: 780 }}>
                Access: {portalAccessLabel}
              </Typography>
            ) : (
              <Typography sx={{ color: 'var(--text-secondary)', maxWidth: 780 }}>
                Open a portal workspace to manage assigned shipments, customer handoffs, team members, and partner activity.
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Link href="/portal" style={{ textDecoration: 'none' }}>
              <Button variant={pathname === '/portal' ? 'primary' : 'outline'} size="sm">
                <ArrowBackOutlinedIcon sx={{ fontSize: 16 }} />
                My Portals
              </Button>
            </Link>
            {portalId ? (
              <Link href={`${portalBaseHref}/shipments` || '/'} style={{ textDecoration: 'none' }}>
                <Button variant="outline" size="sm">Open Shipments</Button>
              </Link>
            ) : null}
          </Box>
        </Box>

        {portalId ? (
          <Box
            ref={mobileNavRef}
            sx={{
              mt: 1.25,
              display: { xs: 'flex', lg: 'none' },
              overflowX: 'auto',
              gap: 1,
              pb: 0.25,
              pr: 0.5,
              '&::-webkit-scrollbar': {
                display: 'none',
              },
              scrollbarWidth: 'none',
            }}
          >
            {navItems.map((item) => {
              const active = isWorkspaceRouteActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} aria-current={active ? 'page' : undefined}>
                  <Box
                    data-nav-active={active ? 'true' : undefined}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.35,
                      py: 0.95,
                      borderRadius: 999,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      border: '1px solid',
                      borderColor: active ? brand.accentColor : 'var(--border)',
                      bgcolor: active ? `rgba(${brand.accentRgb}, 0.10)` : 'var(--panel)',
                      color: active ? brand.accentColor : 'var(--text-primary)',
                    }}
                  >
                    {item.icon}
                    <Typography sx={{ fontSize: '0.85rem', fontWeight: 600 }}>{item.label}</Typography>
                  </Box>
                </Link>
              );
            })}
          </Box>
        ) : null}
      </Box>

      <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {portalId ? (
          <Box
            component="aside"
            sx={{
              width: 280,
              borderRight: '1px solid var(--border)',
              px: 2,
              py: 2,
              display: { xs: 'none', lg: 'block' },
              bgcolor: 'var(--panel)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <Box
              sx={{
                border: '1px solid var(--border)',
                borderRadius: 3,
                p: 2,
                bgcolor: 'var(--panel)',
                boxShadow: '0 18px 40px rgba(var(--text-primary-rgb),0.08)',
                display: 'grid',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                <Typography sx={{ fontSize: '0.82rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                  Workspace
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '1.1rem', fontWeight: 800 }}>{brand.companyLabel}</Typography>
                <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  {portal?.name || 'Partner-facing view of your shared operations'}
                </Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1 }}>
                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: `rgba(${brand.accentRgb}, 0.08)` }}>
                  <Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                    Shipments
                  </Typography>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 700 }}>{portal?._count?.shipmentAssignments || 0}</Typography>
                </Box>
                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: 'rgba(var(--accent-rgb),0.10)' }}>
                  <Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                    Customers
                  </Typography>
                  <Typography sx={{ fontSize: '1.1rem', fontWeight: 700 }}>{portal?._count?.customers || 0}</Typography>
                </Box>
                <Box sx={{ p: 1.25, borderRadius: 2, bgcolor: `rgba(${brand.accentRgb}, 0.08)` }}>
                  <Typography sx={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--text-secondary)' }}>
                    Access
                  </Typography>
                  <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, overflowWrap: 'anywhere' }}>{portalAccessLabel}</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1.25, borderRadius: 2, bgcolor: 'rgba(var(--text-primary-rgb),0.04)' }}>
                <LayersOutlinedIcon sx={{ fontSize: 18, color: 'var(--text-secondary)' }} />
                <Typography sx={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Finance access: <strong style={{ color: 'var(--text-primary)' }}>Read-only</strong>
                </Typography>
              </Box>
            </Box>

            <Box component="nav" aria-label="Portal workspace" sx={{ display: 'grid', gap: 1, mt: 2 }}>
              {navItems.map((item) => {
                const active = isWorkspaceRouteActive(pathname, item.href);
                return (
                  <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} aria-current={active ? 'page' : undefined}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        px: 1.5,
                        py: 1.35,
                        borderRadius: 2.5,
                        border: '1px solid',
                        borderColor: active ? brand.accentColor : 'var(--border)',
                        bgcolor: active ? `rgba(${brand.accentRgb}, 0.10)` : 'transparent',
                        color: active ? brand.accentColor : 'var(--text-primary)',
                        transition: 'all 0.18s ease',
                        '&:hover': {
                          borderColor: brand.accentColor,
                          bgcolor: `rgba(${brand.accentRgb}, 0.08)`,
                        },
                      }}
                    >
                      {item.icon}
                      <Typography sx={{ fontSize: '0.92rem', fontWeight: 600 }}>{item.label}</Typography>
                    </Box>
                  </Link>
                );
              })}
            </Box>
          </Box>
        ) : null}

        <Box component="main" sx={{ flex: 1, minWidth: 0, pb: { xs: 4, lg: 5 } }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
