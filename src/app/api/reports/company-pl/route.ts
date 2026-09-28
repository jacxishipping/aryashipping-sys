import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { roundToCents, sumCents } from '@/lib/financial/money';
import { Prisma } from '@prisma/client';

/**
 * GET /api/reports/company-pl
 *
 * Phase 2: P&L by company.
 * For each company:
 *   - revenue = sum of non-purchase DEBIT ledger entries attributed to that
 *     company's shipments (i.e. shipping fees, customs, storage, etc.)
 *   - expenses = sum of company CREDIT ledger entries (expense recoveries)
 *   - profit = revenue − expenses
 *
 * This is the first P&L report that actually uses the **company's** margin,
 * fixing the semantic bug in `reports/financial?shipment-wise` where revenue
 * was the customer's payment total instead of the company's shipping price.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const dateWhere: Record<string, unknown> = {};
    if (startDate) dateWhere.gte = new Date(startDate);
    if (endDate) dateWhere.lte = new Date(endDate);

    const companyWhere: Record<string, unknown> = { isActive: true };
    if (companyId) companyWhere.id = companyId;

    const companies = await prisma.company.findMany({
      where: companyWhere,
      select: {
        id: true,
        name: true,
        code: true,
        isDispatch: true,
        isShipping: true,
        isTransit: true,
        shipments: {
          select: {
            id: true,
            price: true,
            paymentStatus: true,
          },
        },
        ledgerEntries: {
          where: {
            transactionDate: dateWhere as Prisma.DateTimeFilter,
          },
          select: {
            type: true,
            amount: true,
            category: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const reports = companies.map((company) => {
      // Revenue: company's shipping margin = sum of shipment.price for shipments
      // where the company is the shipping carrier and the shipment is paid or active.
      const revenue = roundToCents(
        sumCents(
          company.shipments
            .filter((s) => s.paymentStatus === 'COMPLETED' || s.paymentStatus === 'PENDING')
            .map((s) => s.price || 0),
        ),
      );

      // Expenses: company CREDIT entries in the company ledger (expense recoveries
      // the company receives back). DEBIT entries are company's own costs.
      const companyCredits = company.ledgerEntries
        .filter((e) => e.type === 'CREDIT')
        .map((e) => e.amount);
      const companyDebits = company.ledgerEntries
        .filter((e) => e.type === 'DEBIT')
        .map((e) => e.amount);

      const totalCompanyCredits = roundToCents(sumCents(companyCredits));
      const totalCompanyDebits = roundToCents(sumCents(companyDebits));
      const netLedger = roundToCents(totalCompanyCredits - totalCompanyDebits);

      // Operating profit = shipping revenue + net ledger position.
      const profit = roundToCents(revenue + netLedger);
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        companyId: company.id,
        companyName: company.name,
        companyCode: company.code,
        isDispatch: company.isDispatch,
        isShipping: company.isShipping,
        isTransit: company.isTransit,
        shipmentCount: company.shipments.length,
        revenue,
        companyLedgerCredits: totalCompanyCredits,
        companyLedgerDebits: totalCompanyDebits,
        netLedger,
        profit,
        profitMargin,
      };
    });

    const totalRevenue = roundToCents(reports.reduce((s, r) => s + r.revenue, 0));
    const totalProfit = roundToCents(reports.reduce((s, r) => s + r.profit, 0));

    return NextResponse.json({
      reportType: 'company-pl',
      generatedAt: new Date(),
      period: {
        startDate: startDate || 'All time',
        endDate: endDate || 'Now',
      },
      summary: {
        companyCount: reports.length,
        totalRevenue,
        totalProfit,
        avgProfitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
      },
      companies: reports,
    });
  } catch (error) {
    console.error('Error generating company P&L report:', error);
    return NextResponse.json(
      { error: 'Failed to generate company P&L report' },
      { status: 500 },
    );
  }
}
