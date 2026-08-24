/**
 * Formats a numeric value cleanly, avoiding floating-point display artifacts.
 *
 * Rules:
 *   - Whole numbers shown without decimals:     10 → "10", 125 → "125"
 *   - Decimal values shown trimmed:             12.5 → "12.5", 157.5 → "157.5"
 *   - Floating-point noise is removed first:   52.50000000000001 → "52.5"
 *   - NaN / non-finite values → "0"
 *
 * Implementation: `parseFloat(value.toFixed(4))` strips IEEE-754 noise while
 * preserving up to 4 significant decimal places. JS `toString()` then drops
 * trailing zeroes automatically (e.g. 12.5000 → "12.5", 100.0000 → "100").
 */
export function formatNum(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return String(parseFloat(value.toFixed(4)));
}

/**
 * Convenience wrapper: formats a weight value and appends " kg".
 *   formatWeight(12.5)  → "12.5 kg"
 *   formatWeight(100)   → "100 kg"
 *   formatWeight(157.5) → "157.5 kg"
 */
export function formatWeight(kg: number): string {
  return `${formatNum(kg)} kg`;
}
