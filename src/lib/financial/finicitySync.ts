import { Prisma, PlaidItem } from '@prisma/client';
import { prisma } from '@/lib/db';
import { recalculateUserLedgerBalances } from '@/lib/user-ledger';
import { decryptSecret, encryptSecret } from '@/lib/financial/secretBox';
import {
  finicityRequest,
  getFinicityBankImportSource,
  getFinicityConnectRedirectUrl,
  getFinicityPartnerId,
  type FinicityConnectUrlResponse,
  type FinicityCustomer,
  type FinicityCustomerAccount,
  type FinicityCustomerAccountsResponse,
  type FinicityTransaction,
  type FinicityTransactionsResponse,
} from '@/lib/financial/finicity';

type DbClient = Prisma.TransactionClient | typeof prisma;

export interface SyncCounts {
  importedCount: number;
  updatedCount: number;
  removedCount: number;
  skippedPendingCount: number;
}

export const FINICITY_ITEM_PREFIX = 'finicity-customer:';

function getUnixSeconds(date: Date) {
  return Math.floor(date.getTime() / 1000);
}

function toIsoDate(epochSeconds?: number) {
  if (!epochSeconds) {
    return null;
  }

  return new Date(epochSeconds * 1000).toISOString();
}

function toTransactionDate(transaction: FinicityTransaction) {
  const epochSeconds = transaction.transactionDate || transaction.postedDate || transaction.createdDate;
  return new Date(epochSeconds * 1000);
}

function buildUsername(userId: string) {
  return `jacxi-${userId}`.slice(0, 100);
}

function getCustomerIdFromItem(item: PlaidItem) {
  if (item.itemId.startsWith(FINICITY_ITEM_PREFIX)) {
    return item.itemId.slice(FINICITY_ITEM_PREFIX.length);
  }

  return decryptSecret(item.accessTokenCiphertext);
}

function buildItemId(customerId: string) {
  return `${FINICITY_ITEM_PREFIX}${customerId}`;
}

function splitName(name: string | null | undefined) {
  const trimmed = name?.trim();

  if (!trimmed) {
    return { firstName: undefined, lastName: undefined };
  }

  const [firstName, ...rest] = trimmed.split(/\s+/);
  return {
    firstName,
    lastName: rest.length > 0 ? rest.join(' ') : undefined,
  };
}

function mapTransactionDirection(amount: number) {
  if (amount >= 0) {
    return { type: 'DEBIT' as const, amount };
  }

  return { type: 'CREDIT' as const, amount: Math.abs(amount) };
}

function buildDescription(transaction: FinicityTransaction) {
  const parts = [transaction.description, transaction.memo].filter(Boolean);
  return parts.join(' | ') || 'Finicity bank transaction';
}

function buildNotes(account: FinicityCustomerAccount | undefined, institutionName: string | null) {
  const parts = [
    account?.name,
    account?.realAccountNumberLast4 ? `•••• ${account.realAccountNumberLast4}` : account?.accountNumberDisplay,
    institutionName,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' | ') : null;
}

function buildMetadata(transaction: FinicityTransaction, item: PlaidItem, account?: FinicityCustomerAccount) {
  return {
    importSource: getFinicityBankImportSource(),
    finicityCustomerId: getCustomerIdFromItem(item),
    finicityTransactionId: transaction.uniqueTransactionId || String(transaction.id),
    finicityAccountId: String(transaction.accountId),
    finicityInstitutionId: account?.institutionId || item.institutionId || null,
    finicityInstitutionLoginId: account?.institutionLoginId || null,
    finicityAccountName: account?.name || null,
    finicityAccountMask: account?.realAccountNumberLast4 || account?.accountNumberDisplay || null,
    finicityAccountType: account?.type || null,
    institutionName: item.institutionName,
    category: transaction.categorization?.bestRepresentation || transaction.categorization?.category || null,
    checkNumber: transaction.checkNum || null,
    pending: transaction.status !== 'active',
    syncedAt: new Date().toISOString(),
  } satisfies Prisma.InputJsonValue;
}

