import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Zap, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { autoAdvanceMonth, pickDefaultActor } from '@/lib/salary-workflow-auto-advance';
import { useSalaryWorkflowGating } from '@/hooks/useSalaryWorkflowGating';

const MONTH_NAMES_BN = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const STAGE_LABEL: Record<string, [string, string]> = {
  draft: ['খসড়া', 'Draft'],
  pending_verification: ['যাচাইয়ের অপেক্ষায়', 'Pending Verify'],
  verified: ['যাচাইকৃত', 'Verified'],
  pending_approval: ['অনুমোদনের অপেক্ষায়', 'Pending Approval'],
  approved: ['অনুমোদিত', 'Approved'],
  paid: ['পরিশোধিত', 'Paid'],
};

export default function BulkSalaryWorkflowDialog() {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, { ok: boolean; error?: string; finalStage?: string }>>({});
  const currentUserName = (user?.user_metadata as any)?.full_name || user?.email || 'Admin';
  const { isSuperAdmin } = useSalaryWorkflowGating();

  if (!isSuperAdmin) return null;

  // Last 12 months of records — group by month_year
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['salary-records-last-12'],
    queryFn: async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 11);
      const sinceMonth = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}`;
      const { data, error } = await supabase
        .from('salary_records')
        .select('id, staff_id, month_year, status, workflow_stage')
        .gte('month_year', sinceMonth)
        .order('month_year', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  const { data: wfSettings = [] } = useQuery({
    queryKey: ['salary-workflow-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_workflow_settings')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data as any[];
    },
    enabled: open,
  });

  const monthGroups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const r of records) {
      if (!map.has(r.month_year)) map.set(r.month_year, []);
      map.get(r.month_year)!.push(r);
    }
    return Array.from(map.entries())
      .map(([month_year, recs]) => {
        const stages = recs.map((r) => r.workflow_stage || 'draft');
        const order = ['draft', 'pending_verification', 'verified', 'pending_approval', 'approved', 'paid'];
        const lowest = order.find((s) => stages.includes(s as any)) || 'draft';
        return { month_year, count: recs.length, stage: lowest, records: recs };
      })
      .sort((a, b) => b.month_year.localeCompare(a.month_year));
  }, [records]);

  const verifier = pickDefaultActor(wfSettings, 'verifier');
  const approver = pickDefaultActor(wfSettings, 'approver');
  const treasurer = pickDefaultActor(wfSettings, 'treasurer');
  const defaultsReady = !!(verifier && approver && treasurer);

  const toggleAll = () => {
    const eligibleIds = monthGroups.filter((g) => g.stage !== 'paid').map((g) => g.month_year);
    if (selected.size === eligibleIds.length) setSelected(new Set());
    else setSelected(new Set(eligibleIds));
  };

  const formatMonthLabel = (monthYear: string) => {
    const [y, m] = monthYear.split('-');
    const idx = Number(m) - 1;
    const name = bn ? MONTH_NAMES_BN[idx] : MONTH_NAMES_EN[idx];
    const yr = bn ? y.replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[+d]) : y;
    return `${name} ${yr}`;
  };

  const runBulk = async () => {
    if (!defaultsReady) {
      toast.error(bn ? 'প্রথমে সেটিংসে ডিফল্ট যাচাইকারী/অনুমোদনকারী/কোষাধ্যক্ষ মার্ক করুন' : 'Mark default verifier/approver/treasurer in Settings first');
      return;
    }
    if (selected.size === 0) {
      toast.error(bn ? 'অন্তত একটি মাস নির্বাচন করুন' : 'Select at least one month');
      return;
    }
    setRunning(true);
    setResults({});
    const targets = monthGroups.filter((g) => selected.has(g.month_year));
    const newResults: typeof results = {};
    for (const t of targets) {
      const res = await autoAdvanceMonth({
        monthYear: t.month_year,
        records: t.records,
        userId: user?.id || null,
        preparerName: currentUserName,
        preparerRole: bn ? 'প্রস্তুতকারী' : 'Prepared by',
        verifier, approver, treasurer,
      });
      newResults[t.month_year] = { ok: res.ok, error: res.error, finalStage: res.finalStage };
      setResults({ ...newResults });
    }
    const okCount = Object.values(newResults).filter((r) => r.ok).length;
    const failCount = Object.values(newResults).length - okCount;
    if (failCount === 0) {
      toast.success(bn ? `${okCount} টি মাস সফলভাবে পরিশোধিত` : `${okCount} months processed successfully`);
    } else {
      toast.warning(bn ? `${okCount} সফল, ${failCount} ব্যর্থ` : `${okCount} succeeded, ${failCount} failed`);
    }
    queryClient.invalidateQueries({ queryKey: ['salary-records-last-12'] });
    queryClient.invalidateQueries({ queryKey: ['salary-records'] });
    queryClient.invalidateQueries({ queryKey: ['salary-workflow-history'] });
    setRunning(false);
  };

  const eligibleCount = monthGroups.filter((g) => g.stage !== 'paid').length;

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSelected(new Set()); setResults({}); } }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-50">
          <Zap className="h-3.5 w-3.5 mr-1" /> {bn ? 'বাল্ক অটো-ওয়ার্কফ্লো' : 'Bulk Auto-Workflow'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-[28px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            {bn ? 'বাল্ক অনুমোদন ওয়ার্কফ্লো' : 'Bulk Approval Workflow'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {bn
              ? 'নির্বাচিত মাসগুলোর বেতন সিট স্বয়ংক্রিয়ভাবে প্রস্তুত → যাচাই → অনুমোদন → পরিশোধিত ধাপের মধ্য দিয়ে যাবে। ডিফল্ট যাচাইকারী/অনুমোদনকারী/কোষাধ্যক্ষ ব্যবহার হবে।'
              : 'Selected months will auto-advance through Prepare → Verify → Approve → Paid using the default verifier/approver/treasurer.'}
          </div>

          {!defaultsReady && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
              {bn
                ? '⚠️ অ্যাডমিন সেটিংস → বেতন ওয়ার্কফ্লো এ প্রতিটি ভূমিকার জন্য একজনকে স্টার (⭐) দিয়ে ডিফল্ট হিসেবে চিহ্নিত করুন।'
                : '⚠️ Mark a default (⭐) verifier, approver, and treasurer in Admin Settings → Salary Workflow.'}
            </div>
          )}

          <div className="flex items-center justify-between p-2 border rounded-xl bg-muted/30">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selected.size > 0 && selected.size === eligibleCount}
                onCheckedChange={toggleAll}
              />
              <span className="text-sm font-medium">
                {bn ? `সব নির্বাচন (${eligibleCount} মাস)` : `Select all (${eligibleCount} months)`}
              </span>
            </div>
            <Badge variant="secondary">{selected.size} {bn ? 'নির্বাচিত' : 'selected'}</Badge>
          </div>

          <ScrollArea className="max-h-[400px] pr-2">
            {isLoading ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> {bn ? 'লোড হচ্ছে...' : 'Loading...'}
              </div>
            ) : monthGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground italic text-center py-4">
                {bn ? 'গত ১২ মাসে কোন বেতন সিট নেই' : 'No salary sheets in the last 12 months'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {monthGroups.map((g) => {
                  const isPaid = g.stage === 'paid';
                  const isSelected = selected.has(g.month_year);
                  const res = results[g.month_year];
                  return (
                    <div
                      key={g.month_year}
                      className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border transition ${isPaid ? 'bg-green-50/50 border-green-200 opacity-70' : isSelected ? 'bg-amber-50 border-amber-300' : 'bg-card border-border hover:border-amber-200'}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Checkbox
                          disabled={isPaid || running}
                          checked={isSelected}
                          onCheckedChange={(v) => {
                            const next = new Set(selected);
                            if (v) next.add(g.month_year);
                            else next.delete(g.month_year);
                            setSelected(next);
                          }}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">{formatMonthLabel(g.month_year)}</div>
                          <div className="text-xs text-muted-foreground">
                            {bn ? `${g.count} জন স্টাফ` : `${g.count} staff`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-xs">
                          {STAGE_LABEL[g.stage]?.[bn ? 0 : 1] || g.stage}
                        </Badge>
                        {res && (
                          res.ok ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <span title={res.error}><XCircle className="h-4 w-4 text-red-600" /></span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={running}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              onClick={runBulk}
              disabled={running || selected.size === 0 || !defaultsReady}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {running ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> {bn ? 'প্রসেস করা হচ্ছে...' : 'Processing...'}</>
              ) : (
                <><Zap className="h-4 w-4 mr-1" /> {bn ? `চালান (${selected.size} মাস)` : `Run (${selected.size} months)`}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
