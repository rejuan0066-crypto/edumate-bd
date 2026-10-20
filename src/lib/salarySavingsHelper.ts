/**
 * Utility functions for Staff Salary Savings (ডিপোজিট / সঞ্চয়)
 * Handles start-month to end-month calculations and duration synchronization.
 */

/**
 * Calculates the end month (YYYY-MM) given a start month (YYYY-MM) and duration in months.
 * Example: start='2024-01', duration=12 -> '2024-12'
 * Example: start='2025-10', duration=6  -> '2026-03'
 */
export function getEndMonthFromStart(startMonth: string, durationMonths: number): string {
  if (!startMonth || !/^\d{4}-\d{2}$/.test(startMonth)) return '';
  const duration = Math.max(1, Math.round(Number(durationMonths) || 1));
  const [yStr, mStr] = startMonth.split('-');
  const y = parseInt(yStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(y) || isNaN(m) || m < 1 || m > 12) return '';

  const totalIndex = y * 12 + (m - 1) + (duration - 1);
  const endY = Math.floor(totalIndex / 12);
  const endM = (totalIndex % 12) + 1;
  return `${endY}-${String(endM).padStart(2, '0')}`;
}

/**
 * Calculates the duration in months between start month (YYYY-MM) and end month (YYYY-MM) inclusive.
 * Example: start='2024-01', end='2024-12' -> 12
 * Example: start='2025-10', end='2026-03' -> 6
 * If end < start, returns 0.
 */
export function getDurationFromRange(startMonth: string, endMonth: string): number {
  if (!startMonth || !endMonth || !/^\d{4}-\d{2}$/.test(startMonth) || !/^\d{4}-\d{2}$/.test(endMonth)) {
    return 0;
  }
  const [startY, startM] = startMonth.split('-').map(Number);
  const [endY, endM] = endMonth.split('-').map(Number);
  if (isNaN(startY) || isNaN(startM) || isNaN(endY) || isNaN(endM)) return 0;

  const diff = (endY - startY) * 12 + (endM - startM) + 1;
  return diff > 0 ? diff : 0;
}

/**
 * Checks if a specific month (YYYY-MM) falls within the start-month and duration range.
 */
export function isMonthInSavingsRange(monthYear: string, startMonth: string, durationMonths: number): boolean {
  if (!monthYear || !startMonth || !durationMonths || durationMonths < 1) return false;
  const [year, month] = monthYear.split('-').map(Number);
  const [startYear, startMo] = startMonth.split('-').map(Number);
  if (isNaN(year) || isNaN(month) || isNaN(startYear) || isNaN(startMo)) return false;

  const current = year * 12 + month;
  const start = startYear * 12 + startMo;
  const end = start + durationMonths - 1;
  return current >= start && current <= end;
}
