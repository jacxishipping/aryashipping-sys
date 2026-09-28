import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeDeps } from '@/lib/route-deps';
import {
  canManagePartnerPortals,
  canReadPartnerPortalCustomers,
  getPartnerPortalMembership,
  getPortalMembershipCustomerScope,
  isCustomerScopedPortalMembership,
} from '@/lib/partner-portals';

const updatePartnerCustomerSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().nullable().optional().or(z.literal('')),
  phone: z.string().trim().max(50).nullable().optional(),
  address: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(100).nullable().optional(),
  country: z.string().trim().max(100).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ portalId: string; customerId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, customerId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role) || canReadPartnerPortalCustomers(session.user.role);
    const scopedCustomerId = getPortalMembershipCustomerScope(membership);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isCustomerScopedPortalMembership(membership) && !hasInternalAccess) {
      if (scopedCustomerId !== customerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return NextResponse.json({ error: 'Customer-scoped portal accounts cannot edit customer records' }, { status: 403 });
    }

    const existing = await routeDeps.prisma.partnerCustomer.findFirst({
      where: { id: customerId, portalId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Partner customer not found' }, { status: 404 });
    }

    const payload = updatePartnerCustomerSchema.parse(await request.json());

    const customer = await routeDeps.prisma.partnerCustomer.update({
      where: { id: customerId },
      data: {
        name: payload.name,
        email: payload.email || null,
        phone: payload.phone || null,
        address: payload.address || null,
        city: payload.city || null,
        country: payload.country || null,
        notes: payload.notes || null,
      },
    });

    return NextResponse.json({ customer });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to update portal customer', error);
    return NextResponse.json({ error: 'Failed to update portal customer' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ portalId: string; customerId: string }> },
) {
  try {
    const session = await routeDeps.auth();
    const { portalId, customerId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getPartnerPortalMembership(portalId, session.user.id);
    const hasInternalAccess = canManagePartnerPortals(session.user.role) || canReadPartnerPortalCustomers(session.user.role);
    const scopedCustomerId = getPortalMembershipCustomerScope(membership);

    if (!membership && !hasInternalAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (isCustomerScopedPortalMembership(membership) && !hasInternalAccess) {
      if (scopedCustomerId !== customerId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return NextResponse.json({ error: 'Customer-scoped portal accounts cannot delete customer records' }, { status: 403 });
    }

    const existing = await routeDeps.prisma.partnerCustomer.findFirst({
      where: { id: customerId, portalId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Partner customer not found' }, { status: 404 });
    }

    await routeDeps.prisma.partnerCustomer.delete({ where: { id: customerId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    routeDeps.logger.error('Failed to delete portal customer', error);
    return NextResponse.json({ error: 'Failed to delete portal customer' }, { status: 500 });
  }
}