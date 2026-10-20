// Pure, testable helpers for the "Thursday half-day for the education department" rule.
//
// The rule (configured in salary settings under `thursday_half_day_education`):
//   - When enabled, on Thursdays the duty shift for the SELECTED department/category
//     is treated as ending at 14:00 (2:00 PM). Staff who stay until 14:00 count as a
//     full day (no early-exit deduction).
//   - It applies ONLY to staff whose `staff_category` matches the configured category
//     (fallback: 'teacher'), and never to overnight shifts.
//
// Keeping this logic pure lets both the salary page and the test-suite share one
// source of truth so the "applies only to the matching department" guarantee is verified.

export interface ThursdayHalfDaySetting {
  enabled?: boolean;
  /** Single target department (legacy). */
  category?: string | null;
  /** Multiple target departments. Takes precedence over `category` when non-empty. */
  categories?: string[] | null;
  /** Half-day check-in clock, "HH:MM" (optional; default = normal duty start). */
  start_time?: string | null;
  /** Half-day check-out clock, "HH:MM" (default "14:00"). */
  end_time?: string | null;
  /** Days of week (0 = Sunday, 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday). Default: [4] */
  days?: number[] | null;
  /** Deduction rate mode: 'regular_duty_rate' (default) or 'special_day_rate' */
  deduction_rate_mode?: 'regular_duty_rate' | 'special_day_rate' | null;
}

/** Parse an "HH:MM" clock string to minutes-from-midnight. Returns null when invalid. */
export function parseClockMinutes(time?: string | null): number | null {
  if (typeof time === 'string') {
    const m = time.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const mins = Number(m[1]) * 60 + Number(m[2]);
      if (mins > 0 && mins < 24 * 60) return mins;
    }
  }
  return null;
}

/** Parse an "HH:MM" clock string to minutes-from-midnight. Falls back to 14:00. */
export function parseHalfDayEndMinutes(endTime?: string | null): number {
  if (typeof endTime === 'string') {
    const m = endTime.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const mins = Number(m[1]) * 60 + Number(m[2]);
      if (mins > 0 && mins < 24 * 60) return mins;
    }
  }
  return 14 * 60; // 14:00
}

/** JS getDay() Thursday index. */
export const THURSDAY = 4;

/** Day of week options (0 = Sunday .. 6 = Saturday) */
export const DAY_OF_WEEK_OPTIONS = [
  { value: 6, bn: 'শনিবার', en: 'Saturday', shortBn: 'শনি' },
  { value: 0, bn: 'রবিবার', en: 'Sunday', shortBn: 'রবি' },
  { value: 1, bn: 'সোমবার', en: 'Monday', shortBn: 'সোম' },
  { value: 2, bn: 'মঙ্গলবার', en: 'Tuesday', shortBn: 'মঙ্গল' },
  { value: 3, bn: 'বুধবার', en: 'Wednesday', shortBn: 'বুধ' },
  { value: 4, bn: 'বৃহস্পতিবার', en: 'Thursday', shortBn: 'বৃহঃ' },
  { value: 5, bn: 'শুক্রবার', en: 'Friday', shortBn: 'শুক্র' },
];

/** Resolve configured days of week (default: [4] for Thursday). */
export function resolveSpecialDays(setting?: ThursdayHalfDaySetting | null): number[] {
  if (Array.isArray(setting?.days) && setting.days.length > 0) {
    return setting.days;
  }
  return [THURSDAY];
}

/** Check if a date string matches any configured special days. */
export function isSpecialDayDate(dateStr: string, setting?: ThursdayHalfDaySetting | null): boolean {
  try {
    const day = new Date(dateStr + 'T00:00:00').getDay();
    const allowedDays = resolveSpecialDays(setting);
    return allowedDays.includes(day);
  } catch {
    return false;
  }
}

/** Resolve the deduction rate mode (default: 'regular_duty_rate'). */
export function getSpecialDayDeductionRateMode(setting?: ThursdayHalfDaySetting | null): 'regular_duty_rate' | 'special_day_rate' {
  return setting?.deduction_rate_mode === 'special_day_rate' ? 'special_day_rate' : 'regular_duty_rate';
}

/** Resolve the target departments/categories (fallback: ['teacher']). */
export function resolveThursdayHalfCategories(setting?: ThursdayHalfDaySetting | null): string[] {
  const list = (setting?.categories || []).filter((c): c is string => !!c);
  if (list.length > 0) return list;
  return [setting?.category || 'teacher'];
}

/** @deprecated use resolveThursdayHalfCategories. Returns first target category. */
export function resolveThursdayHalfCategory(setting?: ThursdayHalfDaySetting | null): string {
  return resolveThursdayHalfCategories(setting)[0];
}

/** True when the given date string (YYYY-MM-DD) is a Thursday. */
export function isThursdayDate(dateStr: string): boolean {
  try {
    return new Date(dateStr + 'T00:00:00').getDay() === THURSDAY;
  } catch {
    return false;
  }
}

/**
 * Decide whether the Thursday half-day rule applies to a specific staff member on a
 * specific attendance date. Returns true ONLY when:
 *   - the rule is enabled,
 *   - the date is a Thursday,
 *   - the staff member's category matches the configured category, and
 *   - the shift is not overnight.
 */
export function shouldApplyThursdayHalfDay(params: {
  setting?: ThursdayHalfDaySetting | null;
  staffCategory?: string | null;
  attendanceDate: string;
  isOvernight: boolean;
}): boolean {
  const { setting, staffCategory, attendanceDate, isOvernight } = params;
  const enabled = setting?.enabled === true;
  if (!enabled || isOvernight) return false;
  if (!isSpecialDayDate(attendanceDate, setting)) return false;
  return !!staffCategory && resolveThursdayHalfCategories(setting).includes(staffCategory);
}

/** Aliases for readability */
export const shouldApplySpecialDayShift = shouldApplyThursdayHalfDay;
export const effectiveDutyEndForSpecialDay = effectiveDutyEndForThursday;

/**
 * Compute the effective duty start/end minutes and scheduled minutes/day for a shift,
 * applying the Thursday check-in/check-out window when the rule applies.
 * `dutyStart`/`dutyEnd` are minutes-from-midnight (dutyEnd already normalized for
 * overnight before calling — but overnight shifts are excluded by the rule anyway).
 * `startMinutes` (optional) overrides the Thursday check-in time; `endMinutes` the
 * Thursday check-out time (default 14:00).
 */
export function effectiveDutyEndForThursday(params: {
  applies: boolean;
  dutyStart: number;
  dutyEnd: number;
  /** Half-day check-in minutes-from-midnight (optional; default = dutyStart). */
  startMinutes?: number;
  /** Half-day check-out minutes-from-midnight (default 14:00). */
  endMinutes?: number;
}): { effDutyStart: number; effDutyEnd: number; effScheduledMinutes: number } {
  const { applies, dutyStart, dutyEnd, startMinutes, endMinutes } = params;
  let effDutyStart = dutyStart;
  let effDutyEnd = dutyEnd;
  if (applies) {
    if (startMinutes && startMinutes > 0 && startMinutes < dutyEnd) {
      effDutyStart = startMinutes;
    }
    const thuEnd = endMinutes && endMinutes > 0 ? endMinutes : 14 * 60; // 14:00
    if (thuEnd > effDutyStart && thuEnd < dutyEnd) {
      effDutyEnd = thuEnd;
    }
  }
  const effScheduledMinutes = effDutyEnd - effDutyStart;
  return { effDutyStart, effDutyEnd, effScheduledMinutes };
}
