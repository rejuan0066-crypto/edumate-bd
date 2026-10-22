import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Clock, Send, ShieldCheck, ShieldX, Loader2, RotateCcw, AlertCircle } from 'lucide-react';
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
  onReset?: () => Promise<void> | void;
}

const MeritApprovalBanner = ({
  status, rejectionReason, decidedAt, loading,
  onSubmit, onApprove, onReject, onReset,
}: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { role } = useAuth();
  const isAdmin = role === 'admin' || role === 'super_admin';

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

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat(bn ? 'bn-BD' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  const cleanReason = (rejectionReason || '').trim();
  const hasValidReason = cleanReason.length > 0 && !['।', '.', '-', '_'].includes(cleanReason);

  const styles =
    status === 'approved'
      ? {
          cardBg: 'bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-500/30',
          iconBox: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
          label: bn ? 'অনুমোদিত' : 'Approved',
          tone: 'text-emerald-700 dark:text-emerald-300',
          badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        }
      : status === 'rejected'
      ? {
          cardBg: 'bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border-rose-500/30 dark:border-rose-500/20',
          iconBox: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
          icon: <ShieldX className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
          label: bn ? 'প্রত্যাখ্যাত' : 'Rejected',
          tone: 'text-rose-700 dark:text-rose-300',
          badgeBg: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
        }
      : status === 'pending'
      ? {
          cardBg: 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30',
          iconBox: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
          icon: <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
          label: bn ? 'অনুমোদনের অপেক্ষায়' : 'Pending Approval',
          tone: 'text-amber-700 dark:text-amber-300',
          badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
        }
      : {
          cardBg: 'bg-gradient-to-r from-muted/60 via-muted/30 to-transparent border-border',
          iconBox: 'bg-muted text-muted-foreground border border-border',
          icon: <Clock className="w-5 h-5 text-muted-foreground" />,
          label: bn ? 'অনুমোদনের জন্য পাঠানো হয়নি' : 'Not Submitted',
          tone: 'text-muted-foreground',
          badgeBg: 'bg-muted text-muted-foreground border-border',
        };

  return (
    <>
      <div className={`p-4 sm:p-5 rounded-2xl border ${styles.cardBg} shadow-sm backdrop-blur-xs transition-all`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
            <div className={`p-2.5 rounded-xl shrink-0 shadow-2xs ${styles.iconBox}`}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : styles.icon}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className={`text-sm sm:text-base font-bold tracking-tight ${styles.tone}`}>
                  {styles.label}
                </span>

                {decidedAt && status !== 'none' && status !== 'pending' && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${styles.badgeBg}`}>
                    <Clock className="w-3 h-3 opacity-70" />
                    {formatDate(decidedAt)}
                  </span>
                )}
              </div>

              {status === 'rejected' && hasValidReason && (
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-destructive/10 border border-destructive/25 text-xs text-destructive font-medium break-words">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <strong className="font-semibold">{bn ? 'কারণ: ' : 'Reason: '}</strong>
                    {cleanReason}
                  </span>
                </div>
              )}

              {status === 'rejected' && !hasValidReason && (
                <p className="text-xs text-destructive/80 mt-1">
                  {bn ? 'এই মেধা তালিকাটি প্রত্যাখ্যাত করা হয়েছে। পুনরায় যাচাই করে পাঠান বা অনুমোদন দিন।' : 'This merit list was rejected. Please review and resubmit or approve.'}
                </p>
              )}

              {status === 'pending' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {bn
                    ? 'অনুমোদনের পূর্বে শিক্ষক ও শিক্ষার্থীদের কাছে এই মেধা তালিকা দৃশ্যমান নয়।'
                    : 'This merit list is hidden from teachers and students until approved.'}
                </p>
              )}

              {status === 'none' && (
                <p className="text-xs text-muted-foreground mt-1">
                  {bn ? 'ফলাফল প্রকাশের পূর্বে অনুমোদনের জন্য পাঠান।' : 'Submit for approval before publishing.'}
                </p>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 flex-wrap justify-end shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-border/50">
              {onReset && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || loading}
                  onClick={() => handleAction(onReset)}
                  className="rounded-xl border-dashed border-border/80 hover:bg-secondary text-muted-foreground hover:text-foreground text-xs h-8.5 gap-1.5"
                  title={bn ? 'স্ট্যাটাস ফ্রেশ / রিসেট করুন' : 'Reset status to fresh'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {bn ? 'ফ্রেশ / রিসেট' : 'Reset'}
                </Button>
              )}

              {(status === 'none' || status === 'rejected') && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy || loading}
                  onClick={() => handleAction(onSubmit)}
                  className="rounded-xl bg-card hover:bg-primary/10 hover:text-primary hover:border-primary/40 font-medium text-xs h-8.5 gap-1.5 shadow-2xs"
                >
                  <Send className="w-3.5 h-3.5 text-primary" />
                  {bn ? 'অনুমোদনের জন্য পাঠান' : 'Submit for Approval'}
                </Button>
              )}

              {status !== 'approved' && (
                <Button
                  size="sm"
                  disabled={busy || loading}
                  onClick={() => handleAction(onApprove)}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-8.5 gap-1.5 shadow-sm transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {bn ? 'অনুমোদন' : 'Approve'}
                </Button>
              )}

              {status !== 'rejected' && status !== 'none' && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy || loading}
                  onClick={() => setRejectOpen(true)}
                  className="rounded-xl font-medium text-xs h-8.5 gap-1.5 shadow-sm"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {bn ? 'প্রত্যাখ্যান' : 'Reject'}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="rounded-2xl">
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
            className="rounded-xl"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={busy} className="rounded-xl">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={busy} className="rounded-xl">
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
