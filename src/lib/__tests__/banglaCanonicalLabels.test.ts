import { describe, it, expect } from 'vitest';
import { checkBanglaDesignation, normalizeBn } from '@/lib/banglaDesignationSpellCheck';
import { CANONICAL_BANGLA_LABELS } from '@/lib/banglaCanonicalLabels';
import { DEFAULT_RESULT_SIGNATORIES } from '@/lib/resultExport';

/**
 * Guardrail tests for critical Bangla labels.
 * These tests lock canonical spellings so future edits cannot silently
 * reintroduce known typos (e.g. কোষাধ্যক / মুহতামীম / প্রিন্সীপাল).
 *
 * The single source of truth lives in `src/lib/banglaCanonicalLabels.ts`
 * and is consumed by result sheets, printable profiles, certificates, etc.
 */

const CANONICAL_LABELS = CANONICAL_BANGLA_LABELS;

describe('Bangla canonical labels — spelling guardrails', () => {
  it('exposes the exact canonical Bangla strings (snapshot lock)', () => {
    expect(CANONICAL_LABELS).toMatchInlineSnapshot(`
      {
        "accountant": "হিসাবরক্ষক",
        "assistantTeacher": "সহকারী শিক্ষক",
        "classTeacher": "শ্রেণি শিক্ষক",
        "cleaner": "পরিচ্ছন্নতা কর্মী",
        "educationSecretary": "শিক্ষা সচিব",
        "examController": "পরীক্ষা নিয়ন্ত্রক",
        "founder": "প্রতিষ্ঠাতা",
        "headmaster": "অধ্যক্ষ",
        "muezzin": "মুয়াজ্জিন",
        "muhtamim": "মুহতামিম",
        "nightGuard": "নৈশ প্রহরী",
        "principal": "প্রিন্সিপাল",
        "superAdmin": "সুপার অ্যাডমিন",
        "treasurer": "কোষাধ্যক্ষ",
        "vicePrincipal": "উপাধ্যক্ষ",
      }
    `);
  });

  it.each(Object.entries(CANONICAL_LABELS))(
    'canonical "%s" passes spell-check without warnings',
    (_key, label) => {
      const r = checkBanglaDesignation(label, []);
      expect(r.ok).toBe(true);
      expect(r.level).toBe('ok');
    }
  );
});

describe('Result sheet signatories use canonical labels', () => {
  it('default signatories pull from the canonical map (no hardcoded typos)', () => {
    const titles = DEFAULT_RESULT_SIGNATORIES.map((s) => s.title_bn);
    expect(titles).toContain(CANONICAL_LABELS.classTeacher);
    expect(titles).toContain(CANONICAL_LABELS.examController);
    expect(titles).toContain(CANONICAL_LABELS.educationSecretary);
    const principalSlot = titles.find((t) => t?.includes(CANONICAL_LABELS.muhtamim));
    expect(principalSlot).toBeDefined();
    expect(principalSlot).toContain(CANONICAL_LABELS.headmaster);
  });
});

describe('Known misspellings are flagged', () => {
  const WRONG_TO_RIGHT: Array<[string, string]> = [
    ['কোষাধ্যক', 'কোষাধ্যক্ষ'],
    ['কোষাধক্ষ', 'কোষাধ্যক্ষ'],
    ['কোষাধ্যাক্ষ', 'কোষাধ্যক্ষ'],
    ['মুহতামীম', 'মুহতামিম'],
    ['মোহতামিম', 'মুহতামিম'],
    ['প্রিন্সীপাল', 'প্রিন্সিপাল'],
    ['প্রিন্সিপ্যাল', 'প্রিন্সিপাল'],
    ['অধ্যক', 'অধ্যক্ষ'],
    ['উপাধ্যক', 'উপাধ্যক্ষ'],
    ['প্রতিষ্টাতা', 'প্রতিষ্ঠাতা'],
    ['সহকারি শিক্ষক', 'সহকারী শিক্ষক'],
    ['মুয়াজ্জীন', 'মুয়াজ্জিন'],
    ['নৈশ্য প্রহরী', 'নৈশ প্রহরী'],
  ];

  it.each(WRONG_TO_RIGHT)('flags "%s" and suggests "%s"', (wrong, right) => {
    const r = checkBanglaDesignation(wrong, []);
    expect(r.ok).toBe(false);
    expect(r.suggestion).toBe(right);
  });

  it('rejects non-Bangla input', () => {
    const r = checkBanglaDesignation('Treasurer', []);
    expect(r.ok).toBe(false);
    expect(r.level).toBe('error');
  });

  it('warns on near-duplicate of an existing entry', () => {
    const r = checkBanglaDesignation('সহকারী শিক্ষকা', ['সহকারী শিক্ষক']);
    expect(r.ok).toBe(false);
    expect(r.level).toBe('warn');
  });
});

describe('normalizeBn', () => {
  it('strips ZWJ/ZWNJ and collapses whitespace', () => {
    expect(normalizeBn('কোষাধ্যক্ষ\u200c')).toBe('কোষাধ্যক্ষ');
    expect(normalizeBn('  সুপার   অ্যাডমিন  ')).toBe('সুপার অ্যাডমিন');
  });
});
