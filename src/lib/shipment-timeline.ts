type TimelineCategory = 'STATUS_CHANGE' | 'WORKFLOW_EVENT' | 'TRACKING_EVENT' | 'EXPENSE' | 'FINANCIAL' | 'DAMAGE';
type TimelineSource = 'SHIPMENT' | 'DISPATCH' | 'CONTAINER' | 'TRANSIT' | 'CUSTOMER_LEDGER' | 'COMPANY_LEDGER';

type ShipmentAuditLog = {
  id: string;
  action: string;
  description: string;
  performedBy: string;
  oldValue?: string | null;
  newValue?: string | null;
  timestamp: string | Date;
  metadata?: unknown;
};

type DispatchEvent = {
  id: string;
  status: string;
  location?: string | null;
  description?: string | null;
  eventDate: string | Date;
  createdByLabel?: string | null;
  dispatchReference: string;
};

type ContainerTrackingEvent = {
  id: string;
  status: string;
  location?: string | null;
  description?: string | null;
  eventDate: string | Date;
  source?: string | null;
  completed?: boolean;
  containerNumber: string;
};

type ContainerAuditLog = {
  id: string;
  action: string;
  description: string;
  performedByLabel?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  timestamp: string | Date;
  metadata?: unknown;
  containerNumber: string;
};

type TransitEvent = {
  id: string;
  status: string;
  location?: string | null;
  description?: string | null;
  eventDate: string | Date;
  createdByLabel?: string | null;
  transitReference: string;
};

type CustomerLedgerEntry = {
  id: string;
  transactionDate: string | Date;
  description: string;
  type: string;
  amount: number;
  balance: number;
  metadata?: unknown;
};

type CompanyLedgerEntry = {
  id: string;
  companyId: string;
  transactionDate: string | Date;
  description: string;
  type: string;
  amount: number;
  balance: number;
  reference?: string | null;
  notes?: string | null;
  metadata?: unknown;
  company: {
    id: string;
    name: string;
    code: string | null;
  };
};

type ContainerDamage = {
  id: string;
  damageType: string;
  amount: number;
  description: string;
  createdAt: string | Date;
  containerId: string;
};

export type UnifiedShipmentTimelineItem = {
  id: string;
  source: TimelineSource;
  category: TimelineCategory;
  occurredAt: string;
  title: string;
  description: string;
  actorLabel?: string | null;
  location?: string | null;
  status?: string | null;
  referenceLabel?: string | null;
  amount?: number;
  currency?: string;
  oldValue?: string | null;
  newValue?: string | null;
  metadata?: Record<string, unknown> | null;
  companyId?: string | null;
  companyLedgerEntryId?: string | null;
};

type BuildUnifiedShipmentTimelineInput = {
  shipmentAuditLogs: ShipmentAuditLog[];
  dispatchEvents: DispatchEvent[];
  containerTrackingEvents: ContainerTrackingEvent[];
  containerAuditLogs: ContainerAuditLog[];
  transitEvents: TransitEvent[];
  customerLedgerEntries: CustomerLedgerEntry[];
  companyLedgerEntries: CompanyLedgerEntry[];
  containerDamages: ContainerDamage[];
};

function normalizeMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return null;
  }

  return metadata as Record<string, unknown>;
}

