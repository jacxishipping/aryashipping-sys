import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeDeps } from '@/lib/route-deps';
import { sendShipmentWorkflowNotifications } from '@/lib/workflow-notifications';
import { ensureWorkflowMoveAllowed, isClosedStageOverrideAllowed } from '@/lib/workflow-access';

const bulkAssignSchema = z.object({
  shipmentIds: z.array(z.string().min(1)).min(1).max(100),
});

function buildShipmentLabel(shipment: {
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleVIN?: string | null;
  id: string;
}) {
  const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  if (shipment.vehicleVIN && vehicleLabel) {
    return `${vehicleLabel} (${shipment.vehicleVIN})`;
  }

  return shipment.vehicleVIN || vehicleLabel || shipment.id;
}

/**
 * POST /api/transits/[id]/shipments/bulk
 *
 * Assign several released shipments to this transit in one call. Each shipment
 * must be released (shipment or container), carry a release token, and not be
 * assigned to another transit. Eligible shipments are assigned and their
 * customers notified; ineligible ones are reported per shipment without
 * failing the whole request.
 */
export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ensureWorkflowMoveAllowed(session.user?.role) || !routeDeps.hasPermission(session.user?.role, 'transits:manage') || !routeDeps.hasPermission(session.user?.role, 'shipments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transit = await routeDeps.prisma.transit.findUnique({ where: { id: params.id } });
    if (!transit) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    if ((transit.status === 'DELIVERED' || transit.status === 'CANCELLED') && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json(
        { error: 'Cannot add shipments to a delivered or cancelled transit' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { shipmentIds } = bulkAssignSchema.parse(body);

    const shipments = await routeDeps.prisma.shipment.findMany({
      where: { id: { in: shipmentIds } },
      select: {
        id: true,
        status: true,
        transitId: true,
        releaseToken: true,
        vehicleYear: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleVIN: true,
        userId: true,
        user: { select: { id: true, name: true, email: true } },
        container: { select: { status: true } },
      },
    });

    const shipmentMap = new Map(shipments.map((shipment) => [shipment.id, shipment]));
    const errors: Array<{ shipmentId: string; error: string }> = [];
    const assignableIds: string[] = [];

    for (const shipmentId of shipmentIds) {
      const shipment = shipmentMap.get(shipmentId);
      if (!shipment) {
        errors.push({ shipmentId, error: 'Shipment not found' });
        continue;
      }

      const isReleased = String(shipment.status) === 'RELEASED' || shipment.container?.status === 'RELEASED';
      if (!isReleased) {
        errors.push({ shipmentId, error: 'Shipment can be assigned to transit only after release' });
        continue;
      }

      if (!shipment.releaseToken) {
        errors.push({ shipmentId, error: 'Shipment has no release token. Generate one on the shipment page first.' });
        continue;
      }

      if (shipment.transitId && shipment.transitId !== params.id) {
        errors.push({ shipmentId, error: 'Shipment is already assigned to another transit' });
        continue;
      }

      if (shipment.transitId === params.id) {
        errors.push({ shipmentId, error: 'Shipment is already on this transit' });
        continue;
      }

      assignableIds.push(shipmentId);
    }

    if (assignableIds.length > 0) {
      await routeDeps.prisma.$transaction(async (tx) => {
        for (const shipmentId of assignableIds) {
          await tx.shipment.update({
            where: { id: shipmentId },
            data: { transitId: params.id, status: 'IN_TRANSIT_TO_DESTINATION' },
          });
        }
      });

      const assignedShipments = assignableIds
        .map((id) => shipmentMap.get(id))
        .filter((shipment): shipment is NonNullable<typeof shipment> => Boolean(shipment));

      const notifications = assignedShipments.map((shipment) => {
        const label = buildShipmentLabel(shipment);
        return {
          shipmentId: shipment.id,
          shipmentUserId: shipment.userId,
          title: 'Shipment workflow updated',
          customerDescription: `Your shipment ${label} has been assigned to transit ${transit.referenceNumber} and is now on the destination delivery leg.`,
          internalDescription: `Shipment ${label} was assigned to transit ${transit.referenceNumber}.`,
          link: `/dashboard/shipments/${shipment.id}`,
        };
      });

      await sendShipmentWorkflowNotifications(
        session.user.id as string,
        notifications,
        { prisma: routeDeps.prisma, createNotificationsFn: routeDeps.createNotifications },
      );
    }

    return NextResponse.json({
      assigned: assignableIds.length,
      errors,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error bulk assigning shipments to transit:', error);
    return NextResponse.json({ error: 'Failed to bulk assign shipments to transit' }, { status: 500 });
  }
}
