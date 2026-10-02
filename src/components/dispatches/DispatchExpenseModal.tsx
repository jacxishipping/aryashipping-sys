'use client';

import { useEffect, useMemo, useState } from 'react';
import { DollarSign, Paperclip, Upload } from 'lucide-react';
import { Button, FormField, Modal, Select, toast } from '@/components/design-system';
import {
  DEFAULT_DISPATCH_EXPENSE_CATEGORY,
  DISPATCH_EXPENSE_CATEGORY_OPTIONS,
  getDispatchExpenseTypes,
  isValidDispatchExpenseInvoiceNumber,
  type DispatchExpenseCategory,
} from '@/lib/dispatch-expenses';

export interface EditableDispatchExpense {
  id: string;
  category: string | null;
  type: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  vendor: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
}

interface DispatchExpenseModalProps {
  open: boolean;
  onClose: () => void;
  dispatchId: string;
  onSuccess: () => void;
  initialExpense?: EditableDispatchExpense | null;
}

function createInitialForm(expense?: EditableDispatchExpense | null) {
  const category = (expense?.category as DispatchExpenseCategory | null) || DEFAULT_DISPATCH_EXPENSE_CATEGORY;
  const availableTypes = getDispatchExpenseTypes(category);
  const defaultType = availableTypes.some((option) => option.value === expense?.type)
    ? expense?.type || availableTypes[0].value
    : availableTypes[0].value;

  return {
    category,
    type: defaultType,
    description: expense?.description || '',
    amount: expense ? String(expense.amount) : '',
    currency: expense?.currency || 'USD',
    date: expense?.date ? expense.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    vendor: expense?.vendor || '',
    invoiceNumber: expense?.invoiceNumber || '',
    notes: expense?.notes || '',
    attachmentUrl: expense?.attachmentUrl || '',
    attachmentName: expense?.attachmentName || '',
    attachmentType: expense?.attachmentType || '',
  };
}

export default function DispatchExpenseModal({
  open,
  onClose,
  dispatchId,
  onSuccess,
  initialExpense,
}: DispatchExpenseModalProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState(createInitialForm(initialExpense));

  const typeOptions = useMemo(() => getDispatchExpenseTypes(formData.category), [formData.category]);
  const isEditing = Boolean(initialExpense?.id);

  useEffect(() => {
    if (open) {
      setFormData(createInitialForm(initialExpense));
    }
  }, [initialExpense, open]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (category: DispatchExpenseCategory) => {
    const nextTypes = getDispatchExpenseTypes(category);
    setFormData((prev) => ({
      ...prev,
      category,
      type: nextTypes.some((option) => option.value === prev.type) ? prev.type : nextTypes[0].value,
    }));
  };

  const resetAndClose = () => {
    if (loading || uploading) return;
    setFormData(createInitialForm(initialExpense));
    onClose();
  };

  const handleAttachmentUpload = async (file: File) => {
    try {
      setUploading(true);
      const body = new FormData();
      body.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload attachment');
      }

      setFormData((prev) => ({
        ...prev,
        attachmentUrl: data.url,
        attachmentName: file.name,
        attachmentType: file.type,
      }));
      toast.success('Attachment uploaded');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const parsedAmount = parseFloat(formData.amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      toast.error('Enter a valid expense amount');
      return;
    }

    if (formData.description.trim().length < 3) {
      toast.error('Description must be at least 3 characters');
      return;
    }

    if (formData.invoiceNumber.trim() && !isValidDispatchExpenseInvoiceNumber(formData.invoiceNumber.trim())) {
      toast.error('Invoice number format is invalid');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/dispatches/${dispatchId}/expenses`, {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(initialExpense?.id ? { expenseId: initialExpense.id } : {}),
          category: formData.category,
          type: formData.type,
          description: formData.description.trim(),
          amount: parsedAmount,
          currency: formData.currency,
          date: formData.date,
          vendor: formData.vendor || null,
          invoiceNumber: formData.invoiceNumber || null,
          notes: formData.notes || null,
          attachmentUrl: formData.attachmentUrl || null,
          attachmentName: formData.attachmentName || null,
          attachmentType: formData.attachmentType || null,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} expense`);
      }

      toast.success(isEditing ? 'Dispatch expense updated' : 'Dispatch expense added');
      onSuccess();
      setFormData(createInitialForm(null));
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const formId = 'dispatch-expense-form';

  return (
    <Modal
      open={open}
      onClose={resetAndClose}
      size="sm"
      title={
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-[var(--accent-gold)]" />
          <span>{isEditing ? 'Edit Dispatch Expense' : 'Add Dispatch Expense'}</span>
        </div>
      }
      description="Track dispatch-related costs and attach supporting paperwork when available."
      showCloseButton={!loading && !uploading}
      disableBackdropClick={loading || uploading}
      actions={
        <>
          <Button variant="outline" onClick={resetAndClose} disabled={loading || uploading}>Cancel</Button>
          <Button type="submit" form={formId} variant="primary" disabled={loading || uploading}>
            {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Expense'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select
            label="Category"
            value={formData.category}
            onChange={(value) => handleCategoryChange(value as DispatchExpenseCategory)}
            size="small"
            required
            options={DISPATCH_EXPENSE_CATEGORY_OPTIONS}
          />

          <Select
            label="Expense Type"
            value={formData.type}
            onChange={(value) => handleChange('type', String(value))}
            size="small"
            required
            options={typeOptions}
          />
        </div>

        <FormField
          label="Description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          required
          placeholder="What was this dispatch expense for?"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <FormField
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              required
              min={0}
              step={0.01}
              startAdornment={<span className="text-[var(--text-secondary)]">$</span>}
            />
          </div>
          <FormField label="Currency" value={formData.currency} disabled />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Vendor" value={formData.vendor} onChange={(e) => handleChange('vendor', e.target.value)} />
          <FormField
            label="Invoice Number"
            value={formData.invoiceNumber}
            onChange={(e) => handleChange('invoiceNumber', e.target.value)}
            helperText="3-40 chars: letters, numbers, dash, slash, underscore, or period"
          />
        </div>

        <FormField
          label="Date"
          type="date"
          value={formData.date}
          onChange={(e) => handleChange('date', e.target.value)}
          required
        />

        <div className="rounded-lg border border-[var(--border)] p-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-[var(--text-primary)]">Attachment</div>
              <div className="text-xs text-[var(--text-secondary)]">
                Upload invoice, receipt, or support file for this expense
              </div>
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--panel)] text-xs font-semibold text-[var(--text-primary)] cursor-pointer hover:bg-[var(--background)]">
              <Upload className="w-4 h-4" />
              <span>{uploading ? 'Uploading...' : formData.attachmentUrl ? 'Replace file' : 'Upload file'}</span>
              <input
                hidden
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleAttachmentUpload(file);
                  }
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>
          {formData.attachmentUrl ? (
            <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-[var(--border)]">
              <div className="flex items-center gap-1.5 min-w-0">
                <Paperclip className="w-4 h-4 text-[var(--accent-gold)] shrink-0" />
                <span className="text-xs text-[var(--text-primary)] truncate">
                  {formData.attachmentName || 'Uploaded attachment'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <a href={formData.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs font-medium text-[var(--accent-gold)] hover:underline">
                  Open
                </a>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      attachmentUrl: '',
                      attachmentName: '',
                      attachmentType: '',
                    }))
                  }
                  className="text-xs text-red-500 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <FormField
          label="Notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          multiline
          rows={3}
        />
      </form>
    </Modal>
  );
}