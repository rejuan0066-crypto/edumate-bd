import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOtpService } from '@/hooks/useOtpService';
import { Loader2, Mail, ShieldCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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
  const [countdown, setCountdown] = useState(0);
  const [expiryMinutes, setExpiryMinutes] = useState(10);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (open && !otpSent) {
      handleSendOtp();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open]);

  useEffect(() => {
    if (countdown <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [countdown]);

  const handleSendOtp = async () => {
    const result = await sendOtp(email, purpose, recipientName);
    if (result.success) {
      setOtpSent(true);
      setCountdown(30);
      setExpiryMinutes(result.expiryMinutes || 10);
      toast.success(bn ? `${email} এ কোড পাঠানো হয়েছে` : `Code sent to ${email}`);
    }
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
      onVerified();
      onOpenChange(false);
    } else {
      toast.error(result.error || (bn ? 'কোড ভুল' : 'Invalid code'));
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setOtpValue('');
      setOtpSent(false);
      setCountdown(0);
    }
    onOpenChange(val);
  };

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
            disabled={verifying || otpValue.length !== 6}
            className="btn-primary-gradient w-full"
          >
            {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {bn ? 'যাচাই করুন' : 'Verify Code'}
          </Button>

          <div className="flex items-center justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSendOtp}
              disabled={countdown > 0 || sending}
              className="gap-2 text-muted-foreground"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {countdown > 0
                ? (bn ? `${countdown}s পর আবার পাঠান` : `Resend in ${countdown}s`)
                : (bn ? 'আবার কোড পাঠান' : 'Resend Code')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OtpVerificationDialog;