async function fetchAllTransactions(customerId: string, lastSyncAt: Date | null) {
  const now = new Date();
  const fromDate = lastSyncAt
    ? new Date(lastSyncAt.getTime() - 14 * 24 * 60 * 60 * 1000)
    : new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  let start = 1;
  let moreAvailable = true;
  const transactions: FinicityTransaction[] = [];

  while (moreAvailable) {
    const params = new URLSearchParams({
      fromDate: String(getUnixSeconds(fromDate)),
      toDate: String(getUnixSeconds(now)),
      start: String(start),
      limit: '1000',
      sort: 'desc',
      includePending: 'true',
    });

    const response = await finicityRequest<FinicityTransactionsResponse>(
      `/aggregation/v3/customers/${customerId}/transactions?${params.toString()}`
    );

    transactions.push(...response.transactions);
    moreAvailable = response.moreAvailable;
    start += response.displaying;

    if (response.displaying === 0) {
      moreAvailable = false;
    }
  }

  return transactions;
}

async function fetchAccounts(customerId: string) {
  return finicityRequest<FinicityCustomerAccountsResponse>(`/aggregation/v1/customers/${customerId}/accounts`);
}

async function refreshAccounts(customerId: string) {
  await finicityRequest<null>(`/aggregation/v2/customers/${customerId}/accounts`, {
    method: 'POST',
  });
}

async function applyTransactionUpdates(
  db: DbClient,
  item: PlaidItem,
  accounts: FinicityCustomerAccount[],
  transactions: FinicityTransaction[]
): Promise<SyncCounts> {
  const counts: SyncCounts = {
    importedCount: 0,
    updatedCount: 0,
    removedCount: 0,
    skippedPendingCount: 0,
  };

  const activeTransactions = transactions.filter((transaction) => {
    if (transaction.status !== 'active') {
      counts.skippedPendingCount += 1;
      return false;
    }

    return true;
  });

  const transactionKeys = activeTransactions.map((transaction) => transaction.uniqueTransactionId || String(transaction.id));
  const existingLinks = transactionKeys.length > 0
    ? await db.plaidSyncedTransaction.findMany({
        where: {
          plaidTransactionId: { in: transactionKeys },
        },
      })
    : [];

  const linksByTransactionId = new Map(existingLinks.map((entry) => [entry.plaidTransactionId, entry]));
  const accountsById = new Map(accounts.map((account) => [String(account.id), account]));

  for (const transaction of activeTransactions) {
    const transactionKey = transaction.uniqueTransactionId || String(transaction.id);
    const account = accountsById.get(String(transaction.accountId));
    const { type, amount } = mapTransactionDirection(transaction.amount);
    const description = buildDescription(transaction);
    const notes = buildNotes(account, item.institutionName);
    const metadata = buildMetadata(transaction, item, account);
    const transactionDate = toTransactionDate(transaction);
    const existingLink = linksByTransactionId.get(transactionKey);

    if (existingLink?.ledgerEntryId) {
      await db.ledgerEntry.update({
        where: { id: existingLink.ledgerEntryId },
        data: {
          description,
          type,
          amount,
          transactionDate,
          notes,
          metadata,
        },
      });

      await db.plaidSyncedTransaction.update({
        where: { id: existingLink.id },
        data: {
          isRemoved: false,
          transactionDate,
          amount,
          accountId: String(transaction.accountId),
        },
      });

      counts.updatedCount += 1;
      continue;
    }

    const createdEntry = await db.ledgerEntry.create({
      data: {
        userId: item.userId,
        description,
        type,
        amount,
        balance: 0,
        transactionDate,
        createdBy: item.userId,
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
          transactionDate,
          amount,
          accountId: String(transaction.accountId),
        },
      });
    } else {
      await db.plaidSyncedTransaction.create({
        data: {
          plaidItemId: item.id,
          plaidTransactionId: transactionKey,
          accountId: String(transaction.accountId),
          ledgerEntryId: createdEntry.id,
          transactionDate,
          amount,
        },
      });
    }

    counts.importedCount += 1;
  }

  if (counts.importedCount > 0 || counts.updatedCount > 0) {
    await recalculateUserLedgerBalances(db, item.userId);
  }

  await db.plaidItem.update({
    where: { id: item.id },
    data: {
      lastSyncAt: new Date(),
      selectedAccounts: accounts.map((account) => ({
        accountId: String(account.id),
        institutionId: account.institutionId,
        institutionLoginId: account.institutionLoginId,
        name: account.name,
        mask: account.realAccountNumberLast4 || account.accountNumberDisplay,
        subtype: null,
        type: account.type,
        balance: account.balance ?? null,
        availableBalance: account.detail?.availableBalanceAmount ?? null,
      })) as Prisma.InputJsonValue,
      institutionId: accounts[0]?.institutionId || item.institutionId,
      institutionName: item.institutionName || 'Finicity Connected Accounts',
    },
  });

  return counts;
}

