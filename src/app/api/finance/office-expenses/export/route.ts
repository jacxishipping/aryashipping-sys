import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { OfficeExpenseCategory, ExpensePaymentStatus, Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user.role || '').toLowerCase();
    if (!hasPermission(role, 'finance:view') && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const category = searchParams.get('category') as OfficeExpenseCategory | null;
    const paymentMethod = searchParams.get('paymentMethod')?.trim() || '';
    const status = searchParams.get('status') as ExpensePaymentStatus | null;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: Prisma.OfficeExpenseWhereInput = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { vendor: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category && Object.values(OfficeExpenseCategory).includes(category)) {
      where.category = category;
    }

    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    if (status && Object.values(ExpensePaymentStatus).includes(status)) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.expenseDate = {};
      if (startDate) where.expenseDate.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.expenseDate.lte = end;
      }
    }

    const expenses = await prisma.officeExpense.findMany({
      where,
      orderBy: { expenseDate: 'desc' },
      include: {
        recordedBy: {
          select: { name: true, email: true },
        },
      },
    });

    const headers = [
      'ID',
      'Title',
      'Category',
      'Amount (USD)',
      'Date',
      'Payment Method',
      'Vendor / Payee',
      'Reference Number',
      'Status',
      'Notes',
      'Recorded By',
      'Created At',
    ];

    const escapeCsv = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = expenses.map((e) => [
      escapeCsv(e.id),
      escapeCsv(e.title),
      escapeCsv(e.category.replace(/_/g, ' ')),
      escapeCsv(e.amount.toFixed(2)),
      escapeCsv(new Date(e.expenseDate).toISOString().slice(0, 10)),
      escapeCsv(e.paymentMethod),
      escapeCsv(e.vendor || ''),
      escapeCsv(e.referenceNumber || ''),
      escapeCsv(e.status),
      escapeCsv(e.notes || ''),
      escapeCsv(e.recordedBy?.name || e.recordedBy?.email || ''),
      escapeCsv(new Date(e.createdAt).toISOString().slice(0, 19).replace('T', ' ')),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="office_expenses_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error exporting office expenses:', error);
    return NextResponse.json(
      { error: 'Failed to export expenses' },
      { status: 500 }
    );
  }
}
