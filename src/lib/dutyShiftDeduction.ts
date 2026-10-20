/**
 * Residential duty shift deduction — pure, deterministic helpers.
 *
 * Rules (accuracy-first, each line applied EXACTLY once):
 *  - Holiday / no-duty day  -> no line at all (0)
 *  - absent                 -> absent_deduction_amount
 *  - late (when enabled)    -> flat: late_deduction_amount (fallback = absent amount)
 *                              per_minute: (rate per minute) × billable minutes
 *                              billable = max(0, late + early_exit - free_minutes)
 *                              per-minute rate defaults to absentAmount / shiftMinutes
 *  - present                -> 0
 *  - missing record on a rostered, non-holiday, non-future day -> treated as absent
 *  - late deduction is always capped at absent_deduction_amount
 *  - duplicate (staff, date, shift) rows are de-duplicated
 */

export interface DeductionShift {
  id: string;
  name_bn?: string | null;
  name_en?: string | null;
  start_time: string; // 'HH:MM' / 'HH:MM:SS'
  end_time: string;
  grace_minutes?: number | null;
  early_exit_grace_minutes?: number | null;
  absent_deduction_amount?: number | null;
  late_deduction_enabled?: boolean | null;
  late_deduction_amount?: number | null;
  late_deduction_mode?: string | null; // 'flat' | 'per_minute'
  late_deduction_free_minutes?: number | null;
}

export interface DutyDay {
  /** ISO date 'YYYY-MM-DD' */
  date: string;
  shiftId: string;
  /** true when the day is a holiday / weekly off for this staff -> skipped */
  isHoliday?: boolean;
  /** true when the date is in the future -> skipped */
  isFuture?: boolean;
  /** true when the staff is already absent in main attendance -> duty deduction waived to prevent double penalty */
  isGeneralAbsent?: boolean;
  /** true when unmarked duty attendance should not be penalized */
  skipUnmarked?: boolean;
}

export interface DutyAttendance {
  date: string;
  shiftId: string;
  status?: string | null; // 'present' | 'late' | 'absent' | 'leave' | ...
  late_minutes?: number | null;
  early_exit_minutes?: number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
}

export interface DeductionLine {
  date: string;
  shiftId: string;
  shiftName: string;
  reason: 'absent' | 'late' | 'none';
  minutes: number;
  amount: number;
  note: string;
}

