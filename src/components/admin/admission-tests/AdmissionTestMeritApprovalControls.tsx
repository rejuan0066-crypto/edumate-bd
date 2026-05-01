import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Send, ShieldCheck, ShieldX, Clock, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Props {
  test: {
    id: string;
    merit_approval_status?: string | null;
    merit_rejection_reason?: string | null;
    merit_decided_at?: string | null;
  };
}

const AdmissionTestMeritApprovalControls = ({ test }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'super_admin';
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  const status = (test.merit_approval_status as 'pending' | 'approved' | 'rejected') || 'pending';

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admission-tests-admin'] });

  const submitM = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc('submit_admission_test_merit_for_approval', { p_test_id: test.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(bn ? 'অনুমোদনের জন্য পাঠানো হয়েছে' : 'Submitted for approval'); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  const approveM = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc('approve_admission_test_merit', { p_test_id: test.id });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(bn ? 'মেধা তালিকা অনুমোদিত' : 'Merit approved'); refresh(); },
    onError: (e: any) => toast.error(e.message),
  });

  const rejectM = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc('reject_admission_test_merit', { p_test_id: test.id, p_reason: reason.trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(bn ? 'মেধা তালিকা প্রত্যাখ্যাত' : 'Merit rejected');
      setRejectOpen(false); setReason(''); refresh();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const badge =
    status === 'approved' ? (
      <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30 border gap-1">
        <ShieldCheck className="w-3 h-3" />{bn ? 'মেধা অনুমোদিত' : 'Merit Approved'}
      </Badge>
    ) : status === 'rejected' ? (
      <Badge variant="destructive" className="gap-1">
        <ShieldX className="w-3 h-3" />{bn ? 'মেধা প্রত্যাখ্যাত' : 'Merit Rejected'}
      </Badge>
    ) : (
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 gap-1">
        <Clock className="w-3 h-3" />{bn ? 'মেধা অপেক্ষায়' : 'Merit Pending'}
      </Badge>
    );

  if (!isAdmin) return <div className="mt-2">{badge}</div>;

  const busy = submitM.isPending || approveM.isPending || rejectM.isPending;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        {badge}
        {status === 'rejected' && test.merit_rejection_reason && (
          <span className="text-[10px] text-destructive truncate" title={test.merit_rejection_reason}>
            {test.merit_rejection_reason}
          </span>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {status !== 'approved' && (
          <Button size="sm" disabled={busy}
            onClick={() => approveM.mutate()}
            className="flex-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />{bn ? 'অনুমোদন' : 'Approve'}
          </Button>
        )}
        {status !== 'rejected' && (
          <Button size="sm" variant="destructive" disabled={busy}
            onClick={() => setRejectOpen(true)}
            className="flex-1 rounded-full">
            <XCircle className="w-3.5 h-3.5 mr-1" />{bn ? 'প্রত্যাখ্যান' : 'Reject'}
          </Button>
        )}
        {status === 'rejected' && (
          <Button size="sm" variant="outline" disabled={busy}
            onClick={() => submitM.mutate()}
            className="flex-1 rounded-full">
            <Send className="w-3.5 h-3.5 mr-1" />{bn ? 'পুনরায় পাঠান' : 'Resubmit'}
          </Button>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>{bn ? 'মেধা তালিকা প্রত্যাখ্যান' : 'Reject Merit List'}</DialogTitle>
            <DialogDescription>
              {bn ? 'প্রত্যাখ্যানের কারণ লিখুন।' : 'Provide a reason for rejection.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4}
            placeholder={bn ? 'কারণ লিখুন...' : 'Enter reason...'} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejectM.isPending}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button variant="destructive"
              disabled={!reason.trim() || rejectM.isPending}
              onClick={() => rejectM.mutate()}>
              {rejectM.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {bn ? 'নিশ্চিত করুন' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdmissionTestMeritApprovalControls;
