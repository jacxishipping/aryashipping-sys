import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getDevSeededTransitDetail } from '@/lib/dev-seeded-transit';
import { routeDeps } from '@/lib/route-deps';
import { ensureWorkflowMoveAllowed, isClosedStageOverrideAllowed } from '@/lib/workflow-access';

const updateTransitSchema = z.object({
  origin: z.string().optional(),
  destination: z.string().optional(),
  status: z.enum(['PENDING', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED']).optional(),
  dispatchDate: z.string().nullable().optional(),
  estimatedDelivery: z.string().nullable().optional(),
  actualDelivery: z.string().nullable().optional(),
  cost: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session?.user || !routeDeps.hasPermission(session.user?.role, 'transits:manage') && !routeDeps.hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transit = await routeDeps.prisma.transit.findUnique({
      where: { id: params.id },
      include: {
        shipments: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        events: {
          include: {
            company: { select: { id: true, name: true, code: true, phone: true, email: true } },
          },
          orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
        },
        expenses: { 
          include: {
            shipment: {
              select: {
                id: true,
                vehicleMake: true,
                vehicleModel: true,
                vehicleVIN: true,
              },
            },
            transitEvent: {
              include: {
                company: { select: { id: true, name: true, code: true } },
              },
            },
          },
          orderBy: { date: 'desc' },
        },
        _count: { select: { shipments: true, events: true, expenses: true } },
      },
    });

    if (!transit) {
      const seededTransit = getDevSeededTransitDetail(params.id);

      if (seededTransit) {
        return NextResponse.json(seededTransit);
      }

      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    // Fetch shipment expenses from ledger entries
    const shipmentExpenses = await routeDeps.prisma.ledgerEntry.findMany({
      where: {
        shipmentId: { in: transit.shipments.map(s => s.id) },
        type: 'DEBIT',
        metadata: {
          path: ['isExpense'],
          equals: true,
        },
      },
      include: {
        shipment: {
          select: {
            id: true,
            vehicleMake: true,
            vehicleModel: true,
            vehicleVIN: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Combine TransitExpense records with shipment ledger expenses
    const allExpenses = [
      ...transit.expenses.map(e => ({
        id: e.id,
        type: e.type,
        description: e.description,
        amount: e.amount,
        currency: e.currency,
        date: e.date,
        vendor: e.vendor,
        invoiceNumber: e.invoiceNumber,
        category: e.category,
        notes: e.notes,
        shipment: e.shipment,
        transitEvent: e.transitEvent,
        source: 'TRANSIT_EXPENSE' as const,
      })),
      ...shipmentExpenses.map(e => ({
        id: e.id,
        type: (e.metadata as any)?.expenseType || 'OTHER',
        description: e.description,
        amount: e.amount,
        currency: 'USD',
        date: e.createdAt,
        vendor: null,
        invoiceNumber: null,
        category: (e.metadata as any)?.expenseType || null,
        notes: e.notes,
        shipment: e.shipment,
        source: 'SHIPMENT_EXPENSE' as const,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);

    return NextResponse.json({ 
      transit: {
        ...transit,
        currentEvent: transit.events?.[0] ?? null,
        currentCompany: transit.events?.[0]?.company ?? null,
        expenses: allExpenses,
        _count: {
          ...transit._count,
          expenses: allExpenses.length,
        },
      }, 
      totalExpenses 
    });
  } catch (error) {
    console.error('Error fetching transit:', error);
    return NextResponse.json({ error: 'Failed to fetch transit' }, { status: 500 });
  }
}

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

    if (!ensureWorkflowMoveAllowed(session.user?.role) || !routeDeps.hasPermission(session.user?.role, 'transits:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await routeDeps.prisma.transit.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    if (['DELIVERED', 'CANCELLED'].includes(existing.status) && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Closed transit stages can only be overridden by admins' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateTransitSchema.parse(body);

    if (validatedData.status === 'DELIVERED') {
      return NextResponse.json(
        { error: 'Use the delivery confirmation flow to close a transit as delivered' },
        { status: 400 },
      );
    }

    const transit = await routeDeps.prisma.$transaction(async (tx) => {
      const updated = await tx.transit.update({
        where: { id: params.id },
        data: {
          ...(validatedData.origin !== undefined ? { origin: validatedData.origin } : {}),
          ...(validatedData.destination !== undefined ? { destination: validatedData.destination } : {}),
          ...(validatedData.status !== undefined ? { status: validatedData.status } : {}),
          ...(validatedData.dispatchDate !== undefined ? { dispatchDate: validatedData.dispatchDate ? new Date(validatedData.dispatchDate) : null } : {}),
          ...(validatedData.estimatedDelivery !== undefined ? { estimatedDelivery: validatedData.estimatedDelivery ? new Date(validatedData.estimatedDelivery) : null } : {}),
          ...(validatedData.actualDelivery !== undefined ? { actualDelivery: validatedData.actualDelivery ? new Date(validatedData.actualDelivery) : null } : {}),
          ...(validatedData.cost !== undefined ? { cost: validatedData.cost } : {}),
          ...(validatedData.notes !== undefined ? { notes: validatedData.notes } : {}),
        },
        include: {
          events: {
            orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
            take: 1,
            include: {
              company: { select: { id: true, name: true, code: true } },
            },
          },
        },
      });

      // If transit is CANCELLED, revert shipments to released so they can be reassigned.
      if (validatedData.status === 'CANCELLED') {
        await tx.shipment.updateMany({
          where: { transitId: params.id },
          data: { status: 'RELEASED', transitId: null },
        });
      }

      return updated;
    });

    return NextResponse.json({
      transit: {
        ...transit,
        currentEvent: transit.events?.[0] ?? null,
        currentCompany: transit.events?.[0]?.company ?? null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }
    console.error('Error updating transit:', error);
    return NextResponse.json({ error: 'Failed to update transit' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!ensureWorkflowMoveAllowed(session.user?.role) || !routeDeps.hasPermission(session.user?.role, 'transits:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await routeDeps.prisma.transit.findUnique({
      where: { id: params.id },
      include: { _count: { select: { shipments: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Transit not found' }, { status: 404 });
    }

    if (['DELIVERED', 'CANCELLED'].includes(existing.status) && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Closed transit stages can only be overridden by admins' }, { status: 400 });
    }

    await routeDeps.prisma.$transaction(async (tx) => {
      // Detach shipments before deleting transit
      await tx.shipment.updateMany({
        where: { transitId: params.id },
        data: { transitId: null, status: 'RELEASED' },
      });

      await tx.transit.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transit:', error);
    return NextResponse.json({ error: 'Failed to delete transit' }, { status: 500 });
  }
}
