import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Label } from '@/components/ui/label';
import { Mail, Lock, User, GraduationCap, LogIn, UserPlus, Calendar, IdCard, LogOut, Eye, KeyRound } from 'lucide-react';
import OtpVerificationDialog from '@/components/OtpVerificationDialog';
import { sanitizePasswordInput } from '@/lib/passwordInput';
import { useOtpService } from '@/hooks/useOtpService';

const STUDENT_STORAGE_KEY = 'student_portal_session';
// Reuse parent_portal_session so /student-info can read student selection too
const PARENT_STORAGE_KEY = 'parent_portal_session';

interface StudentSession {
  accountId: string;
  contact: string;
  fullName: string;
  studentId: string;
  studentUuid: string;
  loggedInAt: string;
}

const StudentPortal = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [session, setSession] = useState<StudentSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(
    searchParams.get('mode') === 'signup' ? 'signup'
      : searchParams.get('mode') === 'forgot' ? 'forgot'
      : 'login'
  );

  // Login state
  const [loginContact, setLoginContact] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [suName, setSuName] = useState('');
  const [suStudentId, setSuStudentId] = useState('');
  const [suDob, setSuDob] = useState('');
  const [otpOpen, setOtpOpen] = useState(false);

  // Forgot password state
  const { sendOtp, sending: otpSending } = useOtpService();
  const [fpEmail, setFpEmail] = useState('');
  const [fpStep, setFpStep] = useState<'request' | 'reset'>('request');
  const [fpCode, setFpCode] = useState('');
  const [fpNewPassword, setFpNewPassword] = useState('');
  const [fpCooldown, setFpCooldown] = useState(0);

  useEffect(() => {
    const raw = sessionStorage.getItem(STUDENT_STORAGE_KEY);
    if (raw) {
      try { setSession(JSON.parse(raw)); } catch { sessionStorage.removeItem(STUDENT_STORAGE_KEY); }
    }
  }, []);

  const persistSession = (s: StudentSession) => {
    sessionStorage.setItem(STUDENT_STORAGE_KEY, JSON.stringify(s));
    // Also write parent_portal_session shape so /student-info can render the student.
    sessionStorage.setItem(PARENT_STORAGE_KEY, JSON.stringify({
      accountId: s.accountId,
      email: s.contact,
      fullName: s.fullName,
      studentId: s.studentId,
      studentUuid: s.studentUuid,
      loggedInAt: s.loggedInAt,
    }));
    setSession(s);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STUDENT_STORAGE_KEY);
    sessionStorage.removeItem(PARENT_STORAGE_KEY);
    setSession(null);
    toast({ title: bn ? 'লগআউট সফল' : 'Logged out' });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginContact.trim() || !loginPassword) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: bn ? 'সব ফিল্ড পূরণ করুন' : 'Fill all fields', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('student-auth', {
        body: { action: 'login', contact: loginContact.trim(), password: loginPassword },
      });

      // supabase.functions.invoke returns generic error for non-2xx; parse the body for message + code
      let errMsg: string | null = null;
      let errCode: string | null = null;
      if (error) {
        errMsg = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const j = await ctx.json();
            if (j?.error) errMsg = j.error;
            if (j?.code) errCode = j.code;
          }
        } catch { /* ignore */ }
      } else if (data?.error) {
        errMsg = data.error;
        errCode = data.code || null;
      }

      if (errMsg) {
        if (errCode === 'ACCOUNT_NOT_FOUND') {
          toast({
            title: bn ? '🚫 একাউন্ট নেই' : '🚫 No account found',
            description: bn
              ? 'এই ইমেইল/ফোন দিয়ে কোনো একাউন্ট খোলা হয়নি। অনুগ্রহ করে আগে সাইনআপ করে একাউন্ট খুলুন।'
              : 'No account exists for this email/phone. Please sign up first to create one.',
            variant: 'destructive',
            duration: 8000,
          });
          setMode('signup');
          setSuEmail(loginContact.trim());
          return;
        }
        if (errCode === 'PENDING_APPROVAL') {
          toast({
            title: bn ? '⏳ অনুমোদনের অপেক্ষায়' : '⏳ Awaiting approval',
            description: bn
              ? 'আপনার একাউন্ট এখনো অনুমোদিত হয়নি। অ্যাডমিন অনুমোদন করার পর আপনি ইমেইলে বার্তা পাবেন এবং তখন লগইন করতে পারবেন।'
              : 'Your account is awaiting admin approval. You will receive an email once approved and then you can log in.',
            variant: 'destructive',
            duration: 9000,
          });
          return;
        }
        if (errCode === 'NOT_VERIFIED') {
          toast({
            title: bn ? '✉️ ইমেইল ভেরিফাই করুন' : '✉️ Verify your email',
            description: bn
              ? 'আপনি এখনো ইমেইল ভেরিফাই করেননি। সাইনআপ পেজ থেকে OTP দিয়ে ভেরিফাই করুন।'
              : 'Your email is not verified yet. Please verify via OTP from the signup page.',
            variant: 'destructive',
            duration: 8000,
          });
          return;
        }
        if (errCode === 'REJECTED') {
          toast({
            title: bn ? '❌ একাউন্ট প্রত্যাখ্যাত' : '❌ Account rejected',
            description: errMsg,
            variant: 'destructive',
            duration: 9000,
          });
          return;
        }
        if (errCode === 'SUSPENDED') {
          toast({
            title: bn ? '⛔ একাউন্ট স্থগিত' : '⛔ Account suspended',
            description: bn ? 'আপনার একাউন্ট স্থগিত। অফিসে যোগাযোগ করুন।' : 'Your account is suspended. Please contact the office.',
            variant: 'destructive',
            duration: 8000,
          });
          return;
        }
        throw new Error(errMsg);
      }

      const s: StudentSession = {
        accountId: data.account.id,
        contact: data.account.contact,
        fullName: data.account.full_name,
        studentId: data.account.student_id,
        studentUuid: data.account.linked_student_uuid,
        loggedInAt: new Date().toISOString(),
      };
      persistSession(s);
      toast({ title: bn ? 'লগইন সফল' : 'Login successful' });
      navigate('/student-info');
    } catch (err: any) {
      toast({ title: bn ? 'লগইন ব্যর্থ' : 'Login failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suEmail.trim() || !suPassword || !suName.trim() || !suStudentId.trim() || !suDob) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: bn ? 'সব ফিল্ড পূরণ করুন' : 'Fill all fields', variant: 'destructive' });
      return;
    }
    if (suPassword.length < 6) {
      toast({ title: bn ? 'পাসওয়ার্ড দুর্বল' : 'Weak password', description: bn ? 'কমপক্ষে ৬ অক্ষর' : 'At least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('student-auth', {
        body: {
          action: 'signup',
          contact: suEmail.trim(),
          contact_type: 'email',
          password: suPassword,
          full_name: suName.trim(),
          student_id: suStudentId.trim(),
          student_dob: suDob,
        },
      });
      // supabase.functions.invoke returns error for non-2xx; parse body
      if (error) {
        let msg = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const j = await ctx.json();
            if (j?.error) msg = j.error;
          }
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      // Trigger OTP for email verification
      setOtpOpen(true);
      toast({ title: bn ? 'একাউন্ট তৈরি হয়েছে' : 'Account created', description: bn ? 'ইমেইলে OTP ভেরিফাই করুন' : 'Verify the OTP sent to your email' });
    } catch (err: any) {
      toast({ title: bn ? 'সাইনআপ ব্যর্থ' : 'Signup failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerified = async () => {
    setOtpOpen(false);
    await supabase.functions.invoke('student-auth', {
      body: { action: 'mark_verified', contact: suEmail.trim() },
    });
    toast({
      title: bn ? '✅ ইমেইল ভেরিফাই সফল' : '✅ Email verified',
      description: bn
        ? 'আপনার আইডি অনুমোদনের জন্য অপেক্ষমাণ। অ্যাডমিন অনুমোদন করার পর আপনি ইমেইলে বার্তা পাবেন এবং লগইন করতে পারবেন।'
        : 'Your account is awaiting admin approval. You will receive an email once approved and then you can log in.',
      duration: 9000,
    });
    setLoginContact(suEmail.trim());
    setSuEmail(''); setSuPassword(''); setSuName(''); setSuStudentId(''); setSuDob('');
    setMode('login');
  };

  // Cooldown ticker for "Resend OTP" in forgot flow
  useEffect(() => {
    if (fpCooldown <= 0) return;
    const t = setInterval(() => setFpCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [fpCooldown]);

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = fpEmail.trim().toLowerCase();
    if (!email) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: bn ? 'ইমেইল দিন' : 'Enter email', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      // Don't reveal account existence — but skip OTP send if no account.
      const { data: chk } = await supabase.functions.invoke('student-auth', {
        body: { action: 'check_account', contact: email },
      });
      if (!chk?.exists) {
        toast({
          title: bn ? 'OTP পাঠানো হয়েছে (যদি একাউন্ট থাকে)' : 'OTP sent (if account exists)',
          description: bn ? 'ইনবক্স চেক করুন।' : 'Please check your inbox.',
        });
        setFpStep('reset');
        setFpCooldown(60);
        return;
      }
      const r = await sendOtp(email, 'password_reset', undefined, 'password_reset');
      if (!r.success) {
        if (r.retryAfterSeconds) setFpCooldown(r.retryAfterSeconds);
        return;
      }
      toast({
        title: bn ? 'OTP পাঠানো হয়েছে' : 'OTP sent',
        description: bn ? `${r.expiryMinutes ?? 10} মিনিটের মধ্যে কোডটি ব্যবহার করুন।` : `Use the code within ${r.expiryMinutes ?? 10} minutes.`,
      });
      setFpStep('reset');
      setFpCooldown(60);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResend = async () => {
    if (fpCooldown > 0) return;
    const email = fpEmail.trim().toLowerCase();
    const r = await sendOtp(email, 'password_reset', undefined, 'password_reset');
    if (r.success) {
      toast({ title: bn ? 'OTP পুনরায় পাঠানো হয়েছে' : 'OTP resent' });
      setFpCooldown(60);
    } else if (r.retryAfterSeconds) {
      setFpCooldown(r.retryAfterSeconds);
    }
  };

  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = fpEmail.trim().toLowerCase();
    if (!fpCode.trim() || fpCode.trim().length !== 6) {
      toast({ title: bn ? 'ভুল কোড' : 'Invalid code', description: bn ? '৬ অঙ্কের OTP দিন' : 'Enter the 6-digit OTP', variant: 'destructive' });
      return;
    }
    if (fpNewPassword.length < 6) {
      toast({ title: bn ? 'দুর্বল পাসওয়ার্ড' : 'Weak password', description: bn ? 'কমপক্ষে ৬ অক্ষর' : 'At least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('student-auth', {
        body: {
          action: 'reset_password',
          contact: email,
          code: fpCode.trim(),
          new_password: fpNewPassword,
        },
      });
      if (error) {
        let msg = error.message;
        try {
          const ctx = (error as any).context;
          if (ctx && typeof ctx.json === 'function') {
            const j = await ctx.json();
            if (j?.error) msg = j.error;
          }
        } catch {}
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);

      toast({
        title: bn ? 'পাসওয়ার্ড রিসেট সফল' : 'Password reset',
        description: bn ? 'নতুন পাসওয়ার্ড দিয়ে লগইন করুন।' : 'Login with your new password.',
      });
      setLoginContact(email);
      setLoginPassword('');
      setFpEmail(''); setFpCode(''); setFpNewPassword('');
      setFpStep('request');
      setMode('login');
    } catch (err: any) {
      toast({ title: bn ? 'রিসেট ব্যর্থ' : 'Reset failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // ----- Logged in view -----
  if (session) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <Card className="rounded-2xl sm:rounded-3xl backdrop-blur-xl border-border/60 bg-card/85 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-semibold">{session.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {bn ? 'শিক্ষার্থী আইডি' : 'Student ID'}: {session.studentId}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {bn
                  ? 'আপনি লগইন করেছেন। নিজের তথ্য, ফলাফল, ফি ও অন্যান্য সুবিধা দেখতে নিচের বাটনে ক্লিক করুন।'
                  : 'You are logged in. Use the buttons below to view your information.'}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="rounded-full">
                  <Link to="/student-info">
                    <Eye className="w-4 h-4 mr-2" />
                    {bn ? 'আমার তথ্য দেখুন' : 'View My Info'}
                  </Link>
                </Button>
                <Button onClick={handleLogout} variant="outline" className="rounded-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  {bn ? 'লগআউট' : 'Logout'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PublicLayout>
    );
  }

  // ----- Auth form -----
  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl sm:rounded-3xl backdrop-blur-xl border-border/60 bg-card/85 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-semibold">
                    {bn ? 'শিক্ষার্থী পোর্টাল' : 'Student Portal'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {mode === 'login'
                      ? (bn ? 'নিজের একাউন্টে লগইন করুন' : 'Sign in to your account')
                      : (bn ? 'এক ছাত্র আইডি = এক একাউন্ট' : 'One student ID = one account')}
                  </p>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-full">
                <TabsList className="grid grid-cols-3 w-full rounded-2xl mb-6">
                  <TabsTrigger value="login" className="rounded-xl py-2.5">
                    <LogIn className="w-4 h-4 mr-2" />{bn ? 'লগইন' : 'Login'}
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-xl py-2.5">
                    <UserPlus className="w-4 h-4 mr-2" />{bn ? 'সাইনআপ' : 'Sign Up'}
                  </TabsTrigger>
                  <TabsTrigger value="forgot" className="rounded-xl py-2.5">
                    <KeyRound className="w-4 h-4 mr-2" />{bn ? 'রিকভারি' : 'Recovery'}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Mail className="w-4 h-4" />{bn ? 'ইমেইল' : 'Email'}</Label>
                      <Input type="email" value={loginContact} onChange={(e) => setLoginContact(e.target.value)}
                        placeholder="student@example.com" className="rounded-2xl" required />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2"><Lock className="w-4 h-4" />{bn ? 'পাসওয়ার্ড' : 'Password'}</Label>
                        <button type="button" onClick={() => setMode('forgot')}
                          className="text-xs text-primary hover:underline">
                          {bn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                        </button>
                      </div>
                      <Input type="password" value={loginPassword}
                        onChange={(e) => setLoginPassword(sanitizePasswordInput(e.target.value))}
                        className="rounded-2xl" required />
                    </div>
                    <Button type="submit" className="w-full rounded-full" disabled={loading}>
                      {loading ? (bn ? 'প্রক্রিয়া...' : 'Processing...') : (bn ? 'লগইন' : 'Login')}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="forgot">
                  {fpStep === 'request' ? (
                    <form onSubmit={handleForgotRequest} className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {bn
                          ? 'আপনার রেজিস্টার্ড ইমেইলে একটি ৬-অঙ্কের OTP পাঠানো হবে।'
                          : 'A 6-digit OTP will be sent to your registered email.'}
                      </p>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Mail className="w-4 h-4" />{bn ? 'ইমেইল' : 'Email'}</Label>
                        <Input type="email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)}
                          placeholder="student@example.com" className="rounded-2xl" required />
                      </div>
                      <Button type="submit" className="w-full rounded-full" disabled={loading || otpSending}>
                        {(loading || otpSending) ? (bn ? 'পাঠানো হচ্ছে...' : 'Sending...') : (bn ? 'OTP পাঠান' : 'Send OTP')}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleForgotReset} className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        {bn
                          ? <>OTP পাঠানো হয়েছে: <span className="font-medium text-foreground">{fpEmail}</span></>
                          : <>OTP sent to: <span className="font-medium text-foreground">{fpEmail}</span></>}
                      </p>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><KeyRound className="w-4 h-4" />{bn ? '৬-অঙ্কের OTP' : '6-digit OTP'}</Label>
                        <Input value={fpCode} onChange={(e) => setFpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          inputMode="numeric" maxLength={6} className="rounded-2xl tracking-[0.5em] text-center font-mono"
                          placeholder="• • • • • •" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Lock className="w-4 h-4" />{bn ? 'নতুন পাসওয়ার্ড' : 'New Password'}</Label>
                        <Input type="password" value={fpNewPassword}
                          onChange={(e) => setFpNewPassword(sanitizePasswordInput(e.target.value))}
                          className="rounded-2xl" required minLength={6} />
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <button type="button" onClick={() => { setFpStep('request'); setFpCode(''); setFpNewPassword(''); }}
                          className="text-xs text-muted-foreground hover:text-foreground">
                          ← {bn ? 'ইমেইল পরিবর্তন' : 'Change email'}
                        </button>
                        <button type="button" onClick={handleForgotResend} disabled={fpCooldown > 0 || otpSending}
                          className="text-xs text-primary hover:underline disabled:text-muted-foreground disabled:no-underline">
                          {fpCooldown > 0
                            ? (bn ? `পুনরায় পাঠান (${fpCooldown}s)` : `Resend (${fpCooldown}s)`)
                            : (bn ? 'OTP পুনরায় পাঠান' : 'Resend OTP')}
                        </button>
                      </div>
                      <Button type="submit" className="w-full rounded-full" disabled={loading}>
                        {loading ? (bn ? 'প্রক্রিয়া...' : 'Processing...') : (bn ? 'পাসওয়ার্ড রিসেট করুন' : 'Reset Password')}
                      </Button>
                    </form>
                  )}
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2 sm:col-span-2">
                        <Label className="flex items-center gap-2"><User className="w-4 h-4" />{bn ? 'পূর্ণ নাম' : 'Full Name'}</Label>
                        <Input value={suName} onChange={(e) => setSuName(e.target.value)} className="rounded-2xl" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><IdCard className="w-4 h-4" />{bn ? 'শিক্ষার্থী আইডি' : 'Student ID'}</Label>
                        <Input value={suStudentId} onChange={(e) => setSuStudentId(e.target.value)} className="rounded-2xl" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" />{bn ? 'জন্ম তারিখ' : 'Date of Birth'}</Label>
                        <DatePicker value={suDob} onChange={setSuDob} bengali={bn} fromYear={1990} toYear={2026} placeholder={bn ? 'জন্ম তারিখ নির্বাচন করুন' : 'Select Date of Birth'} />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Mail className="w-4 h-4" />{bn ? 'ইমেইল' : 'Email'}</Label>
                        <Input type="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} className="rounded-2xl" required />
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Lock className="w-4 h-4" />{bn ? 'পাসওয়ার্ড' : 'Password'}</Label>
                        <Input type="password" value={suPassword}
                          onChange={(e) => setSuPassword(sanitizePasswordInput(e.target.value))}
                          className="rounded-2xl" required minLength={6} />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {bn
                        ? 'নোট: প্রতি শিক্ষার্থী আইডিতে শুধু একটি একাউন্ট তৈরি করা যাবে। সাইনআপের পর ইমেইল OTP ভেরিফাই করতে হবে।'
                        : 'Note: Only one account allowed per Student ID. Email OTP verification required after signup.'}
                    </p>
                    <Button type="submit" className="w-full rounded-full" disabled={loading}>
                      {loading ? (bn ? 'প্রক্রিয়া...' : 'Processing...') : (bn ? 'একাউন্ট তৈরি করুন' : 'Create Account')}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {otpOpen && (
          <OtpVerificationDialog
            open={otpOpen}
            onOpenChange={setOtpOpen}
            email={suEmail.trim()}
            recipientName={suName}
            purpose="email_verification"
            onVerified={handleOtpVerified}
          />
        )}
      </div>
    </PublicLayout>
  );
};

export default StudentPortal;