export async function ensureFinicityItemForUser(input: {
  userId: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  const existing = await prisma.plaidItem.findFirst({
    where: {
      userId: input.userId,
      itemId: { startsWith: FINICITY_ITEM_PREFIX },
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'asc' },
  });

  if (existing) {
    return existing;
  }

  const { firstName, lastName } = splitName(input.name);
  const customer = await finicityRequest<FinicityCustomer>('/aggregation/v2/customers/active', {
    method: 'POST',
    body: JSON.stringify({
      username: buildUsername(input.userId),
      firstName,
      lastName,
      email: input.email || undefined,
      phone: input.phone || undefined,
    }),
  });

  return prisma.plaidItem.create({
    data: {
      userId: input.userId,
      itemId: buildItemId(customer.id),
      accessTokenCiphertext: encryptSecret(customer.id),
      institutionName: 'Finicity Connected Accounts',
      status: 'ACTIVE',
    },
  });
}

export async function generateFinicityConnectUrl(item: PlaidItem) {
  const customerId = getCustomerIdFromItem(item);
  const response = await finicityRequest<FinicityConnectUrlResponse>('/connect/v2/generate', {
    method: 'POST',
    body: JSON.stringify({
      partnerId: getFinicityPartnerId(),
      customerId,
      redirectUri: getFinicityConnectRedirectUrl(),
      singleUseUrl: true,
    }),
  });

  return response.link;
}

export async function syncFinicityItem(item: PlaidItem, options?: { refresh?: boolean }) {
  const customerId = getCustomerIdFromItem(item);

  if (options?.refresh) {
    await refreshAccounts(customerId);
  }

  const accountResponse = await fetchAccounts(customerId);
  const transactions = await fetchAllTransactions(customerId, item.lastSyncAt);
  return prisma.$transaction((tx) => applyTransactionUpdates(tx, item, accountResponse.accounts, transactions));
}

export async function syncFinicityItemsForUser(userId: string, options?: { refresh?: boolean }) {
  const items = await prisma.plaidItem.findMany({
    where: {
      userId,
      itemId: { startsWith: FINICITY_ITEM_PREFIX },
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'asc' },
  });

  const results = [];

  for (const item of items) {
    const result = await syncFinicityItem(item, options);
    results.push({
      itemId: item.itemId,
      institutionName: item.institutionName,
      ...result,
    });
  }

  return results;
}

export async function syncAllFinicityItems() {
  const items = await prisma.plaidItem.findMany({
    where: {
      itemId: { startsWith: FINICITY_ITEM_PREFIX },
      status: 'ACTIVE',
    },
    orderBy: { createdAt: 'asc' },
  });

  const results = [];

  for (const item of items) {
    const result = await syncFinicityItem(item);
    results.push({
      itemId: item.itemId,
      userId: item.userId,
      institutionName: item.institutionName,
      ...result,
    });
  }

  return results;
}