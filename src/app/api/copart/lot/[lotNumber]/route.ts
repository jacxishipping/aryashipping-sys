import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { fetchCopartLotVehicleData, getCopartDataProviderDebugInfo } from '@/lib/copart/lot-scraper';
import { getLotFetchProxyDebugInfo } from '@/lib/lot-fetch-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ lotNumber: string }> },
) {
  let resolvedLotNumber: string | undefined;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'shipments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { lotNumber } = await params;
    resolvedLotNumber = lotNumber;
    const data = await fetchCopartLotVehicleData(lotNumber);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Copart lot data.';
    console.error('[copart-lot-fetch]', {
      lotNumber: resolvedLotNumber || 'unknown',
      provider: getCopartDataProviderDebugInfo(),
      proxy: getLotFetchProxyDebugInfo(),
      error: message,
    });
    const status = message.includes('numeric') ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}