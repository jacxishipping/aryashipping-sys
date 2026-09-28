import { prisma } from '@/lib/db';
import { buildTrackingResponse, type NormalizedTracking } from '@/lib/tracking-response';
import { buildTelegramMiniAppUrl } from './auth';
import type { TelegramLinkedUser } from './session';

export type TelegramShipmentSummary = {
  id: string;
  vehicleLabel: string;
  vehicleYear: number | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleVIN: string | null;
  vehicleColor: string | null;
  lotNumber: string | null;
  auctionName: string | null;
  status: string;
  statusLabel: string;
  paymentStatus: string;
  price: number | null;
  containerNumber: string | null;
  vesselName: string | null;
  voyageNumber: string | null;
  shippingLine: string | null;
  loadingPort: string | null;
  destinationPort: string | null;
  departureDate: string | null;
  estimatedArrival: string | null;
  actualArrival: string | null;
  currentLocation: string | null;
  progress: number;
  arrivalPhotos: string[];
  vehiclePhotos: string[];
  totalPhotosCount: number;
  createdAt: string;
};

export function formatStatusBadge(status: string): string {
  switch (status) {
    case 'ON_HAND':
      return '🟡 Yard On-Hand';
    case 'DISPATCHING':
    case 'DISPATCHED':
      return '🚛 Inland Dispatched';
    case 'IN_PORT':
      return '⚓ At Export Port';
    case 'LOADED':
      return '📦 Loaded in Container';
    case 'IN_TRANSIT':
      return '🌊 Ocean Transit';
    case 'IN_TRANSIT_TO_DESTINATION':
      return '🚢 In Transit to Destination';
    case 'ARRIVED':
      return '🏁 Arrived at Destination';
    case 'RELEASED':
    case 'DELIVERED':
      return '✅ Released & Delivered';
    default:
      return `📍 ${status.replace(/_/g, ' ')}`;
  }
}

export function calculateShipmentProgress(status: string, containerProgress?: number | null): number {
  if (typeof containerProgress === 'number') return containerProgress;
  switch (status) {
    case 'RELEASED':
    case 'DELIVERED':
      return 100;
    case 'IN_TRANSIT_TO_DESTINATION':
    case 'ARRIVED':
      return 85;
    case 'IN_TRANSIT':
      return 60;
    case 'LOADED':
      return 50;
    case 'DISPATCHING':
    case 'DISPATCHED':
      return 40;
    case 'ON_HAND':
    default:
      return 25;
  }
}

export function formatProgressBar(progress: number): string {
  const bounded = Math.max(0, Math.min(100, Math.round(progress)));
  const totalBlocks = 10;
  const filledBlocks = Math.round((bounded / 100) * totalBlocks);
  const emptyBlocks = totalBlocks - filledBlocks;
  return `${'█'.repeat(filledBlocks)}${'░'.repeat(emptyBlocks)} ${bounded}%`;
}

function normalizeImageUrl(url: string, baseUrl: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
}

