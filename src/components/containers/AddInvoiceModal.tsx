'use client';

import { useRef, useState } from 'react';
import {
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Box,
	InputAdornment,
	Typography,
	Chip,
} from '@mui/material';
import { AlertTriangle, FileText, Upload } from 'lucide-react';
import { Button, Modal, toast } from '@/components/design-system';

interface AddInvoiceModalProps {
	open: boolean;
	onClose: () => void;
	containerId: string;
	onSuccess: () => void;
}

const invoiceStatuses = [
	{ value: 'DRAFT', label: 'Draft' },
	{ value: 'SENT', label: 'Sent' },
	{ value: 'PAID', label: 'Paid' },
	{ value: 'OVERDUE', label: 'Overdue' },
	{ value: 'CANCELLED', label: 'Cancelled' },
];

export default function AddInvoiceModal({
	open,
	onClose,
	containerId,
	onSuccess,
}: AddInvoiceModalProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [loading, setLoading] = useState(false);
	const [extracting, setExtracting] = useState(false);
	const [formData, setFormData] = useState({
		invoiceNumber: '',
		amount: '',
		currency: 'USD',
		vendor: '',
		date: new Date().toISOString().split('T')[0],
		dueDate: '',
		status: 'DRAFT',
		notes: '',
	});
	const [invoiceSource, setInvoiceSource] = useState<{
		fileUrl: string;
		fileType: string;
		fileSize: number;
		fileName: string;
		confidenceNotes: string;
		extractedTextPreview: string;
		failureReason?: string | null;
		extractionMethod?: string;
		ocrAttempted?: boolean;
		aiInteractionLogId?: string;
	} | null>(null);

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validation
		if (!formData.invoiceNumber.trim()) {
			toast.error('Please enter an invoice number');
			return;
		}

		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			toast.error('Please enter a valid amount');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch(`/api/containers/${containerId}/invoices`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					invoiceNumber: formData.invoiceNumber,
					amount: parseFloat(formData.amount),
					currency: formData.currency,
					vendor: formData.vendor || undefined,
					date: formData.date,
					dueDate: formData.dueDate || undefined,
					status: formData.status,
					notes: formData.notes || undefined,
				}),
			});

			if (response.ok) {
				if (invoiceSource) {
					await fetch(`/api/containers/${containerId}/documents`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							type: 'INVOICE',
							name: invoiceSource.fileName,
							fileUrl: invoiceSource.fileUrl,
							fileType: invoiceSource.fileType,
							fileSize: invoiceSource.fileSize,
							notes: `AI extraction source${invoiceSource.aiInteractionLogId ? ` (${invoiceSource.aiInteractionLogId})` : ''}: ${invoiceSource.confidenceNotes}`,
						}),
					}).catch((error) => {
						console.error('Failed to save invoice source document:', error);
					});
				}
				toast.success('Invoice created successfully');
				onSuccess();
				handleClose();
			} else {
				const data = await response.json();
				toast.error(data.error || 'Failed to create invoice');
			}
		} catch (error) {
			console.error('Error creating invoice:', error);
			toast.error('An error occurred');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (!loading && !extracting) {
			setFormData({
				invoiceNumber: '',
				amount: '',
				currency: 'USD',
				vendor: '',
				date: new Date().toISOString().split('T')[0],
				dueDate: '',
				status: 'DRAFT',
				notes: '',
			});
			setInvoiceSource(null);
			onClose();
		}
	};

	const handleInvoiceImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		try {
			setExtracting(true);
			const uploadForm = new FormData();
			uploadForm.append('file', file);

			const uploadResponse = await fetch('/api/upload', {
				method: 'POST',
				body: uploadForm,
			});

			const uploadPayload = await uploadResponse.json().catch(() => ({}));
			if (!uploadResponse.ok) {
				throw new Error(uploadPayload.message || 'Failed to upload invoice source');
			}

			const extractResponse = await fetch('/api/ai/document-extract', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					mode: 'invoice-draft',
					fileUrl: uploadPayload.url,
					fileName: file.name,
					fileType: file.type,
					entityType: 'CONTAINER',
					entityId: containerId,
				}),
			});

			const extracted = await extractResponse.json().catch(() => ({}));
			if (!extractResponse.ok) {
				throw new Error(extracted.error || 'Failed to extract invoice details');
			}

			setFormData((prev) => ({
				...prev,
				invoiceNumber: extracted.invoiceNumber || prev.invoiceNumber,
				amount:
					typeof extracted.amount === 'number' && !Number.isNaN(extracted.amount)
						? String(extracted.amount)
						: prev.amount,
				currency: extracted.currency || prev.currency,
				vendor: extracted.vendor || prev.vendor,
				date: extracted.date || prev.date,
				dueDate: extracted.dueDate || prev.dueDate,
				notes: extracted.notes || prev.notes,
			}));

			setInvoiceSource({
				fileUrl: uploadPayload.url,
				fileType: file.type,
				fileSize: file.size,
				fileName: file.name,
				confidenceNotes: extracted.confidenceNotes || 'Please verify the extracted invoice fields before saving.',
				extractedTextPreview: extracted.extractedTextPreview || 'No extracted text available.',
				failureReason: extracted.failureReason || null,
				extractionMethod: extracted.extractionMethod,
				ocrAttempted: Boolean(extracted.ocrAttempted),
				aiInteractionLogId: extracted.aiInteractionLogId,
			});

			toast.success(extracted.source === 'rules' ? 'Fallback invoice extraction applied' : 'Invoice fields extracted');
		} catch (error) {
			console.error('Invoice import error:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to import invoice source');
		} finally {
			setExtracting(false);
			event.target.value = '';
		}
	};

	const formId = 'container-invoice-form';

	return (
		<Modal
			open={open}
			onClose={handleClose}
			size="sm"
			title={
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<FileText style={{ fontSize: 24, color: 'var(--accent-gold)' }} />
					<span>Create Invoice</span>
				</Box>
			}
			description="Create a container invoice manually or prefill it from an uploaded source file."
			showCloseButton={!loading && !extracting}
			disableBackdropClick={loading || extracting}
			actions={
				<>
					<Button variant="outline" onClick={handleClose} disabled={loading || extracting}>
						Cancel
					</Button>
					<Button type="submit" form={formId} variant="primary" disabled={loading || extracting}>
						{loading ? 'Creating...' : 'Create Invoice'}
					</Button>
				</>
			}
		>
			<Box component="form" id={formId} onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
					<Box sx={{ border: '1px dashed var(--border)', borderRadius: 2, p: 2, bgcolor: 'var(--background)' }}>
						<Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
							<Box>
								<Typography sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>Import From Invoice File</Typography>
								<Typography sx={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
									Upload a PDF, image, DOCX, XLSX, CSV, or text invoice source to prefill the form before saving.
								</Typography>
							</Box>
							<Button
								variant="secondary"
								size="sm"
								onClick={() => fileInputRef.current?.click()}
								disabled={extracting || loading}
								icon={<Upload className="w-4 h-4" />}
							>
								{extracting ? 'Extracting...' : 'Upload Invoice Source'}
							</Button>
							<input
								ref={fileInputRef}
								type="file"
								accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.csv,.txt,.xls,.xlsx"
								onChange={handleInvoiceImport}
								hidden
							/>
						</Box>

						{invoiceSource && (
							<Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
								<Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
									{invoiceSource.extractionMethod && (
										<Chip size="small" label={`Extraction: ${invoiceSource.extractionMethod}`} />
									)}
									{invoiceSource.ocrAttempted && (
										<Chip size="small" color="warning" label="OCR attempted" />
									)}
								</Box>
								<Typography sx={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
									{invoiceSource.confidenceNotes}
								</Typography>
								<Typography sx={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
									{invoiceSource.extractedTextPreview}
								</Typography>
								{invoiceSource.failureReason && (
									<Box
										sx={{
											display: 'flex',
											alignItems: 'flex-start',
											gap: 1,
											p: 1,
											borderRadius: 1,
											bgcolor: 'rgba(245, 158, 11, 0.08)',
											border: '1px solid rgba(245, 158, 11, 0.35)',
										}}
									>
										<AlertTriangle className="w-4 h-4" style={{ color: 'rgb(180, 83, 9)', marginTop: 2 }} />
										<Typography sx={{ fontSize: '0.78rem', color: 'rgb(146, 64, 14)' }}>
											{invoiceSource.failureReason}
										</Typography>
									</Box>
								)}
							</Box>
						)}
					</Box>

					<TextField
						size="small"
						label="Invoice Number"
						value={formData.invoiceNumber}
						onChange={(e) => handleChange('invoiceNumber', e.target.value)}
						required
						placeholder="e.g., INV-2025-001"
						helperText="Unique invoice identifier"
					/>

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

					<FormControl fullWidth size="small" required>
						<InputLabel>Status</InputLabel>
						<Select
							value={formData.status}
							onChange={(e) => handleChange('status', e.target.value)}
							label="Status"
						>
							{invoiceStatuses.map((status) => (
								<MenuItem key={status.value} value={status.value}>
									{status.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					<TextField
						size="small"
						label="Customer/Vendor"
						value={formData.vendor}
						onChange={(e) => handleChange('vendor', e.target.value)}
						placeholder="Who will pay this invoice"
					/>

					<Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
						<TextField
							size="small"
							label="Invoice Date"
							type="date"
							value={formData.date}
							onChange={(e) => handleChange('date', e.target.value)}
							required
							InputLabelProps={{ shrink: true }}
						/>
						<TextField
							size="small"
							label="Due Date"
							type="date"
							value={formData.dueDate}
							onChange={(e) => handleChange('dueDate', e.target.value)}
							InputLabelProps={{ shrink: true }}
							helperText="Optional"
						/>
					</Box>

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
