import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOtpService } from '@/hooks/useOtpService';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, Lock, ShieldCheck, Eye, EyeOff, ArrowLeft, KeyRound, Sparkles, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { formatDigits } from '@/lib/utils';
import PasswordStrengthMeter, { isPasswordStrongAgainst, firstFailedRuleMessage, usePasswordPolicy } from '@/components/PasswordStrengthMeter';
import { sanitizePasswordInput } from '@/lib/passwordInput';
import { parseEdgeError } from '@/lib/edgeError';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'email' | 'otp' | 'newPassword';

const ForgotPasswordDialog = ({ open, onOpenChange }: ForgotPasswordDialogProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sendOtp, verifyOtp, sending, verifying } = useOtpService();
  const policy = usePasswordPolicy();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleSendOtp = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      toast.error(bn ? 'সঠিক ইমেইল দিন' : 'Enter a valid email');
      return;
    }
    if (cooldown > 0) return;
    // OTP verification is mandatory for password reset — the backend refuses
    // any reset that has no recently verified code for this email.
    const result = await sendOtp(email.trim(), 'password_reset', undefined, 'password_reset');
    if (result.success) {
      setOtpValue('');
      setCooldown(60);
      setStep('otp');
      toast.success(bn ? 'কোড পাঠানো হয়েছে' : 'Code sent');
    } else if (result.retryAfterSeconds) {
      setCooldown(result.retryAfterSeconds);
      toast.error(
        bn
          ? `অনুগ্রহ করে ${result.retryAfterSeconds} সেকেন্ড পরে চেষ্টা করুন`
          : `Please try again in ${result.retryAfterSeconds}s`
      );
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast.error(bn ? '৬ ডিজিটের কোড দিন' : 'Enter 6-digit code');
      return;
    }
    const result = await verifyOtp(email.trim(), otpValue, 'password_reset');
    if (result.valid) {
      toast.success(bn ? 'কোড যাচাই সফল!' : 'Code verified!');
      setStep('newPassword');
    } else {
      setOtpValue('');
      toast.error(
        result.error ||
          (typeof result.attemptsRemaining === 'number'
            ? bn
              ? `কোড ভুল — আর ${result.attemptsRemaining} বার চেষ্টা করা যাবে`
              : `Invalid code — ${result.attemptsRemaining} attempts left`
            : bn
              ? 'কোড ভুল'
              : 'Invalid code')
      );
    }
  };

  const handleResetPassword = async () => {
    if (!isPasswordStrongAgainst(newPassword, policy)) {
      toast.error(firstFailedRuleMessage(newPassword, policy, bn) || (bn ? 'পাসওয়ার্ড সব শর্ত পূরণ করছে না' : 'Password does not meet requirements'));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(bn ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match');
      return;
    }

    setResetting(true);
    // Sign in with OTP-verified email, then update password
    // Since OTP is already verified, we use admin-level password update via edge function
    const { error } = await supabase.functions.invoke('reset-password', {
      body: { email: email.trim(), new_password: newPassword, code: otpValue },
    });

    setResetting(false);
    if (error) {
      const msg = await parseEdgeError(error, null, bn);
      toast.error(msg || (bn ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' : 'Password reset failed'));
      setStep('email');
      setOtpValue('');
    } else {
      toast.success(bn ? 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!' : 'Password reset successful!');
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('email');
    setEmail('');
    setOtpValue('');
    setNewPassword('');
    setConfirmPassword('');
    setCooldown(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => val ? onOpenChange(true) : handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {bn ? 'পাসওয়ার্ড রিসেট' : 'Reset Password'}
          </DialogTitle>
          <DialogDescription>
            {step === 'email' && (bn ? 'আপনার অ্যাকাউন্টের ইমেইল দিন' : 'Enter your account email')}
            {step === 'otp' && (bn ? `${email} এ পাঠানো ৬-ডিজিট কোড দিন` : `Enter the 6-digit code sent to ${email}`)}
            {step === 'newPassword' && (bn ? 'নতুন পাসওয়ার্ড সেট করুন' : 'Set your new password')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Step 1: Email */}
          {step === 'email' && (
            <>
              <div>
                <Label className="flex items-center gap-2 mb-1.5">
                  <Mail className="w-4 h-4" /> {bn ? 'ইমেইল' : 'Email'}
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={bn ? 'ইমেইল এড্রেস' : 'Email address'}
                  className="bg-background"
                />
              </div>
              <Button onClick={handleSendOtp} disabled={sending || cooldown > 0} className="btn-primary-gradient w-full">
                {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {cooldown > 0
                  ? bn ? `আবার পাঠান (${cooldown}s)` : `Resend (${cooldown}s)`
                  : bn ? 'কোড পাঠান' : 'Send Code'}
              </Button>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <div
              className="space-y-4"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !verifying && otpValue.length === 6) {
                  e.preventDefault();
                  void handleVerifyOtp();
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

              {cooldown > 0 && (
                <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full text-xs font-medium text-muted-foreground bg-muted/30 border border-border/30 w-fit mx-auto">
                  <Timer className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {bn
                      ? `পুনরায় পাঠানোর সময়: ${formatDigits(cooldown, true)} সেকেন্ড`
                      : `Resend available in ${cooldown}s`}
                  </span>
                </div>
              )}

              <div className="flex justify-center py-1">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                  autoFocus
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
                onClick={handleVerifyOtp}
                disabled={verifying || otpValue.length !== 6}
                className="btn-primary-gradient w-full h-11 sm:h-12 rounded-2xl font-semibold shadow-md shadow-primary/20 hover:shadow-lg transition-all text-sm sm:text-base flex items-center justify-center gap-2"
              >
                {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <span>{bn ? 'যাচাই করুন' : 'Verify Code'}</span>
                {!verifying && otpValue.length === 6 && (
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md bg-white/20 text-white/95">
                    ↵
                  </kbd>
                )}
              </Button>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 rounded-xl border-border/50 text-xs font-medium"
                  onClick={handleSendOtp}
                  disabled={sending || cooldown > 0}
                >
                  {sending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                  {cooldown > 0
                    ? bn ? `আবার পাঠান (${cooldown}s)` : `Resend (${cooldown}s)`
                    : bn ? 'আবার কোড পাঠান' : 'Resend Code'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 rounded-xl text-xs font-medium text-muted-foreground"
                  onClick={() => setStep('email')}
                >
                  <ArrowLeft className="w-3.5 h-3.5 mr-1" /> {bn ? 'ইমেইল পরিবর্তন' : 'Change Email'}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground/75 text-center flex items-center justify-center gap-1.5 pt-2 border-t border-border/30 w-full">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  {bn
                    ? 'ইমেইল না পেলে স্প্যাম (Spam / Junk) ফোল্ডার চেক করুন'
                    : 'Cannot find the email? Check your Spam or Junk folder'}
                </span>
              </p>
            </div>
          )}

          {/* Step 3: New Password */}
          {step === 'newPassword' && (
            <>
              <div>
                <Label className="flex items-center gap-2 mb-1.5">
                  <Lock className="w-4 h-4" /> {bn ? 'নতুন পাসওয়ার্ড' : 'New Password'}
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(sanitizePasswordInput(e.target.value))}
                    placeholder="••••••••"
                    className="bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <PasswordStrengthMeter password={newPassword} bn={bn} />
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-1.5">
                  <Lock className="w-4 h-4" /> {bn ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                </Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(sanitizePasswordInput(e.target.value))}
                  placeholder="••••••••"
                  className="bg-background"
                />
              </div>
              <Button onClick={handleResetPassword} disabled={resetting} className="btn-primary-gradient w-full">
                {resetting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {bn ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Reset Password'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForgotPasswordDialog;
