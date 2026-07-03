import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarOff, Save, Users, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { bn as bnLocale } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface Entity { id: string; name_bn?: string; name_en?: string; }

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  entities: Entity[];
  entityType: 'student' | 'staff';
  shift: string;
  bn?: boolean;
  mode?: 'leave' | 'present';
  onApplied?: (firstDateKey: string) => void;
}

export default function BulkHolidayDialog({ open, onOpenChange, entities, entityType, shift, bn = true, mode = 'leave', onApplied }: Props) {
  const isLeave = mode === 'leave';
  const accent = isLeave ? 'blue' : 'emerald';
  const qc = useQueryClient();
  const [dates, setDates] = useState<Date[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [reason, setReason] = useState('');

  const allSelected = selectedIds.length === entities.length && entities.length > 0;
  const toggleAll = () => setSelectedIds(allSelected ? [] : entities.map(e => e.id));
  const toggleOne = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const dateKeys = useMemo(() => dates.map(d => format(d, 'yyyy-MM-dd')), [dates]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (dateKeys.length === 0 || selectedIds.length === 0) return 0;
      let count = 0;
      for (const dk of dateKeys) {
        const { error: delErr } = await supabase.from('attendance_records')
          .delete().eq('attendance_date', dk).eq('entity_type', entityType).in('entity_id', selectedIds);
        if (delErr) throw delErr;
        const records = selectedIds.map(id => ({
          attendance_date: dk, entity_type: entityType, entity_id: id,
          status: isLeave ? 'leave' : 'present', shift,
          ...(isLeave ? {
            leave_type: 'other',
            leave_reason: reason || (bn ? 'বিশেষ দিন / সাধারণ ছুটি' : 'Special day / general holiday'),
          } : {}),
        }));
        const { error } = await supabase.from('attendance_records').insert(records);
        if (error) throw error;
        count += records.length;
      }
      return count;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(isLeave
        ? (bn ? `${count} টি হাজিরায় ছুটি দেওয়া হয়েছে` : `Marked ${count} entries on leave`)
        : (bn ? `${count} টি হাজিরায় উপস্থিতি দেওয়া হয়েছে` : `Marked ${count} entries present`));
      const firstKey = [...dateKeys].sort()[0];
      setDates([]); setSelectedIds([]); setReason('');
      onOpenChange(false);
      if (firstKey) onApplied?.(firstKey);
    },
    onError: (e: any) => toast.error(e?.message || (bn ? 'সেভ করতে সমস্যা' : 'Failed to save')),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-[28px] p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2">
            {isLeave
              ? <CalendarOff className="h-5 w-5 text-blue-600" />
              : <CheckCircle2 className="h-5 w-5 text-emerald-600" />}
            {isLeave
              ? (bn ? 'বিশেষ দিনের ছুটি' : 'Special-day Holiday')
              : (bn ? 'একসাথে উপস্থিতি' : 'Bulk Present')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid md:grid-cols-2 gap-4 px-5 pb-5 max-h-[70vh] overflow-y-auto">
          {/* Date selection */}
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              {bn ? 'তারিখ নির্বাচন করুন (একাধিক)' : 'Select dates (multiple)'}
            </p>
            <div className="rounded-2xl border border-border/40 p-2 overflow-hidden">
              <Calendar
                mode="multiple"
                selected={dates}
                onSelect={(d) => setDates((d as Date[]) || [])}
                locale={bn ? bnLocale : undefined}
                className="pointer-events-auto p-2 w-full"
                classNames={{
                  table: 'w-full border-collapse',
                  head_row: 'grid grid-cols-7',
                  head_cell: 'text-muted-foreground font-medium text-[0.65rem] text-center h-8 flex items-center justify-center min-w-0',
                  row: 'grid grid-cols-7 mt-1',
                  cell: 'relative text-center text-sm p-0 flex items-center justify-center min-w-0',
                  day: 'h-9 w-9 mx-auto p-0 font-normal rounded-xl transition-all duration-200 inline-flex items-center justify-center hover:bg-primary/10 hover:text-primary aria-selected:opacity-100',
                }}
              />
            </div>
            {dateKeys.length > 0 && (
              <p className={`text-[11px] mt-2 ${isLeave ? 'text-blue-600' : 'text-emerald-600'}`}>
                {bn ? `${dateKeys.length} টি তারিখ নির্বাচিত` : `${dateKeys.length} date(s) selected`}
              </p>
            )}
            {isLeave && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">{bn ? 'ছুটির কারণ (ঐচ্ছিক)' : 'Reason (optional)'}</p>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={bn ? 'যেমন: জাতীয় দিবস' : 'e.g. National holiday'}
                  className="w-full text-sm rounded-xl border border-border/50 bg-background/80 px-3 py-2 outline-none focus:border-blue-400"
                />
              </div>
            )}
          </div>

          {/* Entity selection */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {isLeave ? (bn ? 'কাকে কাকে ছুটি দেবেন' : 'Who gets the leave') : (bn ? 'কাকে কাকে উপস্থিত দেবেন' : 'Who to mark present')}
              </p>
              <button type="button" onClick={toggleAll} className={`text-[11px] font-medium hover:underline ${isLeave ? 'text-blue-600' : 'text-emerald-600'}`}>
                {allSelected ? (bn ? 'সব বাদ' : 'Clear all') : (bn ? 'সবাই নির্বাচন' : 'Select all')}
              </button>
            </div>
            <div className="rounded-2xl border border-border/40 p-2 space-y-0.5 overflow-y-auto max-h-[320px]">
              {entities.length === 0 && (
                <p className="text-xs text-muted-foreground p-3 text-center">{bn ? 'কোনো তালিকা নেই' : 'No one in list'}</p>
              )}
              {entities.map((e) => {
                const checked = selectedIds.includes(e.id);
                return (
                  <label key={e.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer transition ${checked ? (isLeave ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30') : 'hover:bg-muted/60'}`}>
                    <Checkbox checked={checked} onCheckedChange={() => toggleOne(e.id)} />
                    <span className="text-sm truncate">{bn ? (e.name_bn || e.name_en) : (e.name_en || e.name_bn)}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              {bn ? `${selectedIds.length} জন নির্বাচিত` : `${selectedIds.length} selected`}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 pb-5">
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            {bn ? 'বাতিল' : 'Cancel'}
          </Button>
          <Button
            className={`rounded-full text-white ${isLeave ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            disabled={mutation.isPending || dateKeys.length === 0 || selectedIds.length === 0}
            onClick={() => mutation.mutate()}
          >
            <Save className="h-4 w-4 mr-1" />
            {isLeave ? (bn ? 'ছুটি দিন' : 'Mark leave') : (bn ? 'উপস্থিত দিন' : 'Mark present')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
