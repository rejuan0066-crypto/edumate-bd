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
  teacher_hifz: 20,
  hifz: 20,
  teacher_nurani_kitab: 21,
  teacher: 22,
  teaching: 22,
  academic: 22,
  support: 30,
  office: 30,
  general: 40,
  residential: 50,
  hostel: 50,
  service: 60,
  other: 90,
};

export const isTeacherCategory = (categoryKey?: string | null): boolean => {
  if (!categoryKey) return false;
  const k = categoryKey.toLowerCase();
  return (
    k === 'teacher' ||
    k === 'teacher_nurani_kitab' ||
    k === 'teacher_hifz' ||
    k === 'hifz' ||
    k.startsWith('teacher') ||
    k.includes('nurani') ||
    k.includes('kitab') ||
    k === 'teaching' ||
    k === 'academic' ||
    k === 'education'
  );
};

export const CANONICAL_DEPARTMENT_LABELS: Record<string, { bn: string; en: string }> = {
  administrative: { bn: 'প্রশাসন বিভাগ', en: 'Administrative' },
  teacher: { bn: 'শিক্ষা বিভাগ', en: 'Teaching / Education' },
  support: { bn: 'অফিস বিভাগ', en: 'Office Department' },
  general: { bn: 'সাধারণ বিভাগ', en: 'General Department' },
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
  knownCategoryKeys?: Set<string>,
  categoriesList?: DepartmentConfig[]
): string {
  if (!staff) return 'general';

  const isKnown = (k: string) => !knownCategoryKeys || knownCategoryKeys.size === 0 || knownCategoryKeys.has(k);
  const hasCustomKey = (k: string) => !!knownCategoryKeys && knownCategoryKeys.has(k);

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

  // 3. Dynamic match against categories list (matches departments from DB staff_categories)
  const dept = (staff.department || '').trim().toLowerCase();
  const desigLower = desig.toLowerCase();
  if (categoriesList && categoriesList.length > 0) {
    for (const cat of categoriesList) {
      const cKey = cat.key;
      const cNameBn = (cat.name_bn || '').trim().toLowerCase();
      const cNameEn = (cat.name || '').trim().toLowerCase();
      if (
        (cNameBn && (dept.includes(cNameBn) || desigLower.includes(cNameBn))) ||
        (cNameEn && (dept.includes(cNameEn) || desigLower.includes(cNameEn))) ||
        dept === cKey.toLowerCase()
      ) {
        if (isKnown(cKey)) return cKey;
      }
    }
  }

  // 4. Check dynamic category keywords ONLY if specifically registered as a category
  if (hasCustomKey('chef') && (desigLower.includes('বাবুর্চি') || desigLower.includes('cook') || desigLower.includes('chef') || dept.includes('রান্না') || dept.includes('কিচেন'))) return 'chef';
  if (hasCustomKey('director') && (desigLower.includes('পরিচালক') || desigLower.includes('director') || dept.includes('পরিচালক'))) return 'director';
  if (hasCustomKey('committee_member') && (desigLower.includes('কমিটি') || desigLower.includes('committee') || dept.includes('কমিটি'))) return 'committee_member';

  // Hifz teacher category check
  if ((hasCustomKey('teacher_hifz') || hasCustomKey('hifz')) && (desigLower.includes('হিফয') || desigLower.includes('হিফজ') || desigLower.includes('কুরআন') || desigLower.includes('কোরআন') || desigLower.includes('নাজেরা') || dept.includes('হিফজ') || dept.includes('হিফয'))) {
    return hasCustomKey('teacher_hifz') ? 'teacher_hifz' : 'hifz';
  }

  // Noorani & Kitab teacher category check
  if ((hasCustomKey('teacher_nurani_kitab') || hasCustomKey('nurani_kitab')) && (desigLower.includes('নূরানী') || desigLower.includes('কিতাব') || desigLower.includes('মুহাদ্দিস') || desigLower.includes('সহকারী শিক্ষক') || TEACHER_KEYWORDS.some(k => desigLower.includes(k)))) {
    return hasCustomKey('teacher_nurani_kitab') ? 'teacher_nurani_kitab' : 'nurani_kitab';
  }

  // 5. Standard designation keywords
  if (isKnown('teacher') && TEACHER_KEYWORDS.some(k => desigLower.includes(k))) return 'teacher';
  if (isKnown('administrative') && ADMIN_KEYWORDS.some(k => desigLower.includes(k))) return 'administrative';
  if (isKnown('support') && SUPPORT_KEYWORDS.some(k => desigLower.includes(k))) return 'support';
  if (isKnown('general') && (GENERAL_KEYWORDS.some(k => desigLower.includes(k)) || desigLower.includes('বাবুর্চি') || desigLower.includes('cook'))) return 'general';

  // 6. Standard fallback to department text
  if (isKnown('teacher') && (dept.includes('শিক্ষক') || dept.includes('শিক্ষা') || dept === 'teacher' || dept === 'teaching')) return 'teacher';
  if (isKnown('administrative') && (dept.includes('প্রশাসন') || dept === 'administrative' || dept === 'admin')) return 'administrative';
  if (isKnown('support') && (dept.includes('অফিস') || dept === 'support' || dept === 'office')) return 'support';
  if (isKnown('general') && (dept.includes('সহায়ক') || dept.includes('সাধারণ') || dept === 'general')) return 'general';

  // 7. If staff_category is present (even 'general'), return it
  if (staff.staff_category && isKnown(staff.staff_category)) {
    return staff.staff_category;
  }

  return 'general';
}

