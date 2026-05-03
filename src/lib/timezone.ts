/**
 * Global timezone utilities — every app-wide date/time display should use these.
 * The active timezone comes from `app_settings.app_timezone` (admin-configurable).
 *
 * RESILIENCE: every formatter is wrapped in try/catch and falls back to a manual
 * fixed-offset computation when `Intl.DateTimeFormat` either:
 *   - throws on the requested IANA `timeZone` (very old browsers / stripped ICU), or
 *   - silently returns wrong values.
 * For Bangladesh (Asia/Dhaka, UTC+6, no DST) the manual fallback is exact.
 */

export const DEFAULT_APP_TZ = 'Asia/Dhaka';

/**
 * Fixed UTC offsets (in minutes) for common, no-DST timezones.
 * Used ONLY when the runtime cannot resolve the IANA name itself.
 * Keep this conservative — only zones that don't observe DST.
 */
const FIXED_OFFSETS_MIN: Record<string, number> = {
  'Asia/Dhaka': 360,        // BST UTC+6
  'Asia/Kolkata': 330,      // IST UTC+5:30
  'Asia/Karachi': 300,      // PKT UTC+5
  'Asia/Kathmandu': 345,    // NPT UTC+5:45
  'Asia/Colombo': 330,      // IST UTC+5:30
  'Asia/Thimphu': 360,      // BTT UTC+6
  'Asia/Riyadh': 180,       // AST UTC+3
  'Asia/Dubai': 240,        // GST UTC+4
  'Asia/Qatar': 180,
  'Asia/Kuwait': 180,
  'Asia/Bahrain': 180,
  'Asia/Muscat': 240,
  'Asia/Jakarta': 420,      // WIB UTC+7
  'Asia/Makassar': 480,     // WITA UTC+8
  'Asia/Jayapura': 540,     // WIT UTC+9
  'Asia/Kuala_Lumpur': 480,
  'Asia/Singapore': 480,
  'Asia/Bangkok': 420,
  'Asia/Tokyo': 540,
  'Asia/Seoul': 540,
  'Asia/Shanghai': 480,
  'Asia/Hong_Kong': 480,
  'Pacific/Honolulu': -600, // HST UTC-10 (no DST)
  'America/Phoenix': -420,  // MST UTC-7 (no DST)
  UTC: 0,
};

/** Cached engine support flag — `null` until first probed. */
let engineSupportsIanaTz: boolean | null = null;

/** Detects whether the JS engine's Intl resolves IANA timezone names at all. */
function hasIanaSupport(): boolean {
  if (engineSupportsIanaTz !== null) return engineSupportsIanaTz;
  try {
    // If the engine ignores `timeZone` (very old runtimes) or throws, we treat
    // it as unsupported. We probe with Asia/Dhaka because the DEFAULT relies on it.
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric' });
    const resolved = fmt.resolvedOptions().timeZone;
    engineSupportsIanaTz = typeof resolved === 'string' && resolved.length > 0;
  } catch {
    engineSupportsIanaTz = false;
  }
  return engineSupportsIanaTz;
}

/** Validate an IANA timezone string (returns false for empty / unknown). */
export function isValidTz(tz: string | null | undefined): boolean {
  if (!tz || typeof tz !== 'string') return false;
  // If the engine has no IANA support, only zones we have a fixed offset for are usable.
  if (!hasIanaSupport()) return Object.prototype.hasOwnProperty.call(FIXED_OFFSETS_MIN, tz);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/** Safe coercion to a known-good IANA timezone. Always returns a usable string. */
export function safeTz(tz: string | null | undefined): string {
  if (isValidTz(tz)) return tz as string;
  // If even the default isn't resolvable by the engine, we still return its
  // canonical name — manual-offset fallbacks below key off this string.
  return DEFAULT_APP_TZ;
}

/** Returns the manual fixed offset (minutes) for a zone, or `null` if unknown. */
function manualOffsetMin(tz: string): number | null {
  return Object.prototype.hasOwnProperty.call(FIXED_OFFSETS_MIN, tz) ? FIXED_OFFSETS_MIN[tz] : null;
}

/** Shifts a Date by N minutes and returns a new Date whose UTC fields equal the target wall-clock. */
function shiftToZone(date: Date, offsetMin: number): Date {
  return new Date(date.getTime() + offsetMin * 60_000);
}

const pad2 = (n: number) => (n < 10 ? '0' + n : '' + n);

/** Manual time formatter for the offset fallback path. */
function manualFormatTime(date: Date, offsetMin: number, hour12: boolean, withSeconds: boolean): string {
  const d = shiftToZone(date, offsetMin);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const s = d.getUTCSeconds();
  let suffix = '';
  if (hour12) {
    suffix = h >= 12 ? ' PM' : ' AM';
    h = h % 12;
    if (h === 0) h = 12;
  }
  const base = pad2(h) + ':' + pad2(m) + (withSeconds ? ':' + pad2(s) : '');
  return base + suffix;
}

/** Format a Date as a time string in the given timezone. Falls back to manual offset. */
export function formatTimeInTz(
  date: Date,
  tz: string,
  opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true },
): string {
  const zone = safeTz(tz);
  if (hasIanaSupport()) {
    try {
      return date.toLocaleTimeString('en-US', { ...opts, timeZone: zone });
    } catch {
      /* fall through to manual */
    }
  }
  const off = manualOffsetMin(zone) ?? manualOffsetMin(DEFAULT_APP_TZ) ?? 0;
  const hour12 = opts.hour12 !== false;
  const withSeconds = !!opts.second;
  return manualFormatTime(date, off, hour12, withSeconds);
}

