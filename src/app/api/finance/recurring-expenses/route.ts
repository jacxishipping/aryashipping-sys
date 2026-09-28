import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { createRecurringExpense } from '@/lib/recurring-expenses';

const createRecurringSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  category: z.enum([
    'RENT',
    'UTILITIES',
    'SALARIES_PAYROLL',
    'OFFICE_SUPPLIES',
    'EQUIPMENT_HARDWARE',
    'SOFTWARE_SUBSCRIPTIONS',
    'MAINTENANCE_REPAIRS',
    'TRAVEL_TRANSPORT',
    'MARKETING_ADVERTISING',
    'LEGAL_PROFESSIONAL',
    'COMMUNICATION_INTERNET',
    'TAXES_GOVERNMENT_FEES',
    'BANK_FEES',
    'MEALS_ENTERTAINMENT',
    'OTHER',
  ]),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().default('USD'),
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'WEEKLY', 'BIWEEKLY']).default('MONTHLY'),
  dayOfMonth: z.number().int().min(1).max(31).default(1),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
  paymentMethod: z.string().default('BANK_TRANSFER'),
  vendor: z.string().optional(),
  referencePrefix: z.string().optional(),
  notes: z.string().optional(),
  autoCreatePaid: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'finance:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const frequency = searchParams.get('frequency');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (category && category !== 'ALL') where.category = category;
    if (frequency && frequency !== 'ALL') where.frequency = frequency;
    if (isActive !== null && isActive !== undefined && isActive !== 'ALL') {
      where.isActive = isActive === 'true';
    }

    const [recurringTemplates, activeTotalSum] = await Promise.all([
      prisma.recurringExpense.findMany({
        where,
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
          _count: { select: { generatedExpenses: true } },
        },
        orderBy: [{ isActive: 'desc' }, { nextDueDate: 'asc' }],
      }),
      prisma.recurringExpense.aggregate({
        where: { isActive: true },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      recurringTemplates,
      stats: {
        activeCount: activeTotalSum._count.id || 0,
        monthlyCommittedAmount: activeTotalSum._sum.amount || 0,
      },
    });
  } catch (error: any) {
    console.error('Error listing recurring expenses:', error);
    return NextResponse.json({ error: error.message || 'Failed to list recurring expenses' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createRecurringSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid form data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const recurring = await createRecurringExpense({
      ...parsed.data,
      createdById: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Recurring expense "${recurring.title}" created successfully.`,
      recurring,
    });
  } catch (error: any) {
    console.error('Error creating recurring expense:', error);
    return NextResponse.json({ error: error.message || 'Failed to create recurring expense' }, { status: 500 });
  }
}
