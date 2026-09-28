import { NextRequest, NextResponse } from 'next/server';
import { autoInvoice } from '@/lib/services/auto-invoice';
import { validateCronRequest } from '@/lib/cron-auth';
import { logger } from '@/lib/logger';

/**
 * Cron job endpoint for auto-generating invoices
 * 
 * Setup with Vercel Cron Jobs:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/auto-generate-invoices",
 *     "schedule": "0 0 * * *"  // Once daily at midnight
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
	try {
		// Verify cron secret for security
		if (!validateCronRequest(request)) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		logger.info('[CRON] Starting auto-invoice generation...');

		// Generate invoices for all completed containers
		const result = await autoInvoice.generateInvoicesForCompletedContainers();

		logger.info('[CRON] Auto-invoice generation completed:', result);

		return NextResponse.json({
			success: true,
			message: 'Auto-invoice generation completed',
			stats: result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('[CRON] Error in auto-invoice generation:', error);
		return NextResponse.json(
			{
				success: false,
				error: 'Internal server error',
				timestamp: new Date().toISOString(),
			},
			{ status: 500 }
		);
	}
}

// Manual trigger
export async function POST(request: NextRequest) {
	try {
		// Verify cron secret for security
		if (!validateCronRequest(request)) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const { containerId } = body;

		if (containerId) {
			// Generate invoice for specific container
			const result = await autoInvoice.generateInvoiceForContainer(containerId);
			return NextResponse.json({
				success: result.success,
				message: result.message,
				invoice: result.invoiceId ? { id: result.invoiceId, amount: result.amount } : null,
			});
		} else {
			// Generate for all completed containers
			const result = await autoInvoice.generateInvoicesForCompletedContainers();
			return NextResponse.json({
				success: true,
				message: 'Batch invoice generation completed',
				stats: result,
			});
		}
	} catch (error) {
		logger.error('Error in manual invoice generation:', error);
		return NextResponse.json(
			{ success: false, error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
