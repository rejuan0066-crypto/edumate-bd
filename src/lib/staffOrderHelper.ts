/**
 * Staff Order Helper
 * Provides department-wise sorting, category resolution, and serial ordering
 * across all staff and teacher pages.
 */
import { deduplicateRepeatedWords, normalizeStaffName } from './nameFormatter';

export interface DepartmentConfig {
  key: string;
  name_bn?: string;
  name?: string;
  sort_order?: number;
}

export interface DesignationConfig {
  id?: string;
  name?: string;
  name_bn?: string;
  staff_category?: string;
  sort_order?: number;
}

// Canonical department ordering priorities (lower number = comes first)
// User requirement: প্রশাসন বিভাগ ১ নাম্বার হবে (Administrative is Rank #1)
export const CANONICAL_DEPARTMENT_ORDER: Record<string, number> = {
  administrative: 10,
  admin: 10,
  teacher: 20,
  teaching: 20,
  academic: 20,
  support: 30,
  office: 30,
  general: 40,
  residential: 50,
  hostel: 50,
  service: 60,
  other: 90,
};

export const CANONICAL_DEPARTMENT_LABELS: Record<string, { bn: string; en: string }> = {
  administrative: { bn: 'প্রশাসন বিভাগ', en: 'Administrative' },
  teacher: { bn: 'শিক্ষা বিভাগ / শিক্ষক', en: 'Teaching / Academic' },
  support: { bn: 'অফিস / সাপোর্ট স্টাফ', en: 'Support Staff' },
  general: { bn: 'সহায়ক কর্মী / সাধারণ বিভাগ', en: 'General Staff' },
};

const TEACHER_KEYWORDS = [
  'teacher', 'teaching', 'শিক্ষক', 'মুআল্লিম', 'মুয়াল্লিম', 'উস্তাদ', 'ustaz', 'ustad',
  'হিফয', 'কোরআন', 'কুরআন', 'আরবি', 'নাজিম', 'মুহতামিম', 'মুহাদ্দিস', 'মুফতি', 'মাওলানা', 'খতিব', 'ইমাম'
];

const ADMIN_KEYWORDS = [
  'administrative', 'admin', 'প্রশাসন', 'প্রশাসনিক', 'principal', 'প্রিন্সিপাল',
  'অধ্যক্ষ', 'উপাধ্যক্ষ', 'vice-principal', 'পরিচালক', 'director', 'সুপারিনটেনডেন্ট', 'superintendent', 'ম্যানেজার', 'manager'
];

const SUPPORT_KEYWORDS = [
  'support', 'অফিস', 'কেরানি', 'clerk', 'হিসাবরক্ষক', 'accountant', 'লাইব্রেরিয়ান', 'librarian',
  'অপারেটর', 'operator', 'কম্পিউটার', 'computer', 'ডাটা এন্ট্রি', 'data entry', 'সহকারী'
];

const GENERAL_KEYWORDS = [
  'general', 'সহায়ক', 'সহায়ক', 'পিয়ন', 'peon', 'বাবুর্চি', 'cook', 'chef', 'খাদেম', 'গার্ড',
  'guard', 'দারোয়ান', 'নিরাপত্তা', 'security', 'পরিচ্ছন্নতাকর্মী', 'cleaner', 'ড্রাইভার', 'driver', 'মালি'
];

/**
 * Resolves a staff member's category / department key ('teacher', 'administrative', 'support', 'general', etc.)
 */
