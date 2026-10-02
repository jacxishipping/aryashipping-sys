import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { ExternalLink, Key, LogIn, Package, Wallet, Shield, ArrowRight } from 'lucide-react';
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
      icon: <Package className="w-5 h-5" />,
    },
    {
      title: 'Portal Finance',
      description: 'Review invoices, unbilled amounts, and portal-only customer balances without touching the main finance ledger.',
      icon: <Wallet className="w-5 h-5" />,
    },
    {
      title: 'Private Access',
      description: 'Customers and portal staff sign in with their own access path while data stays scoped to the right account.',
      icon: <Shield className="w-5 h-5" />,
    },
  ];

  return (
    <div
      className="min-h-screen text-[var(--text-primary)]"
      style={{
        background: `radial-gradient(circle at top left, rgba(${brand.accentRgb},0.28), transparent 28%), radial-gradient(circle at 85% 18%, rgba(${brand.accentRgb},0.16), transparent 24%), linear-gradient(180deg, #f8fafc 0%, #eef2f7 48%, #ffffff 100%)`,
      }}
    >
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-10 py-6 md:py-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8 md:mb-12">
          <div className="flex items-center gap-3.5">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt={`${brand.companyLabel} logo`} className="w-[54px] h-[54px] rounded-2xl object-cover bg-white/95 border border-slate-900/10 shadow-lg" />
            ) : (
              <div
                className="w-[54px] h-[54px] rounded-2xl grid place-items-center font-bold text-white shadow-lg"
                style={{ background: brand.accentColor, boxShadow: `0 18px 30px rgba(${brand.accentRgb},0.28)` }}
              >
                {brand.companyLabel.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
                Portal Website
              </p>
              <h2 className="text-base md:text-lg font-bold text-[var(--text-primary)]">
                {brand.companyLabel}
              </h2>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {session?.user ? (
              <Link href={workspaceHref}>
                <Button variant="primary" size="sm" icon={<ArrowRight className="w-4 h-4" />} iconPosition="end">
                  Open Portal
                </Button>
              </Link>
            ) : (
              <>
                <Link href={customerLoginHref}>
                  <Button variant="primary" size="sm" icon={<Key className="w-4 h-4" />}>
                    Customer Login
                  </Button>
                </Link>
                <Link href={staffLoginHref}>
                  <Button variant="outline" size="sm" icon={<LogIn className="w-4 h-4" />}>
                    Staff Sign In
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="grid gap-8 grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] items-stretch">
          <div
            className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white/90 to-white/70 shadow-2xl p-6 md:p-10"
          >
            <div
              className="absolute -right-8 -bottom-16 w-72 h-72 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, rgba(${brand.accentRgb},0.30), rgba(${brand.accentRgb},0.02) 65%, transparent 72%)` }}
            />
            <div className="relative grid gap-5">
              <div className="flex gap-2 flex-wrap">
                <span
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                  style={{ backgroundColor: `rgba(${brand.accentRgb},0.12)`, color: brand.accentColor }}
                >
                  Branded Customer Portal
                </span>
                <span
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    portal.isActive ? 'bg-emerald-500/15 text-emerald-800' : 'bg-amber-500/15 text-amber-800'
                  }`}
                >
                  {portal.isActive ? 'Portal Active' : 'Portal Preview'}
                </span>
              </div>

              <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none text-slate-900 max-w-[760px]">
                {brand.companyLabel} customer access, shipment updates, and portal-only finance in one place.
              </h1>

              <p className="text-sm md:text-base text-slate-600 max-w-[720px] leading-relaxed">
                This portal gives your downstream customers and internal portal staff a dedicated entry point with branded access, shipment visibility, invoice history, and customer-scoped finance records.
              </p>

              <div className="flex gap-3 flex-wrap pt-2">
                {session?.user ? (
                  <Link href={workspaceHref}>
                    <Button variant="primary" size="lg" icon={<ArrowRight className="w-4 h-4" />} iconPosition="end">
                      Continue To Portal
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href={customerLoginHref}>
                      <Button variant="primary" size="lg" icon={<Key className="w-4 h-4" />}>
                        Login With Code
                      </Button>
                    </Link>
                    <Link href={staffLoginHref}>
                      <Button variant="outline" size="lg" icon={<LogIn className="w-4 h-4" />}>
                        Portal Staff Sign In
                      </Button>
                    </Link>
                  </>
                )}
              </div>

              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 pt-4">
                {activeFeatures.map((feature) => (
                  <div key={feature.title} className="rounded-2xl border border-slate-900/10 bg-white/70 p-4 grid gap-2">
                    <div
                      className="w-10 h-10 rounded-xl grid place-items-center"
                      style={{ backgroundColor: `rgba(${brand.accentRgb},0.12)`, color: brand.accentColor }}
                    >
                      {feature.icon}
                    </div>
                    <h3 className="font-bold text-sm text-slate-900">{feature.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6">
            <div className="rounded-3xl bg-slate-900 text-slate-100 p-6 md:p-8 shadow-2xl grid gap-4">
              <p className="text-xs uppercase tracking-widest text-slate-400">
                Access Flow
              </p>
              <h2 className="text-xl md:text-2xl font-bold leading-tight">
                A portal entry page that feels like a standalone site.
              </h2>
              <div className="grid gap-3">
                {[
                  'Customers sign in with an 8-character login code and land inside their own scoped workspace.',
                  'Portal staff can use their existing staff sign-in path with the same branded destination.',
                  'Custom domains open this public page first, then route into the private workspace after login.',
                ].map((item) => (
                  <div key={item} className="flex gap-3 items-start">
                    <div
                      className="w-2 h-2 rounded-full mt-2 shrink-0"
                      style={{ backgroundColor: brand.accentColor }}
                    />
                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-900/10 bg-white/80 backdrop-blur-md p-6 md:p-8 grid gap-3 shadow-lg">
              <p className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">
                Portal Address
              </p>
              <h3 className="text-base md:text-lg font-bold text-[var(--text-primary)]">
                {usingCustomDomain ? requestHost : portal.customDomain || publicHref}
              </h3>
              <p className="text-xs md:text-sm text-[var(--text-secondary)] leading-relaxed">
                {portal.customDomainVerifiedAt
                  ? 'This portal already has a verified public hostname and can be shared as a standalone partner website.'
                  : 'This preview path is available now, and a verified custom domain will point here automatically once DNS is live.'}
              </p>
              <div className="flex gap-2 flex-wrap pt-1">
                <Link href={publicHref}>
                  <Button variant="outline" size="sm" icon={<ExternalLink className="w-3.5 h-3.5" />} iconPosition="end">
                    Open Public Page
                  </Button>
                </Link>
                {!session?.user ? (
                  <Link href={customerLoginHref}>
                    <Button variant="primary" size="sm">Start Login</Button>
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}