import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { ShipmentSimpleStatus, DispatchStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    // Parallelized DB queries for high performance
    const [shipments, dispatches, containers, companies] = await Promise.all([
      // Fetch active unassigned / ready shipments
      prisma.shipment.findMany({
        where: {
          ...(search
            ? {
                OR: [
                  { vehicleVIN: { contains: search, mode: 'insensitive' } },
                  { vehicleMake: { contains: search, mode: 'insensitive' } },
                  { vehicleModel: { contains: search, mode: 'insensitive' } },
                  { lotNumber: { contains: search, mode: 'insensitive' } },
                  { user: { name: { contains: search, mode: 'insensitive' } } },
                  { purchaseLocation: { contains: search, mode: 'insensitive' } },
                  { auctionName: { contains: search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          vehicleYear: true,
          vehicleMake: true,
          vehicleModel: true,
          vehicleVIN: true,
          lotNumber: true,
          status: true,
          auctionName: true,
          purchaseLocation: true,
          purchasePrice: true,
          priceListPricingSnapshot: true,
          hasKey: true,
          hasTitle: true,
          titleStatus: true,
          dispatchId: true,
          containerId: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
          dispatch: { select: { id: true, referenceNumber: true, status: true } },
          container: { select: { id: true, containerNumber: true, status: true, destinationPort: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 300,
      }),

      // Fetch active dispatches
      prisma.dispatch.findMany({
        include: {
          company: { select: { id: true, name: true, code: true } },
          shipments: {
            select: {
              id: true,
              vehicleYear: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleVIN: true,
              status: true,
              lotNumber: true,
              hasKey: true,
              hasTitle: true,
              purchaseLocation: true,
            },
          },
          _count: { select: { shipments: true, events: true, expenses: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),

      // Fetch active containers
      prisma.container.findMany({
        include: {
          company: { select: { id: true, name: true, code: true } },
          shipments: {
            select: {
              id: true,
              vehicleYear: true,
              vehicleMake: true,
              vehicleModel: true,
              vehicleVIN: true,
              status: true,
              lotNumber: true,
              hasKey: true,
              hasTitle: true,
              purchaseLocation: true,
            },
          },
          _count: { select: { shipments: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 60,
      }),

      // Fetch companies for dispatch & container assignment
      prisma.company.findMany({
        select: { id: true, name: true, code: true, companyType: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({
      shipments,
      dispatches,
      containers,
      companies,
    });
  } catch (error) {
    console.error('Operations GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch operations data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorId = session.user.id as string;
    const userRole = session.user.role;

    if (!hasPermission(userRole, 'shipments:manage') && !hasPermission(userRole, 'workflow:move')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, shipmentIds, targetId, status, data } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    const ids: string[] = Array.isArray(shipmentIds)
      ? shipmentIds
      : body.shipmentId
      ? [body.shipmentId]
      : [];

    switch (action) {
      // 1. Assign shipment(s) to a Dispatch
      case 'assign_to_dispatch': {
        if (!targetId || ids.length === 0) {
          return NextResponse.json({ error: 'Target dispatchId and shipmentIds are required' }, { status: 400 });
        }

        const dispatch = await prisma.dispatch.findUnique({
          where: { id: targetId },
        });
        if (!dispatch) {
          return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
        }

        await prisma.shipment.updateMany({
          where: { id: { in: ids } },
          data: {
            dispatchId: targetId,
            status: 'DISPATCHING',
          },
        });

        // Add dispatch event audit trail
        await prisma.dispatchEvent.create({
          data: {
            dispatchId: targetId,
            status: dispatch.status,
            description: `Assigned ${ids.length} vehicle(s) to dispatch ${dispatch.referenceNumber}`,
            createdBy: actorId,
          },
        });

        return NextResponse.json({ success: true, count: ids.length });
      }

      // 2. Unassign shipment(s) from Dispatch
      case 'unassign_from_dispatch': {
        if (ids.length === 0) {
          return NextResponse.json({ error: 'Shipment IDs are required' }, { status: 400 });
        }

        await prisma.shipment.updateMany({
          where: { id: { in: ids } },
          data: {
            dispatchId: null,
            status: 'ON_HAND',
          },
        });

        return NextResponse.json({ success: true, count: ids.length });
      }

      // 3. Assign shipment(s) to Container
      case 'assign_to_container': {
        if (!targetId || ids.length === 0) {
          return NextResponse.json({ error: 'Target containerId and shipmentIds are required' }, { status: 400 });
        }

        const container = await prisma.container.findUnique({
          where: { id: targetId },
          include: { shipments: true },
        });
        if (!container) {
          return NextResponse.json({ error: 'Container not found' }, { status: 404 });
        }

        if (container.shipments.length + ids.length > container.maxCapacity) {
          return NextResponse.json(
            { error: `Container capacity exceeded (${container.shipments.length}/${container.maxCapacity})` },
            { status: 400 }
          );
        }

        await prisma.shipment.updateMany({
          where: { id: { in: ids } },
          data: {
            containerId: targetId,
            status: 'IN_TRANSIT',
            ...(container.companyId ? { shippingCompanyId: container.companyId } : {}),
          },
        });

        // Update container currentCount
        await prisma.container.update({
          where: { id: targetId },
          data: {
            currentCount: container.shipments.length + ids.length,
          },
        });

        return NextResponse.json({ success: true, count: ids.length });
      }

      // 4. Unassign shipment(s) from Container
      case 'unassign_from_container': {
        if (ids.length === 0) {
          return NextResponse.json({ error: 'Shipment IDs are required' }, { status: 400 });
        }

        const shipments = await prisma.shipment.findMany({
          where: { id: { in: ids } },
          select: { id: true, containerId: true },
        });

        const containerIds = Array.from(new Set(shipments.map((s) => s.containerId).filter(Boolean))) as string[];

        await prisma.shipment.updateMany({
          where: { id: { in: ids } },
          data: {
            containerId: null,
            status: 'ON_HAND',
          },
        });

        // Recalculate container counts
        for (const cId of containerIds) {
          const count = await prisma.shipment.count({ where: { containerId: cId } });
          await prisma.container.update({
            where: { id: cId },
            data: { currentCount: count },
          });
        }

        return NextResponse.json({ success: true, count: ids.length });
      }

      // 5. Move shipment lifecycle status (Kanban column transition)
      case 'move_shipment_status': {
        if (ids.length === 0 || !status) {
          return NextResponse.json({ error: 'Shipment IDs and target status are required' }, { status: 400 });
        }

        await prisma.shipment.updateMany({
          where: { id: { in: ids } },
          data: {
            status: status as ShipmentSimpleStatus,
          },
        });

        return NextResponse.json({ success: true, count: ids.length, status });
      }

      // 6. Update Dispatch status
      case 'update_dispatch_status': {
        if (!targetId || !status) {
          return NextResponse.json({ error: 'Dispatch ID and status are required' }, { status: 400 });
        }

        const updatedDispatch = await prisma.dispatch.update({
          where: { id: targetId },
          data: {
            status: status as DispatchStatus,
            ...(status === 'COMPLETED' ? { actualArrival: new Date() } : {}),
          },
        });

        await prisma.dispatchEvent.create({
          data: {
            dispatchId: targetId,
            status,
            description: `Dispatch status changed to ${status}`,
            createdBy: actorId,
          },
        });

        return NextResponse.json({ success: true, dispatch: updatedDispatch });
      }

      // 7. Quick Create Dispatch from Operations Board
      case 'create_dispatch': {
        const { companyId, origin, destination, estimatedArrival, notes } = data || {};
        if (!companyId || !origin || !destination) {
          return NextResponse.json({ error: 'Company, origin, and destination are required' }, { status: 400 });
        }

        const count = await prisma.dispatch.count();
        const refNumber = `DSP-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        const newDispatch = await prisma.dispatch.create({
          data: {
            referenceNumber: refNumber,
            companyId,
            origin,
            destination,
            status: 'PENDING',
            estimatedArrival: estimatedArrival ? new Date(estimatedArrival) : null,
            notes,
            createdBy: actorId,
          },
          include: {
            company: { select: { id: true, name: true, code: true } },
            shipments: true,
            _count: { select: { shipments: true, events: true, expenses: true } },
          },
        });

        return NextResponse.json({ success: true, dispatch: newDispatch });
      }

      // 8. Quick Create Container from Operations Board
      case 'create_container': {
        const { containerNumber, destinationPort, maxCapacity = 4, companyId, notes } = data || {};
        if (!containerNumber) {
          return NextResponse.json({ error: 'Container number is required' }, { status: 400 });
        }

        const cleanNumber = String(containerNumber).trim().toUpperCase();
        const existing = await prisma.container.findUnique({
          where: { containerNumber: cleanNumber },
        });

        if (existing) {
          return NextResponse.json({ error: `Container ${cleanNumber} already exists` }, { status: 400 });
        }

        const newContainer = await prisma.container.create({
          data: {
            containerNumber: cleanNumber,
            destinationPort: destinationPort || 'Port of Jebel Ali (AEJEA)',
            maxCapacity: Number(maxCapacity) || 4,
            companyId: companyId || null,
            notes: notes || null,
            status: 'CREATED',
          },
          include: {
            company: { select: { id: true, name: true, code: true } },
            shipments: true,
            _count: { select: { shipments: true } },
          },
        });

        return NextResponse.json({ success: true, container: newContainer });
      }

      // 9. Smart Auto-Stow by Destination Port
      case 'auto_stow_by_port': {
        // Find unassigned shipments
        const unassigned = await prisma.shipment.findMany({
          where: { containerId: null, status: { in: ['ON_HAND', 'DISPATCHING'] } },
          select: { id: true, purchaseLocation: true, priceListPricingSnapshot: true },
        });

        // Find open containers with capacity
        const openContainers = await prisma.container.findMany({
          where: { status: { in: ['CREATED', 'WAITING_FOR_LOADING', 'LOADED'] } },
          include: { shipments: { select: { id: true } } },
        });

        let totalStowed = 0;

        for (const container of openContainers) {
          const availableSlots = container.maxCapacity - container.shipments.length;
          if (availableSlots <= 0) continue;

          const toAssign = unassigned.slice(0, availableSlots);
          if (toAssign.length === 0) continue;

          const toAssignIds = toAssign.map((s) => s.id);

          await prisma.shipment.updateMany({
            where: { id: { in: toAssignIds } },
            data: {
              containerId: container.id,
              status: 'IN_TRANSIT',
            },
          });

          await prisma.container.update({
            where: { id: container.id },
            data: { currentCount: container.shipments.length + toAssign.length },
          });

          totalStowed += toAssign.length;

          // Remove assigned from in-memory pool
          for (const a of toAssign) {
            const idx = unassigned.findIndex((u) => u.id === a.id);
            if (idx !== -1) unassigned.splice(idx, 1);
          }
        }

        return NextResponse.json({ success: true, count: totalStowed });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('Operations POST error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to process operation' }, { status: 500 });
  }
}
