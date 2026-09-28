'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Clock,
  DollarSign,
  ExternalLink,
  FileText,
  Info,
  Paperclip,
  Pencil,
  ReceiptText,
  Ship,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import { Box, CircularProgress, TextField } from '@mui/material';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Alert, Button, Modal, toast } from '@/components/design-system';
import { cn } from '@/lib/utils';
import { formatMoney as formatSnapshotMoney } from '@/lib/format';
import { ShipmentProfitabilityCard } from '@/components/dashboard/ShipmentProfitabilityCard';
import type {
  ClassifiedExpenseSource,
  ClassifiedShipmentExpenseData,
  ComparisonTransactionWithDrillDown,
  ExpenseSourceFilter,
  Shipment,
  ShipmentExpenseEntryWithCompanyLedger,
  StatusColors,
} from '@/components/shipments/shipment-detail-types';

type ShipmentFinancialsTabProps = {
  shipment: Shipment;
  canManageShipmentExpenses: boolean;
  canAddLedgerExpense: boolean;
  canAddShipmentExpense: boolean;
  canAddDispatchExpense: boolean;
  canAddTransitExpense: boolean;
  canViewLedgerComparison: boolean;
  expenseActionHelpText: string;
  expenseLedgerHelpText: string;
  companyChargedForComparison: number;
  companyLedgerDebitsTotal: number;
  companyLedgerCreditsTotal: number;
  customerChargedForComparison: number;
  userLedgerDebitsTotal: number;
  userLedgerCreditsTotal: number;
  netDifference: number;
  comparisonTransactions: ComparisonTransactionWithDrillDown[];
  classifiedShipmentExpenseData: ClassifiedShipmentExpenseData;
  filteredShipmentExpenseTotal: number;
  expenseSourceFilter: ExpenseSourceFilter;
  expenseEntriesWithCompanyLedger: ShipmentExpenseEntryWithCompanyLedger[];
  deletingExpenseId: string | null;
  totalEstimatedCost: number;
  expenseSourceLabels: Record<ClassifiedExpenseSource, string>;
  expenseSourceDescriptions: Record<ClassifiedExpenseSource, string>;
  expenseSourceStyles: Record<ClassifiedExpenseSource, StatusColors>;
  onOpenShipmentExpense: () => void;
  onOpenDispatchExpense: () => void;
  onOpenTransitExpense: () => void;
  onExpenseSourceFilterChange: (value: ExpenseSourceFilter) => void;
  onOpenCompanyLedgerEntry: (entry: NonNullable<Shipment['companyLedgerEntries']>[number]) => void;
  onDeleteExpense: (entryId: string) => void;
  onExpenseUpdated: () => void;
};

const EXPENSE_CATEGORIES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  SHIPPING_FEE: { label: 'Shipping Fee', bg: 'rgba(99,102,241,0.12)', text: 'rgb(129,140,248)', border: 'rgba(99,102,241,0.25)' },
  FUEL: { label: 'Fuel', bg: 'rgba(168,85,247,0.12)', text: 'rgb(192,132,252)', border: 'rgba(168,85,247,0.25)' },
  PORT_CHARGES: { label: 'Port Charges', bg: 'rgba(6,182,212,0.12)', text: 'rgb(34,211,238)', border: 'rgba(6,182,212,0.25)' },
  TOWING: { label: 'Towing', bg: 'rgba(245,158,11,0.12)', text: 'rgb(251,191,36)', border: 'rgba(245,158,11,0.25)' },
  CUSTOMS: { label: 'Customs', bg: 'rgba(14,165,233,0.12)', text: 'rgb(56,189,248)', border: 'rgba(14,165,233,0.25)' },
  STORAGE_FEE: { label: 'Storage Fee', bg: 'rgba(234,179,8,0.12)', text: 'rgb(250,204,21)', border: 'rgba(234,179,8,0.25)' },
  HANDLING_FEE: { label: 'Handling Fee', bg: 'rgba(148,163,184,0.12)', text: 'rgb(203,213,225)', border: 'rgba(148,163,184,0.25)' },
  INSURANCE: { label: 'Insurance', bg: 'rgba(16,185,129,0.12)', text: 'rgb(52,211,153)', border: 'rgba(16,185,129,0.25)' },
  OTHER: { label: 'Other', bg: 'rgba(113,113,122,0.12)', text: 'rgb(161,161,170)', border: 'rgba(113,113,122,0.25)' },
};

