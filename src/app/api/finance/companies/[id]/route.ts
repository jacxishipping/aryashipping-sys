import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
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

const updateCompanySchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  companyType: z.enum(['SHIPPING', 'DISPATCH', 'TRANSIT']).optional(),
  isDispatch: z.boolean().optional(),
  isShipping: z.boolean().optional(),
  isTransit: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
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
      include: {
        dispatches: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            origin: true,
            destination: true,
            createdAt: true,
            _count: {
              select: {
                shipments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        containers: {
          select: {
            id: true,
            containerNumber: true,
            status: true,
            currentCount: true,
            maxCapacity: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        shipments: {
          where: {
            OR: [
              { containerId: { not: null } },
              { transitId: { not: null } },
            ],
          },
          select: {
            id: true,
            vehicleVIN: true,
            vehicleMake: true,
            vehicleModel: true,
            status: true,
            createdAt: true,
            transitId: true,
            containerId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        },
        transits: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            origin: true,
            destination: true,
            createdAt: true,
            _count: {
              select: {
                shipments: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        _count: {
          select: {
            ledgerEntries: true,
            dispatches: true,
            containers: true,
            shipments: true,
            transits: true,
          },
        },
        priceLists: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            name: true,
            destinationLabel: true,
            sourceFileName: true,
            importMode: true,
            importedStateRateCount: true,
            importedAuctionRateCount: true,
            config: true,
            warnings: true,
            isActive: true,
            effectiveFrom: true,
            createdAt: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const transitShipmentsPromise = company.companyType === 'TRANSIT'
      ? prisma.shipment.findMany({
          where: { transit: { companyId: company.id } },
          select: {
            id: true,
            vehicleVIN: true,
            vehicleMake: true,
            vehicleModel: true,
            status: true,
            createdAt: true,
            transitId: true,
            containerId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        })
      : Promise.resolve([]);

    const dispatchShipmentsPromise = company.companyType === 'DISPATCH'
      ? prisma.shipment.findMany({
          where: { dispatch: { companyId: company.id } },
          select: {
            id: true,
            vehicleVIN: true,
            vehicleMake: true,
            vehicleModel: true,
            status: true,
            createdAt: true,
            dispatchId: true,
            containerId: true,
            transitId: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
        })
      : Promise.resolve([]);

    // ⚡ Bolt: Consolidated separate debit and credit aggregate queries into a single groupBy query
    // and parallelized with transit and dispatch shipment queries to reduce overall latency
    const [transitShipments, dispatchShipments, groupedSums, latestEntry, expenseEntries] = await Promise.all([
      transitShipmentsPromise,
      dispatchShipmentsPromise,
      prisma.companyLedgerEntry.groupBy({
        by: ['type'],
        where: { companyId: company.id, type: { in: ['DEBIT', 'CREDIT'] } },
        _sum: { amount: true },
      }),
      prisma.companyLedgerEntry.findFirst({
        where: { companyId: company.id },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        select: { balance: true },
      }),
      prisma.companyLedgerEntry.findMany({
        where: { companyId: company.id },
        select: { amount: true, category: true, reference: true, metadata: true },
      }),
    ]);

    const totalExpenseCharges = expenseEntries.reduce((sum, entry) => {
      return isCompanyExpenseLedgerEntry(entry) ? sum + entry.amount : sum;
    }, 0);

    const responseCompany = company.companyType === 'TRANSIT'
      ? {
          ...company,
          shipments: transitShipments,
          _count: {
            ...company._count,
            shipments: transitShipments.length,
          },
        }
      : company.companyType === 'DISPATCH'
      ? {
          ...company,
          shipments: dispatchShipments,
          _count: {
            ...company._count,
            shipments: dispatchShipments.length,
          },
        }
      : company;

    return NextResponse.json({
      company: responseCompany,
      summary: {
        totalDebit: groupedSums.find(g => g.type === 'DEBIT')?._sum?.amount || 0,
        totalCredit: groupedSums.find(g => g.type === 'CREDIT')?._sum?.amount || 0,
        totalExpenseCharges,
        currentBalance: latestEntry?.balance || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
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

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = updateCompanySchema.parse(body);

    const existing = await prisma.company.findUnique({ where: { id: params.id } });

    if (!existing) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const company = await prisma.company.update({
      where: { id: params.id },
      data: {
        ...validatedData,
      },
    });

    return NextResponse.json({ company });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    console.error('Error updating company:', error);
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
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

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true';

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            ledgerEntries: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (company._count.ledgerEntries > 0 && !forceDelete) {
      return NextResponse.json(
        { error: 'Company has ledger transactions. Use force=true to delete all records.' },
        { status: 400 }
      );
    }

    await prisma.company.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting company:', error);
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 });
  }
}
