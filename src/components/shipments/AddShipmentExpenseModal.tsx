'use client';

import { useState, useEffect, useRef } from 'react';
import {
	TextField,
	Box,
	InputAdornment,
	FormControlLabel,
	Checkbox,
	CircularProgress,
} from '@mui/material';
import { DollarSign, Plus, Trash2, Paperclip, X, TrendingUp, TrendingDown } from 'lucide-react';
import { Button, Modal, Select, toast } from '@/components/design-system';

interface ShipmentOption {
	id: string;
	vehicleMake: string | null;
	vehicleModel: string | null;
	vehicleVIN?: string | null;
	user?: { name: string | null; email: string };
}

interface AddShipmentExpenseModalProps {
	open: boolean;
	onClose: () => void;
	/** Pre-selected shipment. Omit when providing `shipments` for the picker. */
	shipmentId?: string;
	/** When provided, shows a shipment selector dropdown. */
	shipments?: ShipmentOption[];
	onSuccess: () => void;
	modalTitle?: string;
	/** Context type: determines which company ledger to debit */
	contextType?: 'TRANSIT' | 'CONTAINER' | 'DISPATCH';
	/** Context ID: the dispatch, transit, or container ID for additional routing context */
	contextId?: string;
}

// Expense types matching the LedgerEntry metadata logic
const expenseTypes = [
	{ value: 'SHIPPING_FEE', label: 'Shipping Fee' },
	{ value: 'FUEL', label: 'Fuel' },
	{ value: 'PORT_CHARGES', label: 'Port Charges' },
	{ value: 'TOWING', label: 'Towing' },
	{ value: 'CUSTOMS', label: 'Customs' },
	{ value: 'STORAGE_FEE', label: 'Storage Fee' },
	{ value: 'HANDLING_FEE', label: 'Handling Fee' },
	{ value: 'INSURANCE', label: 'Insurance' },
	{ value: 'OTHER', label: 'Other' },
];