function resolveExpenseCategory(entry: ShipmentExpenseEntryWithCompanyLedger) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const rawType = typeof metadata.expenseType === 'string' ? metadata.expenseType.toUpperCase() : '';
  if (rawType && EXPENSE_CATEGORIES[rawType]) {
    return { type: rawType, ...EXPENSE_CATEGORIES[rawType] };
  }

  const desc = (entry.description || '').toLowerCase();
  if (desc.includes('fuel')) return { type: 'FUEL', ...EXPENSE_CATEGORIES.FUEL };
  if (desc.includes('tow')) return { type: 'TOWING', ...EXPENSE_CATEGORIES.TOWING };
  if (desc.includes('custom') || desc.includes('duty')) return { type: 'CUSTOMS', ...EXPENSE_CATEGORIES.CUSTOMS };
  if (desc.includes('port')) return { type: 'PORT_CHARGES', ...EXPENSE_CATEGORIES.PORT_CHARGES };
  if (desc.includes('storage') || desc.includes('demurrage')) return { type: 'STORAGE_FEE', ...EXPENSE_CATEGORIES.STORAGE_FEE };
  if (desc.includes('insurance')) return { type: 'INSURANCE', ...EXPENSE_CATEGORIES.INSURANCE };
  if (desc.includes('handling') || desc.includes('forklift')) return { type: 'HANDLING_FEE', ...EXPENSE_CATEGORIES.HANDLING_FEE };
  if (desc.includes('shipping') || desc.includes('ocean')) return { type: 'SHIPPING_FEE', ...EXPENSE_CATEGORIES.SHIPPING_FEE };

  return { type: 'OTHER', ...EXPENSE_CATEGORIES.OTHER };
}

function resolveInvoiceBadge(entry: ShipmentExpenseEntryWithCompanyLedger) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const invoiceNumber = typeof metadata.invoiceNumber === 'string' ? metadata.invoiceNumber : null;
  const invoiceId = typeof metadata.invoiceId === 'string' ? metadata.invoiceId : null;
  const isPending = metadata.pendingInvoice === true || metadata.pendingInvoice === 'true';
  const isSettled = metadata.settled === true || metadata.isSettled === true || metadata.invoiceStatus === 'PAID';

  if (invoiceNumber) {
    return {
      status: 'BILLED' as const,
      label: `Billed: ${invoiceNumber}`,
      invoiceId,
      invoiceNumber,
      tone: 'border-blue-500/35 bg-blue-500/10 text-blue-400',
    };
  }

  if (isPending) {
    return {
      status: 'PENDING' as const,
      label: 'Pending Invoice',
      invoiceId: null,
      invoiceNumber: null,
      tone: 'border-amber-500/35 bg-amber-500/10 text-amber-400',
    };
  }

  if (isSettled) {
    return {
      status: 'SETTLED' as const,
      label: 'Settled',
      invoiceId: null,
      invoiceNumber: null,
      tone: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400',
    };
  }

  return {
    status: 'RECORDED' as const,
    label: 'Ledger Recorded',
    invoiceId: null,
    invoiceNumber: null,
    tone: 'border-[var(--border)] bg-[var(--panel)] text-[var(--text-secondary)]',
  };
}

function resolveReceipt(entry: ShipmentExpenseEntryWithCompanyLedger) {
  const userMetadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const companyMetadata = (entry.linkedCompanyLedgerEntry?.metadata ?? {}) as Record<string, unknown>;

  const receiptUrl = (userMetadata.receiptUrl as string) || (companyMetadata.receiptUrl as string) || null;
  const receiptName = (userMetadata.receiptName as string) || (companyMetadata.receiptName as string) || 'Receipt Document';

  return receiptUrl ? { receiptUrl, receiptName } : null;
}

function formatPriceListLane(snapshot: Shipment['priceListPricingSnapshot']) {
  const lane = snapshot?.matchedLane;
  const parts = [lane?.stateCode, lane?.branch, lane?.city, lane?.loadingPoint].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : snapshot?.destinationLabel || 'No lane matched yet';
}

function formatSnapshotDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