export async function getCustomerShipments(userId: string): Promise<TelegramShipmentSummary[]> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jacxishipping.com';

  const shipments = await prisma.shipment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      container: {
        select: {
          containerNumber: true,
          vesselName: true,
          voyageNumber: true,
          shippingLine: true,
          loadingPort: true,
          destinationPort: true,
          departureDate: true,
          estimatedArrival: true,
          actualArrival: true,
          currentLocation: true,
          progress: true,
        },
      },
      qualityChecks: {
        select: { photos: true },
      },
    },
  });

  return shipments.map((s) => {
    const vehicleLabel = [s.vehicleYear, s.vehicleMake, s.vehicleModel].filter(Boolean).join(' ') || s.vehicleType || 'Vehicle';
    const qualityPhotos = s.qualityChecks.flatMap((qc) => qc.photos || []);
    const allArrival = [...(s.arrivalPhotos || []), ...qualityPhotos].map((url) => normalizeImageUrl(url, baseUrl));
    const allVehicle = (s.vehiclePhotos || []).map((url) => normalizeImageUrl(url, baseUrl));

    return {
      id: s.id,
      vehicleLabel,
      vehicleYear: s.vehicleYear,
      vehicleMake: s.vehicleMake,
      vehicleModel: s.vehicleModel,
      vehicleVIN: s.vehicleVIN,
      vehicleColor: s.vehicleColor,
      lotNumber: s.lotNumber,
      auctionName: s.auctionName,
      status: s.status,
      statusLabel: formatStatusBadge(s.status),
      paymentStatus: s.paymentStatus,
      price: s.price,
      containerNumber: s.container?.containerNumber || null,
      vesselName: s.container?.vesselName || null,
      voyageNumber: s.container?.voyageNumber || null,
      shippingLine: s.container?.shippingLine || null,
      loadingPort: s.container?.loadingPort || null,
      destinationPort: s.container?.destinationPort || null,
      departureDate: s.container?.departureDate ? s.container.departureDate.toLocaleDateString() : null,
      estimatedArrival: s.container?.estimatedArrival ? s.container.estimatedArrival.toLocaleDateString() : null,
      actualArrival: s.container?.actualArrival ? s.container.actualArrival.toLocaleDateString() : null,
      currentLocation: s.container?.currentLocation || (s.status === 'ON_HAND' ? 'Export Yard' : 'In Transit'),
      progress: calculateShipmentProgress(s.status, s.container?.progress),
      arrivalPhotos: allArrival,
      vehiclePhotos: allVehicle,
      totalPhotosCount: allArrival.length + allVehicle.length,
      createdAt: s.createdAt.toLocaleDateString(),
    };
  });
}

export async function getCustomerShipmentByIdOrVin(
  userId: string,
  identifier: string
): Promise<TelegramShipmentSummary | null> {
  const cleanId = identifier.trim();
  const all = await getCustomerShipments(userId);
  return all.find(
    (s) =>
      s.id === cleanId ||
      (s.vehicleVIN && s.vehicleVIN.toUpperCase() === cleanId.toUpperCase()) ||
      (s.lotNumber && s.lotNumber.toUpperCase() === cleanId.toUpperCase()) ||
      (s.containerNumber && s.containerNumber.toUpperCase() === cleanId.toUpperCase())
  ) || null;
}

export async function getCustomerFinanceOverview(userId: string) {
  const [latestLedger, invoices, shipments] = await Promise.all([
    prisma.ledgerEntry.findFirst({
      where: { userId },
      orderBy: { transactionDate: 'desc' },
      select: { balance: true },
    }),
    prisma.userInvoice.findMany({
      where: { userId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        amountPaid: true,
        amountRemaining: true,
        dueDate: true,
        issueDate: true,
      },
      orderBy: { issueDate: 'desc' },
      take: 5,
    }),
    prisma.shipment.findMany({
      where: { userId },
      select: {
        id: true,
        paymentStatus: true,
        price: true,
      },
    }),
  ]);

  let totalDue = 0;
  let totalPaid = 0;

  for (const invoice of invoices) {
    if (['PENDING', 'OVERDUE'].includes(invoice.status)) {
      totalDue += invoice.amountRemaining ?? invoice.total;
    }
    totalPaid += invoice.amountPaid ?? (invoice.status === 'PAID' ? invoice.total : 0);
  }

  const currentBalance = latestLedger?.balance ?? totalDue;

  return {
    currentBalance,
    totalDue,
    totalPaid,
    shipmentsCount: shipments.length,
    recentInvoices: invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      total: inv.total,
      remaining: inv.amountRemaining,
      dueDate: inv.dueDate ? inv.dueDate.toLocaleDateString() : 'N/A',
    })),
  };
}

