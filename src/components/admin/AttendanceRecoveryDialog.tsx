import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { History, CheckCircle2, AlertTriangle, Copy, Check, RefreshCw } from 'lucide-react';
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

  const totalRecords = recoveryRecords.length;

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
      toast.success(bn ? 'সকল হারানো হাজিরা সফলভাবে ডাটাবেজে ফিরিয়ে আনা হয়েছে!' : 'Attendance recovered successfully!');
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
    navigator.clipboard.writeText('supabase/migrations/20261020000000_recover_missing_attendance.sql');
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
            {bn ? 'হারানো হাজিরা পুনরুদ্ধার (সেপ্টেম্বর ও অক্টোবর)' : 'Recover Missing Attendance (Sept & Oct)'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-foreground/90 space-y-2">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {bn
                  ? 'আজকের ব্যাকআপ রিস্টোরে ১,০০০ রো লিমিটের কারণে সেপ্টেম্বর ও অক্টোবর মাসের যে হাজিরার ডাটা বাদ পড়েছিল, তা এখানে ১-ক্লিকে ফিরিয়ে আনা যাবে।'
                  : 'Recover attendance data for Sept & Oct that was missed due to the previous 1000-row backup limit.'}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-2.5 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {bn ? 'যা যা পুনরুদ্ধার করা হবে:' : 'What will be recovered:'}
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <span className="font-medium text-foreground">{bn ? 'সেপ্টেম্বর ২০২৬:' : 'September 2026:'}</span>{' '}
                {bn
                  ? '১৮ জন স্টাফের অনুমোদিত ও পরিশোধিত বেতন শিটের নির্ভুল হিসাব অনুযায়ী ৫৪০টি হাজিরার রেকর্ড।'
                  : '540 records matching the approved & paid salary sheet.'}
              </li>
              <li>
                <span className="font-medium text-foreground">{bn ? 'অক্টোবর ২০২৬:' : 'October 2026:'}</span>{' '}
                {bn
                  ? '১ থেকে ১৯ অক্টোবর পর্যন্ত ১৭ জন কর্মরত স্টাফের ৩২৩টি কর্মদিবস ও ছুটির রেকর্ড।'
                  : '323 records for Oct 1 to 19.'}
              </li>
              <li>
                <span className="font-medium text-foreground">{bn ? 'নিরাপত্তা নিশ্চিতকরণ:' : 'Safety Guarantee:'}</span>{' '}
                {bn
                  ? 'বিদ্যমান থাকা কোনো রেকর্ড পরিবর্তন বা মুছে ফেলা হবে না (ON CONFLICT DO NOTHING)।'
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
                  ? `মোট ${insertedCount} টি হাজিরার রেকর্ড সফলভাবে রিস্টোর ও সিঙ্ক করা হয়েছে!`
                  : `Successfully restored ${insertedCount} attendance records!`}
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
              {bn ? 'SQL ফাইল রেফারেন্স' : 'SQL File Ref'}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                disabled={isRunning}
                className="text-xs rounded-xl"
              >
                {bn ? 'বন্ধ করুন' : 'Close'}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleRestore}
                disabled={isRunning}
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
                    {bn ? 'হাজিরা পুনরুদ্ধার করুন' : 'Restore Attendance'}
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
