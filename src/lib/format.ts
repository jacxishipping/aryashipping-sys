/**
 * Shared money formatting for the app.
 *
 * Single source of truth so every surface renders amounts the same way
 * ($1,234.56). Local helpers in individual pages should be replaced by
 * imports from here over time.
 */

const moneyFormatterCache = new Map<string, Intl.NumberFormat>();

function getMoneyFormatter(currency: string, fractionDigits: number): Intl.NumberFormat {
  const key = `${currency}::${fractionDigits}`;
  let formatter = moneyFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    moneyFormatterCache.set(key, formatter);
  }
  return formatter;
}

/**
 * Format a number as currency.
 *
 * - `null` / `undefined` / non-finite values render as `placeholder` ('—' by
 *   default) so "no amount" never shows as $0.00.
 * - Defaults to 2 fraction digits and USD, matching the rest of the app.
 *
 * @example formatMoney(1234.5) -> "$1,234.50"
 * @example formatMoney(1234.5, 'EUR') -> "€1,234.50"
 */
export function formatMoney(
  amount: number | null | undefined,
  currency = 'USD',
  options: { fractionDigits?: number; placeholder?: string } = {},
): string {
  if (amount == null || !Number.isFinite(amount)) {
    return options.placeholder ?? '—';
  }

  return getMoneyFormatter(currency || 'USD', options.fractionDigits ?? 2).format(amount);
}

/**
 * Compact money for dense tables / stat cards: $1.2K / $3.4M.
 */
export function formatMoneyCompact(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null || !Number.isFinite(amount)) {
    return '—';
  }

  const absolute = Math.abs(amount);
  const digits = absolute >= 1_000_000 ? 1 : absolute >= 1_000 ? 0 : 2;
  const notation = absolute >= 1_000 ? 'compact' : 'standard';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    notation: notation as Intl.NumberFormatOptions['notation'],
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}
