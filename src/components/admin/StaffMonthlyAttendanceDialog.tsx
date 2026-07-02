import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, AlertCircle, CalendarOff, Stethoscope, ShieldCheck, Calendar as CalendarIcon, Trash2, Save } from 'lucide-react';
import { TimePicker } from '@/components/ui/time-picker';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDay } from 'date-fns';
import { bn as bnLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

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
  const bn = language === 'bn';
  const qc = useQueryClient();
  const [cursor, setCursor] = useState<Date>(new Date());
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

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
    setRecords((data as any[]) || []);
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
      if (!cancel) { setRecords((data as any[]) || []); setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [open, staff?.id, monthStart, monthEnd, shift]);

  const byDate = useMemo(() => {
    const m: Record<string, any> = {};
    for (const r of records) m[r.attendance_date] = r;
    return m;
  }, [records]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0, excused: 0, medical: 0 };
    for (const r of records) if (c[r.status] !== undefined) c[r.status] += 1;
    return c;
  }, [records]);

  const totalLateMins = useMemo(() => records.reduce((s, r) => s + (Number(r.late_minutes) || 0), 0), [records]);
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

  const monthLabel = bn ? format(cursor, 'MMMM yyyy', { locale: bnLocale }) : format(cursor, 'MMMM yyyy');
  const leadingBlanks = getDay(monthStart);

  const setStatus = async (
    dateKey: string,
    newStatus: string | null,
    extra?: { check_in_time?: string | null; check_out_time?: string | null; leave_type?: string | null; leave_reason?: string | null }
  ) => {
    if (!staff?.id) return;
    setSavingKey(dateKey);
    try {
      const existing = byDate[dateKey];
      if (newStatus === null) {
        if (!existing) { setOpenKey(null); return; }
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
        const { error } = await supabase.from('attendance_records').update(payload).eq('id', existing.id);
        if (error) throw error;
        toast.success(bn ? 'আপডেট হয়েছে' : 'Updated');
      } else {
        const { error } = await supabase.from('attendance_records').insert({
          attendance_date: dateKey,
          entity_type: 'staff',
          entity_id: staff.id,
          shift: shift || 'full_day',
          status: newStatus,
          check_in_time: extra?.check_in_time ?? null,
          check_out_time: extra?.check_out_time ?? null,
          leave_type: extra?.leave_type ?? null,
          leave_reason: extra?.leave_reason ?? null,
        });
        if (error) throw error;
        toast.success(bn ? 'সেভ হয়েছে' : 'Saved');
      }
      await refetch();
      qc.invalidateQueries({ queryKey: ['attendance'] });
      // Close after an explicit editor save (extra provided) or a simple status pick
      if (extra || (newStatus !== 'late' && newStatus !== 'leave')) setOpenKey(null);
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'সেভ করতে সমস্যা' : 'Failed to save'));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto rounded-[28px] p-0 border-border/40 bg-background/80 backdrop-blur-xl">
        {/* Hero header with gradient */}
        <div className="relative overflow-hidden rounded-t-[28px] border-b border-border/30">
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
          {/* Month nav with chips */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 bg-gradient-to-r from-background/80 via-muted/20 to-background/80 backdrop-blur px-2 py-2 shadow-sm">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600" onClick={() => setCursor(c => subMonths(c, 1))}>
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
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-emerald-500/10 hover:text-emerald-600" onClick={() => setCursor(c => addMonths(c, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
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
                const dayNum = format(d, 'd');
                return (
                  <Popover key={key} open={openKey === key} onOpenChange={(o) => setOpenKey(o ? key : null)}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        disabled={isFuture || isSaving}
                        className={`group relative aspect-square rounded-2xl border p-1.5 flex flex-col items-center justify-center text-center transition-all duration-200 hover:-translate-y-[3px] hover:shadow-lg hover:shadow-black/10 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:transform-none disabled:hover:shadow-none overflow-hidden ${
                          meta
                            ? `${meta.bg} border-transparent shadow-sm`
                            : isFriday
                              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/40 dark:border-emerald-800/30 border-dashed'
                              : 'bg-muted/20 border-dashed border-border/30 hover:bg-muted/40'
                        } ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''} ${isSaving ? 'animate-pulse' : ''}`}
                        title={meta ? (bn ? meta.bnLabel : meta.enLabel) : (bn ? 'অচিহ্নিত' : 'Unmarked')}
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
                        {rec?.late_minutes ? (
                          <div className="text-[9px] text-amber-700 dark:text-amber-400 font-bold leading-none mt-0.5 tabular-nums">
                            +{fmtDuration(rec.late_minutes)}
                          </div>
                        ) : null}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-72 p-2 rounded-2xl border-border/40 bg-background/95 backdrop-blur-xl shadow-xl max-h-[70vh] overflow-y-auto"
                      align="center"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                      onInteractOutside={(e) => {
                        const t = e.target as HTMLElement | null;
                        // Keep open when interaction is from a nested popover/select (e.g. TimePicker)
                        if (t && t.closest('[data-radix-popper-content-wrapper]')) {
                          e.preventDefault();
                        }
                      }}
                    >
                      <div className="flex items-center justify-between px-2 pb-2 mb-1 border-b border-border/30">
                        <div className="text-xs font-semibold">{format(d, 'dd/MM/yyyy')}</div>
                        {isToday && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">{bn ? 'আজ' : 'Today'}</span>}
                      </div>
                      <div className="grid grid-cols-1 gap-0.5 max-h-60 overflow-y-auto">
                        {Object.entries(STATUS_META).map(([k, m]) => {
                          const I = m.icon;
                          const active = rec?.status === k;
                          return (
                            <button
                              key={k}
                              onClick={() => setStatus(key, k)}
                              disabled={isSaving}
                              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-left transition-all ${
                                active
                                  ? `${m.bg} ${m.color} font-semibold shadow-sm`
                                  : 'hover:bg-muted/60 hover:translate-x-0.5'
                              }`}
                            >
                              <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${m.gradient} flex items-center justify-center shadow-sm shrink-0`}>
                                <I className="h-3.5 w-3.5 text-white" />
                              </div>
                              <span className="flex-1">{bn ? m.bnLabel : m.enLabel}</span>
                              {active && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                            </button>
                          );
                        })}
                      </div>
                      {/* Editors kept outside the scroll area so they're always visible */}
                      {(rec?.status === 'present' || rec?.status === 'late' || rec?.status === 'half_day') && (
                        <LateTimeEditor
                          bn={bn}
                          status={rec.status}
                          initialIn={rec?.check_in_time || ''}
                          initialOut={rec?.check_out_time || ''}
                          saving={isSaving}
                          onSave={(ci, co) => setStatus(key, rec.status, { check_in_time: ci || null, check_out_time: co || null })}
                        />
                      )}
                      {rec?.status === 'leave' && (
                        <LeaveEditor
                          bn={bn}
                          initialType={rec?.leave_type || ''}
                          initialReason={rec?.leave_reason || ''}
                          saving={isSaving}
                          onSave={(lt, lr) => setStatus(key, 'leave', { leave_type: lt || null, leave_reason: lr || null })}
                        />
                      )}
                      {rec && (
                        <button
                          onClick={() => setStatus(key, null)}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 mt-1 border-t border-border/30 pt-2 w-full"
                        >
                          <Trash2 className="h-4 w-4" />
                          {bn ? 'মুছুন' : 'Clear'}
                        </button>
                      )}
                    </PopoverContent>
                  </Popover>
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
  const showReason = lt === 'other' || lt === 'monthly' || lt === 'weekly';
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
            className="w-full text-xs rounded-lg border border-border/50 bg-background/80 p-2 outline-none focus:border-blue-400 resize-none"
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

