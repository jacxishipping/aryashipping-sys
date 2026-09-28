import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canManagePortalMemberships,
  getPartnerPortalMembership,
  isCustomerScopedPortalMembership,
  getPartnerPortalOrThrow,
} from '@/lib/partner-portals';

const createMembershipSchema = z.object({
  userId: z.string().trim().min(1),
  role: z.enum(['ADMIN', 'STAFF']).default('STAFF'),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const isInternalManager = canManagePartnerPortals(session.user.role);

    if (!membership && !isInternalManager) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const memberships = await routeDeps.prisma.partnerPortalMembership.findMany({
      where: {
        portalId,
        ...(!isInternalManager && isCustomerScopedPortalMembership(membership) ? { userId: session.user.id } : {}),
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
      include: {
        partnerCustomer: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ portal, memberships });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch portal memberships', error);
    return NextResponse.json({ error: 'Failed to fetch portal memberships' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = createMembershipSchema.parse(await request.json());
    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const isInternalManager = canManagePartnerPortals(session.user.role);

    if (isCustomerScopedPortalMembership(membership) && !isInternalManager) {
      return NextResponse.json({ error: 'Customer-scoped portal accounts cannot manage memberships' }, { status: 403 });
    }

    if (!isInternalManager && !canManagePortalMemberships(membership?.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const user = await routeDeps.prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const existingMembership = await routeDeps.prisma.partnerPortalMembership.findUnique({
      where: {
        portalId_userId: {
          portalId,
          userId: payload.userId,
        },
      },
      select: {
        id: true,
        role: true,
      },
    });

    if (existingMembership?.role === 'ADMIN' && payload.role !== 'ADMIN') {
      const adminCount = await routeDeps.prisma.partnerPortalMembership.count({
        where: {
          portalId,
          role: 'ADMIN',
        },
      });

      if (adminCount <= 1) {
        return NextResponse.json({ error: 'Portal must keep at least one admin member' }, { status: 400 });
      }
    }

    const result = await routeDeps.prisma.partnerPortalMembership.upsert({
      where: {
        portalId_userId: {
          portalId,
          userId: payload.userId,
        },
      },
      create: {
        portalId,
        userId: payload.userId,
        role: payload.role,
        createdBy: session.user.id,
      },
      update: {
        role: payload.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!existingMembership) {
      await createAuditLog(
        'PartnerPortalMembership',
        result.id,
        'CREATE',
        session.user.id,
        {
          portalId,
          userId: payload.userId,
          role: payload.role,
        },
        request,
      );
    } else if (existingMembership.role !== payload.role) {
      await createAuditLog(
        'PartnerPortalMembership',
        existingMembership.id,
        'UPDATE',
        session.user.id,
        {
          portalId,
          userId: payload.userId,
          previousRole: existingMembership.role,
          nextRole: payload.role,
        },
        request,
      );
    }

    return NextResponse.json({ membership: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to upsert portal membership', error);
    return NextResponse.json({ error: 'Failed to save portal membership' }, { status: 500 });
  }
}