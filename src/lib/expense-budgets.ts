import { prisma } from '@/lib/db';
import { OfficeExpenseCategory } from '@prisma/client';
import { createAuditLog } from '@/lib/audit';
import { roundToCents } from '@/lib/financial/money';

export interface CreateBudgetInput {
  name: string;
  category?: OfficeExpenseCategory | null;
  amount: number;
  currency?: string;
  month?: number | null;
  year?: number | null;
  warningThreshold?: number;
  notifyOnWarning?: boolean;
  notifyOnExceeded?: boolean;
  notes?: string | null;
  createdById?: string;
}

export type BudgetStatus = 'SAFE' | 'WARNING' | 'EXCEEDED';

export interface BudgetWithActuals {
  id: string;
  name: string;
  category: OfficeExpenseCategory | null;
  categoryLabel: string;
  budgetAmount: number;
  actualSpent: number;
  remainingAmount: number;
  percentageUsed: number;
  warningThreshold: number;
  status: BudgetStatus;
  month: number | null;
  year: number | null;
  notes: string | null;
  createdAt: Date;
}

export async function getBudgetsWithActuals(targetYear?: number, targetMonth?: number) {
  const now = new Date();
  const year = targetYear ?? now.getFullYear();
  const month = targetMonth ?? now.getMonth() + 1; // 1-12

  // Month date range
  const startDate = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // 1. Fetch budgets applicable to this month or perpetual
  const budgets = await prisma.expenseBudget.findMany({
    where: {
      OR: [
        { year: null, month: null },
        { year, month },
        { year, month: null },
      ],
    },
    orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
  });

  // 2. Fetch actual office expenses in this month grouped by category
  const [actualsByCategory, totalMonthActuals] = await Promise.all([
    prisma.officeExpense.groupBy({
      by: ['category'],
      where: {
        expenseDate: { gte: startDate, lte: endDate },
        status: 'PAID',
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.officeExpense.aggregate({
      where: {
        expenseDate: { gte: startDate, lte: endDate },
        status: 'PAID',
      },
      _sum: { amount: true },
    }),
  ]);

  const spentMap = new Map<string, number>();
  for (const g of actualsByCategory) {
    spentMap.set(g.category, roundToCents(g._sum.amount || 0));
  }

  const totalActualSpent = roundToCents(totalMonthActuals._sum.amount || 0);

  // 3. Compute actuals & alerts for each budget
  let totalBudgetCaps = 0;
  let alertCount = 0;

  const budgetList: BudgetWithActuals[] = budgets.map((b) => {
    let actual = 0;
    if (b.category) {
      actual = spentMap.get(b.category) || 0;
    } else {
      // Overall monthly cap
      actual = totalActualSpent;
    }

    const budgetAmount = roundToCents(b.amount);
    totalBudgetCaps += budgetAmount;

    const remainingAmount = roundToCents(budgetAmount - actual);
    const percentageUsed = budgetAmount > 0 ? (actual / budgetAmount) * 100 : 0;
    const warningLimit = b.warningThreshold || 80.0;

    let status: BudgetStatus = 'SAFE';
    if (percentageUsed >= 100) {
      status = 'EXCEEDED';
      alertCount++;
    } else if (percentageUsed >= warningLimit) {
      status = 'WARNING';
      alertCount++;
    }

    return {
      id: b.id,
      name: b.name,
      category: b.category,
      categoryLabel: b.category ? b.category.replace(/_/g, ' ') : 'Total Monthly OpEx',
      budgetAmount,
      actualSpent: actual,
      remainingAmount,
      percentageUsed: roundToCents(percentageUsed),
      warningThreshold: warningLimit,
      status,
      month: b.month,
      year: b.year,
      notes: b.notes,
      createdAt: b.createdAt,
    };
  });

  return {
    year,
    month,
    budgets: budgetList,
    summary: {
      totalBudgetCap: roundToCents(totalBudgetCaps),
      totalActualSpent,
      totalRemaining: roundToCents(totalBudgetCaps - totalActualSpent),
      overallPercentageUsed: totalBudgetCaps > 0 ? roundToCents((totalActualSpent / totalBudgetCaps) * 100) : 0,
      activeAlertsCount: alertCount,
    },
  };
}

export async function createExpenseBudget(input: CreateBudgetInput) {
  const {
    name,
    category,
    amount,
    currency = 'USD',
    month,
    year,
    warningThreshold = 80.0,
    notifyOnWarning = true,
    notifyOnExceeded = true,
    notes,
    createdById,
  } = input;

  if (!name || name.trim().length === 0) {
    throw new Error('Budget name is required');
  }

  if (!amount || amount <= 0) {
    throw new Error('Budget limit amount must be greater than zero');
  }

  const budget = await prisma.expenseBudget.create({
    data: {
      name: name.trim(),
      category: category || null,
      amount: roundToCents(amount),
      currency,
      month: month || null,
      year: year || null,
      warningThreshold,
      notifyOnWarning,
      notifyOnExceeded,
      notes: notes?.trim() || null,
      createdById: createdById || null,
    },
  });

  if (createdById) {
    await createAuditLog('ExpenseBudget', budget.id, 'CREATE', createdById, {
      name: budget.name,
      amount: budget.amount,
      category: budget.category,
    });
  }

  return budget;
}