/**
 * Returns numeric priority for staff prefix / department (lower = first)
 * Priority order: ADM (10) < TCH (20) < OFF (30) < STF (40) < RES (50) < CH (60)
 */
export function getStaffPrefixPriority(
  staff: any,
  categoriesList?: DepartmentConfig[]
): number {
  if (!staff) return 99;

  // 1. Extract prefix from staff_id if present (e.g. TCH-2026-2004 -> TCH)
  const staffId = String(staff.staff_id || '').trim().toUpperCase();
  const idPrefixMatch = staffId.match(/^([A-Z]+)/);
  const idPrefix = idPrefixMatch ? idPrefixMatch[1] : '';

  if (idPrefix) {
    if (idPrefix === 'ADM' || idPrefix === 'ADMIN') return 10;
    if (idPrefix === 'DIR') return 12;
    if (idPrefix === 'TCH' || idPrefix === 'TEACHER') return 20;
    if (idPrefix === 'HIFZ') return 25;
    if (idPrefix === 'OFF' || idPrefix === 'SUP') return 30;
    if (idPrefix === 'STF' || idPrefix === 'GEN') return 40;
    if (idPrefix === 'RES' || idPrefix === 'HOSTEL') return 50;
    if (idPrefix === 'CH' || idPrefix === 'CHEF' || idPrefix === 'COOK') return 60;
  }

  // 2. If no prefix in staff_id, check department / staff_category priority
  const catKey = String(staff.staff_category || '').toLowerCase();
  if (catKey === 'administrative' || catKey === 'admin') return 10;
  if (isTeacherCategory(catKey)) {
    if (catKey === 'teacher_hifz' || catKey === 'hifz') return 25;
    return 20;
  }
  if (catKey === 'support' || catKey === 'office') return 30;
  if (catKey === 'general' || catKey === 'staff') return 40;
  if (catKey === 'residential' || catKey === 'hostel') return 50;
  if (catKey === 'chef' || catKey === 'cook') return 60;

  return 99;
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
    // 1. Staff Prefix Priority (ADM: 10, TCH: 20, OFF: 30, STF: 40, RES: 50, CH: 60)
    const prioA = getStaffPrefixPriority(a, categories);
    const prioB = getStaffPrefixPriority(b, categories);

    if (prioA !== prioB) {
      return prioA - prioB;
    }

    // 2. staff_id (natural numeric sort within the prefix: e.g. TCH-2026-2004 ... TCH-2026-2017)
    const idA = String(a.staff_id || '').trim();
    const idB = String(b.staff_id || '').trim();
    if (idA && idB && idA !== idB) {
      return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
    }
    if (idA && !idB) return -1;
    if (!idA && idB) return 1;

    // 3. salary_order (tie-breaker if staff_id is missing or identical)
    const hasOrderA = typeof a.salary_order === 'number' && !isNaN(a.salary_order) && a.salary_order > 0;
    const hasOrderB = typeof b.salary_order === 'number' && !isNaN(b.salary_order) && b.salary_order > 0;

    if (hasOrderA && hasOrderB && a.salary_order !== b.salary_order) {
      return a.salary_order - b.salary_order;
    }
    if (hasOrderA && !hasOrderB) return -1;
    if (!hasOrderA && hasOrderB) return 1;

    // 4. Designation sort_order
    const desigA = (a.designation || '').toLowerCase().trim();
    const desigB = (b.designation || '').toLowerCase().trim();
    const dOrderA = desigSortMap.get(desigA);
    const dOrderB = desigSortMap.get(desigB);

    if (typeof dOrderA === 'number' && typeof dOrderB === 'number' && dOrderA !== dOrderB) {
      return dOrderA - dOrderB;
    }
    if (typeof dOrderA === 'number' && typeof dOrderB !== 'number') return -1;
    if (typeof dOrderA !== 'number' && typeof dOrderB === 'number') return 1;

    // 5. Name
    const nameA = String((bn ? (a.name_bn || a.name_en) : (a.name_en || a.name_bn)) || '');
    const nameB = String((bn ? (b.name_bn || b.name_en) : (b.name_en || b.name_bn)) || '');
    return nameA.localeCompare(nameB, bn ? 'bn' : 'en');
  });
}
