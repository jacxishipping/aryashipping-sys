import { NextRequest, NextResponse } from 'next/server';
import { routeDeps } from '@/lib/route-deps';
import { normalizeRequestHost } from '@/lib/partner-portal-domains';

export async function GET(request: NextRequest) {
  try {
    const host = normalizeRequestHost(request.nextUrl.searchParams.get('host'));

    if (!host) {
      return NextResponse.json({ portal: null });
    }

    const portal = await routeDeps.prisma.partnerPortal.findFirst({
      where: {
        customDomain: host,
        customDomainVerifiedAt: { not: null },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        companyLabel: true,
        customDomain: true,
        customDomainVerifiedAt: true,
      },
    });

    return NextResponse.json({ portal });
  } catch (error) {
    routeDeps.logger.error('Failed to resolve partner portal domain', error);
    return NextResponse.json({ error: 'Failed to resolve partner portal domain' }, { status: 500 });
  }
}