export function normalizeInvoiceExpenseDescription(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function invoiceLineItemMatchesLedgerEntry(
  lineItem: { shipmentId?: string | null; description: string; amount: number },
  ledgerEntry: { shipmentId?: string | null; description: string; amount: number },
) {
  const sameShipment =
    !lineItem.shipmentId ||
    !ledgerEntry.shipmentId ||
    lineItem.shipmentId === ledgerEntry.shipmentId;

  if (!sameShipment) {
    return false;
  }

  const amountDelta = Math.abs((ledgerEntry.amount ?? 0) - (lineItem.amount ?? 0));
  if (amountDelta > 0.01) {
    return false;
  }

  const lineDescription = normalizeInvoiceExpenseDescription(lineItem.description);
  const entryDescription = normalizeInvoiceExpenseDescription(ledgerEntry.description);

  if (!lineDescription || !entryDescription) {
    return false;
  }

  return (
    lineDescription === entryDescription ||
    entryDescription.includes(lineDescription) ||
    lineDescription.includes(entryDescription)
  );
}
