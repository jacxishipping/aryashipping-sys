'use client';

import { useRef, useState } from 'react';
import { AlertTriangle, FileText, Upload } from 'lucide-react';
import { Button, FormField, Modal, Select, StatusBadge, toast } from '@/components/design-system';

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
							name: `Invoice ${formData.invoiceNumber} Source - ${invoiceSource.fileName}`,
							type: 'INVOICE',
							fileUrl: invoiceSource.fileUrl,
							fileType: invoiceSource.fileType,
							fileSize: invoiceSource.fileSize,
						}),
					}).catch((err) => console.error('Failed to attach invoice source document', err));
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

		setExtracting(true);

		try {
			const body = new FormData();
			body.append('file', file);

			const uploadResponse = await fetch('/api/upload', {
				method: 'POST',
				body,
			});

			const uploadData = await uploadResponse.json();
			if (!uploadResponse.ok) {
				throw new Error(uploadData.error || 'Failed to upload invoice source file');
			}

			const extractResponse = await fetch('/api/ai/extract-document', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					fileUrl: uploadData.url,
					fileType: file.type || 'application/octet-stream',
					expectedType: 'INVOICE',
					fileName: file.name,
				}),
			});

			const extractData = await extractResponse.json();
			if (!extractResponse.ok) {
				throw new Error(extractData.error || 'Failed to extract invoice fields from file');
			}

			const extracted = extractData.extractedData || {};

			setFormData((prev) => ({
				...prev,
				invoiceNumber: extracted.invoiceNumber || prev.invoiceNumber,
				amount: typeof extracted.amount === 'number' ? String(extracted.amount) : prev.amount,
				currency: extracted.currency || prev.currency,
				vendor: extracted.vendor || extracted.billedTo || prev.vendor,
				date: extracted.date ? String(extracted.date).slice(0, 10) : prev.date,
				dueDate: extracted.dueDate ? String(extracted.dueDate).slice(0, 10) : prev.dueDate,
				notes: [
					prev.notes,
					extracted.summary ? `Summary: ${extracted.summary}` : '',
					extracted.confidenceNotes ? `Extraction notes: ${extracted.confidenceNotes}` : '',
				]
					.filter(Boolean)
					.join('\n\n'),
			}));

			setInvoiceSource({
				fileUrl: uploadData.url,
				fileType: file.type || 'application/octet-stream',
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
				<div className="flex items-center gap-2">
					<FileText className="w-5 h-5 text-[var(--accent-gold)]" />
					<span className="font-bold">Create Invoice</span>
				</div>
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
			<form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
				<div className="border border-dashed border-[var(--border)] rounded-xl p-3.5 bg-[var(--background)]">
					<div className="flex items-center justify-between gap-3 flex-wrap">
						<div>
							<h4 className="font-semibold text-sm text-[var(--text-primary)]">Import From Invoice File</h4>
							<p className="text-xs text-[var(--text-secondary)] mt-0.5">
								Upload a PDF, image, DOCX, XLSX, CSV, or text invoice source to prefill the form before saving.
							</p>
						</div>
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
					</div>

					{invoiceSource && (
						<div className="mt-3 flex flex-col gap-2">
							<div className="flex gap-1.5 flex-wrap">
								{invoiceSource.extractionMethod && (
									<StatusBadge status="DEFAULT" label={`Extraction: ${invoiceSource.extractionMethod}`} size="sm" />
								)}
								{invoiceSource.ocrAttempted && (
									<StatusBadge status="WARNING" label="OCR attempted" size="sm" />
								)}
							</div>
							<p className="text-xs text-[var(--text-secondary)]">
								{invoiceSource.confidenceNotes}
							</p>
							<p className="text-xs text-[var(--text-secondary)] line-clamp-2">
								{invoiceSource.extractedTextPreview}
							</p>
							{invoiceSource.failureReason && (
								<div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
									<AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
									<p className="text-xs text-amber-700">
										{invoiceSource.failureReason}
									</p>
								</div>
							)}
						</div>
					)}
				</div>

				<FormField
					size="small"
					label="Invoice Number"
					value={formData.invoiceNumber}
					onChange={(e) => handleChange('invoiceNumber', e.target.value)}
					required
					placeholder="e.g., INV-2025-001"
					helperText="Unique invoice identifier"
				/>

				<div className="grid grid-cols-3 gap-3">
					<div className="col-span-2">
						<FormField
							size="small"
							label="Amount"
							type="number"
							value={formData.amount}
							onChange={(e) => handleChange('amount', e.target.value)}
							required
							inputProps={{ min: 0, step: 0.01 }}
							leftIcon={<span className="text-[var(--text-secondary)]">$</span>}
						/>
					</div>
					<FormField
						size="small"
						label="Currency"
						value={formData.currency}
						onChange={(e) => handleChange('currency', e.target.value)}
						disabled
					/>
				</div>

				<Select
					label="Status"
					value={formData.status}
					onChange={(value) => handleChange('status', String(value))}
					size="small"
					required
					options={invoiceStatuses}
				/>

				<FormField
					size="small"
					label="Customer/Vendor"
					value={formData.vendor}
					onChange={(e) => handleChange('vendor', e.target.value)}
					placeholder="Who will pay this invoice"
				/>

				<div className="grid grid-cols-2 gap-3">
					<FormField
						size="small"
						label="Invoice Date"
						type="date"
						value={formData.date}
						onChange={(e) => handleChange('date', e.target.value)}
						required
					/>
					<FormField
						size="small"
						label="Due Date"
						type="date"
						value={formData.dueDate}
						onChange={(e) => handleChange('dueDate', e.target.value)}
						helperText="Optional"
					/>
				</div>

				<FormField
					size="small"
					label="Notes"
					value={formData.notes}
					onChange={(e) => handleChange('notes', e.target.value)}
					multiline
					rows={3}
					placeholder="Additional details..."
				/>
			</form>
		</Modal>
	);
}
