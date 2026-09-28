'use client';

import { useEffect, useState } from 'react';
import {
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Box,
	InputAdornment,
} from '@mui/material';
import { DollarSign } from 'lucide-react';
import { Button, Modal, toast } from '@/components/design-system';

export interface EditableContainerExpense {
	id: string;
	type: string;
	amount: number;
	currency: string;
	date: string;
	vendor: string | null;
	invoiceNumber?: string | null;
	notes?: string | null;
}

interface AddExpenseModalProps {
	open: boolean;
	onClose: () => void;
	containerId: string;
	onSuccess: () => void;
	/** When provided, the modal edits the existing expense instead of creating one. */
	initialExpense?: EditableContainerExpense | null;
}

const expenseTypes = [
	{ value: 'SHIPPING_FEE', label: 'Shipping Fee' },
	{ value: 'PORT_CHARGES', label: 'Port Charges' },
	{ value: 'CUSTOMS_DUTY', label: 'Customs Duty' },
	{ value: 'STORAGE_FEE', label: 'Storage Fee' },
	{ value: 'HANDLING_FEE', label: 'Handling Fee' },
	{ value: 'INSURANCE', label: 'Insurance' },
	{ value: 'DOCUMENTATION', label: 'Documentation' },
	{ value: 'INLAND_TRANSPORT', label: 'Inland Transport' },
	{ value: 'INSPECTION', label: 'Inspection' },
	{ value: 'OTHER', label: 'Other' },
];

function createInitialForm(expense?: EditableContainerExpense | null) {
	return {
		type: expense?.type || 'SHIPPING_FEE',
		amount: expense ? String(expense.amount) : '',
		currency: expense?.currency || 'USD',
		vendor: expense?.vendor || '',
		invoiceNumber: expense?.invoiceNumber || '',
		date: expense?.date ? String(expense.date).slice(0, 10) : new Date().toISOString().split('T')[0],
		notes: expense?.notes || '',
	};
}

export default function AddExpenseModal({
	open,
	onClose,
	containerId,
	onSuccess,
	initialExpense,
}: AddExpenseModalProps) {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState(createInitialForm(initialExpense));
	const isEditing = Boolean(initialExpense?.id);

	useEffect(() => {
		if (open) {
			setFormData(createInitialForm(initialExpense));
		}
	}, [initialExpense, open]);

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			toast.error('Please enter a valid amount');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch(`/api/containers/${containerId}/expenses`, {
				method: isEditing ? 'PATCH' : 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...(initialExpense?.id ? { expenseId: initialExpense.id } : {}),
					type: formData.type,
					amount: parseFloat(formData.amount),
					currency: formData.currency,
					date: formData.date,
					vendor: formData.vendor || null,
					invoiceNumber: formData.invoiceNumber || null,
					notes: formData.notes || null,
				}),
			});

			if (response.ok) {
				toast.success(isEditing ? 'Expense updated successfully' : 'Expense added successfully');
				onSuccess();
				handleClose();
			} else {
				const data = await response.json();
				toast.error(data.error || `Failed to ${isEditing ? 'update' : 'add'} expense`);
			}
		} catch (error) {
			console.error('Error saving expense:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (!loading) {
			setFormData(createInitialForm(null));
			onClose();
		}
	};

	const formId = 'container-expense-form';

	return (
		<Modal
			open={open}
			onClose={handleClose}
			size="sm"
			title={
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<DollarSign style={{ fontSize: 24, color: 'var(--accent-gold)' }} />
					<span>{isEditing ? 'Edit Container Expense' : 'Add Container Expense'}</span>
				</Box>
			}
			description="Capture a container expense with vendor and invoice details so the ledger stays reconciled."
			showCloseButton={!loading}
			disableBackdropClick={loading}
			actions={
				<>
					<Button variant="outline" onClick={handleClose} disabled={loading}>
						Cancel
					</Button>
					<Button type="submit" form={formId} variant="primary" disabled={loading}>
						{loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Expense'}
					</Button>
				</>
			}
		>
			<Box component="form" id={formId} onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
					<FormControl fullWidth size="small" required>
						<InputLabel>Expense Type</InputLabel>
						<Select
							value={formData.type}
							onChange={(e) => handleChange('type', e.target.value)}
							label="Expense Type"
						>
							{!expenseTypes.some((type) => type.value === formData.type) && (
								<MenuItem value={formData.type}>
									{formData.type.replace(/_/g, ' ')}
								</MenuItem>
							)}
							{expenseTypes.map((type) => (
								<MenuItem key={type.value} value={type.value}>
									{type.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<Box sx={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2 }}>
						<TextField
							size="small"
							label="Amount"
							type="number"
							value={formData.amount}
							onChange={(e) => handleChange('amount', e.target.value)}
							required
							inputProps={{ min: 0, step: 0.01 }}
							InputProps={{
								startAdornment: <InputAdornment position="start">$</InputAdornment>,
							}}
						/>
						<TextField
							size="small"
							label="Currency"
							value={formData.currency}
							onChange={(e) => handleChange('currency', e.target.value)}
							disabled
						/>
					</Box>

					<TextField
						size="small"
						label="Vendor"
						value={formData.vendor}
						onChange={(e) => handleChange('vendor', e.target.value)}
						placeholder="e.g., Maersk Line, US Customs"
					/>

					<TextField
						size="small"
						label="Invoice Number"
						value={formData.invoiceNumber}
						onChange={(e) => handleChange('invoiceNumber', e.target.value)}
						placeholder="Vendor's invoice reference"
					/>

					<TextField
						size="small"
						label="Date"
						type="date"
						value={formData.date}
						onChange={(e) => handleChange('date', e.target.value)}
						required
						InputLabelProps={{ shrink: true }}
					/>

					<TextField
						size="small"
						label="Notes"
						value={formData.notes}
						onChange={(e) => handleChange('notes', e.target.value)}
						multiline
						rows={3}
						placeholder="Additional details..."
					/>
			</Box>
		</Modal>
	);
}
