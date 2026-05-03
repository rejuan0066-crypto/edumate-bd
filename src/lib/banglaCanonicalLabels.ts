/**
 * Single source of truth for canonical Bangla labels used in result sheets,
 * printable lists, signatures and other documents.
 *
 * If anyone edits a value here, the snapshot test in
 * `src/lib/__tests__/banglaCanonicalLabels.test.ts` will fail, preventing
 * silent reintroduction of known typos (e.g. কোষাধ্যক, মুহতামীম, প্রিন্সীপাল).
 *
 * USAGE:
 *   import { CANONICAL_BANGLA_LABELS as L } from '@/lib/banglaCanonicalLabels';
 *   const title = L.principal; // 'প্রিন্সিপাল'
 */
export const CANONICAL_BANGLA_LABELS = {
  // Designations / signatories
  treasurer: 'কোষাধ্যক্ষ',
  principal: 'প্রিন্সিপাল',
  muhtamim: 'মুহতামিম',
  vicePrincipal: 'উপাধ্যক্ষ',
  headmaster: 'অধ্যক্ষ',
  founder: 'প্রতিষ্ঠাতা',
  accountant: 'হিসাবরক্ষক',
  assistantTeacher: 'সহকারী শিক্ষক',
  classTeacher: 'শ্রেণি শিক্ষক',
  examController: 'পরীক্ষা নিয়ন্ত্রক',
  educationSecretary: 'শিক্ষা সচিব',
  muezzin: 'মুয়াজ্জিন',
  nightGuard: 'নৈশ প্রহরী',
  cleaner: 'পরিচ্ছন্নতা কর্মী',

  // Roles
  superAdmin: 'সুপার অ্যাডমিন',
} as const;

export type CanonicalBanglaLabelKey = keyof typeof CANONICAL_BANGLA_LABELS;
