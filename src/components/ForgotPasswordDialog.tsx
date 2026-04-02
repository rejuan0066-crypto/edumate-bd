import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOtpService } from '@/hooks/useOtpService';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, Lock, ShieldCheck, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'email' | 'otp' | 'newPassword';

const ForgotPasswordDialog = ({ open, onOpenChange }: ForgotPasswordDialogProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sendOtp, verifyOtp, sending, verifying } = useOtpService();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) {
      toast.error(bn ? 'ইমেইল দিন' : 'Enter email');
      return;
    }
    const result = await sendOtp(email.trim(), 'password_reset');
    if (result.success) {
      setStep('otp');
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast.error(bn ? '৬ ডিজিটের কোড দিন' : 'Enter 6-digit code');
      return;
    }
    const result = await verifyOtp(email, otpValue, 'password_reset');
    if (result.valid) {
      toast.success(bn ? 'কোড যাচাই সফল!' : 'Code verified!');
      setStep('newPassword');
    } else {
      toast.error(result.error || (bn ? 'কোড ভুল' : 'Invalid code'));
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      toast.error(bn ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে' : 'Password must be at least 6 characters');
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
      body: { email, new_password: newPassword },
    });

    setResetting(false);
    if (error) {
      toast.error(bn ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' : 'Password reset failed');
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
              <Button onClick={handleSendOtp} disabled={sending} className="btn-primary-gradient w-full">
                {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {bn ? 'কোড পাঠান' : 'Send Code'}
              </Button>
            </>
          )}

          {/* Step 2: OTP */}
          {step === 'otp' && (
            <>
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
              <Button onClick={handleVerifyOtp} disabled={verifying || otpValue.length !== 6} className="btn-primary-gradient w-full">
                {verifying && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {bn ? 'যাচাই করুন' : 'Verify Code'}
              </Button>
              <Button variant="ghost" size="sm" className="w-full" onClick={() => setStep('email')}>
                <ArrowLeft className="w-4 h-4 mr-2" /> {bn ? 'পিছনে যান' : 'Go Back'}
              </Button>
            </>
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
                    onChange={(e) => setNewPassword(e.target.value)}
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
              </div>
              <div>
                <Label className="flex items-center gap-2 mb-1.5">
                  <Lock className="w-4 h-4" /> {bn ? 'পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm Password'}
                </Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
