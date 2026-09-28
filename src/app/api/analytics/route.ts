import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getLastMonths = (count: number) => {
	const months: Array<{ key: string; label: string; year: number; month: number }> = [];
	const now = new Date();
	for (let index = count - 1; index >= 0; index -= 1) {
		const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
		const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
		const label = `${MONTH_LABELS[date.getMonth()]} ${String(date.getFullYear()).slice(-2)}`;
		months.push({ key, label, year: date.getFullYear(), month: date.getMonth() });
	}
	return months;
};

const formatCurrency = (value: number) => {
	return Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
};

export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		if (!hasPermission(session.user?.role, 'analytics:view')) {
			return NextResponse.json({ message: 'Forbidden: admin access required' }, { status: 403 });
		}

		const [shipments, invoices, containers, dispatches, dispatchExpenses, adminCount] = await Promise.all([
			prisma.shipment.findMany({
				select: {
					id: true,
					status: true,
					createdAt: true,
					userId: true,
					price: true,
					paymentStatus: true,
				},
			}),
			prisma.containerInvoice.findMany({
				select: {
					id: true,
					invoiceNumber: true,
					status: true,
					amount: true,
					date: true,
					createdAt: true,
					container: {
						select: {
							shipments: {
								select: {
									userId: true,
								},
							},
						},
					},
				},
			}),
			prisma.container.findMany({
				select: {
					id: true,
					status: true,
					createdAt: true,
				},
			}),
			prisma.dispatch.findMany({
				select: {
					id: true,
					status: true,
					createdAt: true,
					dispatchDate: true,
				},
			}),
			prisma.dispatchExpense.findMany({
				select: {
					id: true,
					amount: true,
					createdAt: true,
					date: true,
				},
			}),
			prisma.user.count({ where: { role: 'admin' } }),
		]);

		const months = getLastMonths(6);
		const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

		const totalShipments = shipments.length;

		// ⚡ Bolt: Replace multiple array operations (.filter, .reduce, .map, .forEach)
		// with single-pass loops to improve performance by reducing O(N) traversals
		// and avoiding intermediate array memory allocations.
		let activeShipments = 0;
		const shipmentsByStatusMap = new Map<string, number>();
		const shipmentCountsByMonthMap = new Map<string, number>();
		const topCustomerMap = new Map<
			string,
			{ shipmentCount: number; revenue: number; lastShipmentDate: Date | null }
		>();

		for (const shipment of shipments) {
			if (['DISPATCHING', 'IN_TRANSIT', 'IN_TRANSIT_TO_DESTINATION'].includes(shipment.status)) {
				activeShipments++;
			}

			const statusCount = shipmentsByStatusMap.get(shipment.status) ?? 0;
			shipmentsByStatusMap.set(shipment.status, statusCount + 1);

			const key = monthKey(shipment.createdAt);
			shipmentCountsByMonthMap.set(key, (shipmentCountsByMonthMap.get(key) || 0) + 1);

			const entry = topCustomerMap.get(shipment.userId) ?? {
				shipmentCount: 0,
				revenue: 0,
				lastShipmentDate: null,
			};
			entry.shipmentCount += 1;
			entry.lastShipmentDate = entry.lastShipmentDate && entry.lastShipmentDate > shipment.createdAt ? entry.lastShipmentDate : shipment.createdAt;
			topCustomerMap.set(shipment.userId, entry);
		}

		let activeDispatches = 0;
		const dispatchStatusMap = new Map<string, number>();

		for (const dispatch of dispatches) {
			if (['PENDING', 'DISPATCHED', 'ARRIVED_AT_PORT'].includes(dispatch.status)) {
				activeDispatches++;
			}

			const current = dispatchStatusMap.get(dispatch.status) ?? 0;
			dispatchStatusMap.set(dispatch.status, current + 1);
		}

		let totalDispatchSpend = 0;
		const dispatchSpendByMonthMap = new Map<string, number>();

		for (const expense of dispatchExpenses) {
			totalDispatchSpend += expense.amount;
			const key = monthKey(expense.date ?? expense.createdAt);
			dispatchSpendByMonthMap.set(key, (dispatchSpendByMonthMap.get(key) || 0) + expense.amount);
		}

		let totalRevenue = 0;
		const revenueByMonthMap = new Map<string, number>();
		const invoiceStatusMap = new Map<string, { count: number; totalUSD: number }>();
		const overdueInvoices = [];

		for (const invoice of invoices) {
			if (invoice.status === 'PAID') {
				totalRevenue += invoice.amount;
				const key = monthKey(invoice.createdAt);
				revenueByMonthMap.set(key, (revenueByMonthMap.get(key) || 0) + invoice.amount);
			}

			const current = invoiceStatusMap.get(invoice.status) ?? { count: 0, totalUSD: 0 };
			current.count += 1;
			current.totalUSD += invoice.amount;
			invoiceStatusMap.set(invoice.status, current);

			if (invoice.status === 'OVERDUE' && overdueInvoices.length < 8) {
				overdueInvoices.push({
					id: invoice.id,
					invoiceNumber: invoice.invoiceNumber,
					status: invoice.status,
					totalUSD: formatCurrency(invoice.amount),
					dueDate: invoice.date ? new Date(invoice.date).toISOString() : null,
				});
			}

			const userId = invoice.container?.shipments?.[0]?.userId;
			if (userId) {
				const entry = topCustomerMap.get(userId) ?? {
					shipmentCount: 0,
					revenue: 0,
					lastShipmentDate: null,
				};
				entry.revenue += invoice.status === "PAID" ? invoice.amount : 0;
				topCustomerMap.set(userId, entry);
			}
		}

		let containersActive = 0;
		for (const container of containers) {
			const status = container.status?.toUpperCase();
			if (status !== 'CREATED' && status !== 'COMPLETED' && status !== 'CLOSED') {
				containersActive++;
			}
		}

		const shipmentsByStatus = Array.from(shipmentsByStatusMap.entries())
			.map(([status, count]) => ({ status, count }))
			.sort((a, b) => b.count - a.count);

		const shipmentsByMonth = months.map((month) => ({
			month: month.label,
			count: shipmentCountsByMonthMap.get(month.key) || 0,
		}));

		const dispatchesByStatus = Array.from(dispatchStatusMap.entries())
			.map(([status, count]) => ({ status, count }))
			.sort((a, b) => b.count - a.count);

		const revenueByMonth = months.map((month) => ({
			month: month.label,
			totalUSD: formatCurrency(revenueByMonthMap.get(month.key) || 0),
		}));

		const dispatchSpendByMonth = months.map((month) => ({
			month: month.label,
			totalUSD: formatCurrency(dispatchSpendByMonthMap.get(month.key) || 0),
		}));

		const invoiceStatusDistribution = Array.from(invoiceStatusMap.entries()).map(([status, value]) => ({
			status,
			count: value.count,
			totalUSD: formatCurrency(value.totalUSD),
		}));

		const topCustomerIds = Array.from(topCustomerMap.keys()).slice(0, 10);
		const topCustomerDetails = await prisma.user.findMany({
			where: { id: { in: topCustomerIds } },
			select: {
				id: true,
				name: true,
				email: true,
			},
		});

		const topCustomers = topCustomerDetails
			.map((user: { id: string; name: string | null; email: string | null }) => {
				const entry = topCustomerMap.get(user.id);
				return {
					userId: user.id,
					name: user.name ?? 'Unnamed User',
					email: user.email,
					shipmentCount: entry?.shipmentCount ?? 0,
					revenue: formatCurrency(entry?.revenue ?? 0),
					lastShipmentAt: entry?.lastShipmentDate ? new Date(entry.lastShipmentDate).toISOString() : null,
				};
			})
			.sort((a: { revenue: number; shipmentCount: number }, b: { revenue: number; shipmentCount: number }) => b.revenue - a.revenue || b.shipmentCount - a.shipmentCount)
			.slice(0, 5);

		const response = {
			summary: {
				totalShipments,
				activeShipments,
				activeDispatches,
				adminUsers: adminCount,
				totalRevenue: formatCurrency(totalRevenue),
				totalDispatchSpend: formatCurrency(totalDispatchSpend),
				overdueInvoices: overdueInvoices.length,
				activeContainers: containersActive,
			},
			shipmentsByStatus,
			dispatchesByStatus,
			shipmentsByMonth,
			revenueByMonth,
			dispatchSpendByMonth,
			invoiceStatusDistribution,
			outstandingInvoices: overdueInvoices,
			topCustomers,
			lastUpdated: new Date().toISOString(),
		};

		return NextResponse.json(response, { status: 200 });
	} catch (error) {
		console.error('Error fetching analytics:', error);
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
	}
}

