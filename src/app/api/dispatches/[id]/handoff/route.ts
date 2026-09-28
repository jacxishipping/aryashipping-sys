import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { routeDeps } from '@/lib/route-deps';
import { isDispatchClosed } from '@/lib/dispatch-workflow';
import { sendShipmentWorkflowNotifications } from '@/lib/workflow-notifications';
import { ensureWorkflowMoveAllowed, isClosedStageOverrideAllowed } from '@/lib/workflow-access';
import { postShipmentPriceListLifecycleCharge } from '@/lib/shipment-price-list-lifecycle';

const handoffSchema = z.object({
  containerId: z.string().min(1),
  shipmentIds: z.array(z.string().min(1)).min(1),
});

const HANDOFF_ELIGIBLE_CONTAINER_STATUSES = new Set(['CREATED', 'WAITING_FOR_LOADING', 'LOADED', 'IN_TRANSIT']);

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

  const preview = shipmentLabels.slice(0, 3).join(', ');
  return `${preview}, +${shipmentLabels.length - 3} more`;
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ensureWorkflowMoveAllowed(session.user?.role) || !routeDeps.hasPermission(session.user?.role, 'dispatches:manage') || !routeDeps.hasPermission(session.user?.role, 'containers:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { containerId, shipmentIds } = handoffSchema.parse(body);
    const selectedShipmentIds = Array.from(new Set(shipmentIds));

    const dispatch = await routeDeps.prisma.dispatch.findUnique({
      where: { id: params.id },
      include: {
        shipments: {
          select: {
            id: true,
            userId: true,
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
      return NextResponse.json({ error: 'Cannot hand off a completed or cancelled dispatch' }, { status: 400 });
    }

    const shipments = dispatch.shipments || [];
    if (shipments.length === 0) {
      return NextResponse.json({ error: 'Dispatch has no shipments available for handoff' }, { status: 400 });
    }

    const selectedShipments = shipments.filter((shipment) => selectedShipmentIds.includes(shipment.id));
    if (selectedShipments.length !== selectedShipmentIds.length) {
      return NextResponse.json({ error: 'One or more selected shipments are not assigned to this dispatch' }, { status: 400 });
    }

    const invalidWorkflowShipment = selectedShipments.find((shipment) => shipment.containerId || shipment.transitId || shipment.dispatchId !== params.id || shipment.status !== 'DISPATCHING');
    if (invalidWorkflowShipment) {
      return NextResponse.json(
        { error: 'All selected shipments must still be in the dispatching stage before handoff to a container' },
        { status: 400 },
      );
    }

    const container = await routeDeps.prisma.container.findUnique({
      where: { id: containerId },
      include: {
        shipments: true,
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    if (!container.companyId) {
      return NextResponse.json({ error: 'Assign a shipping company to the container before handoff' }, { status: 400 });
    }

    if (!HANDOFF_ELIGIBLE_CONTAINER_STATUSES.has(String(container.status))) {
      return NextResponse.json({ error: 'Selected container is not available for dispatch handoff' }, { status: 400 });
    }

    const currentCount = Array.isArray(container.shipments) ? container.shipments.length : container.currentCount;
    const handoffCount = selectedShipments.length;
    const nextCount = currentCount + handoffCount;

    if (nextCount > container.maxCapacity) {
      return NextResponse.json(
        { error: `Container capacity exceeded. Current: ${currentCount}, Max: ${container.maxCapacity}, Attempting to hand off: ${handoffCount}` },
        { status: 400 },
      );
    }

    const eventDate = new Date();
    const actorId = session.user.id as string;
    const remainingDispatchShipmentCount = shipments.length - handoffCount;
    const shipmentLabels = selectedShipments.map((shipment) => buildShipmentLabel(shipment));
    const shipmentBatchSummary = buildShipmentBatchSummary(shipmentLabels);

    await routeDeps.prisma.$transaction(async (tx) => {
      await tx.shipment.updateMany({
        where: { id: { in: selectedShipmentIds }, dispatchId: params.id, containerId: null, transitId: null, status: 'DISPATCHING' },
        data: {
          dispatchId: null,
          containerId,
          status: 'IN_TRANSIT',
          shippingCompanyId: container.companyId,
        },
      });

      await tx.container.update({
        where: { id: containerId },
        data: { currentCount: nextCount },
      });

      await tx.dispatch.update({
        where: { id: params.id },
        data: {
          status: remainingDispatchShipmentCount > 0 ? 'ARRIVED_AT_PORT' : 'COMPLETED',
          actualArrival: dispatch.actualArrival ?? eventDate,
        },
      });

      await tx.dispatchEvent.create({
        data: {
          dispatchId: params.id,
          status: 'HANDOFF_TO_CONTAINER',
          location: dispatch.destination,
          description: `Container ${container.containerNumber} | Shipments: ${shipmentBatchSummary}${remainingDispatchShipmentCount > 0 ? ` | ${remainingDispatchShipmentCount} still pending on dispatch` : ''}`,
          eventDate,
          createdBy: actorId,
        },
      });

      await tx.containerAuditLog.create({
        data: {
          containerId,
          action: 'DISPATCH_HANDOFF_RECEIVED',
          description: `Received ${handoffCount} shipment${handoffCount === 1 ? '' : 's'} from dispatch ${dispatch.referenceNumber}`,
          performedBy: actorId,
          metadata: {
            dispatchId: params.id,
            dispatchReference: dispatch.referenceNumber,
            shipmentIds: selectedShipmentIds,
            shipmentLabels,
            handoffAt: eventDate.toISOString(),
          },
        },
      });

      await tx.shipmentAuditLog.createMany({
        data: selectedShipmentIds.map((shipmentId) => ({
          shipmentId,
          action: 'CONTAINER_ASSIGNED',
          description: `Shipment handed off from dispatch ${dispatch.referenceNumber} to container ${container.containerNumber}`,
          performedBy: actorId,
          oldValue: dispatch.referenceNumber,
          newValue: container.containerNumber,
          metadata: {
            dispatchId: params.id,
            dispatchReference: dispatch.referenceNumber,
            newContainerId: containerId,
            newContainerNumber: container.containerNumber,
            shipmentLabel: shipmentLabels[selectedShipmentIds.indexOf(shipmentId)] || shipmentId,
            handoffAt: eventDate.toISOString(),
          },
        })),
      });

      await Promise.all(
        selectedShipmentIds.flatMap((shipmentId) => [
          postShipmentPriceListLifecycleCharge(tx, {
            shipmentId,
            companyId: container.companyId,
            phase: 'DISPATCH',
            actorId,
          }),
          postShipmentPriceListLifecycleCharge(tx, {
            shipmentId,
            companyId: container.companyId,
            phase: 'SHIPPING',
            actorId,
          }),
        ]),
      );
    });

    await sendShipmentWorkflowNotifications(
      actorId,
      selectedShipments.map((shipment) => ({
        shipmentId: shipment.id,
        shipmentUserId: shipment.userId,
        title: 'Shipment workflow updated',
        customerDescription: `Your shipment ${buildShipmentLabel(shipment)} was handed off from dispatch ${dispatch.referenceNumber} to container ${container.containerNumber}.`,
        internalDescription: `Shipment ${buildShipmentLabel(shipment)} moved from dispatch ${dispatch.referenceNumber} into container ${container.containerNumber}.`,
        link: `/dashboard/shipments/${shipment.id}`,
      })),
      { prisma: routeDeps.prisma, createNotificationsFn: routeDeps.createNotifications },
    );

    return NextResponse.json({
      success: true,
      handoff: {
        dispatchId: params.id,
        containerId,
        containerNumber: container.containerNumber,
        shipmentCount: handoffCount,
        shipmentIds: selectedShipmentIds,
        remainingDispatchShipmentCount,
        handoffAt: eventDate.toISOString(),
        performedBy: actorId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error handing off dispatch to container:', error);
    return NextResponse.json({ error: 'Failed to hand off dispatch to container' }, { status: 500 });
  }
}
