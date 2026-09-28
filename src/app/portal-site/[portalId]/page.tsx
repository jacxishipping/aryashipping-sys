import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import ArrowForwardOutlinedIcon from '@mui/icons-material/ArrowForwardOutlined';
import { Box, Typography } from '@mui/material';
import { Button } from '@/components/design-system';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { getPortalBrandIdentity } from '@/lib/partner-portal-branding';
import { isSystemHost, normalizeRequestHost } from '@/lib/partner-portal-domains';

export default async function PortalPublicLandingPage(
  { params }: { params: Promise<{ portalId: string }> },
) {
  const { portalId } = await params;
  const portal = await prisma.partnerPortal.findUnique({
    where: { id: portalId },
    select: {
      id: true,
      name: true,
      code: true,
      companyLabel: true,
      accentColor: true,
      logoUrl: true,
      customDomain: true,
      customDomainVerifiedAt: true,
      isActive: true,
    },
  });

  if (!portal) {
    notFound();
  }

  const session = await auth();
  const requestHeaders = await headers();
  const requestHost = normalizeRequestHost(
    requestHeaders.get('x-forwarded-host')
      || requestHeaders.get('host')
      || '',
  );
  const usingCustomDomain = Boolean(
    requestHost
      && portal.customDomain
      && portal.customDomainVerifiedAt
      && !isSystemHost(requestHost)
      && requestHost === portal.customDomain,
  );

  const brand = getPortalBrandIdentity(portal);
  const workspaceHref = usingCustomDomain ? '/' : `/portal/${portal.id}`;
  const publicHref = usingCustomDomain ? '/' : `/portal-site/${portal.id}`;
  const customerLoginHref = `/auth/simple-login?portalId=${encodeURIComponent(portal.id)}&callbackUrl=${encodeURIComponent(workspaceHref)}`;
  const staffLoginHref = `/auth/signin?portalId=${encodeURIComponent(portal.id)}&callbackUrl=${encodeURIComponent(workspaceHref)}`;
  const activeFeatures = [
    {
      title: 'Shipment Visibility',
      description: 'Track assigned vehicles, milestones, and attached public documents in one branded workspace.',
      icon: <Inventory2OutlinedIcon sx={{ fontSize: 22 }} />,
    },
    {
      title: 'Portal Finance',
      description: 'Review invoices, unbilled amounts, and portal-only customer balances without touching the main finance ledger.',
      icon: <AccountBalanceWalletOutlinedIcon sx={{ fontSize: 22 }} />,
    },
    {
      title: 'Private Access',
      description: 'Customers and portal staff sign in with their own access path while data stays scoped to the right account.',
      icon: <ShieldOutlinedIcon sx={{ fontSize: 22 }} />,
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        color: 'var(--text-primary)',
        background: `radial-gradient(circle at top left, rgba(${brand.accentRgb},0.28), transparent 28%), radial-gradient(circle at 85% 18%, rgba(${brand.accentRgb},0.16), transparent 24%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 48%, #ffffff 100%)`,
      }}
    >
      <Box sx={{ maxWidth: 1240, mx: 'auto', px: { xs: 2, sm: 3, lg: 5 }, py: { xs: 3, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: { xs: 4, md: 6 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.4 }}>
            {brand.logoUrl ? (
              <Box component="img" src={brand.logoUrl} alt={`${brand.companyLabel} logo`} sx={{ width: 54, height: 54, borderRadius: 3, objectFit: 'cover', bgcolor: 'rgba(255,255,255,0.96)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 14px 28px rgba(15,23,42,0.08)' }} />
            ) : (
              <Box sx={{ width: 54, height: 54, borderRadius: 3, display: 'grid', placeItems: 'center', fontWeight: 800, color: '#fff', background: brand.accentColor, boxShadow: `0 18px 30px rgba(${brand.accentRgb},0.28)` }}>
                {brand.companyLabel.slice(0, 1).toUpperCase()}
              </Box>
            )}
            <Box>
              <Typography sx={{ fontSize: '0.76rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
                Portal Website
              </Typography>
              <Typography sx={{ fontSize: { xs: '1rem', md: '1.12rem' }, fontWeight: 800 }}>
                {brand.companyLabel}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {session?.user ? (
              <Link href={workspaceHref} style={{ textDecoration: 'none' }}>
                <Button variant="primary" size="sm">
                  Open Portal
                  <ArrowForwardOutlinedIcon sx={{ fontSize: 16 }} />
                </Button>
              </Link>
            ) : (
              <>
                <Link href={customerLoginHref} style={{ textDecoration: 'none' }}>
                  <Button variant="primary" size="sm">
                    Customer Login
                    <VpnKeyOutlinedIcon sx={{ fontSize: 16 }} />
                  </Button>
                </Link>
                <Link href={staffLoginHref} style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm">
                    Staff Sign In
                    <LoginOutlinedIcon sx={{ fontSize: 16 }} />
                  </Button>
                </Link>
              </>
            )}
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gap: 3.5, gridTemplateColumns: { xs: '1fr', xl: '1.15fr 0.85fr' }, alignItems: 'stretch' }}>
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,0.68)',
              background: 'linear-gradient(145deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))',
              boxShadow: '0 28px 80px rgba(15,23,42,0.12)',
              p: { xs: 3, md: 5 },
            }}
          >
            <Box sx={{ position: 'absolute', inset: 'auto -8% -30% auto', width: 280, height: 280, borderRadius: '50%', background: `radial-gradient(circle, rgba(${brand.accentRgb},0.30), rgba(${brand.accentRgb},0.02) 65%, transparent 72%)` }} />
            <Box sx={{ position: 'relative', display: 'grid', gap: 2.25 }}>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Box sx={{ px: 1.4, py: 0.7, borderRadius: 999, bgcolor: `rgba(${brand.accentRgb},0.12)`, color: brand.accentColor, fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Branded Customer Portal
                </Box>
                <Box sx={{ px: 1.4, py: 0.7, borderRadius: 999, bgcolor: portal.isActive ? 'rgba(34,197,94,0.14)' : 'rgba(245,158,11,0.16)', color: portal.isActive ? '#166534' : '#92400e', fontSize: '0.76rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {portal.isActive ? 'Portal Active' : 'Portal Preview'}
                </Box>
              </Box>

              <Typography sx={{ fontSize: { xs: '2.4rem', md: '4.1rem' }, lineHeight: 0.94, fontWeight: 900, letterSpacing: '-0.06em', maxWidth: 760 }}>
                {brand.companyLabel} customer access, shipment updates, and portal-only finance in one place.
              </Typography>

              <Typography sx={{ fontSize: { xs: '1rem', md: '1.12rem' }, color: 'var(--text-secondary)', maxWidth: 720, lineHeight: 1.75 }}>
                This portal gives your downstream customers and internal portal staff a dedicated entry point with branded access, shipment visibility, invoice history, and customer-scoped finance records.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap', pt: 1 }}>
                {session?.user ? (
                  <Link href={workspaceHref} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" size="lg">
                      Continue To Portal
                      <ArrowForwardOutlinedIcon sx={{ fontSize: 18 }} />
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href={customerLoginHref} style={{ textDecoration: 'none' }}>
                      <Button variant="primary" size="lg">
                        Login With Code
                        <VpnKeyOutlinedIcon sx={{ fontSize: 18 }} />
                      </Button>
                    </Link>
                    <Link href={staffLoginHref} style={{ textDecoration: 'none' }}>
                      <Button variant="outline" size="lg">
                        Portal Staff Sign In
                        <LoginOutlinedIcon sx={{ fontSize: 18 }} />
                      </Button>
                    </Link>
                  </>
                )}
              </Box>

              <Box sx={{ display: 'grid', gap: 1.2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, minmax(0, 1fr))' }, pt: 2 }}>
                {activeFeatures.map((feature) => (
                  <Box key={feature.title} sx={{ borderRadius: 3.5, border: '1px solid rgba(15,23,42,0.08)', bgcolor: 'rgba(255,255,255,0.72)', p: 2.1, display: 'grid', gap: 1 }}>
                    <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: `rgba(${brand.accentRgb},0.12)`, color: brand.accentColor }}>
                      {feature.icon}
                    </Box>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 800 }}>{feature.title}</Typography>
                    <Typography sx={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{feature.description}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'grid', gap: 2.5 }}>
            <Box sx={{ borderRadius: 5, background: '#0f172a', color: '#e2e8f0', p: { xs: 3, md: 4 }, boxShadow: '0 24px 60px rgba(15,23,42,0.24)', display: 'grid', gap: 2 }}>
              <Typography sx={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'rgba(226,232,240,0.68)' }}>
                Access Flow
              </Typography>
              <Typography sx={{ fontSize: '1.55rem', fontWeight: 800, lineHeight: 1.15 }}>
                A portal entry page that feels like a standalone site.
              </Typography>
              <Box sx={{ display: 'grid', gap: 1.15 }}>
                {[
                  'Customers sign in with an 8-character login code and land inside their own scoped workspace.',
                  'Portal staff can use their existing staff sign-in path with the same branded destination.',
                  'Custom domains open this public page first, then route into the private workspace after login.',
                ].map((item) => (
                  <Box key={item} sx={{ display: 'flex', gap: 1.1, alignItems: 'flex-start' }}>
                    <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: brand.accentColor, mt: 0.75, flexShrink: 0 }} />
                    <Typography sx={{ color: 'rgba(226,232,240,0.88)', lineHeight: 1.7 }}>{item}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>

            <Box sx={{ borderRadius: 5, border: '1px solid rgba(15,23,42,0.08)', background: 'rgba(255,255,255,0.82)', backdropFilter: 'blur(14px)', p: { xs: 3, md: 4 }, display: 'grid', gap: 1.5 }}>
              <Typography sx={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-secondary)' }}>
                Portal Address
              </Typography>
              <Typography sx={{ fontSize: '1.18rem', fontWeight: 800 }}>
                {usingCustomDomain ? requestHost : portal.customDomain || publicHref}
              </Typography>
              <Typography sx={{ color: 'var(--text-secondary)', lineHeight: 1.75 }}>
                {portal.customDomainVerifiedAt
                  ? 'This portal already has a verified public hostname and can be shared as a standalone partner website.'
                  : 'This preview path is available now, and a verified custom domain will point here automatically once DNS is live.'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Link href={publicHref} style={{ textDecoration: 'none' }}>
                  <Button variant="outline" size="sm">
                    Open Public Page
                    <OpenInNewOutlinedIcon sx={{ fontSize: 16 }} />
                  </Button>
                </Link>
                {!session?.user ? (
                  <Link href={customerLoginHref} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" size="sm">Start Login</Button>
                  </Link>
                ) : null}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}