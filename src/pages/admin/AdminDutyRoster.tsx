import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarClock, Plus, Trash2, Save, RefreshCw, Lock, Cpu, Hand } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';
import DutyChangeAuditTab from '@/components/duty/DutyChangeAuditTab';
import MonthlyDutyTab from '@/components/duty/MonthlyDutyTab';
import MachineAttendanceTab from '@/components/duty/MachineAttendanceTab';
import { calcDayShiftPay } from '@/lib/dutyShiftPay';
import {
  machineWindow,
  isMachineAllowed,
  isManualAllowed,
  lateMinutesFor,
  earlyExitMinutesFor,
} from '@/lib/dutyMachineWindow';
import { shiftMinutes, perMinuteRate } from '@/lib/dutyShiftDeduction';
import { sortStaffByDepartment } from '@/lib/staffOrderHelper';

interface DutyShift {
  id: string;
  code: string;
  name_bn: string;
  name_en: string | null;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  early_exit_grace_minutes: number;
  pay_amount: number | null;
  pay_type: string | null;
  is_active: boolean;
  sort_order: number;
  attendance_mode: string;
  machine_enabled: boolean;
  machine_open_before_minutes: number;
  machine_close_after_minutes: number;
  absent_deduction_amount: number | null;
  late_deduction_enabled: boolean | null;
  late_deduction_amount: number | null;
  late_deduction_mode: string | null;
  late_deduction_free_minutes: number | null;
}

interface StaffRow {
  id: string;
  name_bn: string;
  staff_id: string | null;
  staff_category: string;
  salary_order: number | null;
  designation?: string | null;
  department?: string | null;
}

interface RosterRow {
  id: string;
  staff_id: string;
  shift_id: string;
  duty_date: string;
  note: string | null;
}

interface TemplateRow {
  id: string;
  staff_id: string;
  shift_id: string;
  weekday: number;
  is_active: boolean;
}

interface ShiftAttRow {
  id: string;
  staff_id: string;
  shift_id: string;
  duty_date: string;
  status: string;
  check_in_time: string | null;
  check_out_time: string | null;
  source: string;
}

const WEEKDAYS = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহঃ', 'শুক্র', 'শনি'];

const emptyShift = {
  code: '',
  name_bn: '',
  name_en: '',
  start_time: '09:00',
  end_time: '17:00',
  grace_minutes: 0,
  early_exit_grace_minutes: 0,
  pay_amount: '' as string | number,
  pay_type: 'per_day',
  is_active: true,
  sort_order: 0,
  attendance_mode: 'both',
  machine_enabled: false,
  machine_open_before_minutes: 60,
  machine_close_after_minutes: 60,
  absent_deduction_amount: '' as string | number,
  late_deduction_enabled: false,
  late_deduction_amount: '' as string | number,
  late_deduction_mode: 'per_minute',
  late_deduction_free_minutes: 5 as string | number,
};

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '');
const dash = (t?: string | null) => (t ? t.slice(0, 5) : '—');
const weekdayOf = (d: string) => {
  const [y, m, dd] = d.split('-').map(Number);
  return new Date(y, (m || 1) - 1, dd || 1).getDay();
};

