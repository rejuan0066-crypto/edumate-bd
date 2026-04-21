// Lightweight Bengali → Latin romanization for English-only certificates / labels.
// Not a perfect transliteration — produces a readable Latin spelling so English-only
// printable documents don't have raw Bangla glyphs in the middle of English text.

const VOWEL_SIGNS: Record<string, string> = {
  'া': 'a', 'ি': 'i', 'ী': 'i', 'ু': 'u', 'ূ': 'u',
  'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
};

const VOWELS: Record<string, string> = {
  'অ': 'a', 'আ': 'a', 'ই': 'i', 'ঈ': 'i', 'উ': 'u', 'ঊ': 'u',
  'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
};

const CONSONANTS: Record<string, string> = {
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'n',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'y', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh',
  'স': 's', 'হ': 'h', 'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y',
  'ৎ': 't', 'ং': 'ng', 'ঃ': 'h', 'ঁ': 'n',
};

const DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

const HASANTA = '্';

/** Returns true if string contains any Bangla unicode glyph. */
export const containsBangla = (s: string): boolean => /[\u0980-\u09FF]/.test(s || '');

/** Romanize Bangla string into a readable Latin form. ASCII passes through. */
export function romanizeBangla(input: string): string {
  if (!input) return '';
  if (!containsBangla(input)) return input;

  let out = '';
  let prevWasConsonant = false;
  const chars = Array.from(input);

  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];

    if (CONSONANTS[c] !== undefined) {
      // If previous consonant had no vowel sign / hasanta following, insert inherent 'a'.
      if (prevWasConsonant) {
        out += 'a';
      }
      out += CONSONANTS[c];
      prevWasConsonant = true;
      continue;
    }
    if (VOWEL_SIGNS[c] !== undefined) {
      out += VOWEL_SIGNS[c];
      prevWasConsonant = false;
      continue;
    }
    if (VOWELS[c] !== undefined) {
      if (prevWasConsonant) out += 'a';
      out += VOWELS[c];
      prevWasConsonant = false;
      continue;
    }
    if (c === HASANTA) {
      // Suppress inherent vowel for previous consonant.
      prevWasConsonant = false;
      continue;
    }
    if (DIGITS[c] !== undefined) {
      if (prevWasConsonant) { out += 'a'; prevWasConsonant = false; }
      out += DIGITS[c];
      continue;
    }

    // Word boundary or punctuation — flush inherent vowel only if word-ending consonant
    // (heuristic: keep words readable, drop trailing inherent 'a' which is usually silent).
    if (prevWasConsonant && /\s|[.,;:!?\-—()'"]/.test(c)) {
      // do not add trailing 'a'
    }
    prevWasConsonant = false;
    out += c;
  }

  // Capitalize first letter of each space-separated word for proper-noun feel.
  return out
    .split(/(\s+)/)
    .map(w => /^\s+$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
}
