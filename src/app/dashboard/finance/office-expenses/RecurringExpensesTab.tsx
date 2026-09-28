'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Plus,
  RefreshCw,
  Play,
  Trash2,
  Edit2,
  Clock,
  DollarSign,
  Building2,
  CheckCircle2,
  AlertCircle,
  Repeat,
} from 'lucide-react';
import { Button, toast, Modal } from '@/components/design-system';
import { formatMoney as formatCurrency } from '@/lib/format';
import type { OfficeExpenseCategory } from './page';

export type RecurringFrequency = 'MONTHLY' | 'QUARTERLY' | 'YEARLY' | 'WEEKLY' | 'BIWEEKLY';

export interface RecurringExpenseItem {
  id: string;
  title: string;
  category: OfficeExpenseCategory;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  startDate: string;
  endDate: string | null;
  paymentMethod: string;
  vendor: string | null;
  referencePrefix: string | null;
  notes: string | null;
  isActive: boolean;
  autoCreatePaid: boolean;
  lastGeneratedDate: string | null;
  nextDueDate: string;
  _count?: {
    generatedExpenses: number;
  };
}

interface RecurringExpensesTabProps {
  onExpenseGenerated?: () => void;
  categoryLabels: Record<OfficeExpenseCategory, string>;
}

export default function RecurringExpensesTab({
  onExpenseGenerated,
  categoryLabels,
}: RecurringExpensesTabProps) {
  const [items, setItems] = useState<RecurringExpenseItem[]>([]);
  const [stats, setStats] = useState({ activeCount: 0, monthlyCommittedAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringExpenseItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<OfficeExpenseCategory>('RENT');
  const [formAmount, setFormAmount] = useState('');
  const [formFrequency, setFormFrequency] = useState<RecurringFrequency>('MONTHLY');
  const [formDayOfMonth, setFormDayOfMonth] = useState('1');
  const [formPaymentMethod, setFormPaymentMethod] = useState('BANK_TRANSFER');
  const [formVendor, setFormVendor] = useState('');
  const [formRefPrefix, setFormRefPrefix] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formAutoPaid, setFormAutoPaid] = useState(true);

  const fetchRecurring = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/recurring-expenses');
      if (!res.ok) throw new Error('Failed to load recurring expenses');
      const data = await res.json();
      setItems(data.recurringTemplates || []);
      if (data.stats) setStats(data.stats);
    } catch (e: any) {
      toast.error(e.message || 'Error fetching schedules');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const handleOpenModal = (item?: RecurringExpenseItem) => {
    if (item) {
      setEditingItem(item);
      setFormTitle(item.title);
      setFormCategory(item.category);
      setFormAmount(item.amount.toString());
      setFormFrequency(item.frequency);
      setFormDayOfMonth(item.dayOfMonth.toString());
      setFormPaymentMethod(item.paymentMethod);
      setFormVendor(item.vendor || '');
      setFormRefPrefix(item.referencePrefix || '');
      setFormNotes(item.notes || '');
      setFormAutoPaid(item.autoCreatePaid);
    } else {
      setEditingItem(null);
      setFormTitle('');
      setFormCategory('RENT');
      setFormAmount('');
      setFormFrequency('MONTHLY');
      setFormDayOfMonth('1');
      setFormPaymentMethod('BANK_TRANSFER');
      setFormVendor('');
      setFormRefPrefix('');
      setFormNotes('');
      setFormAutoPaid(true);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(formAmount);
    if (!formTitle.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid title and positive amount');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formTitle.trim(),
        category: formCategory,
        amount: numericAmount,
        frequency: formFrequency,
        dayOfMonth: parseInt(formDayOfMonth, 10) || 1,
        paymentMethod: formPaymentMethod,
        vendor: formVendor.trim() || undefined,
        referencePrefix: formRefPrefix.trim() || undefined,
        notes: formNotes.trim() || undefined,
        autoCreatePaid: formAutoPaid,
      };

      const url = editingItem
        ? `/api/finance/recurring-expenses/${editingItem.id}`
        : '/api/finance/recurring-expenses';
      const method = editingItem ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');

      toast.success(editingItem ? 'Schedule updated' : 'Recurring schedule created');
      setModalOpen(false);
      fetchRecurring();
    } catch (err: any) {
      toast.error(err.message || 'Error saving recurring schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: RecurringExpenseItem) => {
    try {
      const res = await fetch(`/api/finance/recurring-expenses/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      toast.success(item.isActive ? 'Schedule paused' : 'Schedule activated');
      fetchRecurring();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/finance/recurring-expenses/${deleteConfirmId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Recurring schedule removed');
      setDeleteConfirmId(null);
      fetchRecurring();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleProcessDueNow = async () => {
    setProcessing(true);
    try {
      const res = await fetch('/api/finance/recurring-expenses/process', {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process bills');

      if (data.processedCount > 0) {
        toast.success(`Generated ${data.processedCount} recurring bill(s) successfully!`);
        if (onExpenseGenerated) onExpenseGenerated();
      } else {
        toast.info('No recurring bills are currently due today.');
      }
      fetchRecurring();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-panel">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Repeat className="w-4 h-4 text-[var(--accent-gold)]" />
            Recurring Operating Expenses & Bills
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automate monthly office rent, utilities, vendor contracts, and software subscriptions.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleProcessDueNow}
            disabled={processing}
          >
            <Play className={`w-3.5 h-3.5 mr-1.5 ${processing ? 'animate-spin' : 'text-[var(--success)]'}`} />
            {processing ? 'Processing...' : 'Process Due Bills Now'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => handleOpenModal()}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Recurring Schedule
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Active Schedules</span>
            <Clock className="w-4 h-4 text-[var(--accent-gold)]" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{stats.activeCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Automated active templates</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Monthly Committed</span>
            <DollarSign className="w-4 h-4 text-[var(--success)]" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {formatCurrency(stats.monthlyCommittedAmount)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Estimated monthly recurring OpEx</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Next Due</span>
            <Calendar className="w-4 h-4 text-[var(--info)]" />
          </div>
          <div className="text-lg font-bold text-foreground mt-2 truncate">
            {items.length > 0 && items[0].nextDueDate
              ? new Date(items[0].nextDueDate).toLocaleDateString()
              : 'None scheduled'}
          </div>
          <div className="text-xs text-muted-foreground mt-1 truncate">
            {items.length > 0 ? items[0].title : 'All bills up to date'}
          </div>
        </div>
      </div>

      {/* Schedules Table */}
      <div className="rounded-xl border border-border bg-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3 px-4">Title & Category</th>
                <th className="py-3 px-4">Frequency</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Vendor</th>
                <th className="py-3 px-4">Next Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    <RefreshCw className="w-4 h-4 animate-spin inline-block mr-2" />
                    Loading recurring schedules...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <Repeat className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="font-semibold text-foreground">No recurring expenses scheduled</p>
                    <p className="text-xs">Create a recurring template for rent, payroll, or software tools.</p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isDue = new Date(item.nextDueDate) <= new Date();
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">{item.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {categoryLabels[item.category] || item.category}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        <span className="px-2 py-0.5 rounded bg-muted text-foreground border border-border">
                          {item.frequency} (Day {item.dayOfMonth})
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-foreground">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {item.vendor || '—'}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className={isDue && item.isActive ? 'text-[var(--warning)] font-bold' : 'text-foreground'}>
                            {new Date(item.nextDueDate).toLocaleDateString()}
                          </span>
                          {isDue && item.isActive && (
                            <span className="px-1.5 py-0.2 rounded bg-[rgba(var(--warning-rgb),0.1)] text-[var(--warning)] text-[10px] font-bold border border-[rgba(var(--warning-rgb),0.2)]">
                              DUE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item)}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
                            item.isActive
                              ? 'bg-[rgba(var(--success-rgb),0.1)] text-[var(--success)] border border-[rgba(var(--success-rgb),0.2)] hover:bg-[var(--success)]/20'
                              : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
                          }`}
                        >
                          {item.isActive ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {item.isActive ? 'Active' : 'Paused'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenModal(item)}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                            title="Edit schedule"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1.5 rounded-lg border border-[rgba(var(--error-rgb),0.3)] text-[var(--error)] hover:bg-[rgba(var(--error-rgb),0.1)]"
                            title="Delete schedule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create / Edit Recurring Schedule */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Recurring Schedule' : 'New Recurring Expense Schedule'}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Title / Description *
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Office Monthly Rent, Internet Fiber, Slack Subscription"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Category *
              </label>
              <select
                required
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as OfficeExpenseCategory)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
              >
                {Object.entries(categoryLabels).map(([cat, label]) => (
                  <option key={cat} value={cat}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Amount ($ USD) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground font-semibold focus:outline-none focus:border-[var(--accent-gold)]"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Frequency *
              </label>
              <select
                value={formFrequency}
                onChange={(e) => setFormFrequency(e.target.value as RecurringFrequency)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
              >
                <option value="MONTHLY">Monthly</option>
                <option value="QUARTERLY">Quarterly (Every 3 Months)</option>
                <option value="YEARLY">Yearly (Annual)</option>
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Bi-Weekly (Every 2 Weeks)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Day of Month (1 - 28) *
              </label>
              <input
                type="number"
                min="1"
                max="28"
                required
                value={formDayOfMonth}
                onChange={(e) => setFormDayOfMonth(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Vendor / Payee
              </label>
              <input
                type="text"
                value={formVendor}
                onChange={(e) => setFormVendor(e.target.value)}
                placeholder="e.g. Landlord, Comcast, AWS"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Payment Method
              </label>
              <select
                value={formPaymentMethod}
                onChange={(e) => setFormPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
              >
                <option value="BANK_TRANSFER">Bank Wire / ACH</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="CHECK">Check</option>
                <option value="CASH">Cash</option>
                <option value="ZELLE">Zelle</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Internal Notes
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Account #, lease contract reference, etc."
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="autoPaid"
              checked={formAutoPaid}
              onChange={(e) => setFormAutoPaid(e.target.checked)}
              className="rounded border-border text-[var(--accent-gold)] focus:ring-[var(--accent-gold)]"
            />
            <label htmlFor="autoPaid" className="text-xs text-foreground font-medium cursor-pointer">
              Auto-mark generated expenses as <span className="text-[var(--success)] font-bold">PAID</span> (otherwise creates as PENDING)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Recurring Schedule'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Recurring Schedule"
        size="sm"
      >
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Are you sure you want to delete this recurring schedule? Existing generated expense entries will not be deleted.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete Schedule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