export function getStaffCategoryKey(
  staff: any,
  designationsList?: DesignationConfig[],
  knownCategoryKeys?: Set<string>
): string {
  if (!staff) return 'general';

  const isKnown = (k: string) => !knownCategoryKeys || knownCategoryKeys.size === 0 || knownCategoryKeys.has(k);

  // 1. Direct explicit staff_category (if valid and not default 'general' fallback)
  if (staff.staff_category && staff.staff_category !== 'general' && isKnown(staff.staff_category)) {
    return staff.staff_category;
  }

  // 2. Check designation from master designations list
  const desig = (staff.designation || '').trim();
  if (desig && designationsList && designationsList.length > 0) {
    const matched = designationsList.find(d =>
      (d.name_bn && d.name_bn.toLowerCase() === desig.toLowerCase()) ||
      (d.name && d.name.toLowerCase() === desig.toLowerCase())
    );
    if (matched?.staff_category && isKnown(matched.staff_category)) {
      return matched.staff_category;
    }
  }

  // 3. Check designation keywords
  const desigLower = desig.toLowerCase();
  if (isKnown('teacher') && TEACHER_KEYWORDS.some(k => desigLower.includes(k))) return 'teacher';
  if (isKnown('administrative') && ADMIN_KEYWORDS.some(k => desigLower.includes(k))) return 'administrative';
  if (isKnown('support') && SUPPORT_KEYWORDS.some(k => desigLower.includes(k))) return 'support';
  if (isKnown('general') && GENERAL_KEYWORDS.some(k => desigLower.includes(k))) return 'general';

  // 4. Fallback to department text
  const dept = (staff.department || '').trim().toLowerCase();
  if (isKnown('teacher') && (dept.includes('শিক্ষক') || dept.includes('শিক্ষা') || dept === 'teacher' || dept === 'teaching')) return 'teacher';
  if (isKnown('administrative') && (dept.includes('প্রশাসন') || dept === 'administrative' || dept === 'admin')) return 'administrative';
  if (isKnown('support') && (dept.includes('অফিস') || dept === 'support' || dept === 'office')) return 'support';
  if (isKnown('general') && (dept.includes('সহায়ক') || dept.includes('সাধারণ') || dept === 'general')) return 'general';

  // 5. If staff_category is present (even 'general'), return it
  if (staff.staff_category && isKnown(staff.staff_category)) {
    return staff.staff_category;
  }

  return 'general';
}

/**
 * Returns numeric priority for department sort (lower = first)
 */
export function getDepartmentPriority(
  categoryKey: string,
  categoriesList?: DepartmentConfig[]
): number {
  // User requirement: প্রশাসন বিভাগ ১ নাম্বার (Administrative is Rank #1)
  if (categoryKey === 'administrative' || categoryKey === 'admin') {
    return 10;
  }
  if (categoryKey === 'teacher' || categoryKey === 'teaching' || categoryKey === 'academic') {
    return 20;
  }
  if (categoryKey === 'support' || categoryKey === 'office') {
    return 30;
  }
  if (categoryKey === 'general') {
    return 40;
  }

  if (categoriesList && categoriesList.length > 0) {
    const found = categoriesList.find(c => c.key === categoryKey);
    if (found && typeof found.sort_order === 'number' && found.sort_order > 0) {
      return 40 + (found.sort_order * 10);
    }
  }

  return CANONICAL_DEPARTMENT_ORDER[categoryKey] ?? 100;
}

/**
 * Returns human-readable label for department / category
 */
export function getDepartmentLabel(
  categoryKey: string,
  bn: boolean = true,
  categoriesList?: DepartmentConfig[]
): string {
  if (categoriesList && categoriesList.length > 0) {
    const found = categoriesList.find(c => c.key === categoryKey);
    if (found) {
      return bn ? (found.name_bn || found.name || categoryKey) : (found.name || found.name_bn || categoryKey);
    }
  }

  const def = CANONICAL_DEPARTMENT_LABELS[categoryKey];
  if (def) {
    return bn ? def.bn : def.en;
  }

  return categoryKey;
}

/**
 * Sorts staff array by:
 * 1. Department / Category order (teacher -> administrative -> support -> general -> ...)
 * 2. salary_order (if present, ascending, nulls last)
 * 3. Designation sort_order (if known from master list)
 * 4. staff_id (natural alphanumeric ascending)
 * 5. Name (locale compare)
 */
