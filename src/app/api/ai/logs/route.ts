import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'shipments:read_all')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const feature = searchParams.get('feature');
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const limit = Number(searchParams.get('limit') || '50');

    const logs = await prisma.aiInteractionLog.findMany({
      where: {
        ...(feature ? { feature } : {}),
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });

    return NextResponse.json({ logs, count: logs.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch AI logs.' },
      { status: 500 },
    );
  }
}