import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, AlertCircle, CalendarOff, Stethoscope, ShieldCheck, Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, getDay } from 'date-fns';
import { bn as bnLocale } from 'date-fns/locale';

const STATUS_META: Record<string, { bnLabel: string; enLabel: string; icon: any; color: string; bg: string; ring: string }> = {
  present:  { bnLabel: 'উপস্থিত',        enLabel: 'Present',  icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-100 dark:bg-emerald-900/30', ring: 'ring-emerald-400/40' },
  absent:   { bnLabel: 'অনুপস্থিত',      enLabel: 'Absent',   icon: XCircle,      color: 'text-rose-600',    bg: 'bg-rose-100 dark:bg-rose-900/30',       ring: 'ring-rose-400/40' },
  late:     { bnLabel: 'বিলম্ব',          enLabel: 'Late',     icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-100 dark:bg-amber-900/30',     ring: 'ring-amber-400/40' },
  half_day: { bnLabel: 'অর্ধদিন',         enLabel: 'Half Day', icon: AlertCircle,  color: 'text-orange-600',  bg: 'bg-orange-100 dark:bg-orange-900/30',   ring: 'ring-orange-400/40' },
  leave:    { bnLabel: 'ছুটি',            enLabel: 'Leave',    icon: CalendarOff,  color: 'text-blue-600',    bg: 'bg-blue-100 dark:bg-blue-900/30',       ring: 'ring-blue-400/40' },
  excused:  { bnLabel: 'অনুমতিপ্রাপ্ত',  enLabel: 'Excused',  icon: ShieldCheck,  color: 'text-indigo-600',  bg: 'bg-indigo-100 dark:bg-indigo-900/30',   ring: 'ring-indigo-400/40' },
  medical:  { bnLabel: 'চিকিৎসাজনিত',    enLabel: 'Medical',  icon: Stethoscope,  color: 'text-purple-600',  bg: 'bg-purple-100 dark:bg-purple-900/30',   ring: 'ring-purple-400/40' },
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staff: { id: string; name_bn?: string; name_en?: string; designation?: string; photo_url?: string } | null;
  shift?: string;
}

export default function StaffMonthlyAttendanceDialog({ open, onOpenChange, staff, shift }: Props) {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [cursor, setCursor] = useState<Date>(new Date());
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (open) setCursor(new Date()); }, [open, staff?.id]);

  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);
  const days = useMemo(() => eachDayOfInterval({ start: monthStart, end: monthEnd }), [monthStart, monthEnd]);

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
    for (const r of records) m[r.date] = r;
    return m;
  }, [records]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { present: 0, absent: 0, late: 0, half_day: 0, leave: 0, excused: 0, medical: 0 };
    for (const r of records) if (c[r.status] !== undefined) c[r.status] += 1;
    return c;
  }, [records]);

  const totalLateMins = useMemo(() => records.reduce((s, r) => s + (Number(r.late_minutes) || 0), 0), [records]);
  const unmarked = days.filter(d => !byDate[format(d, 'yyyy-MM-dd')]).length;

  const monthLabel = bn
    ? format(cursor, 'MMMM yyyy', { locale: bnLocale })
    : format(cursor, 'MMMM yyyy');

  // Build calendar grid (Sunday start)
  const leadingBlanks = getDay(monthStart);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-[38px] p-0">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-emerald-400/40 bg-muted/50 flex items-center justify-center shrink-0">
              {staff?.photo_url
                ? <img src={staff.photo_url} alt="" className="h-full w-full object-cover" />
                : <CalendarIcon className="h-5 w-5 text-muted-foreground" />}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold truncate">
                {bn ? (staff?.name_bn || staff?.name_en) : (staff?.name_en || staff?.name_bn)}
              </div>
              <div className="text-xs text-muted-foreground truncate">{staff?.designation || ''}</div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-5">
          {/* Month nav */}
          <div className="flex items-center justify-between rounded-2xl border border-border/30 bg-background/60 backdrop-blur px-3 py-2">
            <Button variant="ghost" size="icon" onClick={() => setCursor(c => subMonths(c, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold">{monthLabel}</div>
            <Button variant="ghost" size="icon" onClick={() => setCursor(c => addMonths(c, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {Object.keys(STATUS_META).map(k => {
              const m = STATUS_META[k];
              const Icon = m.icon;
              return (
                <div key={k} className={`rounded-2xl ${m.bg} p-3 flex flex-col items-start gap-1 border border-border/20`}>
                  <Icon className={`h-4 w-4 ${m.color}`} />
                  <div className="text-[11px] text-muted-foreground">{bn ? m.bnLabel : m.enLabel}</div>
                  <div className={`text-lg font-bold ${m.color}`}>{counts[k]}</div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{bn ? 'মোট দিন' : 'Total days'}: <b className="text-foreground">{days.length}</b></span>
            <span>{bn ? 'অচিহ্নিত' : 'Unmarked'}: <b className="text-foreground">{unmarked}</b></span>
            <span>{bn ? 'মোট বিলম্ব' : 'Total late'}: <b className="text-foreground">{totalLateMins} {bn ? 'মিনিট' : 'min'}</b></span>
          </div>

          {/* Calendar grid */}
          <div className="rounded-2xl border border-border/30 bg-background/60 backdrop-blur p-3">
            <div className="grid grid-cols-7 gap-1 mb-2">
              {(bn
                ? ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি']
                : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
              ).map(d => (
                <div key={d} className="text-[10px] sm:text-xs font-medium text-muted-foreground text-center py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: leadingBlanks }).map((_, i) => <div key={`b${i}`} />)}
              {days.map(d => {
                const key = format(d, 'yyyy-MM-dd');
                const rec = byDate[key];
                const meta = rec ? STATUS_META[rec.status] : null;
                const Icon = meta?.icon;
                const isToday = isSameDay(d, new Date());
                return (
                  <div
                    key={key}
                    className={`aspect-square rounded-xl border p-1 flex flex-col items-center justify-center text-center ${
                      meta ? `${meta.bg} border-transparent` : 'bg-muted/20 border-dashed border-border/30'
                    } ${isToday ? 'ring-2 ring-primary/50' : ''}`}
                    title={meta ? (bn ? meta.bnLabel : meta.enLabel) : (bn ? 'অচিহ্নিত' : 'Unmarked')}
                  >
                    <div className={`text-[11px] sm:text-xs font-semibold ${meta ? meta.color : 'text-muted-foreground'}`}>
                      {format(d, 'd')}
                    </div>
                    {Icon && <Icon className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${meta!.color}`} />}
                    {rec?.late_minutes ? (
                      <div className="text-[9px] text-amber-600 font-medium leading-none">{rec.late_minutes}m</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {loading && <div className="text-xs text-center text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
