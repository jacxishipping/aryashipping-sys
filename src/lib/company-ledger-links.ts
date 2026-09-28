type MetadataCarrier = {
  reference?: string | null;
  metadata?: unknown;
};

export function getLinkedUserExpenseEntryId(entry: MetadataCarrier): string | null {
  const metadata =
    entry.metadata && typeof entry.metadata === 'object' && !Array.isArray(entry.metadata)
      ? (entry.metadata as Record<string, unknown>)
      : null;

  if (typeof metadata?.linkedUserExpenseEntryId === 'string' && metadata.linkedUserExpenseEntryId) {
    return metadata.linkedUserExpenseEntryId;
  }

  if (typeof entry.reference === 'string' && entry.reference.startsWith('shipment-expense:')) {
    return entry.reference.replace('shipment-expense:', '');
  }

  return null;
}

export function buildLinkedCompanyLedgerEntryMap<T extends MetadataCarrier>(entries: T[]) {
  const entryMap = new Map<string, T>();

  for (const entry of entries) {
    const linkedUserExpenseEntryId = getLinkedUserExpenseEntryId(entry);
    if (linkedUserExpenseEntryId) {
      entryMap.set(linkedUserExpenseEntryId, entry);
    }
  }

  return entryMap;
}