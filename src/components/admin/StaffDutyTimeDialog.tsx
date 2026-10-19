import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Timer, Save, RotateCcw, Calendar, Clock, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { saveSpecialShiftsBatch, deleteSpecialShift, fetchSpecialShifts } from '@/lib/shiftResolution';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staff: { id: string; name_bn?: string; name_en?: string; duty_start_time?: string | null; duty_end_time?: string | null; staff_category?: string | null } | null;
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
  const [effectiveFrom, setEffectiveFrom] = useState<string>(new Date().toISOString().slice(0, 10));
  const [effectiveTo, setEffectiveTo] = useState<string>('');
  const [isOngoing, setIsOngoing] = useState(true);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [existingShiftId, setExistingShiftId] = useState<string | null>(null);
  const [fmt, setFmt] = useState<'12' | '24'>(() => (localStorage.getItem('dutyTimeFmt') as '12' | '24') || '24');
  const qc = useQueryClient();

  useEffect(() => { localStorage.setItem('dutyTimeFmt', fmt); }, [fmt]);

  useEffect(() => {
    if (open && staff) {
      setStart(staff.duty_start_time || '09:00');
      setEnd(staff.duty_end_time || '17:00');
      setEffectiveFrom(new Date().toISOString().slice(0, 10));
      setEffectiveTo('');
      setIsOngoing(true);
      setNote('');

      // Check if there is already an active special shift in staff_special_shifts
      (async () => {
        try {
          const shifts = await fetchSpecialShifts(supabase);
          const found = shifts.find((s) => s.staff_id === staff.id && s.is_active !== false);
          if (found) {
            setExistingShiftId(found.id);
            setStart(found.duty_start_time || staff.duty_start_time || '09:00');
            setEnd(found.duty_end_time || staff.duty_end_time || '17:00');
            if (found.effective_from) setEffectiveFrom(found.effective_from);
            if (found.effective_to) {
              setEffectiveTo(found.effective_to);
              setIsOngoing(false);
            } else {
              setIsOngoing(true);
            }
            if (found.note) setNote(found.note);
          } else {
            setExistingShiftId(null);
          }
        } catch (e) {
          console.warn('Error loading existing special shift:', e);
        }
      })();
    }
  }, [open, staff]);

  if (!staff) return null;

  const startM = timeToMinutes(start);
  const endM = timeToMinutes(end);
  const rawDiff = endM - startM;
  const isOvernight = !!start && !!end && endM <= startM;
  const totalMinutes = !start || !end
    ? 0
    : (rawDiff > 0 ? rawDiff : (start === end ? 24 * 60 : rawDiff + 24 * 60));
  const name = bn ? (staff.name_bn || staff.name_en) : (staff.name_en || staff.name_bn);

  const save = async (clear = false) => {
    setSaving(true);
    try {
      if (clear) {
        if (existingShiftId) {
          await deleteSpecialShift(supabase, existingShiftId);
        }
        await supabase.from('staff').update({
          duty_start_time: null,
          duty_end_time: null,
          updated_at: new Date().toISOString(),
        }).eq('id', staff.id);

        toast.success(bn ? 'বিশেষ ডিউটি শিফট রিসেট করা হয়েছে' : 'Special duty shift cleared');
      } else {
        if (!isOngoing && effectiveTo && effectiveTo < effectiveFrom) {
          throw new Error(bn ? 'সমাপ্তির তারিখ শুরুর তারিখের পূর্বের হতে পারবে না' : 'End date cannot be before start date');
        }

        const shiftPayload = {
          id: existingShiftId || crypto.randomUUID(),
          staff_id: staff.id,
          staff_name: name || null,
          category_key: staff.staff_category || null,
          duty_start_time: start,
          duty_end_time: end,
          effective_from: effectiveFrom,
          effective_to: isOngoing ? null : effectiveTo || null,
          note: note.trim() || null,
          is_active: true,
          created_at: new Date().toISOString(),
        };

        await saveSpecialShiftsBatch(supabase, [shiftPayload]);

        // Keep staff profile in sync for backwards compatibility
        await supabase.from('staff').update({
          duty_start_time: start,
          duty_end_time: end,
          updated_at: new Date().toISOString(),
        }).eq('id', staff.id);

        toast.success(bn ? 'বিশেষ ডিউটি শিফট সংরক্ষিত হয়েছে' : 'Special duty shift saved');
      }

      qc.invalidateQueries({ queryKey: ['staff'] });
      qc.invalidateQueries({ queryKey: ['staff_special_shifts'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['salary'] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || (bn ? 'সমস্যা হয়েছে' : 'An error occurred'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-5">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            {bn ? 'তারিখ অনুযায়ী বিশেষ ডিউটি সময়' : 'Special Duty Shift by Date Range'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            {bn
              ? `${name}-এর জন্য নির্দিষ্ট তারিখের রেঞ্জে বিশেষ ডিউটি সময় নির্ধারণ করুন।`
              : `Assign custom duty hours with effective date range for ${name}.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 pt-1">
          {/* Time Format Toggle */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border text-xs">
            <span className="text-muted-foreground font-medium">{bn ? 'সময়ের ফরম্যাট' : 'Time Format'}</span>
            <div className="inline-flex rounded-full border bg-muted/40 p-0.5 text-xs">
              <button type="button" onClick={() => setFmt('12')} className={`px-2.5 py-0.5 rounded-full transition text-[11px] ${fmt === '12' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground'}`}>12h</button>
              <button type="button" onClick={() => setFmt('24')} className={`px-2.5 py-0.5 rounded-full transition text-[11px] ${fmt === '24' ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground'}`}>24h</button>
            </div>
          </div>

          {/* Start and End Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium mb-1 block">{bn ? 'ডিউটি শুরু' : 'Start Time'}</Label>
              <TimePicker value={start} displayFormat={fmt === '12' ? '12h' : '24h'} onChange={setStart} className="h-8 text-xs" />
            </div>
            <div>
              <Label className="text-xs font-medium mb-1 block">{bn ? 'ডিউটি শেষ' : 'End Time'}</Label>
              <TimePicker value={end} displayFormat={fmt === '12' ? '12h' : '24h'} onChange={setEnd} className="h-8 text-xs" />
            </div>
          </div>

          {/* Date Range Controls */}
          <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-foreground text-[11px] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                {bn ? 'কার্যকর সময়সীমা' : 'Effective Date Range'}
              </span>
              <label className="flex items-center gap-1.5 text-[10px] cursor-pointer text-muted-foreground hover:text-foreground select-none">
                <Checkbox
                  checked={isOngoing}
                  onCheckedChange={(c) => {
                    setIsOngoing(!!c);
                    if (c) setEffectiveTo('');
                  }}
                />
                <span>{bn ? 'চলমান (স্থায়ী)' : 'Ongoing'}</span>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">{bn ? 'শুরু তারিখ' : 'From Date'}</Label>
                <DatePicker className="h-7 text-xs w-full" value={effectiveFrom} onChange={(d) => setEffectiveFrom(d || '')} />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground mb-1 block">{bn ? 'সমাপ্তির তারিখ' : 'To Date'}</Label>
                <DatePicker className="h-7 text-xs w-full" value={effectiveTo} onChange={(d) => setEffectiveTo(d || '')} disabled={isOngoing} placeholder={isOngoing ? (bn ? 'চলমান' : 'Ongoing') : ''} />
              </div>
            </div>
          </div>

          {/* Total Duration Preview */}
          <div className="p-2.5 bg-muted/40 rounded-xl text-xs flex items-center justify-between gap-2">
            <div>
              <span className="text-muted-foreground">{bn ? 'মোট ডিউটি:' : 'Total Duty:'}</span>{' '}
              <strong className="text-foreground">
                {(() => {
                  const d = totalMinutes;
                  if (d <= 0) return '-';
                  const h = Math.floor(d / 60);
                  const m = d % 60;
                  const toBn = (n: number) => bn ? String(n).replace(/[0-9]/g, (c) => '০১২৩৪৫৬৭৮৯'[+c]) : String(n);
                  return bn ? `${toBn(h)} ঘন্টা ${toBn(m)} মিনিট` : `${h}h ${m}m`;
                })()}
              </strong>
            </div>
            {isOvernight && totalMinutes > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-medium whitespace-nowrap">
                {bn ? 'ওভারনাইট ⏵ পরের দিন' : 'Overnight ⏵ next day'}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button className="flex-1 font-semibold" onClick={() => save(false)} disabled={saving || totalMinutes <= 0}>
              <Save className="h-4 w-4 mr-1.5" /> {saving ? (bn ? 'সেভ হচ্ছে...' : 'Saving...') : (bn ? 'বিশেষ শিফট সেভ করুন' : 'Save Special Shift')}
            </Button>
            {(staff.duty_start_time || staff.duty_end_time || existingShiftId) && (
              <Button variant="outline" onClick={() => save(true)} disabled={saving} title={bn ? 'ডিপার্টমেন্ট শিফটে রিসেট করুন' : 'Reset to department shift'}>
                <RotateCcw className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