export function formatPortFlag(portName: string | null | undefined): string {
  if (!portName) return '📍 Port';
  const lower = portName.toLowerCase();
  if (lower.includes('savannah') || lower.includes('houston') || lower.includes('new york') || lower.includes('los angeles') || lower.includes('miami') || lower.includes('usa') || lower.includes('nj') || lower.includes('ga') || lower.includes('tx')) {
    return `🇺🇸 ${portName}`;
  }
  if (lower.includes('jebel ali') || lower.includes('dubai') || lower.includes('uae') || lower.includes('sharjah') || lower.includes('abu dhabi')) {
    return `🇦🇪 ${portName}`;
  }
  if (lower.includes('poti') || lower.includes('batumi') || lower.includes('georgia')) {
    return `🇬🇪 ${portName}`;
  }
  if (lower.includes('aqaba') || lower.includes('jordan') || lower.includes('amman')) {
    return `🇯🇴 ${portName}`;
  }
  if (lower.includes('bremerhaven') || lower.includes('hamburg') || lower.includes('germany')) {
    return `🇩🇪 ${portName}`;
  }
  if (lower.includes('lagos') || lower.includes('tincan') || lower.includes('apapa') || lower.includes('nigeria')) {
    return `🇳🇬 ${portName}`;
  }
  if (lower.includes('sohar') || lower.includes('salalah') || lower.includes('oman') || lower.includes('muscat')) {
    return `🇴🇲 ${portName}`;
  }
  if (lower.includes('shuwaikh') || lower.includes('kuwait')) {
    return `🇰🇼 ${portName}`;
  }
  if (lower.includes('dammam') || lower.includes('jeddah') || lower.includes('saudi')) {
    return `🇸🇦 ${portName}`;
  }
  if (lower.includes('mersin') || lower.includes('turkey') || lower.includes('istanbul')) {
    return `🇹🇷 ${portName}`;
  }
  return `🌐 ${portName}`;
}

export function formatShipmentHeroCard(
  shipment: TelegramShipmentSummary,
  index = 0,
  total = 1
): string {
  const pageTag = total > 1 ? ` <i>(${index + 1} of ${total})</i>` : '';
  const lines: string[] = [
    `🚗 <b>${escapeHtml(shipment.vehicleLabel)}</b>${pageTag}`,
    '━━━━━━━━━━━━━━━━━━━━━',
    `📍 <b>Status:</b> ${shipment.statusLabel}`,
    `📊 <b>Progress:</b> <code>${formatProgressBar(shipment.progress)}</code>`,
    '',
  ];

  if (shipment.vehicleVIN) {
    lines.push(`🔑 <b>VIN:</b> <code>${escapeHtml(shipment.vehicleVIN)}</code>`);
  }
  if (shipment.lotNumber) {
    lines.push(`🏷 <b>Lot #:</b> <code>${escapeHtml(shipment.lotNumber)}</code>${shipment.auctionName ? ` <i>(${escapeHtml(shipment.auctionName)})</i>` : ''}`);
  }
  if (shipment.vehicleColor) {
    lines.push(`🎨 <b>Color:</b> ${escapeHtml(shipment.vehicleColor)}`);
  }

  if (shipment.containerNumber) {
    lines.push('');
    lines.push(`📦 <b>Container:</b> <code>${escapeHtml(shipment.containerNumber)}</code>`);
    if (shipment.vesselName) {
      lines.push(`🚢 <b>Vessel:</b> ${escapeHtml(shipment.vesselName)}${shipment.voyageNumber ? ` (Voyage: <code>${escapeHtml(shipment.voyageNumber)}</code>)` : ''}`);
    }
    if (shipment.shippingLine) {
      lines.push(`🏢 <b>Carrier:</b> ${escapeHtml(shipment.shippingLine)}`);
    }
    if (shipment.loadingPort || shipment.destinationPort) {
      const originStr = shipment.loadingPort ? formatPortFlag(shipment.loadingPort) : 'Export Port';
      const destStr = shipment.destinationPort ? formatPortFlag(shipment.destinationPort) : 'Destination Port';
      lines.push(`🛫 <b>Route:</b> ${originStr} ➔ ${destStr}`);
    }
    if (shipment.departureDate) {
      lines.push(`🛫 <b>Departure:</b> ${escapeHtml(shipment.departureDate)}`);
    }
    if (shipment.estimatedArrival) {
      lines.push(`📅 <b>Estimated Arrival (ETA):</b> <b>${escapeHtml(shipment.estimatedArrival)}</b>`);
    }
    if (shipment.currentLocation) {
      lines.push(`🌐 <b>Location:</b> ${escapeHtml(shipment.currentLocation)}`);
    }
  }

  lines.push('');
  lines.push(`📸 <b>Photos:</b> <b>${shipment.totalPhotosCount}</b> inspection/yard photo(s)`);
  lines.push(`💳 <b>Invoicing:</b> ${shipment.paymentStatus === 'COMPLETED' || shipment.paymentStatus === 'PAID' ? '✅ Paid in Full' : '⏳ Payment Pending'}`);

  return lines.join('\n');
}

