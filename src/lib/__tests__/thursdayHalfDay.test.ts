import { describe, it, expect } from 'vitest';
import {
  shouldApplyThursdayHalfDay,
  effectiveDutyEndForThursday,
  resolveThursdayHalfCategory,
  isThursdayDate,
} from '@/lib/thursdayHalfDay';

// 2026-07-02 is a Thursday, 2026-07-03 is a Friday, 2026-06-30 is a Tuesday.
const THURSDAY = '2026-07-02';
const FRIDAY = '2026-07-03';
const TUESDAY = '2026-06-30';

describe('resolveThursdayHalfCategory', () => {
  it('uses the configured category', () => {
    expect(resolveThursdayHalfCategory({ enabled: true, category: 'general' })).toBe('general');
  });
  it('falls back to teacher when unset', () => {
    expect(resolveThursdayHalfCategory({ enabled: true })).toBe('teacher');
    expect(resolveThursdayHalfCategory(null)).toBe('teacher');
    expect(resolveThursdayHalfCategory({ enabled: true, category: '' })).toBe('teacher');
  });
});

describe('isThursdayDate', () => {
  it('detects Thursdays', () => {
    expect(isThursdayDate(THURSDAY)).toBe(true);
    expect(isThursdayDate(FRIDAY)).toBe(false);
    expect(isThursdayDate(TUESDAY)).toBe(false);
  });
  it('returns false for invalid input', () => {
    expect(isThursdayDate('not-a-date')).toBe(false);
  });
});

describe('shouldApplyThursdayHalfDay — applies only to the selected department/category', () => {
  const setting = { enabled: true, category: 'teacher' };

  it('applies to the matching category on a Thursday', () => {
    expect(
      shouldApplyThursdayHalfDay({
        setting,
        staffCategory: 'teacher',
        attendanceDate: THURSDAY,
        isOvernight: false,
      }),
    ).toBe(true);
  });

  it('does NOT apply to a non-matching category (core guarantee)', () => {
    for (const cat of ['staff', 'admin', 'accountant', 'hifz', null, undefined]) {
      expect(
        shouldApplyThursdayHalfDay({
          setting,
          staffCategory: cat as any,
          attendanceDate: THURSDAY,
          isOvernight: false,
        }),
      ).toBe(false);
    }
  });

  it('follows the configured category when it is not the default', () => {
    const custom = { enabled: true, category: 'general' };
    expect(
      shouldApplyThursdayHalfDay({ setting: custom, staffCategory: 'general', attendanceDate: THURSDAY, isOvernight: false }),
    ).toBe(true);
    // A teacher is NO LONGER included once the department is switched to 'general'.
    expect(
      shouldApplyThursdayHalfDay({ setting: custom, staffCategory: 'teacher', attendanceDate: THURSDAY, isOvernight: false }),
    ).toBe(false);
  });

  it('does NOT apply on non-Thursday days even for the matching category', () => {
    expect(
      shouldApplyThursdayHalfDay({ setting, staffCategory: 'teacher', attendanceDate: FRIDAY, isOvernight: false }),
    ).toBe(false);
    expect(
      shouldApplyThursdayHalfDay({ setting, staffCategory: 'teacher', attendanceDate: TUESDAY, isOvernight: false }),
    ).toBe(false);
  });

  it('does NOT apply when the rule is disabled', () => {
    expect(
      shouldApplyThursdayHalfDay({
        setting: { enabled: false, category: 'teacher' },
        staffCategory: 'teacher',
        attendanceDate: THURSDAY,
        isOvernight: false,
      }),
    ).toBe(false);
    expect(
      shouldApplyThursdayHalfDay({ setting: null, staffCategory: 'teacher', attendanceDate: THURSDAY, isOvernight: false }),
    ).toBe(false);
  });

  it('does NOT apply to overnight shifts', () => {
    expect(
      shouldApplyThursdayHalfDay({ setting, staffCategory: 'teacher', attendanceDate: THURSDAY, isOvernight: true }),
    ).toBe(false);
  });
});

describe('effectiveDutyEndForThursday — shift shortening', () => {
  const dutyStart = 8 * 60; // 08:00
  const dutyEnd = 17 * 60; // 17:00

  it('shortens duty end to 14:00 only when the rule applies', () => {
    const applied = effectiveDutyEndForThursday({ applies: true, dutyStart, dutyEnd });
    expect(applied.effDutyEnd).toBe(14 * 60);
    expect(applied.effScheduledMinutes).toBe(14 * 60 - dutyStart);
  });

  it('leaves duty end unchanged when the rule does not apply', () => {
    const untouched = effectiveDutyEndForThursday({ applies: false, dutyStart, dutyEnd });
    expect(untouched.effDutyEnd).toBe(dutyEnd);
    expect(untouched.effScheduledMinutes).toBe(dutyEnd - dutyStart);
  });

  it('does not lengthen a shift that already ends before 14:00', () => {
    const earlyEnd = 13 * 60; // 13:00
    const res = effectiveDutyEndForThursday({ applies: true, dutyStart, dutyEnd: earlyEnd });
    expect(res.effDutyEnd).toBe(earlyEnd);
    expect(res.effScheduledMinutes).toBe(earlyEnd - dutyStart);
  });
});

