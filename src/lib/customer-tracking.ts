export type CustomerTrackingStageKey =
  | 'PICKED_UP'
  | 'AT_PORT'
  | 'ON_THE_WAY'
  | 'IN_DESTINATION_TRANSIT'
  | 'DELIVERED';

export type CustomerTrackingMilestoneState = 'pending' | 'current' | 'complete';

export type CustomerTrackingEventInput = {
  status?: string;
  statusCode?: string;
  description?: string;
  location?: string;
  timestamp?: string;
  actual?: boolean;
};

export type CustomerTrackingInternalSnapshot = {
  shipmentStatuses?: string[];
  hasDispatch?: boolean;
  hasTransit?: boolean;
  containerStatus?: string | null;
  dispatchDate?: string;
  loadingDate?: string;
  departureDate?: string;
  actualArrival?: string;
  transitDispatchDate?: string;
  actualDelivery?: string;
};

export type CustomerTrackingSource = {
  shipmentStatus?: string;
  originDate?: string;
  polDate?: string;
  podDate?: string;
  estimatedArrival?: string;
  events?: CustomerTrackingEventInput[];
  internal?: CustomerTrackingInternalSnapshot | null;
};

export type CustomerTrackingMilestone = {
  key: CustomerTrackingStageKey;
  label: string;
  description: string;
  state: CustomerTrackingMilestoneState;
  timestamp?: string;
};

export type CustomerTrackingView = {
  currentStageKey: CustomerTrackingStageKey;
  currentStageLabel: string;
  summary: string;
  progressPercent: number;
  milestones: CustomerTrackingMilestone[];
};

const CUSTOMER_STAGE_CONFIG: Array<{
  key: CustomerTrackingStageKey;
  label: string;
  description: string;
}> = [
  { key: 'PICKED_UP', label: 'Picked Up', description: 'Your vehicle has been collected and entered our shipping flow.' },
  { key: 'AT_PORT', label: 'At Port', description: 'Your shipment is at the port and preparing for export or release.' },
  { key: 'ON_THE_WAY', label: 'On the Way', description: 'Your container is moving between origin and destination.' },
  { key: 'IN_DESTINATION_TRANSIT', label: 'In Destination Transit', description: 'Your shipment is in final inland transit near destination.' },
  { key: 'DELIVERED', label: 'Delivered', description: 'Your shipment has reached its final handoff.' },
];

const STAGE_INDEX = new Map(CUSTOMER_STAGE_CONFIG.map((stage, index) => [stage.key, index]));

