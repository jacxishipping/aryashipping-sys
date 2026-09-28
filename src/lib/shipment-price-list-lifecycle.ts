import {
  Prisma,
  ShipmentBillingMilestone,
  ShipmentChargeCategory,
  ShipmentChargeSourceType,
} from '@prisma/client';
import { prisma } from '@/lib/db';
import { normalizeShippingRateConfig, type AuctionRateEntry } from '@/lib/shipping-rate-calculator';
import { upsertShipmentSystemCharge } from '@/lib/billing/shipment-charges';

type DbClient = Prisma.TransactionClient | typeof prisma;

type LifecyclePhase = 'DISPATCH' | 'SHIPPING';

type PriceListShipment = {
  id: string;
  userId: string;
  shippingCompanyId?: string | null;
  vehicleType?: string | null;
  vehicleYear?: number | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleVIN?: string | null;
  auctionName?: string | null;
  purchaseLocation?: string | null;
  price?: number | null;
  priceListPricingSnapshot?: Prisma.JsonValue | null;
};

type PriceListCompany = {
  id: string;
  name: string;
  priceListConfig: Prisma.JsonValue;
  priceLists?: Array<{
    id: string;
    name: string;
    sourceFileName: string;
    destinationLabel: string;
    config: Prisma.JsonValue;
  }>;
};

export type LifecyclePriceListPricingResult = {
  posted: boolean;
  reason?: string;
  totalPrice?: number;
  dispatchAmount?: number;
  shippingAmount?: number;
  priceListId?: string | null;
  matchLabel?: string;
};

const DEFAULT_DISPATCH_SHARE = 0.3;

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function asInputObject(value: Record<string, unknown>) {
  return value as Prisma.InputJsonObject;
}

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeText(value?: string | null) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function vehicleLabel(shipment: PriceListShipment) {
  const label = [shipment.vehicleYear, shipment.vehicleMake, shipment.vehicleModel].filter(Boolean).join(' ').trim();
  return shipment.vehicleVIN && label ? `${label} (${shipment.vehicleVIN})` : shipment.vehicleVIN || label || shipment.id;
}

function scoreLane(rate: AuctionRateEntry, shipment: PriceListShipment) {
  const branch = normalizeText(shipment.auctionName);
  const city = normalizeText(shipment.purchaseLocation);
  let score = 0;

  if (branch && normalizeText(rate.branch) === branch) score += 3;
  if (city && normalizeText(rate.city) === city) score += 3;
  if (city && normalizeText(rate.branch) === city) score += 2;
  if (branch && normalizeText(rate.city) === branch) score += 2;

  return score;
}

