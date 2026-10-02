'use client';

import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { ArrowLeft, Package, DollarSign } from 'lucide-react';
import { Button, PageHeader } from '@/components/design-system';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';

type ItemFormData = {
	vin: string;
	lotNumber: string;
	auctionCity: string;
	freightCost: string;
	towingCost: string;
	clearanceCost: string;
	vatCost: string;
	customsCost: string;
	otherCost: string;
};

export default function NewItemPage() {
	const { data: session, status } = useSession();
	const params = useParams();
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState('');

	const {
		register,
		handleSubmit,
		formState: { errors },
		watch,
	} = useForm<ItemFormData>({
		defaultValues: {
			vin: '',
			lotNumber: '',
			auctionCity: '',
			freightCost: '0',
			towingCost: '0',
			clearanceCost: '0',
			vatCost: '0',
			customsCost: '0',
			otherCost: '0',
		},
	});

	const watchedValues = watch();
	
	const totalCost = useMemo(() => {
		const toNumber = (value: string | undefined) => {
			const parsed = Number.parseFloat(value ?? '0');
			return Number.isFinite(parsed) ? parsed : 0;
		};

		return (
			toNumber(watchedValues.freightCost) +
			toNumber(watchedValues.towingCost) +
			toNumber(watchedValues.clearanceCost) +
			toNumber(watchedValues.vatCost) +
			toNumber(watchedValues.customsCost) +
			toNumber(watchedValues.otherCost)
		);
	}, [watchedValues]);

	useEffect(() => {
		if (status === 'loading') return;
		const role = session?.user?.role;
		if (!session || role !== 'admin') {
			router.replace('/dashboard');
		}
	}, [session, status, router]);

	const containerIdRaw = params?.id;
	const containerId = Array.isArray(containerIdRaw) ? containerIdRaw[0] : containerIdRaw;

	const onSubmit = async (data: ItemFormData) => {
		setIsSubmitting(true);
		setError('');

		const payload = {
			...data,
			containerId: containerId, // Always use the current container ID from the URL
			freightCost: Number.parseFloat(data.freightCost) || 0,
			towingCost: Number.parseFloat(data.towingCost) || 0,
			clearanceCost: Number.parseFloat(data.clearanceCost) || 0,
			vatCost: Number.parseFloat(data.vatCost) || 0,
			customsCost: Number.parseFloat(data.customsCost) || 0,
			otherCost: Number.parseFloat(data.otherCost) || 0,
		};

		try {
			const response = await fetch('/api/items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (response.ok) {
				router.push(`/dashboard/containers/${containerId}`);
				return;
			}

			const result = (await response.json()) as { message?: string };
			setError(result.message ?? 'Failed to create item');
		} catch (err) {
			console.error('Error creating item:', err);
			setError('An error occurred while creating the item');
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!session || session.user?.role !== 'admin') {
		return null;
	}

	return (
		<DashboardSurface>
			<PageHeader
				showBreadcrumbs
				title="Add Item"
				description="Add a new vehicle or item to container"
				actions={
					<Button href={`/dashboard/containers/${containerId ?? ''}`} variant="outline" size="sm" className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
						<ArrowLeft className="w-4 h-4 mr-2" />
						Back to Container
					</Button>
				}
			/>

			<div className="max-w-4xl space-y-6">
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
					{/* Basic Info */}
					<DashboardPanel
						title={
							<div className="flex items-center gap-2">
								<Package className="w-5 h-5 text-[var(--accent-gold)]" />
								<span>Item Information</span>
							</div>
						}
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="vin" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
									VIN <span className="text-[var(--error)]">*</span>
								</label>
								<input
									type="text"
									id="vin"
									{...register('vin', { required: 'VIN is required' })}
									className={`w-full px-4 py-2.5 bg-[var(--panel)] border rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] ${
										errors.vin ? 'border-[var(--error)]' : 'border-[var(--border)]'
									}`}
								/>
								{errors.vin && <p className="mt-1 text-xs text-[var(--error)]">{errors.vin.message as string}</p>}
							</div>

							<div>
								<label htmlFor="lotNumber" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
									Lot Number <span className="text-[var(--error)]">*</span>
								</label>
								<input
									type="text"
									id="lotNumber"
									{...register('lotNumber', { required: 'Lot number is required' })}
									className={`w-full px-4 py-2.5 bg-[var(--panel)] border rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] ${
										errors.lotNumber ? 'border-[var(--error)]' : 'border-[var(--border)]'
									}`}
								/>
								{errors.lotNumber && <p className="mt-1 text-xs text-[var(--error)]">{errors.lotNumber.message as string}</p>}
							</div>

							<div className="md:col-span-2">
								<label htmlFor="auctionCity" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
									Auction City <span className="text-[var(--error)]">*</span>
								</label>
								<input
									type="text"
									id="auctionCity"
									{...register('auctionCity', { required: 'Auction city is required' })}
									className={`w-full px-4 py-2.5 bg-[var(--panel)] border rounded-lg text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] ${
										errors.auctionCity ? 'border-[var(--error)]' : 'border-[var(--border)]'
									}`}
								/>
								{errors.auctionCity && <p className="mt-1 text-xs text-[var(--error)]">{errors.auctionCity.message as string}</p>}
							</div>
						</div>
					</DashboardPanel>

					{/* Costs */}
					<DashboardPanel
						title={
							<div className="flex items-center gap-2">
								<DollarSign className="w-5 h-5 text-[var(--accent-gold)]" />
								<span>Costs (USD)</span>
							</div>
						}
					>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label htmlFor="freightCost" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Freight Cost</label>
								<input type="number" step="0.01" id="freightCost" {...register('freightCost')} defaultValue={0} className="w-full px-4 py-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
							</div>
							<div>
								<label htmlFor="towingCost" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Towing Cost</label>
								<input type="number" step="0.01" id="towingCost" {...register('towingCost')} defaultValue={0} className="w-full px-4 py-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
							</div>
							<div>
								<label htmlFor="clearanceCost" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Clearance Cost</label>
								<input type="number" step="0.01" id="clearanceCost" {...register('clearanceCost')} defaultValue={0} className="w-full px-4 py-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
							</div>
							<div>
								<label htmlFor="vatCost" className="block text-sm font-medium text-[var(--text-primary)] mb-2">VAT Cost</label>
								<input type="number" step="0.01" id="vatCost" {...register('vatCost')} defaultValue={0} className="w-full px-4 py-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
							</div>
							<div>
								<label htmlFor="customsCost" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Customs Cost</label>
								<input type="number" step="0.01" id="customsCost" {...register('customsCost')} defaultValue={0} className="w-full px-4 py-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
							</div>
							<div>
								<label htmlFor="otherCost" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Other Cost</label>
								<input type="number" step="0.01" id="otherCost" {...register('otherCost')} defaultValue={0} className="w-full px-4 py-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)]" />
							</div>
						</div>

						<div className="mt-6 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-[var(--text-secondary)]">Total Cost:</span>
								<span className="text-xl font-bold text-[var(--accent-gold)]">${totalCost.toFixed(2)}</span>
							</div>
						</div>
					</DashboardPanel>

					{error && (
						<div className="rounded-xl bg-[rgba(var(--error-rgb),0.08)] border border-[rgba(var(--error-rgb),0.3)] p-4">
							<p className="text-sm text-[var(--error)]">{error}</p>
						</div>
					)}

					<div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
						<Button href={`/dashboard/containers/${containerId ?? ''}`} variant="outline" disabled={isSubmitting} className="w-full sm:w-auto border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto bg-[var(--accent-gold)] text-black hover:bg-[var(--accent-gold)] font-semibold shadow-sm">
							{isSubmitting ? 'Creating...' : 'Create Item'}
						</Button>
					</div>
				</form>
			</div>
		</DashboardSurface>
	);
}

