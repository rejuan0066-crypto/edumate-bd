/**
 * Locale-aware digit helpers.
 * Bengali version types/shows Bengali digits, English shows English digits,
 * but values are always normalized to English numbers for the database.
 */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Convert any English digits in a string to Bengali digits. */
export function toBnDigits(input: string | number | null | undefined): string {
  if (input == null) return '';
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** Convert Bengali (and Arabic-Indic) digits in a string to English digits. */
export function toEnDigits(input: string | number | null | undefined): string {
  if (input == null) return '';
  return String(input)
    // Bengali ০-৯
    .replace(/[\u09E6-\u09EF]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    // Arabic-Indic ٠-٩
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
}

/**
 * Parse a localized numeric string (Bengali or English digits, optional
 * decimal point / minus sign) into an English number. Returns NaN when empty
 * or invalid.
 */
export function parseLocaleNumber(input: string): number {
  const en = toEnDigits(input).replace(/[^0-9.\-]/g, '');
  if (en === '' || en === '-' || en === '.' || en === '-.') return NaN;
  return Number(en);
}