export default function ShipmentFinancialsTab({
  shipment,
  canManageShipmentExpenses,
  canAddLedgerExpense,
  canAddShipmentExpense,
  canAddDispatchExpense,
  canAddTransitExpense,
  canViewLedgerComparison,
  expenseActionHelpText,
  expenseLedgerHelpText,
  companyChargedForComparison,
  companyLedgerDebitsTotal,
  companyLedgerCreditsTotal,
  customerChargedForComparison,
  userLedgerDebitsTotal,
  userLedgerCreditsTotal,
  netDifference,
  comparisonTransactions,
  classifiedShipmentExpenseData,
  filteredShipmentExpenseTotal,
  expenseSourceFilter,
  expenseEntriesWithCompanyLedger,
  deletingExpenseId,
  totalEstimatedCost,
  expenseSourceLabels,
  expenseSourceDescriptions,
  expenseSourceStyles,
  onOpenShipmentExpense,
  onOpenDispatchExpense,
  onOpenTransitExpense,
  onExpenseSourceFilterChange,
  onOpenCompanyLedgerEntry,
  onDeleteExpense,
  onExpenseUpdated,
}: ShipmentFinancialsTabProps) {
  const priceListSnapshot = shipment.priceListPricingSnapshot;
  const [showRoutingGuide, setShowRoutingGuide] = useState(false);

  // Edit Expense State
  const [editingExpense, setEditingExpense] = useState<ShipmentExpenseEntryWithCompanyLedger | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReceiptUrl, setEditReceiptUrl] = useState('');
  const [editReceiptName, setEditReceiptName] = useState('');
  const [uploadingEditReceipt, setUploadingEditReceipt] = useState(false);
  const [updatingExpense, setUpdatingExpense] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const openEditExpense = (entry: ShipmentExpenseEntryWithCompanyLedger) => {
    setEditingExpense(entry);
    setEditDescription(entry.description);
    setEditNotes(entry.notes || '');
    const meta = (entry.metadata ?? {}) as Record<string, unknown>;
    setEditReceiptUrl((meta.receiptUrl as string) || '');
    setEditReceiptName((meta.receiptName as string) || '');
  };

  const handleEditReceiptUpload = async (file: File) => {
    if (!file) return;
    setUploadingEditReceipt(true);
    try {
      const data = new FormData();
      data.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: data });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to upload receipt');
      }
      const result = await res.json();
      setEditReceiptUrl(result.url);
      setEditReceiptName(file.name);
      toast.success('Receipt attached');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Receipt upload failed');
    } finally {
      setUploadingEditReceipt(false);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  };

  const handleUpdateExpense = async () => {
    if (!editingExpense) return;
    if (!editDescription.trim()) {
      toast.error('Description is required');
      return;
    }

    setUpdatingExpense(true);
    try {
      const response = await fetch(`/api/ledger/${editingExpense.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editDescription.trim(),
          notes: editNotes.trim() || undefined,
          metadata: {
            receiptUrl: editReceiptUrl || undefined,
            receiptName: editReceiptName || undefined,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update expense');
      }
      toast.success('Expense updated');
      setEditingExpense(null);
      onExpenseUpdated();
    } catch (error) {
      toast.error('Unable to update expense', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setUpdatingExpense(false);
    }
  };

  // KPI Calculations
  const totalCustomerExpenseAmount = classifiedShipmentExpenseData.total;
  const totalCarrierExpenseCost = useMemo(() => {
    return expenseEntriesWithCompanyLedger.reduce((sum, entry) => {
      return sum + (entry.linkedCompanyLedgerEntry?.amount ?? 0);
    }, 0);
  }, [expenseEntriesWithCompanyLedger]);

  const kpiCarrierCost = companyChargedForComparison > 0 ? companyChargedForComparison : totalCarrierExpenseCost;
  const kpiCustomerBilled = customerChargedForComparison > 0 ? customerChargedForComparison : totalCustomerExpenseAmount;
  const kpiNetMargin = kpiCustomerBilled - kpiCarrierCost;
  const kpiMarginPct = kpiCustomerBilled > 0 ? (kpiNetMargin / kpiCustomerBilled) * 100 : 0;

  const pendingExpenses = useMemo(() => {
    return expenseEntriesWithCompanyLedger.filter((entry) => {
      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      return metadata.pendingInvoice === true || metadata.pendingInvoice === 'true';
    });
  }, [expenseEntriesWithCompanyLedger]);

  const pendingExpensesTotal = useMemo(() => {
    return pendingExpenses.reduce((sum, entry) => sum + entry.amount, 0);
  }, [pendingExpenses]);

  // Price List snapshot details
  const priceListCurrency = priceListSnapshot?.currency || 'USD';
  const priceListDispatchPosted = Boolean(priceListSnapshot?.posted?.dispatch?.chargeId);
  const priceListShippingPosted = Boolean(priceListSnapshot?.posted?.shipping?.chargeId);
  const hasPriceListPricing = typeof priceListSnapshot?.totalPrice === 'number' && priceListSnapshot.totalPrice > 0;
  const hasPriceListCompany = Boolean(priceListSnapshot?.companyName || shipment.container?.shippingLine);
  const hasPriceListLaneInput = Boolean(
    shipment.purchaseLocation ||
      shipment.auctionName ||
      priceListSnapshot?.matchedLane?.stateCode ||
      priceListSnapshot?.matchedLane?.branch ||
      priceListSnapshot?.matchedLane?.city
  );
  const priceListCalculatedAt = formatSnapshotDate(priceListSnapshot?.calculatedAt);
  const priceListChecklist = [
    {
      label: 'Company selected',
      done: hasPriceListCompany,
      detail: priceListSnapshot?.companyName || shipment.container?.shippingLine || 'Choose a container or shipping company with an active price list.',
    },
    {
      label: 'Pickup lane available',
      done: hasPriceListLaneInput,
      detail: shipment.purchaseLocation || shipment.auctionName || formatPriceListLane(priceListSnapshot),
    },
    {
      label: 'Price matched',
      done: hasPriceListPricing,
      detail: hasPriceListPricing
        ? `${formatSnapshotMoney(priceListSnapshot?.totalPrice, priceListCurrency)} from ${priceListSnapshot?.priceListName || 'active price list'}`
        : 'Upload/activate a company price list that contains this lane.',
    },
    {
      label: 'Dispatch charge',
      done: priceListDispatchPosted,
      detail: priceListDispatchPosted ? 'Posted to billing.' : 'Posts at dispatch handoff when pricing is matched.',
    },
    {
      label: 'Shipping charge',
      done: priceListShippingPosted,
      detail: priceListShippingPosted ? 'Posted to billing.' : 'Posts when the shipment is assigned to a container.',
    },
  ];

  const editingInvoiceNumber = typeof (editingExpense?.metadata as Record<string, unknown>)?.invoiceNumber === 'string'
    ? ((editingExpense?.metadata as Record<string, unknown>).invoiceNumber as string)
    : null;

  const oceanFreightCost = useMemo(() => {
    return (expenseEntriesWithCompanyLedger || [])
      .filter((e) => e.source === 'TRANSIT' || e.type?.toLowerCase().includes('ocean') || e.description?.toLowerCase().includes('ocean') || e.description?.toLowerCase().includes('freight'))
      .reduce((s, e) => s + (typeof e.amount === 'number' ? e.amount : 0), 0);
  }, [expenseEntriesWithCompanyLedger]);

  const dispatchCost = useMemo(() => {
    return (expenseEntriesWithCompanyLedger || [])
      .filter((e) => e.source === 'DISPATCH' || e.description?.toLowerCase().includes('dispatch') || e.description?.toLowerCase().includes('towing'))
      .reduce((s, e) => s + (typeof e.amount === 'number' ? e.amount : 0), 0);
  }, [expenseEntriesWithCompanyLedger]);

  const terminalStorageCost = useMemo(() => {
    return (expenseEntriesWithCompanyLedger || [])
      .filter((e) => e.type?.toLowerCase().includes('storage') || e.description?.toLowerCase().includes('storage') || e.description?.toLowerCase().includes('terminal'))
      .reduce((s, e) => s + (typeof e.amount === 'number' ? e.amount : 0), 0);
  }, [expenseEntriesWithCompanyLedger]);

  const otherExpensesCost = useMemo(() => {
    return (expenseEntriesWithCompanyLedger || [])
      .filter((e) => {
        const isOcean = e.source === 'TRANSIT' || e.type?.toLowerCase().includes('ocean') || e.description?.toLowerCase().includes('ocean') || e.description?.toLowerCase().includes('freight');
        const isDispatch = e.source === 'DISPATCH' || e.description?.toLowerCase().includes('dispatch') || e.description?.toLowerCase().includes('towing');
        const isStorage = e.type?.toLowerCase().includes('storage') || e.description?.toLowerCase().includes('storage') || e.description?.toLowerCase().includes('terminal');
        return !isOcean && !isDispatch && !isStorage;
      })
      .reduce((s, e) => s + (typeof e.amount === 'number' ? e.amount : 0), 0);
  }, [expenseEntriesWithCompanyLedger]);

  return (
    <>
      <DashboardPanel
        title="Shipment Financials & Expenses"
        description="Comprehensive cost tracking, customer billables, carrier expense recovery, and profit margins"
        actions={
          canAddLedgerExpense ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button size="sm" icon={<DollarSign className="h-4 w-4" />} onClick={onOpenShipmentExpense} disabled={!canAddShipmentExpense}>
                Add Expense
              </Button>
              <Button variant="outline" size="sm" icon={<Truck className="h-4 w-4" />} onClick={onOpenDispatchExpense} disabled={!canAddDispatchExpense}>
                Dispatch Leg
              </Button>
              <Button variant="outline" size="sm" icon={<Ship className="h-4 w-4" />} onClick={onOpenTransitExpense} disabled={!canAddTransitExpense}>
                Transit Leg
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="space-y-4">
          {/* Shipment Unit Economics & Profitability (P&L) Card */}
          <ShipmentProfitabilityCard
            billedRevenue={kpiCustomerBilled}
            dispatchCost={dispatchCost}
            oceanFreightCost={oceanFreightCost}
            terminalStorageCost={terminalStorageCost}
            otherExpensesCost={otherExpensesCost}
          />

          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {/* Total Carrier Cost */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Carrier Cost</span>
                <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-400">Debits</span>
              </div>
              <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">${kpiCarrierCost.toFixed(2)}</p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Vendor & carrier ledger costs</p>
            </div>

            {/* Total Customer Billed */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Customer Total</span>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-blue-400">Billed</span>
              </div>
              <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">${kpiCustomerBilled.toFixed(2)}</p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Debited to customer ledger</p>
            </div>

            {/* Net Margin */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Net Margin</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                    kpiNetMargin >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                  )}
                >
                  {kpiMarginPct.toFixed(1)}%
                </span>
              </div>
              <p className={cn('mt-2 text-xl font-bold', kpiNetMargin >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                {kpiNetMargin >= 0 ? '+' : ''}${kpiNetMargin.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Customer charge minus carrier cost</p>
            </div>

            {/* Unbilled / Pending Invoices */}
            <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Unbilled Pending</span>
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
                    pendingExpenses.length > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
                  )}
                >
                  {pendingExpenses.length > 0 ? `${pendingExpenses.length} pending` : 'All Settled'}
                </span>
              </div>
              <p className="mt-2 text-xl font-bold text-[var(--text-primary)]">${pendingExpensesTotal.toFixed(2)}</p>
              <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                {pendingExpenses.length > 0 ? 'Awaiting invoice generation' : 'All tracked expenses invoiced'}
              </p>
            </div>
          </div>

          {/* Price List Automation Card */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg border border-[rgba(var(--accent-gold-rgb),0.25)] bg-[rgba(var(--accent-gold-rgb),0.10)] p-2 text-[var(--accent-gold)]">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold uppercase text-[var(--text-secondary)]">Price List Automation</h3>
                  {hasPriceListPricing ? (
                    <p className="mt-1 text-sm text-[var(--text-primary)]">
                      Using {priceListSnapshot?.companyName || 'the shipping company'} price list
                      {priceListSnapshot?.priceListName ? `: ${priceListSnapshot.priceListName}` : ''}.
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-[var(--text-primary)]">
                      No company price list has been matched yet.
                    </p>
                  )}
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {hasPriceListPricing
                      ? `Matched lane: ${formatPriceListLane(priceListSnapshot)}. Dispatch and shipping are posted from this same company price list.`
                      : 'Assign the shipment to a container with a shipping company that has an active price list, or add the shipping company before dispatch.'}
                  </p>
                </div>
              </div>

              {hasPriceListPricing ? (
                <span
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide',
                    priceListDispatchPosted && priceListShippingPosted
                      ? 'border-[rgba(34,197,94,0.34)] bg-[rgba(34,197,94,0.12)] text-[rgb(21,128,61)]'
                      : 'border-[rgba(245,158,11,0.32)] bg-[rgba(245,158,11,0.12)] text-[rgb(180,83,9)]'
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {priceListDispatchPosted && priceListShippingPosted ? 'Fully Posted' : 'Partially Posted'}
                </span>
              ) : null}
            </div>

            {hasPriceListPricing && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Full Price</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                    {formatSnapshotMoney(priceListSnapshot?.totalPrice, priceListCurrency)}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    {priceListSnapshot?.sourceFileName || 'Active company price list'}
                    {priceListCalculatedAt ? ` · ${priceListCalculatedAt}` : ''}
                  </p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Dispatch Portion</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                    {formatSnapshotMoney(priceListSnapshot?.dispatchAmount, priceListCurrency)}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{priceListDispatchPosted ? 'Posted to billing' : 'Waiting for dispatch handoff'}</p>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Shipping Portion</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                    {formatSnapshotMoney(priceListSnapshot?.shippingAmount, priceListCurrency)}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{priceListShippingPosted ? 'Posted to billing' : 'Waiting for container assignment'}</p>
                </div>
              </div>
            )}

            <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Pricing Checklist</p>
              <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-5">
                {priceListChecklist.map((item) => (
                  <div key={item.label} className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
                    <div className="flex items-center gap-2">
                      {item.done ? (
                        <CheckCircle2 className="h-4 w-4 text-[rgb(21,128,61)]" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-[var(--text-secondary)]" />
                      )}
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-primary)]">{item.label}</p>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-[var(--text-secondary)]">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Collapsible Expense Routing & Posting Target Guidelines */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
            <button
              type="button"
              onClick={() => setShowRoutingGuide((prev) => !prev)}
              className="flex w-full items-center justify-between text-left transition-colors hover:opacity-90"
            >
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-[var(--accent-gold)]" />
                <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  Expense Routing & Posting Target Guidelines
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <span>{showRoutingGuide ? 'Hide guidance' : 'Show guidance'}</span>
                {showRoutingGuide ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </div>
            </button>
            {showRoutingGuide && (
              <div className="mt-3 grid grid-cols-1 gap-4 border-t border-[var(--border)] pt-3 md:grid-cols-2 text-xs text-[var(--text-secondary)]">
                <div>
                  <p className="font-semibold uppercase tracking-wide text-[var(--text-primary)] mb-1">Expense Routing</p>
                  <p className="leading-relaxed">{expenseActionHelpText}</p>
                </div>
                <div>
                  <p className="font-semibold uppercase tracking-wide text-[var(--text-primary)] mb-1">Posting Target</p>
                  <p className="leading-relaxed">{expenseLedgerHelpText}</p>
                </div>
              </div>
            )}
          </div>

          {/* Ledger Comparison View */}
          {canViewLedgerComparison && (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase text-[var(--text-secondary)]">Ledger Comparison</h3>
              <p className="mb-4 text-xs text-[var(--text-secondary)]">
                Compare what the company charged on this shipment versus what was charged to the customer.
              </p>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Company Charged Me (Net)</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--error)]">${companyChargedForComparison.toFixed(2)}</p>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    Debits ${companyLedgerDebitsTotal.toFixed(2)} - Credits ${companyLedgerCreditsTotal.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Charged To Customer (Net)</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--success)]">${customerChargedForComparison.toFixed(2)}</p>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                    Debits ${userLedgerDebitsTotal.toFixed(2)} - Credits ${userLedgerCreditsTotal.toFixed(2)}
                  </p>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                  <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Difference (Customer - Company)</p>
                  <p className={cn('mt-1 text-lg font-semibold', netDifference >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]')}>
                    ${netDifference.toFixed(2)}
                  </p>
                  <p className="mt-1 text-[11px] text-[var(--text-secondary)]">Based on ledger transactions linked to this shipment.</p>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border)]">
                <div className="grid grid-cols-12 border-b border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                  <div className="col-span-2">Source</div>
                  <div className="col-span-2">Date</div>
                  <div className="col-span-6">Description</div>
                  <div className="col-span-2 text-right">Amount</div>
                </div>
                {comparisonTransactions.length > 0 ? (
                  <div className="max-h-72 overflow-y-auto">
                    {comparisonTransactions.map((entry) => (
                      <div key={entry.id} className="grid grid-cols-12 items-center border-b border-[var(--border)] px-3 py-2 text-xs last:border-b-0">
                        <div className="col-span-2">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              entry.source === 'COMPANY'
                                ? 'border border-[var(--error)]/35 bg-[var(--error)]/10 text-[var(--error)]'
                                : 'border border-[var(--success)]/35 bg-[var(--success)]/10 text-[var(--success)]'
                            )}
                          >
                            {entry.source}
                          </span>
                        </div>
                        <div className="col-span-2 text-[var(--text-secondary)]">{new Date(entry.transactionDate).toLocaleDateString()}</div>
                        <div className="col-span-6 truncate text-[var(--text-primary)]" title={entry.description}>
                          <div className="flex items-center gap-2">
                            <span className="truncate">{entry.description}</span>
                            {entry.source === 'COMPANY' && (
                              <button
                                type="button"
                                onClick={() => onOpenCompanyLedgerEntry(entry.companyLedgerEntry)}
                                className="shrink-0 rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                              >
                                View Entry
                              </button>
                            )}
                            {entry.source === 'CUSTOMER' && entry.linkedCompanyLedgerEntry && (
                              <button
                                type="button"
                                onClick={() => onOpenCompanyLedgerEntry(entry.linkedCompanyLedgerEntry!)}
                                className="shrink-0 rounded border border-[var(--border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                              >
                                Company Entry
                              </button>
                            )}
                          </div>
                        </div>
                        <div className={cn('col-span-2 text-right font-semibold', entry.type === 'DEBIT' ? 'text-[var(--error)]' : 'text-[var(--success)]')}>
                          {entry.type === 'DEBIT' ? '+' : '-'}${entry.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-3 py-4 text-sm text-[var(--text-secondary)]">No ledger transactions linked to this shipment yet.</div>
                )}
              </div>
            </div>
          )}

          {/* Base Costs */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase text-[var(--text-secondary)]">Base Costs</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-primary)]">Shipment Price</span>
                <span className="text-sm font-medium">{shipment.price ? `$${shipment.price.toFixed(2)}` : '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-[var(--text-primary)]">Insurance</span>
                <span className="text-sm font-medium">{shipment.insuranceValue ? `$${shipment.insuranceValue.toFixed(2)}` : '-'}</span>
              </div>
            </div>
          </div>

          {/* Additional Expenses */}
          <div className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-4">
            <h3 className="mb-3 text-sm font-semibold uppercase text-[var(--text-secondary)]">Additional Tracked Expenses</h3>
            {classifiedShipmentExpenseData.entries.length > 0 ? (
              <div className="space-y-4">
                {/* Source Category Breakdown Cards */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  {(['DISPATCH', 'SHIPMENT', 'TRANSIT'] as ClassifiedExpenseSource[]).map((source) => (
                    <div key={source} className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{expenseSourceLabels[source]}</p>
                          <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">${classifiedShipmentExpenseData.totals[source].toFixed(2)}</p>
                        </div>
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                          style={{
                            backgroundColor: expenseSourceStyles[source].bg,
                            color: expenseSourceStyles[source].text,
                            border: `1px solid ${expenseSourceStyles[source].border}`,
                          }}
                        >
                          {classifiedShipmentExpenseData.counts[source]} item{classifiedShipmentExpenseData.counts[source] === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--text-secondary)]">{expenseSourceDescriptions[source]}</p>
                    </div>
                  ))}
                </div>

                {/* Source Filter Tabs */}
                <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Expense Source Filter</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">
                        Showing ${filteredShipmentExpenseTotal.toFixed(2)} of ${classifiedShipmentExpenseData.total.toFixed(2)} total tracked expense.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: 'ALL', label: 'All Sources' },
                        { value: 'DISPATCH', label: 'Dispatch' },
                        { value: 'SHIPMENT', label: 'Shipping' },
                        { value: 'TRANSIT', label: 'Transit' },
                      ] as Array<{ value: ExpenseSourceFilter; label: string }>).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onExpenseSourceFilterChange(option.value)}
                          className="rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                          style={{
                            backgroundColor: expenseSourceFilter === option.value ? 'rgba(var(--accent-gold-rgb), 0.16)' : 'var(--panel)',
                            color: expenseSourceFilter === option.value ? 'var(--accent-gold)' : 'var(--text-secondary)',
                            border:
                              expenseSourceFilter === option.value
                                ? '1px solid rgba(var(--accent-gold-rgb), 0.32)'
                                : '1px solid var(--border)',
                          }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expense List Items */}
                <div className="space-y-3">
                  {expenseEntriesWithCompanyLedger.map((entry) => {
                    const category = resolveExpenseCategory(entry);
                    const invoiceBadge = resolveInvoiceBadge(entry);
                    const receipt = resolveReceipt(entry);
                    const carrierCost = entry.linkedCompanyLedgerEntry?.amount ?? 0;
                    const marginDiff = entry.amount - carrierCost;
                    const marginDiffPct = entry.amount > 0 ? (marginDiff / entry.amount) * 100 : 0;

                    return (
                      <div
                        key={entry.id}
                        className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{entry.description}</p>
                            {/* Category Chip */}
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                              style={{
                                backgroundColor: category.bg,
                                color: category.text,
                                border: `1px solid ${category.border}`,
                              }}
                            >
                              {category.label}
                            </span>
                            {/* Source Leg Chip */}
                            <span
                              className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                              style={{
                                backgroundColor: expenseSourceStyles[entry.source].bg,
                                color: expenseSourceStyles[entry.source].text,
                                border: `1px solid ${expenseSourceStyles[entry.source].border}`,
                              }}
                            >
                              {expenseSourceLabels[entry.source]}
                            </span>
                            {/* Invoicing Lifecycle Badge */}
                            {invoiceBadge.invoiceId ? (
                              <Link
                                href={`/dashboard/invoices/${invoiceBadge.invoiceId}`}
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors hover:underline',
                                  invoiceBadge.tone
                                )}
                              >
                                <FileText className="h-3 w-3" />
                                {invoiceBadge.label}
                              </Link>
                            ) : (
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                                  invoiceBadge.tone
                                )}
                              >
                                {invoiceBadge.status === 'PENDING' && <Clock className="h-3 w-3" />}
                                {invoiceBadge.status === 'SETTLED' && <CheckCircle2 className="h-3 w-3" />}
                                {invoiceBadge.label}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                            <span>{new Date(entry.transactionDate).toLocaleDateString()}</span>
                            <span>•</span>
                            {/* Carrier Cost vs Margin */}
                            {entry.linkedCompanyLedgerEntry ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span>
                                  Carrier Cost: <strong className="text-[var(--text-primary)]">${carrierCost.toFixed(2)}</strong> ({entry.linkedCompanyLedgerEntry.company?.name || 'Carrier'})
                                </span>
                                <span
                                  className={cn(
                                    'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold',
                                    marginDiff >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                  )}
                                >
                                  {marginDiff >= 0
                                    ? `+${marginDiff.toFixed(2)} (${marginDiffPct.toFixed(0)}% margin)`
                                    : `-${Math.abs(marginDiff).toFixed(2)} (${marginDiffPct.toFixed(0)}% loss)`}
                                </span>
                              </div>
                            ) : (
                              <span className="italic text-[var(--text-secondary)]">Direct customer charge (no carrier cost split)</span>
                            )}

                            {/* Receipt Document link */}
                            {receipt && (
                              <>
                                <span>•</span>
                                <a
                                  href={receipt.receiptUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[var(--accent-gold)] hover:underline font-medium"
                                  title="Open receipt document"
                                >
                                  <Paperclip className="h-3 w-3" />
                                  <span className="max-w-[150px] truncate">{receipt.receiptName}</span>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </a>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-sm font-bold text-[var(--text-primary)]">${entry.amount.toFixed(2)}</div>
                            <div className="text-[10px] text-[var(--text-secondary)]">Customer Debited</div>
                          </div>

                          <div className="flex items-center gap-1 border-l border-[var(--border)] pl-3">
                            {entry.linkedCompanyLedgerEntry && canViewLedgerComparison && (
                              <button
                                type="button"
                                onClick={() => onOpenCompanyLedgerEntry(entry.linkedCompanyLedgerEntry!)}
                                className="rounded border border-[var(--border)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent-gold)] hover:border-[var(--accent-gold)]"
                              >
                                Ledger
                              </button>
                            )}
                            {canManageShipmentExpenses && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditExpense(entry)}
                                  className="flex items-center justify-center rounded p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-[rgba(var(--accent-gold-rgb),0.12)] hover:text-[var(--accent-gold)]"
                                  title="Edit expense"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteExpense(entry.id)}
                                  disabled={deletingExpenseId === entry.id}
                                  className="flex items-center justify-center rounded p-1.5 text-[var(--text-secondary)] transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                                  title="Delete expense"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="italic text-sm text-[var(--text-secondary)]">No additional expenses recorded.</p>
            )}
          </div>

          <div className="flex justify-between rounded-lg bg-[var(--accent-gold)]/10 p-4">
            <span className="font-bold text-[var(--accent-gold)]">Total Estimated Cost</span>
            <span className="font-bold text-[var(--accent-gold)]">${totalEstimatedCost.toFixed(2)}</span>
          </div>
        </div>
      </DashboardPanel>

      {/* Edit Expense Modal */}
      <Modal
        open={Boolean(editingExpense)}
        onClose={() => !updatingExpense && setEditingExpense(null)}
        title="Edit Expense"
        size="sm"
        actions={
          <>
            <Button variant="outline" onClick={() => setEditingExpense(null)} disabled={updatingExpense}>
              Cancel
            </Button>
            <Button onClick={() => void handleUpdateExpense()} disabled={updatingExpense || uploadingEditReceipt}>
              {updatingExpense ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <Box sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
          {editingInvoiceNumber ? (
            <Alert severity="info">
              This expense is linked to Invoice <strong>{editingInvoiceNumber}</strong>. Description, notes, and receipt
              attachments can be updated. To change billed amounts, please issue an adjustment or credit note in the Billing tab.
            </Alert>
          ) : (
            <Alert severity="warning">
              Note: Type and amount cannot be edited to maintain ledger integrity. You may update description, notes, and receipt documents.
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <TextField
              label="Amount (Read-only)"
              value={editingExpense ? `$${editingExpense.amount.toFixed(2)}` : ''}
              disabled
            />
            <TextField
              label="Date (Read-only)"
              value={editingExpense ? new Date(editingExpense.transactionDate).toLocaleDateString() : ''}
              disabled
            />
          </Box>

          <TextField
            label="Description *"
            value={editDescription}
            onChange={(event) => setEditDescription(event.target.value)}
            required
          />

          <TextField
            label="Notes"
            rows={2}
            multiline
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
          />

          {/* Receipt Attachment in Edit Modal */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Box sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Receipt / Invoice Document
            </Box>
            <input
              type="file"
              ref={editFileInputRef}
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleEditReceiptUpload(file);
              }}
            />
            {editReceiptUrl ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1.25,
                  border: '1px solid rgba(var(--accent-gold-rgb), 0.35)',
                  borderRadius: 1.5,
                  backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Paperclip className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                  <a
                    href={editReceiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-[var(--accent-gold)] hover:underline truncate"
                  >
                    {editReceiptName || 'View Attached Receipt'}
                  </a>
                </Box>
                <button
                  type="button"
                  onClick={() => {
                    setEditReceiptUrl('');
                    setEditReceiptName('');
                  }}
                  className="p-1 text-[var(--text-secondary)] hover:text-red-400 rounded transition-colors"
                  title="Remove receipt"
                >
                  <X className="w-4 h-4" />
                </button>
              </Box>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingEditReceipt}
                icon={uploadingEditReceipt ? <CircularProgress size={14} color="inherit" /> : <Paperclip className="w-4 h-4" />}
                onClick={() => editFileInputRef.current?.click()}
              >
                {uploadingEditReceipt ? 'Uploading Receipt...' : 'Attach Receipt (PDF or Image)'}
              </Button>
            )}
          </Box>
        </Box>
      </Modal>
    </>
  );
}
