export type VehicleRateMultiplier = {
  id: string;
  label: string;
  multiplier: number;
};

export type AuctionRateEntry = {
  stateCode: string;
  branch: string;
  city: string;
  total: number;
  loadingPoint?: string | null;
  source?: 'column' | 'flexible' | 'ai' | 'manual' | 'imported' | null;
  confidence?: 'high' | 'medium' | 'low' | null;
  sourceNote?: string | null;
};

export type ShippingRateCalculatorConfig = {
  destinationLabel: string;
  currency: string;
  fallbackRate: number;
  stateRates: Record<string, number>;
  auctionRates: AuctionRateEntry[];
  vehicleTypes: VehicleRateMultiplier[];
  updatedFromPdfName?: string | null;
  updatedAt?: string | null;
};

export const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'DC', name: 'District Of Columbia' },
  { code: 'FL', name: 'Florida' }, { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' }, { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' }, { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' }, { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' }, { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' }, { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' }, { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' }, { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' }, { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' }, { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' }, { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' }, { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' }, { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' }, { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export const DEFAULT_SHIPPING_RATE_CONFIG: ShippingRateCalculatorConfig = {
  destinationLabel: 'Jebel Ali, UAE',
  currency: 'USD',
  fallbackRate: 1200,
  stateRates: {
    AL: 1100, AK: 2500, AZ: 1250, AR: 1150, CA: 1300,
    CO: 1300, CT: 950, DE: 950, FL: 1000, GA: 1000,
    HI: 2200, ID: 1400, IL: 1200, IN: 1150, IA: 1250,
    KS: 1250, KY: 1100, LA: 1100, ME: 1100, MD: 950,
    MA: 950, MI: 1200, MN: 1300, MS: 1100, MO: 1200,
    MT: 1500, NE: 1300, NV: 1300, NH: 1000, NJ: 900,
    NM: 1300, NY: 900, NC: 1000, ND: 1400, OH: 1100,
    OK: 1200, OR: 1400, PA: 1000, RI: 950, SC: 1000,
    SD: 1400, TN: 1100, TX: 1050, UT: 1350, VT: 1000,
    VA: 950, WA: 1400, WV: 1100, WI: 1250, WY: 1400,
    DC: 950,
  },
  auctionRates: [],
  vehicleTypes: [
    { id: 'sedan', label: 'Sedan', multiplier: 1 },
    { id: 'suv', label: 'SUV / Crossover', multiplier: 1.25 },
    { id: 'pickup', label: 'Pickup Truck', multiplier: 1.4 },
    { id: 'motorcycle', label: 'Motorcycle', multiplier: 0.6 },
    { id: 'van', label: 'Van', multiplier: 1.3 },
  ],
};

const stateNameToCode = new Map(US_STATES.map((state) => [state.name.toLowerCase(), state.code]));
const stateCodes = new Set(US_STATES.map((state) => state.code));

function toPositiveNumber(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function normalizeShippingRateConfig(value: unknown): ShippingRateCalculatorConfig {
  const raw = value && typeof value === 'object' && !Array.isArray(value)
    ? value as Partial<ShippingRateCalculatorConfig>
    : {};

  const stateRates = { ...DEFAULT_SHIPPING_RATE_CONFIG.stateRates };
  if (raw.stateRates && typeof raw.stateRates === 'object' && !Array.isArray(raw.stateRates)) {
    for (const [code, rate] of Object.entries(raw.stateRates)) {
      const normalizedCode = code.toUpperCase();
      if (stateCodes.has(normalizedCode)) {
        stateRates[normalizedCode] = toPositiveNumber(rate, stateRates[normalizedCode]);
      }
    }
  }

  const auctionRates = Array.isArray(raw.auctionRates)
    ? raw.auctionRates
      .map((item) => {
        const stateCode = String(item?.stateCode ?? '').trim().toUpperCase();
        const branch = String(item?.branch ?? '').trim();
        const city = String(item?.city ?? '').trim();
        const total = toPositiveNumber(item?.total, 0);

        return {
          stateCode,
          branch,
          city,
          total,
          loadingPoint: typeof item?.loadingPoint === 'string' ? item.loadingPoint.trim() : null,
          source: ['column', 'flexible', 'ai', 'manual', 'imported'].includes(String(item?.source ?? ''))
            ? item.source as AuctionRateEntry['source']
            : null,
          confidence: ['high', 'medium', 'low'].includes(String(item?.confidence ?? ''))
            ? item.confidence as AuctionRateEntry['confidence']
            : null,
          sourceNote: typeof item?.sourceNote === 'string' ? item.sourceNote.trim() : null,
        };
      })
      .filter((item) => stateCodes.has(item.stateCode) && item.total > 0 && (item.branch || item.city))
    : [];

  const vehicleTypes = Array.isArray(raw.vehicleTypes) && raw.vehicleTypes.length
    ? raw.vehicleTypes
      .map((item) => ({
        id: String(item?.id ?? '').trim(),
        label: String(item?.label ?? '').trim(),
        multiplier: toPositiveNumber(item?.multiplier, 1),
      }))
      .filter((item) => item.id && item.label)
    : DEFAULT_SHIPPING_RATE_CONFIG.vehicleTypes;

  return {
    destinationLabel: typeof raw.destinationLabel === 'string' && raw.destinationLabel.trim()
      ? raw.destinationLabel.trim()
      : DEFAULT_SHIPPING_RATE_CONFIG.destinationLabel,
    currency: typeof raw.currency === 'string' && raw.currency.trim()
      ? raw.currency.trim().toUpperCase()
      : DEFAULT_SHIPPING_RATE_CONFIG.currency,
    fallbackRate: toPositiveNumber(raw.fallbackRate, DEFAULT_SHIPPING_RATE_CONFIG.fallbackRate),
    stateRates,
    auctionRates,
    vehicleTypes,
    updatedFromPdfName: typeof raw.updatedFromPdfName === 'string' ? raw.updatedFromPdfName : null,
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : null,
  };
}

function resolveStateCode(value: string) {
  const trimmed = value.trim();
  const upper = trimmed.toUpperCase();
  if (stateCodes.has(upper)) return upper;
  return stateNameToCode.get(trimmed.toLowerCase()) ?? null;
}

export function parseShippingRatesFromText(text: string) {
  const rates: Record<string, number> = {};
  const normalizedText = text.replace(/\r/g, '\n');
  const statePattern = new RegExp(
    `\\b(${US_STATES.map((state) => state.name.replace(/ /g, '\\s+')).join('|')}|${US_STATES.map((state) => state.code).join('|')})\\b[^\\d$]{0,40}\\$?\\s*([0-9][0-9,]*(?:\\.\\d{1,2})?)`,
    'gi',
  );

  for (const match of normalizedText.matchAll(statePattern)) {
    const code = resolveStateCode(match[1].replace(/\s+/g, ' '));
    const rate = Number(match[2].replace(/,/g, ''));
    if (code && Number.isFinite(rate) && rate >= 500) {
      rates[code] = Math.round(rate);
    }
  }

  return rates;
}

export function buildStateRatesFromAuctionRates(auctionRates: AuctionRateEntry[]) {
  const stateRates: Record<string, number> = {};

  for (const rate of auctionRates) {
    if (!stateCodes.has(rate.stateCode) || !Number.isFinite(rate.total) || rate.total <= 0) {
      continue;
    }

    stateRates[rate.stateCode] = stateRates[rate.stateCode]
      ? Math.min(stateRates[rate.stateCode], Math.round(rate.total))
      : Math.round(rate.total);
  }

  return stateRates;
}
