import { Prisma, PlaidItem } from '@prisma/client';
import { PersonalFinanceCategoryVersion } from 'plaid';
import type { Transaction as PlaidTransaction, TransactionsSyncResponse } from 'plaid';
import { prisma } from '@/lib/db';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { decryptSecret } from '@/lib/financial/secretBox';
import { getPlaidClient } from '@/lib/financial/plaid';

type DbClient = Prisma.TransactionClient | typeof prisma;

interface SyncCounts {
  importedCount: number;
  updatedCount: number;
  removedCount: number;
  skippedPendingCount: number;
}

function getTransactionDate(transaction: PlaidTransaction) {
  const value = transaction.authorized_date || transaction.date;
  return new Date(`${value}T12:00:00.000Z`);
}

function mapTransactionDirection(amount: number) {
  if (amount < 0) {
    return { type: 'DEBIT' as const, amount: Math.abs(amount) };
  }

  return { type: 'CREDIT' as const, amount: Math.abs(amount) };
}

function buildDescription(transaction: PlaidTransaction) {
  return transaction.merchant_name || transaction.name || transaction.original_description || 'Plaid bank transaction';
}

function buildNotes(transaction: PlaidTransaction, accountLabel: string | undefined, institutionName: string | null) {
  const parts: string[] = [];

  if (accountLabel) {
    parts.push(accountLabel);
  }

  if (institutionName) {
    parts.push(institutionName);
  }

  if (transaction.original_description && transaction.original_description !== buildDescription(transaction)) {
    parts.push(transaction.original_description);
  }

  const counterparty = transaction.counterparties?.[0]?.name;
  if (counterparty && counterparty !== buildDescription(transaction)) {
    parts.push(counterparty);
  }

  return parts.length > 0 ? parts.join(' | ') : null;
}

function buildMetadata(input: {
  transaction: PlaidTransaction;
  plaidItem: PlaidItem;
  account?: { account_id: string; name: string; mask: string | null; subtype: string | null; type: string };
}) {
  const { transaction, plaidItem, account } = input;
  const category = transaction.personal_finance_category?.detailed || transaction.personal_finance_category?.primary || null;

  return {
    importSource: 'PLAID_TRANSACTIONS',
    plaidTransactionId: transaction.transaction_id,
    plaidItemId: plaidItem.itemId,
    plaidAccountId: transaction.account_id,
    plaidAccountName: account?.name || null,
    plaidAccountMask: account?.mask || null,
    plaidAccountSubtype: account?.subtype || null,
    plaidAccountType: account?.type || null,
    institutionId: plaidItem.institutionId,
    institutionName: plaidItem.institutionName,
    originalDescription: transaction.original_description || null,
    paymentChannel: transaction.payment_channel,
    referenceNumber: transaction.payment_meta?.reference_number || null,
    personalFinanceCategory: category,
    pending: transaction.pending,
    syncedAt: new Date().toISOString(),
  } satisfies Prisma.InputJsonValue;
}

async function fetchTransactionUpdates(plaidItem: PlaidItem) {
  const client = getPlaidClient();
  const accessToken = decryptSecret(plaidItem.accessTokenCiphertext);
  let cursor = plaidItem.lastCursor || undefined;
  let hasMore = true;
  let latestResponse: TransactionsSyncResponse | null = null;
  const added: PlaidTransaction[] = [];
  const modified: PlaidTransaction[] = [];
  const removed: { transaction_id: string; account_id: string }[] = [];

  while (hasMore) {
    const response = await client.transactionsSync({
      access_token: accessToken,
      cursor,
      count: 100,
      options: {
        include_original_description: true,
        personal_finance_category_version: PersonalFinanceCategoryVersion.V2,
      },
    });

    latestResponse = response.data;
    added.push(...latestResponse.added);
    modified.push(...latestResponse.modified);
    removed.push(...latestResponse.removed.map((entry) => ({
      transaction_id: entry.transaction_id,
      account_id: entry.account_id,
    })));
    cursor = latestResponse.next_cursor;
    hasMore = latestResponse.has_more;
  }

  return {
    cursor: cursor || plaidItem.lastCursor || null,
    accounts: latestResponse?.accounts || [],
    added,
    modified,
    removed,
  };
}

