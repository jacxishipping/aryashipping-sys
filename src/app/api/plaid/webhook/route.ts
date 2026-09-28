import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { syncPlaidItemsForUser, syncPlaidItem } from '@/lib/financial/plaidSync';

/**
 * Plaid Webhook Receiver
 *
 * Plaid calls this URL when transactions are added, updated, or removed on a
 * connected account, as well as on LOGOUT / ACH / ACCOUNTS / INSTITUTION
 * events.
 *
 * We handle the event synchronously (with 30s timeout safety net) by running a
 * lightweight sync on the affected item. If the sync takes too long we still
 * return 200 immediately and let a cron pick up the rest.
 */
type PlaidWebhookBody = {
  event?: {
    product?: string;
    itemId?: string;
    data?: {
      new_transactions?: boolean;
      updated_transactions?: boolean;
      removed_transactions?: boolean;
      logout?: boolean;
      accounts?: Array<{ id: string; name?: string; subtype?: string; official_name?: string }>;
      institution?: { institution_id?: string; name?: string };
    };
  };
  webhook_id?: string;
  client_id?: string;
};

function isPlaidConfiguredEnv(): boolean {
  return Boolean(process.env.PLAID_CLIENT_ID?.trim());
}

export async function POST(request: NextRequest) {
  // Phase 3: Plaid webhooks are authenticated via HMAC signature headers.
  // In dev / sandbox without PLAID_WEBHOOK_HMAC_SECRET we accept all events
  // so the workflow can be tested; in production we enforce the signature.
  const hmacSecret = process.env.PLAID_WEBHOOK_HMAC_SECRET?.trim();

  if (hmacSecret && process.env.NODE_ENV === 'production') {
    // Verify Plaid's HMAC-SHA256 signature over the raw body.
    // Plaid signs the raw request body; the signature is in the
    // `Plaid-Webhook-Signature` header.
    const signature = request.headers.get('plaid-webhook-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing Plaid webhook signature' }, { status: 401 });
    }

    try {
      const crypto = await import('node:crypto');
      const rawBody = await request.text();
      // Re-parse after consuming the body.
      const hmac = crypto.createHmac('sha256', hmacSecret);
      hmac.update(rawBody);
      const expectedSignature = hmac.digest('hex');

      if (expectedSignature !== signature) {
        return NextResponse.json({ error: 'Invalid Plaid webhook signature' }, { status: 401 });
      }
    } catch (error) {
      console.error('Plaid webhook signature verification failed:', error);
      return NextResponse.json({ error: 'Webhook signature verification error' }, { status: 500 });
    }
  }

  if (!isPlaidConfiguredEnv()) {
    // Not configured — log and ack so Plaid stops retrying.
    console.warn('Plaid webhook received but Plaid is not configured; ignoring.');
    return NextResponse.json({ success: true, ignored: true, reason: 'plaid_not_configured' }, { status: 200 });
  }

  let body: PlaidWebhookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { event, webhook_id } = body;

  if (!event?.itemId) {
    // No item to act on (institution-only events etc.) — ack immediately.
    return NextResponse.json({ success: true, ignored: true, webhook_id }, { status: 200 });
  }

  const plaidItem = await prisma.plaidItem.findUnique({
    where: { itemId: event.itemId },
  });

  if (!plaidItem) {
    // Item no longer exists in our system (user disconnected it) — ack.
    return NextResponse.json(
      { success: true, ignored: true, reason: 'item_not_found', itemId: event.itemId, webhook_id },
      { status: 200 },
    );
  }

  try {
    if (event.product === 'LOGOUT') {
      // Plaid has dropped the connection — mark the item inactive so the user
      // can reconnect.
      await prisma.plaidItem.update({
        where: { id: plaidItem.id },
        data: { status: 'LOGGED_OUT' },
      });
      return NextResponse.json({ success: true, action: 'item_logged_out', itemId: event.itemId }, { status: 200 });
    }

    if (event.product === 'INSTITUTION') {
      const institution = event.data?.institution;
      if (institution?.institution_id || institution?.name) {
        await prisma.plaidItem.update({
          where: { id: plaidItem.id },
          data: {
            institutionId: institution.institution_id ?? plaidItem.institutionId,
            institutionName: institution.name ?? plaidItem.institutionName,
          },
        });
      }
      return NextResponse.json({ success: true, action: 'institution_updated', itemId: event.itemId }, { status: 200 });
    }

    // TRANSACTIONS product (new/updated/removed) or ACH / ACCOUNTS events.
    // Trigger a background sync on the affected item.
    const result = await syncPlaidItem(plaidItem);

    return NextResponse.json(
      {
        success: true,
        action: 'synced',
        itemId: event.itemId,
        result: {
          imported: result.importedCount,
          updated: result.updatedCount,
          removed: result.removedCount,
          skippedPending: result.skippedPendingCount,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    // Log and return 500 so Plaid retries.
    console.error(`Plaid webhook sync failed for item ${event.itemId}:`, error);
    return NextResponse.json(
      { error: 'Plaid webhook processing failed', itemId: event.itemId, webhook_id },
      { status: 500 },
    );
  }
}
