'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, DollarSign, Pencil, Plus, ReceiptText } from 'lucide-react';
import {
  Box,
} from '@mui/material';
import { DashboardPanel } from '@/components/dashboard/DashboardSurface';
import { Button, Modal, Select, toast , FormField } from '@/components/design-system';
import { formatMoney } from '@/lib/format';
import type { Shipment } from '@/components/shipments/shipment-detail-types';

type ShipmentCompanyLedgerTabProps = {
  shipmentId: string;
  companies: Array<{ id: string; name: string; source: 'Shipping' | 'Dispatch' | 'Transit' }>;
  entries: NonNullable<Shipment['companyLedgerEntries']>;
  paymentSummary: NonNullable<Shipment['companyPaymentSummary']>;
  canManageLedger: boolean;
  onTransactionCreated: () => void;
};

type CompanyLedgerEntryRow = NonNullable<Shipment['companyLedgerEntries']>[number];

type EntryForm = {
  description: string;
  amount: string;
  transactionDate: string;
  category: string;
  reference: string;
  notes: string;
};

const emptyForm = (): EntryForm => ({
  description: '',
  amount: '',
  transactionDate: new Date().toISOString().slice(0, 10),
  category: '',
  reference: '',
  notes: '',
});

/**
 * Auto-generated expense-recovery entries are managed from their originating expense
 * surface and would desync from the customer ledger if edited here, so they are
 * intentionally excluded from the row edit action (same rule as the company ledger page).
 */
function isExpenseRecoveryEntry(entry: CompanyLedgerEntryRow) {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
  const reference = (entry.reference || '').toLowerCase();

  return (
    metadata.isExpenseRecovery === true ||
    metadata.isDispatchExpense === true ||
    metadata.isTransitExpense === true ||
    metadata.isContainerExpense === true ||
    metadata.isShipmentShippingFare === true ||
    metadata.isShipmentDamage === true ||
    reference.startsWith('shipment-expense:') ||
    reference.startsWith('dispatch-expense:') ||
    reference.startsWith('transit-expense:') ||
    reference.startsWith('container-expense:') ||
    reference.startsWith('shipment-shipping-fare:') ||
    reference.startsWith('shipment-damage:')
  );
}