function toIsoString(value: string | Date) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function humanize(value: string) {
  return value
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function classifyAuditCategory(action: string, metadata: Record<string, unknown> | null): TimelineCategory {
  const normalizedAction = action.trim().replace(/[\s-]+/g, '_').toUpperCase();
  const expenseFlag = metadata?.isExpense === true || metadata?.isDispatchExpense === true || metadata?.isTransitExpense === true;

  if (expenseFlag || normalizedAction.includes('EXPENSE')) {
    return 'EXPENSE';
  }

  if (normalizedAction.includes('STATUS')) {
    return 'STATUS_CHANGE';
  }

  if (normalizedAction.includes('DAMAGE')) {
    return 'DAMAGE';
  }

  return 'WORKFLOW_EVENT';
}

function classifyLedgerCategory(metadata: Record<string, unknown> | null) {
  const isExpense = metadata?.isExpense === true || metadata?.isExpense === 'true';
  const isDispatchExpense = metadata?.isDispatchExpense === true;
  const isTransitExpense = metadata?.isTransitExpense === true;
  const isContainerExpense = metadata?.isContainerExpense === true || metadata?.isContainerExpense === 'true';

  if (isExpense || isDispatchExpense || isTransitExpense || isContainerExpense) {
    return 'EXPENSE' as const;
  }

  return 'FINANCIAL' as const;
}

export function buildUnifiedShipmentTimeline(input: BuildUnifiedShipmentTimelineInput) {
  const items: UnifiedShipmentTimelineItem[] = [];

  for (const log of input.shipmentAuditLogs) {
    const metadata = normalizeMetadata(log.metadata);
    items.push({
      id: `shipment-audit-${log.id}`,
      source: 'SHIPMENT',
      category: classifyAuditCategory(log.action, metadata),
      occurredAt: toIsoString(log.timestamp),
      title: humanize(log.action),
      description: log.description,
      actorLabel: log.performedBy,
      oldValue: log.oldValue ?? null,
      newValue: log.newValue ?? null,
      metadata,
      referenceLabel: typeof metadata?.dispatchReference === 'string'
        ? metadata.dispatchReference
        : typeof metadata?.newContainerNumber === 'string'
        ? metadata.newContainerNumber
        : typeof metadata?.containerNumber === 'string'
        ? metadata.containerNumber
        : null,
    });
  }

  for (const event of input.dispatchEvents) {
    items.push({
      id: `dispatch-event-${event.id}`,
      source: 'DISPATCH',
      category: 'WORKFLOW_EVENT',
      occurredAt: toIsoString(event.eventDate),
      title: humanize(event.status),
      description: event.description || `Dispatch milestone recorded for ${event.dispatchReference}`,
      actorLabel: event.createdByLabel || null,
      location: event.location || null,
      status: event.status,
      referenceLabel: event.dispatchReference,
    });
  }

  for (const event of input.containerTrackingEvents) {
    items.push({
      id: `container-tracking-${event.id}`,
      source: 'CONTAINER',
      category: 'TRACKING_EVENT',
      occurredAt: toIsoString(event.eventDate),
      title: humanize(event.status),
      description: event.description || `Tracking update for container ${event.containerNumber}`,
      location: event.location || null,
      status: event.status,
      referenceLabel: event.containerNumber,
      metadata: normalizeMetadata({ source: event.source || null, completed: event.completed === true }),
    });
  }

  for (const log of input.containerAuditLogs) {
    const metadata = normalizeMetadata(log.metadata);
    items.push({
      id: `container-audit-${log.id}`,
      source: 'CONTAINER',
      category: classifyAuditCategory(log.action, metadata),
      occurredAt: toIsoString(log.timestamp),
      title: humanize(log.action),
      description: log.description,
      actorLabel: log.performedByLabel || null,
      oldValue: log.oldValue ?? null,
      newValue: log.newValue ?? null,
      metadata,
      referenceLabel: log.containerNumber,
    });
  }

  for (const event of input.transitEvents) {
    items.push({
      id: `transit-event-${event.id}`,
      source: 'TRANSIT',
      category: 'WORKFLOW_EVENT',
      occurredAt: toIsoString(event.eventDate),
      title: humanize(event.status),
      description: event.description || `Transit milestone recorded for ${event.transitReference}`,
      actorLabel: event.createdByLabel || null,
      location: event.location || null,
      status: event.status,
      referenceLabel: event.transitReference,
    });
  }

  for (const entry of input.customerLedgerEntries) {
    const metadata = normalizeMetadata(entry.metadata);
    const category = classifyLedgerCategory(metadata);
    const isPendingInvoice = metadata?.pendingInvoice === true;
    const isInvoicePaid = !isPendingInvoice && (typeof metadata?.invoiceId === 'string' || typeof metadata?.invoiceNumber === 'string');
    const entryDescription = isPendingInvoice
      ? `${entry.description} (Pending Invoice)`
      : isInvoicePaid
      ? `${entry.description} (Invoice Paid)`
      : entry.description;
    items.push({
      id: `customer-ledger-${entry.id}`,
      source: 'CUSTOMER_LEDGER',
      category,
      occurredAt: toIsoString(entry.transactionDate),
      title: category === 'EXPENSE' ? 'Customer Expense Posting' : humanize(entry.type),
      description: entryDescription,
      amount: entry.amount,
      currency: 'USD',
      status: entry.type,
      metadata,
      referenceLabel: typeof metadata?.expenseSource === 'string' ? humanize(String(metadata.expenseSource)) : 'Customer Ledger',
    });
  }

  for (const entry of input.companyLedgerEntries) {
    const metadata = normalizeMetadata(entry.metadata);
    const category = classifyLedgerCategory(metadata);
    items.push({
      id: `company-ledger-${entry.id}`,
      source: 'COMPANY_LEDGER',
      category,
      occurredAt: toIsoString(entry.transactionDate),
      title: category === 'EXPENSE' ? 'Company Recovery Entry' : humanize(entry.type),
      description: entry.description,
      amount: entry.amount,
      currency: 'USD',
      status: entry.type,
      metadata,
      companyId: entry.companyId,
      companyLedgerEntryId: entry.id,
      referenceLabel: entry.company.code ? `${entry.company.name} (${entry.company.code})` : entry.company.name,
    });
  }

  for (const damage of input.containerDamages) {
    items.push({
      id: `damage-${damage.id}`,
      source: 'CONTAINER',
      category: 'DAMAGE',
      occurredAt: toIsoString(damage.createdAt),
      title: damage.damageType === 'WE_PAY' ? 'Damage Credit Issued' : 'Damage Cost Recorded',
      description: damage.description,
      amount: damage.amount,
      currency: 'USD',
      status: damage.damageType,
      referenceLabel: damage.containerId,
    });
  }

  return items.sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
}
