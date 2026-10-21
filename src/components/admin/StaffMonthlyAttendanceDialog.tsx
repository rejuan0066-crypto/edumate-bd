import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, AlertCircle, CalendarOff, Stethoscope, ShieldCheck, Calendar as CalendarIcon, Trash2, Save, Lock, Printer, Download, Loader2 } from 'lucide-react';
import { TimePicker } from '@/components/ui/time-picker';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDay } from 'date-fns';
import { bn as bnLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { parseClockMinutes, shouldApplyThursdayHalfDay } from '@/lib/thursdayHalfDay';
import { resolveStaffShift, fetchSpecialShifts, fetchDepartmentSchedules } from '@/lib/shiftResolution';
import { dedupeAttendanceRecords } from '@/lib/attendanceDedup';
import { useAttendanceDuplicateRule } from '@/hooks/useAttendanceDuplicateRule';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { downloadSheetAsPdf } from '@/lib/salarySlipPdf';

const STATUS_META: Record<string, {
  bnLabel: string; enLabel: string; icon: any;
  color: string; bg: string; ring: string;
  gradient: string; dot: string; solid: string;
}> = {
  present:  { bnLabel: 'উপস্থিত',        enLabel: 'Present',  icon: CheckCircle2, color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-emerald-100/60 dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-emerald-900/30', ring: 'ring-emerald-400/40', gradient: 'from-emerald-500 to-teal-500',  dot: 'bg-emerald-500', solid: 'bg-emerald-500' },
  absent:   { bnLabel: 'অনুপস্থিত',      enLabel: 'Absent',   icon: XCircle,      color: 'text-rose-700 dark:text-rose-300',       bg: 'bg-gradient-to-br from-rose-50 via-rose-50/80 to-rose-100/60 dark:from-rose-950/40 dark:via-rose-900/20 dark:to-rose-900/30',           ring: 'ring-rose-400/40',    gradient: 'from-rose-500 to-pink-500',     dot: 'bg-rose-500',    solid: 'bg-rose-500' },
  late:     { bnLabel: 'বিলম্ব',          enLabel: 'Late',     icon: Clock,        color: 'text-amber-700 dark:text-amber-300',     bg: 'bg-gradient-to-br from-amber-50 via-amber-50/80 to-amber-100/60 dark:from-amber-950/40 dark:via-amber-900/20 dark:to-amber-900/30',       ring: 'ring-amber-400/40',   gradient: 'from-amber-500 to-yellow-500',  dot: 'bg-amber-500',   solid: 'bg-amber-500' },
  half_day: { bnLabel: 'অর্ধদিন',         enLabel: 'Half Day', icon: AlertCircle,  color: 'text-orange-700 dark:text-orange-300',   bg: 'bg-gradient-to-br from-orange-50 via-orange-50/80 to-orange-100/60 dark:from-orange-950/40 dark:via-orange-900/20 dark:to-orange-900/30',   ring: 'ring-orange-400/40',  gradient: 'from-orange-500 to-amber-500',  dot: 'bg-orange-500',  solid: 'bg-orange-500' },
  leave:    { bnLabel: 'ছুটি',            enLabel: 'Leave',    icon: CalendarOff,  color: 'text-blue-700 dark:text-blue-300',       bg: 'bg-gradient-to-br from-blue-50 via-blue-50/80 to-blue-100/60 dark:from-blue-950/40 dark:via-blue-900/20 dark:to-blue-900/30',           ring: 'ring-blue-400/40',    gradient: 'from-blue-500 to-cyan-500',     dot: 'bg-blue-500',    solid: 'bg-blue-500' },
  excused:  { bnLabel: 'অনুমতিপ্রাপ্ত',  enLabel: 'Excused',  icon: ShieldCheck,  color: 'text-indigo-700 dark:text-indigo-300',   bg: 'bg-gradient-to-br from-indigo-50 via-indigo-50/80 to-indigo-100/60 dark:from-indigo-950/40 dark:via-indigo-900/20 dark:to-indigo-900/30',   ring: 'ring-indigo-400/40',  gradient: 'from-indigo-500 to-violet-500', dot: 'bg-indigo-500',  solid: 'bg-indigo-500' },
  medical:  { bnLabel: 'চিকিৎসাজনিত',    enLabel: 'Medical',  icon: Stethoscope,  color: 'text-purple-700 dark:text-purple-300',   bg: 'bg-gradient-to-br from-purple-50 via-purple-50/80 to-purple-100/60 dark:from-purple-950/40 dark:via-purple-900/20 dark:to-purple-900/30',   ring: 'ring-purple-400/40',  gradient: 'from-purple-500 to-fuchsia-500',dot: 'bg-purple-500',  solid: 'bg-purple-500' },
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staff: { id: string; name_bn?: string; name_en?: string; designation?: string; photo_url?: string } | null;
  shift?: string;
  initialDate?: string; // YYYY-MM-DD — opens on this month
}

export default function StaffMonthlyAttendanceDialog({ open, onOpenChange, staff, shift, initialDate }: Props) {
  const { language } = useLanguage();
  const duplicateRule = useAttendanceDuplicateRule();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const { data: instInfo } = useInstitutionInfo();
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  const [cursor, setCursor] = useState<Date>(new Date());
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);
  // Expected duty start (minutes-from-midnight) + Thursday half-day setting,
  // used to compute late minutes from check-in time (same rule as salary page).
  const [dutyInfo, setDutyInfo] = useState<{ start: number; end: number; category: string | null; hasCustomDuty?: boolean }>({ start: 480, end: 1020, category: null, hasCustomDuty: false });
  const [thuSetting, setThuSetting] = useState<any>(null);
  // Residential-duty roster: which dates this staff actually has the shift on.
  // null = no restriction (full-day / student shifts); Set = allowed ISO dates.
  const [dutyAllowedDates, setDutyAllowedDates] = useState<Set<string> | null>(null);
  const isDutyShift = shift === 'morning' || shift === 'evening';

  useEffect(() => {
    if (!open) return;
    if (initialDate) {
      const [y, m, d] = initialDate.split('-').map(Number);
      if (y && m) setCursor(new Date(y, m - 1, d || 1));
      else setCursor(new Date());
    } else {
      setCursor(new Date());
    }
  }, [open, staff?.id, initialDate]);

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

  const refetch = async () => {
    if (!staff?.id) return;
    let q = supabase.from('attendance_records').select('*')
      .eq('entity_type', 'staff')
      .eq('entity_id', staff.id)
      .gte('attendance_date', format(monthStart, 'yyyy-MM-dd'))
      .lte('attendance_date', format(monthEnd, 'yyyy-MM-dd'));
    if (shift) q = q.eq('shift', shift);
    const { data } = await q;
    setRecords(dedupeAttendanceRecords(data || [], duplicateRule));
  };

  useEffect(() => {
    if (!open || !staff?.id) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      let q = supabase.from('attendance_records').select('*')
        .eq('entity_type', 'staff')
        .eq('entity_id', staff.id)
        .gte('attendance_date', format(monthStart, 'yyyy-MM-dd'))
        .lte('attendance_date', format(monthEnd, 'yyyy-MM-dd'));
      if (shift) q = q.eq('shift', shift);
      const { data } = await q;
      if (!cancel) {
        setRecords(dedupeAttendanceRecords(data || [], duplicateRule));
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [open, staff?.id, monthStart, monthEnd, shift, duplicateRule]);


  // For residential duty shifts, build the set of dates in the visible month
  // where this staff is rostered for THIS shift (day override beats template).
  useEffect(() => {
    if (!open || !staff?.id || !isDutyShift) { setDutyAllowedDates(null); return; }
    let cancel = false;
    (async () => {
      const start = format(monthStart, 'yyyy-MM-dd');
      const end = format(monthEnd, 'yyyy-MM-dd');
      const [{ data: shiftRow }, { data: tpl }, { data: roster }] = await Promise.all([
        supabase.from('duty_shifts').select('id').eq('code', shift).is('deleted_at', null).maybeSingle(),
        supabase.from('duty_weekly_template').select('weekday, shift_id').eq('staff_id', staff.id).eq('is_active', true),
        supabase.from('duty_roster').select('duty_date, shift_id').eq('staff_id', staff.id).gte('duty_date', start).lte('duty_date', end),
      ]);
      if (cancel) return;
      const shiftId = (shiftRow as any)?.id;
      if (!shiftId) { setDutyAllowedDates(new Set()); return; }
      const allowed = new Set<string>();
      const overriddenDates = new Set((roster || []).map((r: any) => r.duty_date));
      (roster || []).forEach((r: any) => { if (r.shift_id === shiftId) allowed.add(r.duty_date); });
      const tplWeekdays = new Set((tpl || []).filter((t: any) => t.shift_id === shiftId).map((t: any) => t.weekday));
      days.forEach((d) => {
        const key = format(d, 'yyyy-MM-dd');
        if (overriddenDates.has(key)) return; // day override replaces template
        if (tplWeekdays.has(getDay(d))) allowed.add(key);
      });
      setDutyAllowedDates(allowed);
    })();
    return () => { cancel = true; };
  }, [open, staff?.id, shift, isDutyShift, monthStart, monthEnd, days]);

  // Load the staff's expected duty time (staff-specific → category shift → 08:00 default)
  // and the Thursday half-day setting, so late minutes match the salary page.
  useEffect(() => {
    if (!open || !staff?.id) return;
    let cancel = false;
    (async () => {
      const [{ data: s }, { data: cs }, { data: thu }, specialShifts, departmentSchedules] = await Promise.all([
        supabase.from('staff').select('duty_start_time, duty_end_time, staff_category').eq('id', staff.id).maybeSingle(),
        supabase.from('website_settings').select('value').eq('key', 'category_shift_times').maybeSingle(),
        supabase.from('website_settings').select('value').eq('key', 'thursday_half_day_education').maybeSingle(),
        fetchSpecialShifts(supabase),
        fetchDepartmentSchedules(supabase),
      ]);
      if (cancel) return;
      const cat = (s as any)?.staff_category || null;
      const catMap = ((cs?.value as any) || {}) as Record<string, { start?: string; end?: string }>;
      
      const targetDate = `${format(cursor, 'yyyy-MM')}-15`;
      const resolved = resolveStaffShift({
        staffId: staff.id,
        staffCategory: cat,
        targetDate,
        profileDuty: {
          start: (s as any)?.duty_start_time,
          end: (s as any)?.duty_end_time,
        },
        specialShifts,
        departmentSchedules,
        categoryTimes: catMap,
      });

      const start = parseClockMinutes(resolved.start) ?? 480;
      const end = parseClockMinutes(resolved.end) ?? 1020;
      const hasCustomDuty = resolved.isCustomDuty;

      setDutyInfo({ start, end, category: cat, hasCustomDuty });
      setThuSetting(thu?.value || null);
    })();
    return () => { cancel = true; };
  }, [open, staff?.id, cursor]);

  const byDate = useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of records) m[r.attendance_date] = r;
    return m;
  }, [records]);

  const activeDate = useMemo(() => activeDateKey ? days.find(d => format(d, 'yyyy-MM-dd') === activeDateKey) || null : null, [activeDateKey, days]);
  const activeRec = activeDateKey ? byDate[activeDateKey] : null;
  const activeIsToday = activeDate ? isSameDay(activeDate, new Date()) : false;

  const counts = useMemo(() => {
    const c: Record<string, number> = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0, excused: 0, medical: 0 };
    for (const r of records) if (c[r.status] !== undefined) c[r.status] += 1;
    return c;
  }, [records]);

  // Late minutes for a record = check-in time minus expected duty start
  // (Thursday half-day start override applies when the rule is on for this category, but NOT for custom personal duty).
  const lateMinutesFor = (rec: any): number => {
    if (!rec?.check_in_time) return 0;
    const checkIn = parseClockMinutes(String(rec.check_in_time).slice(0, 5));
    if (checkIn == null) return 0;
    let expected = dutyInfo.start;
    const overnight = dutyInfo.end <= dutyInfo.start;
    if (!dutyInfo.hasCustomDuty && shouldApplyThursdayHalfDay({ setting: thuSetting, staffCategory: dutyInfo.category, attendanceDate: rec.attendance_date, isOvernight: overnight })) {
      const thuStart = parseClockMinutes(thuSetting?.start_time);
      if (thuStart && thuStart > 0 && thuStart < dutyInfo.end) expected = thuStart;
    }
    return Math.max(0, checkIn - expected);
  };

  const totalLateMins = useMemo(() => records.reduce((s, r) => s + lateMinutesFor(r), 0), [records, dutyInfo, thuSetting]);
  // Format a minute count as hours + minutes (e.g. 90 → "১ ঘণ্টা ৩০ মিনিট" / "1h 30m")
  const fmtDuration = (mins: number) => {
    const m = Math.max(0, Math.round(mins || 0));
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (bn) {
      if (h > 0) return rem > 0 ? `${h} ঘণ্টা ${rem} মিনিট` : `${h} ঘণ্টা`;
      return `${rem} মিনিট`;
    }
    if (h > 0) return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
    return `${rem}m`;
  };
  const unmarked = days.filter(d => !byDate[format(d, 'yyyy-MM-dd')]).length;
  const marked = days.length - unmarked;
  const attendanceRate = marked > 0 ? Math.round(((counts.present + counts.late * 0.5 + counts.half_day * 0.5) / marked) * 100) : 0;
  const isCurrentMonth = isSameDay(startOfMonth(cursor), startOfMonth(new Date()));

  const toBnDigits = (str: string | number) => String(str).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]);
  const monthMmYyyy = format(cursor, 'MM-yyyy');
  const monthName = bn ? format(cursor, 'MMMM yyyy', { locale: bnLocale }) : format(cursor, 'MMMM yyyy');
  const monthLabel = bn ? `${toBnDigits(monthMmYyyy)} (${monthName})` : `${monthMmYyyy} (${monthName})`;
  const leadingBlanks = getDay(monthStart);

  const setStatus = async (
    dateKey: string,
    newStatus: string | null,
    extra?: { check_in_time?: string | null; check_out_time?: string | null; leave_type?: string | null; leave_reason?: string | null }
  ) => {
    if (!staff?.id) return;
    const existing = byDate[dateKey];
    const prevRecords = records;

    // ── Optimistic UI: paint the change instantly, save in the background ──
    const clearTimes =
      !!existing &&
      newStatus !== existing.status &&
      !(extra && 'check_in_time' in extra) &&
      !(extra && 'check_out_time' in extra);

    if (newStatus === null) {
      if (!existing) { setOpenKey(null); return; }
      setRecords(rs => rs.filter(r => r.attendance_date !== dateKey));
    } else if (existing) {
      setRecords(rs => rs.map(r => r.attendance_date === dateKey ? {
        ...r,
        status: newStatus,
        ...(extra && 'check_in_time' in extra ? { check_in_time: extra.check_in_time } : clearTimes ? { check_in_time: null } : {}),
        ...(extra && 'check_out_time' in extra ? { check_out_time: extra.check_out_time } : clearTimes ? { check_out_time: null } : {}),
        ...(extra && 'leave_type' in extra ? { leave_type: extra.leave_type } : {}),
        ...(extra && 'leave_reason' in extra ? { leave_reason: extra.leave_reason } : {}),
      } : r));
    } else {
      setRecords(rs => [...rs, {
        id: `temp-${dateKey}`,
        attendance_date: dateKey,
        entity_type: 'staff',
        entity_id: staff.id,
        shift: shift || 'full_day',
        status: newStatus,
        check_in_time: extra?.check_in_time ?? null,
        check_out_time: extra?.check_out_time ?? null,
        leave_type: extra?.leave_type ?? null,
        leave_reason: extra?.leave_reason ?? null,
      }]);
    }
    // Close the picker right away (was waiting for the round-trip before)
    if (extra || (newStatus !== 'late' && newStatus !== 'leave')) setOpenKey(null);

    setSavingKey(dateKey);
    try {
      if (newStatus === null) {
        const { error } = await supabase.from('attendance_records').delete().eq('id', existing.id);
        if (error) throw error;
        toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Cleared');
      } else if (existing) {
        const payload: any = { status: newStatus, updated_at: new Date().toISOString() };
        if (extra && 'check_in_time' in extra) payload.check_in_time = extra.check_in_time;
        if (extra && 'check_out_time' in extra) payload.check_out_time = extra.check_out_time;
        if (extra && 'leave_type' in extra) payload.leave_type = extra.leave_type;
        if (extra && 'leave_reason' in extra) payload.leave_reason = extra.leave_reason;
        // When switching away from leave, clear leave fields
        if (newStatus !== 'leave' && existing.status === 'leave' && !('leave_type' in (extra || {}))) {
          payload.leave_type = null;
          payload.leave_reason = null;
        }
        // Status changed via a plain pick (no new times supplied): clear stale
        // check-in/out so e.g. late→present doesn't keep the old late clock time
        // and get auto-counted as late again on the salary page.
        if (clearTimes) {
          payload.check_in_time = null;
          payload.check_out_time = null;
        }
        const { error } = await supabase.from('attendance_records').update(payload).eq('id', existing.id);
        if (error) throw error;
        toast.success(bn ? 'আপডেট হয়েছে' : 'Updated');
      } else {
        const { data, error } = await supabase.from('attendance_records').insert({
          attendance_date: dateKey,
          entity_type: 'staff',
          entity_id: staff.id,
          shift: shift || 'full_day',
          status: newStatus,
          check_in_time: extra?.check_in_time ?? null,
          check_out_time: extra?.check_out_time ?? null,
          leave_type: extra?.leave_type ?? null,
          leave_reason: extra?.leave_reason ?? null,
        }).select().single();
        if (error) throw error;
        // Swap the temp row for the real one (real id needed for later edits)
        if (data) setRecords(rs => rs.map(r => r.attendance_date === dateKey ? data : r));
        toast.success(bn ? 'সেভ হয়েছে' : 'Saved');
      }
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['salary-attendance'] });
      qc.invalidateQueries({ queryKey: ['salary-records'] });
      qc.invalidateQueries({ queryKey: ['staff-duty-records'] });
      qc.invalidateQueries({ queryKey: ['staff-att-records'] });
      qc.invalidateQueries({ queryKey: ['my-attendance'] });
    } catch (e: any) {
      setRecords(prevRecords); // rollback
      toast.error(e?.message || (bn ? 'সেভ করতে সমস্যা' : 'Failed to save'));
      refetch();
    } finally {
      setSavingKey(null);
    }
  };

  const generateIndividualHtml = () => {
    const institutionName = instInfo?.name || 'মাদরাসা / প্রতিষ্ঠান';
    const staffName = bn ? (staff?.name_bn || staff?.name_en) : (staff?.name_en || staff?.name_bn);
    const title = `${bn ? 'মাসিক স্টাফ হাজিরা বিবরণী' : 'Staff Monthly Attendance Report'} — ${monthName}`;
    const dutyStartFormatted = `${String(Math.floor(dutyInfo.start / 60)).padStart(2, '0')}:${String(dutyInfo.start % 60).padStart(2, '0')}`;
    const dutyEndFormatted = `${String(Math.floor(dutyInfo.end / 60)).padStart(2, '0')}:${String(dutyInfo.end % 60).padStart(2, '0')}`;

    let rowsHtml = '';
    days.forEach((d, idx) => {
      const key = format(d, 'yyyy-MM-dd');
      const rec = byDate[key];
      const weekday = format(d, 'EEEE', { locale: bn ? bnLocale : undefined });
      const isFriday = getDay(d) === 5;
      const isOffDuty = dutyAllowedDates ? !dutyAllowedDates.has(key) : false;

      let statusBadge = '<span style="color:#94a3b8;">অচিহ্নিত</span>';
      let bg = isFriday ? '#fff1f2' : (idx % 2 === 0 ? '#f8fafc' : '#ffffff');
      const checkIn = rec?.check_in_time ? String(rec.check_in_time).slice(0, 5) : '—';
      const checkOut = rec?.check_out_time ? String(rec.check_out_time).slice(0, 5) : '—';
      const lateM = rec ? lateMinutesFor(rec) : 0;
      const lateStr = lateM > 0 ? `<span style="color:#d97706;font-weight:600;">+${lateM} মি.</span>` : '—';
      const remarks = rec?.leave_reason || rec?.leave_type || (isFriday ? 'সাপ্তাহিক ছুটি' : (isOffDuty ? 'ডিউটি অফ' : '—'));

      if (rec?.status) {
        const m = STATUS_META[rec.status];
        if (m) {
          statusBadge = `<span style="font-weight:bold;color:${rec.status === 'present' ? '#16a34a' : rec.status === 'late' ? '#d97706' : rec.status === 'absent' ? '#dc2626' : '#2563eb'};">${bn ? m.bnLabel : m.enLabel}</span>`;
        }
      }

      rowsHtml += `
        <tr style="background:${bg};">
          <td style="border:1px solid #cbd5e1;padding:4px;text-align:center;font-size:10px;">${bn ? toBnDigits(idx + 1) : idx + 1}</td>
          <td style="border:1px solid #cbd5e1;padding:4px;text-align:center;font-size:10.5px;font-weight:600;">${bn ? toBnDigits(format(d, 'dd-MM-yyyy')) : format(d, 'dd-MM-yyyy')}</td>
          <td style="border:1px solid #cbd5e1;padding:4px;text-align:center;font-size:10px;color:${isFriday ? '#dc2626' : '#334155'};">${weekday}</td>
          <td style="border:1px solid #cbd5e1;padding:4px;text-align:center;font-size:10px;font-family:monospace;">${checkIn}</td>
          <td style="border:1px solid #cbd5e1;padding:4px;text-align:center;font-size:10px;font-family:monospace;">${checkOut}</td>
          <td style="border:1px solid #cbd5e1;padding:4px;text-align:center;font-size:10px;">${lateStr}</td>
          <td style="border:1px solid #cbd5e1;padding:4px;text-align:center;font-size:10px;">${statusBadge}</td>
          <td style="border:1px solid #cbd5e1;padding:4px 6px;text-align:left;font-size:9.5px;color:#475569;">${remarks}</td>
        </tr>
      `;
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          * { margin:0; padding:0; box-sizing:border-box; }
          @page { size: A4 portrait; margin: 6mm 8mm; }
          body { font-family: 'Hind Siliguri', 'Noto Sans Bengali', sans-serif; margin: 0; padding: 12px; color: #1e293b; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #059669; padding-bottom: 6px; margin-bottom: 8px; }
          .header h1 { font-size: 19px; color: #0f172a; margin: 0; }
          .header h2 { font-size: 13.5px; color: #059669; margin: 2px 0 0 0; }
          .staff-card { display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 8px; font-size: 11px; }
          .stats-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; margin-bottom: 8px; text-align: center; }
          .stat-box { border: 1px solid #e2e8f0; border-radius: 6px; padding: 4px; background: #fdfdfe; }
          .stat-val { font-size: 13px; font-weight: bold; }
          .stat-lbl { font-size: 9.5px; color: #64748b; }
          table { width: 100%; border-collapse: collapse; margin-top: 4px; }
          th { border: 1px solid #94a3b8; padding: 5px 4px; background: #f1f5f9; font-size: 10.5px; }
          .footer-signs { display: flex; justify-content: space-between; margin-top: 36px; padding: 0 30px; }
          .sign-box { text-align: center; border-top: 1px dashed #64748b; padding-top: 4px; width: 140px; font-size: 10.5px; font-weight: 600; color: #334155; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${institutionName}</h1>
          <h2>${title}</h2>
        </div>
        <div class="staff-card">
          <div>
            <div><strong>নাম:</strong> ${staffName}</div>
            <div><strong>পদবী:</strong> ${staff?.designation || '-'}</div>
          </div>
          <div>
            <div><strong>শিফট:</strong> ${shift ? shift.replace('_', ' ') : 'ফুল টাইম ডিউটি'}</div>
            <div><strong>ডিউটি সময়:</strong> ${dutyStartFormatted} - ${dutyEndFormatted}</div>
          </div>
          <div>
            <div><strong>উপস্থিতির হার:</strong> <strong style="color:#059669;font-size:12px;">${attendanceRate}%</strong></div>
            <div><strong>মোট বিলম্ব:</strong> ${fmtDuration(totalLateMins)}</div>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-box"><div class="stat-val" style="color:#16a34a;">${counts.present}</div><div class="stat-lbl">উপস্থিত</div></div>
          <div class="stat-box"><div class="stat-val" style="color:#d97706;">${counts.late}</div><div class="stat-lbl">বিলম্ব</div></div>
          <div class="stat-box"><div class="stat-val" style="color:#ea580c;">${counts.half_day}</div><div class="stat-lbl">অর্ধদিন</div></div>
          <div class="stat-box"><div class="stat-val" style="color:#2563eb;">${counts.leave}</div><div class="stat-lbl">ছুটি</div></div>
          <div class="stat-box"><div class="stat-val" style="color:#dc2626;">${counts.absent}</div><div class="stat-lbl">অনুপস্থিত</div></div>
          <div class="stat-box"><div class="stat-val" style="color:#64748b;">${unmarked}</div><div class="stat-lbl">অচিহ্নিত</div></div>
          <div class="stat-box"><div class="stat-val" style="color:#0f172a;">${days.length}</div><div class="stat-lbl">মোট দিন</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:30px;">#</th>
              <th style="width:75px;">তারিখ</th>
              <th style="width:65px;">বার</th>
              <th style="width:65px;">চেক-ইন</th>
              <th style="width:65px;">চেক-আউট</th>
              <th style="width:65px;">বিলম্ব</th>
              <th style="width:75px;">স্ট্যাটাস</th>
              <th>ছুটির কারণ / মন্তব্য</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <div class="footer-signs">
          <div class="sign-box">${bn ? 'সংশ্লিষ্ট স্টাফ' : 'Staff Signature'}</div>
          <div class="sign-box">${bn ? 'বিভাগীয় প্রধান / ইন-চার্জ' : 'In-charge Signature'}</div>
          <div class="sign-box">${bn ? 'মুহতামিম / অধ্যক্ষ' : 'Principal'}</div>
        </div>
      </body>
      </html>
    `;
  };

  const handlePrintIndividual = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error(bn ? 'পপআপ ব্লক হয়েছে, অনুমতি দিন' : 'Popup blocked');
      return;
    }
    const html = generateIndividualHtml();
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 600);
  };

  const handleDownloadPdfIndividual = async () => {
    try {
      setIsPdfGenerating(true);
      toast.info(bn ? 'পিডিএফ প্রস্তুত হচ্ছে...' : 'Generating PDF...');
      const html = generateIndividualHtml();
      const staffName = (staff?.name_en || staff?.name_bn || 'staff').replace(/\s+/g, '_');
      await downloadSheetAsPdf(html, `Attendance_${staffName}_${monthMmYyyy}.pdf`, null, 'portrait', 'download');
      toast.success(bn ? 'পিডিএফ ডাউনলোড সম্পন্ন' : 'PDF downloaded');
    } catch (e: any) {
      console.error(e);
      toast.error(bn ? 'পিডিএফ ডাউনলোডে ত্রুটি' : 'Failed to download PDF');
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl p-0 border border-border bg-card shadow-2xl">
        {/* Hero header with gradient */}
        <div className="relative overflow-hidden rounded-t-2xl border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-cyan-500/10 dark:from-emerald-500/15 dark:via-teal-500/10 dark:to-cyan-500/15" />
          <DialogHeader className="relative px-4 py-3">
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl overflow-hidden ring-2 ring-white/60 dark:ring-white/20 shadow bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 flex items-center justify-center shrink-0">
                {staff?.photo_url
                  ? <img src={staff.photo_url} alt="" className="h-full w-full object-cover" />
                  : <CalendarIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold tracking-tight truncate">
                  {bn ? (staff?.name_bn || staff?.name_en) : (staff?.name_en || staff?.name_bn)}
                </div>
                <div className="text-[10px] text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                  {staff?.designation && <span>{staff.designation}</span>}
                  {shift && <><span className="opacity-40">•</span><span className="capitalize">{shift.replace('_', ' ')}</span></>}
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-center px-2.5 py-1 rounded-xl bg-white/60 dark:bg-white/5 backdrop-blur border border-white/50 dark:border-white/10 shadow-sm">
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">{bn ? 'উপস্থিতি' : 'Attend'}</div>
                <div className={`text-lg font-extrabold bg-gradient-to-br ${attendanceRate >= 90 ? 'from-emerald-600 to-teal-600' : attendanceRate >= 75 ? 'from-amber-500 to-orange-500' : 'from-rose-500 to-pink-500'} bg-clip-text text-transparent leading-tight`}>
                  {attendanceRate}<span className="text-[11px]">%</span>
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Month nav with chips & Print/PDF actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/40 bg-gradient-to-r from-background/80 via-muted/20 to-background/80 backdrop-blur p-2 shadow-sm">
            <div className="flex items-center gap-1.5 min-w-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600" onClick={() => setCursor(c => subMonths(c, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 min-w-0">
                <CalendarIcon className="h-4 w-4 text-emerald-600 shrink-0" />
                <div className="text-sm font-semibold tracking-tight truncate">{monthLabel}</div>
                {!isCurrentMonth && (
                  <button
                    onClick={() => setCursor(new Date())}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 transition font-medium"
                  >
                    {bn ? 'বর্তমান মাসে যান' : 'Today'}
                  </button>
                )}
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600" onClick={() => setCursor(c => addMonths(c, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 rounded-xl px-2.5 bg-background hover:bg-muted font-medium"
                onClick={handlePrintIndividual}
              >
                <Printer className="h-3.5 w-3.5 text-blue-600" />
                <span>{bn ? 'প্রিন্ট' : 'Print'}</span>
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs gap-1 rounded-xl px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                onClick={handleDownloadPdfIndividual}
                disabled={isPdfGenerating}
              >
                {isPdfGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span>{bn ? 'PDF ডাউনলোড' : 'PDF'}</span>
              </Button>
            </div>
          </div>

          {/* Stat tiles - compact */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {Object.keys(STATUS_META).map(k => {
              const m = STATUS_META[k];
              const Icon = m.icon;
              const value = counts[k];
              const pct = marked > 0 ? Math.round((value / marked) * 100) : 0;
              return (
                <div
                  key={k}
                  className={`group relative overflow-hidden rounded-xl ${m.bg} p-2 border border-border/30 transition-all hover:-translate-y-[2px] hover:shadow-md cursor-default`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className={`h-6 w-6 rounded-lg bg-gradient-to-br ${m.gradient} flex items-center justify-center shadow-sm`}>
                      <Icon className="h-3 w-3 text-white" />
                    </div>
                    <span className="text-[9px] font-medium text-muted-foreground tabular-nums">{pct}%</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium truncate">{bn ? m.bnLabel : m.enLabel}</div>
                  <div className={`text-base font-extrabold ${m.color} tabular-nums leading-tight`}>{value}</div>
                </div>
              );
            })}
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 border border-border/30">
              <span className="text-muted-foreground">{bn ? 'মোট দিন' : 'Total'}</span>
              <b className="text-foreground tabular-nums">{days.length}</b>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/40 border border-border/30">
              <span className="text-muted-foreground">{bn ? 'অচিহ্নিত' : 'Unmarked'}</span>
              <b className="text-foreground tabular-nums">{unmarked}</b>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
              <Clock className="h-3 w-3 text-amber-600" />
              <span className="text-muted-foreground">{bn ? 'বিলম্ব' : 'Late'}</span>
              <b className="text-amber-700 dark:text-amber-400 tabular-nums">{fmtDuration(totalLateMins)}</b>
            </div>
            <span className="ml-auto text-[11px] italic text-muted-foreground hidden sm:inline">
              {bn ? 'যেকোনো দিনে ক্লিক করে স্ট্যাটাস বদলান' : 'Click any day to change status'}
            </span>
          </div>

          {/* Calendar grid - premium */}
          <div className="rounded-2xl border border-border/40 bg-gradient-to-b from-background/90 to-muted/10 backdrop-blur-sm p-2.5 shadow-sm">
            <div className="grid grid-cols-7 gap-1.5 mb-2">
              {(bn
                ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
                : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              ).map((d, i) => (
                <div
                  key={d}
                  className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider text-center py-1.5 ${
                    i === 5 ? 'text-emerald-600/80' : 'text-muted-foreground'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
              {days.map(d => {
                const key = format(d, 'yyyy-MM-dd');
                const rec = byDate[key];
                const meta = rec ? STATUS_META[rec.status] : null;
                const Icon = meta?.icon;
                 const isToday = isSameDay(d, new Date());
                 const isFuture = d > new Date();
                 const isFriday = getDay(d) === 5;
                 const isSaving = savingKey === key;
                 const isOffDuty = dutyAllowedDates ? !dutyAllowedDates.has(key) : false;
                 const dayNum = format(d, 'd');
                 return (
                  <button
                    key={key}
                    type="button"
                    disabled={isFuture || isSaving || isOffDuty}
                    onClick={() => setActiveDateKey(key)}
                    className={`group relative aspect-square rounded-2xl border p-1.5 flex flex-col items-center justify-center text-center transition-all duration-200 hover:-translate-y-[3px] hover:shadow-lg hover:shadow-black/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none overflow-hidden ${
                      meta
                        ? `${meta.bg} border-transparent shadow-sm`
                        : isFriday
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/40 dark:border-emerald-800/30 border-dashed'
                          : 'bg-muted/20 border-dashed border-border/30 hover:bg-muted/40'
                    } ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''} ${isSaving ? 'animate-pulse' : ''}`}
                    title={isOffDuty ? (bn ? 'এই বারে ডিউটি নেই' : 'No duty on this day') : meta ? (bn ? meta.bnLabel : meta.enLabel) : (bn ? 'অচিহ্নিত' : 'Unmarked')}
                  >
                    {/* Status dot indicator (top-right) */}
                    {meta && (
                      <span className={`absolute top-1 right-1 h-1.5 w-1.5 rounded-full ${meta.dot} shadow-sm`} />
                    )}
                    {isToday && !meta && (
                      <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    )}
                    <div className={`text-[12px] sm:text-sm font-bold tabular-nums ${meta ? meta.color : isToday ? 'text-primary' : 'text-foreground/70'}`}>
                      {dayNum}
                    </div>
                    {Icon && <Icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 mt-0.5 ${meta!.color}`} />}
                    {rec && lateMinutesFor(rec) > 0 ? (
                      <div className="text-[9px] text-amber-700 dark:text-amber-400 font-bold leading-none mt-0.5 tabular-nums">
                        +{fmtDuration(lateMinutesFor(rec))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground py-2">
              <div className="h-3 w-3 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
              <span>{bn ? 'লোড হচ্ছে...' : 'Loading...'}</span>
            </div>
          )}
        </div>

        {/* Centered day-status picker: always in the middle of the screen on desktop & mobile */}
        <Dialog open={!!activeDateKey} onOpenChange={(o) => { if (!o) setActiveDateKey(null); }}>
          <DialogContent
            className="w-[92vw] max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl p-0 border border-border bg-card shadow-2xl"
            onInteractOutside={(e) => {
              const t = e.target as HTMLElement | null;
              if (t && t.closest('[data-radix-popper-content-wrapper]')) {
                e.preventDefault();
              }
            }}
          >
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/30">
                <div className="text-sm font-semibold">
                  {activeDate ? (bn ? toBnDigits(format(activeDate, 'dd-MM-yyyy')) : format(activeDate, 'dd-MM-yyyy')) : activeDateKey}
                </div>
                {activeIsToday && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">{bn ? 'আজ' : 'Today'}</span>}
              </div>
              <div className="grid grid-cols-1 gap-0.5">
                {Object.entries(STATUS_META).map(([k, m]) => {
                  const I = m.icon;
                  const active = activeRec?.status === k;
                  return (
                    <button
                      key={k}
                      onClick={() => activeDateKey && setStatus(activeDateKey, k)}
                      disabled={savingKey === activeDateKey}
                      className={`flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm text-left transition-all ${
                        active
                          ? `${m.bg} ${m.color} font-semibold shadow-sm`
                          : 'hover:bg-muted/60 hover:translate-x-0.5'
                      }`}
                    >
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${m.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                        <I className="h-4 w-4 text-white" />
                      </div>
                      <span className="flex-1">{bn ? m.bnLabel : m.enLabel}</span>
                      {active && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>
              {activeRec?.status === 'half_day' && activeDateKey && (
                <div className="mt-1 p-2.5 rounded-xl border border-orange-300/40 bg-orange-50/60 dark:bg-orange-950/20 text-center space-y-1">
                  <div className="text-xs font-semibold text-orange-700 dark:text-orange-400 flex items-center justify-center gap-1.5">
                    <Lock className="h-3.5 w-3.5" />
                    {bn ? 'অর্ধদিনে সময় পরিবর্তন লক করা আছে' : 'Time editing locked for half day'}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {bn ? 'অর্ধদিনের জন্য নির্ধারিত ৫০% বেতন প্রযোজ্য (সময় বা মিনিট কর্তন হবে না)' : '50% fixed daily salary applies (no minute deduction)'}
                  </p>
                </div>
              )}
              {(activeRec?.status === 'present' || activeRec?.status === 'late') && activeDateKey && (
                <LateTimeEditor
                  bn={bn}
                  status={activeRec.status}
                  initialIn={activeRec?.check_in_time || ''}
                  initialOut={activeRec?.check_out_time || ''}
                  saving={savingKey === activeDateKey}
                  onSave={(ci, co) => setStatus(activeDateKey, activeRec.status, { check_in_time: ci || null, check_out_time: co || null })}
                />
              )}
              {activeRec?.status === 'leave' && activeDateKey && (
                <LeaveEditor
                  bn={bn}
                  initialType={activeRec?.leave_type || ''}
                  initialReason={activeRec?.leave_reason || ''}
                  saving={savingKey === activeDateKey}
                  onSave={(lt, lr) => activeDateKey && setStatus(activeDateKey, 'leave', { leave_type: lt || null, leave_reason: lr || null })}
                />
              )}
              {activeRec?.status === 'absent' && activeDateKey && (
                <AbsentReasonEditor
                  bn={bn}
                  initialReason={activeRec?.leave_reason || ''}
                  saving={savingKey === activeDateKey}
                  onSave={(r) => activeDateKey && setStatus(activeDateKey, 'absent', { leave_reason: r || null })}
                />
              )}
              {activeRec && activeDateKey && (
                <button
                  onClick={() => setStatus(activeDateKey, null)}
                  disabled={savingKey === activeDateKey}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 mt-1 border-t border-border/30 pt-2 w-full"
                >
                  <Trash2 className="h-4 w-4" />
                  {bn ? 'মুছুন' : 'Clear'}
                </button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

function LateTimeEditor({ bn, status, initialIn, initialOut, saving, onSave }: {
  bn: boolean;
  status?: string;
  initialIn: string;
  initialOut: string;
  saving: boolean;
  onSave: (checkIn: string, checkOut: string) => void;
}) {
  const [ci, setCi] = useState(initialIn || '');
  const [co, setCo] = useState(initialOut || '');
  useEffect(() => { setCi(initialIn || ''); setCo(initialOut || ''); }, [initialIn, initialOut]);
  const titleBn = status === 'present' ? 'উপস্থিতি — সময়' : status === 'half_day' ? 'অর্ধদিন — সময়' : 'বিলম্ব উপস্থিতি — সময়';
  const titleEn = status === 'present' ? 'Attendance — time' : status === 'half_day' ? 'Half day — time' : 'Late attendance — time';
  return (
    <div className="mt-1 p-2.5 rounded-xl border border-amber-300/40 bg-amber-50/60 dark:bg-amber-950/20 space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
        <Clock className="h-3 w-3" /> {bn ? titleBn : titleEn}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">{bn ? 'চেক-ইন' : 'Check-in'}</div>
          <TimePicker value={ci} onChange={setCi} placeholder={bn ? 'সময়' : 'Time'} />
        </div>
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">{bn ? 'চেক-আউট' : 'Check-out'}</div>
          <TimePicker value={co} onChange={setCo} placeholder={bn ? 'সময়' : 'Time'} />
        </div>
      </div>
      <Button
        size="sm"
        disabled={saving || !ci}
        onClick={() => onSave(ci, co)}
        className="w-full h-8 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
      >
        <Save className="h-3 w-3 mr-1" /> {bn ? 'সময় সেভ করুন' : 'Save time'}
      </Button>
    </div>
  );
}

function LeaveEditor({ bn, initialType, initialReason, saving, onSave }: {
  bn: boolean;
  initialType: string;
  initialReason: string;
  saving: boolean;
  onSave: (leaveType: string, leaveReason: string) => void;
}) {
  const [lt, setLt] = useState(initialType || '');
  const [lr, setLr] = useState(initialReason || '');
  useEffect(() => { setLt(initialType || ''); setLr(initialReason || ''); }, [initialType, initialReason]);
  const types = [
    { v: 'weekly',  bn: 'সাপ্তাহিক', en: 'Weekly' },
    { v: 'monthly', bn: 'মাসিক',     en: 'Monthly' },
    { v: 'casual',  bn: 'নৈমিত্তিক', en: 'Casual' },
    { v: 'sick',    bn: 'অসুস্থতা',   en: 'Sick' },
    { v: 'other',   bn: 'অন্যান্য',   en: 'Other' },
  ];
  // Reason box is always visible so admins can write the cause right away;
  // it is only mandatory for the 'other' type.
  const showReason = true;
  return (
    <div className="mt-1 p-2.5 rounded-xl border border-blue-300/40 bg-blue-50/60 dark:bg-blue-950/20 space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400 flex items-center gap-1">
        <CalendarOff className="h-3 w-3" /> {bn ? 'ছুটির ধরন ও কারণ' : 'Leave type & reason'}
      </div>
      <div className="flex flex-wrap gap-1">
        {types.map(t => {
          const active = lt === t.v;
          return (
            <button
              key={t.v}
              type="button"
              onClick={() => setLt(t.v)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition ${
                active
                  ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                  : 'bg-background border-border/50 text-foreground/80 hover:border-blue-400/60 hover:text-blue-700'
              }`}
            >
              {bn ? t.bn : t.en}
            </button>
          );
        })}
      </div>
      {showReason && (
        <div>
          <div className="text-[10px] text-muted-foreground mb-1">{bn ? 'কারণ লিখুন' : 'Type reason'}</div>
          <textarea
            value={lr}
            onChange={(e) => setLr(e.target.value)}
            rows={2}
            placeholder={bn ? 'যেমন: পারিবারিক কাজে...' : 'e.g. Family matter...'}
            className="w-full text-xs font-medium text-foreground rounded-lg border border-border bg-card p-2 outline-none focus:border-blue-400 resize-none"
          />
        </div>
      )}
      <Button
        size="sm"
        disabled={saving || !lt || (lt === 'other' && !lr.trim())}
        onClick={() => onSave(lt, lr.trim())}
        className="w-full h-8 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
      >
        <Save className="h-3 w-3 mr-1" /> {bn ? 'সেভ করুন' : 'Save'}
      </Button>
    </div>
  );
}


function AbsentReasonEditor({ bn, initialReason, saving, onSave }: {
  bn: boolean;
  initialReason: string;
  saving: boolean;
  onSave: (reason: string) => void;
}) {
  const [r, setR] = useState(initialReason || '');
  useEffect(() => { setR(initialReason || ''); }, [initialReason]);
  return (
    <div className="mt-1 p-2.5 rounded-xl border border-rose-300/40 bg-rose-50/60 dark:bg-rose-950/20 space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
        <XCircle className="h-3 w-3" /> {bn ? 'অনুপস্থিতির কারণ (ঐচ্ছিক)' : 'Absence reason (optional)'}
      </div>
      <textarea
        value={r}
        onChange={(e) => setR(e.target.value)}
        rows={2}
        placeholder={bn ? 'যেমন: জরুরি কাজে আসতে পারেননি...' : 'e.g. Could not come due to urgent work...'}
        className="w-full text-xs font-medium text-foreground rounded-lg border border-border bg-card p-2 outline-none focus:border-rose-400 resize-none"
      />
      <Button
        size="sm"
        disabled={saving}
        onClick={() => onSave(r.trim())}
        className="w-full h-8 rounded-xl text-xs font-semibold bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white"
      >
        <Save className="h-3 w-3 mr-1" /> {bn ? 'সেভ করুন' : 'Save'}
      </Button>
    </div>
  );
}