export default function AdminDutyRoster() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [tab, setTab] = useState('roster');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAll, setShowAll] = useState(false);
  const [weeklySearch, setWeeklySearch] = useState('');
  const [showGuide, setShowGuide] = useState(true);

  const [shiftDialog, setShiftDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<DutyShift | null>(null);
  const [form, setForm] = useState<any>(emptyShift);

  const weekday = weekdayOf(date);

  const { data: shifts = [] } = useQuery({
    queryKey: ['duty-shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_shifts')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as DutyShift[];
    },
  });

  const activeShifts = useMemo(() => shifts.filter((s) => s.is_active), [shifts]);

  const { data: staff = [] } = useQuery({
    queryKey: ['duty-roster-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name_bn, staff_id, staff_category, salary_order, designation, department')
        .is('deleted_at', null)
        .eq('status', 'active');
      if (error) throw error;
      return sortStaffByDepartment((data || []) as StaffRow[]);
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['duty-weekly-template'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_weekly_template')
        .select('id, staff_id, shift_id, weekday, is_active')
        .eq('is_active', true);
      if (error) throw error;
      return (data || []) as TemplateRow[];
    },
  });

  const { data: roster = [] } = useQuery({
    queryKey: ['duty-roster', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_roster')
        .select('id, staff_id, shift_id, duty_date, note')
        .eq('duty_date', date);
      if (error) throw error;
      return (data || []) as RosterRow[];
    },
  });

  const { data: shiftAtt = [], isFetching: attFetching, dataUpdatedAt } = useQuery({
    queryKey: ['duty-shift-attendance', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_shift_attendance')
        .select('id, staff_id, shift_id, duty_date, status, check_in_time, check_out_time, source')
        .eq('duty_date', date);
      if (error) throw error;
      return (data || []) as ShiftAttRow[];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    const channel = supabase
      .channel(`duty-live-${date}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duty_shift_attendance' }, () => {
        qc.invalidateQueries({ queryKey: ['duty-shift-attendance', date] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'duty_roster' }, () => {
        qc.invalidateQueries({ queryKey: ['duty-roster', date] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, qc]);

  const attMap = useMemo(() => {
    const m = new Map<string, ShiftAttRow>();
    shiftAtt.forEach((a) => m.set(`${a.staff_id}|${a.shift_id}`, a));
    return m;
  }, [shiftAtt]);

  /** Explicit day overrides take priority; otherwise the weekly template applies. */
  const dutyMap = useMemo(() => {
    const m = new Map<string, Set<string>>();
    templates
      .filter((t) => t.weekday === weekday)
      .forEach((t) => {
        const set = m.get(t.staff_id) || new Set<string>();
        set.add(t.shift_id);
        m.set(t.staff_id, set);
      });
    const overridden = new Set(roster.map((r) => r.staff_id));
    overridden.forEach((sid) => m.delete(sid));
    roster.forEach((r) => {
      const set = m.get(r.staff_id) || new Set<string>();
      set.add(r.shift_id);
      m.set(r.staff_id, set);
    });
    return m;
  }, [templates, roster, weekday]);

  const hasDuty = (staffId: string, shiftId: string) => !!dutyMap.get(staffId)?.has(shiftId);
  const dutyCount = (staffId: string) => dutyMap.get(staffId)?.size || 0;

  const visibleStaff = useMemo(
    () => (showAll ? staff : staff.filter((s) => dutyCount(s.id) > 0)),
    [staff, showAll, dutyMap],
  );

  const weeklyStaff = useMemo(() => {
    const q = weeklySearch.trim();
    return q ? staff.filter((s) => (s.name_bn || '').includes(q) || (s.staff_id || '').includes(q)) : staff;
  }, [staff, weeklySearch]);


  // ---- mutations ----
  const toggleTemplate = useMutation({
    mutationFn: async ({ staffId, shiftId, wd, on }: { staffId: string; shiftId: string; wd: number; on: boolean }) => {
      if (on) {
        const { error } = await supabase
          .from('duty_weekly_template')
          .upsert({ staff_id: staffId, shift_id: shiftId, weekday: wd, is_active: true }, { onConflict: 'staff_id,shift_id,weekday' });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('duty_weekly_template')
          .delete()
          .eq('staff_id', staffId)
          .eq('shift_id', shiftId)
          .eq('weekday', wd);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['duty-weekly-template'] }),
    onError: (e: any) => toast.error(e.message || 'সমস্যা হয়েছে'),
  });

  /** Day-level override: replaces the template for this staff on this date. */
  const setDayDuty = useMutation({
    mutationFn: async ({ staffId, shiftIds }: { staffId: string; shiftIds: string[] }) => {
      const { error: delErr } = await supabase
        .from('duty_roster')
        .delete()
        .eq('staff_id', staffId)
        .eq('duty_date', date);
      if (delErr) throw delErr;
      if (shiftIds.length) {
        const { error } = await supabase
          .from('duty_roster')
          .insert(shiftIds.map((sid) => ({ staff_id: staffId, shift_id: sid, duty_date: date })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duty-roster', date] });
      toast.success('ডিউটি আপডেট হয়েছে');
    },
    onError: (e: any) => toast.error(e.message || 'সমস্যা হয়েছে'),
  });

  const saveAtt = useMutation({
    mutationFn: async (row: {
      staffId: string;
      shiftId: string;
      status: string;
      checkIn?: string | null;
      checkOut?: string | null;
      source?: string;
    }) => {
      const shift = shifts.find((s) => s.id === row.shiftId);
      if (row.status === 'none') {
        const { error } = await supabase
          .from('duty_shift_attendance')
          .delete()
          .eq('staff_id', row.staffId)
          .eq('shift_id', row.shiftId)
          .eq('duty_date', date);
        if (error) throw error;
        return;
      }
      const payload = {
        staff_id: row.staffId,
        shift_id: row.shiftId,
        duty_date: date,
        status: row.status,
        check_in_time: row.status === 'present' ? row.checkIn || null : null,
        check_out_time: row.status === 'present' ? row.checkOut || null : null,
        late_minutes: shift && row.status === 'present' ? lateMinutesFor(shift, row.checkIn) : 0,
        early_exit_minutes: shift && row.status === 'present' ? earlyExitMinutesFor(shift, row.checkOut) : 0,
        source: row.source || 'manual',
      };
      const { error } = await supabase
        .from('duty_shift_attendance')
        .upsert(payload, { onConflict: 'staff_id,shift_id,duty_date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['duty-shift-attendance', date] }),
    onError: (e: any) => toast.error(e.message || 'সমস্যা হয়েছে'),
  });

  const saveShift = useMutation({
    mutationFn: async () => {
      const payload = {
        code: form.code || form.name_bn,
        name_bn: form.name_bn,
        name_en: form.name_en || null,
        start_time: form.start_time,
        end_time: form.end_time,
        grace_minutes: Number(form.grace_minutes) || 0,
        early_exit_grace_minutes: Number(form.early_exit_grace_minutes) || 0,
        pay_amount: form.pay_amount === '' || form.pay_amount === null ? null : Number(form.pay_amount),
        pay_type: form.pay_type || null,
        is_active: !!form.is_active,
        sort_order: Number(form.sort_order) || 0,
        attendance_mode: form.attendance_mode || 'both',
        machine_enabled: !!form.machine_enabled,
        machine_open_before_minutes: Number(form.machine_open_before_minutes) || 0,
        machine_close_after_minutes: Number(form.machine_close_after_minutes) || 0,
        absent_deduction_amount: Number(form.absent_deduction_amount) || 0,
        late_deduction_enabled: !!form.late_deduction_enabled,
        late_deduction_amount:
          form.late_deduction_amount === '' || form.late_deduction_amount === null
            ? null
            : Number(form.late_deduction_amount),
        late_deduction_mode: form.late_deduction_mode || 'flat',
        late_deduction_free_minutes: Number(form.late_deduction_free_minutes) || 0,
      };
      if (editingShift) {
        const { error } = await supabase.from('duty_shifts').update(payload).eq('id', editingShift.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('duty_shifts').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duty-shifts'] });
      setShiftDialog(false);
      setEditingShift(null);
      setForm(emptyShift);
      toast.success('শিফট সংরক্ষিত হয়েছে');
    },
    onError: (e: any) => toast.error(e.message || 'সমস্যা হয়েছে'),
  });

  const deleteShift = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('duty_shifts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duty-shifts'] });
      toast.success('শিফট মুছে ফেলা হয়েছে');
    },
  });

  // ---- derived stats ----
  const cellStatus = (staffId: string, shift: DutyShift) => {
    if (!hasDuty(staffId, shift.id)) return 'no_duty';
    const a = attMap.get(`${staffId}|${shift.id}`);
    if (!a) return 'absent';
    return a.status;
  };

  const totals = useMemo(() => {
    let present = 0, absent = 0, leave = 0, noDuty = 0, pay = 0;
    staff.forEach((s) => {
      if (dutyCount(s.id) === 0) { noDuty++; return; }
      activeShifts.forEach((sh) => {
        const st = cellStatus(s.id, sh);
        if (st === 'no_duty') return;
        if (st === 'present') {
          present++;
          const a = attMap.get(`${s.id}|${sh.id}`);
          pay += calcDayShiftPay([sh], { attended: true, checkIn: a?.check_in_time, checkOut: a?.check_out_time }).total;
        } else if (st === 'leave') leave++;
        else absent++;
      });
    });
    return { present, absent, leave, noDuty, pay: Math.round(pay * 100) / 100 };
  }, [staff, activeShifts, dutyMap, attMap]);

  const shiftSummary = useMemo(
    () =>
      activeShifts.map((sh) => {
        let assigned = 0, present = 0, absent = 0, pay = 0;
        staff.forEach((s) => {
          if (!hasDuty(s.id, sh.id)) return;
          assigned++;
          const st = cellStatus(s.id, sh);
          if (st === 'present') {
            present++;
            const a = attMap.get(`${s.id}|${sh.id}`);
            pay += calcDayShiftPay([sh], { attended: true, checkIn: a?.check_in_time, checkOut: a?.check_out_time }).total;
          } else if (st !== 'leave') absent++;
        });
        return { shift: sh, assigned, present, absent, pay: Math.round(pay * 100) / 100 };
      }),
    [activeShifts, staff, dutyMap, attMap],
  );

  const payOfStaff = (staffId: string) => {
    let total = 0;
    let configured = false;
    activeShifts.forEach((sh) => {
      if (!hasDuty(staffId, sh.id)) return;
      const a = attMap.get(`${staffId}|${sh.id}`);
      const res = calcDayShiftPay([sh], {
        attended: a?.status === 'present',
        checkIn: a?.check_in_time,
        checkOut: a?.check_out_time,
      });
      total += res.total;
      if (res.anyConfigured) configured = true;
    });
    return { total: Math.round(total * 100) / 100, configured };
  };

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3">
              <CalendarClock className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ডিউটি রোস্টার</h1>
              <p className="text-sm text-muted-foreground">
                {WEEKDAYS[weekday]}বার — শিফট ভিত্তিক ডিউটি ও হাজিরা
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              শেষ আপডেট: {dataUpdatedAt ? format(new Date(dataUpdatedAt), 'HH:mm:ss') : '—'}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              disabled={attFetching}
              onClick={() => {
                qc.invalidateQueries({ queryKey: ['duty-shift-attendance', date] });
                qc.invalidateQueries({ queryKey: ['duty-roster', date] });
                qc.invalidateQueries({ queryKey: ['duty-weekly-template'] });
              }}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${attFetching ? 'animate-spin' : ''}`} />
              রিফ্রেশ
            </Button>
            <DatePicker value={date} onChange={setDate} className="w-[180px]" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { l: 'উপস্থিত (শিফট)', v: totals.present },
            { l: 'অনুপস্থিত (শিফট)', v: totals.absent },
            { l: 'ছুটি', v: totals.leave },
            { l: 'ডিউটি নাই (স্টাফ)', v: totals.noDuty },
            { l: 'শিফট ভাতা (৳)', v: totals.pay },
          ].map((c) => (
            <Card key={c.l} className="rounded-[28px] border-border/60 backdrop-blur">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{c.l}</p>
                <p className="text-2xl font-bold">{c.v}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="rounded-[38px]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">শিফট ভিত্তিক হিসাব</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3">শিফট</th>
                  <th className="px-3">সময়</th>
                  <th className="px-3">মেশিন উইন্ডো</th>
                  <th className="px-3 text-center">বরাদ্দ</th>
                  <th className="px-3 text-center">উপস্থিত</th>
                  <th className="px-3 text-center">অনুপস্থিত</th>
                  <th className="px-3 text-right">ভাতা (৳)</th>
                </tr>
              </thead>
              <tbody>
                {shiftSummary.map((r) => {
                  const w = machineWindow(r.shift);
                  return (
                    <tr key={r.shift.id} className="rounded-[20px] bg-muted/30">
                      <td className="rounded-l-[20px] px-3 py-2 font-medium">{r.shift.name_bn}</td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {dash(r.shift.start_time)}–{dash(r.shift.end_time)}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {isMachineAllowed(r.shift) && w ? `${w.open} – ${w.close}` : 'বন্ধ'}
                      </td>
                      <td className="px-3 py-2 text-center">{r.assigned}</td>
                      <td className="px-3 py-2 text-center text-emerald-700">{r.present}</td>
                      <td className="px-3 py-2 text-center text-rose-700">{r.absent}</td>
                      <td className="rounded-r-[20px] px-3 py-2 text-right">
                        {r.shift.pay_amount ? r.pay : <span className="text-xs text-muted-foreground">পে সেটআপ নাই</span>}
                      </td>
                    </tr>
                  );
                })}
                {shiftSummary.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-muted-foreground">
                      কোনো সক্রিয় শিফট নেই
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 rounded-[24px] bg-muted/60 p-2">
            <TabsTrigger
              value="roster"
              className="rounded-[18px] px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              দৈনিক হাজিরা
            </TabsTrigger>
            <TabsTrigger
              value="weekly"
              className="rounded-[18px] px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              সাপ্তাহিক ডিউটি সেটআপ
            </TabsTrigger>
            <TabsTrigger
              value="monthly"
              className="rounded-[18px] px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              মাসিক ডিউটি সেটআপ
            </TabsTrigger>
            <TabsTrigger
              value="shifts"
              className="rounded-[18px] px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              শিফট ও মেশিন সেটআপ
            </TabsTrigger>
            <TabsTrigger
              value="machine"
              className="rounded-[18px] px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              ফিঙ্গার মেশিন হাজিরা
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="rounded-[18px] px-5 py-2.5 text-sm font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg"
            >
              পরিবর্তনের লগ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="audit" className="mt-4">
            <DutyChangeAuditTab />
          </TabsContent>

          <TabsContent value="machine" className="mt-4">
            <MachineAttendanceTab staff={staff as any} />
          </TabsContent>

          <TabsContent value="monthly" className="mt-4">
            <MonthlyDutyTab shifts={shifts as any} staff={staff as any} templates={templates as any} />
          </TabsContent>



          {/* ---------------- Daily attendance ---------------- */}
          <TabsContent value="roster" className="mt-4">
            <Card className="rounded-[38px]">
              <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">
                    {format(new Date(date), 'dd/MM/yyyy')} ({WEEKDAYS[weekday]}বার) — ডিউটি ও হাজিরা
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    এই বারে যাদের ডিউটি সেট করা আছে শুধু তাদের নামই দেখাচ্ছে
                    {' '}(<b>{staff.filter((s) => dutyCount(s.id) > 0).length}</b> জন)।
                    সবাইকে দেখতে ডানের সুইচ চালু করুন।
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">ডিউটিহীন স্টাফও দেখান</Label>
                  <Switch checked={showAll} onCheckedChange={setShowAll} />
                </div>
              </CardHeader>

              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3">নাম</th>
                      <th className="px-3">আইডি</th>
                      {activeShifts.map((sh) => (
                        <th key={sh.id} className="px-3">
                          {sh.name_bn}
                          <span className="block font-normal">
                            {dash(sh.start_time)}–{dash(sh.end_time)}
                          </span>
                        </th>
                      ))}
                      <th className="px-3 text-right">ভাতা (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleStaff.map((s) => {
                      const pay = payOfStaff(s.id);
                      return (
                        <tr key={s.id} className="rounded-[20px] bg-muted/30 align-top">
                          <td className="rounded-l-[20px] px-3 py-2 font-medium">
                            <div className="flex flex-wrap items-center gap-2">
                              <span>{s.name_bn}</span>
                              {roster.some((r) => r.staff_id === s.id) && (
                                <>
                                  <span
                                    className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-normal text-amber-800"
                                    title="সাপ্তাহিক সেটআপের বাইরে শুধু এই তারিখের জন্য ডিউটি দেওয়া হয়েছে"
                                  >
                                    এই দিনের বিশেষ ডিউটি
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 gap-1 px-2 text-xs"
                                    disabled={setDayDuty.isPending}
                                    title={`${s.name_bn}-এর ${format(new Date(date), 'dd/MM/yyyy')} তারিখের বিশেষ ডিউটি রিমুভ করুন`}
                                    onClick={async () => {
                                      const ok = await confirm({
                                        title: 'বিশেষ ডিউটি রিমুভ করবেন?',
                                        description: `${s.name_bn}-এর ${format(new Date(date), 'dd/MM/yyyy')} তারিখের বিশেষ ডিউটি রিমুভ হবে।`,
                                        variant: 'destructive',
                                      });
                                      if (ok) setDayDuty.mutate({ staffId: s.id, shiftIds: [] });
                                    }}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    রিমুভ
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{s.staff_id || '—'}</td>
                          {activeShifts.map((sh) => {
                            const duty = hasDuty(s.id, sh.id);
                            const a = attMap.get(`${s.id}|${sh.id}`);
                            if (!duty) {
                              return (
                                <td key={sh.id} className="px-3 py-2">
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Lock className="h-3 w-3" /> ডিউটি নাই
                                    <button
                                      className="ml-1 underline"
                                      onClick={() => {
                                        const cur = Array.from(dutyMap.get(s.id) || []);
                                        setDayDuty.mutate({ staffId: s.id, shiftIds: [...cur, sh.id] });
                                      }}
                                    >
                                      যোগ
                                    </button>
                                  </div>
                                </td>
                              );
                            }
                            const late = a?.status === 'present' ? lateMinutesFor(sh, a?.check_in_time) : 0;
                            const early = a?.status === 'present' ? earlyExitMinutesFor(sh, a?.check_out_time) : 0;
                            return (
                              <td key={sh.id} className="px-3 py-2">
                                <div className="space-y-1">
                                  <Select
                                    value={a?.status || 'absent'}
                                    onValueChange={(v) =>
                                      saveAtt.mutate({
                                        staffId: s.id,
                                        shiftId: sh.id,
                                        status: v,
                                        checkIn: a?.check_in_time || (v === 'present' ? hhmm(sh.start_time) : null),
                                        checkOut: a?.check_out_time || (v === 'present' ? hhmm(sh.end_time) : null),
                                        source: a?.source || 'manual',
                                      })
                                    }
                                    disabled={!isManualAllowed(sh)}
                                  >
                                    <SelectTrigger className="h-8 w-[130px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="present">উপস্থিত</SelectItem>
                                      <SelectItem value="absent">অনুপস্থিত</SelectItem>
                                      <SelectItem value="leave">ছুটি</SelectItem>
                                    </SelectContent>
                                  </Select>
                                   {a?.status === 'present' && (
                                     <div className="flex items-center gap-1">
                                        <TimePicker
                                          className="h-7 w-[92px] px-1 text-xs"
                                          value={hhmm(a?.check_in_time)}
                                          disabled={!isManualAllowed(sh)}
                                          onChange={(value) =>
                                           saveAtt.mutate({
                                             staffId: s.id,
                                             shiftId: sh.id,
                                             status: 'present',
                                             checkIn: value,
                                             checkOut: a?.check_out_time,
                                             source: a?.source,
                                           })
                                         }
                                       />
                                        <TimePicker
                                          className="h-7 w-[92px] px-1 text-xs"
                                          value={hhmm(a?.check_out_time)}
                                          disabled={!isManualAllowed(sh)}
                                          onChange={(value) =>
                                           saveAtt.mutate({
                                             staffId: s.id,
                                             shiftId: sh.id,
                                             status: 'present',
                                             checkIn: a?.check_in_time,
                                             checkOut: value,
                                             source: a?.source,
                                           })
                                         }
                                       />
                                     </div>
                                   )}
                                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                                    {a?.source === 'machine' ? (
                                      <span className="inline-flex items-center gap-1 text-sky-700">
                                        <Cpu className="h-3 w-3" /> মেশিন
                                      </span>
                                    ) : a ? (
                                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                                        <Hand className="h-3 w-3" /> ম্যানুয়াল
                                      </span>
                                    ) : (
                                      <span className="text-rose-700">হাজিরা নাই</span>
                                    )}
                                    {late > 0 && <span className="text-amber-700">↓{late}মিঃ</span>}
                                    {early > 0 && <span className="text-amber-700">↑{early}মিঃ</span>}
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                          <td className="rounded-r-[20px] px-3 py-2 text-right">
                            {pay.configured ? pay.total : <span className="text-xs text-muted-foreground">পে সেটআপ নাই</span>}
                          </td>
                        </tr>
                      );
                    })}
                    {visibleStaff.length === 0 && (
                      <tr>
                        <td colSpan={activeShifts.length + 3} className="px-3 py-6 text-center text-muted-foreground">
                          <div className="flex flex-col items-center gap-3">
                            <span>{WEEKDAYS[weekday]}বারে কারও ডিউটি সেট করা নেই — সাপ্তাহিক সেটআপে এই বারে নাম যোগ করলেই এখানে দেখাবে</span>
                            <div className="flex flex-wrap justify-center gap-2">
                              <Button size="sm" onClick={() => setTab('weekly')}>
                                সাপ্তাহিক ডিউটি সেটআপ
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setTab('shifts')}>
                                শিফট ও মেশিন সেটআপ
                              </Button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ---------------- Weekly template ---------------- */}
          <TabsContent value="weekly" className="mt-4">
            <Card className="rounded-[38px]">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">কোন বারে কার কোন শিফটে ডিউটি</CardTitle>
                  <Button size="sm" variant="outline" className="rounded-full" onClick={() => setShowGuide((v) => !v)}>
                    {showGuide ? 'গাইড লুকান' : 'গাইড দেখুন'}
                  </Button>
                </div>

                {showGuide && (
                  <div className="mt-3 rounded-[24px] border border-primary/20 bg-primary/5 p-4">
                    <p className="mb-2 text-sm font-semibold">ধাপে ধাপে সেটআপ গাইড</p>
                    <ol className="space-y-2 text-xs text-muted-foreground">
                      <li className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">১</span>
                        <span>
                          প্রথমে <b>“শিফট ও মেশিন সেটআপ”</b> ট্যাবে গিয়ে শিফট (যেমন সকাল ৯:৩০–২:০০, সন্ধ্যা) তৈরি করুন — সময়, গ্রেস মিনিট ও পে ঠিক করে দিন।
                          {' '}
                          <button className="underline" onClick={() => setTab('shifts')}>এখানে যান</button>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">২</span>
                        <span>নিচের সার্চ বক্সে স্টাফ/শিক্ষকের <b>নাম লিখে খুঁজুন</b> — ছকে তার সারিটি দেখতে পাবেন।</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">৩</span>
                        <span>ঐ সারিতে <b>বারের ঘরে</b> (শনিবার…শুক্রবার) শিফটের বাটনে ক্লিক করুন। ক্লিকে সবুজ ✓ হলে ঐ বারে ঐ শিফটে ডিউটি সেট হলো, আবার ক্লিকে বন্ধ।</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">৪</span>
                        <span>পুরো সপ্তাহ একই শিফট হলে ডানপাশের <b>“সব বার (শিফট নাম)”</b> বাটনে এক ক্লিকেই সব বারে প্রয়োগ করুন।</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">৫</span>
                        <span>এই সেটআপ প্রতি সপ্তাহে স্বয়ংক্রিয়ভাবে চলবে। কোনো নির্দিষ্ট তারিখে ব্যতিক্রম হলে <b>“দৈনিক হাজিরা”</b> ট্যাব থেকে ঐ দিনের জন্য বদলান।</span>
                      </li>
                    </ol>
                    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-primary/15 pt-3 text-[11px]">
                      <span className="font-semibold">চিহ্ন:</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary bg-primary px-2 py-0.5 text-primary-foreground">✓ শিফট</span>
                      <span className="text-muted-foreground">= ডিউটি সেট আছে</span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border bg-background px-2 py-0.5 text-muted-foreground">+ শিফট</span>
                      <span className="text-muted-foreground">= ডিউটি নেই (ক্লিক করে সেট করুন)</span>
                    </div>
                  </div>
                )}

                <p className="mt-3 text-xs text-muted-foreground">
                  টিপস: প্রতিটি বাটনের উপর মাউস রাখলে ঐ স্টাফ, বার ও শিফটের সময়সহ বিস্তারিত দেখা যাবে।
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Input
                    value={weeklySearch}
                    onChange={(e) => setWeeklySearch(e.target.value)}
                    placeholder="নাম দিয়ে খুঁজুন..."
                    className="h-9 w-56 rounded-full"
                  />
                  {activeShifts.length === 0 && (
                    <Button size="sm" variant="outline" onClick={() => setTab('shifts')}>
                      আগে শিফট তৈরি করুন
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3">নাম</th>
                      {WEEKDAYS.map((w) => (
                        <th key={w} className="px-2 text-center">{w}বার</th>
                      ))}
                      <th className="px-2 text-center">দ্রুত</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyStaff.map((s) => (
                      <tr key={s.id} className="rounded-[20px] bg-muted/30">
                        <td className="rounded-l-[20px] px-3 py-2 font-medium">{s.name_bn}</td>
                        {WEEKDAYS.map((_, wd) => (
                          <td key={wd} className="px-2 py-2">
                            <div className="flex flex-col gap-1">
                              {activeShifts.map((sh) => {
                                const on = templates.some(
                                  (t) => t.staff_id === s.id && t.shift_id === sh.id && t.weekday === wd,
                                );
                                return (
                                  <button
                                    key={sh.id}
                                    title={`${s.name_bn} — ${WEEKDAYS[wd]}বার — ${sh.name_bn} (${hhmm(sh.start_time)}–${hhmm(sh.end_time)})`}
                                    onClick={() =>
                                      toggleTemplate.mutate({ staffId: s.id, shiftId: sh.id, wd, on: !on })
                                    }
                                    className={`flex w-full items-center justify-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition ${
                                      on
                                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                        : 'border-dashed border-border bg-background text-muted-foreground hover:border-primary/60 hover:text-foreground'
                                    }`}
                                  >
                                    <span>{on ? '✓' : '+'}</span>
                                    {sh.name_bn}
                                  </button>
                                );
                              })}
                              {activeShifts.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
                            </div>
                          </td>
                        ))}
                        <td className="rounded-r-[20px] px-2 py-2">
                          <div className="flex flex-col gap-1">
                            {activeShifts.map((sh) => {
                              const allOn = WEEKDAYS.every((_, wd) =>
                                templates.some((t) => t.staff_id === s.id && t.shift_id === sh.id && t.weekday === wd),
                              );
                              return (
                                <button
                                  key={sh.id}
                                  title={
                                    allOn
                                      ? `${s.name_bn} — সব বারে ${sh.name_bn} শিফট বন্ধ করুন`
                                      : `${s.name_bn} — সপ্তাহের সব বারে ${sh.name_bn} (${hhmm(sh.start_time)}–${hhmm(sh.end_time)}) শিফট প্রয়োগ করুন`
                                  }
                                  onClick={() =>
                                    WEEKDAYS.forEach((_, wd) =>
                                      toggleTemplate.mutate({ staffId: s.id, shiftId: sh.id, wd, on: !allOn }),
                                    )
                                  }
                                  className="rounded-full border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground"
                                >
                                  {allOn ? `সব বার বন্ধ (${sh.name_bn})` : `সব বার (${sh.name_bn})`}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {weeklyStaff.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">
                          কোনো স্টাফ পাওয়া যায়নি
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>


          {/* ---------------- Shift settings ---------------- */}
          <TabsContent value="shifts" className="mt-4">
            <Card className="rounded-[38px]">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">শিফট তালিকা</CardTitle>
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingShift(null);
                    setForm(emptyShift);
                    setShiftDialog(true);
                  }}
                >
                  <Plus className="mr-1 h-4 w-4" /> নতুন ডিউটি/শিফট
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[860px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3">নাম</th>
                      <th className="px-3">সময়</th>
                      <th className="px-3">গ্রেস (মিঃ)</th>
                      <th className="px-3">হাজিরার ধরন</th>
                      <th className="px-3">মেশিন উইন্ডো</th>
                      <th className="px-3">ভাতা</th>
                      <th className="px-3">কর্তন</th>
                      <th className="px-3">সক্রিয়</th>
                      <th className="px-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((sh) => {
                      const w = machineWindow(sh);
                      return (
                        <tr key={sh.id} className="rounded-[20px] bg-muted/30">
                          <td className="rounded-l-[20px] px-3 py-2 font-medium">{sh.name_bn}</td>
                          <td className="px-3 py-2">{dash(sh.start_time)} – {dash(sh.end_time)}</td>
                          <td className="px-3 py-2">
                            ↓{sh.grace_minutes} / ↑{sh.early_exit_grace_minutes}
                          </td>
                          <td className="px-3 py-2">
                            {sh.attendance_mode === 'machine' ? 'শুধু মেশিন' : sh.attendance_mode === 'manual' ? 'শুধু ম্যানুয়াল' : 'উভয়'}
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">
                            {isMachineAllowed(sh) && w ? `${w.open} – ${w.close}` : 'বন্ধ'}
                          </td>
                          <td className="px-3 py-2">{sh.pay_amount ? `৳${sh.pay_amount} / ${sh.pay_type}` : '—'}</td>
                          <td className="px-3 py-2 text-xs">
                            {Number(sh.absent_deduction_amount) > 0 || sh.late_deduction_enabled ? (
                              <span>
                                {Number(sh.absent_deduction_amount) > 0 ? `অনুপস্থিত ৳${sh.absent_deduction_amount}` : 'অনুপস্থিত —'}
                                {sh.late_deduction_enabled && (
                                  <span className="block text-muted-foreground">
                                    বিলম্ব: {sh.late_deduction_mode === 'per_minute' ? 'প্রতি মিনিট' : 'ফ্ল্যাট'}
                                    {' • '}{sh.late_deduction_free_minutes ?? 5} মিঃ ফ্রি
                                  </span>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Badge variant={sh.is_active ? 'default' : 'secondary'}>{sh.is_active ? 'হ্যাঁ' : 'না'}</Badge>
                          </td>
                          <td className="rounded-r-[20px] px-3 py-2 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingShift(sh);
                                setForm({
                                  ...sh,
                                  pay_amount: sh.pay_amount ?? '',
                                  name_en: sh.name_en ?? '',
                                  start_time: hhmm(sh.start_time),
                                  end_time: hhmm(sh.end_time),
                                  absent_deduction_amount: sh.absent_deduction_amount ?? '',
                                  late_deduction_enabled: !!sh.late_deduction_enabled,
                                  late_deduction_amount: sh.late_deduction_amount ?? '',
                                  late_deduction_mode: sh.late_deduction_mode || 'per_minute',
                                  late_deduction_free_minutes: sh.late_deduction_free_minutes ?? 5,
                                });
                                setShiftDialog(true);
                              }}
                            >
                              সম্পাদনা
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={async () => {
                                const ok = await confirm({
                                  title: 'শিফট মুছবেন?',
                                  description: `${sh.name_bn} শিফটটি মুছে ফেলা হবে।`,
                                  variant: 'destructive',
                                });
                                if (ok) deleteShift.mutate(sh.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={shiftDialog} onOpenChange={setShiftDialog}>
          <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[38px]">
            <DialogHeader>
              <DialogTitle>{editingShift ? 'শিফট সম্পাদনা' : 'নতুন ডিউটি/শিফট'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>ডিউটির নাম</Label>
                <Input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} />
              </div>
              <div>
                <Label>কোড</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="morning" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>শুরু</Label>
                  <TimePicker value={hhmm(form.start_time)} onChange={(value) => setForm({ ...form, start_time: value })} />
                </div>
                <div>
                  <Label>শেষ</Label>
                  <TimePicker value={hhmm(form.end_time)} onChange={(value) => setForm({ ...form, end_time: value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>বিলম্ব গ্রেস (মিনিট)</Label>
                  <Input type="text" inputMode="numeric" value={form.grace_minutes} onChange={(e) => setForm({ ...form, grace_minutes: e.target.value })} />
                </div>
                <div>
                  <Label>আগাম প্রস্থান গ্রেস (মিনিট)</Label>
                  <Input type="text" inputMode="numeric" value={form.early_exit_grace_minutes} onChange={(e) => setForm({ ...form, early_exit_grace_minutes: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>হাজিরার ধরন</Label>
                  <Select value={form.attendance_mode || 'both'} onValueChange={(v) => setForm({ ...form, attendance_mode: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">ম্যানুয়াল + মেশিন</SelectItem>
                      <SelectItem value="manual">শুধু ম্যানুয়াল</SelectItem>
                      <SelectItem value="machine">শুধু মেশিন</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>ক্রম</Label>
                  <Input type="text" inputMode="numeric" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
                </div>
              </div>
              <div className="space-y-3 rounded-2xl border p-3">
                <div className="flex items-center justify-between">
                  <Label>মেশিন হাজিরা চালু</Label>
                  <Switch checked={!!form.machine_enabled} onCheckedChange={(v) => setForm({ ...form, machine_enabled: v })} />
                </div>
                {form.machine_enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">শুরুর কত মিনিট আগে চালু</Label>
                      <Input type="text" inputMode="numeric" value={form.machine_open_before_minutes} onChange={(e) => setForm({ ...form, machine_open_before_minutes: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">শেষের কত মিনিট পরে বন্ধ</Label>
                      <Input type="text" inputMode="numeric" value={form.machine_close_after_minutes} onChange={(e) => setForm({ ...form, machine_close_after_minutes: e.target.value })} />
                    </div>
                  </div>
                )}
                {form.machine_enabled && (
                  <p className="text-xs text-muted-foreground">
                    উইন্ডো: {machineWindow({
                      start_time: form.start_time,
                      end_time: form.end_time,
                      machine_open_before_minutes: Number(form.machine_open_before_minutes) || 0,
                      machine_close_after_minutes: Number(form.machine_close_after_minutes) || 0,
                    })?.open} – {machineWindow({
                      start_time: form.start_time,
                      end_time: form.end_time,
                      machine_open_before_minutes: Number(form.machine_open_before_minutes) || 0,
                      machine_close_after_minutes: Number(form.machine_close_after_minutes) || 0,
                    })?.close}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>ভাতা (ঐচ্ছিক)</Label>
                  <Input type="text" inputMode="numeric" value={form.pay_amount} onChange={(e) => setForm({ ...form, pay_amount: e.target.value })} />
                </div>
                <div>
                  <Label>ভাতার ধরন</Label>
                  <Select value={form.pay_type || 'per_day'} onValueChange={(v) => setForm({ ...form, pay_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_day">প্রতিদিন</SelectItem>
                      <SelectItem value="per_hour">প্রতি ঘণ্টা</SelectItem>
                      <SelectItem value="fixed">নির্দিষ্ট</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* কর্তন সেটিং */}
              <div className="space-y-3 rounded-2xl border p-3">
                <p className="text-sm font-semibold">কর্তন সেটিং</p>
                <div>
                  <Label className="text-xs">অনুপস্থিতি কর্তন (৳ / শিফট)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="0 = কর্তন নাই"
                    value={form.absent_deduction_amount}
                    onChange={(e) => setForm({ ...form, absent_deduction_amount: e.target.value })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>বিলম্ব কর্তন চালু</Label>
                  <Switch
                    checked={!!form.late_deduction_enabled}
                    onCheckedChange={(v) => setForm({ ...form, late_deduction_enabled: v })}
                  />
                </div>
                {form.late_deduction_enabled && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">বিলম্ব কর্তনের ধরন</Label>
                        <Select
                          value={form.late_deduction_mode || 'per_minute'}
                          onValueChange={(v) => setForm({ ...form, late_deduction_mode: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="per_minute">প্রতি মিনিট</SelectItem>
                            <SelectItem value="flat">পুরো টাকা</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">ফ্রি মিনিট (এরপর কর্তন)</Label>
                        <Input
                          type="text"
                          inputMode="numeric"
                          value={form.late_deduction_free_minutes}
                          onChange={(e) => setForm({ ...form, late_deduction_free_minutes: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">
                        বিলম্ব কর্তন টাকা (খালি রাখলে অনুপস্থিতির টাকা থেকে হিসাব হবে)
                      </Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="খালি = স্বয়ংক্রিয়"
                        value={form.late_deduction_amount}
                        onChange={(e) => setForm({ ...form, late_deduction_amount: e.target.value })}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const mins = shiftMinutes({ id: 'x', start_time: form.start_time, end_time: form.end_time });
                        const absent = Number(form.absent_deduction_amount) || 0;
                        const rate = perMinuteRate({
                          id: 'x',
                          start_time: form.start_time,
                          end_time: form.end_time,
                          absent_deduction_amount: absent,
                          late_deduction_amount:
                            form.late_deduction_amount === '' ? null : Number(form.late_deduction_amount),
                        });
                        return form.late_deduction_mode === 'per_minute'
                          ? `প্রতি মিনিট হার: ৳${Math.round(rate * 100) / 100} (${absent}৳ ÷ ${mins} মিনিট) — সর্বোচ্চ ৳${absent} পর্যন্ত`
                          : 'বিলম্ব হলে একবারে পুরো টাকা কর্তন হবে (অনুপস্থিতির টাকার বেশি নয়)।';
                      })()}
                    </p>
                  </>
                )}
                <p className="text-xs text-muted-foreground">
                  ছুটির দিন বা রুটিনে ডিউটি না থাকলে কোনো কর্তন হবে না।
                </p>
              </div>

              <div className="flex items-center justify-between rounded-2xl border p-3">
                <Label>সক্রিয়</Label>
                <Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShiftDialog(false)}>বাতিল</Button>
              <Button onClick={() => saveShift.mutate()} disabled={!form.name_bn}>
                <Save className="mr-1 h-4 w-4" /> সংরক্ষণ
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
