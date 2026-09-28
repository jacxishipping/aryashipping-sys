import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { prisma } from '@/lib/db';
import { encryptSecret } from '@/lib/financial/secretBox';
import { getPlaidClient, isPlaidConfigured } from '@/lib/financial/plaid';
import { syncPlaidItem } from '@/lib/financial/plaidSync';

const exchangeSchema = z.object({
  publicToken: z.string().min(1),
  institution: z
    .object({
      institution_id: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  accounts: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        mask: z.string().nullable().optional(),
        subtype: z.string().nullable().optional(),
        type: z.string(),
      })
    )
    .optional(),
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
    const body = exchangeSchema.parse(await request.json());
    const client = getPlaidClient();
    const exchange = await client.itemPublicTokenExchange({ public_token: body.publicToken });

    const plaidItem = await prisma.plaidItem.upsert({
      where: { itemId: exchange.data.item_id },
      update: {
        userId: session.user.id,
        accessTokenCiphertext: encryptSecret(exchange.data.access_token),
        institutionId: body.institution?.institution_id || null,
        institutionName: body.institution?.name || null,
        selectedAccounts: (body.accounts || []) as Prisma.InputJsonValue,
        status: 'ACTIVE',
      },
      create: {
        userId: session.user.id,
        itemId: exchange.data.item_id,
        accessTokenCiphertext: encryptSecret(exchange.data.access_token),
        institutionId: body.institution?.institution_id || null,
        institutionName: body.institution?.name || null,
        selectedAccounts: (body.accounts || []) as Prisma.InputJsonValue,
      },
    });

    const syncResult = await syncPlaidItem(plaidItem);

    await createAuditLog(
      'PlaidItem',
      plaidItem.id,
      'CREATE',
      session.user.id,
      {
        institutionName: plaidItem.institutionName,
        importedCount: syncResult.importedCount,
        updatedCount: syncResult.updatedCount,
        removedCount: syncResult.removedCount,
      },
      request
    );

    return NextResponse.json({
      itemId: plaidItem.itemId,
      institutionName: plaidItem.institutionName,
      sync: syncResult,
    });
  } catch (error) {
    console.error('Error exchanging Plaid public token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to link bank account' },
      { status: 400 }
    );
  }
}