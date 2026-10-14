import { toBnDigits, toEnDigits } from '@/lib/digits';
import { containsBangla } from '@/lib/bnRomanize';

export type InputLangType = 'en' | 'bn' | 'auto';

export interface DetectLangProps {
  type?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  langType?: InputLangType;
}

/**
 * Automatically detects whether an input should enforce English, Bangla, or Auto.
 */
export function detectInputLang(props: DetectLangProps): InputLangType {
  // 1. Explicit prop has highest precedence
  if (props.langType) return props.langType;

  const type = (props.type || '').toLowerCase();
  // Passwords must never have input filtering / alteration
  if (type === 'password') return 'auto';

  // Strictly English standard input types
  if (type === 'email' || type === 'url' || type === 'tel') return 'en';

  const name = (props.name || '').toLowerCase();
  const id = (props.id || '').toLowerCase();
  const targetKey = `${name} ${id}`;
  const placeholder = (props.placeholder || '').toLowerCase();

  // English indicators in name/id
  if (
    name.endsWith('_en') ||
    id.endsWith('_en') ||
    targetKey.includes('name_en') ||
    targetKey.includes('title_en') ||
    targetKey.includes('address_en') ||
    targetKey.includes('email') ||
    targetKey.includes('phone') ||
    targetKey.includes('mobile') ||
    targetKey.includes('username') ||
    targetKey.includes('roll') ||
    targetKey.includes('slug') ||
    targetKey.includes('code') ||
    targetKey.includes('reg_no') ||
    targetKey.includes('registration_number_en') ||
    targetKey.includes('established_year_en') ||
    placeholder.includes('e.g.') ||
    placeholder.includes('example') ||
    placeholder.includes('english')
  ) {
    return 'en';
  }

  // Bangla indicators in name/id/placeholder - only when specifically designated for Bangla
  if (
    name.endsWith('_bn') ||
    id.endsWith('_bn') ||
    targetKey.includes('name_bn') ||
    targetKey.includes('title_bn') ||
    targetKey.includes('address_bn') ||
    targetKey.includes('bangla') ||
    targetKey.includes('father_name_bn') ||
    targetKey.includes('mother_name_bn') ||
    placeholder.includes('বাংলা') ||
    placeholder.includes('বাংলায়')
  ) {
    return 'bn';
  }

  return 'auto';
}

/**
 * Filter and convert string for English input fields:
 * - Converts Bengali (and Arabic) digits to English 0-9
 * - Removes any Bengali unicode glyphs (blocks Bangla characters)
 */
export function filterEnglishInput(value: string): string {
  if (!value) return value;
  // 1. Convert Bengali digits (০-৯) to English digits (0-9)
  let result = toEnDigits(value);
  // 2. Strip any Bengali unicode characters ([\u0980-\u09FF])
  result = result.replace(/[\u0980-\u09FF]/g, '');
  return result;
}

/**
 * Filter and convert string for Bangla input fields:
 * - Converts English digits (0-9) to Bengali digits (০-৯)
 */
export function filterBanglaInput(value: string): string {
  if (!value) return value;
  // Convert any English digits to Bengali digits
  return toBnDigits(value);
}
