import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await prisma.plaidItem.findMany({
    where: {
      userId: session.user.id,
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      itemId: true,
      institutionId: true,
      institutionName: true,
      lastSyncAt: true,
      selectedAccounts: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ items });
}