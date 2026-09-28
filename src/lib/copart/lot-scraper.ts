type CopartDynamicLotDetails = {
  saleStatus?: string;
};

import { fetchLotHtml, hasLotFetchProxy } from '@/lib/lot-fetch-proxy';

type OxylabsCopartParsedContent = {
  vin?: string;
  color?: string;
  notes?: string;
  title?: string;
  has_key?: boolean;
  odometer?: string;
  cylinders?: number | string;
  sale_date?: string;
  body_style?: string;
  drivetrain?: string;
  highlights?: string;
  lot_number?: string;
  engine_type?: string;
  transmission?: boolean | string;
  vehicle_type?: string;
  primary_damage?: string;
  estimated_retail_value?: number;
};

type OxylabsCopartResult = {
  content?: OxylabsCopartParsedContent;
  url?: string;
  status_code?: number;
};

type OxylabsCopartJobPayload = {
  id?: string;
  status?: string;
  results?: OxylabsCopartResult[];
};

type CopartLotRawPayload = {
  lotNumberStr?: string;
  lcy?: number;
  mkn?: string;
  lm?: string;
  lmg?: string;
  fv?: string;
  clr?: string;
  dd?: string;
  bstl?: string;
  vehTypDesc?: string;
  tmtp?: string;
  egn?: string;
  cy?: string;
  yn?: string;
  locCity?: string;
  locState?: string;
  locCountry?: string;
  hk?: string;
  htsmn?: string;
  brand?: string;
  dynamicLotDetails?: CopartDynamicLotDetails;
};

export type CopartLotVehicleData = {
  lotNumber: string;
  auctionName: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  vehicleVIN?: string;
  vehicleColor?: string;
  vehicleType?: string;
  hasKey?: boolean;
  hasTitle?: boolean;
  purchaseDate?: string;
  purchaseLocation?: string;
  internalNotes?: string;
  copartUrl: string;
  source: 'copart-public-page' | 'copart-oxylabs-data-api';
  extracted: {
    bodyStyle?: string;
    damage?: string;
    transmission?: string;
    engine?: string;
    cylinders?: string;
    saleStatus?: string;
    yardName?: string;
  };
};

const COPART_LOT_URL = 'https://www.copart.com/lot';
const OXYLABS_DATA_API_URL = 'https://data.oxylabs.io/v1/queries';
const OXYLABS_COPART_POLL_ATTEMPTS = 20;
const OXYLABS_COPART_POLL_INTERVAL_MS = 2000;

function getOxylabsDataApiUsername() {
  return normalizeValue(process.env.OXYLABS_DATA_API_USERNAME);
}

function getOxylabsDataApiPassword() {
  return normalizeValue(process.env.OXYLABS_DATA_API_PASSWORD);
}

function getOxylabsCopartParserPreset() {
  return normalizeValue(process.env.OXYLABS_COPART_PARSER_PRESET) || 'shkrcopart';
}

function hasOxylabsCopartProvider() {
  return Boolean(getOxylabsDataApiUsername() && getOxylabsDataApiPassword());
}

export function getCopartDataProviderDebugInfo() {
  return {
    hasOxylabsDataApi: hasOxylabsCopartProvider(),
    oxylabsParserPreset: getOxylabsCopartParserPreset(),
    hasLotFetchProxy: hasLotFetchProxy(),
  };
}

function looksBlockedByCopart(html: string) {
  return /_Incapsula_Resource|Request unsuccessful\. Incapsula|captcha|pardon our interruption|access denied/i.test(html);
}

function buildCopartBlockedMessage(viaProxy: boolean) {
  if (viaProxy) {
    return 'Copart blocked the public lot fetch even through the configured LOT_FETCH_PROXY_URL. Datacenter proxies can still be blocked by Incapsula; use a residential or unblocker-grade proxy/provider in Vercel, or enter the Copart details manually.';
  }

  return 'Copart blocked the public lot fetch from this server. Configure LOT_FETCH_PROXY_URL in Vercel, or enter the Copart details manually.';
}

function buildCopartStatusMessage(status: number, viaProxy: boolean) {
  if ([403, 429].includes(status) || status >= 500) {
    return buildCopartBlockedMessage(viaProxy);
  }

  return `Copart returned status ${status}.`;
}

function buildOxylabsCopartErrorMessage(message: string) {
  return `Oxylabs Copart data API failed. ${message}`;
}

function normalizeValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

function parseYesNo(value: string | null | undefined) {
  if (!value) {
    return undefined;
  }

  if (value === 'Y' || value === 'YES') {
    return true;
  }

  if (value === 'N' || value === 'NO') {
    return false;
  }

  return undefined;
}

