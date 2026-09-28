'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { DollarSign, Paperclip, Upload } from 'lucide-react';
import { Button, Modal, toast } from '@/components/design-system';
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DollarSign style={{ fontSize: 24, color: 'var(--accent-gold)' }} />
          <span>{isEditing ? 'Edit Dispatch Expense' : 'Add Dispatch Expense'}</span>
        </Box>
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
      <Box component="form" id={formId} onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Category</InputLabel>
              <Select
                value={formData.category}
                onChange={(e) => handleCategoryChange(e.target.value as DispatchExpenseCategory)}
                label="Category"
              >
                {DISPATCH_EXPENSE_CATEGORY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" required>
              <InputLabel>Expense Type</InputLabel>
              <Select value={formData.type} onChange={(e) => handleChange('type', e.target.value)} label="Expense Type">
                {typeOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          <TextField
            size="small"
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            required
            placeholder="What was this dispatch expense for?"
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '2fr 1fr' }, gap: 2 }}>
            <TextField
              size="small"
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => handleChange('amount', e.target.value)}
              required
              inputProps={{ min: 0, step: 0.01 }}
              InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
            />
            <TextField size="small" label="Currency" value={formData.currency} disabled />
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <TextField size="small" label="Vendor" value={formData.vendor} onChange={(e) => handleChange('vendor', e.target.value)} />
            <TextField
              size="small"
              label="Invoice Number"
              value={formData.invoiceNumber}
              onChange={(e) => handleChange('invoiceNumber', e.target.value)}
              helperText="3-40 chars: letters, numbers, dash, slash, underscore, or period"
            />
          </Box>

          <TextField
            size="small"
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            required
            InputLabelProps={{ shrink: true }}
          />

          <Box sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 1.5, display: 'grid', gap: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>Attachment</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Upload invoice, receipt, or support file for this expense
                </Typography>
              </Box>
              <Button component="label" variant="outline" size="sm" icon={<Upload className="w-4 h-4" />}>
                {uploading ? 'Uploading...' : formData.attachmentUrl ? 'Replace file' : 'Upload file'}
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
              </Button>
            </Box>
            {formData.attachmentUrl ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
                  <Paperclip className="w-4 h-4" />
                  <Typography sx={{ fontSize: '0.8rem', color: 'var(--text-primary)' }} noWrap>
                    {formData.attachmentName || 'Uploaded attachment'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <a href={formData.attachmentUrl} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                    <Button variant="ghost" size="sm">
                      Open
                    </Button>
                  </a>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        attachmentUrl: '',
                        attachmentName: '',
                        attachmentType: '',
                      }))
                    }
                  >
                    Remove
                  </Button>
                </Box>
              </Box>
            ) : null}
          </Box>

          <TextField
            size="small"
            label="Notes"
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            multiline
            rows={3}
          />
      </Box>
    </Modal>
  );
}