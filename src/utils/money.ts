// Money is ALWAYS stored and computed as integer cents (minor units).
// This module is the only place where conversion/formatting happens.
// Rule: never do arithmetic on the formatted/decimal representation.

export type Cents = number;

const CURRENCY = 'ETB'; // Ethiopian Birr; change centrally if needed.
const LOCALE = 'en-US';

/** Parse a user-typed decimal string ("14000.50") into integer cents. */
export function toCents(input: string | number): Cents {
  if (typeof input === 'number') return Math.round(input * 100);
  const cleaned = input.replace(/[^0-9.\-]/g, '').trim();
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0;
  const value = Number.parseFloat(cleaned);
  if (Number.isNaN(value)) return 0;
  return Math.round(value * 100);
}

/** Cents → decimal number (for charts / inputs). */
export function toDecimal(cents: Cents): number {
  return cents / 100;
}

/** Cents → display string with grouping, e.g. 1400000 -> "14,000.00". */
export function formatCents(cents: Cents, withSymbol = false): string {
  const amount = (cents / 100).toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return withSymbol ? `${CURRENCY} ${amount}` : amount;
}

/** Signed display, e.g. +1,200.00 / -820.00 — handy for variance. */
export function formatSignedCents(cents: Cents): string {
  const sign = cents > 0 ? '+' : cents < 0 ? '-' : '';
  return `${sign}${formatCents(Math.abs(cents))}`;
}
