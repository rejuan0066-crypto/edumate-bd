import { describe, it, expect } from 'vitest';
import {
  getEndMonthFromStart,
  getDurationFromRange,
  isMonthInSavingsRange,
} from '../salarySavingsHelper';

describe('salarySavingsHelper', () => {
  describe('getEndMonthFromStart', () => {
    it('calculates 12 months from January 2024 to December 2024', () => {
      expect(getEndMonthFromStart('2024-01', 12)).toBe('2024-12');
    });

    it('calculates 6 months crossing year boundary (October 2025 to March 2026)', () => {
      expect(getEndMonthFromStart('2025-10', 6)).toBe('2026-03');
    });

    it('handles single month duration', () => {
      expect(getEndMonthFromStart('2024-05', 1)).toBe('2024-05');
    });

    it('handles pre-2026 years cleanly (e.g. 2022 to 2023)', () => {
      expect(getEndMonthFromStart('2022-07', 24)).toBe('2024-06');
    });

    it('handles empty or invalid start gracefully', () => {
      expect(getEndMonthFromStart('', 12)).toBe('');
      expect(getEndMonthFromStart('invalid', 12)).toBe('');
    });
  });

  describe('getDurationFromRange', () => {
    it('returns 12 for 2024-01 to 2024-12', () => {
      expect(getDurationFromRange('2024-01', '2024-12')).toBe(12);
    });

    it('returns 6 for 2025-10 to 2026-03', () => {
      expect(getDurationFromRange('2025-10', '2026-03')).toBe(6);
    });

    it('returns 1 for same month', () => {
      expect(getDurationFromRange('2024-05', '2024-05')).toBe(1);
    });

    it('returns 0 when end is before start', () => {
      expect(getDurationFromRange('2025-05', '2024-05')).toBe(0);
    });
  });

  describe('isMonthInSavingsRange', () => {
    it('identifies months within range correctly', () => {
      expect(isMonthInSavingsRange('2024-01', '2024-01', 12)).toBe(true);
      expect(isMonthInSavingsRange('2024-06', '2024-01', 12)).toBe(true);
      expect(isMonthInSavingsRange('2024-12', '2024-01', 12)).toBe(true);
      expect(isMonthInSavingsRange('2025-01', '2024-01', 12)).toBe(false);
      expect(isMonthInSavingsRange('2023-12', '2024-01', 12)).toBe(false);
    });
  });
});
