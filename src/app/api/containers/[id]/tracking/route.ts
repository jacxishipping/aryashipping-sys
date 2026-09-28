import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

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

		const events = await prisma.containerTrackingEvent.findMany({
			where: { containerId: params.id },
			orderBy: { eventDate: 'desc' },
		});

		return NextResponse.json(events);
	} catch (error) {
		console.error('Error fetching tracking events:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch tracking events' },
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

		const body = await request.json();
		const {
			status,
			location,
			vesselName,
			description,
			eventDate,
			source,
			completed,
			latitude,
			longitude,
		} = body;

		// Validation
		if (!status || !eventDate) {
			return NextResponse.json(
				{ error: 'Status and event date are required' },
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

		// Create tracking event
		const event = await prisma.containerTrackingEvent.create({
			data: {
				containerId: params.id,
				status,
				location: location || undefined,
				vesselName: vesselName || undefined,
				description: description || undefined,
				eventDate: new Date(eventDate),
				source: source || 'Manual',
				completed: completed || false,
				latitude: latitude ? parseFloat(latitude) : undefined,
				longitude: longitude ? parseFloat(longitude) : undefined,
			},
		});

		return NextResponse.json(event, { status: 201 });
	} catch (error) {
		console.error('Error creating tracking event:', error);
		return NextResponse.json(
			{ error: 'Failed to create tracking event' },
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

		const { searchParams } = new URL(request.url);
		const eventId = searchParams.get('eventId');

		if (!eventId) {
			return NextResponse.json(
				{ error: 'Event ID is required' },
				{ status: 400 }
			);
		}

		await prisma.containerTrackingEvent.delete({
			where: { id: eventId },
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error('Error deleting tracking event:', error);
		return NextResponse.json(
			{ error: 'Failed to delete tracking event' },
			{ status: 500 }
		);
	}
}
