// Duty shift pay calculation.
// Pay setup is fully OPTIONAL: shifts without pay_amount simply contribute 0
// and the roster/attendance system keeps working normally.

export interface ShiftPayConfig {
  id: string;
  name_bn?: string | null;
  start_time: string; // 'HH:MM' or 'HH:MM:SS'
  end_time: string;
  pay_amount?: number | null;
  pay_type?: string | null; // 'fixed' | 'per_day' | 'per_hour'
}

export interface ShiftPayInput {
  attended: boolean;
  checkIn?: string | null;
  checkOut?: string | null;
}

export interface ShiftPayLine {
  shiftId: string;
  shiftName: string;
  configured: boolean;
  hours: number;
  amount: number;
  note: string;
}

const toMin = (t?: string | null): number | null => {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

export const shiftDurationHours = (shift: ShiftPayConfig): number => {
  const s = toMin(shift.start_time);
  let e = toMin(shift.end_time);
  if (s === null || e === null) return 0;
  if (e <= s) e += 24 * 60; // overnight shift
  return (e - s) / 60;
};

/** Worked hours inside the shift window, capped by the shift duration. */
export const workedHoursInShift = (shift: ShiftPayConfig, input: ShiftPayInput): number => {
  const duration = shiftDurationHours(shift);
  const s = toMin(shift.start_time);
  let e = toMin(shift.end_time);
  const ci = toMin(input.checkIn);
  let co = toMin(input.checkOut);
  if (s === null || e === null) return 0;
  if (e <= s) e += 24 * 60;
  if (ci === null || co === null) return duration; // no punch data → assume full shift
  if (co <= ci) co += 24 * 60;
  const start = Math.max(s, ci);
  const end = Math.min(e, co);
  if (end <= start) return 0;
  return Math.min(duration, (end - start) / 60);
};

/** Pay for a single shift. Returns 0 when no pay setup exists. */
export const calcShiftPay = (shift: ShiftPayConfig, input: ShiftPayInput): ShiftPayLine => {
  const name = shift.name_bn || shift.id;
  const amount = Number(shift.pay_amount ?? 0);
  const configured = !!shift.pay_amount && amount > 0;

  if (!configured) {
    return { shiftId: shift.id, shiftName: name, configured: false, hours: 0, amount: 0, note: 'পে সেটআপ নাই' };
  }
  if (!input.attended) {
    return { shiftId: shift.id, shiftName: name, configured: true, hours: 0, amount: 0, note: 'হাজিরা নাই' };
  }

  const type = (shift.pay_type || 'per_day').toLowerCase();
  if (type === 'per_hour') {
    const hours = workedHoursInShift(shift, input);
    return {
      shiftId: shift.id,
      shiftName: name,
      configured: true,
      hours: Math.round(hours * 100) / 100,
      amount: Math.round(amount * hours * 100) / 100,
      note: `${amount}৳ × ${Math.round(hours * 100) / 100} ঘন্টা`,
    };
  }

  // 'fixed' and 'per_day' both pay the flat amount for an attended duty day
  return {
    shiftId: shift.id,
    shiftName: name,
    configured: true,
    hours: workedHoursInShift(shift, input),
    amount,
    note: type === 'fixed' ? `নির্দিষ্ট ${amount}৳` : `দৈনিক ${amount}৳`,
  };
};

/** Total pay across a staff member's duties for a day. */
export const calcDayShiftPay = (
  shifts: ShiftPayConfig[],
  input: ShiftPayInput,
): { total: number; lines: ShiftPayLine[]; anyConfigured: boolean } => {
  const lines = shifts.map((s) => calcShiftPay(s, input));
  return {
    total: Math.round(lines.reduce((a, l) => a + l.amount, 0) * 100) / 100,
    lines,
    anyConfigured: lines.some((l) => l.configured),
  };
};
