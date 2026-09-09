/**
 * একই দিনে একাধিক হাজিরা এন্ট্রি থাকলে কোন এন্ট্রিটি গণনা হবে —
 * এই নিয়মটি অ্যাডমিন সেটিংস (`app_settings.attendance_duplicate_rule`) থেকে নিয়ন্ত্রিত।
 *
 * latest   = সবচেয়ে নতুন এন্ট্রি (ডিফল্ট)
 * earliest = সবচেয়ে পুরোনো (প্রথম) এন্ট্রি
 */
export type AttendanceDuplicateRule = 'latest' | 'earliest';

export const DEFAULT_ATTENDANCE_DUPLICATE_RULE: AttendanceDuplicateRule = 'latest';

export const ATTENDANCE_DUPLICATE_RULE_KEY = 'attendance_duplicate_rule';

export function safeDuplicateRule(v: unknown): AttendanceDuplicateRule {
  return v === 'earliest' || v === 'latest' ? v : DEFAULT_ATTENDANCE_DUPLICATE_RULE;
}

/** টাই-ব্রেকার: একই টাইমস্ট্যাম্প হলে বেশি তথ্যবহুল স্ট্যাটাস অগ্রাধিকার পায়। */
const STATUS_PRIORITY: Record<string, number> = {
  late: 6, half_day: 5, present: 4, leave: 3, excused: 3, absent: 2,
};

export function attendanceRecordTimestamp(r: any): number {
  const ts = r?.updated_at || r?.created_at || (r?.attendance_date ? `${r.attendance_date}T00:00:00` : '');
  const t = ts ? new Date(ts).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
}

export function attendanceDedupKey(r: any): string {
  return [r?.entity_type ?? '', r?.entity_id ?? '', r?.attendance_date ?? '', r?.shift ?? ''].join('|');
}

/**
 * ডুপ্লিকেট হাজিরা এন্ট্রি স্বয়ংক্রিয়ভাবে সরিয়ে দেয়।
 * key = entity_type + entity_id + attendance_date + shift
 */
export function dedupeAttendanceRecords<T extends Record<string, any>>(
  records: T[],
  rule: AttendanceDuplicateRule = DEFAULT_ATTENDANCE_DUPLICATE_RULE,
  keyFn: (r: T) => string = attendanceDedupKey,
): T[] {
  const map = new Map<string, T>();
  for (const r of records || []) {
    const key = keyFn(r);
    const existing = map.get(key);
    if (!existing) { map.set(key, r); continue; }
    const curTs = attendanceRecordTimestamp(r);
    const exTs = attendanceRecordTimestamp(existing);
    const curPri = STATUS_PRIORITY[r.status as string] ?? 0;
    const exPri = STATUS_PRIORITY[existing.status as string] ?? 0;
    const wins = curTs === exTs
      ? curPri > exPri
      : (rule === 'latest' ? curTs > exTs : curTs < exTs);
    if (wins) map.set(key, r);
  }
  return Array.from(map.values());
}

/** কোন কোন দিনে ডুপ্লিকেট এন্ট্রি আছে তা জানায় (রিপোর্ট/সতর্কতার জন্য)। */
export function findDuplicateAttendanceGroups<T extends Record<string, any>>(records: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const r of records || []) {
    const key = attendanceDedupKey(r);
    const arr = groups.get(key);
    if (arr) arr.push(r); else groups.set(key, [r]);
  }
  for (const [k, v] of groups) if (v.length < 2) groups.delete(k);
  return groups;
}
