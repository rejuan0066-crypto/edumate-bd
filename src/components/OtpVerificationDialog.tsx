import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOtpService } from '@/hooks/useOtpService';
import { Loader2, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import OtpResendButton from '@/components/OtpResendButton';

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
  const verifyTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resendApiRef = useRef<{ startCooldown: (s: number) => void } | null>(null);

  // Initial send when dialog opens
  useEffect(() => {
    if (open && !otpSent) {
      void handleInitialSend();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Verify endpoint cooldown ticker (for 429 from verify-otp)
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

  const handleInitialSend = async () => {
    const result = await sendOtp(email, purpose, recipientName);
    if (result.success) {
      setOtpSent(true);
      setExpiryMinutes(result.expiryMinutes || 10);
      // Kick off the resend cooldown
      resendApiRef.current?.startCooldown(result.retryAfterSeconds ?? 30);
      toast.success(bn ? `${email} এ কোড পাঠানো হয়েছে` : `Code sent to ${email}`);
    } else if (result.retryAfterSeconds) {
      // Initial send was rate-limited — honor server cooldown
      resendApiRef.current?.startCooldown(result.retryAfterSeconds);
      setOtpSent(true); // show the OTP UI so the user can still try to verify a previously-sent code
    }
  };

  const handleResend = () => sendOtp(email, purpose, recipientName);

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
      onVerified();
      onOpenChange(false);
      return;
    }
    // 429 from verify-otp → disable verify button for retry_after_seconds
    if (result.retryAfterSeconds && result.retryAfterSeconds > 0) {
      setVerifyCooldown(Math.ceil(result.retryAfterSeconds));
    }
    toast.error(result.error || (bn ? 'কোড ভুল' : 'Invalid code'));
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setOtpValue('');
      setOtpSent(false);
      setVerifyCooldown(0);
    }
    onOpenChange(val);
  };

  const verifyDisabled = verifying || otpValue.length !== 6 || verifyCooldown > 0;

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

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
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
          >
            {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {verifyCooldown > 0
              ? (bn ? `${verifyCooldown}s পর আবার চেষ্টা করুন` : `Retry in ${verifyCooldown}s`)
              : (bn ? 'যাচাই করুন' : 'Verify Code')}
          </Button>

          <div className="flex items-center justify-center">
            <OtpResendButton
              onResend={handleResend}
              sending={sending}
              initialCooldown={0}
              defaultCooldown={30}
              onReady={(api) => { resendApiRef.current = api; }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OtpVerificationDialog;
