type IaaiVehicleJson = Record<string, unknown>;

import { fetchLotHtml, hasLotFetchProxy, type LotFetchHtmlResult } from '@/lib/lot-fetch-proxy';

export type IaaiLotVehicleData = {
  lotNumber: string;
  auctionName: 'IAAI';
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
  iaaiUrl: string;
  source: 'iaai-public-page' | 'iaai-provider-api';
  extracted: {
    bodyStyle?: string;
    damage?: string;
    odometer?: string;
    titleStatus?: string;
    branch?: string;
    saleStatus?: string;
  };
};

const IAAI_VEHICLE_URL = 'https://www.iaai.com/VehicleDetail';
const IAAI_PROVIDER_URL = process.env.IAAI_API_URL;
const IAAI_PROVIDER_KEY = process.env.IAAI_API_KEY;

function buildIaaiBlockedMessage(viaProxy: boolean) {
  if (viaProxy) {
    return 'IAAI blocked the public lot fetch even through the configured LOT_FETCH_PROXY_URL. Configure IAAI_API_URL/IAAI_API_KEY for an approved data provider, or enter the IAAI details manually.';
  }

  return 'IAAI blocked the public lot fetch from this server. Configure LOT_FETCH_PROXY_URL or IAAI_API_URL/IAAI_API_KEY for an approved data provider, or enter the IAAI details manually.';
}

function normalizeValue(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized || undefined;
}

function cleanExtractedFieldValue(value: string | undefined) {
  if (!value) return undefined;

  const cleaned = value
    .replace(/"\s*\/?>?\s*$/g, '')
    .split(/\s+-\s+(?=(Transmission|Stock|VIN|Odometer|Primary Damage|Damage|Title|Title\/Sale Doc|Loss Type|Branch|Location|Sale Status|Status|Color|Make|Model|Year)\s*:)/i)[0]
    .replace(/\s+(Transmission|Stock|VIN|Odometer|Primary Damage|Damage|Title|Title\/Sale Doc|Loss Type|Branch|Location|Sale Status|Status|Color|Make|Model|Year)\s*:.*$/i, '')
    .trim();

  return cleaned || undefined;
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function getNestedValue(source: IaaiVehicleJson, paths: string[][]) {
  for (const path of paths) {
    let current: unknown = source;
    for (const segment of path) {
      if (!current || typeof current !== 'object' || !(segment in current)) {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[segment];
    }

    const normalized = normalizeValue(current);
    if (normalized) return normalized;
  }

  return undefined;
}

function normalizeKey(key: string) {
  return key.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function findByKey(source: unknown, keys: string[], seen = new Set<unknown>()): string | undefined {
  if (!source || typeof source !== 'object' || seen.has(source)) return undefined;
  seen.add(source);

  if (Array.isArray(source)) {
    for (const item of source) {
      const found = findByKey(item, keys, seen);
      if (found) return found;
    }
    return undefined;
  }

  const record = source as Record<string, unknown>;
  const lowerKeyMap = new Map(Object.keys(record).map((key) => [key.toLowerCase(), key]));
  const normalizedKeyMap = new Map(Object.keys(record).map((key) => [normalizeKey(key), key]));

  for (const key of keys) {
    const actualKey = lowerKeyMap.get(key.toLowerCase()) || normalizedKeyMap.get(normalizeKey(key));
    if (actualKey) {
      const value = cleanExtractedFieldValue(normalizeValue(record[actualKey]));
      if (value) return value;
    }
  }

  for (const value of Object.values(record)) {
    const found = findByKey(value, keys, seen);
    if (found) return found;
  }

  return undefined;
}

function extractScriptBodies(html: string) {
  return Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => match[1]?.trim())
    .filter(Boolean);
}

function extractJsonLd(html: string) {
  const blocks = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi));
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1].trim()) as unknown;
      if (parsed && typeof parsed === 'object') {
        return parsed as IaaiVehicleJson;
      }
    } catch {
      continue;
    }
  }

  return undefined;
}

