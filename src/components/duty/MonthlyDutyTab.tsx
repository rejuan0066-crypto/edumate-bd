import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarRange, Wand2, Eraser } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';

const WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

interface Shift {
  id: string;
  name_bn: string;
  start_time: string;
  end_time: string;
  is_active: boolean;
  sort_order: number;
}
interface StaffRow {
  id: string;
  name_bn: string;
  staff_id: string | null;
}
interface TemplateRow {
  staff_id: string;
  shift_id: string;
  weekday: number;
}
interface RosterRow {
  staff_id: string;
  shift_id: string;
  duty_date: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function MonthlyDutyTab({
  shifts,
  staff,
  templates,
}: {
  shifts: Shift[];
  staff: StaffRow[];
  templates: TemplateRow[];
}) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [search, setSearch] = useState('');
  const [autoApply, setAutoApply] = useState(
    () => (typeof localStorage !== 'undefined' ? localStorage.getItem('duty_monthly_auto_apply') !== 'off' : true),
  );
  const activeShifts = useMemo(() => shifts.filter((s) => s.is_active), [shifts]);
  const [shiftId, setShiftId] = useState<string>('');
  const currentShift = activeShifts.find((s) => s.id === (shiftId || activeShifts[0]?.id));

  const [y, m] = month.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = useMemo(
    () =>
      Array.from({ length: daysInMonth }, (_, i) => {
        const d = i + 1;
        const iso = `${month}-${pad(d)}`;
        return { d, iso, wd: new Date(y, m - 1, d).getDay() };
      }),
    [month, daysInMonth, y, m],
  );
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${pad(daysInMonth)}`;

  const { data: roster = [], isSuccess: rosterLoaded } = useQuery({
    queryKey: ['duty-roster-month', month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_roster')
        .select('staff_id, shift_id, duty_date')
        .gte('duty_date', monthStart)
        .lte('duty_date', monthEnd);
      if (error) throw error;
      return (data || []) as RosterRow[];
    },
  });

  /** staff|date -> Set(shift_id) coming from explicit day rows */
  const rosterMap = useMemo(() => {
    const m2 = new Map<string, Set<string>>();
    roster.forEach((r) => {
      const k = `${r.staff_id}|${r.duty_date}`;
      const s = m2.get(k) || new Set<string>();
      s.add(r.shift_id);
      m2.set(k, s);
    });
    return m2;
  }, [roster]);

  const tplMap = useMemo(() => {
    const m2 = new Map<string, Set<string>>();
    templates.forEach((t) => {
      const k = `${t.staff_id}|${t.weekday}`;
      const s = m2.get(k) || new Set<string>();
      s.add(t.shift_id);
      m2.set(k, s);
    });
    return m2;
  }, [templates]);

  const shiftsFor = (staffId: string, iso: string, wd: number) => {
    const explicit = rosterMap.get(`${staffId}|${iso}`);
    if (explicit) return { set: explicit, override: true };
    return { set: tplMap.get(`${staffId}|${wd}`) || new Set<string>(), override: false };
  };

  const rows = useMemo(() => {
    const q = search.trim();
    return q ? staff.filter((s) => (s.name_bn || '').includes(q) || (s.staff_id || '').includes(q)) : staff;
  }, [staff, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['duty-roster-month', month] });
    qc.invalidateQueries({ queryKey: ['duty-roster'] });
  };

  /** Write the full shift set for one staff on one date (day override). */
  const setDay = useMutation({
    mutationFn: async ({ staffId, iso, shiftIds }: { staffId: string; iso: string; shiftIds: string[] }) => {
      const { error: delErr } = await supabase
        .from('duty_roster')
        .delete()
        .eq('staff_id', staffId)
        .eq('duty_date', iso);
      if (delErr) throw delErr;
      if (shiftIds.length) {
        const { error } = await supabase
          .from('duty_roster')
          .insert(shiftIds.map((sid) => ({ staff_id: staffId, shift_id: sid, duty_date: iso })));
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message || 'সমস্যা হয়েছে'),
  });

  const toggleCell = (staffId: string, iso: string, wd: number) => {
    if (!currentShift) return toast.error('আগে একটি শিফট নির্বাচন করুন');
    const { set } = shiftsFor(staffId, iso, wd);
    const next = new Set(set);
    if (next.has(currentShift.id)) next.delete(currentShift.id);
    else next.add(currentShift.id);
    setDay.mutate({ staffId, iso, shiftIds: Array.from(next) });
  };

  /** Apply the selected shift to every day of the month for one staff. */
  const applyRowMonth = useMutation({
    mutationFn: async ({ staffId, on }: { staffId: string; on: boolean }) => {
      if (!currentShift) throw new Error('শিফট নির্বাচন করুন');
      const payload: RosterRow[] = [];
      days.forEach(({ iso, wd }) => {
        const { set } = shiftsFor(staffId, iso, wd);
        const next = new Set(set);
        if (on) next.add(currentShift.id);
        else next.delete(currentShift.id);
        next.forEach((sid) => payload.push({ staff_id: staffId, shift_id: sid, duty_date: iso }));
      });
      const { error: delErr } = await supabase
        .from('duty_roster')
        .delete()
        .eq('staff_id', staffId)
        .gte('duty_date', monthStart)
        .lte('duty_date', monthEnd);
      if (delErr) throw delErr;
      if (payload.length) {
        const { error } = await supabase.from('duty_roster').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success('পুরো মাসে প্রয়োগ হয়েছে');
    },
    onError: (e: any) => toast.error(e.message || 'সমস্যা হয়েছে'),
  });

  /** Materialise the weekly template into every date of this month. */
  const applyTemplateMonth = useMutation({
    mutationFn: async () => {
      const payload: RosterRow[] = [];
      staff.forEach((s) => {
        days.forEach(({ iso, wd }) => {
          (tplMap.get(`${s.id}|${wd}`) || new Set<string>()).forEach((sid) =>
            payload.push({ staff_id: s.id, shift_id: sid, duty_date: iso }),
          );
        });
      });
      const { error: delErr } = await supabase
        .from('duty_roster')
        .delete()
        .gte('duty_date', monthStart)
        .lte('duty_date', monthEnd);
      if (delErr) throw delErr;
      for (let i = 0; i < payload.length; i += 500) {
        const { error } = await supabase.from('duty_roster').insert(payload.slice(i, i + 500));
        if (error) throw error;
      }
      return payload.length;
    },
    onSuccess: (n) => {
      invalidate();
      toast.success(`সাপ্তাহিক ছক পুরো মাসে প্রয়োগ হয়েছে (${n} টি ডিউটি)`);
    },
    onError: (e: any) => toast.error(e.message || 'সমস্যা হয়েছে'),
  });

  /** Auto-map the weekly pattern onto a freshly selected month that has no day rows yet. */
  const autoDone = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!autoApply || !rosterLoaded) return;
    if (roster.length > 0) return;
    if (templates.length === 0 || staff.length === 0) return;
    if (autoDone.current.has(month)) return;
    autoDone.current.add(month);
    applyTemplateMonth.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoApply, rosterLoaded, roster.length, templates.length, staff.length, month]);



  const clearMonth = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('duty_roster')
        .delete()
        .gte('duty_date', monthStart)
        .lte('duty_date', monthEnd);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success('এই মাসের সব দিন-ভিত্তিক ডিউটি মুছে ফেলা হয়েছে');
    },
    onError: (e: any) => toast.error(e.message || 'সমস্যা হয়েছে'),
  });

  return (
    <Card className="rounded-[38px]">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4" /> মাসিক ডিউটি সেটআপ
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="rounded-full"
              disabled={applyTemplateMonth.isPending}
              onClick={async () => {
                const ok = await confirm({
                  title: 'সাপ্তাহিক ছক পুরো মাসে প্রয়োগ?',
                  description: 'এই মাসের বিদ্যমান দিন-ভিত্তিক ডিউটি মুছে গিয়ে সাপ্তাহিক সেটআপ অনুযায়ী নতুন করে বসবে।',
                  variant: 'warning',
                });
                if (ok) applyTemplateMonth.mutate();
              }}
            >
              <Wand2 className="mr-1 h-4 w-4" /> সাপ্তাহিক ছক পুরো মাসে প্রয়োগ
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full"
              disabled={clearMonth.isPending}
              onClick={async () => {
                const ok = await confirm({
                  title: 'এই মাসের ডিউটি মুছবেন?',
                  description: 'শুধু দিন-ভিত্তিক (মাসিক) ডিউটি মুছবে; সাপ্তাহিক সেটআপ ঠিক থাকবে।',
                  variant: 'destructive',
                });
                if (ok) clearMonth.mutate();
              }}
            >
              <Eraser className="mr-1 h-4 w-4" /> মাস খালি করুন
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">মাস</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 w-44 rounded-full" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">যে শিফট বসাবেন</Label>
            <Select value={shiftId || activeShifts[0]?.id || ''} onValueChange={setShiftId}>
              <SelectTrigger className="h-9 w-56 rounded-full"><SelectValue placeholder="শিফট" /></SelectTrigger>
              <SelectContent>
                {activeShifts.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name_bn} ({s.start_time?.slice(0, 5)}–{s.end_time?.slice(0, 5)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">স্টাফ খুঁজুন</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="নাম / আইডি" className="h-9 w-52 rounded-full" />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          ঘরে ক্লিক করলে নির্বাচিত শিফটের ডিউটি চালু (✓) / বন্ধ হবে। সাপ্তাহিক ছক থেকে আসা ডিউটি হালকা রঙে দেখাবে।
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-1 text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="sticky left-0 z-10 bg-background px-2 text-left">স্টাফ</th>
              {days.map((d) => (
                <th key={d.iso} className={`px-1 text-center ${d.wd === 5 ? 'text-rose-600' : ''}`}>
                  <div>{d.d}</div>
                  <div className="text-[9px]">{WEEKDAYS[d.wd]}</div>
                </th>
              ))}
              <th className="px-2 text-center">পুরো মাস</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="bg-muted/20">
                <td className="sticky left-0 z-10 min-w-[160px] rounded-l-[16px] bg-background px-2 py-1">
                  <div className="font-medium">{s.name_bn}</div>
                  <div className="text-[10px] text-muted-foreground">{s.staff_id || '—'}</div>
                </td>
                {days.map((d) => {
                  const { set, override } = shiftsFor(s.id, d.iso, d.wd);
                  const on = currentShift ? set.has(currentShift.id) : false;
                  return (
                    <td key={d.iso} className="px-0.5 py-1 text-center">
                      <button
                        type="button"
                        title={`${s.name_bn} — ${d.d}/${m} (${WEEKDAYS[d.wd]}বার)${override ? ' • এই দিনের বিশেষ ডিউটি' : ''}`}
                        onClick={() => toggleCell(s.id, d.iso, d.wd)}
                        className={`h-6 w-6 rounded-full border text-[10px] transition hover:-translate-y-[2px] ${
                          on
                            ? override
                              ? 'border-emerald-600 bg-emerald-600 text-primary-foreground'
                              : 'border-emerald-300 bg-emerald-100 text-emerald-800'
                            : 'border-dashed border-muted-foreground/40 text-muted-foreground'
                        }`}
                      >
                        {on ? '✓' : '+'}
                      </button>
                    </td>
                  );
                })}
                <td className="rounded-r-[16px] px-2 py-1 text-center">
                  <div className="flex justify-center gap-1">
                    <Button size="sm" variant="outline" className="h-6 rounded-full px-2 text-[10px]"
                      onClick={() => applyRowMonth.mutate({ staffId: s.id, on: true })}>সব দিন</Button>
                    <Button size="sm" variant="ghost" className="h-6 rounded-full px-2 text-[10px]"
                      onClick={() => applyRowMonth.mutate({ staffId: s.id, on: false })}>বাদ</Button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={days.length + 2} className="px-3 py-6 text-center text-muted-foreground">কোনো স্টাফ পাওয়া যায়নি</td>
              </tr>
            )}
          </tbody>
        </table>
        {activeShifts.length === 0 && (
          <div className="mt-3 text-center text-sm text-muted-foreground">
            আগে “শিফট ও মেশিন সেটআপ” ট্যাবে শিফট তৈরি করুন। <Badge variant="outline" className="ml-1">শিফট নেই</Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
