const toCents = (n: number) => Math.round(n * 100);

/** Parses a raw amount string into a positive number, or 0 when empty/invalid. */
export const parseAmount = (raw: string): number => {
  const n = parseFloat(raw);
  return isNaN(n) || n < 0 ? 0 : n;
};

/** Amount of `total` not yet covered by `parts` (cent-exact; negative when over-allocated). */
export const getUnallocated = (total: number, parts: number[]): number =>
  (toCents(total) - parts.reduce((sum, p) => sum + toCents(p), 0)) / 100;

/** Formats a number as a raw input string without trailing float noise (e.g. 0.1 + 0.2 -> "0.3"). */
export const toInputString = (n: number): string => String(Math.round(n * 100) / 100);

/** Splits `total` into `n` cent-exact amounts; leftover cents go to the first parts (100 / 3 -> 33.34, 33.33, 33.33). */
export const splitEqually = (total: number, n: number): number[] => {
  if (n <= 0) return [];
  const cents = toCents(total);
  const base = Math.floor(cents / n);
  const extra = cents - base * n;
  return Array.from({ length: n }, (_, i) => (base + (i < extra ? 1 : 0)) / 100);
};
