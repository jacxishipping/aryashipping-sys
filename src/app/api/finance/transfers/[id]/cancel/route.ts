import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { cancelLedgerTransfer } from '@/lib/ledger-transfer';

const cancelSchema = z.object({
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions to cancel ledger transfers' }, { status: 403 });
    }

    let reason: string | undefined;
    try {
      const body = await request.json();
      const parsed = cancelSchema.safeParse(body);
      if (parsed.success) {
        reason = parsed.data.reason;
      }
    } catch {
      // Empty body is allowed
    }

    const updatedTransfer = await cancelLedgerTransfer({
      transferId: params.id,
      cancelledById: session.user.id,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: 'Transfer has been cancelled and balances have been adjusted.',
      transfer: updatedTransfer,
    });
  } catch (error: any) {
    console.error('Error cancelling ledger transfer:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel transfer' }, { status: 500 });
  }
}
