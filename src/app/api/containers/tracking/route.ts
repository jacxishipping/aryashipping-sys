import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { trackingAPI } from '@/lib/services/tracking-api';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only admins can fetch tracking data
    if (session.user?.role !== 'admin') {
      return NextResponse.json(
        { message: 'Forbidden: Only admins can fetch tracking data' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const containerNumber = searchParams.get('containerNumber');

    if (!containerNumber) {
      return NextResponse.json(
        { message: 'Container number is required' },
        { status: 400 }
      );
    }

    try {
      const trackingData = await trackingAPI.fetchContainerTrackingData(containerNumber);
      
      if (!trackingData) {
        return NextResponse.json(
          { 
            message: 'Container not found in tracking system. Please enter details manually.',
            trackingData: null
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: 'Container data fetched successfully',
        trackingData,
      });
    } catch (error) {
      logger.error('Error fetching from tracking API:', error);
      return NextResponse.json(
        { 
          message: 'Unable to fetch container data from tracking system. Please enter details manually.',
          trackingData: null
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error in tracking route:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
