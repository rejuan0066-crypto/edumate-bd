/**
 * Phone number sanitization and formatting utilities.
 * Handles Bangladeshi (+880) and international phone numbers.
 * Resolves issues where +880 appears multiple times or has a redundant leading 0 (e.g., +880+880018...).
 */

import { toEnDigits, toBnDigits } from './digits';

export interface ParsedPhone {
  code: string;
  number: string;
  full: string;
  formatted: string;
}

/**
 * Normalizes and cleans any messy phone number string.
 * Example inputs:
 *  - "+880+88001820298956" -> { code: "+880", number: "1820298956", full: "+8801820298956", formatted: "+880 1820-298956" }
 *  - "+88001820298956"     -> { code: "+880", number: "1820298956", full: "+8801820298956", formatted: "+880 1820-298956" }
 *  - "01820298956"         -> { code: "+880", number: "1820298956", full: "+8801820298956", formatted: "+880 1820-298956" }
 */
export function cleanPhoneNumber(rawPhone?: string | null, defaultCode = '+880'): ParsedPhone | null {
  if (!rawPhone || !rawPhone.trim()) return null;

  // Convert Bengali/Arabic digits to English digits
  let s = toEnDigits(rawPhone.trim());

  // Collapse repeated "+880" or "880"
  // e.g. "+880+880", "+880880", "880880", "+880+8800"
  let code = defaultCode || '+880';
  if (!code.startsWith('+')) code = `+${code}`;

  // Strip all non-digit characters except '+'
  s = s.replace(/[^\d+]/g, '');

  // Detect and clean Bangladesh numbers
  if (s.includes('880') || code === '+880') {
    code = '+880';
    // Remove all occurrences of +880 or 880 from the front
    while (s.startsWith('+880') || s.startsWith('880') || s.startsWith('+88')) {
      if (s.startsWith('+880')) s = s.substring(4);
      else if (s.startsWith('880')) s = s.substring(3);
      else if (s.startsWith('+88')) s = s.substring(3);
    }
    // Clean any remaining leading '+'
    s = s.replace(/^\++/, '');
    // Remove redundant leading 0 (in BD numbers, 01XXXXXXXXX -> 1XXXXXXXXX when country code is present)
    if (s.startsWith('0')) {
      s = s.replace(/^0+/, '');
    }
  } else {
    // Other international countries
    const knownCodes = ['+966', '+971', '+974', '+965', '+968', '+973', '+60', '+91', '+44', '+1'];
    for (const c of knownCodes) {
      if (s.startsWith(c)) {
        code = c;
        s = s.substring(c.length).replace(/^0+/, '');
        break;
      }
    }
    s = s.replace(/^\++/, '');
  }

  // Final cleaned national number
  const cleanNumber = s.replace(/[^\d]/g, '');
  if (!cleanNumber) return null;

  const full = `${code}${cleanNumber}`;

  // Format BD numbers nicely as +880 1XXX-XXXXXX
  let formatted = `${code} ${cleanNumber}`;
  if (code === '+880' && cleanNumber.length === 10) {
    formatted = `+880 ${cleanNumber.substring(0, 4)}-${cleanNumber.substring(4)}`;
  }

  return {
    code,
    number: cleanNumber,
    full,
    formatted,
  };
}

/**
 * Format a phone number for display in profile pages or cards.
 * If bn = true, converts digits to Bengali: "+৮৮০ ১৮২০-২৯৮৯৫৬"
 */
export function formatPhoneNumber(
  rawPhone?: string | null,
  countryCode?: string | null,
  bn = false
): string | undefined {
  const parsed = cleanPhoneNumber(rawPhone, countryCode || '+880');
  if (!parsed) return undefined;

  if (bn) {
    return toBnDigits(parsed.formatted);
  }
  return parsed.formatted;
}
