import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { hasPermission } from '@/lib/rbac';

const updateEntrySchema = z.object({
  description: z.string().min(1).optional(),
  type: z.enum(['DEBIT', 'CREDIT']).optional(),
  amount: z.number().positive().optional(),
  transactionDate: z.string().optional(),
  category: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function shouldForceCompanyExpenseCredit(input: {
  description?: string | null;
  category?: string | null;
  reference?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const description = (input.description || '').toLowerCase();
  const category = (input.category || '').toLowerCase();
  const reference = (input.reference || '').toLowerCase();
  const metadata = input.metadata || {};

  const hasExpenseKeyword =
    description.includes('expense') ||
    description.includes('shipping fare') ||
    description.includes('damage') ||
    category.includes('expense') ||
    category.includes('shipping fare') ||
    category.includes('damage');

  const hasExpenseReference =
    reference.startsWith('shipment-expense:') ||
    reference.startsWith('dispatch-expense:') ||
    reference.startsWith('transit-expense:') ||
    reference.startsWith('container-expense:') ||
    reference.startsWith('shipment-shipping-fare:') ||
    reference.startsWith('shipment-damage:');

  const hasExpenseMetadata =
    metadata.isExpenseRecovery === true ||
    metadata.isDispatchExpense === true ||
    metadata.isTransitExpense === true ||
    metadata.isContainerExpense === true ||
    metadata.isShipmentShippingFare === true ||
    metadata.isShipmentDamage === true;

  return hasExpenseKeyword || hasExpenseReference || hasExpenseMetadata;
}

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ entryId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const entry = await prisma.companyLedgerEntry.findUnique({
      where: { id: params.entryId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error('Error fetching company ledger entry:', error);
    return NextResponse.json({ error: 'Failed to fetch company ledger entry' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  props: { params: Promise<{ entryId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.companyLedgerEntry.findUnique({
      where: { id: params.entryId },
      select: {
        id: true,
        companyId: true,
        description: true,
        type: true,
        category: true,
        reference: true,
        metadata: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = updateEntrySchema.parse(body);
    const nextDescription = validatedData.description ?? existing.description;
    const nextCategory = validatedData.category ?? existing.category;
    const nextReference = validatedData.reference ?? existing.reference;
    const nextMetadata =
      (validatedData.metadata as Record<string, unknown> | undefined) ??
      (existing.metadata as Record<string, unknown> | null);
    const requestedType = validatedData.type ?? existing.type;
    const normalizedType = shouldForceCompanyExpenseCredit({
      description: nextDescription,
      category: nextCategory,
      reference: nextReference,
      metadata: nextMetadata,
    })
      ? 'CREDIT'
      : requestedType;

    const entry = await prisma.$transaction(async (tx) => {
      const updated = await tx.companyLedgerEntry.update({
        where: { id: params.entryId },
        data: {
          ...(validatedData.description !== undefined ? { description: validatedData.description } : {}),
          type: normalizedType,
          ...(validatedData.amount !== undefined ? { amount: validatedData.amount } : {}),
          ...(validatedData.transactionDate !== undefined
            ? { transactionDate: new Date(validatedData.transactionDate) }
            : {}),
          ...(validatedData.category !== undefined ? { category: validatedData.category } : {}),
          ...(validatedData.reference !== undefined ? { reference: validatedData.reference } : {}),
          ...(validatedData.notes !== undefined ? { notes: validatedData.notes } : {}),
          ...(validatedData.metadata !== undefined ? { metadata: validatedData.metadata as Prisma.InputJsonValue } : {}),
        },
      });

      await recalculateCompanyLedgerBalances(tx, existing.companyId);

      return updated;
    });

    return NextResponse.json({ entry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error updating company ledger entry:', error);
    return NextResponse.json({ error: 'Failed to update company ledger entry' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  props: { params: Promise<{ entryId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.companyLedgerEntry.findUnique({
      where: { id: params.entryId },
      select: { id: true, companyId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Ledger entry not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.companyLedgerEntry.delete({ where: { id: params.entryId } });
      await recalculateCompanyLedgerBalances(tx, existing.companyId);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company ledger entry:', error);
    return NextResponse.json({ error: 'Failed to delete company ledger entry' }, { status: 500 });
  }
}
