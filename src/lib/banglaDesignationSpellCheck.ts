/**
 * Lightweight Bangla spelling helper for designation/department names.
 * - Normalizes common Unicode variants (zwj/zwnj, dotless ya, alt forms).
 * - Suggests corrections from a curated dictionary of common school/madrasah designations.
 * - Computes Levenshtein distance to detect typos & near-duplicates against existing list.
 */

// Curated correct spellings (lowercase-folded keys → canonical Bangla)
const CANONICAL: Record<string, string> = {
  'কোষাধক্য': 'কোষাধ্যক্ষ',
  'কোষাধ্যক': 'কোষাধ্যক্ষ',
  'কোষাধক্ষ': 'কোষাধ্যক্ষ',
  'কোষাধ্যাক্ষ': 'কোষাধ্যক্ষ',
  'মুহতামীম': 'মুহতামিম',
  'মুহতামিন': 'মুহতামিম',
  'মোহতামিম': 'মুহতামিম',
  'প্রিন্সীপাল': 'প্রিন্সিপাল',
  'প্রিনসিপাল': 'প্রিন্সিপাল',
  'প্রিন্সিপ্যাল': 'প্রিন্সিপাল',
  'অধ্যক্য': 'অধ্যক্ষ',
  'অধ্যক': 'অধ্যক্ষ',
  'উপাধ্যক্য': 'উপাধ্যক্ষ',
  'উপাধ্যক': 'উপাধ্যক্ষ',
  'প্রতিষ্টাতা': 'প্রতিষ্ঠাতা',
  'প্রতিস্ঠাতা': 'প্রতিষ্ঠাতা',
  'হিসাব রক্ষক': 'হিসাবরক্ষক',
  'হিসাবরক্ষক ': 'হিসাবরক্ষক',
  'সহকারি': 'সহকারী',
  'সহকারি শিক্ষক': 'সহকারী শিক্ষক',
  'মৌলবী': 'মৌলভী',
  'মুয়াজ্জীন': 'মুয়াজ্জিন',
  'মোয়াজ্জিন': 'মুয়াজ্জিন',
  'ইমাম সাহেব': 'ইমাম',
  'নৈশ্য প্রহরী': 'নৈশ প্রহরী',
  'দপ্তরী': 'দপ্তরি',
  'পরিচ্ছন্ন কর্মী': 'পরিচ্ছন্নতা কর্মী',
};

/** Strip ZWJ/ZWNJ and trim repeated spaces */
export const normalizeBn = (s: string): string =>
  (s || '')
    .replace(/[\u200c\u200d]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Levenshtein distance (small strings only) */
function lev(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}

export interface SpellCheckResult {
  ok: boolean;
  level: 'ok' | 'warn' | 'error';
  message?: string;
  suggestion?: string;
}

/**
 * @param input - user-entered Bangla text
 * @param existing - existing designation list to check duplicates/near-typos
 */
export function checkBanglaDesignation(
  input: string,
  existing: string[] = []
): SpellCheckResult {
  const v = normalizeBn(input);
  if (!v) return { ok: true, level: 'ok' };

  // 1. Bangla script presence
  if (!/[\u0980-\u09FF]/.test(v)) {
    return {
      ok: false,
      level: 'error',
      message: 'বাংলা অক্ষরে লিখুন (ইংরেজি নাম আলাদা ফিল্ডে দিন)।',
    };
  }

  // 2. Stray Latin character mixed in
  if (/[A-Za-z]/.test(v)) {
    return {
      ok: false,
      level: 'warn',
      message: 'বাংলা লেখায় ইংরেজি অক্ষর মিশে আছে — যাচাই করুন।',
    };
  }

  // 3. Direct dictionary hit (case-insensitive) — wrong spelling we know
  const lower = v.toLowerCase();
  for (const [wrong, right] of Object.entries(CANONICAL)) {
    if (lower === wrong.toLowerCase()) {
      return {
        ok: false,
        level: 'error',
        message: `সম্ভাব্য ভুল বানান। সঠিক: "${right}"`,
        suggestion: right,
      };
    }
  }

  // 4. Near-duplicate of an existing designation (case-insensitive)
  const existingNorm = existing
    .map((e) => normalizeBn(e || ''))
    .filter((e) => e && e !== v);
  for (const e of existingNorm) {
    if (e.toLowerCase() === lower) {
      return {
        ok: false,
        level: 'error',
        message: 'একই নামের পদবি ইতিমধ্যেই আছে।',
      };
    }
    const d = lev(lower, e.toLowerCase());
    if (d > 0 && d <= 2 && Math.max(lower.length, e.length) >= 4) {
      return {
        ok: false,
        level: 'warn',
        message: `প্রায় একই রকম পদবি আছে: "${e}" — ডুপ্লিকেট কিনা যাচাই করুন।`,
        suggestion: e,
      };
    }
  }

  // 5. Soft check: contains canonical fragment in wrong form
  for (const [wrong, right] of Object.entries(CANONICAL)) {
    if (lower.includes(wrong.toLowerCase()) && !lower.includes(right.toLowerCase())) {
      return {
        ok: false,
        level: 'warn',
        message: `"${wrong}" সম্ভবত ভুল বানান — সঠিক: "${right}"`,
        suggestion: v.replace(new RegExp(wrong, 'gi'), right),
      };
    }
  }

  return { ok: true, level: 'ok' };
}
