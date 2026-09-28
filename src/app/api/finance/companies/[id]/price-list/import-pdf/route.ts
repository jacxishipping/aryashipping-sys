import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import JSZip from 'jszip';
import { z } from 'zod';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { hasPermission } from '@/lib/rbac';
import { createSystemAuditLog } from '@/lib/system-audit';
import { extractJsonObject } from '@/lib/ai/json';
import { createTokenRouterChatCompletion, isTokenRouterConfigured } from '@/lib/ai/tokenrouter';
import {
  type AuctionRateEntry,
  buildStateRatesFromAuctionRates,
  normalizeShippingRateConfig,
  parseShippingRatesFromText,
  US_STATES,
} from '@/lib/shipping-rate-calculator';
import { extractAuctionRatesFromPdf, getImportedRatesFromPdfText, type PriceListParserStats } from '@/lib/shipping-rate-pdf-import';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const VALID_IMPORT_MODES = new Set(['replace', 'merge', 'add_new']);
const stateCodes = new Set(US_STATES.map((state) => state.code));
const stateNames = new Map(US_STATES.map((state) => [state.name.toUpperCase(), state.code]));

type ImportMode = 'replace' | 'merge' | 'add_new';
type ExtractedPriceList = {
  entries: AuctionRateEntry[];
  text: string;
  parserStats?: PriceListParserStats;
};

const aiPriceListResponseSchema = z.object({
  rows: z.array(z.object({
    branch: z.string().nullable().optional(),
    city: z.string().nullable().optional(),
    state: z.string().nullable().optional(),
    stateCode: z.string().nullable().optional(),
    loadingPoint: z.string().nullable().optional(),
    total: z.union([z.number(), z.string()]),
  })).default([]),
  notes: z.array(z.string()).optional().default([]),
});

