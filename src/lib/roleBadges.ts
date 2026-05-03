export type RoleDesignationBadge = {
  key: string;
  label: string;
  kind: 'role' | 'designation';
};

// Static fallback labels — used only when DB-backed translations
// (see `useRoleTranslations` / `role_translations` table) are unavailable.
// Keep this in sync with the seeded rows in the `role_translations` table.
const roleLabelMap: Record<string, { bn: string; en: string }> = {
  super_admin:    { bn: 'সুপার অ্যাডমিন', en: 'Super Admin' },
  admin:          { bn: 'অ্যাডমিন',        en: 'Admin' },
  teacher:        { bn: 'শিক্ষক',          en: 'Teacher' },
  staff:          { bn: 'স্টাফ',            en: 'Staff' },
  administrative: { bn: 'প্রশাসনিক',       en: 'Administrative' },
  support:        { bn: 'সহায়ক কর্মী',     en: 'Support Staff' },
  general:        { bn: 'সাধারণ',          en: 'General' },
};

// Aggressive normalization for fuzzy duplicate detection across visually-equivalent
// Bengali variants. Strips diacritics, vowel signs, virama (hasanta) and whitespace
// so "সুপার এডমিন" and "সুপার অ্যাডমিন" collapse to the same key.
const norm = (s?: string | null): string => {
  if (!s) return '';
  return s
    .normalize('NFKD')
    .toLowerCase()
    // Collapse the "অ্য" glide cluster (independent vowel অ + virama + য) — visually it
    // represents the same "a/e" onset as the bare independent vowel এ in many spellings.
    .replace(/\u0985\u09CD\u09AF/g, '')
    // Remove all Bengali combining marks (vowel signs, virama, nukta) and ASCII separators
    .replace(/[\u0981-\u0983\u09BC-\u09C4\u09C7-\u09C8\u09CB-\u09CD\u09D7\u09E2-\u09E3\u200C\u200D\s_\-./()]/g, '')
    // Treat independent vowels অ/আ/এ/ঐ as equivalent (drop them)
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
  /** Optional dynamic label resolver from `useRoleTranslations()` */
  resolveRoleLabel?: (key: string, bn: boolean) => string;
  /** Optional dynamic designation resolver from `useDesignationTranslations()` */
  resolveDesignationLabel?: (value: string, bn: boolean) => string;
}): RoleDesignationBadge[] => {
  const { role, designation, bn, resolveRoleLabel, resolveDesignationLabel } = params;
  const badges: RoleDesignationBadge[] = [];
  const seen = new Set<string>();

  if (role) {
    const dyn = resolveRoleLabel?.(role, bn);
    const r = roleLabelMap[role];
    const label = (dyn && dyn !== role) ? dyn : (r ? (bn ? r.bn : r.en) : role);
    badges.push({ key: 'role', label, kind: 'role' });
    seen.add(norm(label));
    if (r) {
      seen.add(norm(r.bn));
      seen.add(norm(r.en));
    }
    if (dyn) seen.add(norm(dyn));
    seen.add(norm(role));
  }

  const trimmed = designation?.trim();
  if (trimmed && !seen.has(norm(trimmed))) {
    const dynD = resolveDesignationLabel?.(trimmed, bn);
    const label = (dynD && dynD.trim()) ? dynD : trimmed;
    badges.push({ key: 'designation', label, kind: 'designation' });
  }

  return badges;
};