function parseJsonAt(source: string, startIndex: number) {
  const opener = source[startIndex];
  const closer = opener === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let index = startIndex; index < source.length; index += 1) {
    const char = source[index];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\') {
      escapeNext = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === opener) depth += 1;
    if (char === closer) depth -= 1;

    if (depth === 0) {
      try {
        return JSON.parse(source.slice(startIndex, index + 1)) as IaaiVehicleJson;
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

function extractScriptJsonData(html: string) {
  const dataSources: IaaiVehicleJson[] = [];

  for (const scriptBody of extractScriptBodies(html)) {
    const candidates = [
      /(?:window\.)?__INITIAL_STATE__\s*=\s*([{[])/g,
      /(?:window\.)?__PRELOADED_STATE__\s*=\s*([{[])/g,
      /(?:window\.)?initialState\s*=\s*([{[])/gi,
      /vehicle(?:Detail|Data|Info)\s*[:=]\s*([{[])/gi,
    ];

    for (const pattern of candidates) {
      for (const match of scriptBody.matchAll(pattern)) {
        if (match.index === undefined || !match[1]) continue;
        const jsonStart = match.index + match[0].lastIndexOf(match[1]);
        const parsed = parseJsonAt(scriptBody, jsonStart);
        if (parsed) dataSources.push(parsed);
      }
    }
  }

  return dataSources;
}

function extractNextData(html: string) {
  const match = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]) return undefined;

  try {
    return JSON.parse(match[1]) as IaaiVehicleJson;
  } catch {
    return undefined;
  }
}

function extractTextLines(html: string) {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style[\s\S]*?<\/style>/gi, '\n');

  return decodeHtmlEntities(withoutScripts)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li|td|th|tr|span|label|dt|dd|h\d)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function extractTextLabelValue(html: string, labels: string[]) {
  const lines = extractTextLines(html);
  const normalizedLabels = labels.map((label) => ({ label, normalized: normalizeKey(label) }));

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalizedLine = normalizeKey(line);

    for (const { label, normalized } of normalizedLabels) {
      if (normalizedLine === normalized) {
        const nextLine = lines[index + 1];
        const value = nextLine ? cleanExtractedFieldValue(normalizeValue(nextLine)) : undefined;
        if (value && normalizeKey(value) !== normalized) return value;
      }

      if (normalizedLine.startsWith(normalized)) {
        const withoutLabel = line.slice(label.length).replace(/^[:\-\s]+/, '');
        const value = cleanExtractedFieldValue(normalizeValue(withoutLabel));
        if (value && normalizeKey(value) !== normalized) return value;
      }
    }
  }

  return undefined;
}

function extractLabelValue(html: string, labels: string[]) {
  for (const label of labels) {
    const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const patterns = [
      new RegExp(`${escapedLabel}\\s*<\\/[^>]+>\\s*<[^>]+>\\s*([^<]+)`, 'i'),
      new RegExp(`${escapedLabel}\\s*[:\\-]\\s*([^<\\n\\r]+)`, 'i'),
      new RegExp(`"(${escapedLabel})"\\s*:\\s*"([^"]+)"`, 'i'),
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      const value = match?.[2] || match?.[1];
      const normalized = value ? cleanExtractedFieldValue(normalizeValue(decodeHtmlEntities(value))) : undefined;
      if (normalized && normalized.toLowerCase() !== label.toLowerCase()) return normalized;
    }
  }

  return extractTextLabelValue(html, labels);
}

function inferVehicleType(bodyStyle?: string, rawType?: string) {
  const source = `${bodyStyle || ''} ${rawType || ''}`.toLowerCase();

  if (source.includes('motorcycle') || source.includes('bike')) return 'motorcycle';
  if (source.includes('pickup') || source.includes('truck')) return 'truck';
  if (source.includes('suv') || source.includes('utility')) return 'suv';
  if (source.includes('van')) return 'van';
  if (source.includes('coupe')) return 'coupe';
  if (source.includes('convertible')) return 'convertible';
  if (source.includes('wagon')) return 'wagon';
  if (source.includes('sedan')) return 'sedan';
  return undefined;
}

function parseYearMakeModel(name?: string) {
  if (!name) return {};

  const match = name.match(/\b(19\d{2}|20\d{2})\b\s+([A-Za-z]+)\s+(.+)/);
  if (!match) return {};

  return {
    vehicleYear: match[1],
    vehicleMake: normalizeValue(match[2]),
    vehicleModel: normalizeValue(match[3]),
  };
}

function buildInternalNotes(values: {
  damage?: string;
  bodyStyle?: string;
  odometer?: string;
  titleStatus?: string;
  branch?: string;
  saleStatus?: string;
}) {
  const details = [
    values.damage ? `Damage: ${values.damage}` : undefined,
    values.bodyStyle ? `Body style: ${values.bodyStyle}` : undefined,
    values.odometer ? `Odometer: ${values.odometer}` : undefined,
    values.titleStatus ? `Title status: ${values.titleStatus}` : undefined,
    values.saleStatus ? `Sale status: ${values.saleStatus}` : undefined,
    values.branch ? `Branch: ${values.branch}` : undefined,
  ].filter(Boolean);

  return details.length > 0 ? details.join(' | ') : undefined;
}

function normalizeIaaiVehicleData(source: unknown, stockNumber: string, iaaiUrl: string, sourceName: IaaiLotVehicleData['source']): IaaiLotVehicleData {
  const vehicleYear = findByKey(source, ['vehicleModelDate', 'year', 'vehicleYear', 'modelYear', 'vehicleYearName']);
  const vehicleMake = findByKey(source, ['manufacturer', 'make', 'vehicleMake', 'makeName', 'makeDescription', 'makeDesc']);
  const vehicleModel = findByKey(source, ['model', 'vehicleModel', 'modelName', 'modelDescription', 'modelDesc']);
  const bodyStyle = findByKey(source, ['bodyStyle', 'body', 'bodyStyleName', 'bodyStyleDescription']);
  const rawVehicleType = findByKey(source, ['vehicleType', 'type']);
  const damage = findByKey(source, ['primaryDamage', 'primaryDamageDescription', 'damageDescription', 'damage', 'lossType']);
  const odometer = findByKey(source, ['odometer', 'odometerReading', 'odometerReadingString']);
  const titleStatus = findByKey(source, ['titleStatus', 'title', 'titleDocument', 'titleDocumentType']);
  const branch = findByKey(source, ['branchName', 'branch', 'location', 'yardName', 'saleLocation']);
  const saleStatus = findByKey(source, ['saleStatus', 'status', 'auctionStatus']);
  const vehicleVIN = findByKey(source, ['vin', 'VIN', 'vehicleIdentificationNumber', 'vinNumber']);
  const vehicleColor = findByKey(source, ['color', 'vehicleColor', 'exteriorColor']);

  const hasUsefulVehicleData = [
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleVIN,
    vehicleColor,
    bodyStyle,
    damage,
    branch,
  ].some(Boolean);

  if (!hasUsefulVehicleData) {
    throw new Error('IAAI data provider responded, but no vehicle details could be extracted.');
  }

  return {
    lotNumber: stockNumber,
    auctionName: 'IAAI',
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleVIN,
    vehicleColor,
    vehicleType: inferVehicleType(bodyStyle, rawVehicleType),
    purchaseLocation: branch,
    internalNotes: buildInternalNotes({ damage, bodyStyle, odometer, titleStatus, branch, saleStatus }),
    iaaiUrl,
    source: sourceName,
    extracted: {
      bodyStyle,
      damage,
      odometer,
      titleStatus,
      branch,
      saleStatus,
    },
  };
}

async function fetchIaaiLotVehicleDataFromProvider(stockNumber: string, iaaiUrl: string) {
  if (!IAAI_PROVIDER_URL) return undefined;

  const providerUrl = new URL(IAAI_PROVIDER_URL);
  providerUrl.searchParams.set('stockNumber', stockNumber);

  const response = await fetch(providerUrl, {
    headers: {
      accept: 'application/json',
      ...(IAAI_PROVIDER_KEY ? { authorization: `Bearer ${IAAI_PROVIDER_KEY}` } : {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`IAAI data provider returned status ${response.status}.`);
  }

  const payload = await response.json();
  return normalizeIaaiVehicleData(payload, stockNumber, iaaiUrl, 'iaai-provider-api');
}

function looksBlockedByIncapsula(html: string) {
  return html.includes('_Incapsula_Resource') || html.includes('Request unsuccessful. Incapsula');
}

function buildIaaiVehicleUrls(stockNumber: string) {
  if (stockNumber.includes('~')) {
    return [`${IAAI_VEHICLE_URL}/${encodeURIComponent(stockNumber)}`];
  }

  return [
    `${IAAI_VEHICLE_URL}/${encodeURIComponent(`${stockNumber}~US`)}`,
    `${IAAI_VEHICLE_URL}/${encodeURIComponent(stockNumber)}`,
  ];
}

async function fetchIaaiLotPage(urls: string[], requestHeaders: HeadersInit, useProxy = false): Promise<LotFetchHtmlResult> {
  let lastResult: LotFetchHtmlResult | null = null;
  let lastError: unknown;

  for (const url of urls) {
    try {
      const result = await fetchLotHtml(url, requestHeaders, useProxy);
      if (result.response.ok) {
        return result;
      }

      lastResult = result;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResult) {
    return lastResult;
  }

  throw lastError instanceof Error ? lastError : new Error('Failed to fetch the IAAI lot page.');
}

function extractIaaiVehicleDataFromHtml(html: string, normalizedStockNumber: string, iaaiUrl: string): IaaiLotVehicleData {
  const jsonLd = extractJsonLd(html);
  const nextData = extractNextData(html);
  const dataSources = [jsonLd, nextData, ...extractScriptJsonData(html)].filter(Boolean) as IaaiVehicleJson[];

  const name = dataSources.map((source) => findByKey(source, ['name', 'vehicleName', 'vehicleTitle', 'title', 'description'])).find(Boolean)
    || extractLabelValue(html, ['Vehicle', 'Title', 'Description']);
  const parsedName = parseYearMakeModel(name);

  const vehicleYear = extractLabelValue(html, ['Year'])
    || parsedName.vehicleYear
    || dataSources.map((source) => findByKey(source, ['vehicleYear', 'modelYear', 'vehicleModelDate', 'vehicleYearName', 'year'])).find(Boolean);
  const vehicleMake = extractLabelValue(html, ['Make'])
    || parsedName.vehicleMake
    || dataSources.map((source) => findByKey(source, ['vehicleMake', 'makeName', 'makeDescription', 'makeDesc', 'manufacturer', 'make'])).find(Boolean);
  const vehicleModel = extractLabelValue(html, ['Model'])
    || parsedName.vehicleModel
    || dataSources.map((source) => findByKey(source, ['vehicleModel', 'modelName', 'modelDescription', 'modelDesc', 'series'])).find(Boolean)
    || dataSources.map((source) => findByKey(source, ['model'])).find(Boolean);
  const bodyStyle = dataSources.map((source) => findByKey(source, ['bodyStyle', 'body', 'bodyStyleName', 'bodyStyleDescription'])).find(Boolean)
    || extractLabelValue(html, ['Body Style', 'Body', 'Vehicle Type']);
  const rawVehicleType = dataSources.map((source) => getNestedValue(source, [['vehicleType'], ['type']])).find(Boolean);
  const damage = dataSources.map((source) => findByKey(source, ['primaryDamage', 'primaryDamageDescription', 'damageDescription', 'damage', 'lossType'])).find(Boolean)
    || extractLabelValue(html, ['Primary Damage', 'Damage', 'Loss Type']);
  const odometer = dataSources.map((source) => findByKey(source, ['odometer', 'odometerReading', 'odometerReadingString'])).find(Boolean)
    || extractLabelValue(html, ['Odometer', 'Odometer Reading']);
  const titleStatus = dataSources.map((source) => findByKey(source, ['titleStatus', 'title', 'titleDocument', 'titleDocumentType'])).find(Boolean)
    || extractLabelValue(html, ['Title/Sale Doc', 'Title Status', 'Title']);
  const branch = dataSources.map((source) => findByKey(source, ['branchName', 'branch', 'location', 'yardName', 'saleLocation'])).find(Boolean)
    || extractLabelValue(html, ['Branch', 'Location', 'Selling Branch', 'Sale Location']);
  const saleStatus = dataSources.map((source) => findByKey(source, ['saleStatus', 'status', 'auctionStatus'])).find(Boolean)
    || extractLabelValue(html, ['Sale Status', 'Status']);
  const vehicleVIN = dataSources.map((source) => findByKey(source, ['vin', 'VIN', 'vehicleIdentificationNumber', 'vinNumber'])).find(Boolean)
    || extractLabelValue(html, ['VIN', 'Vehicle Identification Number']);
  const vehicleColor = dataSources.map((source) => findByKey(source, ['color', 'vehicleColor', 'exteriorColor'])).find(Boolean)
    || extractLabelValue(html, ['Color', 'Exterior Color']);

  const hasUsefulVehicleData = [
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleVIN,
    vehicleColor,
    bodyStyle,
    damage,
    branch,
  ].some(Boolean);

  if (!hasUsefulVehicleData) {
    throw new Error('IAAI lot page loaded, but no vehicle details could be extracted.');
  }

  return {
    lotNumber: normalizedStockNumber,
    auctionName: 'IAAI',
    vehicleMake,
    vehicleModel,
    vehicleYear,
    vehicleVIN,
    vehicleColor,
    vehicleType: inferVehicleType(bodyStyle, rawVehicleType),
    purchaseLocation: branch,
    internalNotes: buildInternalNotes({ damage, bodyStyle, odometer, titleStatus, branch, saleStatus }),
    iaaiUrl,
    source: 'iaai-public-page',
    extracted: {
      bodyStyle,
      damage,
      odometer,
      titleStatus,
      branch,
      saleStatus,
    },
  };
}

export async function fetchIaaiLotVehicleData(stockNumber: string): Promise<IaaiLotVehicleData> {
  const normalizedStockNumber = normalizeValue(stockNumber);
  if (!normalizedStockNumber || !/^[a-zA-Z0-9~-]{4,40}$/.test(normalizedStockNumber)) {
    throw new Error('IAAI stock numbers must be 4-40 letters, numbers, hyphens, or region suffixes like ~US.');
  }

  const [primaryIaaiUrl, ...fallbackIaaiUrls] = buildIaaiVehicleUrls(normalizedStockNumber);
  const iaaiUrl = primaryIaaiUrl;
  const providerData = await fetchIaaiLotVehicleDataFromProvider(normalizedStockNumber, iaaiUrl);
  if (providerData) {
    return providerData;
  }

  const requestHeaders = {
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  };

  const urlCandidates = [iaaiUrl, ...fallbackIaaiUrls];

  let page = await (async () => {
    try {
      return await fetchIaaiLotPage(urlCandidates, requestHeaders);
    } catch (error) {
      if (!hasLotFetchProxy()) throw error;
      return fetchIaaiLotPage(urlCandidates, requestHeaders, true);
    }
  })();

  if (!page.response.ok && hasLotFetchProxy() && !page.viaProxy) {
    page = await fetchIaaiLotPage(urlCandidates, requestHeaders, true);
  }

  if (!page.response.ok) {
    throw new Error(`IAAI returned status ${page.response.status}.`);
  }

  if (looksBlockedByIncapsula(page.html)) {
    if (!page.viaProxy && hasLotFetchProxy()) {
      page = await fetchIaaiLotPage(urlCandidates, requestHeaders, true);
    }

    if (looksBlockedByIncapsula(page.html)) {
      throw new Error(buildIaaiBlockedMessage(page.viaProxy));
    }
  }

  try {
    return extractIaaiVehicleDataFromHtml(page.html, normalizedStockNumber, page.requestUrl);
  } catch (error) {
    const shouldRetryWithProxy = !page.viaProxy && hasLotFetchProxy() && error instanceof Error && error.message.includes('no vehicle details could be extracted');

    if (!shouldRetryWithProxy) {
      if (error instanceof Error && error.message.includes('no vehicle details could be extracted')) {
        throw new Error(`${error.message} Configure LOT_FETCH_PROXY_URL or IAAI_API_URL/IAAI_API_KEY for Vercel, or enter the IAAI details manually.`);
      }

      throw error;
    }

    page = await fetchIaaiLotPage(urlCandidates, requestHeaders, true);

    if (!page.response.ok) {
      throw new Error(`IAAI returned status ${page.response.status}.`);
    }

    if (looksBlockedByIncapsula(page.html)) {
      throw new Error(buildIaaiBlockedMessage(true));
    }

    return extractIaaiVehicleDataFromHtml(page.html, normalizedStockNumber, page.requestUrl);
  }
}
