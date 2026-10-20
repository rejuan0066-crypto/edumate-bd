import { describe, it, expect } from 'vitest';
import {
  calcDayDeduction,
  calcDutyDeduction,
  perMinuteRate,
  shiftMinutes,
  type DeductionShift,
} from '@/lib/dutyShiftDeduction';

const baseShift: DeductionShift = {
  id: 'morning',
  name_bn: 'সকাল',
  start_time: '06:00',
  end_time: '10:00', // 240 minutes
  grace_minutes: 0,
  early_exit_grace_minutes: 0,
  absent_deduction_amount: 240,
  late_deduction_enabled: false,
  late_deduction_amount: null,
  late_deduction_mode: 'flat',
  late_deduction_free_minutes: 5,
};

const day = { date: '2026-06-10', shiftId: 'morning' };

describe('shiftMinutes', () => {
  it('handles normal and overnight shifts', () => {
    expect(shiftMinutes(baseShift)).toBe(240);
    expect(shiftMinutes({ ...baseShift, start_time: '22:00', end_time: '02:00' })).toBe(240);
  });
});

describe('absence deduction', () => {
  it('deducts the configured amount when absent', () => {
    const line = calcDayDeduction(baseShift, day, { ...day, status: 'absent' });
    expect(line.reason).toBe('absent');
    expect(line.amount).toBe(240);
  });

  it('treats a missing record on a past rostered day as absent', () => {
    const line = calcDayDeduction(baseShift, day, null);
    expect(line.reason).toBe('absent');
    expect(line.amount).toBe(240);
  });

  it('deducts nothing on a holiday', () => {
    const line = calcDayDeduction(baseShift, { ...day, isHoliday: true }, { ...day, status: 'absent' });
    expect(line.amount).toBe(0);
  });

  it('deducts nothing for future dates', () => {
    const line = calcDayDeduction(baseShift, { ...day, isFuture: true }, null);
    expect(line.amount).toBe(0);
  });

  it('deducts nothing when no setting exists', () => {
    const line = calcDayDeduction(
      { ...baseShift, absent_deduction_amount: 0 },
      day,
      { ...day, status: 'absent' },
    );
    expect(line.amount).toBe(0);
  });

  it('deducts nothing for approved leave', () => {
    const line = calcDayDeduction(baseShift, day, { ...day, status: 'leave' });
    expect(line.amount).toBe(0);
  });

  it('waives duty deduction when staff is marked absent in main attendance (isGeneralAbsent)', () => {
    const line = calcDayDeduction(baseShift, { ...day, isGeneralAbsent: true }, { ...day, status: 'absent' });
    expect(line.amount).toBe(0);
    expect(line.reason).toBe('none');
    expect(line.note).toContain('দ্বৈত কর্তনমুক্ত');
  });

  it('skips deduction when duty record is unmarked and skipUnmarked is true', () => {
    const line = calcDayDeduction(baseShift, { ...day, skipUnmarked: true }, null);
    expect(line.amount).toBe(0);
    expect(line.reason).toBe('none');
    expect(line.amount).toBe(0);
  });
});

describe('late deduction', () => {
  const lateShift = { ...baseShift, late_deduction_enabled: true, late_deduction_mode: 'per_minute' };

  it('is 0 when the toggle is off', () => {
    const line = calcDayDeduction(baseShift, day, { ...day, status: 'late', late_minutes: 30 });
    expect(line.amount).toBe(0);
  });

  it('derives the per-minute rate from absent amount / shift minutes', () => {
    expect(perMinuteRate(lateShift)).toBe(1); // 240 / 240
  });

  it('skips the first 5 free minutes', () => {
    const line = calcDayDeduction(lateShift, day, { ...day, status: 'late', late_minutes: 5 });
    expect(line.amount).toBe(0);
    const line2 = calcDayDeduction(lateShift, day, { ...day, status: 'late', late_minutes: 20 });
    expect(line2.minutes).toBe(15);
    expect(line2.amount).toBe(15);
  });

  it('adds early-exit minutes to late minutes', () => {
    const line = calcDayDeduction(lateShift, day, {
      ...day,
      status: 'late',
      late_minutes: 10,
      early_exit_minutes: 15,
    });
    expect(line.minutes).toBe(20); // 25 - 5 free
    expect(line.amount).toBe(20);
  });

  it('caps per-minute deduction at the absence amount', () => {
    const line = calcDayDeduction(lateShift, day, { ...day, status: 'late', late_minutes: 400 });
    expect(line.amount).toBe(240);
  });

  it('uses the flat amount in flat mode, falling back to absent amount', () => {
    const flat = { ...baseShift, late_deduction_enabled: true, late_deduction_amount: 50 };
    expect(calcDayDeduction(flat, day, { ...day, status: 'late', late_minutes: 30 }).amount).toBe(50);
    const fallback = { ...baseShift, late_deduction_enabled: true };
    expect(calcDayDeduction(fallback, day, { ...day, status: 'late', late_minutes: 30 }).amount).toBe(240);
  });

  it('computes late minutes from check-in when not supplied, honouring grace', () => {
    const shift = { ...lateShift, grace_minutes: 10 };
    const line = calcDayDeduction(shift, day, { ...day, status: 'late', check_in_time: '06:30' });
    expect(line.minutes).toBe(15); // 30 late - 10 grace - 5 free
  });
});

describe('calcDutyDeduction', () => {
  it('sums lines and de-duplicates the same day+shift', () => {
    const days = [
      { date: '2026-06-01', shiftId: 'morning' },
      { date: '2026-06-01', shiftId: 'morning' }, // duplicate
      { date: '2026-06-02', shiftId: 'morning', isHoliday: true },
      { date: '2026-06-03', shiftId: 'morning' },
    ];
    const attendance = [
      { date: '2026-06-01', shiftId: 'morning', status: 'absent' },
      { date: '2026-06-01', shiftId: 'morning', status: 'absent' }, // duplicate
      { date: '2026-06-02', shiftId: 'morning', status: 'absent' },
      { date: '2026-06-03', shiftId: 'morning', status: 'present' },
    ];
    const res = calcDutyDeduction([baseShift], days, attendance);
    expect(res.absentCount).toBe(1);
    expect(res.total).toBe(240);
  });

  it('returns 0 when nothing is configured', () => {
    const res = calcDutyDeduction(
      [{ ...baseShift, absent_deduction_amount: 0, late_deduction_enabled: false }],
      [{ date: '2026-06-01', shiftId: 'morning' }],
      [],
    );
    expect(res.total).toBe(0);
    expect(res.lines).toHaveLength(0);
  });

  it('ignores days whose shift is unknown', () => {
    const res = calcDutyDeduction([baseShift], [{ date: '2026-06-01', shiftId: 'evening' }], []);
    expect(res.total).toBe(0);
  });
});
