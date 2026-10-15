import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOtpService } from '@/hooks/useOtpService';
import { fetchOtpRequirements, isOtpRequiredFor, type OtpRoleScope } from '@/hooks/useOtpRequirements';
import { Loader2, Mail, ShieldCheck, ShieldAlert, Timer, KeyRound, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import OtpResendButton from '@/components/OtpResendButton';
import { trackOtpLockout } from '@/lib/otpAnalytics';
import { formatDigits } from '@/lib/utils';

const formatCountdown = (totalSeconds: number) => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

interface OtpVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  purpose: 'email_verification' | 'password_reset';
  recipientName?: string;
  onVerified: () => void;
  title?: string;
  description?: string;
  /** Fine-grained flow scope so the dialog can honour the admin's per-flow OTP toggle.
   *  When the admin has disabled OTP for this scope, the dialog auto-passes (no email sent). */
  scope?: 'login' | 'password_reset' | 'email_change' | 'password_change';
  /** Target user's role — enables per-role OTP overrides set in admin settings.
   *  Falls back to the global per-flow flag when not provided. */
  role?: OtpRoleScope;
}

/** Codes that should fully lock the verify action until a fresh code is requested
 *  or the rate-limit window passes. */
const VERIFY_LOCKOUT_CODES = new Set([
  'OTP_MAX_ATTEMPTS',
  'HOURLY_LIMIT_EXCEEDED',
  'DAILY_LIMIT_EXCEEDED',
]);

/** Codes that should also lock the resend action (full account-level lockouts). */
const RESEND_LOCKOUT_CODES = new Set([
  'HOURLY_LIMIT_EXCEEDED',
  'DAILY_LIMIT_EXCEEDED',
]);

