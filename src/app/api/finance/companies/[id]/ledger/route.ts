import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recalculateCompanyLedgerBalances } from '@/lib/company-ledger';
import { hasPermission } from '@/lib/rbac';

function isCompanyExpenseLedgerEntry(entry: {
  category?: string | null;
  reference?: string | null;
  metadata?: unknown;
}) {
  const category = (entry.category || '').toLowerCase();
  const reference = (entry.reference || '').toLowerCase();
  const metadata =
    entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
      ? (entry.metadata as Record<string, unknown>)
      : {};

  if (category.includes('expense recovery') || category.includes('shipping fare') || category.includes('damage cost')) {
    return true;
  }

  return (
    metadata.isExpenseRecovery === true ||
    metadata.isDispatchExpense === true ||
    metadata.isTransitExpense === true ||
    metadata.isContainerExpense === true ||
    metadata.isShipmentShippingFare === true ||
    metadata.isShipmentDamage === true ||
    reference.startsWith('shipment-expense:') ||
    reference.startsWith('dispatch-expense:') ||
    reference.startsWith('transit-expense:') ||
    reference.startsWith('container-expense:') ||
    reference.startsWith('shipment-shipping-fare:') ||
    reference.startsWith('shipment-damage:')
  );
}

const createEntrySchema = z.object({
  description: z.string().min(1),
  type: z.enum(['DEBIT', 'CREDIT']),
  amount: z.number().positive(),
  transactionDate: z.string().optional(),
  category: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

function shouldForceCompanyExpenseCredit(input: {
  reference?: string;
  metadata?: Record<string, unknown>;
}) {
  const reference = (input.reference || '').toLowerCase();
  const metadata = input.metadata || {};

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

  return hasExpenseReference || hasExpenseMetadata;
}

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

    if (!hasPermission(session.user?.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const source = searchParams.get('source') || '';

    const where: {
      companyId: string;
      type?: 'DEBIT' | 'CREDIT';
      OR?: Array<{
        description?: { contains: string; mode: 'insensitive' };
        category?: { contains: string; mode: 'insensitive' };
        notes?: { contains: string; mode: 'insensitive' };
        reference?: { contains: string; mode: 'insensitive' };
      }>;
    } = { companyId: params.id };

    if (type === 'DEBIT' || type === 'CREDIT') {
      where.type = type;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    // ⚡ Bolt: Consolidated separate debit and credit aggregate queries into a single groupBy query
    const [entriesRaw, groupedSums, latestEntry, expenseEntries] = await Promise.all([
      prisma.companyLedgerEntry.findMany({
        where,
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.companyLedgerEntry.groupBy({
        by: ['type'],
        where: { companyId: params.id, type: { in: ['DEBIT', 'CREDIT'] } },
        _sum: { amount: true },
      }),
      prisma.companyLedgerEntry.findFirst({
        where: { companyId: params.id },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        select: { balance: true },
      }),
      prisma.companyLedgerEntry.findMany({
        where: { companyId: params.id },
        select: { amount: true, category: true, reference: true, metadata: true },
      }),
    ]);

    const entries = entriesRaw.filter((entry) => {
      const metadata = entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
        ? (entry.metadata as Record<string, unknown>)
        : {};
      const isBankImport = metadata.importSource === 'BANK_OF_AMERICA_CSV';

      if (source === 'BANK_IMPORT') {
        return isBankImport;
      }

      if (source === 'MANUAL') {
        return !isBankImport;
      }

      return true;
    });

    const totalExpenseCharges = expenseEntries.reduce((sum, entry) => {
      return isCompanyExpenseLedgerEntry(entry) ? sum + entry.amount : sum;
    }, 0);

    return NextResponse.json({
      entries,
      summary: {
        totalDebit: groupedSums.find(g => g.type === 'DEBIT')?._sum?.amount || 0,
        totalCredit: groupedSums.find(g => g.type === 'CREDIT')?._sum?.amount || 0,
        totalExpenseCharges,
        currentBalance: latestEntry?.balance || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching company ledger entries:', error);
    return NextResponse.json({ error: 'Failed to fetch ledger entries' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
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

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const validatedData = createEntrySchema.parse(body);
    const metadataObject = validatedData.metadata as Record<string, unknown> | undefined;
    const normalizedMetadata =
      validatedData.type === 'DEBIT' && typeof metadataObject?.shipmentId === 'string'
        ? { ...metadataObject, isCompanyPayment: true, paymentScope: 'SHIPMENT' }
        : metadataObject;
    const normalizedType =
      shouldForceCompanyExpenseCredit({
        reference: validatedData.reference,
        metadata: normalizedMetadata,
      })
        ? 'CREDIT'
        : validatedData.type;

    const entry = await prisma.$transaction(async (tx) => {
      const created = await tx.companyLedgerEntry.create({
        data: {
          companyId: params.id,
          description: validatedData.description,
          type: normalizedType,
          amount: validatedData.amount,
          balance: 0,
          transactionDate: validatedData.transactionDate
            ? new Date(validatedData.transactionDate)
            : new Date(),
          category: validatedData.category || null,
          reference: validatedData.reference || null,
          notes: validatedData.notes || null,
          metadata: normalizedMetadata !== undefined
            ? (normalizedMetadata as Prisma.InputJsonValue)
            : undefined,
          createdBy: session.user!.id as string,
        },
      });

      await recalculateCompanyLedgerBalances(tx, params.id);

      return created;
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error creating company ledger entry:', error);
    return NextResponse.json({ error: 'Failed to create ledger entry' }, { status: 500 });
  }
}
