import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { buildLinkedCompanyLedgerEntryMap } from '@/lib/company-ledger-links';
import { roundToCents, sumCents } from '@/lib/financial/money';

// GET - Generate financial reports
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view full financial reports
    if (!hasPermission(session.user?.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const reportType = searchParams.get('type') || 'summary';
    const userId = searchParams.get('userId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build where clause for date filtering
    const dateWhere: Record<string, unknown> = {};
    if (startDate || endDate) {
      dateWhere.createdAt = {};
      if (startDate) {
        (dateWhere.createdAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (dateWhere.createdAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    if (reportType === 'summary') {
      // Overall financial summary
      const where = userId ? { ...dateWhere, userId } : dateWhere;

      // Parallelize independent queries: ledger aggregation, shipment aggregation, and user balances
      const [ledgerSummary, shipmentSummary, userBalances, dispatchStatusSummary, dispatchExpenseSummary] = await Promise.all([
        prisma.ledgerEntry.groupBy({
          by: ['type'],
          where,
          _sum: {
            amount: true,
          },
          _count: {
            id: true,
          },
        }),
        prisma.shipment.groupBy({
          by: ['paymentStatus'],
          where: userId ? { userId, ...dateWhere } : dateWhere,
          _sum: {
            price: true,
          },
          _count: {
            id: true,
          },
        }),
        prisma.user.findMany({
          where: userId ? { id: userId } : undefined,
          select: {
            id: true,
            name: true,
            email: true,
            ledgerEntries: {
              orderBy: { transactionDate: 'desc' },
              take: 1,
              select: { balance: true },
            },
          },
        }),
        prisma.dispatch.groupBy({
          by: ['status'],
          where: dateWhere,
          _count: {
            id: true,
          },
        }),
        prisma.dispatchExpense.aggregate({
          where: dateWhere,
          _sum: {
            amount: true,
          },
          _count: {
            id: true,
          },
        }),
      ]);

      const totalDebit = ledgerSummary.find(e => e.type === 'DEBIT')?._sum.amount || 0;
      const totalCredit = ledgerSummary.find(e => e.type === 'CREDIT')?._sum.amount || 0;
      const debitCount = ledgerSummary.find(e => e.type === 'DEBIT')?._count.id || 0;
      const creditCount = ledgerSummary.find(e => e.type === 'CREDIT')?._count.id || 0;

      const userBalanceSummary = userBalances.map(user => ({
        userId: user.id,
        userName: user.name || user.email,
        currentBalance: user.ledgerEntries[0]?.balance || 0,
      }));

      return NextResponse.json({
        reportType: 'summary',
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now',
        },
        ledgerSummary: {
          totalDebit,
          totalCredit,
          netBalance: totalDebit - totalCredit,
          debitCount,
          creditCount,
        },
        shipmentSummary: shipmentSummary.map(s => ({
          status: s.paymentStatus,
          totalAmount: s._sum.price || 0,
          count: s._count.id,
        })),
        dispatchSummary: {
          activeCount: dispatchStatusSummary.reduce((total, entry) => (
            ['PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT'].includes(entry.status)
              ? total + entry._count.id
              : total
          ), 0),
          totalCount: dispatchStatusSummary.reduce((total, entry) => total + entry._count.id, 0),
          totalExpenseAmount: dispatchExpenseSummary._sum.amount || 0,
          expenseCount: dispatchExpenseSummary._count.id || 0,
          statuses: dispatchStatusSummary.map((entry) => ({
            status: entry.status,
            count: entry._count.id,
          })),
        },
        userBalances: userBalanceSummary,
      });
    } else if (reportType === 'user-wise') {
      // User-wise detailed report
      const users = await prisma.user.findMany({
        where: userId ? { id: userId } : undefined,
        select: {
          id: true,
          name: true,
          email: true,
          ledgerEntries: {
            where: dateWhere,
            orderBy: { transactionDate: 'desc' },
          },
          shipments: {
            where: dateWhere,
            select: {
              id: true,
              vehicleMake: true,
              vehicleModel: true,
              price: true,
              paymentStatus: true,
              paymentMode: true,
              createdAt: true,
            },
          },
        },
      });

      const userReports = users.map(user => {
        // ⚡ Bolt: Calculate totalDebit and totalCredit in a single O(N) loop
        // to avoid chained array allocations and repeated iteration over ledgerEntries.
        let totalDebit = 0;
        let totalCredit = 0;
        for (const e of user.ledgerEntries) {
          if (e.type === 'DEBIT') {
            totalDebit += e.amount;
          } else if (e.type === 'CREDIT') {
            totalCredit += e.amount;
          }
        }

        const currentBalance = user.ledgerEntries[0]?.balance || 0;

        const paidShipments = user.shipments.filter(s => s.paymentStatus === 'COMPLETED').length;
        const dueShipments = user.shipments.filter(s => s.paymentStatus === 'PENDING').length;

        return {
          userId: user.id,
          userName: user.name || user.email,
          email: user.email,
          totalDebit,
          totalCredit,
          currentBalance,
          shipmentStats: {
            total: user.shipments.length,
            paid: paidShipments,
            due: dueShipments,
          },
          recentLedgerEntries: user.ledgerEntries.slice(0, 10),
          recentShipments: user.shipments.slice(0, 10),
        };
      });

      return NextResponse.json({
        reportType: 'user-wise',
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now',
        },
        users: userReports,
      });
    } else if (reportType === 'shipment-wise') {
      // Shipment-wise payment report with expenses and profit
      const where: Record<string, unknown> = { ...dateWhere };
      if (userId) {
        where.userId = userId;
      }

      const shipments = await prisma.shipment.findMany({
        where,
        select: {
          id: true,
          vehicleMake: true,
          vehicleModel: true,
          price: true,
          paymentStatus: true,
          paymentMode: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          ledgerEntries: {
            orderBy: { transactionDate: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const allExpenseEntryIds = shipments.flatMap((shipment) =>
        shipment.ledgerEntries
          .filter((entry) => {
            const metadata =
              entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
                ? (entry.metadata as Record<string, unknown>)
                : null;

            return metadata?.isExpense === true;
          })
          .map((entry) => entry.id)
      );

      const companyLedgerEntries = allExpenseEntryIds.length
        ? await prisma.companyLedgerEntry.findMany({
            where: {
              reference: {
                in: allExpenseEntryIds.map((entryId) => `shipment-expense:${entryId}`),
              },
            },
            select: {
              id: true,
              companyId: true,
              description: true,
              reference: true,
              notes: true,
              metadata: true,
              company: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          })
        : [];

      const linkedCompanyEntriesByUserExpenseId = buildLinkedCompanyLedgerEntryMap(companyLedgerEntries);

      const shipmentReports = shipments.map(shipment => {
        // ⚡ Bolt: Single pass loop for evaluating transactions, separating expenses
        // from totalDebit and totalCredit to eliminate 4x iteration over ledgerEntries
        // and reduce memory allocation of intermediate arrays.
        let totalDebit = 0;
        let totalCredit = 0;
        let totalExpenses = 0;
        const expenses: typeof shipment.ledgerEntries = [];

        for (const e of shipment.ledgerEntries) {
          const isExpense = Boolean(
            e.metadata &&
            typeof e.metadata === 'object' &&
            'isExpense' in e.metadata &&
            (e.metadata as Record<string, unknown>).isExpense === true
          );

          if (isExpense) {
            expenses.push(e);
            totalExpenses += e.amount;
          } else {
            if (e.type === 'DEBIT') {
              totalDebit += e.amount;
            } else if (e.type === 'CREDIT') {
              totalCredit += e.amount;
            }
          }
        }

        // Phase 2 P&L fix: revenue = company's shipping price (shipment.price),
        // NOT totalCredit (what the customer paid). In a freight-forwarding P&L,
        // the company earns its shipping margin, not the full vehicle price.
        // profit = (price - expenses) — the company's operating profit on this shipment.
        const revenue = roundToCents(shipment.price || 0);
        const totalExpensesRounded = roundToCents(totalExpenses);
        const profit = roundToCents(revenue - totalExpensesRounded);

        return {
          shipmentId: shipment.id,
          vehicle: `${shipment.vehicleMake || ''} ${shipment.vehicleModel || ''}`.trim() || 'N/A',
          price: shipment.price || 0,
          paymentStatus: shipment.paymentStatus,
          paymentMode: shipment.paymentMode,
          totalCharged: roundToCents(totalDebit),
          totalPaid: roundToCents(totalCredit),
          amountDue: Math.max(0, roundToCents(totalDebit - totalCredit)),
          totalExpenses: totalExpensesRounded,
          revenue,
          profit,
          profitMargin: revenue > 0 ? (profit / revenue) * 100 : 0,
          expenses: expenses.map(e => ({
            id: e.id,
            description: e.description,
            amount: e.amount,
            type: (e.metadata as Record<string, unknown>)?.expenseType || 'OTHER',
            date: e.transactionDate,
            linkedCompanyLedgerEntry: linkedCompanyEntriesByUserExpenseId.get(e.id) || null,
          })),
          user: {
            id: shipment.user.id,
            name: shipment.user.name || shipment.user.email,
          },
          createdAt: shipment.createdAt,
          ledgerEntries: shipment.ledgerEntries,
        };
      });

      // Calculate overall summary (Phase 2: all values rounded to cents)
      const totalRevenue = roundToCents(shipmentReports.reduce((sum, s) => sum + s.revenue, 0));
      const totalExpensesAll = roundToCents(shipmentReports.reduce((sum, s) => sum + s.totalExpenses, 0));
      const totalProfit = roundToCents(totalRevenue - totalExpensesAll);
      const avgProfitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      return NextResponse.json({
        reportType: 'shipment-wise',
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now',
        },
        summary: {
          totalRevenue,
          totalExpenses: totalExpensesAll,
          totalProfit,
          avgProfitMargin,
          shipmentCount: shipmentReports.length,
        },
        shipments: shipmentReports,
      });
    } else if (reportType === 'pnl') {
      // UNIFIED PROFIT & LOSS (P&L) STATEMENT
      const expenseDateWhere: any = {};
      if (startDate || endDate) {
        expenseDateWhere.expenseDate = {};
        if (startDate) expenseDateWhere.expenseDate.gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          expenseDateWhere.expenseDate.lte = end;
        }
      }

      const [
        shipments,
        dispatchExpenses,
        containerExpenses,
        officeExpensesGrouped,
        officeExpensesTotal,
      ] = await Promise.all([
        prisma.shipment.findMany({
          where: dateWhere,
          select: {
            id: true,
            price: true,
            createdAt: true,
            ledgerEntries: {
              select: { id: true, amount: true, type: true, metadata: true, transactionDate: true },
            },
          },
        }),
        prisma.dispatchExpense.aggregate({
          where: dateWhere,
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.containerExpense.aggregate({
          where: dateWhere,
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.officeExpense.groupBy({
          by: ['category'],
          where: { ...expenseDateWhere, status: 'PAID' },
          _sum: { amount: true },
          _count: { id: true },
        }),
        prisma.officeExpense.aggregate({
          where: { ...expenseDateWhere, status: 'PAID' },
          _sum: { amount: true },
          _count: { id: true },
        }),
      ]);

      // 1. Gross Revenue
      let totalFreightRevenue = 0;
      let totalShipmentDirectExpenses = 0;

      for (const s of shipments) {
        totalFreightRevenue += s.price || 0;
        for (const e of s.ledgerEntries) {
          const meta = (e.metadata ?? {}) as Record<string, unknown>;
          if (meta.isExpense === true) {
            totalShipmentDirectExpenses += e.amount;
          }
        }
      }

      totalFreightRevenue = roundToCents(totalFreightRevenue);
      const totalDispatchExpenses = roundToCents(dispatchExpenses._sum.amount || 0);
      const totalContainerExpenses = roundToCents(containerExpenses._sum.amount || 0);
      const totalDirectLogisticsCosts = roundToCents(
        totalShipmentDirectExpenses + totalDispatchExpenses + totalContainerExpenses
      );

      // 2. Gross Margin
      const grossProfit = roundToCents(totalFreightRevenue - totalDirectLogisticsCosts);
      const grossMarginPercent = totalFreightRevenue > 0 ? (grossProfit / totalFreightRevenue) * 100 : 0;

      // 3. Operating Expenses (OpEx)
      const totalOpEx = roundToCents(officeExpensesTotal._sum.amount || 0);
      const opexByCategory = officeExpensesGrouped.map((g) => ({
        category: g.category,
        amount: roundToCents(g._sum.amount || 0),
        count: g._count.id,
        percentageOfOpEx: totalOpEx > 0 ? ((g._sum.amount || 0) / totalOpEx) * 100 : 0,
      })).sort((a, b) => b.amount - a.amount);

      // 4. Net Operating Income (EBITDA)
      const netOperatingIncome = roundToCents(grossProfit - totalOpEx);
      const netMarginPercent = totalFreightRevenue > 0 ? (netOperatingIncome / totalFreightRevenue) * 100 : 0;

      return NextResponse.json({
        reportType: 'pnl',
        period: {
          startDate: startDate || 'All time',
          endDate: endDate || 'Now',
        },
        revenue: {
          totalRevenue: totalFreightRevenue,
          freightRevenue: totalFreightRevenue,
          shipmentCount: shipments.length,
        },
        costOfGoodsSold: {
          totalCOGS: totalDirectLogisticsCosts,
          shipmentDirectExpenses: roundToCents(totalShipmentDirectExpenses),
          dispatchExpenses: totalDispatchExpenses,
          containerExpenses: totalContainerExpenses,
        },
        grossProfit: {
          amount: grossProfit,
          marginPercent: grossMarginPercent,
        },
        operatingExpenses: {
          totalOpEx,
          categories: opexByCategory,
          count: officeExpensesTotal._count.id || 0,
        },
        netIncome: {
          amount: netOperatingIncome,
          marginPercent: netMarginPercent,
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating financial report:', error);
    return NextResponse.json(
      { error: 'Failed to generate financial report' },
      { status: 500 }
    );
  }
}
