import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { oceanCarrierSync } from '@/lib/services/ocean-carriers/ocean-carrier-service';
import { SUPPORTED_OCEAN_CARRIERS } from '@/lib/services/ocean-carriers/types';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const containerNumber = searchParams.get('containerNumber');

    if (containerNumber) {
      const snapshot = await oceanCarrierSync.fetchLiveCarrierTracking(containerNumber);
      return NextResponse.json({ snapshot });
    }

    return NextResponse.json({
      supportedCarriers: Object.values(SUPPORTED_OCEAN_CARRIERS),
      status: 'active',
      supportedDCSAVersion: '2.0.2',
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Carrier sync fetch failed' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const canSync = hasPermission(session.user?.role, 'containers:manage') || hasPermission(session.user?.role, 'shipments:manage');
    if (!canSync) {
      return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { containerId, bulk } = body;

    if (bulk) {
      const result = await oceanCarrierSync.syncAllActiveOceanContainers();
      return NextResponse.json({
        success: true,
        message: `Bulk carrier sync completed: ${result.synced}/${result.totalContainers} containers synced with ${result.totalNewEvents} new events.`,
        stats: result,
      });
    }

    if (!containerId) {
      return NextResponse.json({ message: 'Container ID is required' }, { status: 400 });
    }

    const result = await oceanCarrierSync.syncContainerWithCarrier(containerId, { force: true });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ message: error.message || 'Carrier synchronization failed' }, { status: 500 });
  }
}