function includesAny(text: string | undefined, keywords: string[]) {
  if (!text) return false;
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function getEventText(event: CustomerTrackingEventInput) {
  return [event.status, event.statusCode, event.description, event.location].filter(Boolean).join(' ').toLowerCase();
}

function sortIsoValues(values: Array<string | undefined>) {
  return values.filter((value): value is string => Boolean(value)).sort((left, right) => left.localeCompare(right));
}

function firstTimestampForStage(events: CustomerTrackingEventInput[], stage: CustomerTrackingStageKey) {
  const stageMatchers: Record<CustomerTrackingStageKey, (event: CustomerTrackingEventInput) => boolean> = {
    PICKED_UP: (event) => includesAny(getEventText(event), ['pickup', 'picked up', 'dispatch', 'yard', 'received']),
    AT_PORT: (event) => includesAny(getEventText(event), ['port', 'terminal', 'gate', 'loaded', 'release', 'customs']),
    ON_THE_WAY: (event) => includesAny(getEventText(event), ['in transit', 'depart', 'departure', 'sail', 'voyage', 'vessel', 'transshipment']),
    IN_DESTINATION_TRANSIT: (event) => includesAny(getEventText(event), ['destination transit', 'out for delivery', 'inland transit', 'local delivery', 'destination', 'final transit']),
    DELIVERED: (event) => includesAny(getEventText(event), ['delivered', 'delivery complete', 'received by customer', 'handed over']),
  };

  return sortIsoValues(
    events
      .filter((event) => event.actual !== false)
      .filter((event) => stageMatchers[stage](event))
      .map((event) => event.timestamp),
  )[0];
}

function deriveStageFromInternal(source: CustomerTrackingSource): CustomerTrackingStageKey | null {
  const statuses = source.internal?.shipmentStatuses || [];
  const allDelivered = statuses.length > 0 && statuses.every((status) => status === 'DELIVERED');
  const anyTransit = source.internal?.hasTransit || statuses.includes('IN_TRANSIT_TO_DESTINATION');
  const anyShipping = statuses.includes('IN_TRANSIT');
  const anyAtPort = statuses.includes('RELEASED') || includesAny(source.internal?.containerStatus || '', ['arrived', 'customs', 'released']);
  const anyDispatch = source.internal?.hasDispatch || statuses.includes('DISPATCHING') || statuses.includes('ON_HAND');

  if (allDelivered || Boolean(source.internal?.actualDelivery)) {
    return 'DELIVERED';
  }

  if (anyTransit) {
    return 'IN_DESTINATION_TRANSIT';
  }

  if (anyShipping) {
    return 'ON_THE_WAY';
  }

  if (anyAtPort) {
    return 'AT_PORT';
  }

  if (anyDispatch) {
    return 'PICKED_UP';
  }

  return null;
}

function deriveStageFromExternal(source: CustomerTrackingSource): CustomerTrackingStageKey {
  const shipmentStatus = source.shipmentStatus?.toLowerCase();
  const eventTexts = (source.events || []).map(getEventText);
  const anyText = (keywords: string[]) => eventTexts.some((text) => keywords.some((keyword) => text.includes(keyword)));

  if (includesAny(shipmentStatus, ['delivered']) || anyText(['delivered', 'delivery complete', 'handed over'])) {
    return 'DELIVERED';
  }

  if (anyText(['destination transit', 'out for delivery', 'inland transit', 'final transit', 'local delivery'])) {
    return 'IN_DESTINATION_TRANSIT';
  }

  if (includesAny(shipmentStatus, ['transit', 'sailing', 'voyage']) || anyText(['departure', 'departed', 'in transit', 'sailing', 'voyage', 'vessel', 'transshipment'])) {
    return 'ON_THE_WAY';
  }

  if (anyText(['port', 'terminal', 'gate', 'loaded', 'customs', 'release'])) {
    return 'AT_PORT';
  }

  return 'PICKED_UP';
}

export function buildCustomerTrackingView(source: CustomerTrackingSource): CustomerTrackingView {
  const currentStageKey = deriveStageFromInternal(source) || deriveStageFromExternal(source);
  const currentStageIndex = STAGE_INDEX.get(currentStageKey) ?? 0;
  const events = source.events || [];

  const timestamps: Partial<Record<CustomerTrackingStageKey, string>> = {
    PICKED_UP: sortIsoValues([
      source.internal?.dispatchDate,
      source.originDate,
      firstTimestampForStage(events, 'PICKED_UP'),
    ])[0],
    AT_PORT: sortIsoValues([
      source.internal?.loadingDate,
      source.polDate,
      source.internal?.actualArrival,
      firstTimestampForStage(events, 'AT_PORT'),
    ])[0],
    ON_THE_WAY: sortIsoValues([
      source.internal?.departureDate,
      firstTimestampForStage(events, 'ON_THE_WAY'),
    ])[0],
    IN_DESTINATION_TRANSIT: sortIsoValues([
      source.internal?.transitDispatchDate,
      source.podDate,
      firstTimestampForStage(events, 'IN_DESTINATION_TRANSIT'),
    ])[0],
    DELIVERED: sortIsoValues([
      source.internal?.actualDelivery,
      firstTimestampForStage(events, 'DELIVERED'),
    ])[0],
  };

  const milestones = CUSTOMER_STAGE_CONFIG.map((stage, index) => ({
    key: stage.key,
    label: stage.label,
    description: stage.description,
    state: index < currentStageIndex ? 'complete' : index === currentStageIndex ? 'current' : 'pending',
    timestamp: timestamps[stage.key],
  } as CustomerTrackingMilestone));

  const currentStage = CUSTOMER_STAGE_CONFIG[currentStageIndex];
  const progressPercent = Math.round((currentStageIndex / (CUSTOMER_STAGE_CONFIG.length - 1)) * 100);

  return {
    currentStageKey,
    currentStageLabel: currentStage.label,
    summary: currentStage.description,
    progressPercent,
    milestones,
  };
}