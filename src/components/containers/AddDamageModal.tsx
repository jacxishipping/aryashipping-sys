'use client';

import { useState } from 'react';
import {
	TextField,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Box,
	InputAdornment,
	Typography,
} from '@mui/material';
import { DollarSign } from 'lucide-react';
import { Button, Modal, toast } from '@/components/design-system';

interface Shipment {
	id: string;
	vehicleMake: string | null;
	vehicleModel: string | null;
	vehicleVIN: string | null;
	user?: {
		id: string;
		name: string | null;
		email: string;
	};
}

interface AddDamageModalProps {
	open: boolean;
	onClose: () => void;
	containerId: string;
	shipments: Shipment[];
	onSuccess: () => void;
}

const damageTypeOptions = [
	{
		value: 'WE_PAY',
		label: 'We Pay (Compensate Customer)',
		description: 'Business compensates the customer — credits customer ledger',
	},
	{
		value: 'COMPANY_PAYS',
		label: 'Company Pays (Shipping Company Responsible)',
		description: 'Shipping company is liable — debits company ledger',
	},
];

export default function AddDamageModal({
	open,
	onClose,
	containerId,
	shipments,
	onSuccess,
}: AddDamageModalProps) {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		shipmentId: '',
		damageType: 'WE_PAY',
		amount: '',
		companyAmount: '',
		description: '',
	});

	const handleChange = (field: string, value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.shipmentId) {
			toast.error('Please select a shipment');
			return;
		}

		if (!formData.amount || parseFloat(formData.amount) <= 0) {
			toast.error('Please enter a valid amount');
			return;
		}

		if (!formData.description.trim()) {
			toast.error('Please enter a description');
			return;
		}

		if (
			formData.damageType === 'COMPANY_PAYS' &&
			formData.companyAmount &&
			parseFloat(formData.companyAmount) <= 0
		) {
			toast.error('Please enter a valid company charge amount');
			return;
		}

		setLoading(true);

		try {
			const response = await fetch(`/api/containers/${containerId}/damages`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					shipmentId: formData.shipmentId,
					damageType: formData.damageType,
					amount: parseFloat(formData.amount),
					companyAmount:
						formData.damageType === 'COMPANY_PAYS' && formData.companyAmount
							? parseFloat(formData.companyAmount)
							: undefined,
					description: formData.description.trim(),
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || 'Failed to add damage record');
			}

			toast.success('Damage record added successfully');
			handleClose();
			onSuccess();
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to add damage record');
		} finally {
			setLoading(false);
		}
	};

	const handleClose = () => {
		if (!loading) {
			setFormData({ shipmentId: '', damageType: 'WE_PAY', amount: '', companyAmount: '', description: '' });
			onClose();
		}
	};

	const selectedDamageType = damageTypeOptions.find((d) => d.value === formData.damageType);
	const formId = 'container-damage-form';

	return (
		<Modal
			open={open}
			onClose={handleClose}
			size="sm"
			title={
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
					<DollarSign style={{ width: 20, height: 20, color: 'var(--accent-gold)' }} />
					<Box component="span" sx={{ fontWeight: 700 }}>Add Damage Record</Box>
				</Box>
			}
			description="Create a damage adjustment and choose which ledger absorbs the resulting charge."
			showCloseButton={!loading}
			disableBackdropClick={loading}
			actions={
				<>
					<Button variant="outline" onClick={handleClose} disabled={loading}>
						Cancel
					</Button>
					<Button type="submit" form={formId} variant="primary" disabled={loading}>
						{loading ? 'Adding...' : 'Add Damage'}
					</Button>
				</>
			}
		>
			<Box component="form" id={formId} onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
					{/* Shipment selector */}
					<FormControl fullWidth size="small" required>
						<InputLabel sx={{ color: 'var(--text-secondary)' }}>Shipment</InputLabel>
						<Select
							value={formData.shipmentId}
							onChange={(e) => handleChange('shipmentId', e.target.value)}
							label="Shipment"
							sx={{
								color: 'var(--text-primary)',
								'& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(var(--border-rgb), 0.9)' },
							}}
						>
							<MenuItem value=""><em>Select a shipment…</em></MenuItem>
							{shipments.map((s) => (
								<MenuItem key={s.id} value={s.id}>
									{[s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || 'Unknown Vehicle'}
									{s.vehicleVIN ? ` — ${s.vehicleVIN}` : ''}
									{s.user ? ` (${s.user.name || s.user.email})` : ''}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					{/* Damage Type */}
					<FormControl fullWidth size="small" required>
						<InputLabel sx={{ color: 'var(--text-secondary)' }}>Damage Type</InputLabel>
						<Select
							value={formData.damageType}
							onChange={(e) => handleChange('damageType', e.target.value)}
							label="Damage Type"
							sx={{
								color: 'var(--text-primary)',
								'& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(var(--border-rgb), 0.9)' },
							}}
						>
							{damageTypeOptions.map((opt) => (
								<MenuItem key={opt.value} value={opt.value}>
									{opt.label}
								</MenuItem>
							))}
						</Select>
					</FormControl>

					{/* Damage type explanation */}
					{selectedDamageType && (
						<Box
							sx={{
								p: 1.5,
								borderRadius: 1,
								bgcolor: 'rgba(var(--accent-gold-rgb), 0.08)',
								border: '1px solid rgba(var(--accent-gold-rgb), 0.2)',
							}}
						>
							<Typography sx={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
								{selectedDamageType.description}
							</Typography>
						</Box>
					)}

					{/* Amount */}
					<TextField
						size="small"
						label={formData.damageType === 'COMPANY_PAYS' ? 'Customer Credit Amount (USD)' : 'Amount (USD)'}
						type="number"
						value={formData.amount}
						onChange={(e) => handleChange('amount', e.target.value)}
						required
						inputProps={{ min: 0, step: 0.01 }}
						InputProps={{
							startAdornment: <InputAdornment position="start">$</InputAdornment>,
						}}
						sx={{
							'& .MuiOutlinedInput-root': {
								color: 'var(--text-primary)',
								'& fieldset': { borderColor: 'rgba(var(--border-rgb), 0.9)' },
							},
							'& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
						}}
					/>

					{formData.damageType === 'COMPANY_PAYS' && (
						<TextField
							size="small"
							label="Company Charge Amount (USD)"
							type="number"
							value={formData.companyAmount}
							onChange={(e) => handleChange('companyAmount', e.target.value)}
							inputProps={{ min: 0, step: 0.01 }}
							helperText="Optional. Leave empty to use the same value as customer credit amount."
							InputProps={{
								startAdornment: <InputAdornment position="start">$</InputAdornment>,
							}}
							sx={{
								'& .MuiOutlinedInput-root': {
									color: 'var(--text-primary)',
									'& fieldset': { borderColor: 'rgba(var(--border-rgb), 0.9)' },
								},
								'& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
							}}
						/>
					)}

					{/* Description */}
					<TextField
						size="small"
						label="Description"
						value={formData.description}
						onChange={(e) => handleChange('description', e.target.value)}
						required
						multiline
						rows={3}
						placeholder="Describe the damage..."
						sx={{
							'& .MuiOutlinedInput-root': {
								color: 'var(--text-primary)',
								'& fieldset': { borderColor: 'rgba(var(--border-rgb), 0.9)' },
							},
							'& .MuiInputLabel-root': { color: 'var(--text-secondary)' },
						}}
					/>
			</Box>
		</Modal>
	);
}
