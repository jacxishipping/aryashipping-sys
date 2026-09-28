import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';

export async function GET() {
	try {
		const session = await auth();

		if (!session) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		const canReadAllData = hasPermission(session.user?.role, 'shipments:read_all');

		if (!canReadAllData && !session.user?.id) {
			return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
		}

		const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

		const shipmentScope = canReadAllData ? {} : { userId: session.user.id };
		const invoiceScope = canReadAllData ? {} : { userId: session.user.id };

		const [agingShipments, overdueInvoices] = await Promise.all([
			prisma.shipment.count({
				where: {
					...shipmentScope,
					status: {
						in: ['ON_HAND', 'DISPATCHING'],
					},
					containerId: null,
					transitId: null,
					createdAt: {
						lt: sevenDaysAgo,
					},
				},
			}),
			prisma.userInvoice.count({
				where: {
					...invoiceScope,
					status: {
						in: ['PENDING', 'OVERDUE'],
					},
				},
			}),
		]);

		return NextResponse.json({ agingShipments, overdueInvoices });
	} catch (error) {
		console.error('Error fetching navigation badges:', error);
		return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
	}
}