import { z } from 'zod';

export const shipmentDraftRequestSchema = z.object({
  shipmentId: z.string().min(1),
  intent: z.enum(['status-update', 'delay-update', 'document-request', 'payment-reminder', 'pickup-coordination']).default('status-update'),
  extraInstructions: z.string().trim().max(400).optional(),
});

export const shipmentDraftResponseSchema = z.object({
  subject: z.string().min(1).max(120),
  message: z.string().min(1).max(2000),
});

type ShipmentDraftContext = {
  shipmentLabel: string;
  customerName: string;
  status: string;
  containerNumber?: string | null;
  containerEta?: string | null;
  dispatchReference?: string | null;
  transitReference?: string | null;
  paymentStatus?: string | null;
  releaseTokenCreatedAt?: string | null;
};

const intentDescriptions: Record<z.infer<typeof shipmentDraftRequestSchema>['intent'], string> = {
  'status-update': 'Give the customer a concise status update and the next expected milestone.',
  'delay-update': 'Acknowledge delay risk clearly, explain the operational blocker, and set expectations without overpromising.',
  'document-request': 'Ask the customer for the missing item or approval needed to keep the shipment moving.',
  'payment-reminder': 'Request payment in a firm but professional tone while linking it to shipment progress.',
  'pickup-coordination': 'Coordinate the next handoff or delivery milestone with clear action items for the customer.',
};

export function buildShipmentDraftPrompt(
  request: z.infer<typeof shipmentDraftRequestSchema>,
  context: ShipmentDraftContext,
) {
  return `You are writing a customer-facing shipment update for a vehicle shipping company.
Return valid JSON only with keys subject and message.
Do not use markdown.
Keep the message under 170 words.
Be professional, specific, and reassuring without inventing dates or promises.

Intent:
${intentDescriptions[request.intent]}

Shipment context:
- Customer: ${context.customerName}
- Shipment: ${context.shipmentLabel}
- Current status: ${context.status}
- Container number: ${context.containerNumber || 'Not assigned'}
- Container ETA: ${context.containerEta || 'Not available'}
- Dispatch reference: ${context.dispatchReference || 'Not assigned'}
- Transit reference: ${context.transitReference || 'Not assigned'}
- Payment status: ${context.paymentStatus || 'Unknown'}
- Release token created at: ${context.releaseTokenCreatedAt || 'Not created'}
- Extra instructions: ${request.extraInstructions || 'None'}

Output example:
{"subject":"Shipment Update","message":"Hello ..."}`;
}

export function buildFallbackShipmentDraft(
  request: z.infer<typeof shipmentDraftRequestSchema>,
  context: ShipmentDraftContext,
) {
  const subjectByIntent: Record<z.infer<typeof shipmentDraftRequestSchema>['intent'], string> = {
    'status-update': `Update on your shipment: ${context.shipmentLabel}`,
    'delay-update': `Update on shipment timing for ${context.shipmentLabel}`,
    'document-request': `Action needed for your shipment: ${context.shipmentLabel}`,
    'payment-reminder': `Payment reminder for ${context.shipmentLabel}`,
    'pickup-coordination': `Coordination update for ${context.shipmentLabel}`,
  };

  const opening = `Hello ${context.customerName},`;
  const core = [`We are writing with an update on your shipment ${context.shipmentLabel}.`, `Its current status is ${context.status.toLowerCase().replace(/_/g, ' ')}.`];

  if (context.containerNumber) {
    core.push(`It is currently tied to container ${context.containerNumber}.`);
  }
  if (context.containerEta) {
    core.push(`The latest recorded container ETA is ${context.containerEta}.`);
  }
  if (request.intent === 'payment-reminder' && context.paymentStatus) {
    core.push(`Our records show the payment status as ${context.paymentStatus.toLowerCase().replace(/_/g, ' ')}.`);
  }
  if (request.intent === 'document-request') {
    core.push('Please reply with the required document or approval so we can keep the shipment moving without added delay.');
  } else if (request.intent === 'delay-update') {
    core.push('We are actively monitoring the delay point and will keep you informed as the next milestone is confirmed.');
  } else if (request.intent === 'pickup-coordination') {
    core.push('Please confirm your availability for the next handoff or delivery step so our team can coordinate accordingly.');
  } else {
    core.push('We will continue to monitor progress and share the next confirmed milestone as soon as it is available.');
  }

  if (request.extraInstructions) {
    core.push(request.extraInstructions);
  }

  return {
    subject: subjectByIntent[request.intent],
    message: `${opening}\n\n${core.join(' ')}\n\nThank you,\nJacxi Shipping`,
  };
}