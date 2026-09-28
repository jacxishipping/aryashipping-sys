import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { oceanCarrierSync } from '@/lib/services/ocean-carriers/ocean-carrier-service';

/**
 * Ocean Carrier Webhook Receiver
 * Supports real-time event pushes (DCSA / EDI / Carrier API webhooks)
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    logger.info('[CARRIER WEBHOOK] Received event push:', payload);

    // DCSA Standard Event Payload extraction
    const containerNumber = 
      payload.equipmentReference || 
      payload.containerNumber || 
      payload.data?.container_number || 
      payload.event?.equipmentReference;

    if (!containerNumber) {
      return NextResponse.json({ received: true, note: 'No container reference found in payload' }, { status: 200 });
    }

    const container = await prisma.container.findFirst({
      where: {
        OR: [
          { containerNumber: { equals: containerNumber.trim(), mode: 'insensitive' } },
          { trackingNumber: { equals: containerNumber.trim(), mode: 'insensitive' } },
        ],
      },
      select: { id: true },
    });

    if (!container) {
      return NextResponse.json({ received: true, note: `Container ${containerNumber} not tracked in Jacxi system` }, { status: 200 });
    }

    // Trigger instant carrier sync and milestone alert
    const syncResult = await oceanCarrierSync.syncContainerWithCarrier(container.id, { force: true });

    return NextResponse.json({
      received: true,
      containerNumber,
      syncResult,
      processedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('[CARRIER WEBHOOK] Ingestion error:', error);
    return NextResponse.json({ error: error.message || 'Webhook ingestion failed' }, { status: 500 });
  }
}
