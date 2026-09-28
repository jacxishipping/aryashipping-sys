import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';
import { roundToCents } from '@/lib/financial/money';

const updateBudgetSchema = z.object({
  name: z.string().min(1).optional(),
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
  ]).nullable().optional(),
  amount: z.number().positive().optional(),
  month: z.number().int().min(1).max(12).nullable().optional(),
  year: z.number().int().min(2020).max(2050).nullable().optional(),
  warningThreshold: z.number().min(1).max(100).optional(),
  notifyOnWarning: z.boolean().optional(),
  notifyOnExceeded: z.boolean().optional(),
  notes: z.string().nullable().optional(),
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

    const budget = await prisma.expenseBudget.findUnique({
      where: { id: params.id },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget cap not found' }, { status: 404 });
    }

    return NextResponse.json(budget);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch budget' }, { status: 500 });
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
    const parsed = updateBudgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid update data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const data: any = { ...parsed.data };
    if (data.amount) data.amount = roundToCents(data.amount);

    const updated = await prisma.expenseBudget.update({
      where: { id: params.id },
      data,
    });

    await createAuditLog('ExpenseBudget', updated.id, 'UPDATE', session.user.id || 'SYSTEM', { changes: data });

    return NextResponse.json({
      success: true,
      message: 'Budget cap updated successfully',
      budget: updated,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update budget' }, { status: 500 });
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

    const deleted = await prisma.expenseBudget.delete({
      where: { id: params.id },
    });

    await createAuditLog('ExpenseBudget', deleted.id, 'DELETE', session.user.id || 'SYSTEM', { name: deleted.name });

    return NextResponse.json({
      success: true,
      message: 'Budget cap deleted',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete budget' }, { status: 500 });
  }
}
