import { z } from 'zod';

export const dashboardExceptionSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  detail: z.string(),
  severityLabel: z.string(),
  ageDays: z.number(),
});

export const dashboardAssistantPayloadSchema = z.object({
  activeShipmentsCount: z.number().nonnegative(),
  activeContainersCount: z.number().nonnegative(),
  pendingRevenue: z.number().nonnegative(),
  activeDispatchesCount: z.number().nonnegative(),
  shipmentStats: z.array(
    z.object({
      status: z.string(),
      count: z.number().nonnegative(),
    }),
  ),
  dispatchStats: z.array(
    z.object({
      status: z.string(),
      label: z.string(),
      count: z.number().nonnegative(),
    }),
  ),
  agingMetrics: z.object({
    dispatchStuckCount: z.number().nonnegative(),
    dispatchThresholdDays: z.number().nonnegative(),
    containerPastEtaCount: z.number().nonnegative(),
    releasedAwaitingTransitCount: z.number().nonnegative(),
    releasedAwaitingTransitThresholdDays: z.number().nonnegative(),
    transitsOverdueCount: z.number().nonnegative(),
    totalExceptions: z.number().nonnegative(),
    exceptions: z.array(dashboardExceptionSchema).max(8),
  }),
  recentDispatches: z.array(
    z.object({
      referenceNumber: z.string(),
      statusLabel: z.string(),
      origin: z.string(),
      destination: z.string(),
      shipmentCount: z.number().nonnegative(),
      companyName: z.string(),
    }),
  ),
});

export const dashboardAssistantRequestSchema = z.object({
  mode: z.enum(['overview', 'exception-triage', 'finance-watch', 'dispatch-focus', 'custom']).default('overview'),
  focus: z.string().trim().max(400).optional(),
  payload: dashboardAssistantPayloadSchema,
});

export type DashboardAssistantMode = z.infer<typeof dashboardAssistantRequestSchema>['mode'];
export type DashboardAssistantPayload = z.infer<typeof dashboardAssistantPayloadSchema>;
export type DashboardAssistantRequest = z.infer<typeof dashboardAssistantRequestSchema>;

const modeInstructions: Record<DashboardAssistantMode, string> = {
  overview: 'Summarize the current operational picture for managers.',
  'exception-triage': 'Prioritize exceptions, aging items, and operational blockers.',
  'finance-watch': 'Focus on pending revenue, cash-collection urgency, and operational blockers affecting billing.',
  'dispatch-focus': 'Focus on dispatch pipeline pressure, stalled handoffs, and route coordination.',
  custom: 'Answer the operator focus question using only the provided dashboard data.',
};

function toCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatShipmentStats(payload: DashboardAssistantPayload) {
  return payload.shipmentStats.length > 0
    ? payload.shipmentStats.map((item) => `- ${item.status}: ${item.count}`).join('\n')
    : '- No shipment status data.';
}

function formatDispatchStats(payload: DashboardAssistantPayload) {
  return payload.dispatchStats.length > 0
    ? payload.dispatchStats.map((item) => `- ${item.label}: ${item.count}`).join('\n')
    : '- No dispatch activity.';
}

function formatExceptions(payload: DashboardAssistantPayload) {
  return payload.agingMetrics.exceptions.length > 0
    ? payload.agingMetrics.exceptions
        .map((item) => `- ${item.severityLabel}: ${item.title} | ${item.subtitle} | ${item.detail}`)
        .join('\n')
    : '- No critical exceptions in the current dashboard slice.';
}

function formatRecentDispatches(payload: DashboardAssistantPayload) {
  return payload.recentDispatches.length > 0
    ? payload.recentDispatches
        .map(
          (item) =>
            `- ${item.referenceNumber}: ${item.statusLabel}, ${item.shipmentCount} shipments, ${item.origin} to ${item.destination}, company ${item.companyName}`,
        )
        .join('\n')
    : '- No active dispatches.';
}

