import { NextRequest, NextResponse } from 'next/server';
import { routeDeps } from '@/lib/route-deps';
import { isDispatchClosed } from '@/lib/dispatch-workflow';
import { ensureWorkflowMoveAllowed, isClosedStageOverrideAllowed } from '@/lib/workflow-access';

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

function buildShipmentBatchSummary(shipmentLabels: string[]) {
  if (shipmentLabels.length <= 3) {
    return shipmentLabels.join(', ');
  }

  return `${shipmentLabels.slice(0, 3).join(', ')}, +${shipmentLabels.length - 3} more`;
}

export async function POST(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ensureWorkflowMoveAllowed(session.user?.role) || !routeDeps.hasPermission(session.user?.role, 'dispatches:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const dispatch = await routeDeps.prisma.dispatch.findUnique({
      where: { id: params.id },
      include: {
        shipments: {
          select: {
            id: true,
            status: true,
            dispatchId: true,
            containerId: true,
            transitId: true,
            vehicleYear: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleVIN: true,
          },
        },
      },
    });

    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    if (isDispatchClosed(dispatch.status) && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Cannot receive a completed or cancelled dispatch to yard' }, { status: 400 });
    }

    const receivableShipments = (dispatch.shipments || []).filter(
      (shipment) => shipment.dispatchId === params.id && !shipment.containerId && !shipment.transitId && shipment.status === 'DISPATCHING',
    );

    if (receivableShipments.length === 0) {
      return NextResponse.json({ error: 'Dispatch has no active shipments available to receive to yard' }, { status: 400 });
    }

    const shipmentIds = receivableShipments.map((shipment) => shipment.id);
    const shipmentLabels = receivableShipments.map((shipment) => buildShipmentLabel(shipment));
    const shipmentBatchSummary = buildShipmentBatchSummary(shipmentLabels);
    const eventDate = new Date();
    const actorId = session.user.id as string;

    await routeDeps.prisma.$transaction(async (tx) => {
      await tx.shipment.updateMany({
        where: { id: { in: shipmentIds }, dispatchId: params.id, containerId: null, transitId: null, status: 'DISPATCHING' },
        data: { dispatchId: null, status: 'ON_HAND' },
      });

      await tx.dispatch.update({
        where: { id: params.id },
        data: {
          status: 'COMPLETED',
          actualArrival: dispatch.actualArrival ?? eventDate,
        },
      });

      await tx.dispatchEvent.create({
        data: {
          dispatchId: params.id,
          status: 'RECEIVED_TO_YARD',
          location: dispatch.destination,
          description: `Yard intake | Shipments: ${shipmentBatchSummary}`,
          eventDate,
          createdBy: actorId,
        },
      });

      await tx.shipmentAuditLog.createMany({
        data: shipmentIds.map((shipmentId, index) => ({
          shipmentId,
          action: 'DISPATCH_COMPLETED',
          description: `Shipment received to yard from dispatch ${dispatch.referenceNumber}`,
          performedBy: actorId,
          oldValue: dispatch.referenceNumber,
          newValue: 'ON_HAND',
          metadata: {
            dispatchId: params.id,
            dispatchReference: dispatch.referenceNumber,
            shipmentLabel: shipmentLabels[index] || shipmentId,
            receivedAt: eventDate.toISOString(),
          },
        })),
      });
    });

    return NextResponse.json({
      success: true,
      receipt: {
        dispatchId: params.id,
        shipmentCount: shipmentIds.length,
        shipmentIds,
        receivedAt: eventDate.toISOString(),
        performedBy: actorId,
      },
    });
  } catch (error) {
    console.error('Error receiving dispatch to yard:', error);
    return NextResponse.json({ error: 'Failed to receive dispatch to yard' }, { status: 500 });
  }
}