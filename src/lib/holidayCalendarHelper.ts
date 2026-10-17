/**
 * Holiday Calendar Helper
 * Utilities for holiday types, custom categories, date ranges, and DB compatibility.
 */

export interface Holiday {
  id: string;
  holiday_date: string;
  name_bn: string | null;
  name_en: string | null;
  holiday_type: string;
  weekday: number | null;
  is_paid: boolean;
  notes: string | null;
}

export interface HolidayTypePreset {
  key: string;
  label_bn: string;
  label_en: string;
  badgeClass: string;
}

export const PRESET_HOLIDAY_TYPES: HolidayTypePreset[] = [
  { key: 'weekly', label_bn: 'সাপ্তাহিক ছুটি', label_en: 'Weekly Holiday', badgeClass: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20' },
  { key: 'public', label_bn: 'সরকারি ছুটি', label_en: 'Public Holiday', badgeClass: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' },
  { key: 'religious', label_bn: 'ধর্মীয় / বিশেষ ছুটি', label_en: 'Religious / Special', badgeClass: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20' },
  { key: 'institutional', label_bn: 'প্রাতিষ্ঠানিক ছুটি', label_en: 'Institutional Holiday', badgeClass: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20' },
  { key: 'summer', label_bn: 'গ্রীষ্মকালীন ছুটি', label_en: 'Summer Vacation', badgeClass: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20' },
  { key: 'winter', label_bn: 'শীতকালীন ছুটি', label_en: 'Winter Vacation', badgeClass: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20' },
  { key: 'exam_break', label_bn: 'পরীক্ষা উত্তর ছুটি', label_en: 'Exam Break', badgeClass: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20' },
  { key: 'emergency', label_bn: 'জরুরি / সাধারণ বন্ধ', label_en: 'Emergency / Closure', badgeClass: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' },
];

/**
 * Extracts category name from a holiday object (supporting custom categories stored in notes)
 */
export function getHolidayCategory(h: { holiday_type?: string | null; notes?: string | null }): string {
  if (h.notes) {
    const match = h.notes.match(/^\[(?:ধরন|type):\s*([^\]]+)\]\s*(.*)$/i);
    if (match) return match[1].trim();
  }
  if (!h.holiday_type || h.holiday_type === 'public') return 'সরকারি ছুটি';
  if (h.holiday_type === 'weekly') return 'সাপ্তাহিক ছুটি';
  const found = PRESET_HOLIDAY_TYPES.find(p => p.key === h.holiday_type);
  if (found) return found.label_bn;
  return h.holiday_type;
}

/**
 * Removes the [ধরন: ...] prefix to show clean notes to the user
 */
export function getCleanNotes(rawNotes: string | null | undefined): string {
  if (!rawNotes) return '';
  const match = rawNotes.match(/^\[(?:ধরন|type):\s*([^\]]+)\]\s*(.*)$/i);
  if (match) return match[2].trim();
  return rawNotes;
}

/**
 * Prepares payload for Supabase insertion/update.
 * Ensures DB constraint CHECK (holiday_type IN ('weekly', 'public')) is never violated:
 * - If category is 'weekly' -> holiday_type = 'weekly'
 * - If category is 'public' -> holiday_type = 'public'
 * - Any other standard or custom category -> holiday_type = 'public', notes = `[ধরন: ${category}] ${cleanNotes}`
 */
export function prepareHolidayPayload(input: {
  holiday_date: string;
  name_bn?: string | null;
  name_en?: string | null;
  category: string;
  weekday?: number | null;
  is_paid: boolean;
  notes?: string | null;
}) {
  const cat = input.category?.trim() || 'public';
  const isWeekly = cat === 'weekly' || cat === 'সাপ্তাহিক ছুটি';
  const isPlainPublic = cat === 'public' || cat === 'সরকারি ছুটি';

  if (isWeekly) {
    return {
      holiday_date: input.holiday_date,
      name_bn: input.name_bn || null,
      name_en: input.name_en || null,
      holiday_type: 'weekly',
      weekday: input.weekday ?? null,
      is_paid: input.is_paid !== false,
      notes: input.notes ? getCleanNotes(input.notes) : null,
    };
  }

  if (isPlainPublic) {
    return {
      holiday_date: input.holiday_date,
      name_bn: input.name_bn || null,
      name_en: input.name_en || null,
      holiday_type: 'public',
      weekday: null,
      is_paid: input.is_paid !== false,
      notes: input.notes ? getCleanNotes(input.notes) : null,
    };
  }

  // Custom or specialized category
  const cleanNote = input.notes ? getCleanNotes(input.notes) : '';
  const encodedNotes = `[ধরন: ${cat}]${cleanNote ? ' ' + cleanNote : ''}`;

  return {
    holiday_date: input.holiday_date,
    name_bn: input.name_bn || null,
    name_en: input.name_en || null,
    holiday_type: 'public',
    weekday: null,
    is_paid: input.is_paid !== false,
    notes: encodedNotes,
  };
}

/**
 * Generates an array of date strings between start and end date (inclusive)
 */
export function generateDateRange(
  startDateStr: string,
  endDateStr: string,
  options?: { skipDayOfWeek?: number[] }
): string[] {
  if (!startDateStr || !endDateStr) return [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

  const skipSet = new Set(options?.skipDayOfWeek || []);
  const dates: string[] = [];

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (skipSet.has(d.getDay())) continue;
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }

  return dates;
}

/**
 * Checks if a holiday is a Saturday or Sunday weekly holiday
 */
export function isSatSunWeeklyHoliday(h: {
  holiday_date: string;
  holiday_type?: string | null;
  weekday?: number | null;
  name_bn?: string | null;
  name_en?: string | null;
}): boolean {
  if (h.holiday_type === 'weekly' && (h.weekday === 0 || h.weekday === 6)) return true;
  const d = new Date(h.holiday_date);
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
  if (h.holiday_type === 'weekly' && isWeekend) return true;
  const bn = h.name_bn || '';
  const en = h.name_en || '';
  return bn.includes('(শনি)') || bn.includes('(রবি)') || en.includes('(Sat)') || en.includes('(Sun)');
}
