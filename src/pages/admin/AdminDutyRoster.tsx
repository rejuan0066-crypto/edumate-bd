import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AdminLayout from '@/components/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarClock, Plus, Trash2, Save } from 'lucide-react';
import { useConfirm } from '@/contexts/ConfirmContext';
import { calcDayShiftPay } from '@/lib/dutyShiftPay';

interface DutyShift {
  id: string;
  code: string;
  name_bn: string;
  name_en: string | null;
  start_time: string;
  end_time: string;
  grace_minutes: number;
  pay_amount: number | null;
  pay_type: string | null;
  is_active: boolean;
  sort_order: number;
}

interface StaffRow {
  id: string;
  name_bn: string;
  staff_id: string | null;
  staff_category: string;
  salary_order: number | null;
}

interface RosterRow {
  id: string;
  staff_id: string;
  shift_id: string;
  duty_date: string;
  note: string | null;
}

const emptyShift = {
  code: '',
  name_bn: '',
  name_en: '',
  start_time: '09:00',
  end_time: '17:00',
  grace_minutes: 0,
  pay_amount: '' as string | number,
  pay_type: 'per_day',
  is_active: true,
  sort_order: 0,
};

const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : '—');

export default function AdminDutyRoster() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [tab, setTab] = useState('roster');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [shiftDialog, setShiftDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<DutyShift | null>(null);
  const [form, setForm] = useState<any>(emptyShift);

  const { data: shifts = [] } = useQuery({
    queryKey: ['duty-shifts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('duty_shifts')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as DutyShift[];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['duty-roster-staff'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name_bn, staff_id, staff_category, salary_order')
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('salary_order', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data || []) as StaffRow[];
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

  const { data: attendance = [], isFetching: attFetching, dataUpdatedAt } = useQuery({
    queryKey: ['duty-roster-attendance', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('entity_id, status, check_in_time, check_out_time')
        .eq('entity_type', 'staff')
        .eq('attendance_date', date);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  // Live update: any attendance/roster change for this date refreshes the status instantly
  useEffect(() => {
    const channel = supabase
      .channel(`duty-roster-live-${date}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => {
        qc.invalidateQueries({ queryKey: ['duty-roster-attendance', date] });
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
    const m = new Map<string, any>();
    attendance.forEach((a: any) => m.set(a.entity_id, a));
    return m;
  }, [attendance]);

  const rosterMap = useMemo(() => {
    const m = new Map<string, RosterRow[]>();
    roster.forEach((r) => {
      const arr = m.get(r.staff_id) || [];
      arr.push(r);
      m.set(r.staff_id, arr);
    });
    return m;
  }, [roster]);

  const assignMutation = useMutation({
    mutationFn: async ({ staffId, shiftId }: { staffId: string; shiftId: string }) => {
      if (shiftId === 'none') {
        const { error } = await supabase
          .from('duty_roster')
          .delete()
          .eq('staff_id', staffId)
          .eq('duty_date', date);
        if (error) throw error;
        return;
      }
      const { error: delErr } = await supabase
        .from('duty_roster')
        .delete()
        .eq('staff_id', staffId)
        .eq('duty_date', date);
      if (delErr) throw delErr;
      const { error } = await supabase
        .from('duty_roster')
        .insert({ staff_id: staffId, shift_id: shiftId, duty_date: date });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['duty-roster', date] });
      toast.success('ডিউটি আপডেট হয়েছে');
    },
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
        pay_amount: form.pay_amount === '' || form.pay_amount === null ? null : Number(form.pay_amount),
        pay_type: form.pay_type || null,
        is_active: !!form.is_active,
        sort_order: Number(form.sort_order) || 0,
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

  const statusOf = (staffId: string) => {
    const duties = rosterMap.get(staffId) || [];
    const att = attMap.get(staffId);
    const hasAtt = !!att && ['present', 'late'].includes(att.status);
    if (duties.length === 0) {
      return hasAtt
        ? { label: 'ডিউটি নাই (হাজিরা আছে)', cls: 'bg-amber-100 text-amber-800' }
        : { label: 'ডিউটি নাই', cls: 'bg-muted text-muted-foreground' };
    }
    if (hasAtt) return { label: 'উপস্থিত', cls: 'bg-emerald-100 text-emerald-800' };
    if (att && att.status === 'leave') return { label: 'ছুটি', cls: 'bg-sky-100 text-sky-800' };
    return { label: 'অনুপস্থিত', cls: 'bg-rose-100 text-rose-800' };
  };

  const payOf = (staffId: string) => {
    const duties = rosterMap.get(staffId) || [];
    const att = attMap.get(staffId);
    const hasAtt = !!att && ['present', 'late'].includes(att.status);
    const dutyShifts = duties
      .map((d) => shifts.find((x) => x.id === d.shift_id))
      .filter(Boolean) as DutyShift[];
    return calcDayShiftPay(dutyShifts, {
      attended: hasAtt,
      checkIn: att?.check_in_time,
      checkOut: att?.check_out_time,
    });
  };

  const totals = useMemo(() => {
    let present = 0, absent = 0, noDuty = 0, leave = 0, pay = 0;
    staff.forEach((s) => {
      const st = statusOf(s.id).label;
      if (st === 'উপস্থিত') present++;
      else if (st === 'অনুপস্থিত') absent++;
      else if (st === 'ছুটি') leave++;
      else if (st.startsWith('ডিউটি নাই')) noDuty++;
      pay += payOf(s.id).total;
    });
    return { present, absent, noDuty, leave, pay: Math.round(pay * 100) / 100 };
  }, [staff, rosterMap, attMap, shifts]);

  // শিফট ভিত্তিক হিসাব
  const shiftSummary = useMemo(() => {
    return shifts
      .filter((sh) => sh.is_active)
      .map((sh) => {
        let assigned = 0, present = 0, absent = 0, pay = 0;
        staff.forEach((s) => {
          const duties = rosterMap.get(s.id) || [];
          if (!duties.some((d) => d.shift_id === sh.id)) return;
          assigned++;
          const att = attMap.get(s.id);
          const hasAtt = !!att && ['present', 'late'].includes(att.status);
          if (hasAtt) present++;
          else if (!att || att.status !== 'leave') absent++;
          pay += calcDayShiftPay([sh], {
            attended: hasAtt,
            checkIn: att?.check_in_time,
            checkOut: att?.check_out_time,
          }).total;
        });
        return { shift: sh, assigned, present, absent, pay: Math.round(pay * 100) / 100 };
      });
  }, [shifts, staff, rosterMap, attMap]);

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
              <p className="text-sm text-muted-foreground">শিফট ভিত্তিক ডিউটি ও হাজিরা</p>
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
                qc.invalidateQueries({ queryKey: ['duty-roster-attendance', date] });
                qc.invalidateQueries({ queryKey: ['duty-roster', date] });
              }}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${attFetching ? 'animate-spin' : ''}`} />
              রিফ্রেশ
            </Button>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { l: 'উপস্থিত', v: totals.present },
            { l: 'অনুপস্থিত', v: totals.absent },
            { l: 'ছুটি', v: totals.leave },
            { l: 'ডিউটি নাই', v: totals.noDuty },
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
            <table className="w-full min-w-[560px] border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="px-3">শিফট</th>
                  <th className="px-3">সময়</th>
                  <th className="px-3 text-center">বরাদ্দ</th>
                  <th className="px-3 text-center">উপস্থিত</th>
                  <th className="px-3 text-center">অনুপস্থিত</th>
                  <th className="px-3 text-right">ভাতা (৳)</th>
                </tr>
              </thead>
              <tbody>
                {shiftSummary.map((r) => (
                  <tr key={r.shift.id} className="rounded-[20px] bg-muted/30">
                    <td className="rounded-l-[20px] px-3 py-2 font-medium">{r.shift.name_bn}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {hhmm(r.shift.start_time)}–{hhmm(r.shift.end_time)}
                    </td>
                    <td className="px-3 py-2 text-center">{r.assigned}</td>
                    <td className="px-3 py-2 text-center text-emerald-700">{r.present}</td>
                    <td className="px-3 py-2 text-center text-rose-700">{r.absent}</td>
                    <td className="rounded-r-[20px] px-3 py-2 text-right">
                      {r.shift.pay_amount ? r.pay : <span className="text-xs text-muted-foreground">পে সেটআপ নাই</span>}
                    </td>
                  </tr>
                ))}
                {shiftSummary.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                      কোনো সক্রিয় শিফট নেই
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>


        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="roster">রোস্টার ও হাজিরা</TabsTrigger>
            <TabsTrigger value="shifts">শিফট ব্যবস্থাপনা</TabsTrigger>
          </TabsList>

          <TabsContent value="roster" className="mt-4">
            <Card className="rounded-[38px]">
              <CardHeader>
                <CardTitle className="text-base">{date} — ডিউটি তালিকা</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3">নাম</th>
                      <th className="px-3">আইডি</th>
                      <th className="px-3">ডিউটি শিফট</th>
                      <th className="px-3">চেক-ইন</th>
                      <th className="px-3">অবস্থা</th>
                      <th className="px-3 text-right">ভাতা (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((s) => {
                      const duties = rosterMap.get(s.id) || [];
                      const att = attMap.get(s.id);
                      const st = statusOf(s.id);
                      return (
                        <tr key={s.id} className="rounded-[20px] bg-muted/30 transition hover:-translate-y-[3px]">
                          <td className="rounded-l-[20px] px-3 py-2 font-medium">{s.name_bn}</td>
                          <td className="px-3 py-2 text-muted-foreground">{s.staff_id || '—'}</td>
                          <td className="px-3 py-2">
                            <Select
                              value={duties[0]?.shift_id || 'none'}
                              onValueChange={(v) => assignMutation.mutate({ staffId: s.id, shiftId: v })}
                            >
                              <SelectTrigger className="h-8 w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">ডিউটি নাই</SelectItem>
                                {shifts.filter((x) => x.is_active).map((sh) => (
                                  <SelectItem key={sh.id} value={sh.id}>
                                    {sh.name_bn} ({hhmm(sh.start_time)}–{hhmm(sh.end_time)})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="px-3 py-2">{hhmm(att?.check_in_time)}</td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
                          </td>
                          {(() => {
                            const p = payOf(s.id);
                            return (
                              <td className="rounded-r-[20px] px-3 py-2 text-right">
                                {!p.anyConfigured ? (
                                  <span className="text-xs text-muted-foreground">পে সেটআপ নাই</span>
                                ) : (
                                  <span title={p.lines.map((l) => `${l.shiftName}: ${l.note}`).join(' | ')}>
                                    {p.total || '—'}
                                  </span>
                                )}
                              </td>
                            );
                          })()}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

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
                  <Plus className="mr-1 h-4 w-4" /> নতুন শিফট
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[700px] border-separate border-spacing-y-2 text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="px-3">নাম</th>
                      <th className="px-3">সময়</th>
                      <th className="px-3">গ্রেস (মিঃ)</th>
                      <th className="px-3">ভাতা</th>
                      <th className="px-3">সক্রিয়</th>
                      <th className="px-3 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((sh) => (
                      <tr key={sh.id} className="rounded-[20px] bg-muted/30">
                        <td className="rounded-l-[20px] px-3 py-2 font-medium">{sh.name_bn}</td>
                        <td className="px-3 py-2">{hhmm(sh.start_time)} – {hhmm(sh.end_time)}</td>
                        <td className="px-3 py-2">{sh.grace_minutes}</td>
                        <td className="px-3 py-2">
                          {sh.pay_amount ? `৳${sh.pay_amount} / ${sh.pay_type}` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <Badge variant={sh.is_active ? 'default' : 'secondary'}>
                            {sh.is_active ? 'হ্যাঁ' : 'না'}
                          </Badge>
                        </td>
                        <td className="rounded-r-[20px] px-3 py-2 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingShift(sh);
                              setForm({ ...sh, pay_amount: sh.pay_amount ?? '', name_en: sh.name_en ?? '' });
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
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={shiftDialog} onOpenChange={setShiftDialog}>
          <DialogContent className="max-h-[85vh] overflow-y-auto rounded-[38px]">
            <DialogHeader>
              <DialogTitle>{editingShift ? 'শিফট সম্পাদনা' : 'নতুন শিফট'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label>শিফটের নাম</Label>
                <Input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} />
              </div>
              <div>
                <Label>কোড</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="morning" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>শুরু</Label>
                  <Input type="time" value={hhmm(form.start_time)} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div>
                  <Label>শেষ</Label>
                  <Input type="time" value={hhmm(form.end_time)} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>গ্রেস (মিনিট)</Label>
                  <Input type="text" inputMode="numeric" value={form.grace_minutes} onChange={(e) => setForm({ ...form, grace_minutes: e.target.value })} />
                </div>
                <div>
                  <Label>ক্রম</Label>
                  <Input type="text" inputMode="numeric" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
                </div>
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
