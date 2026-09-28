/**
 * Client- and server-safe utility for sanitizing tracking inputs, URLs, and QR code contents.
 * Handles VINs, Container Numbers, Shipment IDs, and tracking URLs.
 */

export function sanitizeTrackNumber(input: string): string {
  let cleaned = (input || '').trim();
  if (!cleaned) return '';

  // 1. If input is a URL or query string, extract parameters
  if (
    cleaned.startsWith('http://') ||
    cleaned.startsWith('https://') ||
    cleaned.includes('?') ||
    cleaned.includes('/')
  ) {
    try {
      const dummyBase = 'https://jacxishipping.com';
      const parsedUrl = new URL(cleaned, dummyBase);

      const vinParam = parsedUrl.searchParams.get('vin');
      if (vinParam) return cleanRawIdentifier(vinParam);

      const containerParam = parsedUrl.searchParams.get('container');
      if (containerParam) return cleanRawIdentifier(containerParam);

      const qParam =
        parsedUrl.searchParams.get('q') ||
        parsedUrl.searchParams.get('trackNumber') ||
        parsedUrl.searchParams.get('trackingNumber') ||
        parsedUrl.searchParams.get('id');
      if (qParam) return cleanRawIdentifier(qParam);

      const pathParts = parsedUrl.pathname.split('/').filter(Boolean);
      const lastPart = pathParts[pathParts.length - 1];
      if (
        lastPart &&
        (pathParts.includes('shipments') ||
          pathParts.includes('containers') ||
          pathParts.includes('tracking'))
      ) {
        return cleanRawIdentifier(lastPart);
      }
    } catch {}
  }

  // 2. Regex fallback for URL parameters in partial strings (e.g., "?vin=...")
  const vinMatch = cleaned.match(/[?&]vin=([^&#\s]+)/i);
  if (vinMatch) return cleanRawIdentifier(decodeURIComponent(vinMatch[1]));

  const containerMatch = cleaned.match(/[?&]container=([^&#\s]+)/i);
  if (containerMatch) return cleanRawIdentifier(decodeURIComponent(containerMatch[1]));

  const qMatch = cleaned.match(/[?&](?:q|trackNumber|trackingNumber|id)=([^&#\s]+)/i);
  if (qMatch) return cleanRawIdentifier(decodeURIComponent(qMatch[1]));

  return cleanRawIdentifier(cleaned);
}

function cleanRawIdentifier(val: string): string {
  let res = (val || '').trim();

  // Strip common label prefixes like "VIN: ", "Container #", "Tracking: ", "ID: "
  res = res.replace(/^(?:vin|container|tracking|track|tracknumber|lot|ref|id)\s*[:#\-]?\s*/i, '').trim();

  // Check if string is a CUID (lowercase starts with c, 20-32 chars alphanumeric)
  // We want to preserve CUID casing (lowercase) for Prisma ID matching
  if (/^c[a-z0-9]{20,32}$/i.test(res)) {
    return res.toLowerCase();
  }

  // If contains a 17-character VIN pattern anywhere within text/formatting
  const vinPatternMatch = res.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i);
  if (vinPatternMatch) {
    return vinPatternMatch[1].toUpperCase();
  }

  // Default to uppercase for container numbers (MSCU1234567), VINs, and reference codes
  return res.toUpperCase();
}
