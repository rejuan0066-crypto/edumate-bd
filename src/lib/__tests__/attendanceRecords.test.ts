import { describe, expect, it } from 'vitest';
import { attendanceRecordsForDate, MISSING_ATTENDANCE_CONFLICT_OPTIONS } from '../attendanceRecords';

const record = { id: 'saved', entity_type: 'staff', entity_id: 'staff-1', shift: 'full_day', attendance_date: '2026-10-10', status: 'present' };

describe('date-scoped attendance', () => {
  it('does not treat attendance on another date as a duplicate', () => {
    expect(attendanceRecordsForDate([record], '2026-10-11')).toEqual([]);
  });
  it('shows saved attendance on formerly hidden October dates', () => {
    for (const attendance_date of ['2026-10-04', '2026-10-10', '2026-10-19']) {
      const saved = { ...record, attendance_date };
      expect(attendanceRecordsForDate([saved], attendance_date)).toEqual([saved]);
    }
  });
  it('keeps separate shifts for the same person and date', () => {
    const evening = { ...record, id: 'evening', shift: 'evening' };
    expect(attendanceRecordsForDate([record, evening], record.attendance_date)).toHaveLength(2);
  });
  it('bulk insertion preserves existing attendance and scopes conflicts to date, person and shift', () => {
    expect(MISSING_ATTENDANCE_CONFLICT_OPTIONS).toEqual({
      onConflict: 'attendance_date,entity_type,entity_id,shift', ignoreDuplicates: true,
    });
  });
});