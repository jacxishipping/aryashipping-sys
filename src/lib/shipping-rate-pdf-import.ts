import {
  type AuctionRateEntry,
  buildStateRatesFromAuctionRates,
  parseShippingRatesFromText,
  US_STATES,
} from '@/lib/shipping-rate-calculator';
import { ensurePdfNodePolyfills } from '@/lib/pdf-node-polyfills';

type PdfTextItem = {
  str: string;
  x: number;
  y: number;
};

export type PriceListParserStats = {
  columnRows: number;
  flexibleRows: number;
  directRows: number;
  guessedRows: number;
  aiRows: number;
  totalRows: number;
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
};

const stateHeaderPattern = /^([A-Z][A-Z\s.]+)\(([A-Z]{2})\)$/;
const stateCodes = new Set(US_STATES.map((state) => state.code));
const stateNameToCode = new Map(US_STATES.map((state) => [state.name.toUpperCase(), state.code]));
const stateNamePattern = new RegExp(
  `\\b(${US_STATES.map((state) => state.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
  'i',
);

function parseMoney(value: string) {
  const parsed = Number(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function isMoney(value: string) {
  return /^\$?\s*[0-9][0-9,]*(?:\.\d{1,2})?$/.test(value.trim());
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function splitRowCells(line: string) {
  return line
    .split(/\s*\|\s*|\t+|\s*,\s*|\s{2,}/)
    .map(normalizeText)
    .filter(Boolean);
}

function resolveStateCode(value: string) {
  const normalized = normalizeText(value).replace(/[().]/g, '').toUpperCase();
  if (stateCodes.has(normalized)) return normalized;
  return stateNameToCode.get(normalized) ?? null;
}

function findStateInText(line: string) {
  const codeMatch = line.match(/\b([A-Z]{2})\b/);
  if (codeMatch && stateCodes.has(codeMatch[1])) {
    return {
      stateCode: codeMatch[1],
      matchText: codeMatch[0],
      index: codeMatch.index ?? -1,
    };
  }

  const nameMatch = line.match(stateNamePattern);
  if (nameMatch) {
    const stateCode = stateNameToCode.get(nameMatch[1].toUpperCase());
    if (stateCode) {
      return {
        stateCode,
        matchText: nameMatch[0],
        index: nameMatch.index ?? -1,
      };
    }
  }

  return null;
}

function findMoneyInText(line: string) {
  const matches = [...line.matchAll(/\$?\s*[0-9][0-9,]*(?:\.\d{1,2})?/g)]
    .map((match) => ({
      text: match[0],
      index: match.index ?? -1,
      amount: parseMoney(match[0]),
    }))
    .filter((match): match is { text: string; index: number; amount: number } => Boolean(match.amount && match.amount >= 500));

  return matches.at(-1) ?? null;
}

function parseHeader(line: string) {
  const cells = splitRowCells(line).map((cell) => cell.toLowerCase());
  if (findMoneyInText(line) || !cells.some((cell) => /(branch|auction|location|city|state|total|price|rate|amount)/.test(cell))) {
    return null;
  }

  const header = cells.map((cell) => {
    if (/branch|auction|yard|location/.test(cell)) return 'branch';
    if (/city/.test(cell)) return 'city';
    if (/state/.test(cell)) return 'state';
    if (/total|price|rate|amount|cost/.test(cell)) return 'total';
    if (/loading|pickup|point/.test(cell)) return 'loadingPoint';
    return null;
  });

  return header.filter(Boolean).length >= 2 ? header : null;
}

function parseLabeledLine(line: string): AuctionRateEntry | null {
  const labelPattern = /\b(branch|city|state|loading point|pickup point|loading|total|price|rate|amount|cost)\b\s*[:#-]?/ig;
  const labels = [...line.matchAll(labelPattern)].map((match) => ({
    label: match[1].toLowerCase(),
    start: match.index ?? 0,
    valueStart: (match.index ?? 0) + match[0].length,
  }));
  if (labels.length < 2) return null;

  const values = new Map<string, string>();
  for (let index = 0; index < labels.length; index += 1) {
    const current = labels[index];
    const next = labels[index + 1];
    const normalizedLabel = /branch/.test(current.label)
      ? 'branch'
      : /city/.test(current.label)
        ? 'city'
        : /state/.test(current.label)
          ? 'state'
          : /loading|pickup/.test(current.label)
            ? 'loadingPoint'
            : 'total';
    values.set(normalizedLabel, normalizeText(line.slice(current.valueStart, next?.start ?? line.length).replace(/[|,;]+$/g, '')));
  }

  const total = parseMoney(values.get('total') || '');
  const stateCode = resolveStateCode(values.get('state') || '') ?? findStateInText(line)?.stateCode ?? null;

  if (!total || !stateCode) return null;

  const branch = values.get('branch') || values.get('city') || stateCode;
  const city = values.get('city') || values.get('branch') || stateCode;

  return {
    stateCode,
    branch,
    city,
    loadingPoint: values.get('loadingPoint') || null,
    total: Math.round(total),
    source: 'flexible',
    confidence: 'high',
    sourceNote: 'Parsed from labeled PDF text.',
  };
}

function parseCellsWithHeader(line: string, header: Array<string | null> | null): AuctionRateEntry | null {
  const cells = splitRowCells(line);
  if (cells.length < 3) return null;

  const byHeader = (name: string) => {
    const index = header?.findIndex((cell) => cell === name) ?? -1;
    return index >= 0 ? cells[index] : '';
  };
  const totalCell = byHeader('total') || cells.find((cell) => parseMoney(cell));
  const stateCell = byHeader('state') || cells.find((cell) => resolveStateCode(cell));
  const total = totalCell ? parseMoney(totalCell) : null;
  const stateCode = stateCell ? resolveStateCode(stateCell) : null;

  if (!total || !stateCode) return null;

  if (header) {
    return {
      stateCode,
      branch: byHeader('branch') || byHeader('city') || stateCode,
      city: byHeader('city') || byHeader('branch') || stateCode,
      loadingPoint: byHeader('loadingPoint') || null,
      total: Math.round(total),
      source: 'flexible',
      confidence: 'high',
      sourceNote: 'Parsed from PDF text with detected headers.',
    };
  }

  const remaining = cells.filter((cell) => cell !== totalCell && cell !== stateCell);
  const branchIndex = remaining.findIndex((cell) => /\b(branch|auction|yard|copart|iaai|manheim|location)\b/i.test(cell));
  const branch = branchIndex >= 0 ? remaining[branchIndex] : remaining[1] || remaining[0] || stateCode;
  const city = branchIndex >= 0 ? remaining.find((_, index) => index !== branchIndex) || branch : remaining[0] || branch;

  return {
    stateCode,
    branch,
    city,
    loadingPoint: null,
    total: Math.round(total),
    source: 'flexible',
    confidence: 'medium',
    sourceNote: 'Parsed from delimited PDF text without a detected header.',
  };
}

function parseLooseLine(line: string): AuctionRateEntry | null {
  const money = findMoneyInText(line);
  const state = findStateInText(line);
  if (!money || !state) return null;

  const beforeState = normalizeText(line.slice(0, state.index));
  const afterState = normalizeText(line.slice(state.index + state.matchText.length, money.index));
  const laneText = normalizeText(`${beforeState} ${afterState}`.replace(/\b(total|price|rate|amount|cost)\b\s*[:#-]?/ig, ''));
  if (!laneText) return null;

  const branchMatch = laneText.match(/^(.+\b(?:branch|auction|yard|location|copart|iaai|manheim)\b)\s+(.+)$/i);
  const branch = normalizeText(branchMatch?.[1] || laneText);
  const city = normalizeText(branchMatch?.[2] || laneText);

  return {
    stateCode: state.stateCode,
    branch,
    city,
    loadingPoint: null,
    total: Math.round(money.amount),
    source: 'flexible',
    confidence: 'low',
    sourceNote: 'Guessed from loose PDF text. Review before import.',
  };
}

function uniqueAuctionKey(rate: AuctionRateEntry) {
  return [
    rate.stateCode,
    rate.branch.trim().toLowerCase(),
    rate.city.trim().toLowerCase(),
    String(Math.round(rate.total)),
    rate.loadingPoint?.trim().toLowerCase() || '',
  ].join('|');
}

function mergeParsedRates(primary: AuctionRateEntry[], fallback: AuctionRateEntry[]) {
  const seen = new Set(primary.map(uniqueAuctionKey));
  const merged = [...primary];

  for (const rate of fallback) {
    const key = uniqueAuctionKey(rate);
    if (seen.has(key)) continue;
    merged.push(rate);
    seen.add(key);
  }

  return merged;
}

function groupItemsIntoRows(items: PdfTextItem[]) {
  const rows: PdfTextItem[][] = [];

  for (const item of [...items].sort((left, right) => right.y - left.y || left.x - right.x)) {
    const row = rows.find((candidate) => Math.abs(candidate[0].y - item.y) <= 4);
    if (row) {
      row.push(item);
    } else {
      rows.push([item]);
    }
  }

  return rows.map((row) => row.sort((left, right) => left.x - right.x).map((item) => item.str).join(' '));
}

function parseAuctionRatesFromRows(rows: string[]) {
  const entries: AuctionRateEntry[] = [];
  let header: Array<string | null> | null = null;
  let directRows = 0;
  let guessedRows = 0;

  for (const rawLine of rows) {
    const line = normalizeText(rawLine);
    if (!line) continue;

    const detectedHeader = parseHeader(line);
    if (detectedHeader?.some(Boolean)) {
      header = detectedHeader;
      continue;
    }

    const labeled = parseLabeledLine(line);
    if (labeled) {
      entries.push(labeled);
      directRows += 1;
      continue;
    }

    const cells = parseCellsWithHeader(line, header);
    if (cells) {
      entries.push(cells);
      if (header) {
        directRows += 1;
      } else {
        guessedRows += 1;
      }
      continue;
    }

    const loose = parseLooseLine(line);
    if (loose) {
      entries.push(loose);
      guessedRows += 1;
    }
  }

  return {
    entries,
    directRows,
    guessedRows,
  };
}

function buildParserStats(
  columnRows: number,
  fallback: { entries: AuctionRateEntry[]; directRows: number; guessedRows: number },
  totalRows: number,
): PriceListParserStats {
  const notes: string[] = [];
  const confidence: PriceListParserStats['confidence'] = columnRows >= 3 || fallback.directRows >= 3
    ? 'high'
    : totalRows > 0
      ? 'medium'
      : 'low';

  if (columnRows > 0) notes.push(`${columnRows} row${columnRows === 1 ? '' : 's'} matched the column-based PDF layout.`);
  if (fallback.directRows > 0) notes.push(`${fallback.directRows} row${fallback.directRows === 1 ? '' : 's'} matched labeled or header-based text.`);
  if (fallback.guessedRows > 0) notes.push(`${fallback.guessedRows} row${fallback.guessedRows === 1 ? '' : 's'} came from loose text matching and should be reviewed.`);
  if (totalRows === 0) notes.push('No branch/city rows were found in the extracted PDF text.');

  return {
    columnRows,
    flexibleRows: fallback.entries.length,
    directRows: columnRows + fallback.directRows,
    guessedRows: fallback.guessedRows,
    aiRows: 0,
    totalRows,
    confidence,
    notes,
  };
}

function findNearestText(items: PdfTextItem[], xMin: number, xMax: number, y: number) {
  return items
    .filter((item) => item.x >= xMin && item.x < xMax && Math.abs(item.y - y) <= 4)
    .sort((left, right) => Math.abs(left.y - y) - Math.abs(right.y - y))[0]?.str.trim() ?? '';
}

function findLoadingPoint(items: PdfTextItem[], y: number) {
  const match = items.find((item) => {
    const value = item.str.trim();
    return item.x >= 380
      && Math.abs(item.y - y) <= 8
      && !['BRANCH', 'CITY', 'TOTAL'].includes(value.toUpperCase())
      && !stateHeaderPattern.test(value.replace(/\s+/g, ''));
  });

  return match?.str.trim() || null;
}

function findStateHeader(items: PdfTextItem[], item: PdfTextItem) {
  const compact = item.str.replace(/\s+/g, '');
  const sameItemMatch = compact.match(stateHeaderPattern);
  if (sameItemMatch && stateCodes.has(sameItemMatch[2])) {
    return {
      stateCode: sameItemMatch[2],
      y: item.y,
      loadingPoint: findLoadingPoint(items, item.y),
    };
  }

  const stateCode = stateNameToCode.get(item.str.trim().replace(/\s+/g, ' ').toUpperCase());
  if (!stateCode || item.x < 40) return null;

  const codePattern = new RegExp(`^\\(?${stateCode}\\)?$`, 'i');
  const hasNearbyCode = items.some((candidate) => (
    candidate !== item
    && Math.abs(candidate.y - item.y) <= 3
    && Math.abs(candidate.x - item.x) <= 140
    && codePattern.test(candidate.str.trim())
  ));

  return hasNearbyCode
    ? {
      stateCode,
      y: item.y,
      loadingPoint: findLoadingPoint(items, item.y),
    }
    : null;
}

export async function extractAuctionRatesFromPdf(buffer: Buffer) {
  await ensurePdfNodePolyfills();
  const [pdfjs, pdfjsWorker] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.mjs'),
  ]);
  (globalThis as typeof globalThis & { pdfjsWorker?: unknown }).pdfjsWorker = pdfjsWorker;
  const data = new Uint8Array(buffer);
  const document = await pdfjs.getDocument({ data }).promise;
  const entries: AuctionRateEntry[] = [];
  const textParts: string[] = [];
  const rowParts: string[] = [];
  let carryStateCode: string | null = null;
  let carryLoadingPoint: string | null = null;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items
      .map((item) => {
        const textItem = item as { str?: string; transform?: number[] };
        return {
          str: String(textItem.str ?? '').trim(),
          x: Math.round(textItem.transform?.[4] ?? 0),
          y: Math.round(textItem.transform?.[5] ?? 0),
        };
      })
      .filter((item) => item.str);
    textParts.push(...items.map((item) => item.str));
    rowParts.push(...groupItemsIntoRows(items));

    const headers = Array.from(
      new Map(
        items
          .map((item) => findStateHeader(items, item))
          .filter((item): item is { stateCode: string; y: number; loadingPoint: string | null } => Boolean(item))
          .map((header) => [`${header.stateCode}:${header.y}`, header] as const),
      ).values(),
    ).sort((left, right) => right.y - left.y);

    const groups: Array<{ stateCode: string; loadingPoint: string | null; top: number; bottom: number }> = [];

    if (headers.length && carryStateCode) {
      groups.push({
        stateCode: carryStateCode,
        loadingPoint: carryLoadingPoint,
        top: Number.POSITIVE_INFINITY,
        bottom: headers[0].y + 20,
      });
    }

    if (!headers.length && carryStateCode) {
      groups.push({
        stateCode: carryStateCode,
        loadingPoint: carryLoadingPoint,
        top: Number.POSITIVE_INFINITY,
        bottom: 0,
      });
    }

    headers.forEach((header, index) => {
      const nextHeader = headers[index + 1];
      groups.push({
        stateCode: header.stateCode,
        loadingPoint: header.loadingPoint,
        top: header.y - 15,
        bottom: nextHeader ? nextHeader.y + 20 : 0,
      });
    });

    for (const group of groups) {
      const prices = items.filter((item) => (
        item.x >= 480
        && item.y < group.top
        && item.y > group.bottom
        && isMoney(item.str)
      ));

      for (const price of prices) {
        const total = parseMoney(price.str);
        if (!total || total < 500) continue;

        const branch = findNearestText(items, 0, 190, price.y);
        const city = findNearestText(items, 190, 430, price.y);
        if (!branch && !city) continue;

        entries.push({
          stateCode: group.stateCode,
          branch,
          city,
          total: Math.round(total),
          loadingPoint: group.loadingPoint,
          source: 'column',
          confidence: 'high',
          sourceNote: 'Parsed from column-aligned PDF layout.',
        });
      }
    }

    if (headers.length) {
      const lastHeader = headers[headers.length - 1];
      carryStateCode = lastHeader.stateCode;
      carryLoadingPoint = lastHeader.loadingPoint;
    }
  }

  await document.destroy();
  const fallback = parseAuctionRatesFromRows(rowParts);
  const mergedEntries = mergeParsedRates(entries, fallback.entries);

  return {
    entries: mergedEntries,
    text: textParts.join(' ').replace(/\s+/g, ' ').trim(),
    parserStats: buildParserStats(entries.length, fallback, mergedEntries.length),
  };
}

export function getImportedRatesFromPdfText(auctionRates: AuctionRateEntry[], extractedText: string) {
  const stateRatesFromAuctionRates = buildStateRatesFromAuctionRates(auctionRates);
  return Object.keys(stateRatesFromAuctionRates).length
    ? stateRatesFromAuctionRates
    : parseShippingRatesFromText(extractedText);
}
