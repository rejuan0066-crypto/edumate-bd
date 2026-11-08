import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, RotateCcw, Clock, Trash2, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import {
  DEFAULT_PERIOD_TIMES,
  DEFAULT_BREAK_TIME,
  autoFillMadrasaRoutine,
  clearRoutineAssignmentsOnly,
  clearAllRoutineTimesAndAssignments,
  clearPeriodTimesOnly,
} from './routineDefaults';

interface RoutineSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bn: boolean;
  sessionId?: string | null;
  periodCount?: number;
  breakAfter?: number;
  dayOfWeek?: number;
  onSuccess?: () => void;
}

export const RoutineSetupDialog: React.FC<RoutineSetupDialogProps> = ({
  open,
  onOpenChange,
  bn,
  sessionId,
  periodCount = 8,
  breakAfter = 4,
  dayOfWeek = 0,
  onSuccess,
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const qc = useQueryClient();

  const handleAutoFill = async () => {
    setLoadingAction('autofill');
    try {
      localStorage.removeItem('routine_times_cleared');
      const res = await autoFillMadrasaRoutine({
        supabase,
        sessionId,
        periodCount,
        breakAfter,
        dayOfWeek,
      });
      qc.invalidateQueries({ queryKey: ['all-classes-periods'] });
      qc.invalidateQueries({ queryKey: ['all-class-routines'] });
      qc.invalidateQueries({ queryKey: ['weekly-routine-periods'] });
      toast.success(
        bn
          ? `${res.classCount}টি শ্রেণীর পূর্ণাঙ্গ স্ট্যান্ডার্ড রুটিন সফলভাবে সাজানো হয়েছে!`
          : `Standard routine successfully auto-filled for ${res.classCount} classes!`
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (bn ? 'অটো-ফিল ব্যর্থ হয়েছে' : 'Auto-fill failed'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClearOnly = async () => {
    setLoadingAction('clear');
    try {
      await clearRoutineAssignmentsOnly({
        supabase,
        sessionId,
        periodCount,
        dayOfWeek,
      });
      qc.invalidateQueries({ queryKey: ['all-classes-periods'] });
      qc.invalidateQueries({ queryKey: ['all-class-routines'] });
      qc.invalidateQueries({ queryKey: ['weekly-routine-periods'] });
      toast.success(
        bn
          ? 'রুটিনের বিষয় ও শিক্ষক খালি করা হয়েছে (সময়সূচী অক্ষুণ্ণ রয়েছে)'
          : 'Routine cells cleared while preserving period timings'
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (bn ? 'খালি করতে ব্যর্থ হয়েছে' : 'Failed to clear'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClearAllWithTimes = async () => {
    setLoadingAction('clear-all');
    try {
      localStorage.setItem('routine_times_cleared', 'true');
      await clearAllRoutineTimesAndAssignments({
        supabase,
        periodCount,
        dayOfWeek,
      });
      qc.invalidateQueries({ queryKey: ['all-classes-periods'] });
      qc.invalidateQueries({ queryKey: ['all-class-routines'] });
      qc.invalidateQueries({ queryKey: ['weekly-routine-periods'] });
      toast.success(
        bn
          ? 'সম্পূর্ণ রুটিন রিসেট সম্পন্ন: বিষয়, শিক্ষক ও সময়সূচী খালি করা হয়েছে'
          : 'Complete reset: subjects, teachers and times cleared'
      );
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (bn ? 'রিসেট ব্যর্থ হয়েছে' : 'Reset failed'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleClearTimesOnly = async () => {
    setLoadingAction('clear-times');
    try {
      localStorage.setItem('routine_times_cleared', 'true');
      await clearPeriodTimesOnly({
        supabase,
        periodCount,
      });
      qc.invalidateQueries({ queryKey: ['all-classes-periods'] });
      qc.invalidateQueries({ queryKey: ['all-class-routines'] });
      qc.invalidateQueries({ queryKey: ['weekly-routine-periods'] });
      toast.success(bn ? 'সকল পিরিয়ডের সময়সূচী খালি করা হয়েছে' : 'Period times cleared');
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || (bn ? 'ব্যর্থ হয়েছে' : 'Failed'));
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRestoreTimings = async () => {
    setLoadingAction('timings');
    try {
      localStorage.removeItem('routine_times_cleared');
      localStorage.setItem('routine_period_times', JSON.stringify(DEFAULT_PERIOD_TIMES));
      localStorage.setItem('routine_break_time', JSON.stringify(DEFAULT_BREAK_TIME));

      const { data: routines } = await supabase.from('class_routines').select('id');
      const rIds = (routines || []).map((r: any) => r.id);
      if (rIds.length > 0) {
        for (let p = 1; p <= periodCount; p++) {
          const t = DEFAULT_PERIOD_TIMES[p];
          if (t) {
            await supabase
              .from('routine_periods')
              .update({ start_time: t.start, end_time: t.end })
              .in('routine_id', rIds)
              .eq('period_number', p);
          }
        }
      }

      qc.invalidateQueries({ queryKey: ['all-classes-periods'] });
      qc.invalidateQueries({ queryKey: ['all-class-routines'] });
      toast.success(bn ? 'স্ট্যান্ডার্ড সময়সূচী সফলভাবে রিস্টোর হয়েছে' : 'Standard timetable timings restored');
      onSuccess?.();
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      toast.error(bn ? 'ব্যর্থ হয়েছে' : 'Failed');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-5">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-emerald-600" />
            <span>{bn ? 'রুটিন রিসেট ও সেটআপ ম্যানেজমেন্ট' : 'Routine Reset & Setup'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {bn
              ? 'রুটিন খালি বা রিসেট করার সময় আপনার প্রয়োজন অনুযায়ী নিচের বিকল্পটি বেছে নিন:'
              : 'Choose one of the options below to manage or reset routine structure:'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {/* Option 1: Auto-fill standard routine */}
          <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-900 dark:text-emerald-200">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                <span>{bn ? 'স্ট্যান্ডার্ড মাদরাসা রুটিন সাজান (প্রস্তাবিত)' : 'Auto-Fill Standard Routine'}</span>
              </div>
              <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 leading-relaxed">
                {bn
                  ? 'সকল ১১টি শ্রেণীর রেজিস্টার্ড বিষয় ও স্ট্যান্ডার্ড সময়সূচী দিয়ে পূর্ণাঙ্গ রুটিন সাজিয়ে দেবে। কোনো ঘর খালি থাকবে না।'
                  : 'Populates all 11 classes with registered subjects and 8-period timings.'}
              </p>
            </div>
            <Button
              size="sm"
              className="bg-emerald-700 hover:bg-emerald-800 text-white shrink-0 font-semibold text-xs shadow-xs"
              onClick={handleAutoFill}
              disabled={!!loadingAction}
            >
              {loadingAction === 'autofill' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  <span>{bn ? 'সাজানো হচ্ছে...' : 'Generating...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  <span>{bn ? 'অটো-ফিল করুন' : 'Auto-Fill'}</span>
                </>
              )}
            </Button>
          </div>

          {/* Option 2: Complete Reset (Empty everything including period times) */}
          <div className="p-3.5 rounded-xl border border-red-300 dark:border-red-800 bg-red-50/70 dark:bg-red-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-red-900 dark:text-red-200">
                <Trash2 className="h-4 w-4 text-red-600" />
                <span>{bn ? 'সম্পূর্ণ রিসেট (সময়সূচী, বিষয় ও শিক্ষক সহ সব খালি করুন)' : 'Complete Reset (Clear Times & Cells)'}</span>
              </div>
              <p className="text-[11px] text-red-800/80 dark:text-red-300/80 leading-relaxed">
                {bn
                  ? 'রুটিনের সকল বিষয়, শিক্ষক এবং সকল পিরিয়ডের সময়সূচীর ঘর সম্পূর্ণ খালি হয়ে যাবে।'
                  : 'Empties all subject & teacher assignments and clears all period timings.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-red-400 text-red-800 hover:bg-red-100 dark:text-red-200 shrink-0 font-semibold text-xs"
              onClick={handleClearAllWithTimes}
              disabled={!!loadingAction}
            >
              {loadingAction === 'clear-all' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  <span>{bn ? 'রিসেট হচ্ছে...' : 'Resetting...'}</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  <span>{bn ? 'সব খালি করুন' : 'Clear All'}</span>
                </>
              )}
            </Button>
          </div>

          {/* Option 3: Clear assignments only */}
          <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-amber-900 dark:text-amber-200">
                <RotateCcw className="h-4 w-4 text-amber-600" />
                <span>{bn ? 'শুধু বিষয় ও শিক্ষক খালি করুন (সময়সূচী অক্ষুণ্ণ থাকবে)' : 'Clear Cells Only (Keep Timings)'}</span>
              </div>
              <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 leading-relaxed">
                {bn
                  ? 'রুটিনের সকল বিষয় ও শিক্ষক মুছে ফেলা হবে, কিন্তু সময়সূচী ও পিরিয়ডের কাঠামো ১০০% অক্ষুণ্ণ থাকবে।'
                  : 'Clears subject and teacher entries while keeping period timings completely intact.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-amber-400 text-amber-800 hover:bg-amber-100 dark:text-amber-200 shrink-0 font-semibold text-xs"
              onClick={handleClearOnly}
              disabled={!!loadingAction}
            >
              {loadingAction === 'clear' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  <span>{bn ? 'খালি হচ্ছে...' : 'Clearing...'}</span>
                </>
              ) : (
                <>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  <span>{bn ? 'ঘর খালি করুন' : 'Clear Cells'}</span>
                </>
              )}
            </Button>
          </div>

          {/* Option 4: Clear timings only */}
          <div className="p-3.5 rounded-xl border border-orange-300 dark:border-orange-800 bg-orange-50/70 dark:bg-orange-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-orange-900 dark:text-orange-200">
                <Clock className="h-4 w-4 text-orange-600" />
                <span>{bn ? 'শুধু সময়সূচীর ঘর খালি করুন' : 'Clear Timings Only'}</span>
              </div>
              <p className="text-[11px] text-orange-800/80 dark:text-orange-300/80 leading-relaxed">
                {bn
                  ? 'সকল পিরিয়ডের সময়সূচী খালি হয়ে যাবে (বিষয় ও শিক্ষক অপরিবর্তিত থাকবে)।'
                  : 'Clears only the period start & end timings without touching subjects and teachers.'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-orange-400 text-orange-800 hover:bg-orange-100 dark:text-orange-200 shrink-0 font-semibold text-xs"
              onClick={handleClearTimesOnly}
              disabled={!!loadingAction}
            >
              {loadingAction === 'clear-times' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  <span>{bn ? 'খালি হচ্ছে...' : 'Clearing...'}</span>
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  <span>{bn ? 'সময় খালি করুন' : 'Clear Times'}</span>
                </>
              )}
            </Button>
          </div>

          {/* Option 3: Restore Default Timings */}
          <div className="p-3.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-xs text-sky-900 dark:text-sky-200">
                <Clock className="h-4 w-4 text-sky-600" />
                <span>{bn ? 'স্ট্যান্ডার্ড সময়সূচী রিস্টোর করুন' : 'Restore Default Timings'}</span>
              </div>
              <p className="text-[11px] text-sky-800/80 dark:text-sky-300/80 leading-relaxed">
                {bn
                  ? '১ম থেকে ৮ম পিরিয়ড ও বিরতির সময়কে স্ট্যান্ডার্ড সময়ে (০৯:০০ AM - ০৪:১০ PM) রিস্টোর করবে।'
                  : 'Restores period start and end timings to standard defaults (09:00 AM - 04:10 PM).'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-sky-400 text-sky-800 hover:bg-sky-100 dark:text-sky-200 shrink-0 font-semibold text-xs"
              onClick={handleRestoreTimings}
              disabled={!!loadingAction}
            >
              {loadingAction === 'timings' ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  <span>{bn ? 'রিস্টোর হচ্ছে...' : 'Restoring...'}</span>
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  <span>{bn ? 'সময় রিস্টোর' : 'Restore Time'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
