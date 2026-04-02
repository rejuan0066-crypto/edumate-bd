import { useState, useEffect, useRef, useCallback } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Mail, Loader2, Eye, EyeOff, User, RefreshCw, CheckCircle2, ShieldCheck, Send, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOtpService } from '@/hooks/useOtpService';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

const AdminProfile = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { sendOtp, sending } = useOtpService();

  const [currentEmail, setCurrentEmail] = useState('');

  // Email change states
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [showEmailPassword, setShowEmailPassword] = useState(false);
  const [useOtp, setUseOtp] = useState(false);
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyingPassword, setVerifyingPassword] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [expiryMinutes, setExpiryMinutes] = useState(10);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

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

  // ─── Email Change: Direct (password only) ───
  const handleDirectEmailChange = useCallback(async () => {
    const targetEmail = newEmail.trim();
    const password = emailPassword.trim();
    if (!targetEmail) { toast.error(bn ? 'নতুন ইমেইল দিন' : 'Enter new email'); return; }
    if (!password) { toast.error(bn ? 'বর্তমান পাসওয়ার্ড দিন' : 'Enter current password'); return; }
    if (targetEmail === currentEmail) { toast.error(bn ? 'নতুন ইমেইল বর্তমান ইমেইলের মতো' : 'New email is same as current'); return; }

    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-email', {
        body: { new_email: targetEmail, skip_otp: true, current_password: password },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'ইমেইল পরিবর্তন ব্যর্থ' : 'Email change failed'));
        setVerifying(false);
        return;
      }
      setCurrentEmail(targetEmail);
      setStep('done');
      toast.success(bn ? '✅ ইমেইল সফলভাবে পরিবর্তন হয়েছে!' : '✅ Email changed successfully!');
      setTimeout(async () => {
        await supabase.auth.signInWithPassword({ email: targetEmail, password });
      }, 1500);
    } catch {
      toast.error(bn ? 'ইমেইল পরিবর্তন ব্যর্থ' : 'Email change failed');
    }
    setVerifying(false);
  }, [newEmail, emailPassword, currentEmail, bn]);

  // ─── Email Change: OTP flow ───
  const handleSendOtp = useCallback(async () => {
    const targetEmail = newEmail.trim();
    const password = emailPassword.trim();
    if (!targetEmail) { toast.error(bn ? 'নতুন ইমেইল দিন' : 'Enter new email'); return; }
    if (!password) { toast.error(bn ? 'বর্তমান পাসওয়ার্ড দিন' : 'Enter current password'); return; }
    if (targetEmail === currentEmail) { toast.error(bn ? 'নতুন ইমেইল বর্তমান ইমেইলের মতো' : 'New email is same as current'); return; }

    setVerifyingPassword(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: currentEmail, password });
    setVerifyingPassword(false);
    if (signInError) { toast.error(bn ? 'পাসওয়ার্ড ভুল' : 'Incorrect password'); return; }

    const result = await sendOtp(targetEmail, 'email_verification', targetEmail);
    if (result.success) {
      setExpiryMinutes(result.expiryMinutes || 10);
      setStep('otp');
      setCountdown(60);
      toast.success(bn ? `${targetEmail} এ OTP কোড পাঠানো হয়েছে` : `OTP code sent to ${targetEmail}`);
    }
  }, [newEmail, emailPassword, currentEmail, bn, sendOtp]);

  const handleResendOtp = useCallback(async () => {
    const result = await sendOtp(newEmail.trim(), 'email_verification', newEmail.trim());
    if (result.success) { setCountdown(60); setOtpCode(''); toast.success(bn ? 'নতুন কোড পাঠানো হয়েছে' : 'New code sent'); }
  }, [newEmail, bn, sendOtp]);

  const handleVerifyAndChangeEmail = useCallback(async () => {
    if (otpCode.length !== 6) { toast.error(bn ? '৬ ডিজিটের কোড দিন' : 'Enter 6-digit code'); return; }
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
      setCurrentEmail(newEmail.trim());
      setStep('done');
      toast.success(bn ? '✅ ইমেইল সফলভাবে পরিবর্তন হয়েছে!' : '✅ Email changed successfully!');
      setTimeout(async () => {
        await supabase.auth.signInWithPassword({ email: newEmail.trim(), password: emailPassword.trim() });
      }, 1500);
    } catch {
      toast.error(bn ? 'ইমেইল পরিবর্তন ব্যর্থ' : 'Email change failed');
    }
    setVerifying(false);
  }, [otpCode, newEmail, emailPassword, bn]);

  const handleEmailReset = () => {
    setStep('form');
    setOtpCode('');
    setNewEmail('');
    setEmailPassword('');
    setCountdown(0);
  };

  // ─── Password Change ───
  const handleChangePassword = useCallback(async () => {
    if (!currentPassword.trim()) { toast.error(bn ? 'বর্তমান পাসওয়ার্ড দিন' : 'Enter current password'); return; }
    if (newPassword.length < 6) { toast.error(bn ? 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে' : 'New password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error(bn ? 'পাসওয়ার্ড মিলছে না' : 'Passwords do not match'); return; }

    setChangingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('change-password', {
        body: { current_password: currentPassword.trim(), new_password: newPassword },
      });
      if (error || !data?.success) {
        toast.error(data?.error || error?.message || (bn ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' : 'Password change failed'));
        setChangingPassword(false);
        return;
      }
      toast.success(bn ? '✅ পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!' : '✅ Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // Re-login with new password
      setTimeout(async () => {
        await supabase.auth.signInWithPassword({ email: currentEmail, password: newPassword });
      }, 1000);
    } catch {
      toast.error(bn ? 'পাসওয়ার্ড পরিবর্তন ব্যর্থ' : 'Password change failed');
    }
    setChangingPassword(false);
  }, [currentPassword, newPassword, confirmPassword, currentEmail, bn]);

  const PasswordInput = ({ value, onChange, show, onToggle, placeholder }: { value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string }) => (
    <div className="relative">
      <Input className="bg-background pr-10" type={show ? 'text' : 'password'} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
      <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          {bn ? 'প্রোফাইল' : 'Profile'}
        </h1>

        {/* ═══ Email Change ═══ */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> {bn ? 'লগইন ইমেইল পরিবর্তন' : 'Change Login Email'}
          </h3>

          {/* Current email */}
          <div className="mb-4">
            <Label>{bn ? 'বর্তমান ইমেইল' : 'Current Email'}</Label>
            <Input className="mt-1 bg-muted/50" value={currentEmail} readOnly />
          </div>

          {step === 'form' && (
            <div className="space-y-4">
              {/* OTP toggle */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border">
                <Switch checked={useOtp} onCheckedChange={setUseOtp} />
                <div>
                  <p className="text-sm font-medium">{bn ? 'OTP যাচাই ব্যবহার করুন' : 'Use OTP Verification'}</p>
                  <p className="text-xs text-muted-foreground">
                    {useOtp
                      ? (bn ? 'নতুন ইমেইলে OTP কোড পাঠিয়ে যাচাই করা হবে' : 'OTP code will be sent to new email for verification')
                      : (bn ? 'শুধুমাত্র বর্তমান পাসওয়ার্ড দিয়ে পরিবর্তন হবে' : 'Change with current password only')}
                  </p>
                </div>
              </div>

              <div>
                <Label>{bn ? 'নতুন ইমেইল' : 'New Email'}</Label>
                <Input className="mt-1 bg-background" type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder={bn ? 'নতুন ইমেইল অ্যাড্রেস' : 'New email address'} />
              </div>
              <div>
                <Label>{bn ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}</Label>
                <div className="mt-1">
                  <PasswordInput value={emailPassword} onChange={setEmailPassword} show={showEmailPassword} onToggle={() => setShowEmailPassword(!showEmailPassword)} placeholder={bn ? 'পাসওয়ার্ড দিন' : 'Enter password'} />
                </div>
              </div>

              {useOtp ? (
                <Button onClick={handleSendOtp} disabled={sending || verifyingPassword} className="btn-primary-gradient">
                  {(sending || verifyingPassword) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                  {bn ? 'OTP কোড পাঠান' : 'Send OTP Code'}
                </Button>
              ) : (
                <Button onClick={handleDirectEmailChange} disabled={verifying} className="btn-primary-gradient">
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {bn ? 'ইমেইল পরিবর্তন করুন' : 'Change Email'}
                </Button>
              )}
            </div>
          )}

          {/* OTP step */}
          {step === 'otp' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">{bn ? 'OTP কোড যাচাই করুন' : 'Verify OTP Code'}</p>
                    <p className="text-sm text-muted-foreground">
                      {bn ? `${newEmail} এ পাঠানো ৬ ডিজিটের কোড দিন। মেয়াদ ${expiryMinutes} মিনিট।` : `Enter the 6-digit code sent to ${newEmail}. Expires in ${expiryMinutes} min.`}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center py-2">
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    {[0,1,2,3,4,5].map(i => <InputOTPSlot key={i} index={i} />)}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={handleVerifyAndChangeEmail} disabled={verifying || otpCode.length !== 6} className="btn-primary-gradient">
                  {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  {bn ? 'যাচাই ও পরিবর্তন' : 'Verify & Change'}
                </Button>
                <Button size="sm" variant="outline" onClick={handleResendOtp} disabled={countdown > 0 || sending} className="gap-2">
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {countdown > 0 ? `${countdown}s` : (bn ? 'আবার পাঠান' : 'Resend')}
                </Button>
                <Button size="sm" variant="ghost" onClick={handleEmailReset}>{bn ? 'বাতিল' : 'Cancel'}</Button>
              </div>
            </div>
          )}

          {/* Done */}
          {step === 'done' && (
            <div className="space-y-4">
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-primary mx-auto" />
                <p className="font-semibold text-foreground">{bn ? 'ইমেইল সফলভাবে পরিবর্তন হয়েছে!' : 'Email Changed Successfully!'}</p>
                <p className="text-sm text-muted-foreground">{bn ? `নতুন ইমেইল: ${currentEmail}` : `New email: ${currentEmail}`}</p>
              </div>
              <Button variant="outline" onClick={handleEmailReset}>{bn ? 'ঠিক আছে' : 'OK'}</Button>
            </div>
          )}
        </div>

        {/* ═══ Password Change ═══ */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" /> {bn ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}
          </h3>
          <div className="space-y-4">
            <div>
              <Label>{bn ? 'বর্তমান পাসওয়ার্ড' : 'Current Password'}</Label>
              <div className="mt-1">
                <PasswordInput value={currentPassword} onChange={setCurrentPassword} show={showCurrentPw} onToggle={() => setShowCurrentPw(!showCurrentPw)} placeholder={bn ? 'বর্তমান পাসওয়ার্ড' : 'Current password'} />
              </div>
            </div>
            <div>
              <Label>{bn ? 'নতুন পাসওয়ার্ড' : 'New Password'}</Label>
              <div className="mt-1">
                <PasswordInput value={newPassword} onChange={setNewPassword} show={showNewPw} onToggle={() => setShowNewPw(!showNewPw)} placeholder={bn ? 'নতুন পাসওয়ার্ড (কমপক্ষে ৬ অক্ষর)' : 'New password (min 6 chars)'} />
              </div>
            </div>
            <div>
              <Label>{bn ? 'নতুন পাসওয়ার্ড নিশ্চিত করুন' : 'Confirm New Password'}</Label>
              <Input className="mt-1 bg-background" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={bn ? 'আবার নতুন পাসওয়ার্ড দিন' : 'Re-enter new password'} />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword} className="btn-primary-gradient">
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
              {bn ? 'পাসওয়ার্ড পরিবর্তন করুন' : 'Change Password'}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProfile;
