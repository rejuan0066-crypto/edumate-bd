export type RoleDesignationBadge = {
  key: string;
  label: string;
  kind: 'role' | 'designation';
};

const roleLabelMap: Record<string, { bn: string; en: string }> = {
  super_admin: { bn: 'সুপার অ্যাডমিন', en: 'Super Admin' },
  admin: { bn: 'অ্যাডমিন', en: 'Admin' },
  teacher: { bn: 'শিক্ষক', en: 'Teacher' },
  staff: { bn: 'স্টাফ', en: 'Staff' },
};

// Aggressive normalization for fuzzy duplicate detection across visually-equivalent
// Bengali variants. Strips diacritics, vowel signs, virama (hasanta) and whitespace
// so "সুপার এডমিন" and "সুপার অ্যাডমিন" collapse to the same key.
const norm = (s?: string | null): string => {
  if (!s) return '';
  return s
    .normalize('NFKD')
    .toLowerCase()
    // Remove all Bengali vowel signs/marks (U+0980-U+09FF combining marks) and ASCII punctuation/space
    .replace(/[\u0981-\u0983\u09BC-\u09C4\u09C7-\u09C8\u09CB-\u09CD\u09D7\u09E2-\u09E3\u200C\u200D\s_\-./()]/g, '')
    // Treat independent vowels অ/আ/এ/অ্যা as the same canonical "a" by dropping them when adjacent to consonants
    .replace(/[\u0985\u0986\u098F\u0990]/g, '')
    .trim();
};


/**
 * Single source of truth for role + designation badges across the app.
 * Returns at most one role badge and one designation badge, with the
 * designation suppressed when it duplicates the localized role label.
 */
export const getRoleDesignationBadges = (params: {
  role?: string | null;
  designation?: string | null;
  bn: boolean;
}): RoleDesignationBadge[] => {
  const { role, designation, bn } = params;
  const badges: RoleDesignationBadge[] = [];
  const seen = new Set<string>();

  if (role) {
    const r = roleLabelMap[role];
    const label = r ? (bn ? r.bn : r.en) : role;
    badges.push({ key: 'role', label, kind: 'role' });
    seen.add(norm(label));
  }

  const trimmed = designation?.trim();
  if (trimmed && !seen.has(norm(trimmed))) {
    badges.push({ key: 'designation', label: trimmed, kind: 'designation' });
  }

  return badges;
};
