import { SupabaseClient } from '@supabase/supabase-js';

export interface DepartmentShiftSchedule {
  id: string;
  category_key: string;
  start_time: string;
  end_time: string;
  effective_from: string; // YYYY-MM-DD
  effective_to?: string | null; // YYYY-MM-DD or null (ongoing)
  note?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StaffSpecialShift {
  id: string;
  staff_id: string;
  staff_name?: string | null;
  category_key?: string | null;
  duty_start_time: string;
  duty_end_time: string;
  effective_from: string; // YYYY-MM-DD
  effective_to?: string | null; // YYYY-MM-DD or null (ongoing)
  note?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ResolvedShift {
  start: string;
  end: string;
  source: 'special' | 'profile' | 'department';
  specialShift?: StaffSpecialShift;
  isCustomDuty: boolean;
}

/**
 * Checks whether targetDate (YYYY-MM-DD) falls within [effectiveFrom, effectiveTo] inclusive.
 * If effectiveTo is null/empty, the range is considered ongoing.
 */
export function isDateInRange(targetDate: string, effectiveFrom: string, effectiveTo?: string | null): boolean {
  if (!targetDate || !effectiveFrom) return false;
  const d = String(targetDate).slice(0, 10);
  const from = String(effectiveFrom).slice(0, 10);
  if (d < from) return false;
  if (effectiveTo) {
    const to = String(effectiveTo).slice(0, 10);
    if (d > to) return false;
  }
  return true;
}

/**
 * Finds the active special shift for a staff member on a specific date.
 * If multiple exist, the most recent one (or narrowest date range) takes priority.
 */
export function findSpecialShiftForStaff(
  staffId: string,
  targetDate: string,
  specialShifts: StaffSpecialShift[]
): StaffSpecialShift | undefined {
  if (!staffId || !targetDate || !Array.isArray(specialShifts)) return undefined;
  const matches = specialShifts.filter((s) => {
    if (s.staff_id !== staffId) return false;
    if (s.is_active === false) return false;
    return isDateInRange(targetDate, s.effective_from, s.effective_to);
  });

  if (matches.length === 0) return undefined;
  matches.sort((a, b) => (b.effective_from || '').localeCompare(a.effective_from || ''));
  return matches[0];
}

/**
 * Finds the department shift schedule that applies on targetDate.
 */
export function findDepartmentSchedule(
  categoryKey: string,
  targetDate: string,
  schedules: DepartmentShiftSchedule[]
): DepartmentShiftSchedule | undefined {
  if (!categoryKey || !targetDate || !Array.isArray(schedules)) return undefined;
  const matches = schedules.filter((s) => {
    if (s.category_key !== categoryKey) return false;
    return isDateInRange(targetDate, s.effective_from, s.effective_to);
  });

  if (matches.length === 0) return undefined;
  matches.sort((a, b) => (b.effective_from || '').localeCompare(a.effective_from || ''));
  return matches[0];
}

/**
 * Pure 3-tier resolution of duty time for any staff member on a target date:
 * Tier 1: Staff Date-Ranged Special Shift (Highest Priority)
 * Tier 2: Staff Personal Profile Duty Time (duty_start_time, duty_end_time on staff record)
 * Tier 3: Department Shift Schedule / Settings (Strictly based on staff's assigned department)
 */
export function resolveStaffShift(params: {
  staffId?: string | null;
  staffCategory?: string | null;
  targetDate: string;
  profileDuty?: { start?: string | null; end?: string | null };
  specialShifts?: StaffSpecialShift[];
  departmentSchedules?: DepartmentShiftSchedule[];
  categoryTimes?: Record<string, { start?: string; end?: string }>;
  defaultTime?: { start: string; end: string };
}): ResolvedShift {
  const {
    staffId,
    staffCategory,
    targetDate,
    profileDuty,
    specialShifts = [],
    departmentSchedules = [],
    categoryTimes = {},
  } = params;

  // 1. Tier 1: Staff Date-Ranged Special Shift
  if (staffId) {
    const special = findSpecialShiftForStaff(staffId, targetDate, specialShifts);
    if (special && special.duty_start_time && special.duty_end_time) {
      return {
        start: special.duty_start_time,
        end: special.duty_end_time,
        source: 'special',
        specialShift: special,
        isCustomDuty: true,
      };
    }
  }

  // 2. Tier 2: Staff Personal Profile Duty Time
  if (profileDuty?.start && profileDuty?.end) {
    return {
      start: profileDuty.start,
      end: profileDuty.end,
      source: 'profile',
      isCustomDuty: true,
    };
  }

  // 3. Tier 3: Department Shift (Date-Ranged or Category Setting)
  const cat = staffCategory || 'general';
  const deptSched = findDepartmentSchedule(cat, targetDate, departmentSchedules);
  if (deptSched && deptSched.start_time && deptSched.end_time) {
    return {
      start: deptSched.start_time,
      end: deptSched.end_time,
      source: 'department',
      isCustomDuty: false,
    };
  }

  const catSetting = categoryTimes[cat];
  if (catSetting?.start && catSetting?.end) {
    return {
      start: catSetting.start,
      end: catSetting.end,
      source: 'department',
      isCustomDuty: false,
    };
  }

  // Department fallback: check any available department time
  const fallback = categoryTimes['teacher'] || categoryTimes['general'] || Object.values(categoryTimes)[0] || { start: '09:00', end: '16:00' };
  return {
    start: fallback.start || '09:00',
    end: fallback.end || '16:00',
    source: 'department',
    isCustomDuty: false,
  };
}

// ==============================================================================
// Database & Setting Storage Helpers (Resilient Table + Website_Settings Sync)
// ==============================================================================

export async function fetchSpecialShifts(supabase: SupabaseClient): Promise<StaffSpecialShift[]> {
  try {
    const { data, error } = await supabase
      .from('staff_special_shifts' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data as StaffSpecialShift[];
    }
  } catch (err) {
    // Graceful fallback to website_settings
  }

  try {
    const { data } = await supabase
      .from('website_settings')
      .select('value')
      .eq('key', 'staff_special_shifts')
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      return data.value as StaffSpecialShift[];
    }
  } catch (err) {
    console.warn('Fallback fetchSpecialShifts error:', err);
  }

  return [];
}

export async function fetchDepartmentSchedules(supabase: SupabaseClient): Promise<DepartmentShiftSchedule[]> {
  try {
    const { data, error } = await supabase
      .from('department_shift_schedules' as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      return data as DepartmentShiftSchedule[];
    }
  } catch (err) {
    // Graceful fallback to website_settings
  }

  try {
    const { data } = await supabase
      .from('website_settings')
      .select('value')
      .eq('key', 'department_shift_schedules')
      .maybeSingle();

    if (data?.value && Array.isArray(data.value)) {
      return data.value as DepartmentShiftSchedule[];
    }
  } catch (err) {
    console.warn('Fallback fetchDepartmentSchedules error:', err);
  }

  return [];
}

export async function saveSpecialShiftsBatch(
  supabase: SupabaseClient,
  newOrUpdatedShifts: StaffSpecialShift[]
): Promise<void> {
  // Always update website_settings cache first for immediate resilience
  try {
    const current = await fetchSpecialShifts(supabase);
    const idMap = new Map(current.map((s) => [s.id, s]));
    for (const item of newOrUpdatedShifts) {
      idMap.set(item.id, item);
    }
    const merged = Array.from(idMap.values());
    await supabase.from('website_settings').upsert(
      { key: 'staff_special_shifts', value: merged, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  } catch (err) {
    console.warn('Failed to cache in website_settings:', err);
  }

  // Attempt to write to database table
  try {
    const records = newOrUpdatedShifts.map((s) => ({
      id: s.id,
      staff_id: s.staff_id,
      category_key: s.category_key || null,
      duty_start_time: s.duty_start_time,
      duty_end_time: s.duty_end_time,
      effective_from: s.effective_from,
      effective_to: s.effective_to || null,
      note: s.note || null,
      is_active: s.is_active ?? true,
      updated_at: new Date().toISOString(),
    }));

    await supabase.from('staff_special_shifts' as any).upsert(records);
  } catch (err) {
    // Handled gracefully via website_settings
  }
}

export async function deleteSpecialShift(supabase: SupabaseClient, id: string): Promise<void> {
  // Remove from cache
  try {
    const current = await fetchSpecialShifts(supabase);
    const filtered = current.filter((s) => s.id !== id);
    await supabase.from('website_settings').upsert(
      { key: 'staff_special_shifts', value: filtered, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  } catch (err) {
    console.warn('Failed to update website_settings cache for delete:', err);
  }

  // Remove from table
  try {
    await supabase.from('staff_special_shifts' as any).delete().eq('id', id);
  } catch (err) {
    // Handled
  }
}

export async function saveDepartmentSchedule(
  supabase: SupabaseClient,
  schedule: DepartmentShiftSchedule
): Promise<void> {
  // Always update website_settings cache
  try {
    const current = await fetchDepartmentSchedules(supabase);
    const idx = current.findIndex((s) => s.id === schedule.id);
    if (idx >= 0) {
      current[idx] = schedule;
    } else {
      current.unshift(schedule);
    }
    await supabase.from('website_settings').upsert(
      { key: 'department_shift_schedules', value: current, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  } catch (err) {
    console.warn('Failed to cache department schedule:', err);
  }

  // Attempt to write to table
  try {
    await supabase.from('department_shift_schedules' as any).upsert({
      id: schedule.id,
      category_key: schedule.category_key,
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      effective_from: schedule.effective_from,
      effective_to: schedule.effective_to || null,
      note: schedule.note || null,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    // Handled
  }
}

export async function deleteDepartmentSchedule(supabase: SupabaseClient, id: string): Promise<void> {
  try {
    const current = await fetchDepartmentSchedules(supabase);
    const filtered = current.filter((s) => s.id !== id);
    await supabase.from('website_settings').upsert(
      { key: 'department_shift_schedules', value: filtered, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );
  } catch (err) {
    console.warn('Failed to update website_settings cache on dept schedule delete:', err);
  }

  try {
    await supabase.from('department_shift_schedules' as any).delete().eq('id', id);
  } catch (err) {
    // Handled
  }
}
