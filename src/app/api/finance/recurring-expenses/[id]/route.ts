import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.enum([
    'RENT',
    'UTILITIES',
    'SALARIES_PAYROLL',
    'OFFICE_SUPPLIES',
    'EQUIPMENT_HARDWARE',
    'SOFTWARE_SUBSCRIPTIONS',
    'MAINTENANCE_REPAIRS',
    'TRAVEL_TRANSPORT',
    'MARKETING_ADVERTISING',
    'LEGAL_PROFESSIONAL',
    'COMMUNICATION_INTERNET',
    'TAXES_GOVERNMENT_FEES',
    'BANK_FEES',
    'MEALS_ENTERTAINMENT',
    'OTHER',
  ]).optional(),
  amount: z.number().positive().optional(),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'WEEKLY', 'BIWEEKLY']).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  paymentMethod: z.string().optional(),
  vendor: z.string().nullable().optional(),
  referencePrefix: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  autoCreatePaid: z.boolean().optional(),
  nextDueDate: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const item = await prisma.recurringExpense.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        generatedExpenses: {
          orderBy: { expenseDate: 'desc' },
          take: 20,
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Recurring expense not found' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch recurring expense' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data: any = { ...parsed.data };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) data.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.nextDueDate) data.nextDueDate = new Date(data.nextDueDate);

    const updated = await prisma.recurringExpense.update({
      where: { id: params.id },
      data,
    });

    await createAuditLog('RecurringExpense', updated.id, 'UPDATE', session.user.id || 'SYSTEM', { changes: data });

    return NextResponse.json({
      success: true,
      message: 'Recurring expense updated',
      recurring: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update recurring expense' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const deleted = await prisma.recurringExpense.delete({
      where: { id: params.id },
    });

    await createAuditLog('RecurringExpense', deleted.id, 'DELETE', session.user.id || 'SYSTEM', { title: deleted.title });

    return NextResponse.json({
      success: true,
      message: 'Recurring expense schedule removed',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete recurring expense' }, { status: 500 });
  }
}
