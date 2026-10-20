import { dedupeAttendanceRecords } from './attendanceDedup';
import type { AttendanceDuplicateRule } from './attendanceDedup';

/** Date-scoped attendance never hides real records behind a fixed cutoff. */
export function attendanceRecordsForDate<T extends Record<string, any>>(
  records: T[],
  date: string,
  rule?: AttendanceDuplicateRule,
): T[] {
  return dedupeAttendanceRecords(records.filter(record => record.attendance_date === date), rule);
}

export const MISSING_ATTENDANCE_CONFLICT_OPTIONS = {
  onConflict: 'attendance_date,entity_type,entity_id,shift',
  ignoreDuplicates: true,
} as const;