/**
 * Global timezone utilities — every app-wide date/time display should use these.
 * The active timezone comes from `app_settings.app_timezone` (admin-configurable).
 */

export const DEFAULT_APP_TZ = 'Asia/Dhaka';

/** Validate an IANA timezone string (returns false for empty / unknown). */
export function isValidTz(tz: string | null | undefined): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** Safe coercion to a known-good IANA timezone. */
export function safeTz(tz: string | null | undefined): string {
  return isValidTz(tz) ? (tz as string) : DEFAULT_APP_TZ;
}

/** Format a Date as a time string in the given timezone. */
export function formatTimeInTz(
  date: Date,
  tz: string,
  opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true },
): string {
  return date.toLocaleTimeString('en-US', { ...opts, timeZone: safeTz(tz) });
}

/** Format a Date as a date string in the given timezone (default dd/MM/yyyy). */
export function formatDateInTz(
  date: Date | string | number,
  tz: string,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-GB', { ...opts, timeZone: safeTz(tz) });
}

/** Format a Date as both date + time in the given timezone. */
export function formatDateTimeInTz(date: Date | string | number, tz: string): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: safeTz(tz),
  });
}

/** Returns the weekday index (0=Sun … 6=Sat) for the given Date in the given timezone. */
export function getWeekdayIdxInTz(date: Date, tz: string): number {
  const wk = new Intl.DateTimeFormat('en-US', { timeZone: safeTz(tz), weekday: 'short' }).format(date);
  const idx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wk);
  return idx >= 0 ? idx : date.getDay();
}

/** Returns the calendar date parts (year, month 0-indexed, day) for a Date in the given timezone. */
export function getDatePartsInTz(date: Date, tz: string): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz(tz), year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value || '0', 10);
  return { year: get('year'), month: get('month') - 1, day: get('day') };
}
export function getTzOffsetLabel(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: safeTz(tz), timeZoneName: 'shortOffset',
    }).formatToParts(new Date());
    return parts.find(p => p.type === 'timeZoneName')?.value || '';
  } catch {
    return '';
  }
}

/** Curated list of common IANA timezones for the admin selector. */
export const COMMON_TIMEZONES: { value: string; label: string; region: string }[] = [
  // South Asia
  { value: 'Asia/Dhaka',     label: 'Bangladesh (Asia/Dhaka)',          region: 'South Asia' },
  { value: 'Asia/Kolkata',   label: 'India (Asia/Kolkata)',             region: 'South Asia' },
  { value: 'Asia/Karachi',   label: 'Pakistan (Asia/Karachi)',          region: 'South Asia' },
  { value: 'Asia/Kathmandu', label: 'Nepal (Asia/Kathmandu)',           region: 'South Asia' },
  { value: 'Asia/Colombo',   label: 'Sri Lanka (Asia/Colombo)',         region: 'South Asia' },
  { value: 'Asia/Thimphu',   label: 'Bhutan (Asia/Thimphu)',            region: 'South Asia' },
  // Middle East
  { value: 'Asia/Riyadh',    label: 'Saudi Arabia (Asia/Riyadh)',       region: 'Middle East' },
  { value: 'Asia/Dubai',     label: 'UAE (Asia/Dubai)',                 region: 'Middle East' },
  { value: 'Asia/Qatar',     label: 'Qatar (Asia/Qatar)',               region: 'Middle East' },
  { value: 'Asia/Kuwait',    label: 'Kuwait (Asia/Kuwait)',             region: 'Middle East' },
  { value: 'Asia/Bahrain',   label: 'Bahrain (Asia/Bahrain)',           region: 'Middle East' },
  { value: 'Asia/Muscat',    label: 'Oman (Asia/Muscat)',               region: 'Middle East' },
  { value: 'Asia/Jerusalem', label: 'Israel (Asia/Jerusalem)',          region: 'Middle East' },
  { value: 'Asia/Tehran',    label: 'Iran (Asia/Tehran)',               region: 'Middle East' },
  // Southeast Asia
  { value: 'Asia/Jakarta',   label: 'Indonesia – WIB (Asia/Jakarta)',   region: 'Southeast Asia' },
  { value: 'Asia/Makassar',  label: 'Indonesia – WITA (Asia/Makassar)', region: 'Southeast Asia' },
  { value: 'Asia/Jayapura',  label: 'Indonesia – WIT (Asia/Jayapura)',  region: 'Southeast Asia' },
  { value: 'Asia/Kuala_Lumpur', label: 'Malaysia (Asia/Kuala_Lumpur)',  region: 'Southeast Asia' },
  { value: 'Asia/Singapore', label: 'Singapore (Asia/Singapore)',       region: 'Southeast Asia' },
  { value: 'Asia/Bangkok',   label: 'Thailand (Asia/Bangkok)',          region: 'Southeast Asia' },
  // East Asia
  { value: 'Asia/Tokyo',     label: 'Japan (Asia/Tokyo)',               region: 'East Asia' },
  { value: 'Asia/Seoul',     label: 'South Korea (Asia/Seoul)',         region: 'East Asia' },
  { value: 'Asia/Shanghai',  label: 'China (Asia/Shanghai)',            region: 'East Asia' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (Asia/Hong_Kong)',       region: 'East Asia' },
  // Europe
  { value: 'Europe/London',  label: 'UK (Europe/London)',               region: 'Europe' },
  { value: 'Europe/Berlin',  label: 'Germany (Europe/Berlin)',          region: 'Europe' },
  { value: 'Europe/Paris',   label: 'France (Europe/Paris)',            region: 'Europe' },
  { value: 'Europe/Istanbul',label: 'Turkey (Europe/Istanbul)',         region: 'Europe' },
  // Americas
  { value: 'America/New_York',    label: 'USA – Eastern (America/New_York)',  region: 'Americas' },
  { value: 'America/Chicago',     label: 'USA – Central (America/Chicago)',   region: 'Americas' },
  { value: 'America/Denver',      label: 'USA – Mountain (America/Denver)',   region: 'Americas' },
  { value: 'America/Phoenix',     label: 'USA – Arizona (America/Phoenix)',   region: 'Americas' },
  { value: 'America/Los_Angeles', label: 'USA – Pacific (America/Los_Angeles)', region: 'Americas' },
  { value: 'America/Anchorage',   label: 'USA – Alaska (America/Anchorage)',  region: 'Americas' },
  { value: 'Pacific/Honolulu',    label: 'USA – Hawaii (Pacific/Honolulu)',   region: 'Americas' },
  { value: 'America/Toronto',     label: 'Canada (America/Toronto)',          region: 'Americas' },
  // Oceania / Africa
  { value: 'Australia/Sydney', label: 'Australia (Australia/Sydney)',     region: 'Oceania' },
  { value: 'Pacific/Auckland', label: 'New Zealand (Pacific/Auckland)',   region: 'Oceania' },
  { value: 'Africa/Cairo',     label: 'Egypt (Africa/Cairo)',             region: 'Africa' },
  // Universal
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', region: 'Universal' },
];

/** Get the user's device timezone (for diagnostics / debug panels). */
export function getDeviceTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}
