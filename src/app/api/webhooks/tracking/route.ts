import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { verifySignature } from '@/lib/webhook-auth';

/**
 * Webhook endpoint for receiving tracking updates from external API
 * 
 * Your tracking API should send POST requests to:
 * https://yourdomain.com/api/webhooks/tracking
 * 
 * With payload like:
 * {
 *   "trackingNumber": "CONT-12345",
 *   "event": {
 *     "status": "Departed Origin Port",
 *     "location": "Port of Los Angeles",
 *     "timestamp": "2025-12-07T10:00:00Z",
 *     "description": "Container departed on vessel",
 *     "vesselName": "MSC GULSUN",
 *     "latitude": 33.7701,
 *     "longitude": -118.1937
 *   }
 * }
 */
export async function POST(request: NextRequest) {
	try {
		// Get raw body for signature verification
		const bodyText = await request.text();

		// Verify webhook signature (if your API provides one)
		const signature = request.headers.get('x-webhook-signature');
		const webhookSecret = process.env.TRACKING_WEBHOOK_SECRET;
		const webhookToken = process.env.TRACKING_WEBHOOK_TOKEN?.trim();
		const isProduction = process.env.NODE_ENV === 'production';
		const providedToken = request.headers.get('x-webhook-token')?.trim()
			|| request.nextUrl.searchParams.get('token')?.trim()
			|| request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();

		if (webhookSecret && signature) {
			const isValid = verifySignature(signature, bodyText, webhookSecret);
			if (!isValid) {
				logger.warn('Invalid webhook signature attempt');
				return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
			}
		} else if (webhookSecret && !signature) {
			// If secret is configured but signature is missing, reject
			logger.warn('Missing webhook signature');
			return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
		} else if (webhookToken) {
			if (providedToken !== webhookToken) {
				logger.warn('Invalid tracking webhook token');
				return NextResponse.json({ error: 'Invalid webhook token' }, { status: 401 });
			}
		} else if (isProduction) {
			logger.error('Tracking webhook rejected because no production webhook secret/token is configured');
			return NextResponse.json({ error: 'Webhook authentication is not configured' }, { status: 503 });
		}

		let body;
		try {
			body = JSON.parse(bodyText);
		} catch (e) {
			logger.error('Error parsing webhook body:', e);
			return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
		}

		const { trackingNumber, event } = body;

		if (!trackingNumber || !event) {
			return NextResponse.json(
				{ error: 'Missing trackingNumber or event' },
				{ status: 400 }
			);
		}

		// Find container by tracking number
		const container = await prisma.container.findFirst({
			where: { trackingNumber },
		});

		if (!container) {
			logger.info(`Container not found for tracking number: ${trackingNumber}`);
			return NextResponse.json(
				{ error: 'Container not found' },
				{ status: 404 }
			);
		}

		// Check if event already exists (avoid duplicates)
		const eventDate = new Date(event.timestamp);
		const existingEvent = await prisma.containerTrackingEvent.findFirst({
			where: {
				containerId: container.id,
				status: event.status,
				eventDate: {
					gte: new Date(eventDate.getTime() - 60000), // Within 1 minute before
					lte: new Date(eventDate.getTime() + 60000), // Within 1 minute after
				},
			},
		});

		if (existingEvent) {
			logger.info('Duplicate event, skipping');
			return NextResponse.json({
				success: true,
				message: 'Event already exists',
			});
		}

		// Create tracking event
		const trackingEvent = await prisma.containerTrackingEvent.create({
			data: {
				containerId: container.id,
				status: event.status,
				location: event.location || undefined,
				vesselName: event.vesselName || undefined,
				description: event.description || undefined,
				eventDate,
				source: 'API',
				completed: isCompletedStatus(event.status),
				latitude: event.latitude || undefined,
				longitude: event.longitude || undefined,
			},
		});

		// Update container progress and last location update
		const progress = calculateProgress(event.status);
		await prisma.container.update({
			where: { id: container.id },
			data: {
				progress,
				lastLocationUpdate: new Date(),
				currentLocation: event.location || container.currentLocation,
			},
		});

		logger.info(`Tracking event created for container ${container.id}`);

		return NextResponse.json({
			success: true,
			message: 'Tracking event created',
			eventId: trackingEvent.id,
		});
	} catch (error) {
		logger.error('Error processing tracking webhook:', error);
		return NextResponse.json(
			{ success: false, error: 'Internal server error' },
			{ status: 500 }
		);
	}
}

function isCompletedStatus(status: string): boolean {
	const completedStatuses = ['delivered', 'completed', 'arrived', 'released', 'cleared'];
	return completedStatuses.some((s) => status.toLowerCase().includes(s));
}

function calculateProgress(status: string): number {
	const statusLower = status.toLowerCase();
	
	if (statusLower.includes('book')) return 10;
	if (statusLower.includes('pickup') || statusLower.includes('empty')) return 20;
	if (statusLower.includes('loaded')) return 30;
	if (statusLower.includes('depart')) return 40;
	if (statusLower.includes('transit') || statusLower.includes('ocean')) return 60;
	if (statusLower.includes('arrived')) return 75;
	if (statusLower.includes('customs')) return 85;
	if (statusLower.includes('released') || statusLower.includes('cleared')) return 90;
	if (statusLower.includes('delivery') || statusLower.includes('out for')) return 95;
	if (statusLower.includes('delivered') || statusLower.includes('completed')) return 100;
	
	return 50;
}
