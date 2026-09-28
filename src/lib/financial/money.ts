/**
 * Money-math helpers that operate in integer cents to avoid
 * IEEE-754 float accumulation errors. All exported "rounded"
 * functions return a number in **dollars**, rounded to 2 decimal places.
 */

const CENTS = 100;

/**
 * Round a dollar amount to the nearest cent.
 * @param dollars  a float in dollars
 * @returns rounded value in dollars, e.g. 10.005 → 10.01
 */
export function roundToCents(dollars: number): number {
  if (!Number.isFinite(dollars)) return 0;
  return Math.round(dollars * CENTS) / CENTS;
}

/**
 * Sum an array of dollar amounts, rounding the final total to cents.
 * Useful for aggregating line-item amounts without accumulating float error.
 */
export function sumCents(amounts: number[]): number {
  if (amounts.length === 0) return 0;
  const totalCents = amounts.reduce(
    (sum, value) => sum + (Number.isFinite(value) ? Math.round(value * CENTS) : 0),
    0,
  );
  return totalCents / CENTS;
}

/**
 * Apply a percentage discount to a subtotal and round the result to cents.
 * @param subtotal      dollar amount
 * @param percent       0-100
 * @returns { discount, total }  both rounded to cents
 */
export function applyPercentDiscount(
  subtotal: number,
  percent: number,
): { discount: number; total: number } {
  const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;
  const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
  const discountCents = Math.round((safeSubtotal * CENTS) * safePercent / 100);
  const discount = discountCents / CENTS;
  const totalCents = Math.round(safeSubtotal * CENTS) - discountCents;
  return { discount, total: totalCents / CENTS };
}

/**
 * Compare two dollar amounts, treating values within one cent of each
 * other as equal. Replaces the scattered `0.001` / `0.01` magic epsilons.
 */
export function withinOneCent(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.005;
}
