import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

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
    const targetYear = parseInt(searchParams.get('year') || String(new Date().getFullYear()), 10);

    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const [allExpensesForYear, categoryGroup, paymentMethodGroup, topVendorsGroup] = await Promise.all([
      prisma.officeExpense.findMany({
        where: {
          expenseDate: {
            gte: startOfYear,
            lte: endOfYear,
          },
        },
        select: {
          amount: true,
          expenseDate: true,
          category: true,
          status: true,
        },
      }),
      prisma.officeExpense.groupBy({
        by: ['category'],
        where: {
          expenseDate: {
            gte: startOfYear,
            lte: endOfYear,
          },
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: {
          _sum: { amount: 'desc' },
        },
      }),
      prisma.officeExpense.groupBy({
        by: ['paymentMethod'],
        where: {
          expenseDate: {
            gte: startOfYear,
            lte: endOfYear,
          },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.officeExpense.groupBy({
        by: ['vendor'],
        where: {
          expenseDate: {
            gte: startOfYear,
            lte: endOfYear,
          },
          vendor: { not: null },
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: {
          _sum: { amount: 'desc' },
        },
        take: 8,
      }),
    ]);

    // Build 12-month array
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = monthNames.map((month, idx) => {
      const monthExpenses = allExpensesForYear.filter(
        (e) => new Date(e.expenseDate).getMonth() === idx
      );
      const total = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const count = monthExpenses.length;
      return {
        month,
        monthIndex: idx + 1,
        total,
        count,
      };
    });

    const totalYearAmount = allExpensesForYear.reduce((sum, e) => sum + e.amount, 0);
    const totalYearCount = allExpensesForYear.length;
    const averageMonthly = totalYearAmount / 12;

    return NextResponse.json({
      success: true,
      year: targetYear,
      summary: {
        totalYearAmount,
        totalYearCount,
        averageMonthly,
      },
      monthlyTrend,
      categoryDistribution: categoryGroup.map((c) => ({
        category: c.category,
        amount: c._sum.amount || 0,
        count: c._count.id || 0,
        percentage: totalYearAmount > 0 ? ((c._sum.amount || 0) / totalYearAmount) * 100 : 0,
      })),
      paymentMethodDistribution: paymentMethodGroup.map((p) => ({
        paymentMethod: p.paymentMethod,
        amount: p._sum.amount || 0,
        count: p._count.id || 0,
      })),
      topVendors: topVendorsGroup
        .filter((v) => v.vendor)
        .map((v) => ({
          vendor: v.vendor,
          amount: v._sum.amount || 0,
          count: v._count.id || 0,
        })),
    });
  } catch (error) {
    console.error('Error fetching office expense analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