describe('integration — non-selected staff keep full-day early-exit deduction', () => {
  const setting = { enabled: true, category: 'teacher' };
  const dutyStart = 8 * 60;
  const dutyEnd = 17 * 60;
  const checkOut = 14 * 60; // left at 14:00

  const earlyExitMinutes = (staffCategory: string) => {
    const applies = shouldApplyThursdayHalfDay({
      setting,
      staffCategory,
      attendanceDate: THURSDAY,
      isOvernight: false,
    });
    const { effDutyEnd } = effectiveDutyEndForThursday({ applies, dutyStart, dutyEnd });
    return Math.max(0, effDutyEnd - checkOut);
  };

  it('teacher (selected) has no early-exit at 14:00', () => {
    expect(earlyExitMinutes('teacher')).toBe(0);
  });

  it('non-teacher (not selected) is still deducted 3 hours for leaving at 14:00', () => {
    expect(earlyExitMinutes('staff')).toBe(3 * 60);
  });
});

describe('custom special days of week (Day-specific schedule)', () => {
  // 2026-07-01 is a Wednesday (3), 2026-07-02 is a Thursday (4), 2026-07-04 is a Saturday (6)
  const WEDNESDAY = '2026-07-01';
  const SATURDAY = '2026-07-04';

  it('applies to configured custom days (e.g. Wednesday)', () => {
    const customDaySetting = {
      enabled: true,
      category: 'teacher',
      days: [3], // Wednesday
    };

    expect(
      shouldApplyThursdayHalfDay({
        setting: customDaySetting,
        staffCategory: 'teacher',
        attendanceDate: WEDNESDAY,
        isOvernight: false,
      }),
    ).toBe(true);

    // Should NOT apply on Thursday when days is explicitly set to Wednesday
    expect(
      shouldApplyThursdayHalfDay({
        setting: customDaySetting,
        staffCategory: 'teacher',
        attendanceDate: THURSDAY,
        isOvernight: false,
      }),
    ).toBe(false);
  });

  it('supports multiple special days (e.g. Wednesday and Saturday)', () => {
    const multiDaySetting = {
      enabled: true,
      category: 'teacher',
      days: [3, 6], // Wednesday and Saturday
    };

    expect(
      shouldApplyThursdayHalfDay({
        setting: multiDaySetting,
        staffCategory: 'teacher',
        attendanceDate: WEDNESDAY,
        isOvernight: false,
      }),
    ).toBe(true);

    expect(
      shouldApplyThursdayHalfDay({
        setting: multiDaySetting,
        staffCategory: 'teacher',
        attendanceDate: SATURDAY,
        isOvernight: false,
      }),
    ).toBe(true);

    expect(
      shouldApplyThursdayHalfDay({
        setting: multiDaySetting,
        staffCategory: 'teacher',
        attendanceDate: TUESDAY,
        isOvernight: false,
      }),
    ).toBe(false);
  });

  it('supports distinct time schedules per day via daySchedules', () => {
    const perDaySetting = {
      enabled: true,
      category: 'teacher',
      daySchedules: {
        3: { start: '09:30', end: '13:00', rateMode: 'special_day_rate' as const },
        4: { start: '09:30', end: '14:00', rateMode: 'regular_duty_rate' as const },
      },
    };

    // Wednesday matches Wednesday schedule
    expect(
      shouldApplyThursdayHalfDay({
        setting: perDaySetting,
        staffCategory: 'teacher',
        attendanceDate: WEDNESDAY,
        isOvernight: false,
      }),
    ).toBe(true);

    // Thursday matches Thursday schedule
    expect(
      shouldApplyThursdayHalfDay({
        setting: perDaySetting,
        staffCategory: 'teacher',
        attendanceDate: THURSDAY,
        isOvernight: false,
      }),
    ).toBe(true);

    // Saturday does NOT apply since it is not in daySchedules
    expect(
      shouldApplyThursdayHalfDay({
        setting: perDaySetting,
        staffCategory: 'teacher',
        attendanceDate: SATURDAY,
        isOvernight: false,
      }),
    ).toBe(false);
  });
});
