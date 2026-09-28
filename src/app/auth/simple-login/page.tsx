import { headers } from 'next/headers';
import SimpleLoginPageClient from '@/components/auth/SimpleLoginPageClient';
import { prisma } from '@/lib/db';
import { isSystemHost, normalizeRequestHost } from '@/lib/partner-portal-domains';

function getSingleSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function extractPortalIdFromCallbackUrl(callbackUrl: string | null) {
  if (!callbackUrl) {
    return null;
  }

  const match = callbackUrl.match(/^\/portal(?:-site)?\/([^/?#]+)/);
  return match?.[1] || null;
}

export default async function SimpleLoginPage(
  { searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> },
) {
  const resolvedSearchParams = await searchParams;
  const explicitPortalId = getSingleSearchParam(resolvedSearchParams.portalId);
  const callbackUrl = getSingleSearchParam(resolvedSearchParams.callbackUrl);
  const requestHeaders = await headers();
  const requestHost = normalizeRequestHost(
    requestHeaders.get('x-forwarded-host')
      || requestHeaders.get('host')
      || '',
  );

  const portalId = explicitPortalId || extractPortalIdFromCallbackUrl(callbackUrl);
  let portal = null;

  if (portalId) {
    portal = await prisma.partnerPortal.findUnique({
      where: { id: portalId },
      select: {
        id: true,
        name: true,
        companyLabel: true,
        accentColor: true,
        logoUrl: true,
      },
    });
  }

  if (!portal && requestHost && !isSystemHost(requestHost)) {
    portal = await prisma.partnerPortal.findFirst({
      where: {
        customDomain: requestHost,
        customDomainVerifiedAt: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        companyLabel: true,
        accentColor: true,
        logoUrl: true,
      },
    });
  }

  return <SimpleLoginPageClient portal={portal} />;
}