function inferVehicleType(bodyStyle?: string, vehicleTypeDescription?: string) {
  const source = `${bodyStyle || ''} ${vehicleTypeDescription || ''}`.toLowerCase();

  if (source.includes('motorcycle') || source.includes('bike')) return 'motorcycle';
  if (source.includes('pickup') || source.includes('truck')) return 'truck';
  if (source.includes('suv') || source.includes('utility')) return 'suv';
  if (source.includes('van') || source.includes('cargo van')) return 'van';
  if (source.includes('coupe')) return 'coupe';
  if (source.includes('convertible') || source.includes('cabriolet')) return 'convertible';
  if (source.includes('wagon')) return 'wagon';
  if (source.includes('sedan')) return 'sedan';
  if (source.includes('automobile')) return 'sedan';
  return undefined;
}

function buildLocation(raw: CopartLotRawPayload) {
  const detailedLocation = [raw.locCity, raw.locState, raw.locCountry]
    .map((value) => normalizeValue(value))
    .filter(Boolean)
    .join(', ');

  return detailedLocation || normalizeValue(raw.yn);
}

function buildInternalNotes(raw: CopartLotRawPayload) {
  const details = [
    normalizeValue(raw.dd) ? `Damage: ${normalizeValue(raw.dd)}` : undefined,
    normalizeValue(raw.bstl) ? `Body style: ${normalizeValue(raw.bstl)}` : undefined,
    normalizeValue(raw.tmtp) ? `Transmission: ${normalizeValue(raw.tmtp)}` : undefined,
    normalizeValue(raw.egn) ? `Engine: ${normalizeValue(raw.egn)}` : undefined,
    normalizeValue(raw.cy) ? `Cylinders: ${normalizeValue(raw.cy)}` : undefined,
    normalizeValue(raw.dynamicLotDetails?.saleStatus)
      ? `Sale status: ${normalizeValue(raw.dynamicLotDetails?.saleStatus)}`
      : undefined,
    normalizeValue(raw.yn) ? `Yard: ${normalizeValue(raw.yn)}` : undefined,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' | ') : undefined;
}

function buildOxylabsLocation(notes?: string) {
  const normalized = normalizeValue(notes);
  if (!normalized) return undefined;

  return normalizeValue(normalized.replace(/^located in\s+/i, '')) || normalized;
}

function parseCopartSaleDateToPurchaseDate(value?: string) {
  const normalized = normalizeValue(value);
  if (!normalized) return undefined;

  const monthMatch = normalized.match(/\b(Jan|January|Feb|February|Mar|March|Apr|April|May|Jun|June|Jul|July|Aug|August|Sep|Sept|September|Oct|October|Nov|November|Dec|December)\b\.?\s+(\d{1,2}),\s*(\d{4})/i);
  if (!monthMatch) return undefined;

  const rawMonth = monthMatch[1].toLowerCase();
  const day = monthMatch[2].padStart(2, '0');
  const year = monthMatch[3];
  const months: Record<string, string> = {
    jan: '01',
    january: '01',
    feb: '02',
    february: '02',
    mar: '03',
    march: '03',
    apr: '04',
    april: '04',
    may: '05',
    jun: '06',
    june: '06',
    jul: '07',
    july: '07',
    aug: '08',
    august: '08',
    sep: '09',
    sept: '09',
    september: '09',
    oct: '10',
    october: '10',
    nov: '11',
    november: '11',
    dec: '12',
    december: '12',
  };

  const month = months[rawMonth];
  if (!month) return undefined;

  return `${year}-${month}-${day}`;
}

function buildOxylabsInternalNotes(content: OxylabsCopartParsedContent) {
  const details = [
    normalizeValue(content.primary_damage) ? `Damage: ${normalizeValue(content.primary_damage)}` : undefined,
    normalizeValue(content.body_style) ? `Body style: ${normalizeValue(content.body_style)}` : undefined,
    normalizeValue(content.engine_type) ? `Engine: ${normalizeValue(content.engine_type)}` : undefined,
    normalizeValue(content.cylinders) ? `Cylinders: ${normalizeValue(content.cylinders)}` : undefined,
    normalizeValue(content.odometer) ? `Odometer: ${normalizeValue(content.odometer)}` : undefined,
    normalizeValue(content.drivetrain) ? `Drivetrain: ${normalizeValue(content.drivetrain)}` : undefined,
    normalizeValue(content.highlights) ? `Highlights: ${normalizeValue(content.highlights)}` : undefined,
    normalizeValue(content.sale_date) ? `Sale date: ${normalizeValue(content.sale_date)}` : undefined,
    typeof content.estimated_retail_value === 'number'
      ? `Estimated retail value: $${content.estimated_retail_value.toLocaleString()}`
      : undefined,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' | ') : undefined;
}

