import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasAnyPermission, hasPermission } from '@/lib/rbac';
import { executeLedgerTransfer } from '@/lib/ledger-transfer';

const transferInputSchema = z.object({
  transferType: z.enum(['USER_TO_USER', 'USER_TO_COMPANY', 'COMPANY_TO_USER', 'COMPANY_TO_COMPANY']),
  amount: z.number().positive({ message: 'Amount must be greater than 0' }),
  currency: z.string().default('USD'),
  transferDate: z.string().optional(),
  sourceUserId: z.string().optional(),
  sourceCompanyId: z.string().optional(),
  destUserId: z.string().optional(),
  destCompanyId: z.string().optional(),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user.role, ['finance:view', 'finance:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const transferType = searchParams.get('transferType');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (transferType) {
      whereClause.transferType = transferType;
    }

    if (status) {
      whereClause.status = status;
    }

    if (startDate || endDate) {
      whereClause.transferDate = {};
      if (startDate) {
        whereClause.transferDate.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.transferDate.lte = end;
      }
    }

    if (search) {
      whereClause.OR = [
        { transferNumber: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { sourceUser: { name: { contains: search, mode: 'insensitive' } } },
        { sourceUser: { email: { contains: search, mode: 'insensitive' } } },
        { destUser: { name: { contains: search, mode: 'insensitive' } } },
        { destUser: { email: { contains: search, mode: 'insensitive' } } },
        { sourceCompany: { name: { contains: search, mode: 'insensitive' } } },
        { destCompany: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [transfers, totalCount, aggregateStats] = await Promise.all([
      prisma.ledgerTransfer.findMany({
        where: whereClause,
        include: {
          sourceUser: { select: { id: true, name: true, email: true } },
          sourceCompany: { select: { id: true, name: true, code: true } },
          destUser: { select: { id: true, name: true, email: true } },
          destCompany: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { transferDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ledgerTransfer.count({ where: whereClause }),
      prisma.ledgerTransfer.aggregate({
        where: { ...whereClause, status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    // Breakdown metrics
    const [userToUserCount, userToCompanyCount, companyToUserCount, companyToCompanyCount] = await Promise.all([
      prisma.ledgerTransfer.count({ where: { ...whereClause, transferType: 'USER_TO_USER', status: 'COMPLETED' } }),
      prisma.ledgerTransfer.count({ where: { ...whereClause, transferType: 'USER_TO_COMPANY', status: 'COMPLETED' } }),
      prisma.ledgerTransfer.count({ where: { ...whereClause, transferType: 'COMPANY_TO_USER', status: 'COMPLETED' } }),
      prisma.ledgerTransfer.count({ where: { ...whereClause, transferType: 'COMPANY_TO_COMPANY', status: 'COMPLETED' } }),
    ]);

    return NextResponse.json({
      transfers,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
      stats: {
        totalAmount: aggregateStats._sum.amount || 0,
        completedCount: aggregateStats._count.id || 0,
        userToUserCount,
        userToCompanyCount,
        companyToUserCount,
        companyToCompanyCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching ledger transfers:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch transfers' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to execute ledger transfers' }, { status: 403 });
    }

    const body = await request.json();
    const validation = transferInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input data', details: validation.error.format() },
        { status: 400 }
      );
    }

    const result = await executeLedgerTransfer({
      ...validation.data,
      createdById: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: `Transfer ${result.transfer.transferNumber} executed successfully.`,
      transfer: result.transfer,
      sourceNewBalance: result.sourceNewBalance,
      destNewBalance: result.destNewBalance,
      sourceName: result.sourceName,
      destName: result.destName,
    });
  } catch (error: any) {
    console.error('Error executing ledger transfer:', error);
    return NextResponse.json({ error: error.message || 'Failed to execute transfer' }, { status: 500 });
  }
}
