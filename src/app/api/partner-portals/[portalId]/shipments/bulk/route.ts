import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuditLog } from '@/lib/audit';
import { routeDeps } from '@/lib/route-deps';
import {
  canAssignShipmentsToPartnerPortals,
  getPartnerPortalMembership,
  isCustomerScopedPortalMembership,
} from '@/lib/partner-portals';

const bulkActionSchema = z.object({
  action: z.enum(['UNASSIGN', 'LINK_CUSTOMER', 'SET_NOTES', 'CLEAR_NOTES']),
  shipmentIds: z.array(z.string().trim().min(1)).min(1).max(200),
  partnerCustomerId: z.string().trim().min(1).nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});

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

    if (isCustomerScopedPortalMembership(membership)) {
      return NextResponse.json({ error: 'Customer-scoped portal accounts cannot modify shipment assignments' }, { status: 403 });
    }

    if (!canAssignShipmentsToPartnerPortals(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = bulkActionSchema.parse(await request.json());

    // Deduplicate and cap the batch size.
    const shipmentIds = Array.from(new Set(payload.shipmentIds));
    if (shipmentIds.length === 0) {
      return NextResponse.json({ error: 'No shipments selected' }, { status: 400 });
    }

    // Verify every shipment is actually assigned to this portal so callers
    // cannot touch assignments belonging to other portals.
    const assignments = await routeDeps.prisma.partnerShipmentAssignment.findMany({
      where: {
        portalId,
        shipmentId: { in: shipmentIds },
      },
      select: {
        id: true,
        shipmentId: true,
        partnerCustomerId: true,
        notes: true,
      },
    });

    const assignmentByShipmentId = new Map(assignments.map((assignment) => [assignment.shipmentId, assignment]));
    const missingIds = shipmentIds.filter((shipmentId) => !assignmentByShipmentId.has(shipmentId));

    if (missingIds.length > 0) {
      return NextResponse.json(
        { error: `Some shipments are not assigned to this portal`, missingCount: missingIds.length },
        { status: 404 },
      );
    }

    // Resolve the target customer once for LINK_CUSTOMER actions.
    let targetCustomerId: string | null = null;
    if (payload.action === 'LINK_CUSTOMER') {
      if (payload.partnerCustomerId === null || payload.partnerCustomerId === undefined) {
        return NextResponse.json({ error: 'partnerCustomerId is required for LINK_CUSTOMER' }, { status: 400 });
      }

      const partnerCustomer = await routeDeps.prisma.partnerCustomer.findFirst({
        where: {
          id: payload.partnerCustomerId,
          portalId,
        },
        select: { id: true, name: true },
      });

      if (!partnerCustomer) {
        return NextResponse.json({ error: 'Partner customer not found in this portal' }, { status: 404 });
      }

      targetCustomerId = partnerCustomer.id;
    }

    if (payload.action === 'SET_NOTES' && !payload.notes?.trim()) {
      return NextResponse.json({ error: 'notes is required for SET_NOTES' }, { status: 400 });
    }

    const now = new Date();
    let updatedCount = 0;

    if (payload.action === 'UNASSIGN') {
      const result = await routeDeps.prisma.partnerShipmentAssignment.deleteMany({
        where: {
          portalId,
          shipmentId: { in: shipmentIds },
        },
      });
      updatedCount = result.count;
    } else {
      const data =
        payload.action === 'LINK_CUSTOMER'
          ? {
              partnerCustomerId: targetCustomerId,
              linkedBy: session.user.id,
              linkedAt: targetCustomerId ? now : null,
            }
          : payload.action === 'SET_NOTES'
            ? {
                notes: payload.notes!.trim(),
                noteSource: 'MANUAL' as const,
              }
            : {
                // CLEAR_NOTES
                notes: null,
                noteSource: null,
              };

      const result = await routeDeps.prisma.partnerShipmentAssignment.updateMany({
        where: {
          portalId,
          shipmentId: { in: shipmentIds },
        },
        data,
      });
      updatedCount = result.count;
    }

    await createAuditLog(
      'PartnerShipmentAssignment',
      portalId,
      payload.action === 'UNASSIGN' ? 'DELETE' : 'UPDATE',
      session.user.id,
      {
        portalId,
        bulkAction: payload.action,
        shipmentIds,
        count: updatedCount,
        ...(payload.action === 'LINK_CUSTOMER' ? { partnerCustomerId: targetCustomerId } : {}),
        ...(payload.action === 'SET_NOTES' ? { notes: payload.notes!.trim() } : {}),
      },
      request,
    );

    return NextResponse.json({ success: true, updatedCount });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.issues }, { status: 400 });
    }

    routeDeps.logger.error('Failed to run bulk shipment action', error);
    return NextResponse.json({ error: 'Failed to run bulk shipment action' }, { status: 500 });
  }
}