/** Format a Date as a date string (default dd/MM/yyyy) in the given timezone. */
export function formatDateInTz(
  date: Date | string | number,
  tz: string,
  opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' },
): string {
  const d = date instanceof Date ? date : new Date(date);
  const zone = safeTz(tz);
  if (hasIanaSupport()) {
    try {
      return d.toLocaleDateString('en-GB', { ...opts, timeZone: zone });
    } catch {
      /* fall through to manual */
    }
  }
  const off = manualOffsetMin(zone) ?? manualOffsetMin(DEFAULT_APP_TZ) ?? 0;
  const sd = shiftToZone(d, off);
  return pad2(sd.getUTCDate()) + '/' + pad2(sd.getUTCMonth() + 1) + '/' + sd.getUTCFullYear();
}

/** Format a Date as both date + time in the given timezone. */
export function formatDateTimeInTz(date: Date | string | number, tz: string): string {
  const d = date instanceof Date ? date : new Date(date);
  const zone = safeTz(tz);
  if (hasIanaSupport()) {
    try {
      return d.toLocaleString('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: zone,
      });
    } catch {
      /* fall through */
    }
  }
  return formatDateInTz(d, zone) + ', ' + formatTimeInTz(d, zone, { hour: '2-digit', minute: '2-digit', hour12: true });
}

/** Returns the weekday index (0=Sun … 6=Sat) for the given Date in the given timezone. */
export function getWeekdayIdxInTz(date: Date, tz: string): number {
  const zone = safeTz(tz);
  if (hasIanaSupport()) {
    try {
      const wk = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'short' }).format(date);
      const idx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(wk);
      if (idx >= 0) return idx;
    } catch {
      /* fall through */
    }
  }
  const off = manualOffsetMin(zone) ?? manualOffsetMin(DEFAULT_APP_TZ) ?? 0;
  return shiftToZone(date, off).getUTCDay();
}

/** Returns the calendar date parts (year, month 0-indexed, day) for a Date in the given timezone. */
export function getDatePartsInTz(date: Date, tz: string): { year: number; month: number; day: number } {
  const zone = safeTz(tz);
  if (hasIanaSupport()) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(date);
      const get = (t: string) => parseInt(parts.find(p => p.type === t)?.value || '0', 10);
      const year = get('year'), month = get('month'), day = get('day');
      if (year && month && day) return { year, month: month - 1, day };
    } catch {
      /* fall through */
    }
  }
  const off = manualOffsetMin(zone) ?? manualOffsetMin(DEFAULT_APP_TZ) ?? 0;
  const sd = shiftToZone(date, off);
  return { year: sd.getUTCFullYear(), month: sd.getUTCMonth(), day: sd.getUTCDate() };
}

/** Returns the IANA timezone offset label (e.g. "GMT+6") for the given timezone *now*. */
export function getTzOffsetLabel(tz: string): string {
  const zone = safeTz(tz);
  if (hasIanaSupport()) {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: zone, timeZoneName: 'shortOffset',
      }).formatToParts(new Date());
      const v = parts.find(p => p.type === 'timeZoneName')?.value;
      if (v) return v;
    } catch {
      /* fall through */
    }
  }
  const off = manualOffsetMin(zone);
  if (off === null) return '';
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return 'GMT' + sign + h + (m ? ':' + pad2(m) : '');
}

/** True when the runtime falls back to manual offsets (useful for showing a banner). */
export function usingFallbackTz(): boolean {
  return !hasIanaSupport();
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

/** Returns YYYY-MM-DD for the given Date in the given timezone (no UTC drift). */
export function toIsoDateInTz(date: Date, tz: string): string {
  const { year, month, day } = getDatePartsInTz(date, tz);
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

/** Returns YYYY-MM (month identifier) for the given Date in the given timezone. */
export function toMonthYearInTz(date: Date, tz: string): string {
  const { year, month } = getDatePartsInTz(date, tz);
  return `${year}-${pad2(month + 1)}`;
}

/** "Today" as YYYY-MM-DD in the given timezone. */
export function todayIsoInTz(tz: string): string {
  return toIsoDateInTz(new Date(), tz);
}

/** Add N days to a YYYY-MM-DD date string in the given timezone, returning YYYY-MM-DD. */
export function addDaysIsoInTz(isoDate: string, days: number, tz: string): string {
  // Parse YYYY-MM-DD as a wall-clock date, shift via UTC math (24h * days), then re-render in tz.
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  // Build a UTC date at noon to avoid DST edge issues for the +N days arithmetic.
  const base = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  base.setUTCDate(base.getUTCDate() + days);
  return toIsoDateInTz(base, tz);
}
