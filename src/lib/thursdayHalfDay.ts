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
  category?: string | null;
  /** Half-day end clock, "HH:MM" (default "14:00"). */
  end_time?: string | null;
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

/** Resolve the department/category the rule targets (fallback: 'teacher'). */
export function resolveThursdayHalfCategory(setting?: ThursdayHalfDaySetting | null): string {
  return setting?.category || 'teacher';
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
  if (!isThursdayDate(attendanceDate)) return false;
  return staffCategory === resolveThursdayHalfCategory(setting);
}

/**
 * Compute the effective duty-end minutes and scheduled minutes/day for a shift,
 * shortening it to 14:00 when the Thursday half-day rule applies.
 * `dutyStart`/`dutyEnd` are minutes-from-midnight (dutyEnd already normalized for
 * overnight before calling — but overnight shifts are excluded by the rule anyway).
 */
export function effectiveDutyEndForThursday(params: {
  applies: boolean;
  dutyStart: number;
  dutyEnd: number;
}): { effDutyEnd: number; effScheduledMinutes: number } {
  const { applies, dutyStart, dutyEnd } = params;
  let effDutyEnd = dutyEnd;
  let effScheduledMinutes = dutyEnd - dutyStart;
  if (applies) {
    const thuEnd = 14 * 60; // 14:00
    if (thuEnd > dutyStart && thuEnd < dutyEnd) {
      effDutyEnd = thuEnd;
      effScheduledMinutes = effDutyEnd - dutyStart;
    }
  }
  return { effDutyEnd, effScheduledMinutes };
}
