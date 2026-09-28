import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { isFinicityConfigured } from '@/lib/financial/finicity';
import { FINICITY_ITEM_PREFIX, syncFinicityItem, syncFinicityItemsForUser } from '@/lib/financial/finicitySync';

const syncSchema = z.object({
  itemId: z.string().optional(),
  refresh: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFinicityConfigured()) {
    return NextResponse.json({ error: 'Finicity is not configured' }, { status: 503 });
  }

  try {
    const body = syncSchema.parse(await request.json().catch(() => ({})));

    if (body.itemId) {
      const item = await prisma.plaidItem.findFirst({
        where: {
          userId: session.user.id,
          itemId: body.itemId,
          status: 'ACTIVE',
        },
      });

      if (!item || !item.itemId.startsWith(FINICITY_ITEM_PREFIX)) {
        return NextResponse.json({ error: 'Connected account not found' }, { status: 404 });
      }

      const result = await syncFinicityItem(item, { refresh: body.refresh });
      await createAuditLog('BankConnection', item.id, 'UPDATE', session.user.id, { provider: 'FINICITY', ...result }, request);

      return NextResponse.json({
        results: [
          {
            itemId: item.itemId,
            institutionName: item.institutionName,
            ...result,
          },
        ],
      });
    }

    const results = await syncFinicityItemsForUser(session.user.id, { refresh: body.refresh });
    await createAuditLog('BankConnection', session.user.id, 'UPDATE', session.user.id, { provider: 'FINICITY', syncedItems: results.length }, request);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error syncing Finicity transactions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync connected bank account' },
      { status: 400 }
    );
  }
}