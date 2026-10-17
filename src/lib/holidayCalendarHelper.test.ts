import { describe, it, expect } from 'vitest';
import {
  getHolidayCategory,
  getCleanNotes,
  prepareHolidayPayload,
  generateDateRange,
  isSatSunWeeklyHoliday,
  PRESET_HOLIDAY_TYPES,
} from './holidayCalendarHelper';

describe('holidayCalendarHelper', () => {
  it('should identify Saturday and Sunday weekly holidays', () => {
    expect(isSatSunWeeklyHoliday({ holiday_date: '2026-01-10', holiday_type: 'weekly', weekday: 6, name_bn: 'সাপ্তাহিক ছুটি (শনি)' })).toBe(true);
    expect(isSatSunWeeklyHoliday({ holiday_date: '2026-01-11', holiday_type: 'weekly', weekday: 0, name_bn: 'সাপ্তাহিক ছুটি (রবি)' })).toBe(true);
    // Friday is NOT a Saturday/Sunday holiday
    expect(isSatSunWeeklyHoliday({ holiday_date: '2026-01-09', holiday_type: 'weekly', weekday: 5, name_bn: 'সাপ্তাহিক ছুটি (শুক্র)' })).toBe(false);
  });

  it('should format custom categories into notes while keeping DB holiday_type public', () => {
    const payload = prepareHolidayPayload({
      holiday_date: '2026-03-15',
      name_bn: 'রমজানের ছুটি',
      name_en: 'Ramadan Break',
      category: 'রমজান ও ঈদ',
      is_paid: true,
      notes: 'বিশেষ ছুটি অনুমোদনকৃত',
    });

    expect(payload.holiday_type).toBe('public');
    expect(payload.notes).toBe('[ধরন: রমজান ও ঈদ] বিশেষ ছুটি অনুমোদনকৃত');

    // And getHolidayCategory extracts it cleanly
    expect(getHolidayCategory({ holiday_type: payload.holiday_type, notes: payload.notes })).toBe('রমজান ও ঈদ');
    expect(getCleanNotes(payload.notes)).toBe('বিশেষ ছুটি অনুমোদনকৃত');
  });

  it('should correctly handle weekly holidays in prepareHolidayPayload', () => {
    const payload = prepareHolidayPayload({
      holiday_date: '2026-01-02',
      name_bn: 'সাপ্তাহিক ছুটি (শুক্র)',
      category: 'সাপ্তাহিক ছুটি',
      weekday: 5,
      is_paid: true,
    });

    expect(payload.holiday_type).toBe('weekly');
    expect(payload.weekday).toBe(5);
    expect(getHolidayCategory({ holiday_type: 'weekly' })).toBe('সাপ্তাহিক ছুটি');
  });

  it('should generate date ranges accurately with optional skipDayOfWeek', () => {
    const range = generateDateRange('2026-03-01', '2026-03-05');
    expect(range).toEqual([
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-05',
    ]);

    // Skip Friday (day 5)
    // 2026-03-06 is Friday
    const rangeWithSkip = generateDateRange('2026-03-05', '2026-03-07', { skipDayOfWeek: [5] });
    expect(rangeWithSkip).toEqual([
      '2026-03-05',
      '2026-03-07',
    ]);
  });

  it('should return empty array when startDate > endDate', () => {
    expect(generateDateRange('2026-03-10', '2026-03-05')).toEqual([]);
  });

  it('should have standard presets available', () => {
    expect(PRESET_HOLIDAY_TYPES.length).toBeGreaterThanOrEqual(6);
    expect(PRESET_HOLIDAY_TYPES.some(p => p.key === 'religious')).toBe(true);
    expect(PRESET_HOLIDAY_TYPES.some(p => p.key === 'summer')).toBe(true);
  });
});