function normalizeImportMode(value: FormDataEntryValue | null): ImportMode {
  const mode = String(value || 'merge');
  return VALID_IMPORT_MODES.has(mode) ? mode as ImportMode : 'merge';
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

function mergeAuctionRates(existing: AuctionRateEntry[], incoming: AuctionRateEntry[], mode: ImportMode) {
  if (mode === 'replace') return incoming;

  const seen = new Set(existing.map(uniqueAuctionKey));
  const next = [...existing];
  for (const rate of incoming) {
    const key = uniqueAuctionKey(rate);
    if (!seen.has(key)) {
      next.push(rate);
      seen.add(key);
    }
  }
  return next;
}

function mergeParsedAuctionRates(primary: AuctionRateEntry[], incoming: AuctionRateEntry[]) {
  return mergeAuctionRates(primary, incoming, 'merge');
}

function buildStateRates(existing: Record<string, number>, imported: Record<string, number>, mode: ImportMode) {
  if (mode === 'replace') return imported;

  if (mode === 'add_new') {
    const next = { ...existing };
    for (const [stateCode, rate] of Object.entries(imported)) {
      if (!next[stateCode]) next[stateCode] = rate;
    }
    return next;
  }

  return {
    ...existing,
    ...imported,
  };
}

function buildWarnings(importedRates: Record<string, number>, auctionRates: AuctionRateEntry[]) {
  const warnings: string[] = [];
  const importedStateCodes = new Set(Object.keys(importedRates));
  const missingCommonStates = ['CA', 'TX', 'NJ', 'GA', 'MD', 'FL', 'NY', 'PA', 'IL', 'OH'].filter((stateCode) => !importedStateCodes.has(stateCode));
  const invalidStates = Object.keys(importedRates).filter((stateCode) => !stateCodes.has(stateCode));
  const unusuallyLow = Object.entries(importedRates).filter(([, rate]) => rate < 500).map(([stateCode]) => stateCode);
  const unusuallyHigh = Object.entries(importedRates).filter(([, rate]) => rate > 6000).map(([stateCode]) => stateCode);
  const rowKeys = new Map<string, number>();
  const suspiciousRows = auctionRates
    .filter((rate) => rate.total < 500 || rate.total > 6000)
    .map((rate) => `${rate.stateCode} ${rate.branch || rate.city} ${rate.total}`)
    .slice(0, 8);

  for (const rate of auctionRates) {
    const key = [
      rate.stateCode,
      rate.branch.trim().toLowerCase(),
      rate.city.trim().toLowerCase(),
      rate.loadingPoint?.trim().toLowerCase() || '',
    ].join('|');
    rowKeys.set(key, (rowKeys.get(key) || 0) + 1);
  }

  const duplicateLaneCount = [...rowKeys.values()].filter((count) => count > 1).length;

  if (missingCommonStates.length) warnings.push(`Missing common lanes: ${missingCommonStates.join(', ')}`);
  if (invalidStates.length) warnings.push(`Unknown states ignored: ${invalidStates.join(', ')}`);
  if (unusuallyLow.length) warnings.push(`Unusually low state rates: ${unusuallyLow.join(', ')}`);
  if (unusuallyHigh.length) warnings.push(`Unusually high state rates: ${unusuallyHigh.join(', ')}`);
  if (duplicateLaneCount > 0) warnings.push(`${duplicateLaneCount} duplicate lane${duplicateLaneCount === 1 ? '' : 's'} detected. Review before import.`);
  if (suspiciousRows.length) warnings.push(`Suspicious row totals: ${suspiciousRows.join('; ')}`);
  if (auctionRates.length === 0) warnings.push('No branch/city auction rows were detected; imported state-level rates only.');

  return warnings;
}

function normalizeCell(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function parseAmount(value: string) {
  const parsed = Number(value.replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

function resolveStateCode(value: string) {
  const normalized = normalizeCell(value).toUpperCase();
  if (stateCodes.has(normalized)) return normalized;
  return stateNames.get(normalized) ?? null;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      cells.push(normalizeCell(current));
      current = '';
    } else {
      current += char;
    }
  }

  cells.push(normalizeCell(current));
  return cells;
}

function parseDelimitedPriceList(text: string) {
  const rows = text
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.includes(',') ? parseCsvLine(line) : line.split(/\t+/).map(normalizeCell));
  const entries: AuctionRateEntry[] = [];
  const textParts: string[] = [];

  for (const cells of rows) {
    textParts.push(cells.join(' '));
    const stateIndex = cells.findIndex((cell) => Boolean(resolveStateCode(cell)));
    const amountIndex = cells.findIndex((cell) => parseAmount(cell) !== null);
    if (stateIndex === -1 || amountIndex === -1) continue;

    const stateCode = resolveStateCode(cells[stateIndex]);
    const total = parseAmount(cells[amountIndex]);
    if (!stateCode || !total) continue;

    const middle = cells.filter((_, index) => index !== stateIndex && index !== amountIndex);
    const branch = middle[0] || '';
    const city = middle[1] || middle[0] || stateCode;
    const loadingPoint = middle[2] || null;

    entries.push({
      stateCode,
      branch,
      city,
      loadingPoint,
      total,
      source: 'imported',
      confidence: 'high',
      sourceNote: 'Parsed from CSV/TXT/XLSX row.',
    });
  }

  return {
    entries,
    text: textParts.join(' ').replace(/\s+/g, ' ').trim(),
  };
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function extractXlsxText(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string');
  const sharedStrings = sharedXml
    ? [...sharedXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXmlEntities(match[1]))
    : [];
  const sheets = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort();
  const rows: string[] = [];

  for (const sheet of sheets) {
    const xml = await zip.file(sheet)?.async('string');
    if (!xml) continue;

    for (const rowMatch of xml.matchAll(/<row[\s\S]*?<\/row>/g)) {
      const cells: string[] = [];
      for (const cellMatch of rowMatch[0].matchAll(/<c[^>]*?(?:t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g)) {
        const cellType = cellMatch[1];
        const body = cellMatch[2];
        const value = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? '';
        const decoded = decodeXmlEntities(value);
        cells.push(cellType === 's' ? sharedStrings[Number(decoded)] || '' : decoded);
      }
      if (cells.some(Boolean)) rows.push(cells.join(','));
    }
  }

  return rows.join('\n');
}

function parseOverrideRows(value: FormDataEntryValue | null) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(String(value)) as unknown;
    if (!Array.isArray(parsed)) return null;

    return parsed
      .map((item) => {
        const row = item && typeof item === 'object' ? item as Partial<AuctionRateEntry> : {};
        const stateCode = String(row.stateCode || '').trim().toUpperCase();
        const total = Number(row.total);

        return {
          stateCode,
          branch: String(row.branch || '').trim(),
          city: String(row.city || '').trim(),
          loadingPoint: row.loadingPoint ? String(row.loadingPoint).trim() : null,
          total: Number.isFinite(total) ? Math.round(total) : 0,
          source: 'manual' as const,
          confidence: 'high' as const,
          sourceNote: 'Reviewed or edited in the import preview.',
        };
      })
      .filter((row) => stateCodes.has(row.stateCode) && row.total > 0 && (row.branch || row.city));
  } catch {
    return null;
  }
}

function normalizeAiPriceListRows(rows: z.infer<typeof aiPriceListResponseSchema>['rows']) {
  const normalizedRows: AuctionRateEntry[] = [];

  for (const row of rows) {
    const stateCode = resolveStateCode(String(row.stateCode || row.state || ''));
    const total = typeof row.total === 'number' ? row.total : parseAmount(String(row.total));
    const branch = normalizeCell(String(row.branch || row.city || stateCode || ''));
    const city = normalizeCell(String(row.city || row.branch || stateCode || ''));

    if (!stateCode || !total || (!branch && !city)) continue;

    normalizedRows.push({
      stateCode,
      branch,
      city,
      loadingPoint: row.loadingPoint ? normalizeCell(row.loadingPoint) : null,
      total: Math.round(total),
      source: 'ai',
      confidence: 'medium',
      sourceNote: 'Extracted by AI fallback. Review before import.',
    });
  }

  return normalizedRows;
}

async function extractPriceListRowsWithAi(text: string) {
  const trimmedText = normalizeCell(text).slice(0, 12000);
  if (!trimmedText) {
    return { rows: [] as AuctionRateEntry[], notes: ['AI parser fallback skipped because no PDF text was extracted.'] };
  }

  if (!(await isTokenRouterConfigured())) {
    return { rows: [] as AuctionRateEntry[], notes: ['AI parser fallback skipped because TokenRouter is not configured.'] };
  }

  try {
    const response = await createTokenRouterChatCompletion([
      {
        role: 'system',
        content: 'You extract shipping company price-list rows. Return JSON only. Do not include commentary.',
      },
      {
        role: 'user',
        content: `Extract every price-list row that has a branch, city, state, and total price from this text. Return exactly this JSON shape: {"rows":[{"branch":"string","city":"string","stateCode":"CA","loadingPoint":"string or null","total":1234}],"notes":["short warning if rows were ambiguous"]}. Use US two-letter state codes. Ignore rows without a total price.\n\n${trimmedText}`,
      },
    ], {
      maxTokens: 2500,
      temperature: 0.1,
    });
    const parsed = aiPriceListResponseSchema.parse(extractJsonObject(response.content));

    return {
      rows: normalizeAiPriceListRows(parsed.rows),
      notes: [
        `AI parser fallback ran with ${response.model}.`,
        ...parsed.notes.map((note) => normalizeCell(note)).filter(Boolean).slice(0, 6),
      ],
    };
  } catch (error) {
    return {
      rows: [] as AuctionRateEntry[],
      notes: [`AI parser fallback failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

function defaultParserStats(rows: AuctionRateEntry[]): PriceListParserStats {
  return {
    columnRows: rows.length,
    flexibleRows: 0,
    directRows: rows.length,
    guessedRows: 0,
    aiRows: 0,
    totalRows: rows.length,
    confidence: rows.length > 0 ? 'high' : 'low',
    notes: rows.length > 0 ? [`${rows.length} row${rows.length === 1 ? '' : 's'} parsed from the uploaded file.`] : [],
  };
}

function buildFinalParserStats(
  baseStats: PriceListParserStats | undefined,
  deterministicRows: AuctionRateEntry[],
  aiRows: AuctionRateEntry[],
  finalRows: AuctionRateEntry[],
  aiNotes: string[],
  usedOverrideRows: boolean,
): PriceListParserStats {
  const base = baseStats ?? defaultParserStats(deterministicRows);
  const notes = [...base.notes, ...aiNotes].filter(Boolean);
  if (usedOverrideRows) notes.push('Manual preview edits were used for this import.');

  return {
    ...base,
    aiRows: aiRows.length,
    totalRows: finalRows.length,
    confidence: base.confidence === 'high' || aiRows.length >= 3 || usedOverrideRows
      ? 'high'
      : finalRows.length > 0
        ? 'medium'
        : 'low',
    notes: Array.from(new Set(notes)).slice(0, 10),
  };
}

function summarizeRateSources(rows: AuctionRateEntry[]) {
  return rows.reduce<Record<string, number>>((summary, row) => {
    const source = row.source || 'unknown';
    summary[source] = (summary[source] || 0) + 1;
    return summary;
  }, {});
}

async function extractPriceListFromFile(file: File, buffer: Buffer): Promise<ExtractedPriceList | null> {
  const fileName = file.name.toLowerCase();
  if (file.type.includes('pdf') || fileName.endsWith('.pdf')) {
    return extractAuctionRatesFromPdf(buffer);
  }

  if (file.type.includes('csv') || file.type.includes('text') || fileName.endsWith('.csv') || fileName.endsWith('.txt')) {
    return parseDelimitedPriceList(buffer.toString('utf8'));
  }

  if (fileName.endsWith('.xlsx')) {
    const text = await extractXlsxText(buffer);
    return parseDelimitedPriceList(text);
  }

  return null;
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.user?.role, 'finance:manage')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        priceListConfig: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const action = String(formData.get('action') || 'import');
    const mode = normalizeImportMode(formData.get('mode'));
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Price list file is required' }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const isSupportedFile = file.type.includes('pdf')
      || file.type.includes('csv')
      || file.type.includes('text')
      || fileName.endsWith('.pdf')
      || fileName.endsWith('.csv')
      || fileName.endsWith('.txt')
      || fileName.endsWith('.xlsx');
    if (!isSupportedFile) {
      return NextResponse.json({ error: 'Only PDF, CSV, TXT, or XLSX price list files can be imported' }, { status: 400 });
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'Price list file must be 8MB or smaller' }, { status: 400 });
    }

    const existingConfig = normalizeShippingRateConfig(company.priceListConfig);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const extracted = await extractPriceListFromFile(file, fileBuffer);
    if (!extracted) {
      return NextResponse.json({ error: 'Unsupported price list file format.' }, { status: 400 });
    }

    const overrideRows = parseOverrideRows(formData.get('rowsJson'));
    const extractedText = extracted.text;
    const shouldRunAiFallback = !overrideRows
      && (file.type.includes('pdf') || fileName.endsWith('.pdf'))
      && (extracted.entries.length < 5 || extracted.parserStats?.confidence !== 'high');
    const aiExtraction = shouldRunAiFallback
      ? await extractPriceListRowsWithAi(extractedText)
      : { rows: [] as AuctionRateEntry[], notes: [] as string[] };
    const auctionRates = overrideRows ?? mergeParsedAuctionRates(extracted.entries, aiExtraction.rows);
    const parserStats = buildFinalParserStats(
      extracted.parserStats,
      extracted.entries,
      aiExtraction.rows,
      auctionRates,
      aiExtraction.notes,
      Boolean(overrideRows),
    );
    parserStats.aiRows = auctionRates.filter((rate) => rate.source === 'ai').length;
    const rowSourceSummary = summarizeRateSources(auctionRates);
    const importedRates = overrideRows
      ? buildStateRatesFromAuctionRates(overrideRows)
      : getImportedRatesFromPdfText(auctionRates, extractedText);
    const fallbackStateRates = parseShippingRatesFromText(extractedText);
    const finalImportedRates = Object.keys(importedRates).length ? importedRates : fallbackStateRates;

    if (Object.keys(finalImportedRates).length === 0) {
      return NextResponse.json({
        error: 'No rates were found in the file. Expected branch/city/total rows or state rows like "CA $1300".',
      }, { status: 422 });
    }

    const warnings = buildWarnings(finalImportedRates, auctionRates);
    const destinationLabel = String(formData.get('destinationLabel') || '').trim()
      || (file.name.toLowerCase().includes('islam qala') ? 'Islam Qala, Afghanistan' : existingConfig.destinationLabel);
    const listName = String(formData.get('name') || '').trim()
      || `${company.name} price list`;
    const effectiveFromRaw = String(formData.get('effectiveFrom') || '').trim();
    const effectiveFrom = effectiveFromRaw ? new Date(`${effectiveFromRaw}T00:00:00`) : null;

    const config = normalizeShippingRateConfig({
      ...existingConfig,
      destinationLabel,
      stateRates: buildStateRates(existingConfig.stateRates, finalImportedRates, mode),
      auctionRates: mergeAuctionRates(existingConfig.auctionRates, auctionRates, mode),
      updatedFromPdfName: file.name,
      updatedAt: new Date().toISOString(),
    });

    const preview = {
      fileName: file.name,
      mode,
      listName,
      destinationLabel,
      importedCount: Object.keys(finalImportedRates).length,
      importedAuctionRateCount: auctionRates.length,
      totalStateRateCount: Object.keys(config.stateRates).length,
      totalAuctionRateCount: config.auctionRates.length,
      warnings,
      parserStats,
      rowSourceSummary,
      rows: auctionRates.slice(0, 300),
      stateRates: finalImportedRates,
      extractedTextPreview: extractedText.slice(0, 700),
    };

    if (action === 'preview') {
      await createSystemAuditLog({
        action: 'price-list-preview',
        entityType: 'COMPANY',
        entityId: company.id,
        actorUserId: session.user.id as string,
        summary: `Previewed price list ${file.name} for ${company.name}`,
        metadata: {
          companyId: company.id,
          fileName: file.name,
          mode,
          importedStateRateCount: Object.keys(finalImportedRates).length,
          importedAuctionRateCount: auctionRates.length,
          parserStats,
          rowSourceSummary,
          warnings,
        },
      }).catch(() => null);

      return NextResponse.json({ preview, config });
    }

    const [, priceList, updatedCompany] = await prisma.$transaction([
      prisma.companyPriceList.updateMany({
        where: { companyId: company.id, isActive: true },
        data: { isActive: false },
      }),
      prisma.companyPriceList.create({
        data: {
          companyId: company.id,
          name: listName,
          destinationLabel,
          sourceFileName: file.name,
          importMode: mode,
          config: config as unknown as Prisma.InputJsonValue,
          importedStateRateCount: Object.keys(finalImportedRates).length,
          importedAuctionRateCount: auctionRates.length,
          warnings: warnings as unknown as Prisma.InputJsonValue,
          isActive: true,
          effectiveFrom: effectiveFrom && Number.isFinite(effectiveFrom.getTime()) ? effectiveFrom : null,
          importedBy: session.user.id as string,
        },
      }),
      prisma.company.update({
        where: { id: company.id },
        data: {
          priceListConfig: config as unknown as Prisma.InputJsonValue,
        },
        select: {
          id: true,
          name: true,
          priceListConfig: true,
        },
      }),
    ]);

    await createSystemAuditLog({
      action: 'price-list-import',
      entityType: 'COMPANY_PRICE_LIST',
      entityId: priceList.id,
      actorUserId: session.user.id as string,
      summary: `Imported and activated price list ${priceList.name} for ${company.name}`,
      metadata: {
        companyId: company.id,
        priceListId: priceList.id,
        sourceFileName: file.name,
        mode,
        destinationLabel,
        importedStateRateCount: Object.keys(finalImportedRates).length,
        importedAuctionRateCount: auctionRates.length,
        parserStats,
        rowSourceSummary,
        warnings,
      },
    }).catch(() => null);

    return NextResponse.json({
      company: updatedCompany,
      priceList,
      config: normalizeShippingRateConfig(updatedCompany.priceListConfig),
      preview,
      importedRates: finalImportedRates,
      importedCount: Object.keys(finalImportedRates).length,
      importedAuctionRateCount: auctionRates.length,
    });
  } catch (error) {
    console.error('Error importing company price list from PDF:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to import company price list',
    }, { status: 500 });
  }
}