export function buildDashboardAssistantPrompt({
  mode,
  focus,
  payload,
}: DashboardAssistantRequest) {
  const focusBlock = focus ? `\nOperator focus: ${focus}` : '';

  return `You are generating an internal operations brief for a shipping company dashboard.
${modeInstructions[mode]}
Do not fabricate data or mention metrics that are not provided.
Return GitHub-flavored markdown with exactly these sections and headings:
## Executive Summary
## Immediate Risks
## Recommended Actions

Rules:
- Keep the total response under 260 words.
- Use short bullets in the risk and action sections.
- Ground every statement in the provided metrics.
- If there are no major issues, say that directly and shift to monitoring advice.
- When the mode is custom, prioritize the operator focus question but stay within the data.

Current dashboard metrics:
- Active shipments: ${payload.activeShipmentsCount}
- Active containers: ${payload.activeContainersCount}
- Pending revenue: ${toCurrency(payload.pendingRevenue)}
- Active dispatches: ${payload.activeDispatchesCount}
- Total workflow exceptions: ${payload.agingMetrics.totalExceptions}
- Dispatch aging exceptions over ${payload.agingMetrics.dispatchThresholdDays} days: ${payload.agingMetrics.dispatchStuckCount}
- Containers past ETA: ${payload.agingMetrics.containerPastEtaCount}
- Released awaiting transit over ${payload.agingMetrics.releasedAwaitingTransitThresholdDays} days: ${payload.agingMetrics.releasedAwaitingTransitCount}
- Overdue transits: ${payload.agingMetrics.transitsOverdueCount}

Shipment status distribution:
${formatShipmentStats(payload)}

Dispatch status distribution:
${formatDispatchStats(payload)}

Top exceptions:
${formatExceptions(payload)}

Recent dispatches:
${formatRecentDispatches(payload)}${focusBlock}`;
}

export function buildHeuristicDashboardAssistantBrief({
  mode,
  focus,
  payload,
}: DashboardAssistantRequest) {
  const summary: string[] = [];
  const risks: string[] = [];
  const actions: string[] = [];

  summary.push(
    `${payload.activeShipmentsCount} active shipments, ${payload.activeContainersCount} active containers, and ${payload.activeDispatchesCount} active dispatches are currently in play.`,
  );

  if (payload.pendingRevenue > 0) {
    summary.push(`Pending revenue sits at ${toCurrency(payload.pendingRevenue)}.`);
  } else {
    summary.push('There is no pending revenue currently flagged on the dashboard.');
  }

  if (payload.agingMetrics.totalExceptions > 0) {
    summary.push(`${payload.agingMetrics.totalExceptions} workflow exceptions need attention.`);
  } else {
    summary.push('No critical workflow exceptions are currently flagged.');
  }

  if (payload.agingMetrics.transitsOverdueCount > 0) {
    risks.push(`${payload.agingMetrics.transitsOverdueCount} transit deliveries are overdue and may create customer escalation risk.`);
  }
  if (payload.agingMetrics.containerPastEtaCount > 0) {
    risks.push(`${payload.agingMetrics.containerPastEtaCount} containers are past ETA and should be checked for customs or port delays.`);
  }
  if (payload.agingMetrics.dispatchStuckCount > 0) {
    risks.push(`${payload.agingMetrics.dispatchStuckCount} shipments have been in dispatch longer than ${payload.agingMetrics.dispatchThresholdDays} days.`);
  }
  if (payload.agingMetrics.releasedAwaitingTransitCount > 0) {
    risks.push(`${payload.agingMetrics.releasedAwaitingTransitCount} released shipments are waiting too long for transit assignment.`);
  }
  if (payload.pendingRevenue > 0 && mode === 'finance-watch') {
    risks.push(`Open revenue collection is exposed while operational blockers remain active.`);
  }
  if (mode === 'dispatch-focus' && payload.activeDispatchesCount === 0) {
    risks.push('No active dispatch pipeline is visible right now, so new origin-to-port demand should be monitored closely.');
  }
  if (risks.length === 0) {
    risks.push('No immediate operational risks stand out from the current dashboard slice.');
  }

  if (payload.agingMetrics.transitsOverdueCount > 0) {
    actions.push('Review overdue transit records first and verify latest delivery commitments with customers.');
  }
  if (payload.agingMetrics.dispatchStuckCount > 0 || mode === 'dispatch-focus') {
    actions.push('Work the dispatch queue by checking stalled handoffs, missing yard updates, and carrier confirmations.');
  }
  if (payload.agingMetrics.releasedAwaitingTransitCount > 0) {
    actions.push('Assign released shipments to onward transit before they accumulate additional dwell time.');
  }
  if (payload.pendingRevenue > 0) {
    actions.push('Match open invoice follow-up with the shipments closest to delivery or release milestones.');
  }
  if (payload.recentDispatches.length > 0 && mode !== 'finance-watch') {
    actions.push(`Use ${payload.recentDispatches[0]?.referenceNumber} and the other active dispatches as the first coordination checkpoints today.`);
  }
  if (focus) {
    actions.push(`Operator focus noted: ${focus}`);
  }
  if (actions.length === 0) {
    actions.push('Keep monitoring shipment movement, invoice aging, and dispatch updates for new exceptions.');
  }

  return [
    '## Executive Summary',
    summary.join(' '),
    '',
    '## Immediate Risks',
    ...risks.map((item) => `- ${item}`),
    '',
    '## Recommended Actions',
    ...actions.map((item) => `- ${item}`),
  ].join('\n');
}