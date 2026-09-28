'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Plus,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Sliders,
  Edit2,
  Trash2,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';
import { Button, toast, Modal } from '@/components/design-system';
import { formatMoney as formatCurrency } from '@/lib/format';
import type { OfficeExpenseCategory } from './page';

export type BudgetStatus = 'SAFE' | 'WARNING' | 'EXCEEDED';

export interface BudgetWithActuals {
  id: string;
  name: string;
  category: OfficeExpenseCategory | null;
  categoryLabel: string;
  budgetAmount: number;
  actualSpent: number;
  remainingAmount: number;
  percentageUsed: number;
  warningThreshold: number;
  status: BudgetStatus;
  month: number | null;
  year: number | null;
  notes: string | null;
  createdAt: string;
}

interface BudgetSummary {
  totalBudgetCap: number;
  totalActualSpent: number;
  totalRemaining: number;
  overallPercentageUsed: number;
  activeAlertsCount: number;
}

interface BudgetsTabProps {
  categoryLabels: Record<OfficeExpenseCategory, string>;
}

export default function BudgetsTab({ categoryLabels }: BudgetsTabProps) {
  const [budgets, setBudgets] = useState<BudgetWithActuals[]>([]);
  const [summary, setSummary] = useState<BudgetSummary>({
    totalBudgetCap: 0,
    totalActualSpent: 0,
    totalRemaining: 0,
    overallPercentageUsed: 0,
    activeAlertsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Month selection (default current)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetWithActuals | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<string>('ALL'); // 'ALL' = Overall cap
  const [formAmount, setFormAmount] = useState('');
  const [formWarningThreshold, setFormWarningThreshold] = useState('80');
  const [formNotes, setFormNotes] = useState('');

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/budgets?year=${selectedYear}&month=${selectedMonth}`);
      if (!res.ok) throw new Error('Failed to fetch budgets');
      const data = await res.json();
      setBudgets(data.budgets || []);
      if (data.summary) setSummary(data.summary);
    } catch (e: any) {
      toast.error(e.message || 'Error loading budgets');
    } finally {
      setLoading(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleOpenModal = (budget?: BudgetWithActuals) => {
    if (budget) {
      setEditingBudget(budget);
      setFormName(budget.name);
      setFormCategory(budget.category || 'ALL');
      setFormAmount(budget.budgetAmount.toString());
      setFormWarningThreshold(budget.warningThreshold.toString());
      setFormNotes(budget.notes || '');
    } else {
      setEditingBudget(null);
      setFormName('');
      setFormCategory('ALL');
      setFormAmount('');
      setFormWarningThreshold('80');
      setFormNotes('');
    }
    setModalOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(formAmount);
    if (!formName.trim() || isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid budget name and positive amount');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        category: formCategory === 'ALL' ? null : formCategory,
        amount: numericAmount,
        warningThreshold: parseFloat(formWarningThreshold) || 80.0,
        notes: formNotes.trim() || undefined,
        year: null, // perpetual monthly cap
        month: null,
      };

      const url = editingBudget
        ? `/api/finance/budgets/${editingBudget.id}`
        : '/api/finance/budgets';
      const method = editingBudget ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save budget');

      toast.success(editingBudget ? 'Budget cap updated' : 'Budget cap established');
      setModalOpen(false);
      fetchBudgets();
    } catch (err: any) {
      toast.error(err.message || 'Error saving budget');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudget = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/finance/budgets/${deleteConfirmId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete budget');
      toast.success('Budget cap removed');
      setDeleteConfirmId(null);
      fetchBudgets();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const alertBudgets = budgets.filter((b) => b.status === 'WARNING' || b.status === 'EXCEEDED');

  return (
    <div className="space-y-6">
      {/* Active Alert Banners */}
      {alertBudgets.length > 0 && (
        <div className="p-4 rounded-xl border border-[rgba(var(--error-rgb),0.3)] bg-[rgba(var(--error-rgb),0.1)] space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--error)]">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>Spending Cap Alerts Detected ({alertBudgets.length} Budget Limits In Warning / Exceeded)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {alertBudgets.map((b) => (
              <div
                key={b.id}
                className="p-2.5 rounded-lg bg-[var(--panel)] border border-[rgba(var(--error-rgb),0.2)] text-xs flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-foreground">{b.name}</span>
                  <div className="text-muted-foreground mt-0.5">
                    Spent: <span className="text-foreground font-mono">{formatCurrency(b.actualSpent)}</span> / Cap:{' '}
                    <span className="text-foreground font-mono">{formatCurrency(b.budgetAmount)}</span>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    b.status === 'EXCEEDED'
                      ? 'bg-[rgba(var(--error-rgb),0.2)] text-[var(--error)] border border-[rgba(var(--error-rgb),0.3)]'
                      : 'bg-[rgba(var(--warning-rgb),0.2)] text-[var(--warning)] border border-[rgba(var(--warning-rgb),0.3)]'
                  }`}
                >
                  {b.percentageUsed.toFixed(0)}% SPENT
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Banner & Action Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-panel">
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--accent-gold)]" />
            Budget Limits & Spending Caps
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Set monthly departmental spending limits and receive automated warnings when spending reaches cap thresholds.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-background px-3 py-1.5 rounded-lg border border-border text-xs">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
              className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer"
            >
              {[
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ].map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
              className="bg-transparent text-foreground font-semibold focus:outline-none cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <Button variant="primary" size="sm" onClick={() => handleOpenModal()}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Set Budget Cap
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Total Budget Cap</span>
            <DollarSign className="w-4 h-4 text-[var(--accent-gold)]" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {formatCurrency(summary.totalBudgetCap)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Total allowable monthly limit</div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Actual Spent This Month</span>
            <TrendingUp className="w-4 h-4 text-[var(--status-violet)]" />
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {formatCurrency(summary.totalActualSpent)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {summary.overallPercentageUsed.toFixed(1)}% of total budget utilized
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Remaining Budget</span>
            <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />
          </div>
          <div
            className={`text-2xl font-bold mt-2 ${
              summary.totalRemaining >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
            }`}
          >
            {formatCurrency(Math.abs(summary.totalRemaining))}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {summary.totalRemaining >= 0 ? 'Available balance' : 'Overall budget exceeded'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-border bg-panel">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Cap Alert Status</span>
            <ShieldAlert className="w-4 h-4 text-[var(--warning)]" />
          </div>
          <div className="text-2xl font-bold mt-2">
            {summary.activeAlertsCount === 0 ? (
              <span className="text-[var(--success)]">All Safe</span>
            ) : (
              <span className="text-[var(--warning)]">{summary.activeAlertsCount} Alerts</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {summary.activeAlertsCount === 0 ? 'Spending within limits' : 'Requires management review'}
          </div>
        </div>
      </div>

      {/* Budget Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-12 text-center text-muted-foreground">
            <RefreshCw className="w-5 h-5 animate-spin inline-block mr-2" />
            Evaluating budget thresholds...
          </div>
        ) : budgets.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-panel border border-border rounded-xl">
            <Sliders className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="font-semibold text-foreground">No spending caps or budgets established</p>
            <p className="text-xs mt-1">Click "Set Budget Cap" to create your first spending limit.</p>
          </div>
        ) : (
          budgets.map((b) => {
            const isExceeded = b.status === 'EXCEEDED';
            const isWarning = b.status === 'WARNING';
            const progressColor = isExceeded ? 'bg-[var(--error)]' : isWarning ? 'bg-[var(--warning)]' : 'bg-[var(--success)]';

            return (
              <div
                key={b.id}
                className={`p-4 rounded-xl border transition-all bg-panel ${
                  isExceeded
                    ? 'border-[rgba(var(--error-rgb),0.4)] shadow-sm'
                    : isWarning
                    ? 'border-[rgba(var(--warning-rgb),0.4)] shadow-sm'
                    : 'border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-foreground text-sm">{b.name}</h4>
                    <span className="inline-block text-[11px] font-medium text-muted-foreground mt-0.5">
                      {b.categoryLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(b)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                      title="Edit budget"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(b.id)}
                      className="p-1 rounded text-[var(--error)] hover:bg-[rgba(var(--error-rgb),0.1)]"
                      title="Delete budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{formatCurrency(b.actualSpent)}</span>
                    <span className="text-muted-foreground font-medium">Limit: {formatCurrency(b.budgetAmount)}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${progressColor}`}
                      style={{ width: `${Math.min(100, Math.max(1, b.percentageUsed))}%` }}
                    />
                  </div>
                </div>

                {/* Footer Status */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-border text-xs">
                  <div className="flex items-center gap-1 font-bold">
                    {isExceeded ? (
                      <span className="text-[var(--error)] flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Exceeded by {formatCurrency(Math.abs(b.remainingAmount))}
                      </span>
                    ) : isWarning ? (
                      <span className="text-[var(--warning)] flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Near Cap ({b.percentageUsed.toFixed(0)}% used)
                      </span>
                    ) : (
                      <span className="text-[var(--success)] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> {formatCurrency(b.remainingAmount)} left
                      </span>
                    )}
                  </div>
                  <span className="text-muted-foreground text-[11px]">
                    Alert @ {b.warningThreshold}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Set Budget Cap */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingBudget ? 'Edit Spending Cap' : 'Set Category Spending Cap / Budget'}
        size="md"
      >
        <form onSubmit={handleSaveBudget} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Budget Name *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Monthly Marketing Budget, Office Supplies Spending Cap"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Expense Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
              >
                <option value="ALL">★ Overall Monthly OpEx Cap</option>
                {Object.entries(categoryLabels).map(([cat, label]) => (
                  <option key={cat} value={cat}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Monthly Spending Limit ($ USD) *
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

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Warning Alert Threshold (% of budget)
            </label>
            <input
              type="number"
              min="10"
              max="100"
              required
              value={formWarningThreshold}
              onChange={(e) => setFormWarningThreshold(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Show warning badges and alerts when spending reaches {formWarningThreshold}% of the cap limit.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Internal Notes (Optional)
            </label>
            <input
              type="text"
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="e.g. Approved by board for Q3 operational roadmap"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground focus:outline-none focus:border-[var(--accent-gold)]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Saving...' : editingBudget ? 'Update Budget Cap' : 'Establish Budget Cap'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Budget Cap"
        size="sm"
      >
        <div className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            Are you sure you want to delete this spending cap? Expense records will not be affected.
          </p>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteBudget}>
              Delete Cap
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
