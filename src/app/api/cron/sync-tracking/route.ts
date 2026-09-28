import { NextRequest, NextResponse } from 'next/server';
import { trackingSync } from '@/lib/services/tracking-sync';
import { validateCronRequest } from '@/lib/cron-auth';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';

/**
 * Cron job endpoint for syncing tracking data
 * 
 * Setup with Vercel Cron Jobs:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-tracking",
 *     "schedule": "0 * * * *"  // Every hour
 *   }]
 * }
 * 
 * Or use external cron service (cron-job.org, etc.)
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

		logger.info('[CRON] Starting tracking sync...');

		// Sync all active containers
		const result = await trackingSync.syncAllActiveContainers();

		logger.info('[CRON] Tracking sync completed:', result);

		return NextResponse.json({
			success: true,
			message: 'Tracking sync completed',
			stats: result,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		logger.error('[CRON] Error in tracking sync:', error);
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

// POST method for manual triggers from dashboard or external cron
export async function POST(request: NextRequest) {
	try {
		const isCron = validateCronRequest(request);
		const session = isCron ? null : await auth();

		if (!isCron && !session?.user?.id) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const body = await request.json();
		const { containerId } = body;

		if (containerId) {
			// Sync specific container (force=true for explicit manual triggers)
			const result = await trackingSync.syncContainerTracking(containerId, { force: true });
			return NextResponse.json({
				success: result.success,
				message: result.error || (result.success ? 'Container tracking synced' : 'Could not sync tracking'),
				stats: result,
				error: result.error,
			});
		} else {
			// Sync all containers
			const result = await trackingSync.syncAllActiveContainers();
			return NextResponse.json({
				success: true,
				message: 'All containers synced',
				stats: result,
			});
		}
	} catch (error) {
		logger.error('Error in manual sync:', error);
		return NextResponse.json(
			{ success: false, error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
