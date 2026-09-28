import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { isFinicityConfigured } from '@/lib/financial/finicity';
import { ensureFinicityItemForUser, FINICITY_ITEM_PREFIX, generateFinicityConnectUrl } from '@/lib/financial/finicitySync';

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFinicityConfigured()) {
    return NextResponse.json({ error: 'Finicity is not configured' }, { status: 503 });
  }

  try {
    const existing = await prisma.plaidItem.findFirst({
      where: {
        userId: session.user.id,
        itemId: { startsWith: FINICITY_ITEM_PREFIX },
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'asc' },
    });

    const item = existing || await ensureFinicityItemForUser({
      userId: session.user.id,
      name: session.user.name,
      email: session.user.email,
    });

    const connectUrl = await generateFinicityConnectUrl(item);

    return NextResponse.json({ connectUrl });
  } catch (error) {
    console.error('Error creating Finicity connect URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initialize Finicity Connect' },
      { status: 500 }
    );
  }
}