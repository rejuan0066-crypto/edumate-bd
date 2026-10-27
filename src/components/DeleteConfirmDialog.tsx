import { useState, useEffect } from 'react';
import { Trash2, KeyRound, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  getCachedDeletionSettings,
  type DeletionProtectionLevel,
  type DeletionSecuritySettings,
} from '@/hooks/useDeletionSecuritySettings';
import { supabase } from '@/integrations/supabase/client';
import OtpVerificationDialog from '@/components/OtpVerificationDialog';

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  isPending?: boolean;

  /** Visual identification of what is being deleted */
  itemName?: string;
  itemIdentifier?: string;
  itemDetails?: Array<{ label: string; value: string | React.ReactNode }>;

  /** Security policy mapping */
  moduleKey?: keyof DeletionSecuritySettings;
  protectionLevel?: DeletionProtectionLevel;
  expectedInput?: string;
}

const DeleteConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  isPending,
  itemName,
  itemIdentifier,
  itemDetails,
  moduleKey,
  protectionLevel,
  expectedInput,
}: DeleteConfirmDialogProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const [typedInput, setTypedInput] = useState('');
  const [otpOpen, setOtpOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    if (open) {
      setTypedInput('');
      setOtpOpen(false);
    }
  }, [open]);

  // Determine policy level
  const resolvedLevel: DeletionProtectionLevel =
    protectionLevel || (moduleKey ? getCachedDeletionSettings()[moduleKey] : 'confirm');

  const rawExpected = expectedInput || itemName || 'DELETE';
  const expectedText = rawExpected.trim();
  const requiresType = (resolvedLevel === 'type' || resolvedLevel === 'otp') && !!expectedText;
  const isTypeMatched = !requiresType || typedInput.trim().toLowerCase() === expectedText.toLowerCase();

  const handleConfirmClick = async () => {
    if (!isTypeMatched) return;

    if (resolvedLevel === 'otp') {
      try {
        const { data } = await supabase.auth.getUser();
        const email = data.user?.email;
        if (email) {
          setAdminEmail(email);
          setOtpOpen(true);
          return;
        }
      } catch (e) {
        console.warn('OTP user fetch fallback:', e);
      }
    }
    onConfirm();
  };

  return (
    <>
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="rounded-3xl bg-background border border-border/80 text-foreground shadow-2xl max-w-md p-6">
          <AlertDialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center shrink-0">
                {resolvedLevel === 'otp' ? (
                  <KeyRound className="w-6 h-6 text-destructive" />
                ) : (
                  <Trash2 className="w-6 h-6 text-destructive" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <AlertDialogTitle className="text-lg font-bold text-foreground">
                    {title || (bn ? 'আপনি কি নিশ্চিত?' : 'Are you sure?')}
                  </AlertDialogTitle>
                  {resolvedLevel === 'otp' && (
                    <Badge variant="destructive" className="text-[10px] font-bold py-0 h-5">
                      {bn ? 'ইমেইল OTP প্রয়োজন' : 'Email OTP Required'}
                    </Badge>
                  )}
                  {resolvedLevel === 'type' && (
                    <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-600 dark:border-rose-800 dark:text-rose-400 font-bold py-0 h-5">
                      {bn ? 'টাইপ সুরক্ষা' : 'Type Protected'}
                    </Badge>
                  )}
                </div>
                <AlertDialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  {description || (bn ? 'এই রেকর্ডটি মুছে ফেলা হবে।' : 'This record will be permanently deleted.')}
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {/* Item Identification Card */}
          {(itemName || itemIdentifier || (itemDetails && itemDetails.length > 0)) && (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-3.5 space-y-2 my-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-destructive/80 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {bn ? 'মুছে ফেলা হবে:' : 'Being Deleted:'}
                </span>
                {itemIdentifier && (
                  <Badge variant="outline" className="text-[10px] font-mono bg-background">
                    {itemIdentifier}
                  </Badge>
                )}
              </div>

              {itemName && (
                <p className="font-bold text-sm text-foreground">{itemName}</p>
              )}

              {itemDetails && itemDetails.length > 0 && (
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1.5 border-t border-destructive/10 text-xs">
                  {itemDetails.map((d, i) => (
                    <div key={i} className="truncate">
                      <span className="text-muted-foreground text-[11px]">{d.label}: </span>
                      <span className="font-semibold text-foreground text-[11px]">{d.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Type-to-confirm input */}
          {requiresType && (
            <div className="space-y-1.5 my-2">
              <label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>
                  {bn ? 'নিশ্চিত করতে নিচে লিখুন:' : 'Type to confirm:'}{' '}
                  <strong className="text-destructive select-all font-mono">"{expectedText}"</strong>
                </span>
                {isTypeMatched && (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-[11px] font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {bn ? 'সঠিক' : 'Matched'}
                  </span>
                )}
              </label>
              <Input
                value={typedInput}
                onChange={(e) => setTypedInput(e.target.value)}
                placeholder={expectedText}
                className={cn(
                  'h-10 rounded-xl font-mono text-sm transition-all',
                  isTypeMatched
                    ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/20 ring-1 ring-emerald-500/20'
                    : 'border-destructive/40 focus:border-destructive'
                )}
                autoFocus
              />
            </div>
          )}

          <AlertDialogFooter className="gap-2 sm:gap-2 pt-3 border-t border-border/40">
            <AlertDialogCancel
              disabled={isPending}
              className="rounded-full px-5 h-9 text-xs"
            >
              {bn ? 'না, থাক' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmClick();
              }}
              disabled={isPending || !isTypeMatched}
              className={cn(
                'rounded-full px-6 h-9 text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm transition-all',
                !isTypeMatched && 'opacity-50 cursor-not-allowed pointer-events-none'
              )}
            >
              {confirmLabel || (resolvedLevel === 'otp' ? (bn ? 'OTP পাঠিয়ে ডিলিট' : 'Send OTP & Delete') : (bn ? 'হ্যাঁ, ডিলিট করুন' : 'Yes, Delete'))}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Global OTP Dialog for deletion verification */}
      {otpOpen && (
        <OtpVerificationDialog
          open={otpOpen}
          onOpenChange={(open) => {
            setOtpOpen(open);
            if (!open) {
              onOpenChange(false);
            }
          }}
          email={adminEmail}
          purpose="email_verification"
          scope="login"
          onVerified={() => {
            setOtpOpen(false);
            onConfirm();
          }}
          title={bn ? 'ডিলিট অনুমোদন ওটিপি (Email OTP)' : 'Delete Authorization OTP'}
          description={bn ? 'সংবেদনশীল রেকর্ড মুছে ফেলার অনুমতি দিতে আপনার ইমেইলে প্রেরিত ৬ সংখ্যার কোড দিন।' : 'Enter the 6-digit code sent to your email to authorize permanent deletion.'}
        />
      )}
    </>
  );
};

export default DeleteConfirmDialog;
