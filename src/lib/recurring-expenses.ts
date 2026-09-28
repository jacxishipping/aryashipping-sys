import { prisma } from '@/lib/db';
import { OfficeExpenseCategory, RecurringFrequency, ExpensePaymentStatus } from '@prisma/client';
import { createAuditLog } from '@/lib/audit';

export interface CreateRecurringExpenseInput {
  title: string;
  category: OfficeExpenseCategory;
  amount: number;
  currency?: string;
  frequency: RecurringFrequency;
  dayOfMonth?: number;
  startDate?: Date | string;
  endDate?: Date | string | null;
  paymentMethod?: string;
  vendor?: string | null;
  referencePrefix?: string | null;
  notes?: string | null;
  autoCreatePaid?: boolean;
  createdById?: string;
}

export function computeNextDueDate(
  fromDate: Date,
  frequency: RecurringFrequency,
  dayOfMonth: number = 1
): Date {
  const next = new Date(fromDate);
  const targetDay = Math.min(Math.max(1, dayOfMonth), 28); // Safe day of month

  switch (frequency) {
    case 'WEEKLY':
      next.setDate(next.getDate() + 7);
      break;

    case 'BIWEEKLY':
      next.setDate(next.getDate() + 14);
      break;

    case 'MONTHLY':
      next.setMonth(next.getMonth() + 1);
      next.setDate(targetDay);
      break;

    case 'QUARTERLY':
      next.setMonth(next.getMonth() + 3);
      next.setDate(targetDay);
      break;

    case 'YEARLY':
      next.setFullYear(next.getFullYear() + 1);
      next.setDate(targetDay);
      break;
  }

  next.setHours(0, 0, 0, 0);
  return next;
}

export async function createRecurringExpense(input: CreateRecurringExpenseInput) {
  const {
    title,
    category,
    amount,
    currency = 'USD',
    frequency,
    dayOfMonth = 1,
    startDate = new Date(),
    endDate,
    paymentMethod = 'BANK_TRANSFER',
    vendor,
    referencePrefix,
    notes,
    autoCreatePaid = true,
    createdById,
  } = input;

  if (!title || title.trim().length === 0) {
    throw new Error('Title is required for recurring expense');
  }

  if (!amount || amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = endDate ? (typeof endDate === 'string' ? new Date(endDate) : endDate) : null;

  // Compute first due date
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let nextDue = new Date(start);
  nextDue.setHours(0, 0, 0, 0);

  const recurring = await prisma.recurringExpense.create({
    data: {
      title: title.trim(),
      category,
      amount,
      currency,
      frequency,
      dayOfMonth,
      startDate: start,
      endDate: end,
      paymentMethod,
      vendor: vendor?.trim() || null,
      referencePrefix: referencePrefix?.trim() || null,
      notes: notes?.trim() || null,
      isActive: true,
      autoCreatePaid,
      nextDueDate: nextDue,
      createdById: createdById || null,
    },
  });

  if (createdById) {
    await createAuditLog(
      'RecurringExpense',
      recurring.id,
      'CREATE',
      createdById,
      { title: recurring.title, amount: recurring.amount, frequency: recurring.frequency }
    );
  }

  return recurring;
}

export async function processDueRecurringExpenses(triggeredById?: string) {
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  // Find all active templates whose nextDueDate is today or in the past
  const dueTemplates = await prisma.recurringExpense.findMany({
    where: {
      isActive: true,
      nextDueDate: { lte: now },
      OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
    },
  });

  const generatedList = [];

  for (const template of dueTemplates) {
    const expenseDate = new Date(template.nextDueDate);
    const dateStr = expenseDate.toISOString().slice(0, 10).replace(/-/g, '');
    const refNum = template.referencePrefix
      ? `${template.referencePrefix}-${dateStr}`
      : `REC-${template.category.slice(0, 4)}-${dateStr}`;

    const createdExpense = await prisma.$transaction(async (tx) => {
      // 1. Create Office Expense
      const expense = await tx.officeExpense.create({
        data: {
          title: `${template.title} (${expenseDate.toLocaleString('default', { month: 'short', year: 'numeric' })})`,
          category: template.category,
          amount: template.amount,
          currency: template.currency,
          expenseDate,
          paymentMethod: template.paymentMethod,
          vendor: template.vendor,
          referenceNumber: refNum,
          notes: template.notes
            ? `${template.notes} [Auto-generated from recurring template]`
            : 'Auto-generated from recurring schedule',
          status: template.autoCreatePaid ? ExpensePaymentStatus.PAID : ExpensePaymentStatus.PENDING,
          recurringExpenseId: template.id,
          recordedById: triggeredById || template.createdById || null,
        },
      });

      // 2. Compute next due date
      const nextDue = computeNextDueDate(template.nextDueDate, template.frequency, template.dayOfMonth);

      // Check if next due date exceeds end date
      const isStillActive = !template.endDate || nextDue <= template.endDate;

      // 3. Update template
      await tx.recurringExpense.update({
        where: { id: template.id },
        data: {
          lastGeneratedDate: expenseDate,
          nextDueDate: nextDue,
          isActive: isStillActive,
        },
      });

      return expense;
    });

    generatedList.push({
      templateId: template.id,
      templateTitle: template.title,
      expenseId: createdExpense.id,
      amount: createdExpense.amount,
      expenseDate: createdExpense.expenseDate,
      referenceNumber: refNum,
    });
  }

  return {
    processedCount: generatedList.length,
    generatedExpenses: generatedList,
  };
}
