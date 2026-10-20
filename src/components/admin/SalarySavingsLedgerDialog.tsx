import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NumberInput } from '@/components/ui/number-input';
import {
  PiggyBank,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Save,
  X,
  History,
} from 'lucide-react';
import { toast } from 'sonner';
import { getEndMonthFromStart } from '@/lib/salarySavingsHelper';

export interface StaffSavingsGroup {
  staff_id: string;
  staffMember: any;
  primaryConfig: any;
  allConfigs: any[];
  totalSaved: number;
  ledgerEntries: any[];
  depositedMonthsCount: number;
  isActive: boolean;
  isComplete: boolean;
  monthlyAmount: number;
  durationMonths: number;
  startMonth: string;
  isResigned?: boolean;
  resignDate?: string | null;
}

const MONTHS_MAP: Record<string, { bn: string; en: string }> = {
  '01': { bn: 'জানুয়ারি', en: 'January' },
  '02': { bn: 'ফেব্রুয়ারি', en: 'February' },
  '03': { bn: 'মার্চ', en: 'March' },
  '04': { bn: 'এপ্রিল', en: 'April' },
  '05': { bn: 'মে', en: 'May' },
  '06': { bn: 'জুন', en: 'June' },
  '07': { bn: 'জুলাই', en: 'July' },
  '08': { bn: 'আগস্ট', en: 'August' },
  '09': { bn: 'সেপ্টেম্বর', en: 'September' },
  '10': { bn: 'অক্টোবর', en: 'October' },
  '11': { bn: 'নভেম্বর', en: 'November' },
  '12': { bn: 'ডিসেম্বর', en: 'December' },
};

export const formatMonthLabel = (my: string, bn = true): string => {
  if (!my || !my.includes('-')) return my || '-';
  const [y, m] = my.split('-');
  const mo = MONTHS_MAP[m];
  if (!mo) return my;
  const toBnDigits = (n: any) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);
  return bn ? `${mo.bn} ${toBnDigits(y)}` : `${mo.en} ${y}`;
};

export const getJoiningMonth = (joiningDate?: string | null): string | null => {
  if (!joiningDate) return null;
  const str = String(joiningDate).trim();
  const match = str.match(/^(\d{4}-\d{2})/);
  return match ? match[1] : null;
};

const toBnDigits = (n: any) => String(n).replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)]);

// Helper: generate array of consecutive YYYY-MM
function generateMonthRange(startMonthYear: string, count: number): string[] {
  if (!startMonthYear || !/^\d{4}-\d{2}$/.test(startMonthYear) || count <= 0) return [];
  const [y, m] = startMonthYear.split('-').map(Number);
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    const totalM = y * 12 + (m - 1) + i;
    const year = Math.floor(totalM / 12);
    const mo = (totalM % 12) + 1;
    result.push(`${year}-${String(mo).padStart(2, '0')}`);
  }
  return result;
}

