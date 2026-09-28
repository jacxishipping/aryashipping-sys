import { NextRequest, NextResponse } from 'next/server';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canManagePortalMemberships,
  getPartnerPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';
import {
  getSystemHosts,
  isSystemHost,
  isValidPortalCustomDomain,
  normalizePortalCustomDomain,
} from '@/lib/partner-portal-domains';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requesterMembership = await getPartnerPortalMembership(portalId, session.user.id);
    const isInternalManager = canManagePartnerPortals(session.user.role);

    if (!isInternalManager && !canManagePortalMemberships(requesterMembership?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);
    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const domain = normalizePortalCustomDomain(request.nextUrl.searchParams.get('domain'));

    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter is required' }, { status: 400 });
    }

    if (!isValidPortalCustomDomain(domain)) {
      return NextResponse.json({
        valid: false,
        error: 'Custom domain must be a valid hostname without http://, https://, ports, or paths.',
      });
    }

    const systemHosts = getSystemHosts();
    const isSystem = isSystemHost(domain);
    const isSubdomainOfSystem = Array.from(systemHosts).some(
      (systemHost) => domain === systemHost || domain.endsWith(`.${systemHost}`),
    );

    if (isSystem || isSubdomainOfSystem) {
      return NextResponse.json({
        valid: false,
        error: 'This domain is reserved for the main application. Choose a different domain for this portal.',
      });
    }

    // Check if the domain is already used by another portal
    const existingPortal = await routeDeps.prisma.partnerPortal.findFirst({
      where: {
        customDomain: domain,
        id: { not: portalId },
      },
      select: { id: true, name: true },
    });

    if (existingPortal) {
      return NextResponse.json({
        valid: false,
        error: `This domain is already connected to another portal: ${existingPortal.name}.`,
      });
    }

    return NextResponse.json({
      valid: true,
      domain,
      isSystemHost: isSystem,
      isSubdomainOfSystemHost: isSubdomainOfSystem,
      available: true,
    });
  } catch (error) {
    routeDeps.logger.error('Failed to check partner portal custom domain', error);
    return NextResponse.json({ error: 'Failed to check custom domain' }, { status: 500 });
  }
}
