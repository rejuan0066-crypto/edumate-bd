// Machine (device) attendance window helpers for duty shifts.
// A shift's machine punch window opens N minutes before start_time and
// closes M minutes after end_time. Fully optional — shifts with
// machine_enabled = false never accept machine punches.

export interface MachineWindowShift {
  start_time: string;
  end_time: string;
  machine_enabled?: boolean | null;
  machine_open_before_minutes?: number | null;
  machine_close_after_minutes?: number | null;
  attendance_mode?: string | null; // 'manual' | 'machine' | 'both'
}

const toMin = (t?: string | null): number | null => {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

const fmt = (min: number): string => {
  const n = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
};

export const machineWindow = (shift: MachineWindowShift): { open: string; close: string } | null => {
  const s = toMin(shift.start_time);
  let e = toMin(shift.end_time);
  if (s === null || e === null) return null;
  if (e <= s) e += 1440;
  const before = Number(shift.machine_open_before_minutes ?? 0);
  const after = Number(shift.machine_close_after_minutes ?? 0);
  return { open: fmt(s - before), close: fmt(e + after) };
};

export const isMachineAllowed = (shift: MachineWindowShift): boolean =>
  !!shift.machine_enabled && (shift.attendance_mode ?? 'both') !== 'manual';

export const isManualAllowed = (shift: MachineWindowShift): boolean =>
  (shift.attendance_mode ?? 'both') !== 'machine';

/** Is the given HH:MM inside the shift's machine punch window? */
export const isInsideMachineWindow = (shift: MachineWindowShift, time: string): boolean => {
  const w = machineWindow(shift);
  const t = toMin(time);
  if (!w || t === null) return false;
  const open = toMin(w.open)!;
  const close = toMin(w.close)!;
  if (close >= open) return t >= open && t <= close;
  // window wraps past midnight
  return t >= open || t <= close;
};

/** Late minutes vs shift start (after grace). */
export const lateMinutesFor = (
  shift: MachineWindowShift & { grace_minutes?: number | null },
  checkIn?: string | null,
): number => {
  const s = toMin(shift.start_time);
  const ci = toMin(checkIn);
  if (s === null || ci === null) return 0;
  return Math.max(0, ci - s - Number(shift.grace_minutes ?? 0));
};

/** Early exit minutes vs shift end (after grace). */
export const earlyExitMinutesFor = (
  shift: MachineWindowShift & { early_exit_grace_minutes?: number | null },
  checkOut?: string | null,
): number => {
  const e = toMin(shift.end_time);
  const co = toMin(checkOut);
  if (e === null || co === null) return 0;
  return Math.max(0, e - co - Number(shift.early_exit_grace_minutes ?? 0));
};
