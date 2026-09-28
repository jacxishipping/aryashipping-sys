import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/audit';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canManagePortalMemberships,
  getPartnerPortalMembership,
} from '@/lib/partner-portals';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string; membershipId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, membershipId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requesterMembership = await getPartnerPortalMembership(portalId, session.user.id);
    const isInternalManager = canManagePartnerPortals(session.user.role);

    if (!isInternalManager && !canManagePortalMemberships(requesterMembership?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const membership = await routeDeps.prisma.partnerPortalMembership.findFirst({
      where: { id: membershipId, portalId },
      select: {
        id: true,
        role: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Portal membership not found' }, { status: 404 });
    }

    if (membership.role === 'ADMIN') {
      const adminCount = await routeDeps.prisma.partnerPortalMembership.count({
        where: { portalId, role: 'ADMIN' },
      });

      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Portal must keep at least one admin member' }, { status: 400 });
      }
    }

    await routeDeps.prisma.partnerPortalMembership.delete({ where: { id: membershipId } });

    await createAuditLog(
      'PartnerPortalMembership',
      membership.id,
      'DELETE',
      session.user.id,
      {
        portalId,
        userId: membership.user.id,
        targetName: membership.user.name || membership.user.email,
        previousRole: membership.role,
      },
      request,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    routeDeps.logger.error('Failed to delete portal membership', error);
    return NextResponse.json({ error: 'Failed to delete portal membership' }, { status: 500 });
  }
}