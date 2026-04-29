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

const norm = (s?: string | null) => (s || '').trim().toLowerCase();

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
