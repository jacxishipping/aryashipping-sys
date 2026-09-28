import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { createDigitalOceanChatCompletion } from '@/lib/ai/digitalocean';
import { createAiInteractionLog } from '@/lib/ai/audit';
import { extractJsonObject } from '@/lib/ai/json';
import {
  buildFallbackShipmentDraft,
  buildShipmentDraftPrompt,
  shipmentDraftRequestSchema,
  shipmentDraftResponseSchema,
} from '@/lib/ai/shipment-drafting';
import { createShipmentAuditLogs } from '@/lib/entity-audit-history';
import { z } from 'zod';

function buildShipmentLabel(shipment: {
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  id: string;
}) {
  const vehicleLabel = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  if (vehicleLabel && shipment.vehicleVIN) {
    return `${vehicleLabel} (${shipment.vehicleVIN})`;
  }
  return shipment.vehicleVIN || vehicleLabel || shipment.id;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user.role, 'customers:view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = shipmentDraftRequestSchema.parse(await request.json());
    const shipment = await prisma.shipment.findUnique({
      where: { id: parsed.shipmentId },
      select: {
        id: true,
        vehicleYear: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleVIN: true,
        status: true,
        paymentStatus: true,
        releaseTokenCreatedAt: true,
        user: { select: { id: true, name: true, email: true } },
        container: { select: { containerNumber: true, estimatedArrival: true } },
        dispatch: { select: { referenceNumber: true } },
        transit: { select: { referenceNumber: true } },
      },
    });

    if (!shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const prompt = buildShipmentDraftPrompt(parsed, {
      shipmentLabel: buildShipmentLabel(shipment),
      customerName: shipment.user.name || shipment.user.email || 'Customer',
      status: shipment.status,
      containerNumber: shipment.container?.containerNumber,
      containerEta: shipment.container?.estimatedArrival?.toISOString().slice(0, 10) || null,
      dispatchReference: shipment.dispatch?.referenceNumber,
      transitReference: shipment.transit?.referenceNumber,
      paymentStatus: shipment.paymentStatus,
      releaseTokenCreatedAt: shipment.releaseTokenCreatedAt?.toISOString().slice(0, 10) || null,
    });

    let result = buildFallbackShipmentDraft(parsed, {
      shipmentLabel: buildShipmentLabel(shipment),
      customerName: shipment.user.name || shipment.user.email || 'Customer',
      status: shipment.status,
      containerNumber: shipment.container?.containerNumber,
      containerEta: shipment.container?.estimatedArrival?.toISOString().slice(0, 10) || null,
      dispatchReference: shipment.dispatch?.referenceNumber,
      transitReference: shipment.transit?.referenceNumber,
      paymentStatus: shipment.paymentStatus,
      releaseTokenCreatedAt: shipment.releaseTokenCreatedAt?.toISOString().slice(0, 10) || null,
    });
    let model = 'deterministic-shipment-draft';
    let source: 'digitalocean-ai' | 'rules' = 'rules';
    let status = 'FALLBACK';

    if (process.env.DO_AI_API_KEY) {
      try {
        const completion = await createDigitalOceanChatCompletion(
          [
            {
              role: 'system',
              content: 'You write customer-facing shipping updates. Return valid JSON only.',
            },
            { role: 'user', content: prompt },
          ],
          { maxTokens: 350, temperature: 0.3 },
        );
        result = shipmentDraftResponseSchema.parse(extractJsonObject(completion.content));
        model = completion.model;
        source = 'digitalocean-ai';
        status = 'SUCCESS';
      } catch {
        // Fallback already prepared.
      }
    }

    const aiLog = await createAiInteractionLog({
      feature: 'shipment-customer-update-draft',
      entityType: 'SHIPMENT',
      entityId: shipment.id,
      actorUserId: session.user.id,
      provider: source === 'digitalocean-ai' ? 'digitalocean-ai' : 'rules',
      model,
      prompt,
      response: JSON.stringify(result),
      requestPayload: parsed,
      responsePayload: { ...result, source },
      status,
    });

    await createShipmentAuditLogs([
      {
        shipmentId: shipment.id,
        action: 'AI_DRAFT_GENERATED',
        description: `AI customer update draft generated for ${parsed.intent}`,
        performedBy: session.user.id,
        metadata: {
          aiInteractionLogId: aiLog.id,
          intent: parsed.intent,
          source,
          model,
        },
      },
    ]);

    return NextResponse.json({
      ...result,
      aiInteractionLogId: aiLog.id,
      source,
      model,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid shipment draft request.', details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to draft shipment update.' }, { status: 500 });
  }
}