function parseOxylabsTitle(title?: string) {
  const normalized = normalizeValue(title);
  if (!normalized) {
    return {
      vehicleYear: undefined,
      vehicleMake: undefined,
      vehicleModel: undefined,
    };
  }

  const match = normalized.match(/\b(19\d{2}|20\d{2})\b\s+([^\s]+)\s+(.+)/);
  if (!match) {
    return {
      vehicleYear: undefined,
      vehicleMake: undefined,
      vehicleModel: normalized,
    };
  }

  return {
    vehicleYear: normalizeValue(match[1]),
    vehicleMake: normalizeValue(match[2]),
    vehicleModel: normalizeValue(match[3]),
  };
}

function normalizeOxylabsCopartResult(lotNumber: string, fallbackUrl: string, result: OxylabsCopartResult): CopartLotVehicleData {
  const content = result.content || {};
  const titleParts = parseOxylabsTitle(content.title);
  const purchaseLocation = buildOxylabsLocation(content.notes);
  const purchaseDate = parseCopartSaleDateToPurchaseDate(content.sale_date);

  return {
    lotNumber: normalizeValue(content.lot_number) || lotNumber,
    auctionName: 'Copart',
    vehicleMake: titleParts.vehicleMake,
    vehicleModel: titleParts.vehicleModel,
    vehicleYear: titleParts.vehicleYear,
    vehicleVIN: normalizeValue(content.vin),
    vehicleColor: normalizeValue(content.color),
    vehicleType: inferVehicleType(normalizeValue(content.body_style), normalizeValue(content.vehicle_type)),
    hasKey: typeof content.has_key === 'boolean' ? content.has_key : undefined,
    hasTitle: undefined,
    purchaseDate,
    purchaseLocation,
    internalNotes: buildOxylabsInternalNotes(content),
    copartUrl: normalizeValue(result.url) || fallbackUrl,
    source: 'copart-oxylabs-data-api',
    extracted: {
      bodyStyle: normalizeValue(content.body_style),
      damage: normalizeValue(content.primary_damage),
      transmission: typeof content.transmission === 'string' ? normalizeValue(content.transmission) : undefined,
      engine: normalizeValue(content.engine_type),
      cylinders: normalizeValue(content.cylinders),
      saleStatus: undefined,
      yardName: purchaseLocation,
    },
  };
}

async function fetchOxylabsJson<T>(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as T;
  return { response, payload };
}

async function waitForOxylabsCopartJob(jobId: string, authHeader: string) {
  for (let attempt = 0; attempt < OXYLABS_COPART_POLL_ATTEMPTS; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, OXYLABS_COPART_POLL_INTERVAL_MS));
    }

    const { response, payload } = await fetchOxylabsJson<OxylabsCopartJobPayload>(
      `${OXYLABS_DATA_API_URL}/${jobId}`,
      {
        headers: {
          Authorization: authHeader,
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      throw new Error(buildOxylabsCopartErrorMessage(`job polling returned status ${response.status}.`));
    }

    if (payload.status === 'done') {
      return;
    }

    if (payload.status === 'failed') {
      throw new Error(buildOxylabsCopartErrorMessage('job polling reported a failed status.'));
    }
  }

  throw new Error(buildOxylabsCopartErrorMessage('timed out waiting for the job to finish.'));
}

async function fetchCopartLotVehicleDataFromOxylabs(lotNumber: string, copartUrl: string): Promise<CopartLotVehicleData> {
  const username = getOxylabsDataApiUsername();
  const password = getOxylabsDataApiPassword();
  if (!username || !password) {
    throw new Error(buildOxylabsCopartErrorMessage('OXYLABS_DATA_API_USERNAME or OXYLABS_DATA_API_PASSWORD is missing.'));
  }

  const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
  const createBody = {
    source: 'universal',
    url: copartUrl,
    user_agent_type: 'desktop_edge',
    geo_location: 'United States',
    render: 'html',
    parse: true,
    parser_preset: getOxylabsCopartParserPreset(),
  };

  const { response: createResponse, payload: createPayload } = await fetchOxylabsJson<OxylabsCopartJobPayload>(
    OXYLABS_DATA_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(createBody),
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      cache: 'no-store',
    },
  );

  const immediateResult = createPayload.results?.[0];
  if (createResponse.ok && immediateResult?.content) {
    return normalizeOxylabsCopartResult(lotNumber, copartUrl, immediateResult);
  }

  const jobId = normalizeValue(createPayload.id);
  if (!jobId) {
    throw new Error(buildOxylabsCopartErrorMessage(`job creation returned status ${createResponse.status} without a job id.`));
  }

  await waitForOxylabsCopartJob(jobId, authHeader);

  const { response: resultsResponse, payload: resultsPayload } = await fetchOxylabsJson<OxylabsCopartJobPayload>(
    `${OXYLABS_DATA_API_URL}/${jobId}/results?type=parsed`,
    {
      headers: {
        Authorization: authHeader,
      },
      cache: 'no-store',
    },
  );

  const result = resultsPayload.results?.[0];
  if (result?.content) {
    return normalizeOxylabsCopartResult(lotNumber, copartUrl, result);
  }

  throw new Error(buildOxylabsCopartErrorMessage(`results endpoint returned status ${resultsResponse.status} without parsed content.`));
}

