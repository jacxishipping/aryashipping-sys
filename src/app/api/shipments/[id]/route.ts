import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TitleStatus, NotificationType } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { createNotification } from '@/lib/notifications';
import { createShipmentAuditLogs } from '@/lib/entity-audit-history';
import { hasPermission } from '@/lib/rbac';
import { validateManualShipmentWorkflowUpdate } from '@/lib/shipment-workflow';
import { getShipmentWorkflowStage } from '@/lib/shipment-workflow-stage';
import { sendShipmentWorkflowNotifications } from '@/lib/workflow-notifications';
import { buildUnifiedShipmentTimeline } from '@/lib/shipment-timeline';
import { calculateCompanyPaymentStatus } from '@/lib/company-payment-status';

type UpdateShipmentPayload = {
  userId?: string;
  serviceType?: 'PURCHASE_AND_SHIPPING' | 'SHIPPING_ONLY';
  vehicleType?: string;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleYear?: number | string | null;
  vehicleVIN?: string | null;
  vehicleColor?: string | null;
  lotNumber?: string | null;
  auctionName?: string | null;
  status?: 'ON_HAND' | 'DISPATCHING' | 'IN_TRANSIT' | 'RELEASED' | 'IN_TRANSIT_TO_DESTINATION';
  containerId?: string | null;
  arrivalPhotos?: string[] | null;
  vehiclePhotos?: string[] | null;
  replacePhotos?: boolean;
  weight?: number | string | null;
  dimensions?: string | null;
  purchasePrice?: number | string | null;
  purchaseDate?: string | null;
  purchaseLocation?: string | null;
  dealerName?: string | null;
  purchaseNotes?: string | null;
  paymentMode?: 'CASH' | 'DUE' | null;
  specialInstructions?: string | null;
  internalNotes?: string | null;
  hasKey?: boolean | null;
  hasTitle?: boolean | null;
  titleStatus?: string | null;
};

