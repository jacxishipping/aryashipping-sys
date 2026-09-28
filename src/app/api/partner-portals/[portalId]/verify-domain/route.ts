import { resolveTxt, resolveCname, resolve4 } from 'node:dns/promises';
import { NextResponse } from 'next/server';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canManagePortalMemberships,
  getPartnerPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';
import {
  getPortalCustomDomainVerificationHost,
  getPortalCustomDomainVerificationValue,
  getSystemHosts,
  normalizeRequestHost,
} from '@/lib/partner-portal-domains';

export async function POST(
  _request: Request,
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
    if (!portal?.customDomain || !portal.customDomainVerificationToken) {
      return NextResponse.json({ error: 'This portal does not have a pending custom domain verification.' }, { status: 400 });
    }

    const verificationHost = getPortalCustomDomainVerificationHost(portal.customDomain);
    const expectedValue = getPortalCustomDomainVerificationValue(portal.customDomainVerificationToken);

    let flattenedTxtValues: string[] = [];
    try {
      const txtRecords = await resolveTxt(verificationHost);
      flattenedTxtValues = txtRecords.map((record) => record.join(''));
    } catch {
      return NextResponse.json({
        error: 'Verification TXT record not found yet.',
        verificationHost,
        expectedValue,
      }, { status: 400 });
    }

    if (!flattenedTxtValues.includes(expectedValue)) {
      return NextResponse.json({
        error: 'Verification TXT record was found, but the value did not match.',
        verificationHost,
        expectedValue,
      }, { status: 400 });
    }

    // Check that the custom domain actually resolves (CNAME or A record)
    const systemHosts = getSystemHosts();
    const appHost = normalizeRequestHost(process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL);
    let dnsResolved = false;
    let dnsResolutionDetail = '';

    try {
      const cnameRecords = await resolveCname(portal.customDomain);
      const cnameTargets = cnameRecords.map((target) => normalizeRequestHost(target));
      dnsResolved = cnameTargets.some((target) => {
        if (!target) return false;
        if (appHost && target === appHost) return true;
        return Array.from(systemHosts).some((systemHost) => target === systemHost || target.endsWith(`.${systemHost}`));
      });
      dnsResolutionDetail = `CNAME targets: ${cnameTargets.join(', ')}`;
    } catch {
      // CNAME lookup failed, try A record
      try {
        const aRecords = await resolve4(portal.customDomain);
        dnsResolved = aRecords.length > 0;
        dnsResolutionDetail = `A records: ${aRecords.join(', ')}`;
      } catch {
        dnsResolutionDetail = 'No CNAME or A records found';
      }
    }

    if (!dnsResolved) {
      return NextResponse.json({
        error: 'TXT record verified, but the domain does not resolve to this application. Ensure your DNS CNAME or A record points to the app host.',
        verificationHost,
        expectedValue,
        dnsResolutionDetail,
      }, { status: 400 });
    }

    const updatedPortal = await routeDeps.prisma.partnerPortal.update({
      where: { id: portalId },
      data: {
        customDomainVerifiedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        code: true,
        customDomain: true,
        customDomainVerificationToken: true,
        customDomainVerifiedAt: true,
        companyLabel: true,
        accentColor: true,
        logoUrl: true,
        notifyOnShipmentAssigned: true,
        autoAssignToSingleCustomer: true,
        defaultShipmentNotes: true,
        requireCustomerLinkForReady: true,
        isActive: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      portal: updatedPortal,
      verificationHost,
      expectedValue,
      dnsResolutionDetail,
    });
  } catch (error) {
    routeDeps.logger.error('Failed to verify partner portal custom domain', error);
    return NextResponse.json({ error: 'Failed to verify partner portal custom domain' }, { status: 500 });
  }
}