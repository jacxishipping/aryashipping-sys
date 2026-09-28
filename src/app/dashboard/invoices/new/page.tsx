'use client';
import { Box } from '@mui/material';

import { useSession } from 'next-auth/react';
import { hasPermission } from '@/lib/rbac';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button, Breadcrumbs, PageHeader, toast, LoadingState } from '@/components/design-system';
import { DashboardSurface, DashboardPanel } from '@/components/dashboard/DashboardSurface';

type ContainerItem = {
	id: string;
	vin: string;
	lotNumber: string;
	auctionCity: string;
	freightCost?: number | null;
	towingCost?: number | null;
	clearanceCost?: number | null;
	vatCost?: number | null;
	customsCost?: number | null;
	otherCost?: number | null;
};

type ContainerDetail = {
	id: string;
	containerNumber: string;
	items: ContainerItem[];
};

type ContainerResponse = {
	container?: ContainerDetail;
};

export default function NewInvoicePage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const searchParams = useSearchParams();
	const containerId = searchParams.get('containerId');
	const [container, setContainer] = useState<ContainerDetail | null>(null);
	const [selectedItems, setSelectedItems] = useState<string[]>([]);
	const [exchangeRate, setExchangeRate] = useState(3.67);
	const [dueDate, setDueDate] = useState('');
	const [loading, setLoading] = useState(true);
	const [isCreating, setIsCreating] = useState(false);

	const isAdmin = hasPermission(session?.user?.role, 'invoices:manage');

	const fetchContainer = useCallback(async () => {
		if (!containerId) return;

		try {
			setLoading(true);
			const response = await fetch(`/api/containers/${containerId}`);
			if (!response.ok) {
				setContainer(null);
				return;
			}
			const data = (await response.json()) as ContainerResponse;
			const containerData = data.container ?? null;
			setContainer(containerData);
			if (containerData?.items?.length) {
				setSelectedItems(containerData.items.map((item) => item.id));
			}
		} catch (error) {
			console.error('Error fetching container:', error);
			setContainer(null);
		} finally {
			setLoading(false);
		}
	}, [containerId]);

	useEffect(() => {
		if (!containerId) {
			router.push('/dashboard/containers');
			return;
		}
	}, [containerId, router]);

	useEffect(() => {
		if (status === 'loading') return;
		if (!session || !isAdmin) {
			router.replace('/dashboard');
			return;
		}
		void fetchContainer();
	}, [fetchContainer, isAdmin, router, session, status]);

	const availableItems = useMemo(() => container?.items ?? [], [container]);

	const handleCreateInvoice = async () => {
		if (!containerId) {
			toast.warning("Missing information");
			return;
		}

		if (selectedItems.length === 0) {
			toast.warning("No items selected");
			return;
		}

		setIsCreating(true);
		try {
			const response = await fetch('/api/invoices', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					containerId,
					itemIds: selectedItems,
					exchangeRate: parseFloat(exchangeRate.toString()),
					dueDate: dueDate || null,
				}),
			});

			const result = await response.json();

			if (response.ok) {
				router.push(`/dashboard/invoices/${result.invoice.id}`);
			} else {
				toast.error('Failed to create invoice', result.message || 'Please try again');
			}
		} catch (error) {
			console.error('Error creating invoice:', error);
			toast.error("Failed to create invoice");
		} finally {
			setIsCreating(false);
		}
	};

	if (loading) {
		return (
			<DashboardSurface>
				<LoadingState message="Loading container details..." />
			</DashboardSurface>
		);
	}

	if (!container) {
		return (
			<DashboardSurface>
				<Box sx={{ px: 2, pt: 1 }}>
					<Breadcrumbs />
				</Box>
				<DashboardPanel>
					<div className="py-12 text-center">
						<p className="text-base text-[var(--text-secondary)] mb-4">Container not found or invalid container ID.</p>
						<Link href="/dashboard/containers">
							<Button variant="outline">Back to Containers</Button>
						</Link>
					</div>
				</DashboardPanel>
			</DashboardSurface>
		);
	}

	return (
		<DashboardSurface>
			<PageHeader
				showBreadcrumbs
				title="Create Invoice"
				description={`Generate invoice for container ${container.containerNumber}`}
				actions={
					<Link href={`/dashboard/containers/${containerId ?? ''}`}>
						<Button variant="outline" size="sm" className="border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
							<ArrowLeft className="w-4 h-4 mr-2" />
							Back to Container
						</Button>
					</Link>
				}
			/>

			<div className="max-w-4xl space-y-6">
				{/* Exchange Rate & Due Date */}
				<DashboardPanel title="Invoice Details" description="Configure exchange rate and payment due date">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label htmlFor="exchangeRate" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
								Exchange Rate (USD to AED)
							</label>
							<input
								type="number"
								step="0.0001"
								id="exchangeRate"
								value={exchangeRate}
								onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
								className="w-full px-4 py-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)]"
							/>
						</div>
						<div>
							<label htmlFor="dueDate" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
								Due Date
							</label>
							<input
								type="date"
								id="dueDate"
								value={dueDate}
								onChange={(e) => setDueDate(e.target.value)}
								className="w-full px-4 py-2.5 bg-[var(--panel)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[rgba(var(--accent-gold-rgb),0.25)] focus:border-[var(--accent-gold)]"
							/>
						</div>
					</div>
				</DashboardPanel>

				{/* Items Selection */}
				<DashboardPanel
					title="Select Items"
					description={`${selectedItems.length} of ${availableItems.length} items selected`}
					actions={
						availableItems.length > 0 && (
							<div className="flex gap-2">
								<button
									type="button"
									onClick={() => setSelectedItems(availableItems.map((item) => item.id))}
									className="text-xs text-[var(--accent-gold)] hover:underline font-medium"
								>
									Select All
								</button>
								<span className="text-xs text-[var(--text-secondary)]">|</span>
								<button
									type="button"
									onClick={() => setSelectedItems([])}
									className="text-xs text-[var(--text-secondary)] hover:underline font-medium"
								>
									Deselect All
								</button>
							</div>
						)
					}
				>
					{availableItems.length === 0 ? (
						<p className="text-center text-[var(--text-secondary)] py-8">No items available in this container</p>
					) : (
						<div className="space-y-3">
							{availableItems.map((item) => {
								const totalCost =
									(item.freightCost || 0) +
									(item.towingCost || 0) +
									(item.clearanceCost || 0) +
									(item.vatCost || 0) +
									(item.customsCost || 0) +
									(item.otherCost || 0);
								const isSelected = selectedItems.includes(item.id);
								return (
									<label
										key={item.id}
										className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${
											isSelected
												? 'bg-[rgba(var(--accent-gold-rgb),0.06)] border-[var(--accent-gold)] shadow-sm'
												: 'bg-[var(--panel)] border-[var(--border)] hover:border-[rgba(var(--accent-gold-rgb),0.5)]'
										}`}
									>
										<input
											type="checkbox"
											checked={isSelected}
											onChange={(e) => {
												if (e.target.checked) {
													setSelectedItems((prev) => [...prev, item.id]);
												} else {
													setSelectedItems((prev) => prev.filter((id) => id !== item.id));
												}
											}}
											className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent-gold)] focus:ring-[rgba(var(--accent-gold-rgb),0.3)]"
										/>
										<div className="flex-1 min-w-0">
											<div className="flex items-center gap-4 flex-wrap">
												<span className="text-sm font-semibold text-[var(--text-primary)]">VIN: {item.vin}</span>
												<span className="text-xs text-[var(--text-secondary)]">Lot: {item.lotNumber}</span>
												<span className="text-xs text-[var(--text-secondary)]">City: {item.auctionCity}</span>
											</div>
										</div>
										<span className="text-sm font-bold text-[var(--accent-gold)]">${totalCost.toFixed(2)}</span>
									</label>
								);
							})}
						</div>
					)}
				</DashboardPanel>

				{/* Summary */}
				{selectedItems.length > 0 && (
					<DashboardPanel title="Summary">
						<div className="space-y-3">
							<div className="flex justify-between text-sm">
								<span className="text-[var(--text-secondary)]">Selected Items:</span>
								<span className="font-semibold text-[var(--text-primary)]">{selectedItems.length}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-[var(--text-secondary)]">Exchange Rate:</span>
								<span className="font-semibold text-[var(--text-primary)]">{exchangeRate.toFixed(4)} AED/USD</span>
							</div>
						</div>
					</DashboardPanel>
				)}

				{/* Actions */}
				<div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
					<Link href={`/dashboard/containers/${containerId}`} className="sm:w-auto w-full">
						<Button type="button" variant="outline" disabled={isCreating} className="w-full sm:w-auto border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--accent-gold)]">
							Cancel
						</Button>
					</Link>
					<Button onClick={handleCreateInvoice} disabled={isCreating || selectedItems.length === 0} className="w-full sm:w-auto bg-[var(--accent-gold)] text-black hover:bg-[var(--accent-gold)] shadow-sm font-semibold">
						{isCreating ? 'Creating...' : 'Create Invoice'}
					</Button>
				</div>
			</div>
		</DashboardSurface>
	);
}

