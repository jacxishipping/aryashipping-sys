import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import PortalOverviewPage from '@/components/partner-portals/PortalOverviewPage';
import { auth } from '@/lib/auth';
import { normalizeRequestHost } from '@/lib/partner-portal-domains';
import { getPartnerPortalMembership, getPortalMembershipCustomerScope } from '@/lib/partner-portals';

export default async function PortalPage(
  { params }: { params: Promise<{ portalId: string }> },
) {
  const session = await auth();
  const { portalId } = await params;

  if (session?.user?.id) {
    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const partnerCustomerId = getPortalMembershipCustomerScope(membership);

    if (partnerCustomerId) {
      const requestHeaders = await headers();
      const requestHost = normalizeRequestHost(
        requestHeaders.get('x-forwarded-host')
          || requestHeaders.get('host')
          || '',
      );
      const usingCustomDomain = Boolean(
        requestHost
          && membership?.portal?.customDomain
          && requestHost === membership.portal.customDomain,
      );

      redirect(
        usingCustomDomain
          ? `/finance/${partnerCustomerId}`
          : `/portal/${portalId}/finance/${partnerCustomerId}`,
      );
    }
  }

  return <PortalOverviewPage />;
}