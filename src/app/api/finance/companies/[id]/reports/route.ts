import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

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
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: { companyId: string; transactionDate?: { gte?: Date; lte?: Date } } = {
      companyId: params.id,
    };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    // ⚡ Bolt: Consolidated separate debit and credit aggregate queries into a single groupBy query
    const [entries, groupedSums, latestEntry] = await Promise.all([
      prisma.companyLedgerEntry.findMany({
        where,
        orderBy: [{ transactionDate: 'asc' }, { createdAt: 'asc' }],
      }),
      prisma.companyLedgerEntry.groupBy({
        by: ['type'],
        where: { ...where, type: { in: ['DEBIT', 'CREDIT'] } },
        _sum: { amount: true },
      }),
      prisma.companyLedgerEntry.findFirst({
        where: { companyId: params.id },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        select: { balance: true },
      }),
    ]);

    const totalDebit = groupedSums.find(g => g.type === 'DEBIT')?._sum?.amount || 0;
    const totalCredit = groupedSums.find(g => g.type === 'CREDIT')?._sum?.amount || 0;

    const byMonth: Record<string, { debit: number; credit: number; net: number }> = {};

    for (const entry of entries) {
      const key = `${entry.transactionDate.getFullYear()}-${String(entry.transactionDate.getMonth() + 1).padStart(2, '0')}`;

      if (!byMonth[key]) {
        byMonth[key] = { debit: 0, credit: 0, net: 0 };
      }

      if (entry.type === 'DEBIT') {
        byMonth[key].debit += entry.amount;
      } else {
        byMonth[key].credit += entry.amount;
      }

      byMonth[key].net = byMonth[key].debit - byMonth[key].credit;
    }

    return NextResponse.json({
      company,
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'Now',
      },
      summary: {
        transactionCount: entries.length,
        totalDebit,
        totalCredit,
        netMovement: totalDebit - totalCredit,
        currentBalance: latestEntry?.balance || 0,
      },
      monthlyBreakdown: Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, values]) => ({ month, ...values })),
    });
  } catch (error) {
    console.error('Error generating company finance report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
