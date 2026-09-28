const BANK_IMPORT_SOURCES = ['BANK_OF_AMERICA_CSV', 'PLAID_TRANSACTIONS', 'FINICITY_TRANSACTIONS'] as const;

export type BankImportSource = (typeof BANK_IMPORT_SOURCES)[number];

export function isBankImportSource(value: unknown): value is BankImportSource {
  return typeof value === 'string' && BANK_IMPORT_SOURCES.includes(value as BankImportSource);
}

export function isBankImportMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }

  const importSource = (metadata as Record<string, unknown>).importSource;
  return isBankImportSource(importSource);
}

export function isRemovedBankImportMetadata(metadata: unknown) {
  if (!isBankImportMetadata(metadata)) {
    return false;
  }

  const data = metadata as Record<string, unknown>;
  return typeof data.plaidRemovedAt === 'string' || typeof data.bankSyncRemovedAt === 'string';
}