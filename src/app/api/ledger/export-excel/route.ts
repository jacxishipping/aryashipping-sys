import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

const TRANSACTION_INFO_TYPE_LABELS = {
  CAR_PAYMENT: 'Car Payment',
  SHIPPING_PAYMENT: 'Shipping Payment',
  STORAGE_PAYMENT: 'Storage Payment',
} as const;

// GET - Export ledger as Excel-compatible CSV with extended format
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
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

    // Fetch ledger entries and user info
    const [entries, user] = await Promise.all([
      prisma.ledgerEntry.findMany({
        where,
        include: {
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
      }),
      prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          name: true,
          email: true,
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate totals
    // ⚡ Bolt: Replaced chained .filter().reduce() with a single loop for O(N) performance
    let totalDebit = 0;
    let totalCredit = 0;
    for (const entry of entries) {
      if (entry.type === 'DEBIT') totalDebit += entry.amount;
      else if (entry.type === 'CREDIT') totalCredit += entry.amount;
    }
    const currentBalance = entries.length > 0 ? entries[entries.length - 1].balance : 0;

    // Generate Excel-compatible CSV with UTF-8 BOM for proper Excel encoding
    const csvRows: string[] = [];
    
    // Add BOM for UTF-8
    csvRows.push('\ufeff');
    
    // Title and header info
    csvRows.push('LEDGER STATEMENT');
    csvRows.push(`Account Holder:,${user.name || user.email}`);
    csvRows.push(`Email:,${user.email}`);
    csvRows.push(`Statement Period:,${startDate ? new Date(startDate).toLocaleDateString() : 'All time'} - ${endDate ? new Date(endDate).toLocaleDateString() : 'Present'}`);
    csvRows.push(`Generated:,${new Date().toLocaleString()}`);
    csvRows.push('');
    
    // Summary
    csvRows.push('SUMMARY');
    csvRows.push(`Total Debit:,$${totalDebit.toFixed(2)}`);
    csvRows.push(`Total Credit:,$${totalCredit.toFixed(2)}`);
    csvRows.push(`Current Balance:,$${Math.abs(currentBalance).toFixed(2)},${currentBalance >= 0 ? 'Amount Due' : 'Credit Balance'}`);
    csvRows.push('');
    csvRows.push('');

    // Header row for transactions
    csvRows.push([
      'Transaction ID',
      'Date',
      'Time',
      'Description',
      'Transaction Info Type',
      'Shipment',
      'Vehicle',
      'Type',
      'Debit',
      'Credit',
      'Balance',
      'Notes',
      'Created By',
    ].join(','));

    // Data rows
    for (const entry of entries) {
      const date = new Date(entry.transactionDate);
      const shipmentInfo = entry.shipment
        ? `VIN ${entry.shipment.vehicleVIN || 'N/A'}`
        : '';
      const vehicleInfo = entry.shipment
        ? `${entry.shipment.vehicleMake || ''} ${entry.shipment.vehicleModel || ''}`.trim()
        : '';

      csvRows.push([
        entry.id,
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        `"${entry.description.replace(/"/g, '""')}"`,
        entry.transactionInfoType ? TRANSACTION_INFO_TYPE_LABELS[entry.transactionInfoType] : '',
        shipmentInfo,
        `"${vehicleInfo}"`,
        entry.type,
        entry.type === 'DEBIT' ? entry.amount.toFixed(2) : '',
        entry.type === 'CREDIT' ? entry.amount.toFixed(2) : '',
        entry.balance.toFixed(2),
        entry.notes ? `"${entry.notes.replace(/"/g, '""')}"` : '',
        entry.createdBy,
      ].join(','));
    }

    // Add totals row
    csvRows.push('');
    csvRows.push([
      '',
      '',
      '',
      '',
      '',
      '',
      'TOTALS',
      totalDebit.toFixed(2),
      totalCredit.toFixed(2),
      currentBalance.toFixed(2),
      '',
      '',
    ].join(','));

    const csvContent = csvRows.join('\n');

    // Return Excel-compatible CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ledger-${user.name || 'user'}-${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return NextResponse.json(
      { error: 'Failed to export to Excel' },
      { status: 500 }
    );
  }
}
