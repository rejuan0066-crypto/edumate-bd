import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  ClipboardEdit, Send, ShieldCheck, BadgeCheck, Wallet, History,
  CheckCircle2, Circle, ArrowRight, RotateCcw, Zap,
} from 'lucide-react';
import { autoAdvanceMonth, pickDefaultActor } from '@/lib/salary-workflow-auto-advance';

type Stage = 'draft' | 'pending_verification' | 'verified' | 'pending_approval' | 'approved' | 'paid' | 'rejected';

interface Props {
  monthYear: string;
  monthLabel: string;
  year: string;
  /** All salary records for the selected month */
  records: any[];
  /** Filter eligible records (status pending/paid) for action target */
  eligibleIds: string[];
  onChanged?: () => void;
  /** triggers PDF export with current workflow signatures filled in */
  onPrintWithWorkflow: (sig: {
    prepared_by?: string; prepared_by_role?: string;
    verified_by?: string; verified_by_role?: string;
    approved_by?: string; approved_by_role?: string;
    paid_by?: string; paid_by_role?: string;
  }) => void;
}

const STAGE_ORDER: Stage[] = ['draft', 'pending_verification', 'verified', 'pending_approval', 'approved', 'paid'];

const STAGE_LABEL = (s: Stage, bn: boolean): string => {
  const map: Record<Stage, [string, string]> = {
    draft: ['খসড়া (প্রস্তুতকৃত)', 'Draft (Prepared)'],
    pending_verification: ['যাচাইয়ের অপেক্ষায়', 'Pending Verification'],
    verified: ['যাচাইকৃত', 'Verified'],
    pending_approval: ['অনুমোদনের অপেক্ষায়', 'Pending Approval'],
    approved: ['অনুমোদিত', 'Approved'],
    paid: ['পরিশোধিত', 'Paid'],
    rejected: ['প্রত্যাখ্যাত', 'Rejected'],
  };
  return bn ? map[s][0] : map[s][1];
};

const STAGE_COLOR: Record<Stage, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-300',
  pending_verification: 'bg-amber-100 text-amber-800 border-amber-300',
  verified: 'bg-blue-100 text-blue-800 border-blue-300',
  pending_approval: 'bg-purple-100 text-purple-800 border-purple-300',
  approved: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  paid: 'bg-green-200 text-green-900 border-green-400',
  rejected: 'bg-red-100 text-red-800 border-red-300',
};

