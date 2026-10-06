import { useState, useMemo } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useConfirm } from '@/contexts/ConfirmContext';
import { CalendarDays, Plus, Trash2, Edit, Sparkles } from 'lucide-react';

const WEEKDAYS_BN = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহস্পতি', 'শুক্র', 'শনি'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Holiday {
  id: string;
  holiday_date: string;
  name_bn: string | null;
  name_en: string | null;
  holiday_type: 'weekly' | 'public';
  weekday: number | null;
  is_paid: boolean;
  notes: string | null;
}

export default function AdminStaffHolidays() {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [year, setYear] = useState(new Date().getFullYear());
  const [editing, setEditing] = useState<Partial<Holiday> | null>(null);
  const [open, setOpen] = useState(false);

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['staff-holidays', year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_holidays' as any)
        .select('*')
        .gte('holiday_date', `${year}-01-01`)
        .lte('holiday_date', `${year}-12-31`)
        .order('holiday_date');
      if (error) throw error;
      return (data || []) as any as Holiday[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (h: Partial<Holiday>) => {
      const payload: any = {
        holiday_date: h.holiday_date,
        name_bn: h.name_bn || null,
        name_en: h.name_en || null,
        holiday_type: h.holiday_type || 'public',
        weekday: h.holiday_type === 'weekly' ? (h.weekday ?? null) : null,
        is_paid: h.is_paid !== false,
        notes: h.notes || null,
      };
      if (h.id) {
        const { error } = await supabase.from('staff_holidays' as any).update(payload).eq('id', h.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff_holidays' as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'সংরক্ষিত হয়েছে' : 'Saved');
      qc.invalidateQueries({ queryKey: ['staff-holidays'] });
      setOpen(false);
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('staff_holidays' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
      qc.invalidateQueries({ queryKey: ['staff-holidays'] });
    },
  });

  // Bulk-add weekly Friday holidays for the year
  const bulkWeeklyMutation = useMutation({
    mutationFn: async (weekday: number) => {
      const dates: string[] = [];
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getDay() === weekday) {
          dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }
      }
      const existing = new Set(holidays.map(h => h.holiday_date));
      const toAdd = dates.filter(d => !existing.has(d)).map(d => ({
        holiday_date: d,
        name_bn: `সাপ্তাহিক ছুটি (${WEEKDAYS_BN[weekday]})`,
        name_en: `Weekly Holiday (${WEEKDAYS_EN[weekday]})`,
        holiday_type: 'weekly',
        weekday,
        is_paid: true,
      }));
      if (toAdd.length === 0) return 0;
      const { error } = await supabase.from('staff_holidays' as any).insert(toAdd);
      if (error) throw error;
      return toAdd.length;
    },
    onSuccess: (count) => {
      toast.success(bn ? `${count} টি সাপ্তাহিক ছুটি যোগ হয়েছে` : `${count} weekly holidays added`);
      qc.invalidateQueries({ queryKey: ['staff-holidays'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const stats = useMemo(() => ({
    total: holidays.length,
    weekly: holidays.filter(h => h.holiday_type === 'weekly').length,
    public: holidays.filter(h => h.holiday_type === 'public').length,
    unpaid: holidays.filter(h => !h.is_paid).length,
  }), [holidays]);

  const openNew = () => {
    setEditing({
      holiday_date: new Date().toISOString().slice(0, 10),
      holiday_type: 'public',
      is_paid: true,
    });
    setOpen(true);
  };

  return (
    <div className="max-w-[1440px] mx-auto p-4 md:p-6 space-y-4">
      <Card className="rounded-[45px] backdrop-blur-xl bg-card/60 border-white/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-emerald-600" />
            {bn ? 'ছুটির ক্যালেন্ডার (স্টাফ বেতন)' : 'Holiday Calendar (Staff Salary)'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={String(year)} onValueChange={v => setYear(Number(v))}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 7 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700">
              <Plus className="h-4 w-4 mr-1" /> {bn ? 'নতুন ছুটি' : 'New Holiday'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: bn ? 'মোট' : 'Total', value: stats.total, color: 'text-emerald-600' },
              { label: bn ? 'সাপ্তাহিক' : 'Weekly', value: stats.weekly, color: 'text-blue-600' },
              { label: bn ? 'সরকারি' : 'Public', value: stats.public, color: 'text-amber-600' },
              { label: bn ? 'বেতনহীন' : 'Unpaid', value: stats.unpaid, color: 'text-red-500' },
            ].map((s, i) => (
              <div key={i} className="p-3 rounded-[20px] border bg-muted/30 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 p-3 rounded-[20px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium">{bn ? 'বাল্ক যোগ করুন:' : 'Bulk Add:'}</span>
            {[5, 6, 0].map(d => (
              <Button key={d} size="sm" variant="outline"
                onClick={() => bulkWeeklyMutation.mutate(d)}
                disabled={bulkWeeklyMutation.isPending}
              >
                {bn ? `${WEEKDAYS_BN[d]}বার` : WEEKDAYS_EN[d]} ({year})
              </Button>
            ))}
          </div>

          <div className="border rounded-[20px] overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">{bn ? 'তারিখ' : 'Date'}</th>
                  <th className="px-3 py-2 text-left">{bn ? 'নাম' : 'Name'}</th>
                  <th className="px-3 py-2 text-center">{bn ? 'ধরন' : 'Type'}</th>
                  <th className="px-3 py-2 text-center">{bn ? 'বেতনসহ' : 'Paid'}</th>
                  <th className="px-3 py-2 text-right">{bn ? 'অ্যাকশন' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</td></tr>
                ) : holidays.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-6 text-muted-foreground">{bn ? 'কোনো ছুটি নেই' : 'No holidays yet'}</td></tr>
                ) : holidays.map(h => {
                  const d = new Date(h.holiday_date);
                  const wd = bn ? WEEKDAYS_BN[d.getDay()] : WEEKDAYS_EN[d.getDay()];
                  return (
                    <tr key={h.id} className="border-t hover:bg-muted/20">
                      <td className="px-3 py-2">
                        <div className="font-medium">{d.toLocaleDateString(bn ? 'bn-BD' : 'en-GB')}</div>
                        <div className="text-xs text-muted-foreground">{wd}</div>
                      </td>
                      <td className="px-3 py-2">{bn ? (h.name_bn || h.name_en) : (h.name_en || h.name_bn) || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge variant={h.holiday_type === 'weekly' ? 'secondary' : 'outline'}>
                          {h.holiday_type === 'weekly' ? (bn ? 'সাপ্তাহিক' : 'Weekly') : (bn ? 'সরকারি' : 'Public')}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {h.is_paid ? <Badge className="bg-emerald-100 text-emerald-700">✓</Badge> : <Badge variant="destructive">✗</Badge>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(h); setOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost"
                          onClick={async () => {
                            if (await confirm({ title: bn ? 'ছুটি মুছবেন?' : 'Delete holiday?', variant: 'destructive' })) {
                              deleteMutation.mutate(h.id);
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="rounded-[38px] max-w-md">
          <DialogHeader>
            <DialogTitle>{editing?.id ? (bn ? 'ছুটি সম্পাদনা' : 'Edit Holiday') : (bn ? 'নতুন ছুটি' : 'New Holiday')}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label className="mb-1 block">{bn ? 'তারিখ' : 'Date'}</Label>
                <DatePicker value={editing.holiday_date || ''} onChange={v => setEditing({ ...editing, holiday_date: v })} bengali={bn} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>{bn ? 'বাংলা নাম' : 'Name (BN)'}</Label>
                  <Input value={editing.name_bn || ''} onChange={e => setEditing({ ...editing, name_bn: e.target.value })} />
                </div>
                <div>
                  <Label>{bn ? 'ইংরেজি নাম' : 'Name (EN)'}</Label>
                  <Input value={editing.name_en || ''} onChange={e => setEditing({ ...editing, name_en: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>{bn ? 'ধরন' : 'Type'}</Label>
                <Select value={editing.holiday_type || 'public'} onValueChange={(v: any) => setEditing({ ...editing, holiday_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">{bn ? 'সরকারি/বিশেষ' : 'Public/Special'}</SelectItem>
                    <SelectItem value="weekly">{bn ? 'সাপ্তাহিক' : 'Weekly'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-2 border rounded-lg">
                <Label>{bn ? 'বেতনসহ ছুটি' : 'Paid Holiday'}</Label>
                <Switch checked={editing.is_paid !== false}
                  onCheckedChange={v => setEditing({ ...editing, is_paid: v })} />
              </div>
              <div>
                <Label>{bn ? 'নোট (ঐচ্ছিক)' : 'Notes (optional)'}</Label>
                <Input value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="outline" onClick={() => setOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
                <Button onClick={() => saveMutation.mutate(editing)}
                  disabled={!editing.holiday_date || saveMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700">
                  {bn ? 'সংরক্ষণ' : 'Save'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
