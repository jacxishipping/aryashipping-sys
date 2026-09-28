import { NextRequest, NextResponse } from 'next/server';
import { validateCronRequest } from '@/lib/cron-auth';
import { isFinicityConfigured } from '@/lib/financial/finicity';
import { syncAllFinicityItems } from '@/lib/financial/finicitySync';

export async function GET(request: NextRequest) {
  return syncBankTransactions(request);
}

export async function POST(request: NextRequest) {
  return syncBankTransactions(request);
}

async function syncBankTransactions(request: NextRequest) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isFinicityConfigured()) {
    return NextResponse.json({ error: 'Finicity is not configured' }, { status: 503 });
  }

  try {
    const results = await syncAllFinicityItems();
    return NextResponse.json({ syncedItems: results.length, results });
  } catch (error) {
    console.error('Error syncing Finicity items from cron:', error);
    return NextResponse.json({ error: 'Failed to sync bank transactions' }, { status: 500 });
  }
}
