/**
 * Standard Bijoy Classic Keyboard Layout (Bijoy 52 / SutonnyMJ) → Unicode Bengali Converter
 * Accurately implements the standard Bijoy Bengali keyboard layout used across Bangladesh.
 */

export const BIJOY_KEYMAP: Record<string, string> = {
  // ── Number row ──
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
  '0': '০',
  '!': '!',
  '@': '@',
  '#': '#',
  '$': '৳',
  '%': '%',
  '^': '^',
  '&': 'ঁ',   // Chandrabindu
  '*': '*',
  '(': '(',
  ')': ')',

  // ── Top row: q w e r t y u i o p [ ] \ ──
  'q': 'ঙ',
  'Q': 'ং',
  'w': 'য',
  'W': 'য়',
  'e': 'ড',
  'E': 'ঢ',
  'r': 'প',
  'R': 'ফ',
  't': 'ট',
  'T': 'ঠ',
  'y': 'চ',
  'Y': 'ছ',
  'u': 'জ',
  'U': 'ঝ',
  'i': 'হ',
  'I': 'ঞ',
  'o': 'গ',
  'O': 'ঘ',
  'p': 'ড়',
  'P': 'ঢ়',
  '[': 'ো',
  '{': '{',
  ']': 'ৌ',
  '}': '}',
  '\\': 'ৎ',
  '|': 'ঃ',

  // ── Home row: a s d f g h j k l ; ' ──
  'a': 'ৃ',
  'A': 'ঋ',
  's': 'ু',
  'S': 'ূ',
  'd': 'ি',
  'D': 'ী',
  'f': 'া',
  'F': 'অ',
  'g': '্',   // Hasanta / Linker
  'G': '।',   // Dari (Bengali Period)
  'h': 'ব',
  'H': 'ভ',
  'j': 'ক',
  'J': 'খ',
  'k': 'ত',
  'K': 'থ',
  'l': 'দ',
  'L': 'ধ',
  ';': ';',
  ':': ':',
  "'": "'",
  '"': '"',

  // ── Bottom row: z x c v b n m , . / ──
  'z': '্র',  // Ra-fola
  'Z': 'র্',  // Reph (handled specially if typed before consonant)
  'x': 'ও',
  'X': 'ঔ',
  'c': 'ে',
  'C': 'ৈ',
  'v': 'র',
  'V': 'ল',
  'b': 'ন',
  'B': 'ণ',
  'n': 'স',
  'N': 'ষ',
  'm': 'ম',
  'M': 'শ',
  ',': ',',
  '<': '<',
  '.': '.',
  '>': '>',
  '/': '/',
  '?': '?',
  ' ': ' ',
};

// Vowel composition when typed after 'g' (Linker / ্)
export const BIJOY_G_VOWEL_MAP: Record<string, string> = {
  'f': 'আ', // g + f = আ
  'F': 'অ', // g + F = অ
  'd': 'ই', // g + d = ই
  'D': 'ঈ', // g + D = ঈ
  's': 'উ', // g + s = উ
  'S': 'ঊ', // g + S = ঊ
  'a': 'ঋ', // g + a = ঋ
  'c': 'এ', // g + c = এ
  'C': 'ঐ', // g + C = ঐ
  'x': 'ও', // g + x = ও
  'X': 'ঔ', // g + X = ঔ
};

/**
 * Check if character has Bijoy mapping
 */
export function isBijoyKey(char: string): boolean {
  return char in BIJOY_KEYMAP;
}

/**
 * Convert a single Bijoy keystroke to Unicode Bengali.
 * If prevChar was Linker '্', checks if it forms a composite vowel (e.g. g + f -> আ).
 */
export function bijoyCharToUnicode(char: string, prevChar?: string): { text: string; replacePrev: boolean } {
  if (prevChar === '্' && BIJOY_G_VOWEL_MAP[char]) {
    return { text: BIJOY_G_VOWEL_MAP[char], replacePrev: true };
  }
  const mapped = BIJOY_KEYMAP[char] ?? char;
  return { text: mapped, replacePrev: false };
}

/**
 * Convert entire string from Bijoy ASCII to Unicode
 */
export function bijoyStringToUnicode(text: string): string {
  let result = '';
  for (let i = 0; i < text.length; i++) {
    const prev = result.length > 0 ? result[result.length - 1] : undefined;
    const { text: mapped, replacePrev } = bijoyCharToUnicode(text[i], prev);
    if (replacePrev && result.length > 0) {
      result = result.slice(0, -1) + mapped;
    } else {
      result += mapped;
    }
  }
  return result;
}
