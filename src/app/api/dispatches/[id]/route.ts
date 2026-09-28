import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { companySupportsRole } from '@/lib/company-roles';
import { routeDeps } from '@/lib/route-deps';
import { shouldReleaseDispatchShipments } from '@/lib/dispatch-workflow';
import { ensureWorkflowMoveAllowed, isClosedStageOverrideAllowed } from '@/lib/workflow-access';

const updateDispatchSchema = z.object({
  companyId: z.string().optional(),
  origin: z.string().optional(),
  destination: z.string().optional(),
  status: z.enum(['PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT', 'COMPLETED', 'CANCELLED']).optional(),
  dispatchDate: z.string().nullable().optional(),
  estimatedArrival: z.string().nullable().optional(),
  actualArrival: z.string().nullable().optional(),
  cost: z.number().positive().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
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
        company: { select: { id: true, name: true, code: true, phone: true, email: true } },
        shipments: {
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
          },
        },
        events: { orderBy: { eventDate: 'desc' } },
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
          },
          orderBy: { date: 'desc' },
        },
        _count: { select: { shipments: true, events: true, expenses: true } },
      },
    });

    if (!dispatch) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    const actorIds = Array.from(new Set((dispatch.events || []).map((event) => event.createdBy).filter(Boolean)));
    const expenseIds = (dispatch.expenses || []).map((expense) => expense.id);
    const expenseAuditLogs = expenseIds.length
      ? await routeDeps.prisma.auditLog.findMany({
          where: {
            entityType: 'dispatch-expense',
            entityId: { in: expenseIds },
          },
          orderBy: { performedAt: 'desc' },
        })
      : [];
    const allActorIds = Array.from(
      new Set([
        ...actorIds,
        ...expenseAuditLogs.map((log) => log.performedBy).filter(Boolean),
      ]),
    );
    const actors = allActorIds.length
      ? await routeDeps.prisma.user.findMany({
          where: { id: { in: allActorIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const actorMap = new Map(actors.map((actor) => [actor.id, actor.name?.trim() || actor.email || actor.id]));
    const expenseAuditMap = new Map<string, Array<Record<string, unknown>>>();

    expenseAuditLogs.forEach((log) => {
      const current = expenseAuditMap.get(log.entityId) || [];
      current.push({
        id: log.id,
        action: log.action,
        performedBy: log.performedBy,
        performedAt: log.performedAt,
        performedByLabel: actorMap.get(log.performedBy) || log.performedBy,
        changes: log.changes,
      });
      expenseAuditMap.set(log.entityId, current);
    });

    const dispatchWithEventActors = {
      ...dispatch,
      events: (dispatch.events || []).map((event) => ({
        ...event,
        createdByLabel: actorMap.get(event.createdBy) || event.createdBy,
      })),
      expenses: (dispatch.expenses || []).map((expense) => ({
        ...expense,
        auditLogs: expenseAuditMap.get(expense.id) || [],
      })),
    };

    return NextResponse.json({ dispatch: dispatchWithEventActors, totalExpenses: dispatch.expenses.reduce((sum, expense) => sum + expense.amount, 0) });
  } catch (error) {
    console.error('Error fetching dispatch:', error);
    return NextResponse.json({ error: 'Failed to fetch dispatch' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!routeDeps.hasPermission(session.user?.role, 'dispatches:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await routeDeps.prisma.dispatch.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    if (['COMPLETED', 'CANCELLED'].includes(existing.status) && !isClosedStageOverrideAllowed(session.user?.role)) {
      return NextResponse.json({ error: 'Closed dispatch stages can only be overridden by admins' }, { status: 400 });
    }

    const body = await request.json();
    const validatedData = updateDispatchSchema.parse(body);

    if (validatedData.companyId) {
      const company = await routeDeps.prisma.company.findUnique({
        where: { id: validatedData.companyId },
        select: { id: true, isActive: true, companyType: true, isDispatch: true },
      });

      if (!company || !company.isActive || !companySupportsRole(company, 'DISPATCH')) {
        return NextResponse.json({ error: 'Valid active dispatch company is required' }, { status: 400 });
      }
    }

    const dispatch = await routeDeps.prisma.$transaction(async (tx) => {
      const updated = await tx.dispatch.update({
        where: { id: params.id },
        data: {
          ...(validatedData.companyId !== undefined ? { companyId: validatedData.companyId } : {}),
          ...(validatedData.origin !== undefined ? { origin: validatedData.origin } : {}),
          ...(validatedData.destination !== undefined ? { destination: validatedData.destination } : {}),
          ...(validatedData.status !== undefined ? { status: validatedData.status } : {}),
          ...(validatedData.dispatchDate !== undefined ? { dispatchDate: validatedData.dispatchDate ? new Date(validatedData.dispatchDate) : null } : {}),
          ...(validatedData.estimatedArrival !== undefined ? { estimatedArrival: validatedData.estimatedArrival ? new Date(validatedData.estimatedArrival) : null } : {}),
          ...(validatedData.actualArrival !== undefined ? { actualArrival: validatedData.actualArrival ? new Date(validatedData.actualArrival) : null } : {}),
          ...(validatedData.cost !== undefined ? { cost: validatedData.cost } : {}),
          ...(validatedData.notes !== undefined ? { notes: validatedData.notes } : {}),
        },
        include: {
          company: { select: { id: true, name: true, code: true } },
        },
      });

      if (validatedData.status && shouldReleaseDispatchShipments(validatedData.status)) {
        await tx.shipment.updateMany({
          where: { dispatchId: params.id, transitId: null, containerId: null },
          data: { status: 'ON_HAND', dispatchId: null },
        });
      }

      return updated;
    });

    return NextResponse.json({ dispatch });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error updating dispatch:', error);
    return NextResponse.json({ error: 'Failed to update dispatch' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await routeDeps.auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!routeDeps.hasPermission(session.user?.role, 'dispatches:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await routeDeps.prisma.dispatch.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Dispatch not found' }, { status: 404 });
    }

    await routeDeps.prisma.$transaction(async (tx) => {
      await tx.shipment.updateMany({
        where: { dispatchId: params.id, transitId: null, containerId: null },
        data: { dispatchId: null, status: 'ON_HAND' },
      });

      await tx.dispatch.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dispatch:', error);
    return NextResponse.json({ error: 'Failed to delete dispatch' }, { status: 500 });
  }
}