export default function AddShipmentExpenseModal({
	open,
	onClose,
	shipmentId: shipmentIdProp,
	shipments,
	onSuccess,
	modalTitle,
	contextType: contextTypeProp,
	contextId,
}: AddShipmentExpenseModalProps) {
	const shipmentOptions = shipments ?? [];
	const singleShipmentId = !shipmentIdProp && shipments?.length === 1 ? shipments[0].id : '';
	const isBulkMode = Boolean(shipments && shipments.length > 1 && !shipmentIdProp);
	const shouldShowShipmentSelector = Boolean(shipments && shipments.length > 1 && !shipmentIdProp);

	const [loading, setLoading] = useState(false);
	const [selectedShipmentId, setSelectedShipmentId] = useState(shipmentIdProp || singleShipmentId || '');
	const [selectedContextType, setSelectedContextType] = useState<'CONTAINER' | 'DISPATCH' | 'TRANSIT' | ''>(
		contextTypeProp || ''
	);
	const [useSplitAmounts, setUseSplitAmounts] = useState(false);
	const [uploadingReceipt, setUploadingReceipt] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [formData, setFormData] = useState({
		expenseType: 'SHIPPING_FEE',
		amount: '',
		companyAmount: '',
		description: '',
		notes: '',
		receiptUrl: '',
		receiptName: '',
		paymentMode: 'DUE' as 'DUE',
	});

	const createEmptyItem = () => ({
		shipmentId: singleShipmentId || '',
		expenseType: 'SHIPPING_FEE',
		amount: '',
		companyAmount: '',
		description: '',
		notes: '',
		receiptUrl: '',
		receiptName: '',
		paymentMode: 'DUE' as 'DUE',
		useSplitAmounts: false,
	});

	const [expenseItems, setExpenseItems] = useState([createEmptyItem()]);

	// Sync pre-selected shipmentId when a different row is clicked
	useEffect(() => {
		setSelectedShipmentId(shipmentIdProp || singleShipmentId || '');
	}, [shipmentIdProp, singleShipmentId]);

	useEffect(() => {
		if (contextTypeProp) {
			setSelectedContextType(contextTypeProp);
		}
	}, [contextTypeProp]);

	useEffect(() => {
		if (open && isBulkMode) {
			setExpenseItems([createEmptyItem()]);
		}
	}, [open, isBulkMode, singleShipmentId]);

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleFileUpload = async (file: File) => {
		if (!file) return;
		setUploadingReceipt(true);
		try {
			const bodyData = new FormData();
			bodyData.append('file', file);
			const response = await fetch('/api/upload', {
				method: 'POST',
				body: bodyData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to upload receipt');
			}

			const result = await response.json();
			setFormData((prev) => ({
				...prev,
				receiptUrl: result.url,
				receiptName: file.name,
			}));
			toast.success('Receipt attached successfully');
		} catch (error) {
			console.error('Receipt upload error:', error);
			toast.error(error instanceof Error ? error.message : 'Receipt upload failed');
		} finally {
			setUploadingReceipt(false);
			if (fileInputRef.current) fileInputRef.current.value = '';
		}
	};

	const handleBulkItemFileUpload = async (index: number, file: File) => {
		if (!file) return;
		try {
			const bodyData = new FormData();
			bodyData.append('file', file);
			const response = await fetch('/api/upload', {
				method: 'POST',
				body: bodyData,
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || 'Failed to upload receipt');
			}

			const result = await response.json();
			updateItem(index, 'receiptUrl', result.url);
			updateItem(index, 'receiptName', file.name);
			toast.success(`Receipt attached to expense #${index + 1}`);
		} catch (error) {
			console.error('Bulk receipt upload error:', error);
			toast.error(error instanceof Error ? error.message : 'Receipt upload failed');
		}
	};

	// Calculated margin preview for split amounts
	const customerAmountNum = parseFloat(formData.amount) || 0;
	const companyAmountNum = parseFloat(formData.companyAmount) || 0;
	const marginNum = customerAmountNum - companyAmountNum;
	const marginPercentage = customerAmountNum > 0 ? (marginNum / customerAmountNum) * 100 : 0;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const effectiveContext = contextTypeProp || selectedContextType || undefined;

		if (isBulkMode) {
			const hasEmptyShipment = expenseItems.some((item) => !item.shipmentId);
			if (hasEmptyShipment) {
				toast.error('Please select a shipment for all rows');
				return;
			}

			const hasInvalidAmount = expenseItems.some((item) => !item.amount || parseFloat(item.amount) <= 0);
			if (hasInvalidAmount) {
				toast.error('Please enter a valid amount for all rows');
				return;
			}

			const hasInvalidCompanyAmount = expenseItems.some(
				(item) => item.useSplitAmounts && (!item.companyAmount || parseFloat(item.companyAmount) <= 0)
			);
			if (hasInvalidCompanyAmount) {
				toast.error('Please enter a valid company amount for split rows');
				return;
			}

			const hasMissingDescription = expenseItems.some((item) => !item.description.trim());
			if (hasMissingDescription) {
				toast.error('Please enter a description for all rows');
				return;
			}

			setLoading(true);

			let successCount = 0;
			let failureCount = 0;

			for (const item of expenseItems) {
				try {
					const response = await fetch('/api/ledger/expense', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							shipmentId: item.shipmentId,
							expenseType: item.expenseType,
							amount: parseFloat(item.amount),
							createCompanyCredit: item.useSplitAmounts,
							...(item.useSplitAmounts ? { companyAmount: parseFloat(item.companyAmount) } : {}),
							description: item.description,
							notes: item.notes || undefined,
							paymentMode: 'DUE',
							...(item.receiptUrl ? { receiptUrl: item.receiptUrl, receiptName: item.receiptName } : {}),
							...(effectiveContext ? { contextType: effectiveContext } : {}),
							...(contextId ? { contextId } : {}),
						}),
					});

					if (response.ok) {
						successCount += 1;
					} else {
						failureCount += 1;
					}
				} catch (error) {
					console.error('Error adding expense row:', error);
					failureCount += 1;
				}
			}

			if (successCount > 0) {
				toast.success(`${successCount} shipment expense${successCount > 1 ? 's' : ''} added successfully`);
				onSuccess();
				handleClose();
			}

			if (failureCount > 0) {
				toast.error(`${failureCount} row${failureCount > 1 ? 's' : ''} failed. Please review and retry.`);
			}

			setLoading(false);
			return;
		}

		const resolvedShipmentId = selectedShipmentId;

		if (!resolvedShipmentId) {
			toast.error('Please select a shipment');
			return;
		}

		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			toast.error('Please enter a valid amount');
			return;
		}

		if (useSplitAmounts && (!formData.companyAmount || parseFloat(formData.companyAmount) <= 0)) {
			toast.error('Please enter a valid company amount');
			return;
		}

		if (!formData.description) {
			toast.error('Please enter a description');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch('/api/ledger/expense', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shipmentId: resolvedShipmentId,
					expenseType: formData.expenseType,
					amount: parseFloat(formData.amount),
					createCompanyCredit: useSplitAmounts,
					...(useSplitAmounts ? { companyAmount: parseFloat(formData.companyAmount) } : {}),
					description: formData.description,
					notes: formData.notes || undefined,
					paymentMode: 'DUE',
					...(formData.receiptUrl ? { receiptUrl: formData.receiptUrl, receiptName: formData.receiptName } : {}),
					...(effectiveContext ? { contextType: effectiveContext } : {}),
					...(contextId ? { contextId } : {}),
				}),
			});

			if (response.ok) {
				const data = await response.json();
				toast.success(data.message || 'Expense added successfully');
				onSuccess();
				handleClose();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to add expense');
			}
		} catch (error) {
			console.error('Error adding expense:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (!loading) {
			setFormData({
				expenseType: 'SHIPPING_FEE',
				amount: '',
				companyAmount: '',
				description: '',
				notes: '',
				receiptUrl: '',
				receiptName: '',
				paymentMode: 'DUE',
			});
			setUseSplitAmounts(false);
			setUploadingReceipt(false);
			setExpenseItems([createEmptyItem()]);
			if (!shipmentIdProp) setSelectedShipmentId(singleShipmentId || '');
			onClose();
		}
	};

	const updateItem = (index: number, field: string, value: string | boolean) => {
		setExpenseItems((prev) =>
			prev.map((item, itemIndex) =>
				itemIndex === index ? { ...item, [field]: value } : item
			)
		);
	};

	const addItem = () => {
		setExpenseItems((prev) => [...prev, createEmptyItem()]);
	};

	const removeItem = (index: number) => {
		setExpenseItems((prev) => {
			if (prev.length === 1) return prev;
			return prev.filter((_, itemIndex) => itemIndex !== index);
		});
	};

	const formId = 'shipment-expense-form';

	return (
		<Modal
			open={open}
			onClose={handleClose}
			size={isBulkMode ? 'lg' : 'sm'}
			title={
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<DollarSign style={{ fontSize: 24, color: 'var(--accent-gold)' }} />
					<span>{modalTitle || 'Add Shipment Expense'}</span>
				</Box>
			}
			description={
				isBulkMode
					? 'Add multiple shipment expenses in one submission with per-item accounting legs and receipts.'
					: 'Capture a shipment expense, configure carrier cost recovery, and attach document receipts.'
			}
			showCloseButton={!loading}
			disableBackdropClick={loading}
			contentSx={{ maxHeight: '72vh' }}
			actions={
				<>
					<Button variant="outline" onClick={handleClose} disabled={loading}>
						Cancel
					</Button>
					<Button type="submit" form={formId} variant="primary" disabled={loading || uploadingReceipt}>
						{loading ? 'Adding...' : 'Add Expense'}
					</Button>
				</>
			}
		>
			<Box component="form" id={formId} onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
				{isBulkMode ? (
					<>
						<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
							<Box sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
								Add multiple shipment expenses in one submission
							</Box>
							<Button type="button" variant="outline" size="sm" icon={<Plus className="w-4 h-4" />} onClick={addItem} disabled={loading}>
								Add Row
							</Button>
						</Box>

						{expenseItems.map((item, index) => (
							<Box key={`expense-row-${index}`} sx={{ border: '1px solid var(--border)', borderRadius: 2, p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
								<Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
									<Box sx={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Expense #{index + 1}</Box>
									<Button type="button" variant="outline" size="sm" icon={<Trash2 className="w-3 h-3" />} onClick={() => removeItem(index)} disabled={loading || expenseItems.length === 1}>
										Remove
									</Button>
								</Box>

								<Select
									label="Shipment"
									value={item.shipmentId}
									onChange={(value) => updateItem(index, 'shipmentId', String(value))}
									size="small"
									required
									placeholder="Select a shipment..."
									options={(shipments || []).map((s) => ({
										value: s.id,
										label: `${s.vehicleMake} ${s.vehicleModel}${s.vehicleVIN ? ` - ${s.vehicleVIN}` : ''}${s.user ? ` (${s.user.name || s.user.email})` : ''}`,
									}))}
								/>

								<Select
									label="Expense Type"
									value={item.expenseType}
									onChange={(value) => updateItem(index, 'expenseType', String(value))}
									size="small"
									required
									options={expenseTypes}
								/>

								<TextField size="small" label="Description" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} required />

								<FormControlLabel
									control={<Checkbox checked={item.useSplitAmounts} onChange={(e) => updateItem(index, 'useSplitAmounts', e.target.checked)} size="small" />}
									label={<Box component="span" sx={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Use split amounts (Customer vs. Company Cost)</Box>}
								/>

								{!item.useSplitAmounts ? (
									<TextField size="small" label="Amount (USD)" type="number" value={item.amount} onChange={(e) => updateItem(index, 'amount', e.target.value)} required inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} helperText="Only the customer ledger will be debited" />
								) : (
									<>
										<TextField size="small" label="Customer Amount (USD)" type="number" value={item.amount} onChange={(e) => updateItem(index, 'amount', e.target.value)} required inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} helperText="Amount debited to the customer ledger" />
										<TextField size="small" label="Carrier Cost (USD)" type="number" value={item.companyAmount} onChange={(e) => updateItem(index, 'companyAmount', e.target.value)} required inputProps={{ min: 0, step: 0.01 }} InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }} helperText="Amount credited to the company ledger" />
									</>
								)}

								{/* Receipt attachment for bulk item */}
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
									{item.receiptUrl ? (
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, border: '1px solid var(--border)', borderRadius: 1.5, backgroundColor: 'rgba(var(--accent-gold-rgb), 0.08)' }}>
											<Paperclip className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
											<span className="text-xs truncate max-w-[200px] text-[var(--text-primary)]">{item.receiptName || 'Attached Receipt'}</span>
											<button
												type="button"
												onClick={() => {
													updateItem(index, 'receiptUrl', '');
													updateItem(index, 'receiptName', '');
												}}
												className="text-[var(--text-secondary)] hover:text-red-400 p-0.5"
											>
												<X className="w-3 h-3" />
											</button>
										</Box>
									) : (
										<label className="inline-flex items-center gap-1.5 px-3 py-1 border border-dashed border-[var(--border)] rounded text-xs text-[var(--text-secondary)] hover:border-[var(--accent-gold)] hover:text-[var(--accent-gold)] cursor-pointer transition-colors">
											<Paperclip className="w-3.5 h-3.5" />
											<span>Attach Receipt (PDF/Image)</span>
											<input
												type="file"
												accept="image/*,application/pdf"
												className="hidden"
												onChange={(e) => {
													const file = e.target.files?.[0];
													if (file) handleBulkItemFileUpload(index, file);
												}}
											/>
										</label>
									)}
								</Box>

								<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
									Payment mode: Due (invoice first)
								</Box>

								<TextField size="small" label="Notes" value={item.notes} onChange={(e) => updateItem(index, 'notes', e.target.value)} multiline rows={2} />
							</Box>
						))}
					</>
				) : (
					<>
						{shouldShowShipmentSelector && (
							<Select
								label="Shipment"
								value={selectedShipmentId}
								onChange={(value) => setSelectedShipmentId(String(value))}
								size="small"
								required
								placeholder="Select a shipment..."
								options={shipmentOptions.map((s) => ({
									value: s.id,
									label: `${s.vehicleMake} ${s.vehicleModel}${s.vehicleVIN ? ` - ${s.vehicleVIN}` : ''}${s.user ? ` (${s.user.name || s.user.email})` : ''}`,
								}))}
							/>
						)}

						{/* Accounting Leg Selector (when context is not locked by props) */}
						{!contextTypeProp && (
							<Select
								label="Accounting Leg / Posting Route"
								value={selectedContextType}
								onChange={(value) => setSelectedContextType(value as any)}
								size="small"
								placeholder="Auto-detect from expense type & shipment setup"
								options={[
									{ value: 'CONTAINER', label: 'Container / Ocean Shipping Line' },
									{ value: 'DISPATCH', label: 'Dispatch / Inland Towing Carrier' },
									{ value: 'TRANSIT', label: 'Transit / Destination Transport Carrier' },
								]}
							/>
						)}

						<Select
							label="Expense Type"
							value={formData.expenseType}
							onChange={(value) => handleChange('expenseType', String(value))}
							size="small"
							required
							options={expenseTypes}
						/>

						<TextField
							size="small"
							label="Description"
							value={formData.description}
							onChange={(e) => handleChange('description', e.target.value)}
							required
							placeholder="e.g. Forklift fee, storage demurrage, extra towing"
						/>

						<FormControlLabel
							control={<Checkbox checked={useSplitAmounts} onChange={(e) => setUseSplitAmounts(e.target.checked)} size="small" />}
							label={<Box component="span" sx={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Use split amounts (Track Customer Charge vs. Carrier Cost)</Box>}
						/>

						{!useSplitAmounts ? (
							<TextField
								size="small"
								label="Amount (USD)"
								type="number"
								value={formData.amount}
								onChange={(e) => handleChange('amount', e.target.value)}
								required
								inputProps={{ min: 0, step: 0.01 }}
								InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
								helperText="Customer ledger debited. Company ledger credited at same amount."
							/>
						) : (
							<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
								<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
									<TextField
										size="small"
										label="Customer Charge (USD)"
										type="number"
										value={formData.amount}
										onChange={(e) => handleChange('amount', e.target.value)}
										required
										inputProps={{ min: 0, step: 0.01 }}
										InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
										helperText="Debited to customer"
									/>
									<TextField
										size="small"
										label="Carrier Cost (USD)"
										type="number"
										value={formData.companyAmount}
										onChange={(e) => handleChange('companyAmount', e.target.value)}
										required
										inputProps={{ min: 0, step: 0.01 }}
										InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
										helperText="Credited to company ledger"
									/>
								</Box>

								{/* Dynamic Margin Indicator */}
								{customerAmountNum > 0 && companyAmountNum > 0 && (
									<Box
										sx={{
											p: 1.25,
											borderRadius: 1.5,
											border: '1px solid',
											borderColor: marginNum >= 0 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
											backgroundColor: marginNum >= 0 ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
											display: 'flex',
											alignItems: 'center',
											justifyContent: 'space-between',
											fontSize: '0.8125rem',
										}}
									>
										<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
											{marginNum >= 0 ? (
												<TrendingUp className="w-4 h-4 text-emerald-500" />
											) : (
												<TrendingDown className="w-4 h-4 text-red-500" />
											)}
											<span style={{ color: marginNum >= 0 ? 'rgb(21,128,61)' : 'rgb(185,28,28)', fontWeight: 600 }}>
												{marginNum >= 0 ? 'Projected Profit Margin' : 'Projected Negative Margin (Loss)'}
											</span>
										</Box>
										<Box sx={{ fontWeight: 700, color: marginNum >= 0 ? 'rgb(21,128,61)' : 'rgb(185,28,28)' }}>
											{marginNum >= 0 ? '+' : ''}${marginNum.toFixed(2)} ({marginPercentage.toFixed(1)}%)
										</Box>
									</Box>
								)}
							</Box>
						)}

						{/* Document / Receipt Upload */}
						<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
							<Box sx={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
								Receipt / Invoice Document
							</Box>
							<input
								type="file"
								ref={fileInputRef}
								accept="image/*,application/pdf"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) void handleFileUpload(file);
								}}
							/>
							{formData.receiptUrl ? (
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
										<Box sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-primary)' }} className="truncate">
											{formData.receiptName || 'Receipt Document Attached'}
										</Box>
									</Box>
									<button
										type="button"
										onClick={() => setFormData((prev) => ({ ...prev, receiptUrl: '', receiptName: '' }))}
										className="p-1 text-[var(--text-secondary)] hover:text-red-400 rounded transition-colors"
										title="Remove attached receipt"
									>
										<X className="w-4 h-4" />
									</button>
								</Box>
							) : (
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={uploadingReceipt}
									icon={uploadingReceipt ? <CircularProgress size={14} color="inherit" /> : <Paperclip className="w-4 h-4" />}
									onClick={() => fileInputRef.current?.click()}
								>
									{uploadingReceipt ? 'Uploading Receipt...' : 'Attach Receipt (PDF or Image)'}
								</Button>
							)}
						</Box>

						<Box sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
							Payment mode: Due (invoice first)
						</Box>

						<TextField
							size="small"
							label="Notes"
							value={formData.notes}
							onChange={(e) => handleChange('notes', e.target.value)}
							multiline
							rows={2}
							placeholder="Additional vendor or handling details..."
						/>
					</>
				)}
			</Box>
		</Modal>
	);
}
