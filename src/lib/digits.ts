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

/** Bengali/English ordinal label for merit rank (১ম, ২য়, ৩য়, ৪র্থ ...) */
export function formatOrdinalRank(n: number | null | undefined, bn = true): string {
  if (n === null || n === undefined || n < 1) return '-';
  if (!bn) {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
  const specials: Record<number, string> = {
    1: '১ম', 2: '২য়', 3: '৩য়', 4: '৪র্থ', 5: '৫ম', 6: '৬ষ্ঠ',
    7: '৭ম', 8: '৮ম', 9: '৯ম', 10: '১০ম', 11: '১১তম', 12: '১২তম',
    13: '১৩তম', 14: '১৪তম', 15: '১৫তম', 16: '১৬তম', 17: '১৭তম',
    18: '১৮তম', 19: '১৯তম', 20: '২০তম',
  };
  if (specials[n]) return specials[n];
  return `${toBnDigits(n)}তম`;
}
