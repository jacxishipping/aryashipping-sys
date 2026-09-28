export type CompanyPaymentStatus = 'NOT_DUE' | 'UNPAID' | 'PARTIAL' | 'PAID_TO_COMPANY';

type CompanyLedgerPaymentEntry = {
  type: string;
  amount: number;
  metadata?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function calculateCompanyPaymentStatus(entries: CompanyLedgerPaymentEntry[]) {
  let charged = 0;
  let paid = 0;

  for (const entry of entries) {
    if (entry.type === 'CREDIT') {
      charged += entry.amount;
      continue;
    }

    if (entry.type === 'DEBIT' && asRecord(entry.metadata).isCompanyPayment === true) {
      paid += entry.amount;
    }
  }

  const remaining = Math.max(0, charged - paid);
  const status: CompanyPaymentStatus =
    charged <= 0 ? (paid > 0 ? 'PAID_TO_COMPANY' : 'NOT_DUE') :
    paid <= 0 ? 'UNPAID' :
    remaining > 0 ? 'PARTIAL' : 'PAID_TO_COMPANY';

  return { charged, paid, remaining, status };
}