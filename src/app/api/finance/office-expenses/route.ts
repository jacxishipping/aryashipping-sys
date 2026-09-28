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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const skip = (page - 1) * limit;

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
      if (startDate) {
        where.expenseDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.expenseDate.lte = end;
      }
    }

    const now = new Date();
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfCurrentYear = new Date(now.getFullYear(), 0, 1);

    const [expenses, totalCount, aggregateStats, thisMonthStats, thisYearStats, categoryStats] = await Promise.all([
      prisma.officeExpense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
        include: {
          recordedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.officeExpense.count({ where }),
      prisma.officeExpense.aggregate({
        where,
        _sum: { amount: true },
        _avg: { amount: true },
        _count: { id: true },
      }),
      prisma.officeExpense.aggregate({
        where: {
          ...where,
          expenseDate: { gte: startOfCurrentMonth },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.officeExpense.aggregate({
        where: {
          ...where,
          expenseDate: { gte: startOfCurrentYear },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.officeExpense.groupBy({
        by: ['category'],
        where,
        _sum: { amount: true },
        _count: { id: true },
        orderBy: {
          _sum: { amount: 'desc' },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      expenses,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      summary: {
        totalAmount: aggregateStats._sum.amount || 0,
        averageAmount: aggregateStats._avg.amount || 0,
        totalCount: aggregateStats._count.id || 0,
        thisMonthAmount: thisMonthStats._sum.amount || 0,
        thisMonthCount: thisMonthStats._count.id || 0,
        thisYearAmount: thisYearStats._sum.amount || 0,
        thisYearCount: thisYearStats._count.id || 0,
        categoryBreakdown: categoryStats.map((c) => ({
          category: c.category,
          amount: c._sum.amount || 0,
          count: c._count.id || 0,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching office expenses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch office expenses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user.role || '').toLowerCase();
    if (!hasPermission(role, 'finance:manage') && !hasPermission(role, 'expenses:post') && role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      category,
      amount,
      currency = 'USD',
      expenseDate,
      paymentMethod = 'CASH',
      vendor,
      referenceNumber,
      receiptUrl,
      receiptName,
      notes,
      status = 'PAID',
    } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const parsedAmount = parseFloat(String(amount));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'A valid positive amount is required' }, { status: 400 });
    }

    const validCategory = Object.values(OfficeExpenseCategory).includes(category)
      ? (category as OfficeExpenseCategory)
      : OfficeExpenseCategory.OTHER;

    const validStatus = Object.values(ExpensePaymentStatus).includes(status)
      ? (status as ExpensePaymentStatus)
      : ExpensePaymentStatus.PAID;

    const createdExpense = await prisma.officeExpense.create({
      data: {
        title: title.trim(),
        category: validCategory,
        amount: parsedAmount,
        currency: currency || 'USD',
        expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
        paymentMethod: (paymentMethod || 'CASH').toUpperCase().trim(),
        vendor: vendor?.trim() || null,
        referenceNumber: referenceNumber?.trim() || null,
        receiptUrl: receiptUrl?.trim() || null,
        receiptName: receiptName?.trim() || null,
        notes: notes?.trim() || null,
        status: validStatus,
        recordedById: session.user.id,
      },
      include: {
        recordedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Office expense recorded successfully',
      expense: createdExpense,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating office expense:', error);
    return NextResponse.json(
      { error: 'Failed to record office expense' },
      { status: 500 }
    );
  }
}