async function applyTransactionUpdates(
  db: DbClient,
  plaidItem: PlaidItem,
  updates: Awaited<ReturnType<typeof fetchTransactionUpdates>>
): Promise<SyncCounts> {
  const counts: SyncCounts = {
    importedCount: 0,
    updatedCount: 0,
    removedCount: 0,
    skippedPendingCount: 0,
  };

  const accountsById = new Map(
    updates.accounts.map((account) => [account.account_id, account])
  );

  const upsertTransactions = [...updates.added, ...updates.modified];
  const transactionIds = upsertTransactions.map((transaction) => transaction.transaction_id);
  const existingLinks = transactionIds.length
    ? await db.plaidSyncedTransaction.findMany({
        where: { plaidTransactionId: { in: transactionIds } },
      })
    : [];

  const linksByTransactionId = new Map(
    existingLinks.map((entry) => [entry.plaidTransactionId, entry])
  );

  for (const transaction of upsertTransactions) {
    if (transaction.pending) {
      counts.skippedPendingCount += 1;
      continue;
    }

    const account = accountsById.get(transaction.account_id);
    const accountLabel = account
      ? `${account.name}${account.mask ? ` • ${account.mask}` : ''}`
      : undefined;
    const { type, amount } = mapTransactionDirection(transaction.amount);
    const description = buildDescription(transaction);
    const notes = buildNotes(transaction, accountLabel, plaidItem.institutionName);
    const metadata = buildMetadata({ transaction, plaidItem, account });
    const existingLink = linksByTransactionId.get(transaction.transaction_id);

    if (existingLink?.ledgerEntryId) {
      await db.ledgerEntry.update({
        where: { id: existingLink.ledgerEntryId },
        data: {
          description,
          type,
          amount,
          transactionDate: getTransactionDate(transaction),
          notes,
          metadata,
        },
      });

      await db.plaidSyncedTransaction.update({
        where: { id: existingLink.id },
        data: {
          isRemoved: false,
          transactionDate: getTransactionDate(transaction),
          amount,
        },
      });

      counts.updatedCount += 1;
      continue;
    }

    const createdEntry = await db.ledgerEntry.create({
      data: {
        userId: plaidItem.userId,
        description,
        type,
        amount,
        balance: 0,
        transactionDate: getTransactionDate(transaction),
        createdBy: plaidItem.userId,
        notes,
        metadata,
      },
    });

    if (existingLink) {
      await db.plaidSyncedTransaction.update({
        where: { id: existingLink.id },
        data: {
          ledgerEntryId: createdEntry.id,
          isRemoved: false,
          transactionDate: getTransactionDate(transaction),
          amount,
          accountId: transaction.account_id,
        },
      });
    } else {
      await db.plaidSyncedTransaction.create({
        data: {
          plaidItemId: plaidItem.id,
          plaidTransactionId: transaction.transaction_id,
          accountId: transaction.account_id,
          ledgerEntryId: createdEntry.id,
          transactionDate: getTransactionDate(transaction),
          amount,
        },
      });
    }

    // Phase 3: upsert a BankReconciliation row so the bank row is linked to
    // the ledger entry by a global key, not just by Plaid-internal metadata.
    // This makes cross-source dedup and reporting possible.
    await db.bankReconciliation.upsert({
      where: {
        bankSource_sourceKey: {
          bankSource: 'PLAID',
          sourceKey: transaction.transaction_id,
        },
      },
      update: {
        ledgerEntryId: createdEntry.id,
        status: 'MATCHED',
        matchedAt: new Date(),
      },
      create: {
        bankSource: 'PLAID',
        sourceKey: transaction.transaction_id,
        ledgerEntryId: createdEntry.id,
        status: 'MATCHED',
        matchedAt: new Date(),
      },
    });

    counts.importedCount += 1;
  }

  if (updates.removed.length > 0) {
    const removedLinks = await db.plaidSyncedTransaction.findMany({
      where: {
        plaidTransactionId: {
          in: updates.removed.map((entry) => entry.transaction_id),
        },
      },
    });

    for (const removedLink of removedLinks) {
      if (removedLink.ledgerEntryId) {
        const entry = await db.ledgerEntry.findUnique({
          where: { id: removedLink.ledgerEntryId },
          select: { metadata: true },
        });

        if (entry) {
          const metadata = {
            ...((entry.metadata as Record<string, unknown> | null) || {}),
            plaidRemovedAt: new Date().toISOString(),
          } as Prisma.InputJsonValue;

          await db.ledgerEntry.update({
            where: { id: removedLink.ledgerEntryId },
            data: { metadata },
          });
        }
      }

      await db.plaidSyncedTransaction.update({
        where: { id: removedLink.id },
        data: { isRemoved: true },
      });
      counts.removedCount += 1;
    }
  }

  if (counts.importedCount > 0 || counts.updatedCount > 0 || counts.removedCount > 0) {
    await recalculateUserLedgerBalances(db, plaidItem.userId);
  }

  await db.plaidItem.update({
    where: { id: plaidItem.id },
    data: {
      lastCursor: updates.cursor,
      lastSyncAt: new Date(),
      selectedAccounts: updates.accounts.map((account) => ({
        accountId: account.account_id,
        name: account.name,
        mask: account.mask,
        subtype: account.subtype,
        type: account.type,
        balances: account.balances,
      })) as unknown as Prisma.InputJsonValue,
    },
  });

  return counts;
}

export async function syncPlaidItem(plaidItem: PlaidItem) {
  const updates = await fetchTransactionUpdates(plaidItem);
  return prisma.$transaction((tx) => applyTransactionUpdates(tx, plaidItem, updates));
}

export async function syncPlaidItemsForUser(userId: string) {
  const items = await prisma.plaidItem.findMany({
    where: { userId, status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });

  const results = [];

  for (const item of items) {
    const result = await syncPlaidItem(item);
    results.push({
      itemId: item.itemId,
      institutionName: item.institutionName,
      ...result,
    });
  }

  return results;
}

export async function syncAllPlaidItems() {
  const items = await prisma.plaidItem.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { createdAt: 'asc' },
  });

  const results = [];

  for (const item of items) {
    const result = await syncPlaidItem(item);
    results.push({
      itemId: item.itemId,
      userId: item.userId,
      institutionName: item.institutionName,
      ...result,
    });
  }

  return results;
}