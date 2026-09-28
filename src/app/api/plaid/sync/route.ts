import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { isPlaidConfigured } from '@/lib/financial/plaid';
import { syncPlaidItem, syncPlaidItemsForUser } from '@/lib/financial/plaidSync';

const syncSchema = z.object({
  itemId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isPlaidConfigured()) {
    return NextResponse.json({ error: 'Plaid is not configured' }, { status: 503 });
  }

  try {
    const body = syncSchema.parse(await request.json().catch(() => ({})));

    if (body.itemId) {
      const plaidItem = await prisma.plaidItem.findFirst({
        where: {
          userId: session.user.id,
          itemId: body.itemId,
          status: 'ACTIVE',
        },
      });

      if (!plaidItem) {
        return NextResponse.json({ error: 'Connected account not found' }, { status: 404 });
      }

      const result = await syncPlaidItem(plaidItem);

      await createAuditLog('PlaidItem', plaidItem.id, 'UPDATE', session.user.id, { ...result }, request);

      return NextResponse.json({ results: [{ itemId: plaidItem.itemId, institutionName: plaidItem.institutionName, ...result }] });
    }

    const results = await syncPlaidItemsForUser(session.user.id);
    await createAuditLog('PlaidItem', session.user.id, 'UPDATE', session.user.id, { syncedItems: results.length }, request);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error syncing Plaid transactions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync connected bank account' },
      { status: 400 }
    );
  }
}