export default function ShipmentCompanyLedgerTab({
  shipmentId,
  companies,
  entries,
  paymentSummary,
  canManageLedger,
  onTransactionCreated,
}: ShipmentCompanyLedgerTabProps) {
  const [form, setForm] = useState<EntryForm>(emptyForm);
  const [isPayment, setIsPayment] = useState(false);
  const [open, setOpen] = useState(false);
  const [posting, setPosting] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [editingEntry, setEditingEntry] = useState<CompanyLedgerEntryRow | null>(null);
  const [editForm, setEditForm] = useState<EntryForm>(emptyForm);
  const [editType, setEditType] = useState<'DEBIT' | 'CREDIT'>('CREDIT');
  const [editOpen, setEditOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const company = companies.find((candidate) => candidate.id === selectedCompanyId) || companies[0] || null;
  const companyEntries = company ? entries.filter((entry) => entry.companyId === company.id) : [];

  const openEntryForm = (payment: boolean) => {
    setIsPayment(payment);
    setForm({
      ...emptyForm(),
      category: payment ? 'Payment' : '',
      description: payment ? `Payment to ${company?.name || 'Company'}` : '',
    });
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!company) return;
    if (!form.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter an amount greater than zero');
      return;
    }

    setPosting(true);
    try {
      const response = await fetch(`/api/finance/companies/${company.id}/ledger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: form.description.trim(),
          type: isPayment ? 'DEBIT' : 'CREDIT',
          amount,
          transactionDate: form.transactionDate,
          category: form.category.trim() || undefined,
          reference: form.reference.trim() || undefined,
          notes: form.notes.trim() || undefined,
          metadata: {
            shipmentId,
            ...(isPayment ? { isCompanyPayment: true, paymentScope: 'SHIPMENT' } : {}),
          },
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save company transaction');
      }

      toast.success(isPayment ? 'Company payment recorded' : 'Company transaction added');
      setOpen(false);
      onTransactionCreated();
    } catch (error) {
      toast.error('Unable to save company transaction', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setPosting(false);
    }
  };

  const openEditEntry = async (entry: CompanyLedgerEntryRow) => {
    try {
      // The shipment payload does not carry category, so fetch the full entry to prefill it.
      const response = await fetch(`/api/finance/companies/ledger/${entry.id}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load transaction');

      const fullEntry = data.entry as CompanyLedgerEntryRow & { category?: string | null };
      setEditingEntry(entry);
      setEditType(fullEntry.type === 'DEBIT' ? 'DEBIT' : 'CREDIT');
      setEditForm({
        description: fullEntry.description || '',
        amount: String(fullEntry.amount),
        transactionDate: new Date(fullEntry.transactionDate).toISOString().slice(0, 10),
        category: fullEntry.category || '',
        reference: fullEntry.reference || '',
        notes: fullEntry.notes || '',
      });
      setEditOpen(true);
    } catch (error) {
      toast.error('Unable to load company transaction', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry) return;
    if (!editForm.description.trim()) {
      toast.error('Description is required');
      return;
    }

    const amount = Number(editForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter an amount greater than zero');
      return;
    }

    setUpdating(true);
    try {
      const response = await fetch(`/api/finance/companies/ledger/${editingEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: editForm.description.trim(),
          type: editType,
          amount,
          transactionDate: editForm.transactionDate,
          category: editForm.category.trim() || null,
          reference: editForm.reference.trim() || null,
          notes: editForm.notes.trim() || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update company transaction');
      }

      toast.success('Company transaction updated');
      setEditOpen(false);
      setEditingEntry(null);
      onTransactionCreated();
    } catch (error) {
      toast.error('Unable to update company transaction', {
        description: error instanceof Error ? error.message : 'Please try again',
      });
    } finally {
      setUpdating(false);
    }
  };

  if (!company) {
    return (
      <DashboardPanel title="Company Ledger" description="Company transactions linked to this shipment">
        <p className="py-4 text-sm text-[var(--text-secondary)]">Assign a shipping, dispatch, or transit company to use this ledger.</p>
      </DashboardPanel>
    );
  }

  return (
    <>
      <DashboardPanel
        title="Company Ledger"
        description={`Transactions with ${company.name} for this shipment`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/finance/companies/${company.id}`}>
              <Button variant="outline" size="sm" icon={<Building2 className="h-4 w-4" />}>Open Ledger</Button>
            </Link>
            {canManageLedger && (
              <>
                <Button variant="outline" size="sm" icon={<DollarSign className="h-4 w-4" />} onClick={() => openEntryForm(true)}>Record Payment</Button>
                <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => openEntryForm(false)}>Add Transaction</Button>
              </>
            )}
          </div>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm">
          <span className="text-[var(--text-secondary)]">Company payment:</span>
          <span className={paymentSummary.status === 'PAID_TO_COMPANY' ? 'font-semibold text-emerald-600' : paymentSummary.status === 'PARTIAL' ? 'font-semibold text-[var(--warning)]' : 'font-semibold text-[var(--text-primary)]'}>
            {paymentSummary.status === 'PAID_TO_COMPANY' ? 'Paid to company' : paymentSummary.status === 'PARTIAL' ? 'Partially paid to company' : paymentSummary.status === 'UNPAID' ? 'Unpaid to company' : 'No payment due'}
          </span>
          <span className="text-[var(--text-secondary)]">Paid {formatMoney(paymentSummary.paid)} of {formatMoney(paymentSummary.charged)}</span>
        </div>
        {companies.length > 1 && (
          <Box sx={{ maxWidth: 360, mb: 2 }}>
            <Select
              size="small"
              label="Company ledger"
              value={company.id}
              onChange={(value) => setSelectedCompanyId(String(value))}
              options={companies.map((candidate) => ({ value: candidate.id, label: `${candidate.source}: ${candidate.name}` }))}
            />
          </Box>
        )}
        {companyEntries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--text-secondary)]">
            <ReceiptText className="h-7 w-7 text-[var(--accent-gold)]" />
            <p className="text-sm">No company ledger transactions are linked to this shipment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--text-secondary)]">
                <tr>
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3 text-right">Amount</th>
                  <th className="px-3 py-3 text-right">Balance</th>
                  {canManageLedger && <th className="px-3 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {companyEntries.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{new Date(entry.transactionDate).toLocaleDateString()}</td>
                    <td className="px-3 py-3 text-[var(--text-primary)]"><p className="font-medium">{entry.description}</p>{entry.notes && <p className="mt-1 text-xs text-[var(--text-secondary)]">{entry.notes}</p>}</td>
                    <td className="px-3 py-3"><span className={entry.type === 'DEBIT' ? 'text-emerald-600' : 'text-red-600'}>{entry.type === 'DEBIT' ? 'Payment' : 'Charge'}</span></td>
                    <td className="px-3 py-3 text-right font-medium text-[var(--text-primary)]">{formatMoney(entry.amount)}</td>
                    <td className="px-3 py-3 text-right text-[var(--text-secondary)]">{formatMoney(entry.balance)}</td>
                    {canManageLedger && (
                      <td className="px-3 py-3 text-right">
                        {!isExpenseRecoveryEntry(entry) && (
                          <button
                            type="button"
                            onClick={() => void openEditEntry(entry)}
                            className="flex items-center justify-center rounded p-1 text-[var(--text-secondary)] transition-colors hover:bg-[rgba(var(--accent-gold-rgb),0.12)] hover:text-[var(--accent-gold)]"
                            title="Edit transaction"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardPanel>

      <Modal
        open={open}
        onClose={() => !posting && setOpen(false)}
        title={isPayment ? `Record Payment to ${company.name}` : `Add Transaction for ${company.name}`}
        size="sm"
        actions={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={posting}>Cancel</Button>
            <Button onClick={() => void handleSubmit()} disabled={posting}>{posting ? 'Saving...' : isPayment ? 'Record Payment' : 'Save Transaction'}</Button>
          </>
        }
      >
        <Box sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
          <FormField label="Description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <FormField label="Amount" type="number" min={0.01} step={0.01}  value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} required />
            <FormField label="Transaction Date" type="date" value={form.transactionDate} onChange={(event) => setForm((current) => ({ ...current, transactionDate: event.target.value }))} />
          </Box>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <FormField label="Category" value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} />
            <FormField label="Reference" value={form.reference} onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))} />
          </Box>
          <FormField label="Notes" rows={3} multiline value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
        </Box>
      </Modal>

      <Modal
        open={editOpen}
        onClose={() => !updating && setEditOpen(false)}
        title={`Edit Transaction for ${company.name}`}
        size="sm"
        actions={
          <>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updating}>Cancel</Button>
            <Button onClick={() => void handleUpdateEntry()} disabled={updating}>{updating ? 'Saving...' : 'Save Changes'}</Button>
          </>
        }
      >
        <Box sx={{ display: 'grid', gap: 2, pt: 1.5 }}>
          <FormField label="Description" value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} required />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <Select
              label="Type"
              value={editType}
              onChange={(value) => setEditType(String(value) as 'DEBIT' | 'CREDIT')}
              options={[
                { value: 'DEBIT', label: 'Payment' },
                { value: 'CREDIT', label: 'Charge' },
              ]}
            />
            <FormField label="Amount" type="number" min={0.01} step={0.01}  value={editForm.amount} onChange={(event) => setEditForm((current) => ({ ...current, amount: event.target.value }))} required />
          </Box>
          <FormField label="Transaction Date" type="date" value={editForm.transactionDate} onChange={(event) => setEditForm((current) => ({ ...current, transactionDate: event.target.value }))} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <FormField label="Category" value={editForm.category} onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))} />
            <FormField label="Reference" value={editForm.reference} onChange={(event) => setEditForm((current) => ({ ...current, reference: event.target.value }))} />
          </Box>
          <FormField label="Notes" rows={3} multiline value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes: event.target.value }))} />
        </Box>
      </Modal>
    </>
  );
}
