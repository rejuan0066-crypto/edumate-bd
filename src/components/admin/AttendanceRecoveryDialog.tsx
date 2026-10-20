import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { History, CheckCircle2, AlertTriangle, Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import recoveryRecords from '@/lib/attendanceRecoveryData.json';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bn?: boolean;
}

export default function AttendanceRecoveryDialog({ open, onOpenChange, bn = true }: Props) {
  const qc = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [insertedCount, setInsertedCount] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [syntheticCount, setSyntheticCount] = useState<number | null>(null);
  const [isCheckingSynthetic, setIsCheckingSynthetic] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const totalRecords = recoveryRecords.length;

  const checkSynthetic = async () => {
    try {
      setIsCheckingSynthetic(true);
      const { count, error } = await supabase
        .from('attendance_records')
        .select('*', { count: 'exact', head: true })
        .gte('attendance_date', '2026-10-04')
        .lte('attendance_date', '2026-10-19');

      if (!error) {
        setSyntheticCount(count ?? 0);
      }
    } catch (e) {
      console.error('Check synthetic error:', e);
    } finally {
      setIsCheckingSynthetic(false);
    }
  };

  useEffect(() => {
    if (open) {
      checkSynthetic();
    }
  }, [open]);

  const handlePurgeSynthetic = async () => {
    setIsPurging(true);
    try {
      const { error } = await supabase
        .from('attendance_records')
        .delete()
        .gte('attendance_date', '2026-10-04')
        .lte('attendance_date', '2026-10-19');

      if (error) throw error;

      toast.success(
        bn
          ? '৪ থেকে ১৯ অক্টোবরের সকল অতিরিক্ত রেকর্ড সফলভাবে মুছে ফেলা হয়েছে! হাজিরা এখন ৩ অক্টোবর পর্যন্ত সীমাবদ্ধ।'
          : 'Attendance from Oct 4 to Oct 19 purged successfully!'
      );
      setSyntheticCount(0);
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['salary-attendance'] });
      qc.invalidateQueries({ queryKey: ['salary-records'] });
    } catch (err: any) {
      toast.error(bn ? 'মুছে ফেলতে সমস্যা হয়েছে' : 'Failed to delete records', {
        description: err?.message,
      });
    } finally {
      setIsPurging(false);
    }
  };

  const handleRestore = async () => {
    setIsRunning(true);
    setProgress(0);
    setInsertedCount(null);

    const batchSize = 50;
    let successful = 0;

    try {
      for (let i = 0; i < recoveryRecords.length; i += batchSize) {
        const chunk = recoveryRecords.slice(i, i + batchSize).map((r) => ({
          ...r,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        const { error } = await supabase
          .from('attendance_records')
          .upsert(chunk as any, {
            onConflict: 'attendance_date,entity_type,entity_id,shift',
            ignoreDuplicates: true,
          });

        if (error) {
          console.error('Batch insert error:', error);
          throw error;
        }

        successful += chunk.length;
        setProgress(Math.round((successful / totalRecords) * 100));
      }

      setInsertedCount(successful);
      toast.success(
        bn
          ? '৩ অক্টোবর পর্যন্ত সকল হারানো রিয়েল হাজিরা ডাটাবেজে ফিরিয়ে আনা হয়েছে!'
          : 'Attendance up to Oct 3 recovered successfully!'
      );
      qc.invalidateQueries({ queryKey: ['attendance'] });
      qc.invalidateQueries({ queryKey: ['salary-attendance'] });
      qc.invalidateQueries({ queryKey: ['salary-records'] });
    } catch (err: any) {
      toast.error(bn ? 'হাজিরা রিস্টোর করতে সমস্যা হয়েছে' : 'Failed to restore attendance', {
        description: err?.message,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopySqlHint = () => {
    navigator.clipboard.writeText('supabase/migrations/20261020040000_remove_synthetic_october_attendance.sql');
    setCopied(true);
    toast.success(bn ? 'মাইগ্রেশন ফাইল পাথ কপি হয়েছে' : 'Path copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-[28px] p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg font-bold">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <History className="h-5 w-5" />
            </div>
            {bn ? 'রিয়েল হাজিরা সংরক্ষণ ও ব্যবস্থাপনা (৩ অক্টোবর পর্যন্ত)' : 'Attendance Management (Up to Oct 3)'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Synthetic Alert / Clean State */}
          {syntheticCount !== null && syntheticCount > 0 ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-sm text-destructive">
                    {bn ? 'অতিরিক্ত হাজিরা সনাক্ত হয়েছে (৪ – ১৯ অক্টোবর)' : 'Synthetic Attendance Detected (Oct 4 - 19)'}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {bn
                      ? `ডাটাবেজে ৪ থেকে ১৯ অক্টোবর পর্যন্ত মোট ${syntheticCount}টি অতিরিক্ত রেকর্ড বিদ্যমান। ৩ অক্টোবর পর্যন্ত রিয়েল হাজিরা রেখে বাকিগুলো পরিষ্কার করতে নিচের লাল বাটনে ক্লিক করুন:`
                      : `Found ${syntheticCount} records between Oct 4 and Oct 19. Purge them to keep attendance strictly up to Oct 3.`}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handlePurgeSynthetic}
                  disabled={isPurging}
                  className="text-xs rounded-xl font-medium shadow-sm hover:bg-destructive/90"
                >
                  {isPurging ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      {bn ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...'}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      {bn ? `৪–১৯ অক্টোবরের ${syntheticCount}টি অতিরিক্ত রেকর্ড মুছুন` : 'Purge Oct 4-19 Records'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : syntheticCount === 0 ? (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>
                {bn
                  ? 'ডাটাবেজে ৪ থেকে ১৯ অক্টোবরের কোনো অতিরিক্ত হাজিরা নেই। সকল হাজিরা ৩ অক্টোবর পর্যন্ত সুরক্ষিত।'
                  : 'No synthetic attendance from Oct 4-19. Records strictly up to Oct 3.'}
              </span>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-2.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {bn ? 'রিয়েল হাজিরা সংকলন বিবরণ (মোট ৫৯১টি):' : 'Verified Attendance Summary (591 records):'}
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <span className="font-medium text-foreground">{bn ? 'সেপ্টেম্বর ২০২৬:' : 'September 2026:'}</span>{' '}
                {bn
                  ? '১৮ জন স্টাফের অনুমোদিত ও পরিশোধিত বেতন শিট অনুযায়ী ৫৪০টি রিয়েল হাজিরা রেকর্ড।'
                  : '540 records matching approved & paid salary sheets.'}
              </li>
              <li>
                <span className="font-medium text-foreground">{bn ? 'অক্টোবর ২০২৬ (১-৩ অক্টোবর):' : 'October 2026 (Oct 1-3):'}</span>{' '}
                {bn
                  ? '১ থেকে ৩ অক্টোবর পর্যন্ত ১৭ জন কর্মরত স্টাফের ৫১টি রিয়েল রেকর্ড (৩ অক্টোবরের পর কোনো অতিরিক্ত রেকর্ড যোগ হবে না)।'
                  : '51 verified records up to October 3.'}
              </li>
              <li>
                <span className="font-medium text-foreground">{bn ? 'নিরাপত্তা নিশ্চিতকরণ:' : 'Safety Guarantee:'}</span>{' '}
                {bn
                  ? 'বিদ্যমান থাকা কোনো রেকর্ড পরিবর্তন বা বিকৃত করা হবে না (ON CONFLICT DO NOTHING)।'
                  : 'Existing records will not be overwritten.'}
              </li>
            </ul>
          </div>

          {isRunning && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{bn ? 'ডাটাবেজে রিস্টোর হচ্ছে...' : 'Restoring to database...'}</span>
                <span className="font-semibold text-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {insertedCount !== null && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
              <span>
                {bn
                  ? `মোট ${insertedCount} টি রিয়েল হাজিরার রেকর্ড সফলভাবে রিস্টোর ও সিঙ্ক করা হয়েছে!`
                  : `Successfully restored ${insertedCount} verified attendance records!`}
              </span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopySqlHint}
              className="text-xs rounded-xl"
            >
              {copied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {bn ? 'ক্লিনআপ SQL রেফারেন্স' : 'Cleanup SQL Ref'}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isRunning || isPurging}
                className="text-xs rounded-xl"
              >
                {bn ? 'বন্ধ করুন' : 'Close'}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleRestore}
                disabled={isRunning || isPurging}
                className="text-xs rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-md font-medium"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    {bn ? 'রিস্টোর হচ্ছে...' : 'Restoring...'}
                  </>
                ) : (
                  <>
                    <History className="h-3.5 w-3.5 mr-1.5" />
                    {bn ? '৩ অক্টোবর পর্যন্ত রিস্টোর' : 'Restore Up to Oct 3'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
