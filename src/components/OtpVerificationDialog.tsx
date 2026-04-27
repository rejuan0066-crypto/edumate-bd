import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOtpService } from '@/hooks/useOtpService';
import { Loader2, Mail, ShieldCheck, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import OtpResendButton from '@/components/OtpResendButton';
import { trackOtpLockout } from '@/lib/otpAnalytics';

interface OtpVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  purpose: 'email_verification' | 'password_reset';
  recipientName?: string;
  onVerified: () => void;
  title?: string;
  description?: string;
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
}: OtpVerificationDialogProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sendOtp, verifyOtp, sending, verifying } = useOtpService();
  const [otpValue, setOtpValue] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [expiryMinutes, setExpiryMinutes] = useState(10);
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

  // Initial send when dialog opens
  useEffect(() => {
    if (open && !otpSent) {
      void handleInitialSend();
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
    const result = await sendOtp(email, purpose, recipientName);
    if (result.success) {
      setOtpSent(true);
      setExpiryMinutes(result.expiryMinutes || 10);
      resendApiRef.current?.startCooldown(result.retryAfterSeconds ?? 30);
      toast.success(bn ? `${email} এ কোড পাঠানো হয়েছে` : `Code sent to ${email}`);
      return;
    }
    // Failed initial send — check for lockout
    const locked = applyLockout(
      result.errorCode,
      result.message,
      result.retryAfterSeconds,
      bn ? 'অ্যাকাউন্ট সাময়িকভাবে লক করা হয়েছে' : 'Account temporarily locked',
    );
    if (result.retryAfterSeconds) {
      resendApiRef.current?.startCooldown(result.retryAfterSeconds);
    }
    // Show OTP UI either way so user can verify a previously issued code
    if (!locked || locked) setOtpSent(true);
  };

  const handleResend = async () => {
    const result = await sendOtp(email, purpose, recipientName);
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
    }
    onOpenChange(val);
  };

  const verifyLocked = !!lockout; // both scopes lock verify
  const resendLocked = lockout?.scope === 'both';

  const verifyDisabled =
    verifying || otpValue.length !== 6 || verifyCooldown > 0 || verifyLocked;

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {title || (bn ? 'ইমেইল যাচাইকরণ' : 'Email Verification')}
          </DialogTitle>
          <DialogDescription>
            {description || (bn
              ? `${email} এ একটি ৬-ডিজিটের কোড পাঠানো হয়েছে। কোডটি ${expiryMinutes} মিনিটের মধ্যে মেয়াদ শেষ হবে।`
              : `A 6-digit code has been sent to ${email}. The code will expire in ${expiryMinutes} minutes.`)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 text-sm">
            <Mail className="w-4 h-4 text-primary" />
            <span className="text-foreground font-medium">{email}</span>
          </div>

          {lockout && (
            <Alert
              variant="destructive"
              className="border-destructive/40"
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              id="otp-lockout-alert"
            >
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription className="space-y-1">
                <p className="font-medium" id="otp-lockout-message">
                  {lockout.message}
                </p>
                {lockoutCountdownLabel && (
                  <p
                    className="text-xs opacity-80"
                    id="otp-lockout-countdown"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {lockoutCountdownLabel}
                  </p>
                )}
                <p
                  className="text-[10px] uppercase tracking-wide opacity-60"
                  id="otp-lockout-code"
                >
                  {lockout.code}
                </p>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={setOtpValue}
              disabled={verifyLocked}
              aria-describedby={
                verifyLocked
                  ? 'otp-lockout-message otp-lockout-countdown otp-lockout-code'
                  : undefined
              }
              aria-invalid={verifyLocked || undefined}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button
            onClick={handleVerify}
            disabled={verifyDisabled}
            className="btn-primary-gradient w-full"
            aria-describedby={
              verifyLocked
                ? 'otp-lockout-message otp-lockout-countdown'
                : undefined
            }
          >
            {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {verifyLocked
              ? (bn ? 'যাচাইকরণ লক করা হয়েছে' : 'Verification locked')
              : verifyCooldown > 0
                ? (bn ? `${verifyCooldown}s পর আবার চেষ্টা করুন` : `Retry in ${verifyCooldown}s`)
                : (bn ? 'যাচাই করুন' : 'Verify Code')}
          </Button>

          <div className="flex items-center justify-center">
            {resendLocked ? (
              <Button
                variant="ghost"
                size="sm"
                disabled
                className="gap-2 text-muted-foreground"
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
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OtpVerificationDialog;
