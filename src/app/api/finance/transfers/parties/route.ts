import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasAnyPermission } from '@/lib/rbac';
import { getLedgerTransferParties } from '@/lib/ledger-transfer';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAnyPermission(session.user.role, ['finance:view', 'finance:manage'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const data = await getLedgerTransferParties();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching transfer parties:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch parties' }, { status: 500 });
  }
}
