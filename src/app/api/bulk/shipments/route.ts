import { NextRequest, NextResponse } from 'next/server';
import { ShipmentSimpleStatus, NotificationType } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createShipmentAuditLogs } from '@/lib/entity-audit-history';
import { createNotifications } from '@/lib/notifications';
import { hasPermission } from '@/lib/rbac';
import {
  validateBulkContainerAssignment,
  validateBulkShipmentStatusUpdate,
} from '@/lib/shipment-workflow';

// POST: Bulk operations on shipments
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { action, shipmentIds, data } = await request.json();

    if (!action || !shipmentIds || !Array.isArray(shipmentIds)) {
      return NextResponse.json(
        { message: 'Action and shipmentIds array are required' },
        { status: 400 }
      );
    }

    let result;

    switch (action) {
      case 'updateStatus':
        if (!hasPermission(session.user?.role, 'workflow:move') || !hasPermission(session.user?.role, 'shipments:manage')) {
          return NextResponse.json(
            { message: 'Forbidden: Workflow permission required for bulk status updates' },
            { status: 403 }
          );
        }

        if (!data?.status) {
          return NextResponse.json(
            { message: 'Status is required for updateStatus action' },
            { status: 400 }
          );
        }
        // Validate status is one of supported manual statuses
        if (
          data.status !== 'ON_HAND' &&
          data.status !== 'IN_TRANSIT' &&
          data.status !== 'RELEASED' &&
          data.status !== 'DELIVERED'
        ) {
          return NextResponse.json(
            { message: 'Status must be ON_HAND, IN_TRANSIT, RELEASED, or DELIVERED' },
            { status: 400 }
          );
        }

        const statusUpdateShipments = await prisma.shipment.findMany({
          where: { id: { in: shipmentIds } },
          select: {
            id: true,
            userId: true,
            dispatchId: true,
            containerId: true,
            transitId: true,
            status: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
          },
        });

        const bulkStatusValidationError = validateBulkShipmentStatusUpdate(statusUpdateShipments, data.status);
        if (bulkStatusValidationError) {
          return NextResponse.json(
            { message: bulkStatusValidationError },
            { status: 400 }
          );
        }

        result = await prisma.shipment.updateMany({
          where: { id: { in: shipmentIds } },
          data: { status: data.status as ShipmentSimpleStatus },
        });

        try {
          const formattedStatus = data.status
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (char: string) => char.toUpperCase());

          await createNotifications(
            statusUpdateShipments.map((shipment) => {
              const vehicleLabel =
                [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
                  .filter(Boolean)
                  .join(' ') || shipment.vehicleType;
              return {
                userId: shipment.userId,
                senderId: actorId,
                title: 'Shipment status updated',
                description: `Your shipment ${vehicleLabel} is now ${formattedStatus}.`,
                type: NotificationType.INFO,
                link: `/dashboard/shipments/${shipment.id}`,
              };
            })
          );

          await createShipmentAuditLogs(
            statusUpdateShipments
              .filter((shipment) => shipment.status !== data.status)
              .map((shipment) => ({
                shipmentId: shipment.id,
                action: 'STATUS_CHANGE',
                description: `Shipment status changed from ${shipment.status} to ${data.status}`,
                performedBy: actorId,
                oldValue: shipment.status,
                newValue: data.status,
              }))
          );
        } catch (notificationError) {
          console.error('Failed to create bulk shipment notifications:', notificationError);
        }
        break;

      case 'assignContainer':
        if (!hasPermission(session.user?.role, 'workflow:move') || !hasPermission(session.user?.role, 'shipments:manage')) {
          return NextResponse.json(
            { message: 'Forbidden: Workflow permission required for bulk container assignment' },
            { status: 403 }
          );
        }

        if (!data?.containerId) {
          return NextResponse.json(
            { message: 'Container ID is required for assignContainer action' },
            { status: 400 }
          );
        }

        const containerAssignmentShipments = await prisma.shipment.findMany({
          where: { id: { in: shipmentIds } },
          select: {
            id: true,
            userId: true,
            dispatchId: true,
            containerId: true,
            transitId: true,
            status: true,
            vehicleType: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleYear: true,
          },
        });

        const bulkContainerValidationError = validateBulkContainerAssignment(containerAssignmentShipments);
        if (bulkContainerValidationError) {
          return NextResponse.json(
            { message: bulkContainerValidationError },
            { status: 400 }
          );
        }

        result = await prisma.shipment.updateMany({
          where: { id: { in: shipmentIds } },
          data: { 
            containerId: data.containerId,
            status: 'IN_TRANSIT' as ShipmentSimpleStatus,
          },
        });

        try {
          await createNotifications(
            containerAssignmentShipments.map((shipment) => {
              const vehicleLabel =
                [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
                  .filter(Boolean)
                  .join(' ') || shipment.vehicleType;
              return {
                userId: shipment.userId,
                senderId: actorId,
                title: 'Shipment assigned to container',
                description: `Your shipment ${vehicleLabel} is now In Transit.`,
                type: NotificationType.INFO,
                link: `/dashboard/shipments/${shipment.id}`,
              };
            })
          );

          await createShipmentAuditLogs(
            containerAssignmentShipments.flatMap((shipment) => {
              const auditEntries: Array<{
                shipmentId: string;
                action: string;
                description: string;
                performedBy: string;
                oldValue: string | null;
                newValue: string | null;
                metadata?: {
                  oldContainerId: string | null;
                  newContainerId: string | null;
                };
              }> = [
                {
                  shipmentId: shipment.id,
                  action: 'CONTAINER_ASSIGNED',
                  description: `Shipment assigned to container ${data.containerId}`,
                  performedBy: actorId,
                  oldValue: shipment.containerId,
                  newValue: data.containerId,
                  metadata: {
                    oldContainerId: shipment.containerId,
                    newContainerId: data.containerId,
                  },
                },
              ];

              if (shipment.status !== 'IN_TRANSIT') {
                auditEntries.push({
                  shipmentId: shipment.id,
                  action: 'STATUS_CHANGE',
                  description: `Shipment status changed from ${shipment.status} to IN_TRANSIT`,
                  performedBy: actorId,
                  oldValue: shipment.status,
                  newValue: 'IN_TRANSIT',
                });
              }

              return auditEntries;
            })
          );
        } catch (notificationError) {
          console.error('Failed to create container assignment notifications:', notificationError);
        }
        break;

      case 'assignUser':
        if (!hasPermission(session.user?.role, 'shipments:manage')) {
          return NextResponse.json(
            { message: 'Forbidden: Shipment management permission required for bulk reassignment' },
            { status: 403 }
          );
        }

        if (!data?.userId) {
          return NextResponse.json(
            { message: 'User ID is required for assignUser action' },
            { status: 400 }
          );
        }

        const reassignShipments = await prisma.shipment.findMany({
          where: { id: { in: shipmentIds } },
          select: { id: true, userId: true },
        });

        result = await prisma.shipment.updateMany({
          where: { id: { in: shipmentIds } },
          data: { userId: data.userId },
        });

        await createShipmentAuditLogs(
          reassignShipments
            .filter((shipment) => shipment.userId !== data.userId)
            .map((shipment) => ({
              shipmentId: shipment.id,
              action: 'USER_REASSIGNED',
              description: 'Shipment ownership reassigned through bulk operation',
              performedBy: actorId,
              oldValue: shipment.userId,
              newValue: data.userId,
            }))
        );
        break;

      case 'updatePaymentStatus':
        if (!data?.paymentStatus) {
          return NextResponse.json(
            { message: 'Payment status is required for updatePaymentStatus action' },
            { status: 400 }
          );
        }

        const paymentStatusBeforeUpdate = await prisma.shipment.findMany({
          where: { id: { in: shipmentIds } },
          select: { id: true, paymentStatus: true },
        });

        result = await prisma.shipment.updateMany({
          where: { id: { in: shipmentIds } },
          data: { paymentStatus: data.paymentStatus as 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED' },
        });

        await createShipmentAuditLogs(
          paymentStatusBeforeUpdate
            .filter((shipment) => shipment.paymentStatus !== data.paymentStatus)
            .map((shipment) => ({
              shipmentId: shipment.id,
              action: 'PAYMENT_STATUS_UPDATED',
              description: `Shipment payment status changed from ${shipment.paymentStatus} to ${data.paymentStatus}`,
              performedBy: actorId,
              oldValue: shipment.paymentStatus,
              newValue: data.paymentStatus,
            }))
        );
        break;

      case 'delete':
        result = await prisma.shipment.deleteMany({
          where: { id: { in: shipmentIds } },
        });
        break;

      case 'export':
        // Fetch shipments for export
        const shipments = await prisma.shipment.findMany({
          where: { id: { in: shipmentIds } },
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
            container: {
              select: {
                containerNumber: true,
                vesselName: true,
                status: true,
              },
            },
          },
        });

        return NextResponse.json({
          message: 'Shipments exported successfully',
          data: shipments,
          count: shipments.length,
        });

      default:
        return NextResponse.json(
          { message: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      message: `Bulk ${action} completed successfully`,
      count: result?.count || 0,
    });
  } catch (error) {
    console.error('Error performing bulk operation:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

