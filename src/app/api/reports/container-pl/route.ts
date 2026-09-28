import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { roundToCents, sumCents } from '@/lib/financial/money';

/**
 * GET /api/reports/container-pl
 *
 * Phase 2: Per-container P&L.
 * For a given container, aggregates:
 *   - revenue: customer invoice totals (UserInvoice linked to the container)
 *   - expenses: ContainerExpense amounts + allocated shipment expenses
 *   - damages: ContainerDamage (WE_PAY vs COMPANY_PAYS)
 *   - profit: revenue − expenses − damages(company-paid)
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
    const containerId = searchParams.get('containerId');

    if (!containerId) {
      return NextResponse.json(
        { error: 'containerId query parameter is required' },
        { status: 400 },
      );
    }

    const container = await prisma.container.findUnique({
      where: { id: containerId },
      include: {
        expenses: {
          select: { type: true, amount: true, date: true, vendor: true },
        },
        damages: {
          select: {
            damageType: true,
            amount: true,
            description: true,
            shipment: { select: { id: true } },
          },
        },
        userInvoices: {
          select: {
            id: true,
            invoiceNumber: true,
            total: true,
            amountPaid: true,
            status: true,
          },
        },
        shipments: {
          select: {
            id: true,
            price: true,
            paymentStatus: true,
          },
        },
      },
    });

    if (!container) {
      return NextResponse.json({ error: 'Container not found' }, { status: 404 });
    }

    const totalExpenses = roundToCents(sumCents(container.expenses.map((e) => e.amount)));

    const wePayDamages = roundToCents(
      sumCents(
        container.damages
          .filter((d) => d.damageType === 'WE_PAY')
          .map((d) => d.amount),
      ),
    );
    const companyPayDamages = roundToCents(
      sumCents(
        container.damages
          .filter((d) => d.damageType === 'COMPANY_PAYS')
          .map((d) => d.amount),
      ),
    );

    const invoiceRevenue = roundToCents(
      sumCents(
        container.userInvoices
          .filter((i) => i.status !== 'CANCELLED' && i.status !== 'VOID')
          .map((i) => i.total),
      ),
    );

    const shipmentFareRevenue = roundToCents(
      sumCents(container.shipments.map((s) => s.price || 0)),
    );

    const totalRevenue = roundToCents(invoiceRevenue + shipmentFareRevenue);
    const totalCosts = roundToCents(totalExpenses + companyPayDamages);
    const profit = roundToCents(totalRevenue - totalCosts);
    const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    return NextResponse.json({
      reportType: 'container-pl',
      containerId: container.id,
      containerNumber: container.trackingNumber || container.id,
      companyId: container.companyId,
      generatedAt: new Date(),
      summary: {
        totalRevenue,
        invoiceRevenue,
        shipmentFareRevenue,
        totalExpenses,
        wePayDamages,
        companyPayDamages,
        totalCosts,
        profit,
        profitMargin,
      },
      expenses: container.expenses.map((e) => ({ ...e, amount: roundToCents(e.amount) })),
      damages: container.damages.map((d) => ({ ...d, amount: roundToCents(d.amount) })),
      invoices: container.userInvoices.map((i) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        total: roundToCents(i.total),
        amountPaid: roundToCents(i.amountPaid ?? 0),
        status: i.status,
      })),
    });
  } catch (error) {
    console.error('Error generating container P&L report:', error);
    return NextResponse.json(
      { error: 'Failed to generate container P&L report' },
      { status: 500 },
    );
  }
}