export default function SalaryWorkflowPanel({
  monthYear, monthLabel, year, records, eligibleIds, onChanged, onPrintWithWorkflow,
}: Props) {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [actionDialog, setActionDialog] = useState<null | {
    type: 'send_to_verifier' | 'verify' | 'send_to_approver' | 'approve' | 'mark_paid' | 'reset';
  }>(null);
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');
  const [actionNotes, setActionNotes] = useState('');

  // Derive a single workflow stage for the month-sheet (lowest stage among eligible records)
  const sheetStage: Stage = useMemo(() => {
    if (!records.length) return 'draft';
    const stages = records.map((r: any) => (r.workflow_stage as Stage) || 'draft');
    // Pick the "lowest" stage (least progressed) - that defines the sheet's overall state
    for (const s of STAGE_ORDER) {
      if (stages.includes(s)) return s;
    }
    return 'draft';
  }, [records]);

  // Snapshot of current workflow info from any record (they share workflow per month)
  const wf = useMemo(() => {
    const r = records.find((x: any) => x.workflow_stage && x.workflow_stage !== 'draft') || records[0];
    return r || {};
  }, [records]);

  // Workflow settings: verifier/approver/treasurer staff lists
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
  });

  const verifiers = wfSettings.filter((s) => s.role === 'verifier');
  const approvers = wfSettings.filter((s) => s.role === 'approver');
  const treasurers = wfSettings.filter((s) => s.role === 'treasurer');

  // History
  const { data: history = [] } = useQuery({
    queryKey: ['salary-workflow-history', monthYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salary_workflow_history')
        .select('*')
        .eq('month_year', monthYear)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const currentUserName = (user?.user_metadata as any)?.full_name || user?.email || 'Admin';

  const writeHistory = async (toStage: Stage, action: string, target?: any, notes?: string) => {
    const rows = records.map((r: any) => ({
      salary_record_id: r.id,
      month_year: monthYear,
      staff_id: r.staff_id,
      from_stage: (r.workflow_stage as Stage) || 'draft',
      to_stage: toStage,
      action,
      actor_user_id: user?.id || null,
      actor_name: currentUserName,
      actor_role: bn ? 'প্রস্তুতকারী/অ্যাডমিন' : 'Admin',
      target_staff_id: target?.staff_id || null,
      target_name: target?.display_name || null,
      notes: notes || null,
    }));
    if (rows.length) {
      await supabase.from('salary_workflow_history').insert(rows);
    }
  };

  const updateAllRecords = async (patch: Record<string, any>) => {
    const ids = records.map((r: any) => r.id);
    if (!ids.length) return;
    const { error } = await supabase.from('salary_records').update(patch).in('id', ids);
    if (error) throw error;
  };

  const sendToVerifierMutation = useMutation({
    mutationFn: async ({ targetId, notes }: { targetId: string; notes: string }) => {
      const target = verifiers.find((v) => v.staff_id === targetId);
      if (!target) throw new Error('Verifier not found');
      // First-time prepare: stamp prepared_by from current user
      await updateAllRecords({
        prepared_by: user?.id,
        prepared_by_name: currentUserName,
        prepared_by_role: bn ? 'প্রস্তুতকারী' : 'Prepared by',
        prepared_at: new Date().toISOString(),
        verifier_staff_id: target.staff_id,
        workflow_stage: 'pending_verification',
        workflow_notes: notes || null,
      });
      await writeHistory('pending_verification', 'sent_to_verifier', target, notes);
    },
    onSuccess: () => {
      toast.success(bn ? 'যাচাইয়ের জন্য পাঠানো হয়েছে' : 'Sent for verification');
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-history', monthYear] });
      onChanged?.();
      setActionDialog(null);
      setSelectedTargetId('');
      setActionNotes('');
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ notes }: { notes: string }) => {
      // Verifier identity: from wf.verifier_staff_id snapshot (or current user override)
      const verifier = verifiers.find((v) => v.staff_id === wf.verifier_staff_id);
      const verifiedName = verifier?.display_name || currentUserName;
      const verifiedRole = verifier?.designation || (bn ? 'যাচাইকারী' : 'Verifier');
      await updateAllRecords({
        verified_by: user?.id,
        verified_by_name: verifiedName,
        verified_by_role: verifiedRole,
        verified_at: new Date().toISOString(),
        workflow_stage: 'verified',
        workflow_notes: notes || null,
      });
      await writeHistory('verified', 'verified', { display_name: verifiedName }, notes);
    },
    onSuccess: () => {
      toast.success(bn ? 'যাচাই সম্পন্ন' : 'Verified');
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-history', monthYear] });
      onChanged?.();
      setActionDialog(null);
      setActionNotes('');
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const sendToApproverMutation = useMutation({
    mutationFn: async ({ targetId, notes }: { targetId: string; notes: string }) => {
      const target = approvers.find((a) => a.staff_id === targetId);
      if (!target) throw new Error('Approver not found');
      await updateAllRecords({
        approver_staff_id: target.staff_id,
        workflow_stage: 'pending_approval',
        workflow_notes: notes || null,
      });
      await writeHistory('pending_approval', 'sent_to_approver', target, notes);
    },
    onSuccess: () => {
      toast.success(bn ? 'অনুমোদনের জন্য পাঠানো হয়েছে' : 'Sent for approval');
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-history', monthYear] });
      onChanged?.();
      setActionDialog(null);
      setSelectedTargetId('');
      setActionNotes('');
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const approveMutation = useMutation({
    mutationFn: async ({ notes }: { notes: string }) => {
      const approver = approvers.find((a) => a.staff_id === wf.approver_staff_id);
      const approvedName = approver?.display_name || currentUserName;
      const approvedRole = approver?.designation || (bn ? 'অনুমোদনকারী' : 'Approver');
      await updateAllRecords({
        approved_by: user?.id,
        approved_by_name: approvedName,
        approved_by_role: approvedRole,
        approved_at: new Date().toISOString(),
        workflow_stage: 'approved',
        workflow_notes: notes || null,
      });
      await writeHistory('approved', 'approved', { display_name: approvedName }, notes);
    },
    onSuccess: () => {
      toast.success(bn ? 'অনুমোদন সম্পন্ন — বেতন পরিশোধের জন্য প্রস্তুত' : 'Approved — ready for payment');
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-history', monthYear] });
      onChanged?.();
      setActionDialog(null);
      setActionNotes('');
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const markAllPaidMutation = useMutation({
    mutationFn: async ({ targetId, notes }: { targetId: string; notes: string }) => {
      const target = treasurers.find((t) => t.staff_id === targetId);
      if (!target) throw new Error('Treasurer not found');
      const ids = records.filter((r: any) => r.status !== 'paid').map((r: any) => r.id);
      const { error } = await supabase.from('salary_records').update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        paid_by: user?.id,
        paid_by_name: target.display_name,
        paid_by_role: target.designation || (bn ? 'কোষাধ্যক্ষ' : 'Treasurer'),
        workflow_stage: 'paid',
        workflow_notes: notes || null,
      }).in('id', ids);
      if (error) throw error;
      await writeHistory('paid', 'marked_paid', target, notes);
    },
    onSuccess: () => {
      toast.success(bn ? 'সকল বেতন পরিশোধিত হিসেবে চিহ্নিত' : 'All salaries marked as paid');
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-history', monthYear] });
      onChanged?.();
      setActionDialog(null);
      setSelectedTargetId('');
      setActionNotes('');
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      await updateAllRecords({
        workflow_stage: 'draft',
        verifier_staff_id: null,
        verified_by: null, verified_by_name: null, verified_by_role: null, verified_at: null,
        approver_staff_id: null,
        approved_by: null, approved_by_name: null, approved_by_role: null, approved_at: null,
        workflow_notes: null,
      });
      await writeHistory('draft', 'reset', undefined, 'Workflow reset to draft');
    },
    onSuccess: () => {
      toast.success(bn ? 'ওয়ার্কফ্লো রিসেট হয়েছে' : 'Workflow reset');
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-history', monthYear] });
      onChanged?.();
      setActionDialog(null);
    },
  });

  const autoAdvanceMutation = useMutation({
    mutationFn: async () => {
      const verifier = pickDefaultActor(wfSettings, 'verifier');
      const approver = pickDefaultActor(wfSettings, 'approver');
      const treasurer = pickDefaultActor(wfSettings, 'treasurer');
      const res = await autoAdvanceMonth({
        monthYear,
        records,
        userId: user?.id || null,
        preparerName: currentUserName,
        preparerRole: bn ? 'প্রস্তুতকারী' : 'Prepared by',
        verifier, approver, treasurer,
      });
      if (!res.ok) throw new Error(res.error || 'Auto-advance failed');
      return res;
    },
    onSuccess: () => {
      toast.success(bn ? 'সকল ধাপ স্বয়ংক্রিয়ভাবে সম্পন্ন — পরিশোধিত' : 'Auto-advanced through all stages — Paid');
      queryClient.invalidateQueries({ queryKey: ['salary-records', monthYear] });
      queryClient.invalidateQueries({ queryKey: ['salary-workflow-history', monthYear] });
      onChanged?.();
    },
    onError: (e: any) => toast.error(e?.message || 'Error'),
  });

  const handlePrint = () => {
    onPrintWithWorkflow({
      prepared_by: wf.prepared_by_name || undefined,
      prepared_by_role: wf.prepared_by_role || undefined,
      verified_by: wf.verified_by_name || undefined,
      verified_by_role: wf.verified_by_role || undefined,
      approved_by: wf.approved_by_name || undefined,
      approved_by_role: wf.approved_by_role || undefined,
      paid_by: wf.paid_by_name || undefined,
      paid_by_role: wf.paid_by_role || undefined,
    });
  };

  if (!records.length) {
    return (
      <Card className="rounded-[28px] border-dashed">
        <CardContent className="p-4 text-sm text-muted-foreground">
          {bn ? 'এই মাসের জন্য বেতন জেনারেট করুন, তারপর অনুমোদন ওয়ার্কফ্লো শুরু হবে।' : 'Generate salaries for this month to start the approval workflow.'}
        </CardContent>
      </Card>
    );
  }

  // Action availability
  const canSendToVerifier = sheetStage === 'draft';
  const canVerify = sheetStage === 'pending_verification';
  const canSendToApprover = sheetStage === 'verified';
  const canApprove = sheetStage === 'pending_approval';
  const canMarkPaid = sheetStage === 'approved';

  return (
    <>
      <Card className="rounded-[28px] border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 to-white">
        <CardContent className="p-4 space-y-3">
          {/* Header row: stage + actions */}
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">
                {bn ? 'অনুমোদন ওয়ার্কফ্লো:' : 'Approval Workflow:'}
              </span>
              <Badge variant="outline" className={`${STAGE_COLOR[sheetStage]} font-semibold rounded-full px-3 py-1`}>
                {STAGE_LABEL(sheetStage, bn)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                · {monthLabel} {bn ? year.replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[+d]) : year}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(true)}>
                <History className="h-3.5 w-3.5 mr-1" /> {bn ? 'ইতিহাস' : 'History'}
              </Button>
              {sheetStage !== 'draft' && sheetStage !== 'paid' && (
                <Button size="sm" variant="ghost" onClick={() => setActionDialog({ type: 'reset' })}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> {bn ? 'রিসেট' : 'Reset'}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handlePrint}>
                {bn ? 'PDF প্রিন্ট' : 'Print PDF'}
              </Button>
            </div>
          </div>

          {/* Stepper */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 text-xs">
            {[
              { s: 'draft' as Stage, icon: ClipboardEdit, label: bn ? 'প্রস্তুতকৃত' : 'Prepared', who: wf.prepared_by_name },
              { s: 'pending_verification' as Stage, icon: Send, label: bn ? 'যাচাইয়ের অপেক্ষায়' : 'Sent', who: verifiers.find(v => v.staff_id === wf.verifier_staff_id)?.display_name },
              { s: 'verified' as Stage, icon: ShieldCheck, label: bn ? 'যাচাইকৃত' : 'Verified', who: wf.verified_by_name },
              { s: 'approved' as Stage, icon: BadgeCheck, label: bn ? 'অনুমোদিত' : 'Approved', who: wf.approved_by_name },
              { s: 'paid' as Stage, icon: Wallet, label: bn ? 'পরিশোধিত' : 'Paid', who: wf.paid_by_name },
            ].map((step, i, arr) => {
              const reached = STAGE_ORDER.indexOf(sheetStage) >= STAGE_ORDER.indexOf(step.s);
              const Icon = step.icon;
              return (
                <div key={step.s} className="flex items-center gap-1 shrink-0">
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full border ${reached ? 'bg-emerald-100 border-emerald-300 text-emerald-800' : 'bg-muted/40 border-border text-muted-foreground'}`}>
                    {reached ? <CheckCircle2 className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                    <Icon className="h-3 w-3" />
                    <span className="font-medium">{step.label}</span>
                    {step.who && reached && <span className="text-[10px] opacity-80 max-w-[120px] truncate">· {step.who}</span>}
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {canSendToVerifier && (
              <Button size="sm" onClick={() => setActionDialog({ type: 'send_to_verifier' })}>
                <Send className="h-3 w-3 mr-1" /> {bn ? 'যাচাইয়ের জন্য পাঠান' : 'Send for Verification'}
              </Button>
            )}
            {canVerify && (
              <Button size="sm" onClick={() => setActionDialog({ type: 'verify' })}>
                <ShieldCheck className="h-3 w-3 mr-1" /> {bn ? 'যাচাই সম্পন্ন করুন' : 'Verify'}
              </Button>
            )}
            {canSendToApprover && (
              <Button size="sm" onClick={() => setActionDialog({ type: 'send_to_approver' })}>
                <Send className="h-3 w-3 mr-1" /> {bn ? 'অনুমোদনের জন্য পাঠান' : 'Send for Approval'}
              </Button>
            )}
            {canApprove && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setActionDialog({ type: 'approve' })}>
                <BadgeCheck className="h-3 w-3 mr-1" /> {bn ? 'অনুমোদন করুন' : 'Approve'}
              </Button>
            )}
            {canMarkPaid && (
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => setActionDialog({ type: 'mark_paid' })}>
                <Wallet className="h-3 w-3 mr-1" /> {bn ? 'পরিশোধ সম্পন্ন (কোষাধ্যক্ষ)' : 'Mark Paid (Treasurer)'}
              </Button>
            )}
            {sheetStage !== 'paid' && verifiers.length > 0 && approvers.length > 0 && treasurers.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="border-amber-400 text-amber-700 hover:bg-amber-50"
                disabled={autoAdvanceMutation.isPending}
                onClick={() => {
                  if (confirm(bn
                    ? 'ডিফল্ট যাচাইকারী/অনুমোদনকারী/কোষাধ্যক্ষ ব্যবহার করে সকল ধাপ এক ক্লিকে সম্পন্ন করবেন? এটি বেতন পরিশোধিত হিসেবে চিহ্নিত করবে।'
                    : 'Auto-advance through all stages using default verifier/approver/treasurer? This will mark salaries as Paid.')) {
                    autoAdvanceMutation.mutate();
                  }
                }}
              >
                <Zap className="h-3 w-3 mr-1" /> {bn ? 'সকল ধাপ অটো-সম্পন্ন' : 'Auto-Advance All Stages'}
              </Button>
            )}
            {sheetStage === 'paid' && (
              <Badge className="bg-green-100 text-green-800 border-green-300">
                ✓ {bn ? 'সম্পূর্ণ ওয়ার্কফ্লো সম্পন্ন' : 'Workflow Complete'}
              </Badge>
            )}
          </div>

          {/* Setup hint */}
          {(verifiers.length === 0 || approvers.length === 0 || treasurers.length === 0) && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              {bn
                ? 'প্রথমে অ্যাডমিন সেটিংসে যাচাইকারী, অনুমোদনকারী ও কোষাধ্যক্ষের তালিকা যোগ করুন।'
                : 'Configure verifier, approver, and treasurer lists in Admin Settings → Salary Workflow first.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(o) => { if (!o) { setActionDialog(null); setSelectedTargetId(''); setActionNotes(''); } }}>
        <DialogContent className="max-w-md rounded-[28px]">
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === 'send_to_verifier' && (bn ? 'যাচাইকারী নির্বাচন করুন' : 'Choose Verifier')}
              {actionDialog?.type === 'verify' && (bn ? 'যাচাই নিশ্চিত করুন' : 'Confirm Verification')}
              {actionDialog?.type === 'send_to_approver' && (bn ? 'অনুমোদনকারী নির্বাচন করুন' : 'Choose Approver')}
              {actionDialog?.type === 'approve' && (bn ? 'অনুমোদন নিশ্চিত করুন' : 'Confirm Approval')}
              {actionDialog?.type === 'mark_paid' && (bn ? 'কোষাধ্যক্ষ / হিসাবরক্ষক নির্বাচন করুন' : 'Choose Treasurer / Accountant')}
              {actionDialog?.type === 'reset' && (bn ? 'ওয়ার্কফ্লো রিসেট' : 'Reset Workflow')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {actionDialog?.type === 'send_to_verifier' && (
              <div className="space-y-2">
                <Label>{bn ? 'যাচাইকারী' : 'Verifier'}</Label>
                <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                  <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    {verifiers.map((v) => (
                      <SelectItem key={v.staff_id} value={v.staff_id}>
                        {v.display_name} {v.designation ? `· ${v.designation}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {actionDialog?.type === 'send_to_approver' && (
              <div className="space-y-2">
                <Label>{bn ? 'অনুমোদনকারী' : 'Approver'}</Label>
                <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                  <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    {approvers.map((v) => (
                      <SelectItem key={v.staff_id} value={v.staff_id}>
                        {v.display_name} {v.designation ? `· ${v.designation}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {actionDialog?.type === 'mark_paid' && (
              <div className="space-y-2">
                <Label>{bn ? 'পরিশোধকারী (কোষাধ্যক্ষ/হিসাবরক্ষক)' : 'Paid by (Treasurer/Accountant)'}</Label>
                <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                  <SelectTrigger><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                  <SelectContent>
                    {treasurers.map((v) => (
                      <SelectItem key={v.staff_id} value={v.staff_id}>
                        {v.display_name} {v.designation ? `· ${v.designation}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {actionDialog?.type === 'reset' && (
              <p className="text-sm text-muted-foreground">
                {bn ? 'এটি বর্তমান মাসের অনুমোদন ওয়ার্কফ্লো খসড়াতে ফিরিয়ে আনবে। বেতন পরিশোধের অবস্থা পরিবর্তন হবে না।' : 'This will revert the current month\'s approval workflow to draft. Paid status will not be changed.'}
              </p>
            )}

            {actionDialog?.type !== 'reset' && (
              <div className="space-y-2">
                <Label>{bn ? 'মন্তব্য (ঐচ্ছিক)' : 'Notes (optional)'}</Label>
                <Textarea rows={2} value={actionNotes} onChange={(e) => setActionNotes(e.target.value)} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setActionDialog(null)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
              <Button onClick={() => {
                if (actionDialog?.type === 'send_to_verifier') {
                  if (!selectedTargetId) { toast.error(bn ? 'যাচাইকারী নির্বাচন করুন' : 'Select a verifier'); return; }
                  sendToVerifierMutation.mutate({ targetId: selectedTargetId, notes: actionNotes });
                } else if (actionDialog?.type === 'verify') {
                  verifyMutation.mutate({ notes: actionNotes });
                } else if (actionDialog?.type === 'send_to_approver') {
                  if (!selectedTargetId) { toast.error(bn ? 'অনুমোদনকারী নির্বাচন করুন' : 'Select an approver'); return; }
                  sendToApproverMutation.mutate({ targetId: selectedTargetId, notes: actionNotes });
                } else if (actionDialog?.type === 'approve') {
                  approveMutation.mutate({ notes: actionNotes });
                } else if (actionDialog?.type === 'mark_paid') {
                  if (!selectedTargetId) { toast.error(bn ? 'পরিশোধকারী নির্বাচন করুন' : 'Select treasurer'); return; }
                  markAllPaidMutation.mutate({ targetId: selectedTargetId, notes: actionNotes });
                } else if (actionDialog?.type === 'reset') {
                  resetMutation.mutate();
                }
              }}>
                {bn ? 'নিশ্চিত করুন' : 'Confirm'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl rounded-[28px]">
          <DialogHeader>
            <DialogTitle>{bn ? 'ওয়ার্কফ্লো ইতিহাস' : 'Workflow History'} · {monthLabel} {year}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-2">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{bn ? 'এখনো কোন কার্যকলাপ নেই।' : 'No activity yet.'}</p>
            ) : (
              <div className="space-y-2">
                {Array.from(new Map(history.map((h: any) => [`${h.created_at}-${h.action}-${h.actor_user_id}`, h])).values()).map((h: any) => (
                  <div key={h.id} className="border rounded-xl p-3 text-sm bg-muted/20">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="outline" className={STAGE_COLOR[h.to_stage as Stage] || ''}>
                        {STAGE_LABEL(h.to_stage as Stage, bn)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{new Date(h.created_at).toLocaleString(bn ? 'bn-BD' : 'en-GB')}</span>
                    </div>
                    <div className="text-xs">
                      <strong>{h.actor_name}</strong> {h.target_name && <>→ <strong>{h.target_name}</strong></>}
                    </div>
                    {h.notes && <div className="text-xs text-muted-foreground mt-1 italic">"{h.notes}"</div>}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
