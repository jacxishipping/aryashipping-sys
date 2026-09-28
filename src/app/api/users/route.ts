import { NextResponse, NextRequest } from 'next/server';
import { Prisma, PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasPermission(session.user?.role, 'users:manage') && !hasPermission(session.user?.role, 'customers:view')) {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can view users' },
        { status: 403 }
      );
    }

    // parse pagination and search query params
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const pageSize = Math.max(1, parseInt(url.searchParams.get('pageSize') || '9', 10));
    const query = url.searchParams.get('query')?.trim() || '';
    const roleType = url.searchParams.get('roleType')?.trim() || 'all';

    if (roleType === 'users' && !hasPermission(session.user?.role, 'users:manage')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    if (roleType === 'customers' && !hasPermission(session.user?.role, 'customers:view')) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    // Build search filter
    const where: Prisma.UserWhereInput = {};
    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ];
    }

    if (roleType === 'customers') {
      where.role = 'user';
    } else if (roleType === 'users') {
      where.role = { in: ['admin', 'manager', 'finance', 'operations', 'customer_service'] };
    }

    // Execute database queries in parallel for performance
    const [total, admins, users] = await Promise.all([
      // counts for stats (total, admins, regularUsers) - always for all users
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...where, role: 'admin' } }),
      prisma.user.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          ledgerEntries: {
            select: {
              balance: true,
            },
            orderBy: [
              { createdAt: 'desc' },
              { id: 'desc' },
            ],
            take: 1,
          },
          _count: {
            select: { shipments: true }
          }
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const regularUsers = total - admins;

    const usersWithBalances = users.map(({ ledgerEntries, ...user }) => ({
      ...user,
      accountBalance: ledgerEntries[0]?.balance ?? 0,
    }));

    return NextResponse.json({ users: usersWithBalances, total, page, pageSize, admins, regularUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
