import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
// Note: Items model has been removed in the new architecture
// Shipments are now directly assigned to Containers
// This endpoint is kept for backward compatibility but returns deprecation notice

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can create items' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { 
        message: 'Items endpoint is deprecated. Please use /api/shipments to create shipments instead.',
        deprecated: true,
        migrationGuide: 'Use POST /api/shipments with vehicle information',
      },
      { status: 410 } // 410 Gone - Resource no longer available
    );
  } catch (error) {
    console.error('Error in deprecated items endpoint:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { 
        message: 'Items endpoint is deprecated. Please use /api/shipments or /api/containers/[id]/shipments instead.',
        deprecated: true,
        alternatives: [
          'GET /api/shipments - List all shipments',
          'GET /api/containers/[id]/shipments - List shipments in a container',
        ],
      },
      { status: 410 } // 410 Gone - Resource no longer available
    );
  } catch (error) {
    console.error('Error in deprecated items endpoint:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