export interface DeductionResult {
  total: number;
  lines: DeductionLine[];
  absentCount: number;
  lateCount: number;
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

const toMin = (t?: string | null): number | null => {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(String(t).trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

/** Scheduled duration of a shift in minutes (handles overnight shifts). */
export const shiftMinutes = (shift: DeductionShift): number => {
  const s = toMin(shift.start_time);
  let e = toMin(shift.end_time);
  if (s === null || e === null) return 0;
  if (e <= s) e += 24 * 60;
  return e - s;
};

/** Late minutes after grace, derived from check-in when not supplied. */
export const effectiveLateMinutes = (shift: DeductionShift, att: DutyAttendance): number => {
  if (att.late_minutes != null) return Math.max(0, num(att.late_minutes));
  const s = toMin(shift.start_time);
  const ci = toMin(att.check_in_time);
  if (s === null || ci === null) return 0;
  return Math.max(0, ci - s - num(shift.grace_minutes));
};

/** Early-exit minutes after grace, derived from check-out when not supplied. */
export const effectiveEarlyExitMinutes = (shift: DeductionShift, att: DutyAttendance): number => {
  if (att.early_exit_minutes != null) return Math.max(0, num(att.early_exit_minutes));
  const e = toMin(shift.end_time);
  const co = toMin(att.check_out_time);
  if (e === null || co === null) return 0;
  return Math.max(0, e - co - num(shift.early_exit_grace_minutes));
};

/** Per-minute late rate: explicit amount, else absent amount spread over the shift. */
export const perMinuteRate = (shift: DeductionShift): number => {
  const explicit = shift.late_deduction_amount;
  if (explicit != null && num(explicit) > 0) return num(explicit);
  const mins = shiftMinutes(shift);
  if (mins <= 0) return 0;
  return num(shift.absent_deduction_amount) / mins;
};

/** Deduction for a single rostered duty day+shift. */
export const calcDayDeduction = (
  shift: DeductionShift,
  day: DutyDay,
  att?: DutyAttendance | null,
): DeductionLine => {
  const shiftName = shift.name_bn || shift.name_en || shift.id;
  const none = (note: string): DeductionLine => ({
    date: day.date,
    shiftId: shift.id,
    shiftName,
    reason: 'none',
    minutes: 0,
    amount: 0,
    note,
  });

  if (day.isHoliday) return none('ছুটি — কর্তন নাই');
  if (day.isFuture) return none('ভবিষ্যৎ তারিখ');
  if (day.isGeneralAbsent) return none('মূল উপস্থিতিতে অনুপস্থিত — ডিউটি কর্তন মওকুফ (দ্বৈত কর্তনমুক্ত)');

  const absentAmount = num(shift.absent_deduction_amount);
  if (absentAmount <= 0 && !shift.late_deduction_enabled) return none('কর্তন সেটআপ নাই');

  const status = (att?.status || '').toLowerCase();
  if (status === 'leave' || status === 'holiday' || status === 'excused') {
    return none('অনুমোদিত ছুটি');
  }

  // Missing record on a past rostered day counts as absent.
  // If no attendance record exists and unmarked days are skipped, do not penalize
  if (!att && day.skipUnmarked) {
    return none('হাজিরা অচিহ্নিত — কর্তন নাই');
  }

  const isAbsent = !att || status === 'absent';
  if (isAbsent) {
    if (absentAmount <= 0) return none('অনুপস্থিতি কর্তন সেট নাই');
    return {
      date: day.date,
      shiftId: shift.id,
      shiftName,
      reason: 'absent',
      minutes: 0,
      amount: round2(absentAmount),
      note: att ? 'অনুপস্থিত' : 'হাজিরা রেকর্ড নাই (অনুপস্থিত ধরা হয়েছে)',
    };
  }

  if (!shift.late_deduction_enabled) return none('উপস্থিত');

  const late = effectiveLateMinutes(shift, att!);
  const early = effectiveEarlyExitMinutes(shift, att!);
  const free = Math.max(0, num(shift.late_deduction_free_minutes ?? 5));
  const billable = Math.max(0, late + early - free);
  if (billable <= 0) return none('উপস্থিত (গ্রেস সীমার ভিতরে)');

  const mode = (shift.late_deduction_mode || 'flat').toLowerCase();
  let amount: number;
  let note: string;
  if (mode === 'per_minute') {
    const rate = perMinuteRate(shift);
    amount = rate * billable;
    note = `${round2(rate)}৳ × ${billable} মিনিট (${free} মিনিট ফ্রি)`;
  } else {
    const flat = shift.late_deduction_amount != null && num(shift.late_deduction_amount) > 0
      ? num(shift.late_deduction_amount)
      : absentAmount;
    amount = flat;
    note = `বিলম্ব ফ্ল্যাট ${round2(flat)}৳`;
  }

  // Late can never cost more than being fully absent.
  if (absentAmount > 0) amount = Math.min(amount, absentAmount);
  if (amount <= 0) return none('উপস্থিত');

  return {
    date: day.date,
    shiftId: shift.id,
    shiftName,
    reason: 'late',
    minutes: billable,
    amount: round2(amount),
    note,
  };
};

const key = (date: string, shiftId: string) => `${date}::${shiftId}`;

/**
 * Total deduction for one staff member across a month's rostered duty days.
 * Duplicate day+shift entries (roster or attendance) are collapsed.
 */
export const calcDutyDeduction = (
  shifts: DeductionShift[],
  days: DutyDay[],
  attendance: DutyAttendance[],
  options?: { skipUnmarked?: boolean },
): DeductionResult => {
  const shiftMap = new Map(shifts.map((s) => [s.id, s]));

  const attMap = new Map<string, DutyAttendance>();
  attendance.forEach((a) => {
    const k = key(a.date, a.shiftId);
    if (!attMap.has(k)) attMap.set(k, a); // first record wins, dedupe
  });

  const seen = new Set<string>();
  const lines: DeductionLine[] = [];
  days.forEach((d) => {
    const k = key(d.date, d.shiftId);
    if (seen.has(k)) return;
    seen.add(k);
    const shift = shiftMap.get(d.shiftId);
    if (!shift) return;
    const effectiveDay = options?.skipUnmarked !== undefined && d.skipUnmarked === undefined
      ? { ...d, skipUnmarked: options.skipUnmarked }
      : d;
    const line = calcDayDeduction(shift, effectiveDay, attMap.get(k));
    if (line.amount > 0) lines.push(line);
  });

  return {
    total: round2(lines.reduce((a, l) => a + l.amount, 0)),
    lines,
    absentCount: lines.filter((l) => l.reason === 'absent').length,
    lateCount: lines.filter((l) => l.reason === 'late').length,
  };
};
