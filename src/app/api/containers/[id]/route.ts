import { NextRequest, NextResponse } from 'next/server';
import { NotificationType } from '@prisma/client';
import { companySupportsRole } from '@/lib/company-roles';
import { routeDeps } from '@/lib/route-deps';
import { z } from 'zod';
import { sendShipmentWorkflowNotifications } from '@/lib/workflow-notifications';
import { ensureWorkflowMoveAllowed, isClosedStageOverrideAllowed } from '@/lib/workflow-access';

// Schema for updating container
const updateContainerSchema = z.object({
  companyId: z.string().min(1).optional(),
  trackingNumber: z.string().optional(),
  vesselName: z.string().optional(),
  voyageNumber: z.string().optional(),
  shippingLine: z.string().optional(),
  bookingNumber: z.string().optional(),
  loadingPort: z.string().optional(),
  destinationPort: z.string().optional(),
  transshipmentPorts: z.array(z.string()).optional(),
  loadingDate: z.string().optional(),
  departureDate: z.string().optional(),
  estimatedArrival: z.string().optional(),
  actualArrival: z.string().optional(),
  status: z.enum([
    'CREATED',
    'WAITING_FOR_LOADING',
    'LOADED',
    'IN_TRANSIT',
    'ARRIVED_PORT',
    'CUSTOMS_CLEARANCE',
    'RELEASED',
    'CLOSED',
  ]).optional(),
  currentLocation: z.string().optional(),
  progress: z.number().int().min(0).max(100).optional(),
  notes: z.string().optional(),
  autoTrackingEnabled: z.boolean().optional(),
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

// GET - Fetch single container with full details
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await routeDeps.auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const container = await routeDeps.prisma.container.findUnique({
      where: { id: params.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        shipments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        expenses: {
          orderBy: { date: 'desc' },
        },
        damages: {
          include: {
            shipment: {
              select: {
                id: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleVIN: true,
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        invoices: {
          orderBy: { date: 'desc' },
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
        },
        trackingEvents: {
          orderBy: { eventDate: 'desc' },
          take: 20,
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        userInvoices: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            _count: {
              select: { lineItems: true },
            },
          },
          orderBy: { issueDate: 'desc' },
        },
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    // Role-based access control
    const canReadAllContainers = routeDeps.hasPermission(session.user?.role, 'containers:read_all');

    if (!canReadAllContainers) {
      // Check if user has any shipments in this container
      const userShipments = container.shipments.filter(s => s.userId === session.user.id);
      
      if (userShipments.length === 0) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      // Filter sensitive data for non-admins
      container.expenses = [];
      (container as any).damages = [];
      container.invoices = [];
      container.auditLogs = [];
      container.shipments = userShipments;
      // Filter documents if needed (e.g. only public ones), but keeping all for now as container docs are usually shared
    }

    // Auto-sync tracking if enabled and has tracking number
    if (canReadAllContainers && container.autoTrackingEnabled && container.trackingNumber) {
      try {
        const { trackingSync } = await import('@/lib/services/tracking-sync');
        const syncResult = await trackingSync.syncContainerTracking(params.id);
        
        if (syncResult.newEvents > 0) {
          routeDeps.logger.info(`Synced ${syncResult.newEvents} new tracking events for container ${params.id}`);
          
          // Re-fetch container with updated tracking events
          const updatedContainer = await routeDeps.prisma.container.findUnique({
            where: { id: params.id },
            include: {
              company: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
              shipments: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
              expenses: {
                orderBy: { date: 'desc' },
              },
              invoices: {
                orderBy: { date: 'desc' },
              },
              documents: {
                orderBy: { uploadedAt: 'desc' },
              },
              trackingEvents: {
                orderBy: { eventDate: 'desc' },
                take: 20,
              },
              auditLogs: {
                orderBy: { timestamp: 'desc' },
                take: 50,
              },
              userInvoices: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                  _count: {
                    select: { lineItems: true },
                  },
                },
                orderBy: { issueDate: 'desc' },
              },
            },
          });
          
          if (updatedContainer) {
            Object.assign(container, updatedContainer);
          }
        }
      } catch (syncError) {
        routeDeps.logger.error('Error auto-syncing tracking:', syncError);
        // Continue even if sync fails
      }
    }

    if (canReadAllContainers) {
      const shipmentExpenses = await routeDeps.prisma.ledgerEntry.findMany({
        where: {
          shipment: {
            containerId: params.id,
          },
          type: 'DEBIT',
        },
        select: {
          id: true,
          shipmentId: true,
          amount: true,
          description: true,
          transactionDate: true,
          metadata: true,
          shipment: {
            select: {
              vehicleMake: true,
              vehicleModel: true,
              vehicleVIN: true,
            },
          },
        },
        orderBy: {
          transactionDate: 'desc',
        },
      });

      const filteredShipmentExpenses = shipmentExpenses.filter((entry) => {
        const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
        const isExpense = metadata.isExpense === true;
        const expenseSource = typeof metadata.expenseSource === 'string' ? metadata.expenseSource.toUpperCase() : undefined;
        const isContainerExpense = metadata.isContainerExpense === true;

        // Include shipment-expense debits, but explicitly exclude container allocations.
        return (isExpense || expenseSource === 'SHIPMENT') && !isContainerExpense;
      });

      const mappedShipmentExpenses = filteredShipmentExpenses.map((entry) => {
        const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
        const expenseType = typeof metadata.expenseType === 'string' ? metadata.expenseType : 'SHIPMENT_EXPENSE';
        const vehicleLabel = [entry.shipment?.vehicleMake, entry.shipment?.vehicleModel].filter(Boolean).join(' ').trim();
        const vinLabel = entry.shipment?.vehicleVIN ? ` (${entry.shipment.vehicleVIN})` : '';

        return {
          id: `shipment-${entry.id}`,
          shipmentId: entry.shipmentId,
          type: expenseType,
          amount: entry.amount,
          currency: 'USD',
          date: entry.transactionDate,
          vendor: vehicleLabel ? `${vehicleLabel}${vinLabel}` : 'Shipment expense',
          description: entry.description,
          source: 'SHIPMENT',
        };
      });

      (container as any).expenses = [
        ...container.expenses,
        ...mappedShipmentExpenses,
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }

    // Calculate totals
    const totalExpenses = canReadAllContainers ? (container as any).expenses.reduce((sum: number, exp: { amount: number }) => sum + exp.amount, 0) : 0;
    const totalInvoices = canReadAllContainers ? container.invoices.reduce((sum, inv) => sum + inv.amount, 0) : 0;
    const currentCount = container.shipments.length; // This will reflect the filtered count for users? No, container.currentCount is from DB property usually, or I should use shipments.length.
    // Wait, `container.currentCount` property exists on the model (synced).
    // If I use `container.shipments.length`, it will be 1 for user, but the container physically has 4.
    // The user should probably see the physical fullness (e.g. 4/4), so using the model's `currentCount` (if available) or the original unfiltered length would be better.
    // However, I've already mutated `container.shipments`.
    
    // Let's use the DB property `currentCount` if it exists (it does in schema), otherwise use the count.
    // The `container` object from `findUnique` has `currentCount`. I haven't mutated that scalar field, only the relations.
    // So `container.currentCount` is safe.

    return NextResponse.json({
      container: {
        ...container,
        // currentCount is already in ...container
        totals: {
          expenses: totalExpenses,
          invoices: totalInvoices,
        },
      },
    });
  } catch (error) {
    routeDeps.logger.error('Error fetching container:', error);
    return NextResponse.json(
      { error: 'Failed to fetch container' },
      { status: 500 }
    );
  }
}

// PATCH - Update container
export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await routeDeps.auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ensureWorkflowMoveAllowed(session.user?.role) || !routeDeps.hasPermission(session.user?.role, 'containers:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const container = await routeDeps.prisma.container.findUnique({
      where: { id: params.id },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    if (container.status === 'CLOSED' && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Closed container stages can only be overridden by admins' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateContainerSchema.parse(body);

    if (validatedData.companyId !== undefined) {
      const company = await routeDeps.prisma.company.findUnique({
        where: { id: validatedData.companyId },
        select: { id: true, isActive: true, companyType: true, isShipping: true },
      });

      if (!company || !company.isActive || !companySupportsRole(company, 'SHIPPING')) {
        return NextResponse.json(
          { error: 'Valid active shipping company is required for container assignment' },
          { status: 400 }
        );
      }
    }

    // Parse dates if provided
    const updateData: Record<string, unknown> = { ...validatedData };
    if (validatedData.loadingDate) {
      updateData.loadingDate = new Date(validatedData.loadingDate);
    }
    if (validatedData.departureDate) {
      updateData.departureDate = new Date(validatedData.departureDate);
    }
    if (validatedData.estimatedArrival) {
      updateData.estimatedArrival = new Date(validatedData.estimatedArrival);
    }
    if (validatedData.actualArrival) {
      updateData.actualArrival = new Date(validatedData.actualArrival);
    }

    // Update container
    const updatedContainer = await routeDeps.prisma.container.update({
      where: { id: params.id },
      data: updateData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        shipments: true,
        _count: {
          select: {
            shipments: true,
            expenses: true,
            invoices: true,
            documents: true,
          },
        },
      },
    });

    // Auto-generate invoice if status changed to RELEASED or CLOSED
    if (
      validatedData.status &&
      (validatedData.status === 'RELEASED' || validatedData.status === 'CLOSED') &&
      container.status !== validatedData.status
    ) {
      try {
        const { autoInvoice } = await import('@/lib/services/auto-invoice');
        const invoiceResult = await autoInvoice.generateInvoiceForContainer(params.id);
        
        if (invoiceResult.success) {
          routeDeps.logger.info(`Auto-generated invoice for container ${params.id}: ${invoiceResult.message}`);
        } else {
          routeDeps.logger.info(`Invoice not generated for container ${params.id}: ${invoiceResult.message}`);
        }
      } catch (error) {
        routeDeps.logger.error('Error auto-generating invoice:', error);
        // Don't fail the status update if invoice generation fails
      }
    }

    // Create audit logs for significant changes
    const auditLogs = [];

    if (validatedData.status && validatedData.status !== container.status) {
      auditLogs.push({
        containerId: container.id,
        action: 'STATUS_CHANGE',
        description: `Status changed from ${container.status} to ${validatedData.status}`,
        performedBy: session.user.id as string,
        oldValue: container.status,
        newValue: validatedData.status,
      });

      try {
        const formattedStatus = validatedData.status
          .replace(/_/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (char) => char.toUpperCase());
        const uniqueUserIds = Array.from(
          new Set(updatedContainer.shipments.map((shipment) => shipment.userId))
        );

        await routeDeps.createNotifications(
          uniqueUserIds.map((userId) => ({
            userId,
            senderId: session.user.id,
            title: 'Container status updated',
            description: `Container ${updatedContainer.containerNumber} is now ${formattedStatus}.`,
            type: NotificationType.INFO,
            link: `/dashboard/containers/${updatedContainer.id}`,
          }))
        );
      } catch (notificationError) {
        routeDeps.logger.error('Failed to create container status notifications:', notificationError);
      }

      try {
        // Cascade status to shipments
        if (validatedData.status === 'LOADED' || validatedData.status === 'IN_TRANSIT') {
          await routeDeps.prisma.shipment.updateMany({
            where: { containerId: container.id, transitId: null },
            data: { status: 'IN_TRANSIT' },
          });
        } else if (validatedData.status === 'ARRIVED_PORT') {
          // When container arrives at port, shipments are available at destination facility.
          await routeDeps.prisma.shipment.updateMany({
              where: { containerId: container.id, transitId: null },
              data: { status: 'ON_HAND' },
          });
        } else if (validatedData.status === 'RELEASED') {
          // Released shipments are now eligible for transit assignment.
          await routeDeps.prisma.shipment.updateMany({
              where: { containerId: container.id, transitId: null },
              data: { status: 'RELEASED' },
          });

          await sendShipmentWorkflowNotifications(
            session.user.id as string,
            updatedContainer.shipments
              .filter((shipment) => shipment.transitId === null)
              .map((shipment) => ({
                shipmentId: shipment.id,
                shipmentUserId: shipment.userId,
                title: 'Shipment workflow updated',
                customerDescription: `Your shipment ${buildShipmentLabel(shipment)} has been released from container ${updatedContainer.containerNumber} and is ready for destination transit.`,
                internalDescription: `Shipment ${buildShipmentLabel(shipment)} was released from container ${updatedContainer.containerNumber}.`,
                link: `/dashboard/shipments/${shipment.id}`,
              })),
            { prisma: routeDeps.prisma, createNotificationsFn: routeDeps.createNotifications },
          );
        } else if (validatedData.status === 'CLOSED') {
          // When container is closed, it means the shipments have been delivered to customers
          await routeDeps.prisma.shipment.updateMany({
              where: { containerId: container.id, transitId: null },
              data: { status: 'DELIVERED' },
          });

          await sendShipmentWorkflowNotifications(
            session.user.id as string,
            updatedContainer.shipments
              .filter((shipment) => shipment.transitId === null)
              .map((shipment) => ({
                shipmentId: shipment.id,
                shipmentUserId: shipment.userId,
                title: 'Shipment workflow updated',
                customerDescription: `Your shipment ${buildShipmentLabel(shipment)} has been delivered and the container ${updatedContainer.containerNumber} is now closed.`,
                internalDescription: `Shipment ${buildShipmentLabel(shipment)} was marked delivered when container ${updatedContainer.containerNumber} was closed.`,
                link: `/dashboard/shipments/${shipment.id}`,
              })),
            { prisma: routeDeps.prisma, createNotificationsFn: routeDeps.createNotifications },
          );
        }
      } catch (statusSideEffectError) {
        routeDeps.logger.error('Container status updated, but shipment cascade/notifications failed:', statusSideEffectError);
      }
    }

    if (validatedData.estimatedArrival && validatedData.estimatedArrival !== container.estimatedArrival?.toISOString()) {
      auditLogs.push({
        containerId: container.id,
        action: 'ETA_UPDATED',
        description: `ETA updated to ${validatedData.estimatedArrival}`,
        performedBy: session.user.id as string,
        oldValue: container.estimatedArrival?.toISOString() || null,
        newValue: validatedData.estimatedArrival,
      });
    }

    // Bulk create audit logs
    if (auditLogs.length > 0) {
      try {
        await routeDeps.prisma.containerAuditLog.createMany({
          data: auditLogs,
        });
      } catch (auditError) {
        routeDeps.logger.error('Container updated, but audit log creation failed:', auditError);
      }
    }

    return NextResponse.json({
      container: updatedContainer,
      message: 'Container updated successfully',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }
    routeDeps.logger.error('Error updating container:', error);
    return NextResponse.json(
      { error: 'Failed to update container' },
      { status: 500 }
    );
  }
}

// DELETE - Delete container
export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const session = await routeDeps.auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!routeDeps.hasPermission(session.user?.role, 'containers:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const container = await routeDeps.prisma.container.findUnique({
      where: { id: params.id },
      include: {
        shipments: true,
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    // Check if container has shipments
    if (container.shipments.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete container with assigned shipments. Remove shipments first.' },
        { status: 400 }
      );
    }

    // Delete container (cascade will delete related records)
    await routeDeps.prisma.container.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Container deleted successfully',
    });
  } catch (error) {
    routeDeps.logger.error('Error deleting container:', error);
    return NextResponse.json(
      { error: 'Failed to delete container' },
      { status: 500 }
    );
  }
}