const OtpVerificationDialog = ({
  open,
  onOpenChange,
  email,
  purpose,
  recipientName,
  onVerified,
  title,
  description,
  scope,
  role,
}: OtpVerificationDialogProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sendOtp, verifyOtp, sending, verifying } = useOtpService();
  const [otpValue, setOtpValue] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(10);
  const [codeExpirySeconds, setCodeExpirySeconds] = useState(0);
  const [verifyCooldown, setVerifyCooldown] = useState(0);

  // Lockout state — populated whenever the API returns a lockout code.
  const [lockout, setLockout] = useState<{
    scope: 'verify' | 'both';
    code: string;
    message: string;
    retryAfterSeconds?: number;
  } | null>(null);

  const verifyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockoutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendApiRef = useRef<{ startCooldown: (s: number) => void } | null>(null);
  // Guard against double-fire of the initial send (StrictMode / re-renders).
  const initialSendStartedRef = useRef(false);

  // Reset the guard whenever the dialog closes so a future open re-sends.
  useEffect(() => {
    if (!open) {
      initialSendStartedRef.current = false;
    }
  }, [open]);

  // Initial send when dialog opens — but first check if OTP is required for this scope
  useEffect(() => {
    if (open && !otpSent && !initialSendStartedRef.current) {
      initialSendStartedRef.current = true;
      void (async () => {
        // Honour admin per-flow OTP toggle. If disabled for this scope, skip the
        // entire OTP exchange and call onVerified() so the calling flow proceeds.
        const effectiveScope = scope ?? (purpose === 'password_reset' ? 'password_reset' : 'email_change');
        try {
          const reqs = await fetchOtpRequirements();
          if (!isOtpRequiredFor(reqs, effectiveScope, role)) {
            onOpenChange(false);
            onVerified();
            return;
          }
        } catch {
          // If we cannot determine, fall through to normal OTP flow (safer default)
        }
        void handleInitialSend();
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Verify endpoint cooldown ticker (short cooldown from verify-otp 429)
  useEffect(() => {
    if (verifyCooldown <= 0) {
      if (verifyTimerRef.current) {
        clearInterval(verifyTimerRef.current);
        verifyTimerRef.current = null;
      }
      return;
    }
    verifyTimerRef.current = setInterval(() => {
      setVerifyCooldown(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (verifyTimerRef.current) {
        clearInterval(verifyTimerRef.current);
        verifyTimerRef.current = null;
      }
    };
  }, [verifyCooldown]);

  // Lockout countdown ticker — auto-clears the lockout when the window passes
  useEffect(() => {
    if (!lockout?.retryAfterSeconds || lockout.retryAfterSeconds <= 0) {
      if (lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current);
        lockoutTimerRef.current = null;
      }
      return;
    }
    lockoutTimerRef.current = setInterval(() => {
      setLockout(prev => {
        if (!prev?.retryAfterSeconds) return prev;
        const next = prev.retryAfterSeconds - 1;
        if (next <= 0) return null; // lift the lockout
        return { ...prev, retryAfterSeconds: next };
      });
    }, 1000);
    return () => {
      if (lockoutTimerRef.current) {
        clearInterval(lockoutTimerRef.current);
        lockoutTimerRef.current = null;
      }
    };
  }, [lockout?.retryAfterSeconds]);

  // OTP code expiry countdown — shows the user exactly how long the current
  // code remains valid. Resets whenever a new code is issued.
  const codeExpiryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (codeExpirySeconds <= 0) {
      if (codeExpiryTimerRef.current) {
        clearInterval(codeExpiryTimerRef.current);
        codeExpiryTimerRef.current = null;
      }
      return;
    }
    codeExpiryTimerRef.current = setInterval(() => {
      setCodeExpirySeconds(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => {
      if (codeExpiryTimerRef.current) {
        clearInterval(codeExpiryTimerRef.current);
        codeExpiryTimerRef.current = null;
      }
    };
  }, [codeExpirySeconds]);

  /** Apply a lockout based on an API error code. */
  const applyLockout = (
    code: string | undefined,
    message: string | undefined,
    retryAfterSeconds: number | undefined,
    fallbackMsg: string,
  ) => {
    if (!code) return false;
    if (RESEND_LOCKOUT_CODES.has(code)) {
      setLockout({
        scope: 'both',
        code,
        message: message || fallbackMsg,
        retryAfterSeconds,
      });
      void trackOtpLockout({
        code, scope: 'both', retryAfterSeconds, purpose, email,
      });
      return true;
    }
    if (VERIFY_LOCKOUT_CODES.has(code)) {
      setLockout({
        scope: 'verify',
        code,
        message: message || fallbackMsg,
        retryAfterSeconds,
      });
      void trackOtpLockout({
        code, scope: 'verify', retryAfterSeconds, purpose, email,
      });
      return true;
    }
    return false;
  };

  const handleInitialSend = async () => {
    const result = await sendOtp(email, purpose, recipientName, scope);
    if (result.success) {
      setOtpSent(true);
      setExpiryMinutes(result.expiryMinutes || 10);
      setCodeExpirySeconds((result.expiryMinutes || 10) * 60);
      resendApiRef.current?.startCooldown(result.retryAfterSeconds ?? 30);
      toast.success(bn ? `${email} এ কোড পাঠানো হয়েছে` : `Code sent to ${email}`);
      return;
    }
    // COOLDOWN_ACTIVE on initial send means a code was issued moments ago and
    // is still valid — show the verify UI so the user can enter that code.
    if (result.errorCode === 'COOLDOWN_ACTIVE') {
      setOtpSent(true);
      setExpiryMinutes(result.expiryMinutes || 10);
      setCodeExpirySeconds((result.expiryMinutes || 10) * 60);
      if (result.retryAfterSeconds) {
        resendApiRef.current?.startCooldown(result.retryAfterSeconds);
      }
      toast.info(bn
        ? `${email} এ পাঠানো পূর্বের কোডটি ব্যবহার করুন`
        : `Enter the code already sent to ${email}`);
      return;
    }
    // Failed initial send — check for lockout
    applyLockout(
      result.errorCode,
      result.message,
      result.retryAfterSeconds,
      bn ? 'অ্যাকাউন্ট সাময়িকভাবে লক করা হয়েছে' : 'Account temporarily locked',
    );
    if (result.retryAfterSeconds) {
      resendApiRef.current?.startCooldown(result.retryAfterSeconds);
    }
    // Show OTP UI so user can verify a previously issued code
    setOtpSent(true);
  };

  const handleResend = async () => {
    const result = await sendOtp(email, purpose, recipientName, scope);
    if (!result.success) {
      applyLockout(
        result.errorCode,
        result.message,
        result.retryAfterSeconds,
        bn ? 'অনেক বেশি অনুরোধ' : 'Too many requests',
      );
    } else {
      // A fresh code was issued by the server — clear any verify-only lockout
      // immediately (e.g. after OTP_MAX_ATTEMPTS) so the user can try the new code.
      setLockout(prev => (prev?.scope === 'verify' ? null : prev));
      setVerifyCooldown(0);
      setOtpValue('');
      setExpiryMinutes(result.expiryMinutes || 10);
      setCodeExpirySeconds((result.expiryMinutes || 10) * 60);
    }
    return result;
  };

  const handleVerify = async () => {
    if (otpValue.length !== 6) {
      toast.error(bn ? '৬ ডিজিটের কোড দিন' : 'Enter 6-digit code');
      return;
    }
    const result = await verifyOtp(email, otpValue, purpose);
    if (result.valid) {
      toast.success(bn ? 'যাচাই সফল!' : 'Verification successful!');
      setOtpValue('');
      setOtpSent(false);
      setLockout(null);
      onVerified();
      onOpenChange(false);
      return;
    }

    // OTP_NOT_FOUND → previous code expired/used. Auto-request a fresh one.
    if (result.errorCode === 'OTP_NOT_FOUND') {
      toast.info(bn
        ? 'কোডটি মেয়াদোত্তীর্ণ — নতুন কোড পাঠানো হচ্ছে...'
        : 'Code expired — sending a new one...');
      setOtpValue('');
      const fresh = await sendOtp(email, purpose, recipientName, scope);
      if (fresh.success) {
        setExpiryMinutes(fresh.expiryMinutes || 10);
        setCodeExpirySeconds((fresh.expiryMinutes || 10) * 60);
        resendApiRef.current?.startCooldown(fresh.retryAfterSeconds ?? 30);
        toast.success(bn ? 'নতুন কোড পাঠানো হয়েছে' : 'New code sent');
      } else if (fresh.retryAfterSeconds) {
        resendApiRef.current?.startCooldown(fresh.retryAfterSeconds);
        toast.error(fresh.message || (bn ? 'অপেক্ষা করুন' : 'Please wait'));
      }
      return;
    }

    const locked = applyLockout(
      result.errorCode,
      result.error,
      result.retryAfterSeconds,
      bn ? 'যাচাইকরণ লক করা হয়েছে' : 'Verification locked',
    );

    // Non-lockout 429 (short cooldown) → just disable verify briefly
    if (!locked && result.retryAfterSeconds && result.retryAfterSeconds > 0) {
      setVerifyCooldown(Math.ceil(result.retryAfterSeconds));
    }

    if (!locked) {
      toast.error(result.error || (bn ? 'কোড ভুল' : 'Invalid code'));
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setOtpValue('');
      setOtpSent(false);
      setVerifyCooldown(0);
      setLockout(null);
      setCodeExpirySeconds(0);
    }
    onOpenChange(val);
  };

  const verifyLocked = !!lockout; // both scopes lock verify
  const resendLocked = lockout?.scope === 'both';

  const codeExpired = otpSent && codeExpirySeconds <= 0;
  const verifyDisabled =
    verifying || otpValue.length !== 6 || verifyCooldown > 0 || verifyLocked || codeExpired;

  const lockoutCountdownLabel = (() => {
    if (!lockout?.retryAfterSeconds || lockout.retryAfterSeconds <= 0) return null;
    const s = lockout.retryAfterSeconds;
    if (s >= 3600) {
      const h = Math.ceil(s / 3600);
      return bn ? `${h} ঘণ্টা পর আবার চেষ্টা করুন` : `Try again in ${h}h`;
    }
    if (s >= 60) {
      const m = Math.ceil(s / 60);
      return bn ? `${m} মিনিট পর আবার চেষ্টা করুন` : `Try again in ${m}m`;
    }
    return bn ? `${s} সেকেন্ড পর আবার চেষ্টা করুন` : `Try again in ${s}s`;
  })();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[420px] p-6 sm:p-7 rounded-3xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
        <DialogHeader className="space-y-2">
          <div className="relative mx-auto mb-1 w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/15 to-primary/20 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10">
            <ShieldCheck className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-emerald-500/30 flex items-center justify-center shadow-xs">
              <KeyRound className="w-3 h-3 text-primary" />
            </div>
          </div>
          <DialogTitle className="flex items-center justify-center gap-2 text-foreground text-center text-lg sm:text-xl font-bold">
            {title || (bn ? 'ইমেইল যাচাইকরণ' : 'Email Verification')}
          </DialogTitle>
          <DialogDescription className="text-center text-xs sm:text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
            {description || (bn
              ? `${email} এ একটি ৬-ডিজিটের কোড পাঠানো হয়েছে। কোডটি ${expiryMinutes} মিনিটের মধ্যে মেয়াদ শেষ হবে।`
              : `A 6-digit code has been sent to ${email}. The code will expire in ${expiryMinutes} minutes.`)}
          </DialogDescription>
        </DialogHeader>

        <div
          className="space-y-5 py-2"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !verifyDisabled) {
              e.preventDefault();
              void handleVerify();
            }
          }}
        >
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border/50 bg-muted/30 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0 text-left">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  {bn ? 'কোড পাঠানো হয়েছে' : 'Code sent to'}
                </span>
                <span className="text-xs sm:text-sm font-semibold text-foreground truncate font-mono block">
                  {email}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{bn ? 'প্রেরিত' : 'Sent'}</span>
            </div>
          </div>

          {otpSent && (
            <div
              className={`flex items-center justify-center gap-2 py-1.5 px-3.5 rounded-full text-xs font-semibold mx-auto w-fit border transition-all ${
                codeExpired
                  ? 'bg-destructive/10 text-destructive border-destructive/20'
                  : codeExpirySeconds <= 60
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25 animate-pulse'
                    : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
              }`}
              aria-live="polite"
              aria-atomic="true"
            >
              <Timer className="w-3.5 h-3.5" />
              {codeExpired
                ? (bn ? 'কোডের মেয়াদ শেষ — আবার পাঠান' : 'Code expired — resend to continue')
                : (bn
                  ? `কোডের মেয়াদ: ${formatDigits(formatCountdown(codeExpirySeconds), true)}`
                  : `Code expires in ${formatCountdown(codeExpirySeconds)}`)}
            </div>
          )}

          {lockout && (
            <Alert
              variant="destructive"
              className="border-destructive/30 bg-destructive/10 rounded-2xl shadow-xs"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              id="otp-lockout-alert"
            >
              <ShieldAlert className="h-4 w-4 text-destructive" />
              <AlertDescription className="space-y-1">
                <p className="font-semibold text-xs sm:text-sm" id="otp-lockout-message">
                  {lockout.message}
                </p>
                {lockoutCountdownLabel && (
                  <p
                    className="text-xs opacity-90 font-medium"
                    id="otp-lockout-countdown"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {lockoutCountdownLabel}
                  </p>
                )}
                <p
                  className="text-[10px] uppercase tracking-wide opacity-70 font-mono"
                  id="otp-lockout-code"
                >
                  {lockout.code}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center py-1">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={setOtpValue}
              disabled={verifyLocked}
              autoFocus
              aria-describedby={
                verifyLocked
                  ? 'otp-lockout-message otp-lockout-countdown otp-lockout-code'
                  : undefined
              }
              aria-invalid={verifyLocked || undefined}
              containerClassName="gap-2 sm:gap-2.5"
            >
              <InputOTPGroup className="gap-1.5 sm:gap-2">
                <InputOTPSlot index={0} className="w-10 h-13 sm:w-12 sm:h-14 rounded-xl border border-border/70 text-lg sm:text-xl font-mono font-bold bg-muted/20 data-[active=true]:border-primary data-[active=true]:ring-4 data-[active=true]:ring-primary/15 transition-all shadow-2xs first:rounded-xl last:rounded-xl" />
                <InputOTPSlot index={1} className="w-10 h-13 sm:w-12 sm:h-14 rounded-xl border border-border/70 text-lg sm:text-xl font-mono font-bold bg-muted/20 data-[active=true]:border-primary data-[active=true]:ring-4 data-[active=true]:ring-primary/15 transition-all shadow-2xs first:rounded-xl last:rounded-xl" />
                <InputOTPSlot index={2} className="w-10 h-13 sm:w-12 sm:h-14 rounded-xl border border-border/70 text-lg sm:text-xl font-mono font-bold bg-muted/20 data-[active=true]:border-primary data-[active=true]:ring-4 data-[active=true]:ring-primary/15 transition-all shadow-2xs first:rounded-xl last:rounded-xl" />
              </InputOTPGroup>
              <InputOTPSeparator className="text-muted-foreground/30 px-0.5 sm:px-1" />
              <InputOTPGroup className="gap-1.5 sm:gap-2">
                <InputOTPSlot index={3} className="w-10 h-13 sm:w-12 sm:h-14 rounded-xl border border-border/70 text-lg sm:text-xl font-mono font-bold bg-muted/20 data-[active=true]:border-primary data-[active=true]:ring-4 data-[active=true]:ring-primary/15 transition-all shadow-2xs first:rounded-xl last:rounded-xl" />
                <InputOTPSlot index={4} className="w-10 h-13 sm:w-12 sm:h-14 rounded-xl border border-border/70 text-lg sm:text-xl font-mono font-bold bg-muted/20 data-[active=true]:border-primary data-[active=true]:ring-4 data-[active=true]:ring-primary/15 transition-all shadow-2xs first:rounded-xl last:rounded-xl" />
                <InputOTPSlot index={5} className="w-10 h-13 sm:w-12 sm:h-14 rounded-xl border border-border/70 text-lg sm:text-xl font-mono font-bold bg-muted/20 data-[active=true]:border-primary data-[active=true]:ring-4 data-[active=true]:ring-primary/15 transition-all shadow-2xs first:rounded-xl last:rounded-xl" />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={verifyDisabled}
            className="btn-primary-gradient w-full h-11 sm:h-12 rounded-2xl font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.99] transition-all text-sm sm:text-base flex items-center justify-center gap-2"
            aria-describedby={
              verifyLocked
                ? 'otp-lockout-message otp-lockout-countdown'
                : undefined
            }
          >
            {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <span>
              {verifyLocked
                ? (bn ? 'যাচাইকরণ লক করা হয়েছে' : 'Verification locked')
                : codeExpired
                  ? (bn ? 'কোডের মেয়াদ শেষ' : 'Code expired')
                  : verifyCooldown > 0
                    ? (bn ? `${verifyCooldown}s পর আবার চেষ্টা করুন` : `Retry in ${verifyCooldown}s`)
                    : (bn ? 'যাচাই করুন' : 'Verify Code')}
            </span>
            {!verifyDisabled && !verifying && (
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md bg-white/20 text-white/95">
                ↵
              </kbd>
            )}
          </Button>

          <div className="flex flex-col items-center gap-2.5 pt-1">
            {resendLocked ? (
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="gap-2 text-muted-foreground rounded-full"
                aria-describedby="otp-lockout-message otp-lockout-countdown"
              >
                <ShieldAlert className="w-4 h-4" />
                {bn ? 'রিসেন্ড লক করা হয়েছে' : 'Resend locked'}
              </Button>
            ) : (
              <OtpResendButton
                onResend={handleResend}
                sending={sending}
                initialCooldown={0}
                defaultCooldown={30}
                onReady={(api) => { resendApiRef.current = api; }}
                persistKey={`${email}:${purpose}:${scope ?? 'default'}`}
              />
            )}

            <p className="text-[11px] text-muted-foreground/75 text-center flex items-center justify-center gap-1.5 pt-2 border-t border-border/30 w-full">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                {bn
                  ? 'ইমেইল না পেলে স্প্যাম (Spam / Junk) ফোল্ডার চেক করুন'
                  : 'Cannot find the email? Check your Spam or Junk folder'}
              </span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OtpVerificationDialog;