function buildShipmentLabel(shipment: {
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleType?: string | null;
  vehicleVIN?: string | null;
  id: string;
}) {
  const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (shipment.vehicleVIN && vehicleLabel) {
    return `${vehicleLabel} (${shipment.vehicleVIN})`;
  }

  return shipment.vehicleVIN || vehicleLabel || shipment.vehicleType || shipment.id;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const canReadAllShipments = hasPermission(session.user?.role, 'shipments:read_all');
    const canViewCompanyLedgerComparison =
      hasPermission(session.user?.role, 'finance:view') ||
      hasPermission(session.user?.role, 'finance:manage') ||
      canReadAllShipments;
    const canViewAuditHistory = canReadAllShipments;
    const canViewWorkflowCompanyDetails = canReadAllShipments;
    const canUseCompanyGetpass =
      hasPermission(session.user?.role, 'workflow:move') &&
      hasPermission(session.user?.role, 'shipments:manage');

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      select: {
        id: true,
        serviceType: true,
        purchasePrice: true,
        vehicleType: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleYear: true,
        vehicleVIN: true,
        vehicleColor: true,
        lotNumber: true,
        auctionName: true,
        hasKey: true,
        hasTitle: true,
        titleStatus: true,
        vehicleAge: true,
        weight: true,
        dimensions: true,
        arrivalPhotos: true,
        vehiclePhotos: true,
        status: true,
        dispatchId: true,
        containerId: true,
        transitId: true,
        userId: true,
        internalNotes: true,
        paymentStatus: true,
        paymentMode: true,
        releaseToken: true,
        releaseTokenCreatedAt: true,
        companyGetpassStartedAt: true,
        companyGetpassCompletedAt: true,
        companyGetpassDurationSeconds: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            country: true,
          },
        },
        container: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
              },
            },
            trackingEvents: {
              orderBy: {
                eventDate: 'desc',
              },
              take: 10,
            },
          },
        },
        shippingCompany: {
          select: {
            id: true,
            name: true,
          },
        },
        dispatch: {
          include: {
            company: { select: { id: true, name: true } },
          },
        },
        transit: {
          include: {
            events: {
              orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
              take: 1,
              include: {
                company: { select: { id: true, name: true } },
              },
            },
          },
        },
        documents: true,
        ledgerEntries: {
          select: {
            id: true,
            transactionDate: true,
            description: true,
            type: true,
            amount: true,
            balance: true,
            notes: true,
            metadata: true,
          },
          orderBy: {
            transactionDate: 'desc',
          },
        },
        containerDamages: {
          select: {
            id: true,
            containerId: true,
            damageType: true,
            amount: true,
            description: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        auditLogs: canViewAuditHistory
          ? {
              select: {
                id: true,
                action: true,
                description: true,
                performedBy: true,
                oldValue: true,
                newValue: true,
                timestamp: true,
                metadata: true,
              },
              orderBy: {
                timestamp: 'desc',
              },
              take: 50,
            }
          : false,
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { message: 'Shipment not found' },
        { status: 404 }
      );
    }

    // Regular users can only see their own shipments
    if (!canReadAllShipments && shipment.userId !== session.user?.id) {
      return NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      );
    }

    const companyLedgerEntryWhere: Prisma.CompanyLedgerEntryWhereInput = {
      OR: [
        { metadata: { path: ['shipmentId'], equals: id } },
        ...(shipment.containerId ? [{ metadata: { path: ['containerId'], equals: shipment.containerId } }] : []),
        ...(shipment.dispatchId ? [{ metadata: { path: ['dispatchId'], equals: shipment.dispatchId } }] : []),
        ...(shipment.transitId ? [{ metadata: { path: ['transitId'], equals: shipment.transitId } }] : []),
      ],
    };

    const companyLedgerEntries = canViewCompanyLedgerComparison
      ? await prisma.companyLedgerEntry.findMany({
          where: companyLedgerEntryWhere,
          select: {
            id: true,
            companyId: true,
            transactionDate: true,
            description: true,
            type: true,
            amount: true,
            balance: true,
            reference: true,
            notes: true,
            metadata: true,
            company: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
          orderBy: {
            transactionDate: 'desc',
          },
        })
      : [];
    const companyPaymentSummary = calculateCompanyPaymentStatus(companyLedgerEntries);

    const relatedDispatchIds = Array.from(
      new Set(
        [
          shipment.dispatchId,
          ...(shipment.auditLogs || []).map((log) => {
            const metadata =
              log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
                ? (log.metadata as Record<string, unknown>)
                : null;

            return typeof metadata?.dispatchId === 'string' ? metadata.dispatchId : null;
          }),
          ...shipment.ledgerEntries.map((entry) => {
            const metadata =
              entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
                ? (entry.metadata as Record<string, unknown>)
                : null;

            return typeof metadata?.dispatchId === 'string' ? metadata.dispatchId : null;
          }),
        ].filter((value): value is string => Boolean(value))
      )
    );

    const relatedContainerIds = Array.from(
      new Set(
        [
          shipment.containerId,
          ...shipment.containerDamages.map((damage) => damage.containerId),
          ...(shipment.auditLogs || []).flatMap((log) => {
            const metadata =
              log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
                ? (log.metadata as Record<string, unknown>)
                : null;

            return [
              typeof metadata?.oldContainerId === 'string' ? metadata.oldContainerId : null,
              typeof metadata?.newContainerId === 'string' ? metadata.newContainerId : null,
              typeof metadata?.containerId === 'string' ? metadata.containerId : null,
            ];
          }),
        ].filter((value): value is string => Boolean(value))
      )
    );

    const relatedTransitIds = Array.from(
      new Set(
        [
          shipment.transitId,
          ...shipment.ledgerEntries.map((entry) => {
            const metadata =
              entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
                ? (entry.metadata as Record<string, unknown>)
                : null;

            return typeof metadata?.transitId === 'string' ? metadata.transitId : null;
          }),
        ].filter((value): value is string => Boolean(value))
      )
    );

    const [dispatches, relatedContainers, transits] = await Promise.all([
      relatedDispatchIds.length
        ? prisma.dispatch.findMany({
            where: { id: { in: relatedDispatchIds } },
            select: {
              id: true,
              referenceNumber: true,
              events: {
                select: {
                  id: true,
                  status: true,
                  location: true,
                  description: true,
                  eventDate: true,
                  createdBy: true,
                },
                orderBy: { eventDate: 'desc' },
                take: 50,
              },
            },
          })
        : Promise.resolve([]),
      relatedContainerIds.length
        ? prisma.container.findMany({
            where: { id: { in: relatedContainerIds } },
            select: {
              id: true,
              containerNumber: true,
              trackingEvents: {
                select: {
                  id: true,
                  status: true,
                  location: true,
                  description: true,
                  eventDate: true,
                  source: true,
                  completed: true,
                },
                orderBy: { eventDate: 'desc' },
                take: 50,
              },
              auditLogs: {
                select: {
                  id: true,
                  action: true,
                  description: true,
                  performedBy: true,
                  oldValue: true,
                  newValue: true,
                  metadata: true,
                  timestamp: true,
                },
                orderBy: { timestamp: 'desc' },
                take: 50,
              },
            },
          })
        : Promise.resolve([]),
      relatedTransitIds.length
        ? prisma.transit.findMany({
            where: { id: { in: relatedTransitIds } },
            select: {
              id: true,
              referenceNumber: true,
              events: {
                select: {
                  id: true,
                  status: true,
                  location: true,
                  description: true,
                  eventDate: true,
                  createdBy: true,
                },
                orderBy: { eventDate: 'desc' },
                take: 50,
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const userIds = canViewAuditHistory
      ? Array.from(
          new Set(
            [
              ...(shipment.auditLogs || []).flatMap((log) => {
                const reassignmentUserIds =
                  log.action === 'USER_REASSIGNED'
                    ? [log.oldValue, log.newValue].filter((value): value is string => Boolean(value))
                    : [];

                return [log.performedBy, ...reassignmentUserIds].filter((value): value is string => Boolean(value));
              }),
              ...dispatches.flatMap((dispatch) => dispatch.events.map((event) => event.createdBy)),
              ...relatedContainers.flatMap((container) => container.auditLogs.map((log) => log.performedBy)),
              ...transits.flatMap((transit) => transit.events.map((event) => event.createdBy)),
            ]
          )
        )
      : [];

    const actors = userIds.length
      ? await prisma.user.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            id: true,
            name: true,
            email: true,
          },
        })
      : [];

    const actorMap = new Map(
      actors.map((actor) => [actor.id, actor.name?.trim() || actor.email || actor.id])
    );

    const containerIds = canViewAuditHistory
      ? Array.from(
          new Set(
            (shipment.auditLogs || [])
              .flatMap((log) => {
                const metadata =
                  log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
                    ? (log.metadata as Record<string, unknown>)
                    : null;

                return [
                  typeof metadata?.oldContainerId === 'string' ? metadata.oldContainerId : null,
                  typeof metadata?.newContainerId === 'string' ? metadata.newContainerId : null,
                  typeof metadata?.containerId === 'string' ? metadata.containerId : null,
                ].filter((value): value is string => Boolean(value));
              })
          )
        )
      : [];

    const containers = containerIds.length
      ? await prisma.container.findMany({
          where: {
            id: {
              in: containerIds,
            },
          },
          select: {
            id: true,
            containerNumber: true,
          },
        })
      : [];

    const containerMap = new Map(
      containers.map((container) => [container.id, container.containerNumber])
    );

    const auditLogs = canViewAuditHistory
      ? (shipment.auditLogs || []).map((log) => {
          const metadata =
            log.metadata && typeof log.metadata === 'object' && !Array.isArray(log.metadata)
              ? { ...(log.metadata as Record<string, unknown>) }
              : log.metadata;

          if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
            const oldContainerId = typeof metadata.oldContainerId === 'string' ? metadata.oldContainerId : null;
            const newContainerId = typeof metadata.newContainerId === 'string' ? metadata.newContainerId : null;
            const containerId = typeof metadata.containerId === 'string' ? metadata.containerId : null;

            if (oldContainerId && containerMap.has(oldContainerId)) {
              metadata.oldContainerNumber = containerMap.get(oldContainerId);
            }

            if (newContainerId && containerMap.has(newContainerId)) {
              metadata.newContainerNumber = containerMap.get(newContainerId);
            }

            if (containerId && containerMap.has(containerId)) {
              metadata.containerNumber = containerMap.get(containerId);
            }

            if (log.action === 'USER_REASSIGNED') {
              if (typeof log.oldValue === 'string' && actorMap.has(log.oldValue)) {
                metadata.oldUserLabel = actorMap.get(log.oldValue);
              }

              if (typeof log.newValue === 'string' && actorMap.has(log.newValue)) {
                metadata.newUserLabel = actorMap.get(log.newValue);
              }
            }
          }

          const oldValue =
            log.action === 'USER_REASSIGNED' && typeof log.oldValue === 'string'
              ? actorMap.get(log.oldValue) || log.oldValue
              : log.oldValue;

          const newValue =
            log.action === 'USER_REASSIGNED' && typeof log.newValue === 'string'
              ? actorMap.get(log.newValue) || log.newValue
              : log.newValue;

          return {
            id: log.id,
            action: log.action,
            description: log.description,
            performedBy: actorMap.get(log.performedBy) || log.performedBy,
            oldValue,
            newValue,
            timestamp: log.timestamp,
            metadata,
          };
        })
      : [];

    const unifiedTimeline = buildUnifiedShipmentTimeline({
      shipmentAuditLogs: auditLogs,
      dispatchEvents: dispatches.flatMap((dispatch) =>
        dispatch.events.map((event) => ({
          ...event,
          dispatchReference: dispatch.referenceNumber,
          createdByLabel: actorMap.get(event.createdBy) || event.createdBy,
        }))
      ),
      containerTrackingEvents: relatedContainers.flatMap((container) =>
        container.trackingEvents.map((event) => ({
          ...event,
          containerNumber: container.containerNumber,
        }))
      ),
      containerAuditLogs: relatedContainers.flatMap((container) =>
        container.auditLogs.map((log) => ({
          ...log,
          containerNumber: container.containerNumber,
          performedByLabel: actorMap.get(log.performedBy) || log.performedBy,
        }))
      ),
      transitEvents: transits.flatMap((transit) =>
        transit.events.map((event) => ({
          ...event,
          transitReference: transit.referenceNumber,
          createdByLabel: actorMap.get(event.createdBy) || event.createdBy,
        }))
      ),
      customerLedgerEntries: shipment.ledgerEntries,
      companyLedgerEntries,
      containerDamages: shipment.containerDamages,
    });

    const currentTransitEvent = shipment.transit?.events[0] ?? null;
    const companyGetpassCompany = shipment.shippingCompany || shipment.container?.company || null;
    const visibleDocuments = canReadAllShipments
      ? shipment.documents
      : shipment.documents.filter((document) => document.isPublic);

    return NextResponse.json(
      {
        shipment: {
          ...shipment,
          documents: visibleDocuments,
          internalNotes: canReadAllShipments ? shipment.internalNotes : null,
          shippingCompany:
            canViewWorkflowCompanyDetails || canUseCompanyGetpass || canViewCompanyLedgerComparison ? companyGetpassCompany : null,
          container: shipment.container
            ? {
                ...shipment.container,
                shippingLine: canViewWorkflowCompanyDetails ? shipment.container.shippingLine : null,
              }
            : null,
          dispatch: shipment.dispatch
            ? {
                ...shipment.dispatch,
                company: canViewWorkflowCompanyDetails || canViewCompanyLedgerComparison ? shipment.dispatch.company : null,
              }
            : null,
          transit: shipment.transit
            ? {
                id: shipment.transit.id,
                referenceNumber: shipment.transit.referenceNumber,
                origin: shipment.transit.origin,
                destination: shipment.transit.destination,
                status: shipment.transit.status,
                currentEvent: currentTransitEvent
                  ? {
                      id: currentTransitEvent.id,
                      companyId: canViewWorkflowCompanyDetails ? currentTransitEvent.companyId : null,
                      origin: currentTransitEvent.origin,
                      destination: currentTransitEvent.destination,
                      status: currentTransitEvent.status,
                    }
                  : null,
                currentCompany: canViewWorkflowCompanyDetails || canViewCompanyLedgerComparison ? currentTransitEvent?.company ?? null : null,
              }
            : null,
          companyLedgerEntries,
          companyPaymentSummary,
          auditLogs,
          unifiedTimeline,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching shipment:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const actorId = session.user?.id;
    if (!actorId) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user?.role, 'shipments:manage')) {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can update shipments' },
        { status: 403 }
      );
    }

    const existingShipment = await prisma.shipment.findUnique({
      where: { id },
      include: { dispatch: true, container: true },
    });

    if (!existingShipment) {
      return NextResponse.json(
        { message: 'Shipment not found' },
        { status: 404 }
      );
    }

    const data = (await request.json()) as UpdateShipmentPayload;
    const updateData: Prisma.ShipmentUpdateInput = {};

    const workflowValidationError = validateManualShipmentWorkflowUpdate(existingShipment, {
      status: data.status,
      dispatchId: existingShipment.dispatchId,
      containerId: data.containerId,
    });

    if (workflowValidationError) {
      return NextResponse.json(
        { message: workflowValidationError },
        { status: 400 }
      );
    }

    // Basic vehicle info
    if (data.userId !== undefined) updateData.user = { connect: { id: data.userId } };
    if (data.serviceType !== undefined) updateData.serviceType = data.serviceType;
    if (data.vehicleType !== undefined) updateData.vehicleType = data.vehicleType;
    if (data.vehicleMake !== undefined) updateData.vehicleMake = data.vehicleMake;
    if (data.vehicleModel !== undefined) updateData.vehicleModel = data.vehicleModel;
    if (data.vehicleColor !== undefined) updateData.vehicleColor = data.vehicleColor;
    if (data.vehicleVIN !== undefined) updateData.vehicleVIN = data.vehicleVIN;
    if (data.lotNumber !== undefined) updateData.lotNumber = data.lotNumber;
    if (data.auctionName !== undefined) updateData.auctionName = data.auctionName;

    // Parse year and calculate age
    if (data.vehicleYear !== undefined) {
      const parsedYear =
        typeof data.vehicleYear === 'number'
          ? data.vehicleYear
          : typeof data.vehicleYear === 'string'
          ? parseInt(data.vehicleYear, 10)
          : null;
      updateData.vehicleYear = parsedYear;
      if (parsedYear) {
        updateData.vehicleAge = new Date().getFullYear() - parsedYear;
      }
    }

    // Container and status
    if (data.status !== undefined) {
      updateData.status = data.status;
      
      // If changing to ON_HAND, remove container
      if (data.status === 'ON_HAND') {
        updateData.container = { disconnect: true };
      }
    }

    if (data.containerId !== undefined) {
      if (data.containerId) {
        // Verify container exists
        const container = await prisma.container.findUnique({
          where: { id: data.containerId },
          include: { shipments: true },
        });

        if (!container) {
          return NextResponse.json(
            { message: 'Container not found' },
            { status: 404 }
          );
        }

        // Check capacity
        const currentShipments = container.shipments.filter(s => s.id !== id);
        if (currentShipments.length >= container.maxCapacity) {
          return NextResponse.json(
            { message: `Container is at full capacity (${container.maxCapacity} vehicles)` },
            { status: 400 }
          );
        }

        updateData.container = { connect: { id: data.containerId } };
        updateData.status = 'IN_TRANSIT'; // Auto-set to IN_TRANSIT when assigning container
      } else {
        updateData.container = { disconnect: true };
        updateData.status = 'ON_HAND'; // Auto-set to ON_HAND when removing container
      }
    }

    // Photos
    if (data.vehiclePhotos !== undefined) {
      if (data.replacePhotos) {
        updateData.vehiclePhotos = { set: data.vehiclePhotos || [] };
      } else {
        const currentPhotos = (existingShipment.vehiclePhotos as string[]) || [];
        updateData.vehiclePhotos = { set: [...currentPhotos, ...(data.vehiclePhotos || [])] };
      }
    }

    if (data.arrivalPhotos !== undefined) {
      if (data.replacePhotos) {
        updateData.arrivalPhotos = { set: data.arrivalPhotos || [] };
      } else {
        const currentPhotos = (existingShipment.arrivalPhotos as string[]) || [];
        updateData.arrivalPhotos = { set: [...currentPhotos, ...(data.arrivalPhotos || [])] };
      }
    }

    // Numeric fields
    if (data.weight !== undefined) {
      updateData.weight =
        typeof data.weight === 'number'
          ? data.weight
          : typeof data.weight === 'string'
          ? parseFloat(data.weight)
          : null;
    }

    if (data.purchasePrice !== undefined) {
      updateData.purchasePrice =
        typeof data.purchasePrice === 'number'
          ? data.purchasePrice
          : typeof data.purchasePrice === 'string'
          ? parseFloat(data.purchasePrice)
          : null;
    }

    // Other fields
    if (data.dimensions !== undefined) updateData.dimensions = data.dimensions;
    if (data.purchaseDate !== undefined) {
      updateData.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null;
    }
    if (data.purchaseLocation !== undefined) updateData.purchaseLocation = data.purchaseLocation;
    if (data.dealerName !== undefined) updateData.dealerName = data.dealerName;
    if (data.purchaseNotes !== undefined) updateData.purchaseNotes = data.purchaseNotes;
    if (data.paymentMode !== undefined) updateData.paymentMode = data.paymentMode;
    if (data.internalNotes !== undefined) updateData.internalNotes = data.internalNotes;
    if (data.hasKey !== undefined) updateData.hasKey = data.hasKey;
    if (data.hasTitle !== undefined) updateData.hasTitle = data.hasTitle;
    
    // Title status
    if (data.titleStatus !== undefined) {
      updateData.titleStatus = (data.hasTitle === true && data.titleStatus) ? data.titleStatus as TitleStatus : null;
    }

    const updatedShipment = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
          container: true,
        },
      });

      return shipment;
    });

    const shipmentAuditLogs = [];

    if (updatedShipment.status !== existingShipment.status) {
      shipmentAuditLogs.push({
        shipmentId: updatedShipment.id,
        action: 'STATUS_CHANGE',
        description: `Shipment status changed from ${existingShipment.status} to ${updatedShipment.status}`,
        performedBy: actorId,
        oldValue: existingShipment.status,
        newValue: updatedShipment.status,
      });
    }

    if (updatedShipment.containerId !== existingShipment.containerId) {
      shipmentAuditLogs.push({
        shipmentId: updatedShipment.id,
        action: updatedShipment.containerId ? 'CONTAINER_ASSIGNED' : 'CONTAINER_REMOVED',
        description: updatedShipment.containerId
          ? `Shipment assigned to container ${updatedShipment.containerId}`
          : 'Shipment removed from container',
        performedBy: actorId,
        oldValue: existingShipment.containerId,
        newValue: updatedShipment.containerId,
        metadata: {
          oldContainerId: existingShipment.containerId,
          newContainerId: updatedShipment.containerId,
        },
      });
    }

    if (updatedShipment.userId !== existingShipment.userId) {
      shipmentAuditLogs.push({
        shipmentId: updatedShipment.id,
        action: 'USER_REASSIGNED',
        description: 'Shipment ownership reassigned',
        performedBy: actorId,
        oldValue: existingShipment.userId,
        newValue: updatedShipment.userId,
      });
    }

    await createShipmentAuditLogs(shipmentAuditLogs);

    if (updatedShipment.status !== existingShipment.status) {
      const vehicleLabel = buildShipmentLabel(updatedShipment);
      const formattedStatus = updatedShipment.status
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (char) => char.toUpperCase());
      const isWorkflowStageNotification =
        updatedShipment.status === 'RELEASED' || updatedShipment.status === 'DELIVERED';

      try {
        if (isWorkflowStageNotification) {
          await sendShipmentWorkflowNotifications(
            actorId,
            [
              {
                shipmentId: updatedShipment.id,
                shipmentUserId: updatedShipment.userId,
                title: 'Shipment workflow updated',
                customerDescription:
                  updatedShipment.status === 'RELEASED'
                    ? `Your shipment ${vehicleLabel} has been released and is ready for destination transit.`
                    : `Your shipment ${vehicleLabel} has been delivered.`,
                internalDescription:
                  updatedShipment.status === 'RELEASED'
                    ? `Shipment ${vehicleLabel} was manually moved to released status.`
                    : `Shipment ${vehicleLabel} was manually marked as delivered.`,
                link: `/dashboard/shipments/${updatedShipment.id}`,
              },
            ],
            { prisma },
          );
        } else {
          await createNotification({
            userId: updatedShipment.userId,
            senderId: actorId,
            title: 'Shipment status updated',
            description: `Your shipment ${vehicleLabel} is now ${formattedStatus}.`,
            type: NotificationType.INFO,
            link: `/dashboard/shipments/${updatedShipment.id}`,
          });
        }
      } catch (notificationError) {
        console.error('Failed to create shipment notification:', notificationError);
      }
    }

    // Update container counts if container assignment changed
    if (data.containerId !== undefined && data.containerId !== existingShipment.containerId) {
      const countUpdates = [];

      // 1. Decrement old container count if it existed
      if (existingShipment.containerId) {
        countUpdates.push(
          prisma.container.update({
            where: { id: existingShipment.containerId },
            data: { currentCount: { decrement: 1 } }
          })
        );
      }

      // 2. Increment new container count if it exists (and is not null)
      if (data.containerId) {
        countUpdates.push(
          prisma.container.update({
            where: { id: data.containerId },
            data: { currentCount: { increment: 1 } }
          })
        );
      }

      // Execute independent container count updates in parallel for performance, avoiding O(N) count queries
      if (countUpdates.length > 0) {
        await Promise.all(countUpdates);
      }
    }

    return NextResponse.json(
      {
        message: 'Shipment updated successfully',
        shipment: updatedShipment,
      },
      { status: 200 }
    );
  } catch (error) {
    // ... (error handling)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user?.role, 'shipments:manage')) {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can delete shipments' },
        { status: 403 }
      );
    }

    const shipment = await prisma.shipment.findUnique({
      where: { id },
      include: {
        ledgerEntries: true,
      },
    });

    if (!shipment) {
      return NextResponse.json(
        { message: 'Shipment not found' },
        { status: 404 }
      );
    }

    // Check if shipment has ledger entries
    if (shipment.ledgerEntries.length > 0) {
      return NextResponse.json(
        { 
          message: 'Cannot delete shipment with financial records. Please delete ledger entries first or contact support.' 
        },
        { status: 400 }
      );
    }

    await prisma.shipment.delete({
      where: { id },
    });

    // Update container count if shipment was in a container
    if (shipment.containerId) {
      // Optimize performance by using atomic decrement instead of an O(N) count query
      await prisma.container.update({
        where: { id: shipment.containerId },
        data: { currentCount: { decrement: 1 } }
      });
    }

    return NextResponse.json(
      { message: 'Shipment deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    // ... (error handling)
  }
}
