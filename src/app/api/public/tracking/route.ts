import { NextRequest, NextResponse } from 'next/server';
import { validatePublicApiKeyRequest } from '@/lib/public-api-auth';
import { buildTrackingResponse } from '@/lib/tracking-response';

function getTrackNumberFromRequest(request: NextRequest, body?: Record<string, unknown>) {
  const url = new URL(request.url);
  const queryValue = url.searchParams.get('trackNumber') || url.searchParams.get('trackingNumber');

  if (queryValue) {
    return queryValue.trim();
  }

  const bodyValue = body?.trackNumber || body?.trackingNumber;
  return typeof bodyValue === 'string' ? bodyValue.trim() : '';
}

async function handleTrackingRequest(request: NextRequest, body?: Record<string, unknown>) {
  const authResult = validatePublicApiKeyRequest(request);
  if (!authResult.ok) {
    const status = authResult.reason === 'missing_secret' ? 503 : 401;
    const message = authResult.reason === 'missing_secret'
      ? 'Public tracking API is not configured.'
      : 'Unauthorized';

    return NextResponse.json({ message }, { status });
  }

  const trackNumber = getTrackNumberFromRequest(request, body);
  if (!trackNumber) {
    return NextResponse.json({ message: 'Track number is required.' }, { status: 400 });
  }

  try {
    const tracking = await buildTrackingResponse(trackNumber);
    if (!tracking) {
      return NextResponse.json({ message: 'No tracking information found for this number.' }, { status: 404 });
    }

    return NextResponse.json({ tracking }, { status: 200 });
  } catch (error) {
    console.error('Error fetching public tracking information:', error);
    return NextResponse.json({ message: 'Failed to fetch tracking information.' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return handleTrackingRequest(request);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> | undefined;

  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  return handleTrackingRequest(request, body);
}