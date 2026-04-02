import { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, Loader2, Eye, EyeOff, User, Clock, RefreshCw, CheckCircle2, ShieldCheck, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOtpService } from '@/hooks/useOtpService';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const AdminProfile = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sendOtp, sending } = useOtpService();

  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);

  // Flow steps: 'form' → 'otp' → 'done'
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [expiryMinutes, setExpiryMinutes] = useState(10);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setCurrentEmail(user.email);
    };
    getUser();
  }, []);

  // Countdown timer
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

  // Step 1: Verify password and send OTP to new email
  const handleSendOtp = useCallback(async () => {
    const targetEmail = newEmail.trim();
    const password = emailPassword.trim();

    if (!targetEmail) {
      toast.error(bn ? 'নতুন ইমেইল দিন' : 'Enter new email');
      return;
    }
    if (!password) {
      toast.error(bn ? 'বর্তমান পাসওয়ার্ড দিন' : 'Enter current password');
      return;
    }
    if (targetEmail === currentEmail) {
      toast.error(bn ? 'নতুন ইমেইল বর্তমান ইমেইলের মতো' : 'New email is same as current');
      return;
    }

    // Verify password first
    setVerifyingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: currentEmail,
      password,
    });
    setVerifyingPassword(false);

    if (signInError) {
      toast.error(bn ? 'পাসওয়ার্ড ভুল' : 'Incorrect password');
      return;
    }

    // Send OTP to new email
    const result = await sendOtp(targetEmail, 'email_verification', targetEmail);
    if (result.success) {
      setExpiryMinutes(result.expiryMinutes || 10);
      setStep('otp');
      setCountdown(60);
      toast.success(bn ? `${targetEmail} এ OTP কোড পাঠানো হয়েছে` : `OTP code sent to ${targetEmail}`);
    }
  }, [newEmail, emailPassword, currentEmail, bn, sendOtp]);

  // Resend OTP
  const handleResendOtp = useCallback(async () => {
    const result = await sendOtp(newEmail.trim(), 'email_verification', newEmail.trim());
    if (result.success) {
      setCountdown(60);
      setOtpCode('');
      toast.success(bn ? 'নতুন কোড পাঠানো হয়েছে' : 'New code sent');
    }
  }, [newEmail, bn, sendOtp]);

  // Step 2: Verify OTP and change email via edge function
  const handleVerifyAndChangeEmail = useCallback(async () => {
    if (otpCode.length !== 6) {
      toast.error(bn ? '৬ ডিজিটের কোড দিন' : 'Enter 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-email', {
        body: { new_email: newEmail.trim(), otp_code: otpCode },
      });

      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'ইমেইল পরিবর্তন ব্যর্থ' : 'Email change failed'));
        setVerifying(false);
        return;
      }

      // Success - re-login with new email
      setCurrentEmail(newEmail.trim());
      setStep('done');
      toast.success(bn ? '✅ ইমেইল সফলভাবে পরিবর্তন হয়েছে!' : '✅ Email changed successfully!');

      // Sign out and back in with new email
      setTimeout(async () => {
        await supabase.auth.signInWithPassword({
          email: newEmail.trim(),
          password: emailPassword.trim(),
        });
      }, 1500);
    } catch (err: any) {
      toast.error(bn ? 'ইমেইল পরিবর্তন ব্যর্থ' : 'Email change failed');
    }
    setVerifying(false);
  }, [otpCode, newEmail, emailPassword, bn]);

  const handleCancel = () => {
    setStep('form');
    setOtpCode('');
    setNewEmail('');
    setEmailPassword('');
    setCountdown(0);
  };

  const handleReset = () => {
    setStep('form');
    setOtpCode('');
    setNewEmail('');
    setEmailPassword('');
    setCountdown(0);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          {bn ? 'প্রোফাইল' : 'Profile'}
        </h1>

        {/* Email Change */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> {bn ? 'লগইন ইমেইল পরিবর্তন' : 'Change Login Email'}
          </h3>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${step === 'form' ? 'bg-primary/10 text-primary font-semibold' : 'bg-muted text-muted-foreground'}`}>
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">1</span>
              {bn ? 'তথ্য' : 'Info'}
            </div>
            <div className="w-6 h-px bg-border" />
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${step === 'otp' ? 'bg-primary/10 text-primary font-semibold' : step === 'done' ? 'bg-muted text-muted-foreground' : 'text-muted-foreground'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === 'otp' ? 'bg-primary text-primary-foreground' : step === 'done' ? 'bg-muted-foreground text-background' : 'bg-muted text-muted-foreground'}`}>2</span>
              {bn ? 'OTP যাচাই' : 'Verify'}
            </div>
            <div className="w-6 h-px bg-border" />
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${step === 'done' ? 'bg-green-500/10 text-green-600 font-semibold' : 'text-muted-foreground'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${step === 'done' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>✓</span>
              {bn ? 'সম্পন্ন' : 'Done'}
            </div>
          </div>

          {/* Current email display */}
          <div className="mb-4">
            <Label>{bn ? 'বর্তমান ইমেইল' : 'Current Email'}</Label>
            <Input className="mt-1 bg-muted/50" value={currentEmail} readOnly />
          </div>

          {/* Step 1: Form */}
          {step === 'form' && (
            <div className="space-y-4">
              <div>
                <Label>{bn ? 'নতুন ইমেইল' : 'New Email'}</Label>
                <Input
                  className="mt-1 bg-background"
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder={bn ? 'নতুন ইমেইল অ্যাড্রেস' : 'New email address'}
                />
              </div>
              <div>
                <Label>{bn ? 'বর্তমান পাসওয়ার্ড (নিশ্চিতকরণ)' : 'Current Password (confirmation)'}</Label>
                <div className="relative mt-1">
                  <Input
                    className="bg-background pr-10"
                    type={showEmailPassword ? 'text' : 'password'}
                    value={emailPassword}
                    onChange={e => setEmailPassword(e.target.value)}
                    placeholder={bn ? 'পাসওয়ার্ড দিন' : 'Enter password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmailPassword(!showEmailPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showEmailPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button
                onClick={handleSendOtp}
                disabled={sending || verifyingPassword}
                className="btn-primary-gradient"
              >
                {(sending || verifyingPassword) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                {bn ? 'OTP কোড পাঠান' : 'Send OTP Code'}
              </Button>
              <p className="text-xs text-muted-foreground">
                {bn ? '⚠️ নতুন ইমেইলে একটি ৬ ডিজিটের যাচাইকরণ কোড পাঠানো হবে।' : '⚠️ A 6-digit verification code will be sent to the new email.'}
              </p>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-2">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      {bn ? 'OTP কোড যাচাই করুন' : 'Verify OTP Code'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {bn
                        ? `${newEmail} এ একটি ৬ ডিজিটের কোড পাঠানো হয়েছে। কোডটি ${expiryMinutes} মিনিটের মধ্যে মেয়াদোত্তীর্ণ হবে।`
                        : `A 6-digit code has been sent to ${newEmail}. It will expire in ${expiryMinutes} minutes.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
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

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  onClick={handleVerifyAndChangeEmail}
                  disabled={verifying || otpCode.length !== 6}
                  className="btn-primary-gradient"
                >
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {bn ? 'যাচাই করুন ও ইমেইল পরিবর্তন করুন' : 'Verify & Change Email'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleResendOtp}
                  disabled={countdown > 0 || sending}
                  className="gap-2"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {countdown > 0
                    ? (bn ? `${countdown}s পর আবার পাঠান` : `Resend in ${countdown}s`)
                    : (bn ? 'আবার কোড পাঠান' : 'Resend')}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCancel}>
                  {bn ? 'বাতিল' : 'Cancel'}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Done */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
                <p className="font-semibold text-foreground">
                  {bn ? 'ইমেইল সফলভাবে পরিবর্তন হয়েছে!' : 'Email Changed Successfully!'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {bn ? `আপনার নতুন লগইন ইমেইল: ${currentEmail}` : `Your new login email: ${currentEmail}`}
                </p>
              </div>
              <Button variant="outline" onClick={handleReset}>
                {bn ? 'ঠিক আছে' : 'OK'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
