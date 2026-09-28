import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { getBudgetsWithActuals, createExpenseBudget } from '@/lib/expense-budgets';

const createBudgetSchema = z.object({
  name: z.string().min(1, 'Name is required'),
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
  ]).nullable().optional(),
  amount: z.number().positive('Budget amount must be positive'),
  currency: z.string().default('USD'),
  month: z.number().int().min(1).max(12).nullable().optional(),
  year: z.number().int().min(2020).max(2050).nullable().optional(),
  warningThreshold: z.number().min(1).max(100).default(80.0),
  notifyOnWarning: z.boolean().default(true),
  notifyOnExceeded: z.boolean().default(true),
  notes: z.string().nullable().optional(),
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
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined;

    const data = await getBudgetsWithActuals(year, month);

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch budgets' }, { status: 500 });
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
    const parsed = createBudgetSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: parsed.error.format() },
        { status: 400 }
      );
    }

    const budget = await createExpenseBudget({
      ...parsed.data,
      createdById: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Budget "${budget.name}" created successfully.`,
      budget,
    });
  } catch (error: any) {
    console.error('Error creating budget:', error);
    return NextResponse.json({ error: error.message || 'Failed to create budget' }, { status: 500 });
  }
}
