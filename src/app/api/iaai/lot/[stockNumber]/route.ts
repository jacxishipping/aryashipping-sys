import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { fetchIaaiLotVehicleData } from '@/lib/iaai/lot-scraper';
import { getLotFetchProxyDebugInfo } from '@/lib/lot-fetch-proxy';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ stockNumber: string }> },
) {
  let resolvedStockNumber: string | undefined;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'shipments:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { stockNumber } = await params;
    resolvedStockNumber = stockNumber;
    const data = await fetchIaaiLotVehicleData(stockNumber);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch IAAI lot data.';
    console.error('[iaai-lot-fetch]', {
      stockNumber: resolvedStockNumber || 'unknown',
      proxy: getLotFetchProxyDebugInfo(),
      error: message,
    });
    const status = message.includes('must be') ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
