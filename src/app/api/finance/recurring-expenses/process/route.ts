import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasPermission } from '@/lib/rbac';
import { processDueRecurringExpenses } from '@/lib/recurring-expenses';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await processDueRecurringExpenses(session.user.id);

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processedCount} due recurring expense(s).`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error processing due recurring expenses:', error);
    return NextResponse.json({ error: error.message || 'Failed to process recurring expenses' }, { status: 500 });
  }
}