export function SalarySavingsLedgerDialog({
  open,
  onOpenChange,
  group,
  currentMonthYear,
  bn = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: StaffSavingsGroup | null;
  currentMonthYear: string;
  bn?: boolean;
}) {
  const queryClient = useQueryClient();
  const [addMonthYear, setAddMonthYear] = useState<string>('');
  const [addAmount, setAddAmount] = useState<number>(0);
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{ id: string; month_year: string; amount: number } | null>(null);

  const joiningDate = group?.staffMember?.joining_date;
  const joiningMonth = useMemo(() => getJoiningMonth(joiningDate), [joiningDate]);

  // Recalculate total_saved for the primaryConfig based on current ledger
  const syncTotalSaved = async (savingsId: string, staffId: string) => {
    try {
      const { data: allLedgers } = await supabase
        .from('salary_savings_ledger')
        .select('amount')
        .eq('staff_id', staffId);

      const sum = (allLedgers || []).reduce((acc: number, l: any) => acc + Number(l.amount || 0), 0);
      await supabase
        .from('salary_savings')
        .update({ total_saved: sum, updated_at: new Date().toISOString() })
        .eq('id', savingsId);
    } catch (e) {
      console.warn('Failed to sync total_saved:', e);
    }
  };

  // 1. Add missing or new month deposit
  const addDepositMutation = useMutation({
    mutationFn: async ({ monthYear, amount }: { monthYear: string; amount: number }) => {
      if (!group?.staff_id) {
        throw new Error(bn ? 'স্টাফ পাওয়া যায়নি' : 'Staff not found');
      }
      if (!monthYear || !/^\d{4}-\d{2}$/.test(monthYear)) {
        throw new Error(bn ? 'সঠিক মাস নির্বাচন করুন (YYYY-MM)' : 'Invalid month format');
      }
      if (!amount || amount <= 0) {
        throw new Error(bn ? 'সঠিক পরিমাণ দিন' : 'Enter a valid amount');
      }

      let savingsId = group?.primaryConfig?.id;
      if (!savingsId) {
        // Auto-create a salary_savings config for this staff
        const { data: newCfg, error: cfgErr } = await supabase
          .from('salary_savings')
          .insert({
            staff_id: group.staff_id,
            monthly_amount: amount,
            duration_months: 12,
            start_month: monthYear,
            is_active: true,
          })
          .select('id')
          .single();
        if (cfgErr) throw cfgErr;
        savingsId = newCfg.id;
      }

      // Check if entry already exists for this staff and month
      const { data: existing } = await supabase
        .from('salary_savings_ledger')
        .select('id, amount')
        .eq('staff_id', group.staff_id)
        .eq('month_year', monthYear)
        .maybeSingle();

      if (existing) {
        // Update existing entry
        const { error: updErr } = await supabase
          .from('salary_savings_ledger')
          .update({ amount })
          .eq('id', existing.id);
        if (updErr) throw updErr;
      } else {
        // Insert new entry
        const { error: insErr } = await supabase
          .from('salary_savings_ledger')
          .insert({
            savings_id: savingsId,
            staff_id: group.staff_id,
            month_year: monthYear,
            amount,
          });
        if (insErr) throw insErr;
      }

      await syncTotalSaved(savingsId, group.staff_id);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['salary-savings-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings'] });
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
      toast.success(
        bn
          ? `${formatMonthLabel(vars.monthYear, true)}-এর ডিপোজিট ৳${toBnDigits(vars.amount)} সফলভাবে যুক্ত হয়েছে`
          : `Deposit for ${formatMonthLabel(vars.monthYear, false)} saved successfully`
      );
      setIsAddFormOpen(false);
      setAddMonthYear('');
      setAddAmount(0);
    },
    onError: (err: any) => {
      toast.error(err.message || (bn ? 'ডিপোজিট যুক্ত করতে সমস্যা হয়েছে' : 'Failed to add deposit'));
    },
  });

  // 2. Edit existing entry amount
  const editDepositMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      if (!group?.primaryConfig?.id || !group?.staff_id) return;
      if (!amount || amount <= 0) throw new Error(bn ? 'সঠিক পরিমাণ দিন' : 'Invalid amount');

      const { error } = await supabase
        .from('salary_savings_ledger')
        .update({ amount })
        .eq('id', id);
      if (error) throw error;

      await syncTotalSaved(group.primaryConfig.id, group.staff_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-savings-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings'] });
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
      toast.success(bn ? 'ডিপোজিট পরিমাণ আপডেট হয়েছে' : 'Deposit amount updated');
      setEditingEntry(null);
    },
    onError: (err: any) => {
      toast.error(err.message || (bn ? 'আপডেট ব্যর্থ হয়েছে' : 'Update failed'));
    },
  });

  // 3. Delete an entry
  const deleteDepositMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!group?.primaryConfig?.id || !group?.staff_id) return;
      const { error } = await supabase
        .from('salary_savings_ledger')
        .delete()
        .eq('id', id);
      if (error) throw error;

      await syncTotalSaved(group.primaryConfig.id, group.staff_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-savings-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['salary-savings'] });
      queryClient.invalidateQueries({ queryKey: ['salary-records'] });
      toast.success(bn ? 'ডিপোজিট এন্ট্রি মুছে ফেলা হয়েছে' : 'Deposit entry deleted');
    },
    onError: (err: any) => {
      toast.error(err.message || (bn ? 'মুছতে সমস্যা হয়েছে' : 'Delete failed'));
    },
  });

  const ledgerEntries = group?.ledgerEntries || [];
  const rawStartMonth = group?.startMonth || currentMonthYear;
  const startMonth = rawStartMonth;
  const durationMonths = Math.max(1, group?.durationMonths || 12);
  const monthlyAmount = group?.monthlyAmount || 0;
  const endMonth = getEndMonthFromStart(startMonth, durationMonths);

  // Map existing ledger entries by month_year
  const ledgerMap = useMemo(() => {
    const map = new Map<string, any>();
    for (const l of ledgerEntries) {
      if (l.month_year) map.set(l.month_year, l);
    }
    return map;
  }, [ledgerEntries]);

  // Compute expected months from startMonth up to max(duration, current)
  const timelineMonths = useMemo(() => {
    // Generate duration range
    const baseRange = generateMonthRange(startMonth, durationMonths);

    // Also include any ledger entry months that might exist historically
    const allMonthsSet = new Set<string>(baseRange);
    for (const l of ledgerEntries) {
      if (l.month_year) allMonthsSet.add(l.month_year);
    }

    // Sort chronologically ascending
    return Array.from(allMonthsSet).sort((a, b) => (a < b ? -1 : 1));
  }, [startMonth, durationMonths, ledgerEntries]);

  // Missing months: months in timeline that have no ledger entry
  const missingMonths = useMemo(() => {
    return timelineMonths.filter((m) => !ledgerMap.has(m));
  }, [timelineMonths, ledgerMap]);

  const totalCalculated = useMemo(() => {
    return ledgerEntries.reduce((sum, l) => sum + Number(l.amount || 0), 0);
  }, [ledgerEntries]);

  if (!group) return null;

  const staffName = group.staffMember?.name_bn || group.staffMember?.name_en || 'স্টাফ';
  const designation = group.staffMember?.designation || '-';
  const staffId = group.staffMember?.staff_id || '-';

  const targetTotal = monthlyAmount * durationMonths;
  const remainingAmount = Math.max(0, targetTotal - totalCalculated);

  const openAddForMonth = (m: string) => {
    setAddMonthYear(m);
    setAddAmount(group.monthlyAmount || 1000);
    setIsAddFormOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-300 grid place-items-center flex-shrink-0">
                <PiggyBank className="h-6 w-6" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                  <span>{staffName}</span>
                  <Badge variant="outline" className="text-[10px] bg-white/10 text-blue-200 border-white/20">
                    {staffId}
                  </Badge>
                  {group.isResigned && (
                    <Badge variant="outline" className="text-[10px] bg-red-500/20 text-red-200 border-red-400/40 font-medium">
                      🚪 {bn ? 'পদত্যাগকৃত' : 'Resigned'}
                      {group.resignDate ? ` (${group.resignDate})` : ''}
                    </Badge>
                  )}
                  {joiningMonth && (
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-200 border-emerald-400/40">
                      📅 {bn ? `যোগদান: ${formatMonthLabel(joiningMonth, true)}` : `Joined: ${formatMonthLabel(joiningMonth, false)}`}
                    </Badge>
                  )}
                </DialogTitle>
                <p className="text-xs text-blue-200/80">
                  {designation} • {bn ? `ডিপোজিট মেয়াদ: ${formatMonthLabel(startMonth, true)} হতে ${formatMonthLabel(endMonth, true)} (${toBnDigits(durationMonths)} মাস)` : `Deposit Period: ${formatMonthLabel(startMonth, false)} to ${formatMonthLabel(endMonth, false)} (${durationMonths} mo)`}
                </p>
              </div>
            </div>

            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold h-8 shadow-sm"
              onClick={() => {
                const nextMissing = missingMonths[0] || startMonth || currentMonthYear;
                openAddForMonth(nextMissing);
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              {bn ? 'নতুন / মিসিং মাসের ডিপোজিট যোগ' : 'Add Missing Deposit'}
            </Button>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-3 border-t border-white/10 text-xs">
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-[10px] text-blue-200/70 block">{bn ? 'মাসিক কিস্তি' : 'Monthly'}</span>
              <span className="text-sm font-bold text-white">
                ৳{bn ? toBnDigits(group.monthlyAmount.toLocaleString()) : group.monthlyAmount.toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-[10px] text-blue-200/70 block">{bn ? 'মোট জমা হয়েছে' : 'Total Saved'}</span>
              <span className="text-sm font-bold text-emerald-300">
                ৳{bn ? toBnDigits(totalCalculated.toLocaleString()) : totalCalculated.toLocaleString()}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-[10px] text-blue-200/70 block">{bn ? 'জমার মাস সংখ্যা' : 'Deposited Months'}</span>
              <span className="text-sm font-bold text-amber-300">
                {bn ? toBnDigits(group.ledgerEntries.length) : group.ledgerEntries.length} {bn ? 'মাস' : 'mo'}
                {group.durationMonths ? ` / ${bn ? toBnDigits(group.durationMonths) : group.durationMonths}` : ''}
              </span>
            </div>
            <div className="p-2 rounded-lg bg-white/5">
              <span className="text-[10px] text-blue-200/70 block">{bn ? 'বাকি রয়েছে' : 'Remaining'}</span>
              <span className="text-sm font-bold text-sky-200">
                ৳{bn ? toBnDigits(remainingAmount.toLocaleString()) : remainingAmount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 bg-slate-50/50 dark:bg-slate-900/30">
          {/* Inline Add Form */}
          {isAddFormOpen && (
            <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-3 shadow-sm animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  <Plus className="h-4 w-4 text-emerald-600" />
                  <span>{bn ? 'ডিপোজিট এন্ট্রি যুক্ত করুন' : 'Add Deposit Entry'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddFormOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{bn ? 'কোন মাসের ডিপোজিট? (YYYY-MM)' : 'Month-Year'}</Label>
                    {joiningMonth && (
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                        {bn ? `যোগদান: ${formatMonthLabel(joiningMonth, true)}` : `Joined: ${formatMonthLabel(joiningMonth, false)}`}
                      </span>
                    )}
                  </div>
                  <Input
                    type="month"
                    min="2020-01"
                    max="2040-12"
                    value={addMonthYear}
                    onChange={(e) => setAddMonthYear(e.target.value)}
                    className="h-9 text-xs mt-1 bg-white dark:bg-card"
                  />
                  {addMonthYear && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      {formatMonthLabel(addMonthYear, bn)}
                    </p>
                  )}
                  {joiningMonth && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {bn
                        ? `ℹ️ যোগদানের মাস: ${formatMonthLabel(joiningMonth, true)}`
                        : `ℹ️ Joining month: ${formatMonthLabel(joiningMonth, false)}`}
                    </p>
                  )}
                </div>
                <div>
                  <Label className="text-xs">{bn ? 'টাকার পরিমাণ (৳)' : 'Amount (৳)'}</Label>
                  <NumberInput
                    value={addAmount}
                    onValueChange={(n) => setAddAmount(n)}
                    placeholder="2000"
                    className="h-9 text-xs mt-1 bg-white dark:bg-card"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs"
                  onClick={() => setIsAddFormOpen(false)}
                  disabled={addDepositMutation.isPending}
                >
                  {bn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5"
                  onClick={() => addDepositMutation.mutate({ monthYear: addMonthYear, amount: addAmount })}
                  disabled={
                    addDepositMutation.isPending ||
                    !addMonthYear ||
                    addAmount <= 0
                  }
                >
                  {addDepositMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {bn ? 'যুক্ত হচ্ছে…' : 'Saving…'}
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      {bn ? 'ডিপোজিট সেভ করুন' : 'Save Deposit'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Missing Months Alert / Banner if any */}
          {missingMonths.length > 0 && !isAddFormOpen && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start justify-between gap-2 text-xs">
              <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">
                    {bn ? `${toBnDigits(missingMonths.length)}টি মাসের ডিপোজিট মিসিং রয়েছে` : `${missingMonths.length} missing deposit months detected`}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {missingMonths.slice(0, 6).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => openAddForMonth(m)}
                        className="px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-[10px] rounded border border-amber-300/60 font-medium"
                        title={bn ? 'ক্লিক করে এই মাসের ডিপোজিট যোগ করুন' : 'Click to add deposit for this month'}
                      >
                        + {formatMonthLabel(m, bn)}
                      </button>
                    ))}
                    {missingMonths.length > 6 && (
                      <span className="text-[10px] text-muted-foreground self-center">
                        +{missingMonths.length - 6} {bn ? 'আরো' : 'more'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Month-by-Month Deposit List Table */}
          <div className="bg-white dark:bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 border-b bg-muted/40 flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-blue-600" />
                {bn ? 'মাসভিত্তিক জমার হিসাব বিবরণী' : 'Monthly Deposit Breakdown'}
              </h4>
              <Badge variant="outline" className="text-[10px]">
                {bn ? `মোট ${toBnDigits(group.ledgerEntries.length)} মাসের ডিপোজিট সংরক্ষিত` : `${group.ledgerEntries.length} deposits recorded`}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/60 text-muted-foreground border-b text-[11px]">
                  <tr>
                    <th className="p-2.5 font-medium">#</th>
                    <th className="p-2.5 font-medium">{bn ? 'মাস ও বছর' : 'Month & Year'}</th>
                    <th className="p-2.5 font-medium text-right">{bn ? 'জমার পরিমাণ' : 'Amount'}</th>
                    <th className="p-2.5 font-medium text-center">{bn ? 'অবস্থা' : 'Status'}</th>
                    <th className="p-2.5 font-medium text-center">{bn ? 'এন্ট্রি তারিখ' : 'Date'}</th>
                    <th className="p-2.5 font-medium text-right">{bn ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {timelineMonths.map((m, idx) => {
                    const entry = ledgerMap.get(m);
                    const isMissing = !entry;
                    const isEditing = editingEntry?.id === entry?.id;

                    if (isMissing) {
                      return (
                        <tr key={m} className="bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70 transition-colors">
                          <td className="p-2.5 text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="p-2.5 font-semibold text-amber-900 dark:text-amber-300">
                            {formatMonthLabel(m, bn)}
                          </td>
                          <td className="p-2.5 text-right font-mono text-muted-foreground">
                            ৳{bn ? toBnDigits(group.monthlyAmount.toLocaleString()) : group.monthlyAmount.toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center">
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-700 dark:text-amber-400 border-amber-300 bg-amber-100/50 dark:bg-amber-950/40 font-medium py-0 px-2"
                            >
                              ⚠️ {bn ? 'মিসিং (কাটা হয়নি)' : 'Missing'}
                            </Badge>
                          </td>
                          <td className="p-2.5 text-center text-muted-foreground text-[10px]">—</td>
                          <td className="p-2.5 text-right">
                            <Button
                              size="sm"
                              className="h-6 px-2.5 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1 rounded shadow-none"
                              onClick={() => openAddForMonth(m)}
                            >
                              <Plus className="h-3 w-3" />
                              {bn ? 'ডিপোজিট যুক্ত করুন' : 'Add Deposit'}
                            </Button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={m} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5 text-muted-foreground font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-semibold text-foreground">
                          {formatMonthLabel(m, bn)}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-700 dark:text-blue-400">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <span>৳</span>
                              <input
                                type="number"
                                autoFocus
                                value={editingEntry?.amount || ''}
                                onChange={(e) => setEditingEntry({ ...editingEntry!, amount: Number(e.target.value) })}
                                className="w-20 h-6 px-1 text-xs border border-blue-400 rounded outline-none font-mono"
                              />
                            </div>
                          ) : (
                            <>৳{bn ? toBnDigits(Number(entry.amount || 0).toLocaleString()) : Number(entry.amount || 0).toLocaleString()}</>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-medium text-[10px] py-0 px-2">
                            <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                            {bn ? 'পরিশোধিত / জমা' : 'Deposited'}
                          </Badge>
                        </td>
                        <td className="p-2.5 text-center text-muted-foreground text-[10px]">
                          {entry.created_at ? new Date(entry.created_at).toLocaleDateString('bn-BD', { dateStyle: 'short' }) : '—'}
                        </td>
                        <td className="p-2.5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 px-1.5 text-[10px]"
                                onClick={() => setEditingEntry(null)}
                              >
                                {bn ? 'বাতিল' : 'Cancel'}
                              </Button>
                              <Button
                                size="sm"
                                className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => editDepositMutation.mutate({ id: entry.id, amount: editingEntry!.amount })}
                                disabled={editDepositMutation.isPending}
                              >
                                {bn ? 'সেভ' : 'Save'}
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-blue-600"
                                title={bn ? 'পরিমাণ সংশোধন করুন' : 'Edit amount'}
                                onClick={() => setEditingEntry({ id: entry.id, month_year: entry.month_year, amount: Number(entry.amount || 0) })}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600"
                                title={bn ? 'মুছে ফেলুন' : 'Delete'}
                                onClick={() => {
                                  if (confirm(bn ? `${formatMonthLabel(m, true)}-এর ডিপোজিট এন্ট্রিটি মুছে ফেলতে চান?` : 'Delete this deposit entry?')) {
                                    deleteDepositMutation.mutate(entry.id);
                                  }
                                }}
                                disabled={deleteDepositMutation.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t bg-background flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {bn ? 'মোট জমা হয়েছে: ' : 'Total Deposited: '}
            <strong className="text-foreground">
              {bn ? toBnDigits(group.ledgerEntries.length) : group.ledgerEntries.length} {bn ? 'মাস' : 'months'}
            </strong>{' '}
            (৳{bn ? toBnDigits(totalCalculated.toLocaleString()) : totalCalculated.toLocaleString()})
          </div>
          <Button variant="default" size="sm" onClick={() => onOpenChange(false)}>
            {bn ? 'বন্ধ করুন' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
