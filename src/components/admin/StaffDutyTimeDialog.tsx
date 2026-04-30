import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
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

  const diff = timeToMinutes(end) - timeToMinutes(start);
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
              <Input type="time" step={60} value={start} onChange={e => setStart(e.target.value)} />
              {fmt === '12' && <p className="mt-1 text-[11px] text-muted-foreground">{to12h(start)}</p>}
            </div>
            <div>
              <Label className="text-xs">{bn ? 'শেষের সময়' : 'End Time'}</Label>
              <Input type="time" step={60} value={end} onChange={e => setEnd(e.target.value)} />
              {fmt === '12' && <p className="mt-1 text-[11px] text-muted-foreground">{to12h(end)}</p>}
            </div>
          </div>
          <div className="p-3 bg-muted/40 rounded-2xl text-sm">
            <strong>{bn ? 'মোট ডিউটি:' : 'Total Duty:'}</strong>{' '}
            {(() => {
              const d = diff > 0 ? diff : (diff < 0 ? diff + 24 * 60 : 0);
              if (d <= 0) return '-';
              const h = Math.floor(d / 60);
              const m = d % 60;
              const toBn = (n: number) => bn ? String(n).replace(/[0-9]/g, (c) => '০১২৩৪৫৬৭৮৯'[+c]) : String(n);
              return bn
                ? `${toBn(h)} ঘন্টা ${toBn(m)} মিনিট`
                : `${h}h ${m}m`;
            })()}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => save(false)} onDoubleClick={(e) => e.preventDefault()} disabled={saving || diff === 0}>
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
