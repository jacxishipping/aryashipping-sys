import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canReadPartnerPortalCustomers,
  getPartnerPortalMembership,
  getPortalMembershipCustomerScope,
  getPartnerPortalOrThrow,
  isCustomerScopedPortalMembership,
} from '@/lib/partner-portals';

const createPartnerCustomerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().or(z.literal('')),
  phone: z.string().trim().max(50).optional(),
  address: z.string().trim().max(255).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
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
    const hasInternalAccess = canManagePartnerPortals(session.user.role) || canReadPartnerPortalCustomers(session.user.role);
    const scopedCustomerId = getPortalMembershipCustomerScope(membership);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const customers = await routeDeps.prisma.partnerCustomer.findMany({
      where: {
        portalId,
        ...(scopedCustomerId ? { id: scopedCustomerId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: {
          orderBy: { createdAt: 'asc' },
          take: 1,
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
        },
        _count: {
          select: {
            shipmentAssignments: true,
          },
        },
      },
    });

    return NextResponse.json({
      portal,
      customers,
      viewer: {
        canManageCustomers: hasInternalAccess || !isCustomerScopedPortalMembership(membership),
        customerScoped: isCustomerScopedPortalMembership(membership),
        partnerCustomerId: scopedCustomerId,
      },
    });
  } catch (error) {
    routeDeps.logger.error('Failed to fetch portal customers', error);
    return NextResponse.json({ error: 'Failed to fetch portal customers' }, { status: 500 });
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

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role) || canReadPartnerPortalCustomers(session.user.role);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isCustomerScopedPortalMembership(membership) && !hasInternalAccess) {
      return NextResponse.json({ error: 'Customer-scoped portal accounts cannot create customers' }, { status: 403 });
    }

    const portal = await getPartnerPortalOrThrow(portalId);

    if (!portal) {
      return NextResponse.json({ error: 'Partner portal not found' }, { status: 404 });
    }

    const payload = createPartnerCustomerSchema.parse(await request.json());

    const customer = await routeDeps.prisma.partnerCustomer.create({
      data: {
        portalId,
        name: payload.name,
        ...(payload.email ? { email: payload.email } : {}),
        ...(payload.phone ? { phone: payload.phone } : {}),
        ...(payload.address ? { address: payload.address } : {}),
        ...(payload.city ? { city: payload.city } : {}),
        ...(payload.country ? { country: payload.country } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
        createdBy: session.user.id,
      },
    });

    return NextResponse.json({ customer }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to create portal customer', error);
    return NextResponse.json({ error: 'Failed to create portal customer' }, { status: 500 });
  }
}