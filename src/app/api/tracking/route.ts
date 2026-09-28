import { NextRequest, NextResponse } from 'next/server';
import { buildTrackingResponse } from '@/lib/tracking-response';

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const trackNumber = (body.trackNumber || body.trackingNumber || '').trim();

		if (!trackNumber) {
			return NextResponse.json(
				{ message: 'Track number is required.' },
				{ status: 400 }
			);
		}

		const tracking = await buildTrackingResponse(trackNumber);
		if (!tracking) {
			return NextResponse.json(
				{ message: 'No tracking information found for this number.' },
				{ status: 404 }
			);
		}

		return NextResponse.json(
			{
				tracking,
			},
			{ status: 200 }
		);
	} catch (error) {
		console.error('Error fetching tracking information:', error);
		return NextResponse.json(
			{ message: 'Failed to fetch tracking information.' },
			{ status: 500 }
		);
	}
}
