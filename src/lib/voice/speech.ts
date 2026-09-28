export type VoiceFinanceSummary = {
  currentBalance: number;
  totalDue: number;
  totalPaid: number;
  pendingShipments: number;
  completedShipments: number;
};

export type VoiceTrackingEvent = {
  status: string;
  location?: string;
  timestamp?: string;
};

export type VoiceTrackingSummary = {
  requestedNumber: string;
  containerNumber: string;
  shipmentStatus?: string;
  currentLocation?: string;
  estimatedArrival?: string;
  events: VoiceTrackingEvent[];
};

export type VoiceShipmentSummary = {
  reference: string;
  status: string;
  paymentStatus?: string;
  vehicleLabel?: string;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateForSpeech(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed);
}

function normalizePhrase(value?: string) {
  return (value || 'unknown').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function normalizeVoiceDigits(value?: string | null) {
  return (value || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function buildFinanceSpeech(summary: VoiceFinanceSummary) {
  const balanceDirection = summary.currentBalance >= 0 ? 'outstanding balance' : 'credit balance';
  const balanceAmount = formatCurrency(Math.abs(summary.currentBalance));

  return [
    `Your ${balanceDirection} is ${balanceAmount}.`,
    `Total due is ${formatCurrency(summary.totalDue)} and total paid is ${formatCurrency(summary.totalPaid)}.`,
    `You currently have ${summary.pendingShipments} pending shipments and ${summary.completedShipments} completed shipments.`,
  ].join(' ');
}

export function buildTrackingSpeech(summary: VoiceTrackingSummary) {
  const latestEvent = summary.events[0];
  const eta = formatDateForSpeech(summary.estimatedArrival);
  const status = normalizePhrase(summary.shipmentStatus);
  const pieces = [
    `Tracking update for ${summary.containerNumber || summary.requestedNumber}.`,
    `Current status is ${status}.`,
  ];

  if (summary.currentLocation) {
    pieces.push(`Current location is ${summary.currentLocation}.`);
  }

  if (eta) {
    pieces.push(`Estimated arrival is ${eta}.`);
  }

  if (latestEvent?.status) {
    const locationSuffix = latestEvent.location ? ` in ${latestEvent.location}` : '';
    pieces.push(`Latest event: ${normalizePhrase(latestEvent.status)}${locationSuffix}.`);
  }

  return pieces.join(' ');
}

export function buildShipmentListSpeech(shipments: VoiceShipmentSummary[]) {
  if (shipments.length === 0) {
    return 'No recent shipments were found on your account.';
  }

  const sentences = shipments.slice(0, 3).map((shipment, index) => {
    const vehicle = shipment.vehicleLabel ? ` for ${shipment.vehicleLabel}` : '';
    const payment = shipment.paymentStatus ? ` and payment is ${normalizePhrase(shipment.paymentStatus)}` : '';
    return `Shipment ${index + 1}, reference ${shipment.reference}${vehicle}, is ${normalizePhrase(shipment.status)}${payment}.`;
  });

  return sentences.join(' ');
}

export function clipVoiceReply(text: string, maxLength = 700) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const clipped = normalized.slice(0, maxLength);
  const lastSentence = clipped.lastIndexOf('. ');
  if (lastSentence > maxLength * 0.4) {
    return `${clipped.slice(0, lastSentence + 1).trim()}`;
  }

  return `${clipped.trimEnd()}...`;
}