function extractLotPayload(html: string) {
  const match = html.match(/cachedSolrLotDetailsStr:\s*"((?:\\.|[^"\\])*)"/);
  if (!match?.[1]) {
    throw new Error('Copart lot payload was not found on the public page.');
  }

  const rawJsonString = JSON.parse(`"${match[1]}"`) as string;
  return JSON.parse(rawJsonString) as CopartLotRawPayload;
}

function tryExtractLotPayload(html: string) {
  try {
    return extractLotPayload(html);
  } catch {
    return undefined;
  }
}

export async function fetchCopartLotVehicleData(lotNumber: string): Promise<CopartLotVehicleData> {
  const normalizedLotNumber = normalizeValue(lotNumber);
  if (!normalizedLotNumber || !/^\d{5,12}$/.test(normalizedLotNumber)) {
    throw new Error('Copart lot numbers must be numeric.');
  }

  const copartUrl = `${COPART_LOT_URL}/${normalizedLotNumber}`;
  let oxylabsError: Error | undefined;

  if (hasOxylabsCopartProvider()) {
    try {
      return await fetchCopartLotVehicleDataFromOxylabs(normalizedLotNumber, copartUrl);
    } catch (error) {
      oxylabsError = error instanceof Error ? error : new Error(String(error));
    }
  }

  const requestHeaders = {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };

  let page = await (async () => {
    try {
      return await fetchLotHtml(copartUrl, requestHeaders);
    } catch (error) {
      if (!hasLotFetchProxy()) throw error;
      return fetchLotHtml(copartUrl, requestHeaders, true);
    }
  })();

  let raw = tryExtractLotPayload(page.html);

  if (!raw && hasLotFetchProxy() && !page.viaProxy) {
    page = await fetchLotHtml(copartUrl, requestHeaders, true);
    raw = tryExtractLotPayload(page.html);
  }

  if (!raw) {
    if (looksBlockedByCopart(page.html)) {
      throw new Error(oxylabsError ? `${buildCopartBlockedMessage(page.viaProxy)} Oxylabs data API also failed: ${oxylabsError.message}` : buildCopartBlockedMessage(page.viaProxy));
    }

    if (!page.response.ok) {
      throw new Error(oxylabsError ? `${buildCopartStatusMessage(page.response.status, page.viaProxy)} Oxylabs data API also failed: ${oxylabsError.message}` : buildCopartStatusMessage(page.response.status, page.viaProxy));
    }

    throw new Error(oxylabsError ? `Copart lot payload was not found on the public page. Oxylabs data API also failed: ${oxylabsError.message}` : 'Copart lot payload was not found on the public page.');
  }

  return {
    lotNumber: normalizeValue(raw.lotNumberStr) || normalizedLotNumber,
    auctionName: normalizeValue(raw.brand) || 'Copart',
    vehicleMake: normalizeValue(raw.mkn),
    vehicleModel: normalizeValue(raw.lm) || normalizeValue(raw.lmg),
    vehicleYear: raw.lcy ? String(raw.lcy) : undefined,
    vehicleVIN: normalizeValue(raw.fv),
    vehicleColor: normalizeValue(raw.clr),
    vehicleType: inferVehicleType(normalizeValue(raw.bstl), normalizeValue(raw.vehTypDesc)),
    hasKey: parseYesNo(raw.hk),
    hasTitle: parseYesNo(raw.htsmn),
    purchaseLocation: buildLocation(raw),
    internalNotes: buildInternalNotes(raw),
    copartUrl,
    source: 'copart-public-page',
    extracted: {
      bodyStyle: normalizeValue(raw.bstl),
      damage: normalizeValue(raw.dd),
      transmission: normalizeValue(raw.tmtp),
      engine: normalizeValue(raw.egn),
      cylinders: normalizeValue(raw.cy),
      saleStatus: normalizeValue(raw.dynamicLotDetails?.saleStatus),
      yardName: normalizeValue(raw.yn),
    },
  };
}