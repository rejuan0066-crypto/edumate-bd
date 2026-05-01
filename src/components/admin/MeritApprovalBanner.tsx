import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Clock, Send, ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'none';

interface Props {
  status: ApprovalStatus;
  rejectionReason?: string | null;
  decidedAt?: string | null;
  loading?: boolean;
  onSubmit: () => Promise<void> | void;
  onApprove: () => Promise<void> | void;
  onReject: (reason: string) => Promise<void> | void;
}

const MeritApprovalBanner = ({
  status, rejectionReason, decidedAt, loading,
  onSubmit, onApprove, onReject,
}: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { hasRole } = useAuth();
  const isAdmin = hasRole('admin') || hasRole('super_admin');

  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const handleAction = async (fn: () => Promise<void> | void) => {
    try {
      setBusy(true);
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      toast({ title: bn ? 'কারণ আবশ্যক' : 'Reason required', variant: 'destructive' });
      return;
    }
    await handleAction(async () => {
      await onReject(reason.trim());
      setRejectOpen(false);
      setReason('');
    });
  };

  const styles =
    status === 'approved'
      ? { bg: 'bg-emerald-500/10 border-emerald-500/30', icon: <ShieldCheck className="w-5 h-5 text-emerald-600" />, label: bn ? 'অনুমোদিত' : 'Approved', tone: 'text-emerald-700' }
      : status === 'rejected'
      ? { bg: 'bg-destructive/10 border-destructive/30', icon: <ShieldX className="w-5 h-5 text-destructive" />, label: bn ? 'প্রত্যাখ্যাত' : 'Rejected', tone: 'text-destructive' }
      : status === 'pending'
      ? { bg: 'bg-amber-500/10 border-amber-500/30', icon: <Clock className="w-5 h-5 text-amber-600" />, label: bn ? 'অনুমোদনের অপেক্ষায়' : 'Pending Approval', tone: 'text-amber-700' }
      : { bg: 'bg-muted border-border', icon: <Clock className="w-5 h-5 text-muted-foreground" />, label: bn ? 'অনুমোদনের জন্য পাঠানো হয়নি' : 'Not Submitted', tone: 'text-muted-foreground' };

  return (
    <>
      <Card className={`p-4 rounded-[20px] border ${styles.bg}`}>
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {loading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : styles.icon}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`font-semibold ${styles.tone}`}>{styles.label}</span>
                {decidedAt && status !== 'none' && status !== 'pending' && (
                  <Badge variant="outline" className="text-[10px]">{new Date(decidedAt).toLocaleString()}</Badge>
                )}
              </div>
              {status === 'rejected' && rejectionReason && (
                <p className="text-sm text-destructive mt-1 break-words">
                  <span className="font-medium">{bn ? 'কারণ: ' : 'Reason: '}</span>{rejectionReason}
                </p>
              )}
              {status === 'pending' && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bn
                    ? 'অনুমোদনের পূর্বে শিক্ষক ও শিক্ষার্থীদের কাছে এই মেধা তালিকা দৃশ্যমান নয়।'
                    : 'This merit list is hidden from teachers and students until approved.'}
                </p>
              )}
              {status === 'none' && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {bn ? 'প্রকাশের পূর্বে অনুমোদনের জন্য পাঠান।' : 'Submit for approval before publishing.'}
                </p>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap">
              {(status === 'none' || status === 'rejected') && (
                <Button size="sm" variant="outline" disabled={busy || loading}
                  onClick={() => handleAction(onSubmit)} className="rounded-full">
                  <Send className="w-4 h-4 mr-1.5" />
                  {bn ? 'অনুমোদনের জন্য পাঠান' : 'Submit for Approval'}
                </Button>
              )}
              {status !== 'approved' && (
                <Button size="sm" disabled={busy || loading}
                  onClick={() => handleAction(onApprove)}
                  className="rounded-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  {bn ? 'অনুমোদন' : 'Approve'}
                </Button>
              )}
              {status !== 'rejected' && status !== 'none' && (
                <Button size="sm" variant="destructive" disabled={busy || loading}
                  onClick={() => setRejectOpen(true)} className="rounded-full">
                  <XCircle className="w-4 h-4 mr-1.5" />
                  {bn ? 'প্রত্যাখ্যান' : 'Reject'}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle>{bn ? 'মেধা তালিকা প্রত্যাখ্যান' : 'Reject Merit List'}</DialogTitle>
            <DialogDescription>
              {bn
                ? 'প্রত্যাখ্যানের কারণ লিখুন। এটি ফলাফল প্রস্তুতকারীকে দেখানো হবে।'
                : 'Provide a reason for rejection. This will be shown to the submitter.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={bn ? 'কারণ লিখুন...' : 'Enter reason...'}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={busy}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={busy}>
              {busy && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {bn ? 'প্রত্যাখ্যান নিশ্চিত করুন' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MeritApprovalBanner;