export function buildShipmentHeroKeyboard(
  shipment: TelegramShipmentSummary,
  index = 0,
  total = 1,
  baseUrl = 'https://www.jacxishipping.com',
  user?: TelegramLinkedUser
): { inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string; web_app?: { url: string } }>> } {
  const keyboard: Array<Array<{ text: string; callback_data?: string; url?: string; web_app?: { url: string } }>> = [];

  // Row 1: Primary actions
  const row1: Array<{ text: string; callback_data?: string }> = [];
  row1.push({
    text: `📸 Photos (${shipment.totalPhotosCount})`,
    callback_data: `photos:${shipment.id}`,
  });
  row1.push({
    text: '📍 Live Tracking',
    callback_data: `track:${shipment.id}`,
  });
  keyboard.push(row1);

  // Row 2: Carousel pagination (if multiple shipments)
  if (total > 1) {
    const prevIdx = (index - 1 + total) % total;
    const nextIdx = (index + 1) % total;
    keyboard.push([
      { text: '◀ Prev', callback_data: `shipment:page:${prevIdx}` },
      { text: `🚗 ${index + 1} / ${total}`, callback_data: 'shipment:noop' },
      { text: 'Next ▶', callback_data: `shipment:page:${nextIdx}` },
    ]);
  }

  // Row 3: Secondary actions
  keyboard.push([
    { text: '💰 Finance & Invoices', callback_data: 'finance:overview' },
    { text: '🔄 Refresh Status', callback_data: `detail:${shipment.id}:${index}` },
  ]);

  // Row 4: Web App direct portal button (bridged with token for auto-login)
  const portalUrl = buildTelegramMiniAppUrl(`/dashboard/shipments/${shipment.id}`, user, baseUrl);
  keyboard.push([
    {
      text: '🚀 Open in Jacxi Portal',
      web_app: { url: portalUrl },
    },
  ]);

  return { inline_keyboard: keyboard };
}

export function formatShipmentCard(shipment: TelegramShipmentSummary): string {
  return formatShipmentHeroCard(shipment);
}

export function formatShipmentListItem(shipment: TelegramShipmentSummary, index: number): string {
  return [
    `${index + 1}. <b>${escapeHtml(shipment.vehicleLabel)}</b>`,
    `   • Status: ${shipment.statusLabel}`,
    `   • VIN: <code>${shipment.vehicleVIN || 'N/A'}</code>`,
    `   • Container: <code>${shipment.containerNumber || 'Pending'}</code>`,
    `   • Photos: 📸 <b>${shipment.totalPhotosCount}</b> photo(s)`,
  ].join('\n');
}

export function formatFinanceTelegramMessage(finance: Awaited<ReturnType<typeof getCustomerFinanceOverview>>): string {
  const lines: string[] = [
    '💰 <b>Financial & Invoices Overview</b>',
    '━━━━━━━━━━━━━━━━━━━━━',
    `📊 <b>Current Ledger Balance:</b> <code>$${finance.currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</code>`,
    `⏳ <b>Total Due / Outstanding:</b> <code>$${finance.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</code>`,
    `✅ <b>Total Paid to Date:</b> <code>$${finance.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</code>`,
    `📦 <b>Total Active Shipments:</b> <code>${finance.shipmentsCount}</code>`,
    '',
  ];

  if (finance.recentInvoices.length > 0) {
    lines.push('📋 <b>Recent Invoices:</b>');
    finance.recentInvoices.forEach((inv) => {
      const icon = inv.status === 'PAID' ? '✅' : inv.status === 'OVERDUE' ? '🚨' : '⏳';
      const remainingStr = inv.remaining !== null && inv.remaining > 0 ? ` (Due: $${inv.remaining.toFixed(2)})` : '';
      lines.push(`${icon} <b>${escapeHtml(inv.invoiceNumber)}</b>: $${inv.total.toFixed(2)}${remainingStr} • Due: ${inv.dueDate}`);
    });
  } else {
    lines.push('✨ <i>No outstanding invoices at this time. All balances clear!</i>');
  }

  return lines.join('\n');
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
