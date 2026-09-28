import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasAnyPermission } from '@/lib/rbac';

export async function GET(
	request: NextRequest,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!hasAnyPermission(session.user.role, ['invoices:view', 'invoices:manage', 'finance:view', 'finance:manage'])) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const invoices = await prisma.containerInvoice.findMany({
			where: { containerId: params.id },
			orderBy: { date: 'desc' },
		});

		return NextResponse.json(invoices);
	} catch (error) {
		console.error('Error fetching container invoices:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch invoices' },
			{ status: 500 }
		);
	}
}

export async function POST(
	request: NextRequest,
	props: { params: Promise<{ id: string }> }
) {
	const params = await props.params;
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!hasAnyPermission(session.user.role, ['invoices:manage', 'finance:manage'])) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const body = await request.json();
		const {
			invoiceNumber,
			amount,
			currency,
			vendor,
			date,
			dueDate,
			status,
			notes,
		} = body;

		// Validation
		if (!invoiceNumber || !amount || !date) {
			return NextResponse.json(
				{ error: 'Invoice number, amount, and date are required' },
				{ status: 400 }
			);
		}

		// Check if container exists
		const container = await prisma.container.findUnique({
			where: { id: params.id },
		});

		if (!container) {
			return NextResponse.json(
				{ error: 'Container not found' },
				{ status: 404 }
			);
		}

		// Create invoice
		const invoice = await prisma.containerInvoice.create({
			data: {
				containerId: params.id,
				invoiceNumber,
				amount: parseFloat(amount),
				currency: currency || 'USD',
				vendor,
				date: new Date(date),
				dueDate: dueDate ? new Date(dueDate) : undefined,
				status: status || 'DRAFT',
				notes,
			},
		});

		return NextResponse.json(invoice, { status: 201 });
	} catch (error) {
		console.error('Error creating container invoice:', error);
		return NextResponse.json(
			{ error: 'Failed to create invoice' },
			{ status: 500 }
		);
	}
}

export async function DELETE(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		if (!hasAnyPermission(session.user.role, ['invoices:manage', 'finance:manage'])) {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { searchParams } = new URL(request.url);
		const invoiceId = searchParams.get('invoiceId');

		if (!invoiceId) {
			return NextResponse.json(
				{ error: 'Invoice ID is required' },
				{ status: 400 }
			);
		}

		await prisma.containerInvoice.delete({
			where: { id: invoiceId },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting container invoice:', error);
		return NextResponse.json(
			{ error: 'Failed to delete invoice' },
			{ status: 500 }
		);
	}
}