export function sortStaffByDepartment<T extends Record<string, any>>(
  staffList: T[],
  options?: {
    categories?: DepartmentConfig[];
    designations?: DesignationConfig[];
    bn?: boolean;
    knownCategoryKeys?: Set<string>;
    deduplicate?: boolean;
  }
): T[] {
  if (!Array.isArray(staffList) || staffList.length <= 1) {
    return staffList ? [...staffList] : [];
  }

  const categories = options?.categories;
  const designations = options?.designations;
  const knownKeys = options?.knownCategoryKeys;
  const bn = options?.bn !== false;
  const shouldDedup = options?.deduplicate !== false;

  // Build unique cleaned list
  let preparedList = staffList.map((item) => {
    if (item && typeof item === 'object' && item.name_bn) {
      const cleaned = deduplicateRepeatedWords(item.name_bn);
      if (cleaned !== item.name_bn) {
        return { ...item, name_bn: cleaned };
      }
    }
    return item;
  });

  if (shouldDedup) {
    const seenIds = new Set<string>();
    const seenNormalizedNames = new Map<string, T>();
    const uniqueList: T[] = [];

    for (const item of preparedList) {
      const id = (item as any)?.id;
      if (id) {
        if (seenIds.has(id)) continue;
        seenIds.add(id);
      }

      // Check normalized name to prevent duplicate person rows (e.g. Maulana Farhan appearing 2 times)
      const normName = normalizeStaffName((item as any)?.name_bn || (item as any)?.name);
      if (normName) {
        const existing = seenNormalizedNames.get(normName);
        if (existing) {
          // Compare existing vs current to pick the best canonical staff:
          // 1. Prefer NOT soft-deleted over soft-deleted
          // 2. Prefer 'active' status over 'inactive' / 'resigned'
          // 3. Prefer valid non-temporary staff_id
          const existingDeleted = !!(existing as any).deleted_at;
          const currentDeleted = !!(item as any).deleted_at;
          const existingActive = (existing as any).status === 'active';
          const currentActive = (item as any).status === 'active';
          const existingHasId = !!((existing as any).staff_id && !(existing as any).staff_id.startsWith('temp_'));
          const currentHasId = !!((item as any).staff_id && !(item as any).staff_id.startsWith('temp_'));

          let shouldReplace = false;
          if (existingDeleted && !currentDeleted) shouldReplace = true;
          else if (!existingDeleted && currentDeleted) shouldReplace = false;
          else if (!existingActive && currentActive) shouldReplace = true;
          else if (existingActive && !currentActive) shouldReplace = false;
          else if (!existingHasId && currentHasId) shouldReplace = true;

          if (shouldReplace) {
            const idx = uniqueList.indexOf(existing);
            if (idx > -1) uniqueList.splice(idx, 1);
            seenNormalizedNames.set(normName, item);
            uniqueList.push(item);
          }
          continue;
        }
        seenNormalizedNames.set(normName, item);
      }

      uniqueList.push(item);
    }
    preparedList = uniqueList;
  }

  // Build quick map for designation sort_order
  const desigSortMap = new Map<string, number>();
  if (designations && designations.length > 0) {
    designations.forEach((d, i) => {
      const order = typeof d.sort_order === 'number' ? d.sort_order : i;
      if (d.name_bn) desigSortMap.set(d.name_bn.toLowerCase().trim(), order);
      if (d.name) desigSortMap.set(d.name.toLowerCase().trim(), order);
    });
  }

  return [...preparedList].sort((a: any, b: any) => {
    // 1. Department order
    const catA = getStaffCategoryKey(a, designations, knownKeys);
    const catB = getStaffCategoryKey(b, designations, knownKeys);
    const prioA = getDepartmentPriority(catA, categories);
    const prioB = getDepartmentPriority(catB, categories);

    if (prioA !== prioB) {
      return prioA - prioB;
    }

    // 2. salary_order (explicit custom serial)
    const hasOrderA = typeof a.salary_order === 'number' && !isNaN(a.salary_order) && a.salary_order > 0;
    const hasOrderB = typeof b.salary_order === 'number' && !isNaN(b.salary_order) && b.salary_order > 0;

    if (hasOrderA && hasOrderB && a.salary_order !== b.salary_order) {
      return a.salary_order - b.salary_order;
    }
    if (hasOrderA && !hasOrderB) return -1;
    if (!hasOrderA && hasOrderB) return 1;

    // 3. Designation sort_order
    const desigA = (a.designation || '').toLowerCase().trim();
    const desigB = (b.designation || '').toLowerCase().trim();
    const dOrderA = desigSortMap.get(desigA);
    const dOrderB = desigSortMap.get(desigB);

    if (typeof dOrderA === 'number' && typeof dOrderB === 'number' && dOrderA !== dOrderB) {
      return dOrderA - dOrderB;
    }
    if (typeof dOrderA === 'number' && typeof dOrderB !== 'number') return -1;
    if (typeof dOrderA !== 'number' && typeof dOrderB === 'number') return 1;

    // 4. staff_id (natural sort)
    const idA = String(a.staff_id || '').trim();
    const idB = String(b.staff_id || '').trim();
    if (idA && idB && idA !== idB) {
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    }
    if (idA && !idB) return -1;
    if (!idA && idB) return 1;

    // 5. Name
    const nameA = String((bn ? (a.name_bn || a.name_en) : (a.name_en || a.name_bn)) || '');
    const nameB = String((bn ? (b.name_bn || b.name_en) : (b.name_en || b.name_bn)) || '');
    return nameA.localeCompare(nameB, bn ? 'bn' : 'en');
  });
}