function resolvePriceFromCompanyPriceList(shipment: PriceListShipment, company: PriceListCompany) {
  const activePriceList = company.priceLists?.[0] || null;
  const config = normalizeShippingRateConfig(activePriceList?.config || company.priceListConfig);
  const rawState = String(shipment.purchaseLocation || shipment.auctionName || '').trim().toUpperCase();
  const stateCode = rawState.length === 2 ? rawState : null;
  const stateAuctionRates = stateCode
    ? config.auctionRates.filter((rate) => rate.stateCode === stateCode)
    : config.auctionRates;
  const scoredRows = stateAuctionRates
    .map((rate) => ({ rate, score: scoreLane(rate, shipment) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.rate.total - right.rate.total);
  const matchedRate = scoredRows[0]?.rate || (stateCode ? null : stateAuctionRates[0] || null);
  const stateRate = stateCode ? config.stateRates[stateCode] : null;
  const basePrice = matchedRate?.total || stateRate || null;

  if (!basePrice || !Number.isFinite(basePrice) || basePrice <= 0) {
    return null;
  }

  return {
    priceListId: activePriceList?.id || null,
    priceListName: activePriceList?.name || 'Company price list',
    sourceFileName: activePriceList?.sourceFileName || config.updatedFromPdfName || null,
    destinationLabel: activePriceList?.destinationLabel || config.destinationLabel,
    totalPrice: roundMoney(basePrice),
    currency: config.currency || 'USD',
    stateCode: matchedRate?.stateCode || stateCode,
    branch: matchedRate?.branch || shipment.auctionName || null,
    city: matchedRate?.city || shipment.purchaseLocation || null,
    loadingPoint: matchedRate?.loadingPoint || null,
    matchSource: matchedRate ? 'auction_lane' : 'state_rate',
    confidence: matchedRate?.confidence || (matchedRate ? 'medium' : 'low'),
  };
}

function buildSnapshot(
  shipment: PriceListShipment,
  company: PriceListCompany,
  pricing: NonNullable<ReturnType<typeof resolvePriceFromCompanyPriceList>>,
) {
  const dispatchAmount = roundMoney(pricing.totalPrice * DEFAULT_DISPATCH_SHARE);
  const shippingAmount = roundMoney(pricing.totalPrice - dispatchAmount);
  const existing = asRecord(shipment.priceListPricingSnapshot);
  const posted = asRecord(existing.posted as Prisma.JsonValue | null);

  return asInputObject({
    ...existing,
    source: 'company-price-list',
    companyId: company.id,
    companyName: company.name,
    priceListId: pricing.priceListId,
    priceListName: pricing.priceListName,
    sourceFileName: pricing.sourceFileName,
    destinationLabel: pricing.destinationLabel,
    totalPrice: pricing.totalPrice,
    dispatchAmount,
    shippingAmount,
    dispatchShare: DEFAULT_DISPATCH_SHARE,
    currency: pricing.currency,
    matchedLane: {
      stateCode: pricing.stateCode,
      branch: pricing.branch,
      city: pricing.city,
      loadingPoint: pricing.loadingPoint,
      source: pricing.matchSource,
      confidence: pricing.confidence,
    },
    posted: asInputObject(posted),
    calculatedAt: new Date().toISOString(),
  });
}

function markSnapshotPosted(snapshot: Prisma.InputJsonValue, phase: LifecyclePhase, chargeId: string) {
  const record = asRecord(snapshot as Prisma.JsonValue);
  const posted = asRecord(record.posted as Prisma.JsonValue | null);

  return asInputObject({
    ...record,
    posted: asInputObject({
      ...posted,
      [phase.toLowerCase()]: {
        chargeId,
        postedAt: new Date().toISOString(),
      },
    }),
  });
}

export async function postShipmentPriceListLifecycleCharge(
  db: DbClient,
  input: {
    shipmentId: string;
    companyId: string | null | undefined;
    phase: LifecyclePhase;
    actorId: string;
  },
): Promise<LifecyclePriceListPricingResult> {
  if (!input.companyId) {
    return { posted: false, reason: 'missing_company' };
  }

  const [shipment, company] = await Promise.all([
    db.shipment.findUnique({
      where: { id: input.shipmentId },
      select: {
        id: true,
        userId: true,
        shippingCompanyId: true,
        vehicleType: true,
        vehicleYear: true,
        vehicleMake: true,
        vehicleModel: true,
        vehicleVIN: true,
        auctionName: true,
        purchaseLocation: true,
        price: true,
        priceListPricingSnapshot: true,
      },
    }),
    db.company.findUnique({
      where: { id: input.companyId },
      select: {
        id: true,
        name: true,
        priceListConfig: true,
        priceLists: {
          where: { isActive: true },
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            sourceFileName: true,
            destinationLabel: true,
            config: true,
          },
        },
      },
    }),
  ]);

  if (!shipment) return { posted: false, reason: 'missing_shipment' };
  if (!company) return { posted: false, reason: 'missing_company' };

  const pricing = resolvePriceFromCompanyPriceList(shipment, company);
  if (!pricing) {
    return { posted: false, reason: 'no_matching_price' };
  }

  const snapshot = buildSnapshot(shipment, company, pricing);
  const snapshotRecord = asRecord(snapshot as Prisma.JsonValue);
  const amount = input.phase === 'DISPATCH'
    ? Number(snapshotRecord.dispatchAmount)
    : Number(snapshotRecord.shippingAmount);

  if (!amount || amount <= 0) {
    return { posted: false, reason: 'zero_amount' };
  }

  const charge = await upsertShipmentSystemCharge(db, {
    shipmentId: shipment.id,
    userId: shipment.userId,
    sourceType: ShipmentChargeSourceType.SYSTEM,
    sourceId: `price-list:${input.phase.toLowerCase()}:${shipment.id}`,
    chargeCode: input.phase === 'DISPATCH' ? 'PRICE_LIST_DISPATCH' : 'PRICE_LIST_SHIPPING',
    category: input.phase === 'DISPATCH' ? ShipmentChargeCategory.HANDLING : ShipmentChargeCategory.SHIPPING,
    billingMilestone: input.phase === 'DISPATCH' ? ShipmentBillingMilestone.ORIGIN_HANDOFF : ShipmentBillingMilestone.OCEAN_FREIGHT,
    description: `${input.phase === 'DISPATCH' ? 'Dispatch' : 'Shipping'} charge from ${pricing.priceListName} for ${vehicleLabel(shipment)}`,
    quantity: 1,
    unitAmount: amount,
    totalAmount: amount,
    currency: pricing.currency,
    actorId: input.actorId,
    notes: `Auto-posted from company price list during ${input.phase.toLowerCase()} lifecycle`,
    metadata: asInputObject({
      source: 'company-price-list-lifecycle',
      phase: input.phase,
      companyId: company.id,
      companyName: company.name,
      priceListId: pricing.priceListId,
      priceListName: pricing.priceListName,
      sourceFileName: pricing.sourceFileName,
      totalPrice: pricing.totalPrice,
      dispatchShare: DEFAULT_DISPATCH_SHARE,
      matchedLane: snapshotRecord.matchedLane as Prisma.InputJsonValue,
    }),
  });

  const updatedSnapshot = markSnapshotPosted(snapshot, input.phase, charge.id);

  await db.shipment.update({
    where: { id: shipment.id },
    data: {
      price: shipment.price ?? pricing.totalPrice,
      shippingCompanyId: input.phase === 'SHIPPING' ? company.id : shipment.shippingCompanyId,
      priceListPricingSnapshot: updatedSnapshot,
    },
  });

  return {
    posted: true,
    totalPrice: pricing.totalPrice,
    dispatchAmount: Number(snapshotRecord.dispatchAmount),
    shippingAmount: Number(snapshotRecord.shippingAmount),
    priceListId: pricing.priceListId,
    matchLabel: [pricing.stateCode, pricing.branch, pricing.city].filter(Boolean).join(' / '),
  };
}
