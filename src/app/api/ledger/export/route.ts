import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

const TRANSACTION_INFO_TYPE_LABELS = {
  CAR_PAYMENT: 'Car Payment',
  SHIPPING_PAYMENT: 'Shipping Payment',
  STORAGE_PAYMENT: 'Storage Payment',
} as const;

// GET - Export ledger data as CSV/Excel-compatible format
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const format = searchParams.get('format') || 'csv';
    const type = searchParams.get('type');
    const transactionInfoType = searchParams.get('transactionInfoType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    // Non-admin users can only export their own ledger
    const isAdmin = hasPermission(session.user.role, 'finance:manage');
    const targetUserId = isAdmin && userId ? userId : session.user.id;

    // Build where clause
    const where: Record<string, unknown> = {
      userId: targetUserId,
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) {
        (where.transactionDate as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.transactionDate as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    if (type && (type === 'DEBIT' || type === 'CREDIT')) {
      where.type = type;
    }

    if (transactionInfoType && transactionInfoType in TRANSACTION_INFO_TYPE_LABELS) {
      where.transactionInfoType = transactionInfoType;
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Fetch ledger entries
    const entries = await prisma.ledgerEntry.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
          shipment: {
            select: {
              id: true,
              vehicleVIN: true,
              vehicleMake: true,
              vehicleModel: true,
            },
          },
      },
      orderBy: {
        transactionDate: 'asc',
      },
    });

    if (format === 'json') {
      return NextResponse.json({ entries });
    }

    // Generate CSV format
    const csvRows: string[] = [];
    
    // Header row
    csvRows.push([
      'Date',
      'Description',
      'Transaction Info Type',
      'Shipment',
      'Type',
      'Debit',
      'Credit',
      'Balance',
      'Notes',
    ].join(','));

    // Data rows
    for (const entry of entries) {
      const shipmentInfo = entry.shipment
        ? `${entry.shipment.vehicleVIN || 'N/A'} (${entry.shipment.vehicleMake || ''} ${entry.shipment.vehicleModel || ''})`
        : 'N/A';

      csvRows.push([
        new Date(entry.transactionDate).toLocaleString(),
        `"${entry.description.replace(/"/g, '""')}"`,
        entry.transactionInfoType ? TRANSACTION_INFO_TYPE_LABELS[entry.transactionInfoType] : '',
        `"${shipmentInfo.replace(/"/g, '""')}"`,
        entry.type,
        entry.type === 'DEBIT' ? entry.amount.toFixed(2) : '',
        entry.type === 'CREDIT' ? entry.amount.toFixed(2) : '',
        entry.balance.toFixed(2),
        entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : '',
      ].join(','));
    }

    const csvContent = csvRows.join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="ledger-${targetUserId}-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting ledger:', error);
    return NextResponse.json(
      { error: 'Failed to export ledger' },
      { status: 500 }
    );
  }
}
