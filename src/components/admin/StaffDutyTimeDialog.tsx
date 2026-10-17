import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Timer, Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staff: { id: string; name_bn?: string; name_en?: string; duty_start_time?: string | null; duty_end_time?: string | null } | null;
  bn?: boolean;
}

const timeToMinutes = (t: string) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const pad2 = (n: number) => String(n).padStart(2, '0');

// Parse "HH:MM" (24h) into 12h parts
const parse12h = (t: string) => {
  const [hStr, mStr] = (t || '00:00').split(':');
  let h24 = parseInt(hStr || '0', 10);
  const m = parseInt(mStr || '0', 10);
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return { h12, m, period };
};

// Compose 12h parts back into "HH:MM" (24h)
const compose24h = (h12: number, m: number, period: 'AM' | 'PM') => {
  let h24 = h12 % 12;
  if (period === 'PM') h24 += 12;
  return `${pad2(h24)}:${pad2(m)}`;
};



export default function StaffDutyTimeDialog({ open, onOpenChange, staff, bn = true }: Props) {
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('17:00');
  const [saving, setSaving] = useState(false);
  const [fmt, setFmt] = useState<'12' | '24'>(() => (localStorage.getItem('dutyTimeFmt') as '12' | '24') || '24');
  const qc = useQueryClient();

  useEffect(() => { localStorage.setItem('dutyTimeFmt', fmt); }, [fmt]);

  const to12h = (t: string) => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = parseInt(mStr || '0', 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12; if (h === 0) h = 12;
    const pad = (n: number) => String(n).padStart(2, '0');
    const toBn = (s: string) => bn ? s.replace(/[0-9]/g, (c) => '০১২৩৪৫৬৭৮৯'[+c]) : s;
    return `${toBn(pad(h))}:${toBn(pad(m))} ${bn ? (ampm === 'AM' ? 'পূর্বাহ্ন' : 'অপরাহ্ন') : ampm}`;
  };

  useEffect(() => {
    if (open && staff) {
      setStart(staff.duty_start_time || '09:00');
      setEnd(staff.duty_end_time || '17:00');
    }
  }, [open, staff]);

  if (!staff) return null;

  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);
  const rawDiff = endM - startM;
  // Overnight: end ≤ start ⇒ next-day end. start==end with both set ⇒ treat as 24h.
  const isOvernight = !!start && !!end && endM <= startM;
  const totalMinutes = !start || !end
    ? 0
    : (rawDiff > 0 ? rawDiff : (start === end ? 24 * 60 : rawDiff + 24 * 60));
  const diff = totalMinutes; // legacy alias used below
  const name = bn ? (staff.name_bn || staff.name_en) : (staff.name_en || staff.name_bn);

  const save = async (clear = false) => {
    setSaving(true);
    const { error } = await supabase.from('staff').update({
      duty_start_time: clear ? null : start,
      duty_end_time: clear ? null : end,
      updated_at: new Date().toISOString(),
    }).eq('id', staff.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(clear
      ? (bn ? 'কাস্টম ডিউটি টাইম রিসেট করা হয়েছে' : 'Custom duty time cleared')
      : (bn ? 'ডিউটি টাইম সেভ হয়েছে' : 'Duty time saved'));
    qc.invalidateQueries({ queryKey: ['staff'] });
    qc.invalidateQueries({ queryKey: ['attendance'] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-[38px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            {bn ? 'ব্যক্তিগত ডিউটি সময়' : 'Personal Duty Time'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm font-medium">{name}</p>
          <p className="text-[11px] text-muted-foreground">
            {bn
              ? 'এই স্টাফের জন্য আলাদা ডিউটি সময় সেট করলে তা ক্যাটেগরি ডিফল্টের পরিবর্তে ব্যবহৃত হবে (অ্যাটেন্ডেন্স ও বিলম্ব হিসাবে)।'
              : 'Setting a custom time will override the category default for attendance and late calculation.'}
          </p>
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">{bn ? 'সময়ের ফরম্যাট' : 'Time Format'}</Label>
            <div className="inline-flex rounded-full border bg-muted/40 p-0.5 text-xs">
              <button type="button" onClick={() => setFmt('12')} className={`px-3 py-1 rounded-full transition ${fmt === '12' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>12h</button>
              <button type="button" onClick={() => setFmt('24')} className={`px-3 py-1 rounded-full transition ${fmt === '24' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>24h</button>
            </div>
          </div>
           <div className="grid grid-cols-2 gap-3">
             <div>
               <Label className="text-xs">{bn ? 'শুরুর সময়' : 'Start Time'}</Label>
               <TimePicker value={start} displayFormat={fmt === '12' ? '12h' : '24h'} onChange={setStart} />
             </div>
             <div>
               <Label className="text-xs">{bn ? 'শেষের সময়' : 'End Time'}</Label>
               <TimePicker value={end} displayFormat={fmt === '12' ? '12h' : '24h'} onChange={setEnd} />
             </div>
           </div>
          <div className="p-3 bg-muted/40 rounded-2xl text-sm flex items-center justify-between gap-2">
            <div>
              <strong>{bn ? 'মোট ডিউটি:' : 'Total Duty:'}</strong>{' '}
              {(() => {
                const d = totalMinutes;
                if (d <= 0) return '-';
                const h = Math.floor(d / 60);
                const m = d % 60;
                const toBn = (n: number) => bn ? String(n).replace(/[0-9]/g, (c) => '০১২৩৪৫৬৭৮৯'[+c]) : String(n);
                return bn ? `${toBn(h)} ঘন্টা ${toBn(m)} মিনিট` : `${h}h ${m}m`;
              })()}
            </div>
            {isOvernight && totalMinutes > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium whitespace-nowrap">
                {bn ? 'ওভারনাইট ⏵ পরের দিন' : 'Overnight ⏵ next day'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => save(false)} onDoubleClick={(e) => e.preventDefault()} disabled={saving || totalMinutes <= 0}>
              <Save className="h-4 w-4 mr-1" /> {bn ? 'সেভ করুন' : 'Save'}
            </Button>
            {(staff.duty_start_time || staff.duty_end_time) && (
              <Button variant="outline" onClick={() => save(true)} disabled={saving} title={bn ? 'ক্যাটেগরি ডিফল্টে ফিরে যান' : 'Reset to category default'}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
