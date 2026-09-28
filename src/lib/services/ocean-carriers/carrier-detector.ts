import { SUPPORTED_OCEAN_CARRIERS, type OceanCarrierCode, type CarrierMetadata } from './types';

/**
 * Detects the specific Ocean Carrier from a 4-letter container prefix (ISO 6346)
 * or carrier name query string.
 */
export function detectOceanCarrier(
  containerOrCarrierQuery?: string | null
): CarrierMetadata {
  if (!containerOrCarrierQuery) {
    return SUPPORTED_OCEAN_CARRIERS.MAERSK;
  }

  const query = containerOrCarrierQuery.trim().toUpperCase();

  // 1. Check 4-letter BIC prefix (e.g. MSKU, MSCU, CMAU, HLCU)
  const prefix = query.slice(0, 4);
  for (const carrier of Object.values(SUPPORTED_OCEAN_CARRIERS)) {
    if (carrier.prefixes.includes(prefix)) {
      return carrier;
    }
  }

  // 2. Check name substring match
  const lowerQuery = query.toLowerCase();
  if (lowerQuery.includes('maersk') || lowerQuery.includes('moller')) return SUPPORTED_OCEAN_CARRIERS.MAERSK;
  if (lowerQuery.includes('msc') || lowerQuery.includes('mediterranean')) return SUPPORTED_OCEAN_CARRIERS.MSC;
  if (lowerQuery.includes('cma') || lowerQuery.includes('cgm') || lowerQuery.includes('anl')) return SUPPORTED_OCEAN_CARRIERS.CMA_CGM;
  if (lowerQuery.includes('hapag') || lowerQuery.includes('lloyd')) return SUPPORTED_OCEAN_CARRIERS.HAPAG_LLOYD;
  if (lowerQuery.includes('cosco')) return SUPPORTED_OCEAN_CARRIERS.COSCO;
  if (lowerQuery.includes('one') || lowerQuery.includes('ocean network')) return SUPPORTED_OCEAN_CARRIERS.ONE;
  if (lowerQuery.includes('evergreen')) return SUPPORTED_OCEAN_CARRIERS.EVERGREEN;
  if (lowerQuery.includes('yang') || lowerQuery.includes('ming')) return SUPPORTED_OCEAN_CARRIERS.YANG_MING;
  if (lowerQuery.includes('zim')) return SUPPORTED_OCEAN_CARRIERS.ZIM;

  // Fallback to Universal DCSA carrier
  return SUPPORTED_OCEAN_CARRIERS.GENERIC_DCSA;
}

/**
 * Validates ISO 6346 container number format & calculates check-digit.
 */
export function validateContainerNumber(containerNumber: string): {
  isValid: boolean;
  cleanNumber: string;
  calculatedCheckDigit?: number;
} {
  const cleaned = containerNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleaned.length !== 11) {
    return { isValid: false, cleanNumber: cleaned };
  }

  const charCodeMap: Record<string, number> = {
    A: 10, B: 12, C: 13, D: 14, E: 15, F: 16, G: 17, H: 18, I: 19, J: 20,
    K: 21, L: 23, M: 24, N: 25, O: 26, P: 27, Q: 28, R: 29, S: 30, T: 31,
    U: 32, V: 34, W: 35, X: 36, Y: 37, Z: 38,
  };

  let sum = 0;
  for (let i = 0; i < 10; i++) {
    const char = cleaned[i];
    const val = Number.isNaN(Number(char)) ? charCodeMap[char] || 0 : Number(char);
    sum += val * Math.pow(2, i);
  }

  const remainder = sum % 11;
  const calculatedCheckDigit = remainder === 10 ? 0 : remainder;
  const actualCheckDigit = Number(cleaned[10]);

  return {
    isValid: calculatedCheckDigit === actualCheckDigit,
    cleanNumber: cleaned,
    calculatedCheckDigit,
  };
}
