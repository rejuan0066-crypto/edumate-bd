import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { otpService } from '@/hooks/useOtpService';
import {
  Loader2,
  Mail,
  KeyRound,
  Send,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface EmailVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEmail?: string;
  onSuccess?: () => void;
}

type VerificationTab = 'otp' | 'link';

const EmailVerificationDialog = ({
  open,
  onOpenChange,
  initialEmail = '',
  onSuccess,
}: EmailVerificationDialogProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  const [activeTab, setActiveTab] = useState<VerificationTab>('otp');
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);

  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);
  const [linkCooldown, setLinkCooldown] = useState(0);

  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    if (otpCooldown <= 0) return;
    const timer = setInterval(() => {
      setOtpCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCooldown]);

  useEffect(() => {
    if (linkCooldown <= 0) return;
    const timer = setInterval(() => {
      setLinkCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [linkCooldown]);

  const cleanEmail = email.trim().toLowerCase();
  const isValidEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail);

  // Method 1: Send OTP
  const handleSendOtp = async () => {
    if (!isValidEmail) {
      toast.error(bn ? 'অনুগ্রহ করে সঠিক ইমেইল এড্রেস লিখুন' : 'Please enter a valid email address');
      return;
    }
    if (otpCooldown > 0) return;

    setSendingOtp(true);
    let success = false;
    let errorMessage = '';

    try {
      // 1. Try Supabase Auth native OTP (uses Supabase email provider)
      const { error: sbError } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { shouldCreateUser: false },
      });

      if (!sbError) {
        success = true;
      } else {
        errorMessage = sbError.message;
      }

      // 2. Also dispatch via app's OTP service in parallel
      try {
        const edgeRes = await otpService.sendOtp(
          cleanEmail,
          'email_verification',
          undefined,
          undefined,
          { toastOnError: false }
        );
        if (edgeRes.success) {
          success = true;
        }
      } catch (_) {}

      if (success) {
        setOtpSent(true);
        setOtpCooldown(60);
        toast.success(
          bn
            ? `${cleanEmail} এ ৬-ডিজিটের OTP কোড পাঠানো হয়েছে`
            : `6-digit OTP code sent to ${cleanEmail}`
        );
      } else {
        toast.error(
          errorMessage ||
            (bn ? 'OTP কোড পাঠাতে সমস্যা হয়েছে। লিংক পদ্ধতি ব্যবহার করুন।' : 'Failed to send OTP code. Try the email link method.')
        );
      }
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'ত্রুটি ঘটেছে' : 'Error occurred'));
    } finally {
      setSendingOtp(false);
    }
  };

  // Method 1: Verify OTP
  const handleVerifyOtp = async () => {
    if (otpCode.length !== 6) {
      toast.error(bn ? '৬-ডিজিটের সম্পূর্ণ কোড দিন' : 'Enter the complete 6-digit code');
      return;
    }

    setVerifyingOtp(true);
    let verified = false;

    try {
      // 1. Try Supabase verifyOtp as 'email'
      const { error: errEmail } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: otpCode.trim(),
        type: 'email',
      });

      if (!errEmail) {
        verified = true;
      } else {
        // 2. Try Supabase verifyOtp as 'signup'
        const { error: errSignup } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: otpCode.trim(),
          type: 'signup',
        });
        if (!errSignup) {
          verified = true;
        } else {
          // 3. Try custom edge function verifyOtp
          const edgeRes = await otpService.verifyOtp(cleanEmail, otpCode.trim(), 'email_verification');
          if (edgeRes.valid) {
            verified = true;
          }
        }
      }

      if (verified) {
        toast.success(
          bn
            ? 'অভিনন্দন! আপনার ইমেইল সফলভাবে ভেরিফাই হয়েছে।'
            : 'Congratulations! Your email has been verified successfully.'
        );
        onOpenChange(false);
        setOtpCode('');
        setOtpSent(false);
        if (onSuccess) onSuccess();
      } else {
        toast.error(bn ? 'কোডটি ভুল বা মেয়াদোত্তীর্ণ। আবার চেষ্টা করুন।' : 'Invalid or expired code. Please try again.');
      }
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'যাচাই ব্যর্থ হয়েছে' : 'Verification failed'));
    } finally {
      setVerifyingOtp(false);
    }
  };

  // Method 2: Send Confirmation Link
  const handleSendLink = async () => {
    if (!isValidEmail) {
      toast.error(bn ? 'অনুগ্রহ করে সঠিক ইমেইল এড্রেস লিখুন' : 'Please enter a valid email address');
      return;
    }
    if (linkCooldown > 0) return;

    setSendingLink(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: cleanEmail,
      });

      if (error) {
        toast.error(error.message || (bn ? 'লিংক পাঠাতে ব্যর্থ হয়েছে' : 'Failed to send link'));
      } else {
        setLinkSent(true);
        setLinkCooldown(60);
        toast.success(
          bn
            ? `${cleanEmail} এ কনফার্মেশন লিংক পাঠানো হয়েছে`
            : `Confirmation link sent to ${cleanEmail}`
        );
      }
    } catch (e: any) {
      toast.error(e?.message || (bn ? 'ত্রুটি ঘটেছে' : 'Error occurred'));
    } finally {
      setSendingLink(false);
    }
  };

  const handleClose = (val: boolean) => {
    if (!val) {
      setOtpCode('');
      setOtpSent(false);
      setLinkSent(false);
    }
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-display">
            <ShieldCheck className="w-5 h-5 text-primary" />
            {bn ? 'ইমেইল ভেরিফিকেশন' : 'Email Verification'}
          </DialogTitle>
          <DialogDescription>
            {bn
              ? 'আপনার অ্যাকাউন্ট সক্রিয় করতে নিচের যেকোনো একটি পদ্ধতি ব্যবহার করুন:'
              : 'Choose either method below to activate your account:'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg text-sm font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('otp')}
            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'otp'
                ? 'bg-background text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <KeyRound className="w-4 h-4 text-primary" />
            {bn ? '১. OTP কোড' : '1. OTP Code'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`py-2 px-3 rounded-md transition-all flex items-center justify-center gap-2 ${
              activeTab === 'link'
                ? 'bg-background text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mail className="w-4 h-4 text-primary" />
            {bn ? '২. ইমেইল লিংক' : '2. Email Link'}
          </button>
        </div>

        {/* Common Email Input */}
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">
            {bn ? 'ইমেইল এড্রেস' : 'Email Address'}
          </Label>
          <div className="relative">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="bg-background pr-10"
              autoComplete="email"
            />
            <Mail className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* TAB 1: OTP CODE */}
        {activeTab === 'otp' && (
          <div className="space-y-4 pt-1">
            {!otpSent ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {bn
                    ? 'আপনার ইমেইলে একটি ৬-ডিজিটের ওটিপি কোড পাঠানো হবে। কোডটি এখানে বসিয়ে যাচাই করতে পারবেন।'
                    : 'A 6-digit OTP code will be sent to your email. Enter it here to verify instantly.'}
                </p>
                <Button
                  onClick={handleSendOtp}
                  disabled={sendingOtp || !isValidEmail || otpCooldown > 0}
                  className="btn-primary-gradient w-full py-2.5"
                >
                  {sendingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {bn ? 'কোড পাঠানো হচ্ছে...' : 'Sending code...'}
                    </>
                  ) : otpCooldown > 0 ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      {bn ? `${otpCooldown}s পর আবার পাঠান` : `Resend in ${otpCooldown}s`}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {bn ? 'OTP কোড পাঠান' : 'Send OTP Code'}
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Alert className="bg-primary/5 border-primary/20 py-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <AlertDescription className="text-xs text-foreground">
                    {bn
                      ? `${cleanEmail} এ পাঠানো ৬-ডিজিটের কোডটি লিখুন:`
                      : `Enter the 6-digit code sent to ${cleanEmail}:`}
                  </AlertDescription>
                </Alert>

                <div className="flex justify-center py-2">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus>
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
                  onClick={handleVerifyOtp}
                  disabled={verifyingOtp || otpCode.length !== 6}
                  className="btn-primary-gradient w-full"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {bn ? 'যাচাই করা হচ্ছে...' : 'Verifying...'}
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      {bn ? 'কোড যাচাই করুন' : 'Verify Code'}
                    </>
                  )}
                </Button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {bn ? 'ইমেইল পরিবর্তন করুন' : 'Change email'}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSendOtp}
                    disabled={sendingOtp || otpCooldown > 0}
                    className="text-xs text-primary hover:text-primary/90 h-auto p-0"
                  >
                    {otpCooldown > 0
                      ? bn
                        ? `${otpCooldown}s পর পুনরায় পাঠান`
                        : `Resend in ${otpCooldown}s`
                      : bn
                      ? 'কোড আবার পাঠান'
                      : 'Resend code'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: EMAIL LINK */}
        {activeTab === 'link' && (
          <div className="space-y-4 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {bn
                ? 'আপনার ইমেইলে সরাসরি একটি কনফার্মেশন লিংক পাঠানো হবে। সেই লিংকে ক্লিক করলেই অ্যাকাউন্ট নিশ্চিত হয়ে যাবে।'
                : 'A confirmation link will be sent to your email. Simply click the link in your inbox to verify.'}
            </p>

            {linkSent && (
              <Alert className="bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <AlertDescription className="text-xs">
                  {bn ? (
                    <>
                      <strong>লিংক পাঠানো হয়েছে!</strong> আপনার ইনবক্স অথবা স্প্যাম ফোল্ডার চেক করে লিংকে ক্লিক করুন।
                    </>
                  ) : (
                    <>
                      <strong>Link sent!</strong> Please check your inbox or spam folder and click the link.
                    </>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSendLink}
              disabled={sendingLink || !isValidEmail || linkCooldown > 0}
              className="btn-primary-gradient w-full py-2.5"
            >
              {sendingLink ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {bn ? 'লিংক পাঠানো হচ্ছে...' : 'Sending link...'}
                </>
              ) : linkCooldown > 0 ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {bn ? `${linkCooldown}s পর আবার পাঠান` : `Resend link in ${linkCooldown}s`}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {bn ? 'ভেরিফিকেশন লিংক পাঠান' : 'Send Verification Link'}
                </>
              )}
            </Button>
          </div>
        )}

        <div className="pt-2 border-t text-center">
          <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-muted-foreground/70" />
            {bn
              ? 'ইনবক্সে মেইল না পেলে অবশ্যই স্প্যাম (Spam) বা জাঙ্ক ফোল্ডার চেক করুন।'
              : 'If not in inbox, please check your spam or junk folder.'}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmailVerificationDialog;
