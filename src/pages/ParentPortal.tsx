import { useState, useEffect } from 'react';
import { sanitizePasswordInput } from '@/lib/passwordInput';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, GraduationCap, Wallet, Bell, LogOut, Calendar, Users, Phone, BookOpen, Mail, Lock, UserPlus, LogIn, Library, MessageSquare, Send, Clock, AlertTriangle } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Textarea } from '@/components/ui/textarea';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import OtpVerificationDialog from '@/components/OtpVerificationDialog';

type SignupFieldConfig = {
  id: string;
  field_key: string;
  label_bn: string;
  label_en: string;
  placeholder_bn: string | null;
  placeholder_en: string | null;
  field_type: string;
  is_visible: boolean;
  is_required: boolean;
  is_locked: boolean;
  min_length: number | null;
  max_length: number | null;
  display_order: number;
};

const STORAGE_KEY = 'parent_portal_session';

interface ParentSession {
  accountId?: string;
  email?: string;
  fullName?: string;
  studentId: string;
  studentUuid: string;
  studentUuids?: string[];
  loggedInAt: string;
}

const ParentPortal = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const bn = language === 'bn';

  const [session, setSession] = useState<ParentSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>(
    searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  );

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupNid, setSignupNid] = useState('');
  const [signupStudentId, setSignupStudentId] = useState('');
  const [signupDob, setSignupDob] = useState('');
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  const [matchPreview, setMatchPreview] = useState<Array<{ student_uuid: string; student_id: string; name_bn: string; name_en: string; match_reason: string }>>([]);
  const [confirmedUuids, setConfirmedUuids] = useState<Set<string>>(new Set());
  const [matchLoading, setMatchLoading] = useState(false);

  const matchReasonLabel = (reason: string): { label: string; tone: 'nid' | 'phone' } => {
    const map: Record<string, { bn: string; en: string; tone: 'nid' | 'phone' }> = {
      father_nid: { bn: 'পিতার NID', en: 'Father NID', tone: 'nid' },
      mother_nid: { bn: 'মাতার NID', en: 'Mother NID', tone: 'nid' },
      guardian_nid: { bn: 'অভিভাবকের NID', en: 'Guardian NID', tone: 'nid' },
      father_phone: { bn: 'পিতার ফোন', en: 'Father Phone', tone: 'phone' },
      mother_phone: { bn: 'মাতার ফোন', en: 'Mother Phone', tone: 'phone' },
      guardian_phone: { bn: 'অভিভাবকের ফোন', en: 'Guardian Phone', tone: 'phone' },
    };
    const entry = map[reason] || { bn: 'মিল', en: 'Matched', tone: 'nid' as const };
    return { label: bn ? entry.bn : entry.en, tone: entry.tone };
  };

  const runMatchPreview = async () => {
    const nid = signupNid.trim();
    const phone = signupPhone.trim();
    if (!nid && !phone) { setMatchPreview([]); setConfirmedUuids(new Set()); return; }
    setMatchLoading(true);
    try {
      const { data } = await supabase.functions.invoke('parent-auth', {
        body: { action: 'preview_match', nid: nid || undefined, phone: phone || undefined },
      });
      const matches = (data?.matches || []) as Array<{ student_uuid: string }>;
      setMatchPreview(data?.matches || []);
      setConfirmedUuids(new Set(matches.map((m) => m.student_uuid)));
    } catch { /* ignore */ } finally { setMatchLoading(false); }
  };

  const toggleConfirm = (uuid: string) => {
    setConfirmedUuids((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid); else next.add(uuid);
      return next;
    });
  };
  const toggleConfirmAll = () => {
    if (confirmedUuids.size === matchPreview.length) setConfirmedUuids(new Set());
    else setConfirmedUuids(new Set(matchPreview.map((m) => m.student_uuid)));
  };

  // Dynamic signup field configuration
  const { data: signupFields = [] } = useQuery({
    queryKey: ['parent-signup-field-config-public'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('parent_signup_field_config')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as SignupFieldConfig[];
    },
  });

  const fieldByKey = (key: string) => signupFields.find((f) => f.field_key === key);
  const isVisible = (key: string) => {
    const f = fieldByKey(key);
    // Default to visible if config not yet loaded (avoids hiding fields on first paint)
    return f ? f.is_visible : true;
  };
  const isRequired = (key: string) => {
    const f = fieldByKey(key);
    return f ? f.is_required : true;
  };
  const labelOf = (key: string, fallbackBn: string, fallbackEn: string) => {
    const f = fieldByKey(key);
    if (!f) return bn ? fallbackBn : fallbackEn;
    return bn ? f.label_bn : f.label_en;
  };
  const placeholderOf = (key: string) => {
    const f = fieldByKey(key);
    if (!f) return undefined;
    return (bn ? f.placeholder_bn : f.placeholder_en) || undefined;
  };

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      toast({
        title: bn ? 'ত্রুটি' : 'Error',
        description: bn ? 'ইমেইল ও পাসওয়ার্ড দিন' : 'Provide email and password',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('parent-auth', {
        body: { action: 'login', email: loginEmail.trim(), password: loginPassword },
      });

      // Parse error context from FunctionsHttpError (Supabase wraps non-2xx in error.context)
      let payload: any = data;
      if (error && (error as any).context && typeof (error as any).context.json === 'function') {
        try { payload = await (error as any).context.json(); } catch { /* ignore */ }
      }

      if (error || !payload?.success) {
        const errMsg = payload?.error || error?.message || 'Login failed';
        const code = payload?.code;

        if (code === 'ACCOUNT_NOT_FOUND') {
          toast({
            title: bn ? '🚫 একাউন্ট নেই' : '🚫 No account found',
            description: bn
              ? 'এই ইমেইল দিয়ে কোন একাউন্ট খোলা হয়নি — অনুগ্রহ করে সাইনআপ করুন'
              : 'No account exists with this email — please sign up',
            variant: 'destructive',
          });
          setMode('signup');
          setSignupEmail(loginEmail.trim());
          return;
        }

        if (code === 'PENDING_APPROVAL') {
          toast({
            title: bn ? '⏳ অনুমোদনের অপেক্ষায়' : '⏳ Awaiting Approval',
            description: bn
              ? 'আপনার একাউন্ট এখনো অনুমোদনের জন্য অপেক্ষমাণ। অ্যাডমিন অনুমোদন দিলে ইমেইলে জানানো হবে।'
              : 'Your account is awaiting admin approval. You will be notified by email once approved.',
            variant: 'destructive',
          });
          return;
        }

        if (code === 'EMAIL_NOT_VERIFIED') {
          toast({
            title: bn ? '📧 ইমেইল ভেরিফাই হয়নি' : '📧 Email Not Verified',
            description: bn ? 'অনুগ্রহ করে আগে ইমেইল ভেরিফাই করুন' : 'Please verify your email first',
            variant: 'destructive',
          });
          return;
        }

        if (code === 'REJECTED') {
          toast({
            title: bn ? '❌ প্রত্যাখ্যাত' : '❌ Rejected',
            description: bn ? `কারণ: ${errMsg}` : `Reason: ${errMsg}`,
            variant: 'destructive',
          });
          return;
        }

        if (code === 'SUSPENDED') {
          toast({
            title: bn ? '⛔ স্থগিত' : '⛔ Suspended',
            description: bn ? 'আপনার একাউন্ট স্থগিত করা হয়েছে' : 'Your account has been suspended',
            variant: 'destructive',
          });
          return;
        }

        toast({ title: bn ? 'লগইন ব্যর্থ' : 'Login Failed', description: errMsg, variant: 'destructive' });
        return;
      }
      const acc = payload.account;
      const newSession: ParentSession = {
        accountId: acc.id,
        email: acc.email,
        fullName: acc.full_name,
        studentId: acc.student_id,
        studentUuid: acc.linked_student_uuid,
        studentUuids: acc.linked_student_uuids || (acc.linked_student_uuid ? [acc.linked_student_uuid] : []),
        loggedInAt: new Date().toISOString(),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      setSession(newSession);
      toast({
        title: bn ? 'স্বাগতম' : 'Welcome',
        description: bn ? `স্বাগতম, ${acc.full_name}` : `Welcome, ${acc.full_name}`,
      });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    // Build value lookup for dynamic validation
    const values: Record<string, string> = {
      full_name: signupFullName.trim(),
      email: signupEmail.trim(),
      phone: signupPhone.trim(),
      password: signupPassword,
      nid: signupNid.trim(),
      student_id: signupStudentId.trim(),
      student_dob: signupDob,
    };

    // Validate every visible+required field per backend config
    for (const f of signupFields) {
      if (!f.is_visible) continue;
      const val = values[f.field_key] ?? '';
      if (f.is_required && !val) {
        toast({
          title: bn ? 'ত্রুটি' : 'Error',
          description: (bn ? 'আবশ্যক ফিল্ড পূরণ করুন: ' : 'Required field missing: ') + (bn ? f.label_bn : f.label_en),
          variant: 'destructive',
        });
        return;
      }
      if (val && f.min_length && val.length < f.min_length) {
        toast({
          title: bn ? 'ত্রুটি' : 'Error',
          description: `${bn ? f.label_bn : f.label_en}: ${bn ? 'ন্যূনতম' : 'min'} ${f.min_length} ${bn ? 'অক্ষর' : 'chars'}`,
          variant: 'destructive',
        });
        return;
      }
      if (val && f.max_length && val.length > f.max_length) {
        toast({
          title: bn ? 'ত্রুটি' : 'Error',
          description: `${bn ? f.label_bn : f.label_en}: ${bn ? 'সর্বোচ্চ' : 'max'} ${f.max_length} ${bn ? 'অক্ষর' : 'chars'}`,
          variant: 'destructive',
        });
        return;
      }
    }

    // Hard requirement: NID or phone must be present (linking)
    if (!signupNid.trim() && !signupPhone.trim()) {
      toast({
        title: bn ? 'ত্রুটি' : 'Error',
        description: bn ? 'NID অথবা ফোন নম্বর প্রদান করুন (ছাত্র লিঙ্কের জন্য)' : 'NID or phone required to link your child',
        variant: 'destructive',
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({ title: 'Error', description: bn ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর' : 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('parent-auth', {
        body: {
          action: 'signup',
          email: signupEmail.trim(),
          password: signupPassword,
          full_name: signupFullName.trim(),
          phone: signupPhone.trim() || undefined,
          nid: signupNid.trim() || undefined,
          student_id: signupStudentId.trim() || undefined,
          student_dob: signupDob || undefined,
          confirmed_student_uuids: confirmedUuids.size > 0 ? Array.from(confirmedUuids) : undefined,
        },
      });
      if (error || !data?.success) {
        toast({
          title: bn ? 'সাইনআপ ব্যর্থ' : 'Signup Failed',
          description: data?.error || error?.message || 'Failed',
          variant: 'destructive',
        });
        return;
      }
      toast({
        title: bn ? '✅ সাইনআপ সফল' : '✅ Signup successful',
        description: bn
          ? `${data.matched_count || 1} জন ছাত্র লিঙ্ক হয়েছে। এখন ইমেইল ভেরিফাই করুন।`
          : `${data.matched_count || 1} student(s) linked. Please verify email.`,
      });
      setOtpDialogOpen(true);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerified = async () => {
    // Mark email as verified
    await supabase.functions.invoke('parent-auth', {
      body: { action: 'mark_verified', email: signupEmail.trim() },
    });
    toast({
      title: bn ? '✅ ইমেইল ভেরিফাইড — অনুমোদনের অপেক্ষায়' : '✅ Email Verified — Awaiting Approval',
      description: bn
        ? 'আপনার একাউন্ট অ্যাডমিন অনুমোদনের জন্য পাঠানো হয়েছে। অনুমোদন হলে আপনার ইমেইলে জানানো হবে এবং তারপর লগইন করতে পারবেন।'
        : 'Your account has been submitted for admin approval. You will receive an email once approved, then you can login.',
      duration: 8000,
    });
    // Reset signup form & switch to login
    setSignupEmail('');
    setSignupPassword('');
    setSignupFullName('');
    setSignupPhone('');
    setSignupNid('');
    setMatchPreview([]);
    setConfirmedUuids(new Set());
    setSignupStudentId('');
    setSignupDob('');
    setMode('login');
  };

  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setLoginEmail('');
    setLoginPassword('');
  };

  if (!session) {
    return (
      <PublicLayout>
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md"
          >
            <Card className="rounded-[38px] border-0 shadow-2xl backdrop-blur-xl bg-card/95">
              <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold">
                  {bn ? 'অভিভাবক পোর্টাল' : 'Parent Portal'}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-2">
                  {mode === 'login'
                    ? (bn ? 'আপনার অ্যাকাউন্টে প্রবেশ করুন' : 'Login to your account')
                    : (bn ? 'নতুন অভিভাবক অ্যাকাউন্ট তৈরি করুন' : 'Create a new parent account')}
                </p>
              </CardHeader>
              <CardContent className="pt-4 pb-8 px-6 sm:px-8">
                <Tabs value={mode} onValueChange={(v) => setMode(v as 'login' | 'signup')} className="w-full">
                  <TabsList className="grid grid-cols-2 w-full h-auto p-1 rounded-2xl mb-5">
                    <TabsTrigger value="login" className="rounded-xl py-2.5">
                      <LogIn className="w-4 h-4 mr-2" />
                      {bn ? 'লগইন' : 'Login'}
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-xl py-2.5">
                      <UserPlus className="w-4 h-4 mr-2" />
                      {bn ? 'সাইনআপ' : 'Sign Up'}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5" /> {bn ? 'ইমেইল' : 'Email'}
                        </Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="parent@example.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          className="rounded-xl h-12"
                          autoFocus
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5" /> {bn ? 'পাসওয়ার্ড' : 'Password'}
                        </Label>
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="••••••••"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(sanitizePasswordInput(e.target.value))}
                          className="rounded-xl h-12"
                        />
                      </div>
                      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold mt-2">
                        {loading ? (bn ? 'যাচাই হচ্ছে...' : 'Verifying...') : (bn ? 'প্রবেশ করুন' : 'Login')}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup">
                    <form onSubmit={handleSignup} className="space-y-3">
                      {isVisible('full_name') && (
                        <div className="space-y-2">
                          <Label htmlFor="su-name">
                            {labelOf('full_name', 'আপনার নাম', 'Your Full Name')}
                            {isRequired('full_name') ? ' *' : ` (${bn ? 'ঐচ্ছিক' : 'optional'})`}
                          </Label>
                          <Input id="su-name" value={signupFullName}
                            placeholder={placeholderOf('full_name')}
                            onChange={(e) => setSignupFullName(e.target.value)}
                            className="rounded-xl h-11" />
                        </div>
                      )}
                      {isVisible('email') && (
                        <div className="space-y-2">
                          <Label htmlFor="su-email">
                            {labelOf('email', 'ইমেইল', 'Email')}
                            {isRequired('email') ? ' *' : ` (${bn ? 'ঐচ্ছিক' : 'optional'})`}
                          </Label>
                          <Input id="su-email" type="email" value={signupEmail}
                            placeholder={placeholderOf('email')}
                            onChange={(e) => setSignupEmail(e.target.value)}
                            className="rounded-xl h-11" />
                        </div>
                      )}
                      {isVisible('phone') && (
                        <div className="space-y-2">
                          <Label htmlFor="su-phone">
                            {labelOf('phone', 'ফোন', 'Phone')}
                            {isRequired('phone') ? ' *' : ` (${bn ? 'ঐচ্ছিক' : 'optional'})`}
                          </Label>
                          <Input id="su-phone" value={signupPhone}
                            placeholder={placeholderOf('phone')}
                            onChange={(e) => setSignupPhone(e.target.value)}
                            onBlur={runMatchPreview}
                            className="rounded-xl h-11" />
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="su-nid">
                          {bn ? 'অভিভাবকের NID (পিতা/মাতা/অভিভাবক)' : "Parent's NID (father/mother/guardian)"} *
                        </Label>
                        <Input id="su-nid"
                          placeholder={bn ? 'NID নম্বর দিন' : 'Enter NID number'}
                          value={signupNid}
                          onChange={(e) => setSignupNid(e.target.value.replace(/[^\d]/g, ''))}
                          onBlur={runMatchPreview}
                          inputMode="numeric"
                          className="rounded-xl h-11" />
                        <p className="text-[11px] text-muted-foreground">
                          {bn
                            ? 'NID/ফোন দিয়ে আপনার সন্তানদের একাউন্টের সাথে স্বয়ংক্রিয়ভাবে যুক্ত করা হবে। ভবিষ্যতে নতুন ভর্তি হলে অটো যোগ হবে।'
                            : 'NID/phone is used to auto-link your children. Future admissions will auto-attach.'}
                        </p>
                        {matchLoading && (
                          <div className="rounded-xl border border-muted bg-muted/30 p-2 text-xs text-muted-foreground">
                            {bn ? 'মিল খোঁজা হচ্ছে…' : 'Searching matches…'}
                          </div>
                        )}
                        {!matchLoading && matchPreview.length > 0 && (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="font-semibold text-emerald-700">
                                {bn
                                  ? `${matchPreview.length} জন ছাত্র পাওয়া গেছে — লিঙ্ক করতে নিশ্চিত করুন:`
                                  : `${matchPreview.length} student(s) found — confirm to link:`}
                              </p>
                              <button
                                type="button"
                                onClick={toggleConfirmAll}
                                className="text-[11px] font-medium text-emerald-700 underline hover:text-emerald-900"
                              >
                                {confirmedUuids.size === matchPreview.length
                                  ? (bn ? 'সব বাদ' : 'Deselect all')
                                  : (bn ? 'সব নির্বাচন' : 'Select all')}
                              </button>
                            </div>
                            <ul className="space-y-1.5">
                              {matchPreview.map((m) => {
                                const reason = matchReasonLabel(m.match_reason);
                                const checked = confirmedUuids.has(m.student_uuid);
                                return (
                                  <li
                                    key={m.student_uuid}
                                    className={`flex items-start gap-2 rounded-lg border p-2 transition-colors ${
                                      checked ? 'border-emerald-300 bg-white' : 'border-muted bg-muted/20 opacity-70'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleConfirm(m.student_uuid)}
                                      className="mt-0.5 h-4 w-4 accent-emerald-600 cursor-pointer"
                                      id={`confirm-${m.student_uuid}`}
                                    />
                                    <label htmlFor={`confirm-${m.student_uuid}`} className="flex-1 cursor-pointer">
                                      <div className="font-medium text-emerald-900">
                                        {bn ? m.name_bn : (m.name_en || m.name_bn)}{' '}
                                        <span className="font-normal text-emerald-600">({m.student_id})</span>
                                      </div>
                                      <div className="mt-0.5">
                                        <span
                                          className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                            reason.tone === 'nid'
                                              ? 'bg-indigo-100 text-indigo-700'
                                              : 'bg-amber-100 text-amber-700'
                                          }`}
                                        >
                                          {bn ? `মিল: ${reason.label}` : `Matched: ${reason.label}`}
                                        </span>
                                      </div>
                                    </label>
                                  </li>
                                );
                              })}
                            </ul>
                            {confirmedUuids.size === 0 && (
                              <p className="text-[11px] font-medium text-rose-600">
                                {bn
                                  ? 'কমপক্ষে একজন ছাত্র নির্বাচন করুন, অন্যথায় সাইনআপ ব্যর্থ হবে।'
                                  : 'Select at least one student, otherwise signup will fail.'}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {isVisible('password') && (
                        <div className="space-y-2">
                          <Label htmlFor="su-pwd">
                            {labelOf('password', 'পাসওয়ার্ড', 'Password')}
                            {isRequired('password') ? ' *' : ` (${bn ? 'ঐচ্ছিক' : 'optional'})`}
                          </Label>
                          <Input id="su-pwd" type="password" value={signupPassword}
                            placeholder={placeholderOf('password')}
                            onChange={(e) => setSignupPassword(sanitizePasswordInput(e.target.value))}
                            className="rounded-xl h-11" />
                        </div>
                      )}
                      {(isVisible('student_id') || isVisible('student_dob')) && (
                        <div className="border-t pt-3 mt-3">
                          <p className="text-xs text-muted-foreground mb-2">{bn ? 'সন্তানের তথ্য (যাচাইয়ের জন্য)' : 'Child Info (for verification)'}</p>
                          {isVisible('student_id') && (
                            <div className="space-y-2">
                              <Label htmlFor="su-sid">
                                {labelOf('student_id', 'ছাত্র আইডি', 'Student ID')}
                                {isRequired('student_id') ? ' *' : ` (${bn ? 'ঐচ্ছিক' : 'optional'})`}
                              </Label>
                              <Input id="su-sid"
                                placeholder={placeholderOf('student_id') || 'STU-2026-001'}
                                value={signupStudentId}
                                onChange={(e) => setSignupStudentId(e.target.value)}
                                className="rounded-xl h-11" />
                            </div>
                          )}
                          {isVisible('student_dob') && (
                            <div className="space-y-2 mt-2">
                              <Label htmlFor="su-dob">
                                {labelOf('student_dob', 'সন্তানের জন্মতারিখ (dd/mm/yyyy)', "Child's Date of Birth (dd/mm/yyyy)")}
                                {isRequired('student_dob') ? ' *' : ` (${bn ? 'ঐচ্ছিক' : 'optional'})`}
                              </Label>
                              <Input
                                id="su-dob"
                                type="text"
                                inputMode="numeric"
                                placeholder={placeholderOf('student_dob') || 'dd/mm/yyyy'}
                                maxLength={10}
                                value={signupDob}
                                onChange={(e) => {
                                  let v = e.target.value.replace(/[^\d]/g, '').slice(0, 8);
                                  if (v.length >= 5) v = `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
                                  else if (v.length >= 3) v = `${v.slice(0, 2)}/${v.slice(2)}`;
                                  setSignupDob(v);
                                }}
                                className="rounded-xl h-11"
                              />
                            </div>
                          )}
                        </div>
                      )}
                      <Button type="submit" disabled={loading} className="w-full h-12 rounded-xl text-base font-semibold mt-3">
                        {loading ? (bn ? 'প্রসেসিং...' : 'Processing...') : (bn ? 'সাইনআপ করুন' : 'Sign Up')}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        {bn ? 'সাইনআপের পর ইমেইল ভেরিফাই ও অ্যাডমিন অনুমোদন প্রয়োজন' : 'Email verification & admin approval required after signup'}
                      </p>
                    </form>
                  </TabsContent>
                </Tabs>

                <p className="text-xs text-muted-foreground text-center mt-6">
                  {bn ? 'সমস্যা হলে প্রতিষ্ঠানের অফিসে যোগাযোগ করুন' : 'Contact the institution office for assistance'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {otpDialogOpen && (
          <OtpVerificationDialog
            open={otpDialogOpen}
            onOpenChange={setOtpDialogOpen}
            email={signupEmail.trim()}
            purpose="email_verification"
            recipientName={signupFullName}
            onVerified={handleOtpVerified}
          />
        )}
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <ParentDashboard session={session} onLogout={handleLogout} bn={bn} />
    </PublicLayout>
  );
};

const ParentDashboard = ({
  session,
  onLogout,
  bn,
}: {
  session: ParentSession;
  onLogout: () => void;
  bn: boolean;
}) => {
  // Fetch all linked students (multi-student support)
  const { data: linkedStudents = [] } = useQuery({
    queryKey: ['parent-linked-students', session.accountId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('parent-student-info', {
        body: { account_id: session.accountId, list: true },
      });
      if (error) throw error;
      return (data?.students || []) as any[];
    },
    enabled: !!session.accountId,
    staleTime: 30000,
  });

  // Active student state — defaults to session.studentUuid, falls back to first linked
  const [activeUuid, setActiveUuid] = useState<string>(session.studentUuid);
  useEffect(() => {
    if (linkedStudents.length > 0 && !linkedStudents.some((s: any) => s.id === activeUuid)) {
      setActiveUuid(linkedStudents[0].id);
    }
  }, [linkedStudents, activeUuid]);

  // Fetch active student full info via edge function (service role bypass)
  const { data: student } = useQuery({
    queryKey: ['parent-student', activeUuid, session.accountId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('parent-student-info', {
        body: { account_id: session.accountId, student_uuid: activeUuid },
      });
      if (error) throw error;
      return data?.student ?? null;
    },
    enabled: !!activeUuid && !!session.accountId,
  });

  const activeStudentId = (linkedStudents.find((s: any) => s.id === activeUuid)?.student_id) || session.studentId;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">
            {bn ? 'স্বাগতম, অভিভাবক' : 'Welcome, Parent'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bn ? 'ছাত্র আইডি' : 'Student ID'}: <span className="font-semibold text-foreground">{activeStudentId}</span>
            {linkedStudents.length > 1 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-xs font-medium">
                {bn ? `${linkedStudents.length} জন সন্তান` : `${linkedStudents.length} children`}
              </span>
            )}
          </p>
          {linkedStudents.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {linkedStudents.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => setActiveUuid(s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    activeUuid === s.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-400'
                  }`}
                >
                  {bn ? s.name_bn : (s.name_en || s.name_bn)} <span className="opacity-70">({s.student_id})</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button variant="outline" onClick={onLogout} className="rounded-xl shrink-0">
          <LogOut className="w-4 h-4 mr-2" />
          {bn ? 'লগআউট' : 'Logout'}
        </Button>
      </motion.div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 w-full h-auto p-1 rounded-2xl mb-6 gap-1">
          <TabsTrigger value="profile" className="rounded-xl py-2.5">
            <User className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">{bn ? 'প্রোফাইল' : 'Profile'}</span>
          </TabsTrigger>
          <TabsTrigger value="results" className="rounded-xl py-2.5">
            <GraduationCap className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">{bn ? 'ফলাফল' : 'Results'}</span>
          </TabsTrigger>
          <TabsTrigger value="fees" className="rounded-xl py-2.5">
            <Wallet className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">{bn ? 'ফি' : 'Fees'}</span>
          </TabsTrigger>
          <TabsTrigger value="routine" className="rounded-xl py-2.5">
            <Clock className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">{bn ? 'রুটিন' : 'Routine'}</span>
          </TabsTrigger>
          <TabsTrigger value="library" className="rounded-xl py-2.5">
            <Library className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">{bn ? 'লাইব্রেরি' : 'Library'}</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="rounded-xl py-2.5">
            <MessageSquare className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">{bn ? 'বার্তা' : 'Messages'}</span>
          </TabsTrigger>
          <TabsTrigger value="notices" className="rounded-xl py-2.5">
            <Bell className="w-4 h-4 mr-1.5" />
            <span className="hidden sm:inline">{bn ? 'নোটিশ' : 'Notices'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab student={student} studentUuid={activeUuid} bn={bn} />
        </TabsContent>
        <TabsContent value="results">
          <ResultsTab studentUuid={activeUuid} bn={bn} />
        </TabsContent>
        <TabsContent value="fees">
          <FeesTab studentUuid={activeUuid} accountId={session.accountId!} bn={bn} />
        </TabsContent>
        <TabsContent value="routine">
          <RoutineTab student={student} bn={bn} />
        </TabsContent>
        <TabsContent value="library">
          <LibraryTab studentUuid={activeUuid} bn={bn} />
        </TabsContent>
        <TabsContent value="messages">
          <MessagesTab session={session} bn={bn} />
        </TabsContent>
        <TabsContent value="notices">
          <NoticesTab bn={bn} />
        </TabsContent>
      </Tabs>

      {/* Quick complaint link */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 text-center"
      >
        <Link to="/complaints">
          <Button variant="outline" className="rounded-xl">
            <AlertTriangle className="w-4 h-4 mr-2" />
            {bn ? 'অভিযোগ জমা দিন' : 'Submit a Complaint'}
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

// ===== Profile + Attendance Tab =====
const ProfileTab = ({ student, studentUuid, bn }: { student: any; studentUuid: string; bn: boolean }) => {
  const currentMonth = new Date();
  const monthStart = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1), 'yyyy-MM-dd');
  const monthEnd = format(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0), 'yyyy-MM-dd');

  const { data: attendance = [] } = useQuery({
    queryKey: ['parent-attendance', studentUuid, monthStart],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('attendance_date, status, check_in_time')
        .eq('entity_id', studentUuid)
        .eq('entity_type', 'student')
        .gte('attendance_date', monthStart)
        .lte('attendance_date', monthEnd)
        .order('attendance_date', { ascending: false });
      return data || [];
    },
  });

  const stats = attendance.reduce(
    (acc, r) => {
      if (r.status === 'present') acc.present++;
      else if (r.status === 'absent') acc.absent++;
      else if (r.status === 'late') acc.late++;
      return acc;
    },
    { present: 0, absent: 0, late: 0 },
  );
  const total = attendance.length || 1;
  const rate = ((stats.present + stats.late) / total) * 100;

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {bn ? 'ছাত্রের তথ্য' : 'Student Information'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!student ? (
            <p className="text-sm text-muted-foreground">{bn ? 'লোড হচ্ছে...' : 'Loading...'}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label={bn ? 'নাম' : 'Name'} value={bn ? student.name_bn : (student.name_en || student.name_bn)} />
              <InfoRow label={bn ? 'রোল' : 'Roll'} value={student.roll_number || '—'} />
              <InfoRow label={bn ? 'শ্রেণী' : 'Class'} value={bn ? student.classes?.name_bn : student.classes?.name} />
              <InfoRow label={bn ? 'সেশন' : 'Session'} value={bn ? student.academic_sessions?.name_bn : student.academic_sessions?.name} />
              <InfoRow label={bn ? 'পিতার নাম' : 'Father\'s Name'} value={student.father_name} />
              <InfoRow label={bn ? 'মাতার নাম' : 'Mother\'s Name'} value={student.mother_name} />
              <InfoRow label={bn ? 'ফোন' : 'Phone'} value={student.phone || student.guardian_phone} icon={<Phone className="w-3.5 h-3.5" />} />
              <InfoRow label={bn ? 'ঠিকানা' : 'Address'} value={student.address} />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {bn ? 'এই মাসের হাজিরা' : 'This Month\'s Attendance'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <StatBox label={bn ? 'উপস্থিতি হার' : 'Rate'} value={`${rate.toFixed(0)}%`} color="primary" />
            <StatBox label={bn ? 'উপস্থিত' : 'Present'} value={stats.present} color="green-600" />
            <StatBox label={bn ? 'অনুপস্থিত' : 'Absent'} value={stats.absent} color="red-500" />
            <StatBox label={bn ? 'দেরি' : 'Late'} value={stats.late} color="amber-500" />
          </div>
          {attendance.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              {bn ? 'এই মাসে কোনো হাজিরা রেকর্ড নেই' : 'No attendance records for this month'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                  <TableHead>{bn ? 'অবস্থা' : 'Status'}</TableHead>
                  <TableHead>{bn ? 'প্রবেশ' : 'Check-in'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.slice(0, 15).map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{format(new Date(r.attendance_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} bn={bn} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.check_in_time ? format(new Date(r.check_in_time), 'hh:mm a') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ===== Results Tab =====
const ResultsTab = ({ studentUuid, bn }: { studentUuid: string; bn: boolean }) => {
  const { data: results = [] } = useQuery({
    queryKey: ['parent-results', studentUuid],
    queryFn: async () => {
      const { data } = await supabase
        .from('results' as any)
        .select('*, exam_sessions(name, name_bn, is_published), subjects(name, name_bn)')
        .eq('student_id', studentUuid)
        .order('created_at', { ascending: false });
      return (data || []).filter((r: any) => r.exam_sessions?.is_published);
    },
  });

  // Group by exam session
  const grouped = results.reduce((acc: Record<string, any>, r: any) => {
    const key = r.exam_sessions?.name || 'unknown';
    if (!acc[key]) acc[key] = { name: r.exam_sessions?.name, name_bn: r.exam_sessions?.name_bn, items: [] };
    acc[key].items.push(r);
    return acc;
  }, {});

  return (
    <Card className="rounded-[28px] border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          {bn ? 'প্রকাশিত ফলাফল' : 'Published Results'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(grouped).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {bn ? 'এখনো কোনো ফলাফল প্রকাশিত হয়নি' : 'No results published yet'}
          </p>
        ) : (
          <div className="space-y-6">
            {Object.values(grouped).map((g: any, i) => (
              <div key={i} className="border-0 rounded-2xl bg-muted/30 p-5">
                <h3 className="font-semibold text-base mb-3">{bn ? g.name_bn : g.name}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{bn ? 'বিষয়' : 'Subject'}</TableHead>
                      <TableHead className="text-right">{bn ? 'নম্বর' : 'Marks'}</TableHead>
                      <TableHead className="text-right">{bn ? 'গ্রেড' : 'Grade'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {g.items.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{bn ? r.subjects?.name_bn : r.subjects?.name}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {r.total_marks ?? r.marks_obtained ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="outline">{r.grade || '—'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ===== Fees Tab =====
const FeesTab = ({ studentUuid, accountId, bn }: { studentUuid: string; accountId: string; bn: boolean }) => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('bkash');
  const [payTrxId, setPayTrxId] = useState('');
  const [paySender, setPaySender] = useState('');
  const [payNote, setPayNote] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ['parent-fees', studentUuid],
    queryFn: async () => {
      const { data } = await supabase
        .from('fee_payments')
        .select('*, fee_types(name, name_bn)')
        .eq('student_id', studentUuid)
        .is('deleted_at', null)
        .order('paid_at', { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  // Pending parent payment requests for this student
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['parent-payment-requests', studentUuid, accountId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('parent_payment_requests')
        .select('*')
        .eq('parent_account_id', accountId)
        .eq('student_uuid', studentUuid)
        .order('created_at', { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!accountId && !!studentUuid,
  });

  const totals = payments.reduce(
    (acc, p) => {
      const amount = Number(p.amount || 0);
      const paid = Number(p.paid_amount || 0);
      acc.total += amount;
      acc.paid += paid;
      if (p.status !== 'paid') acc.due += amount - paid;
      return acc;
    },
    { total: 0, paid: 0, due: 0 },
  );

  const handleGatewayPay = async () => {
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: bn ? 'সঠিক পরিমাণ দিন' : 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    setPaySubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('parent-pay-fee', {
        body: {
          action: 'initiate_gateway',
          account_id: accountId,
          student_uuid: studentUuid,
          amount: amt,
          return_url: window.location.href,
        },
      });
      if (error || data?.error) {
        toast({ title: bn ? 'গেটওয়ে ত্রুটি' : 'Gateway error', description: data?.error || error?.message, variant: 'destructive' });
        return;
      }
      if (data?.payment_url || data?.redirect_url) {
        window.location.href = data.payment_url || data.redirect_url;
      } else {
        toast({ title: bn ? 'রিকোয়েস্ট পাঠানো হয়েছে' : 'Request sent', description: JSON.stringify(data) });
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleManualSubmit = async () => {
    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0 || !payTrxId.trim()) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: bn ? 'পরিমাণ ও TrxID আবশ্যক' : 'Amount and TrxID required', variant: 'destructive' });
      return;
    }
    setPaySubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('parent-pay-fee', {
        body: {
          action: 'submit_manual',
          account_id: accountId,
          student_uuid: studentUuid,
          amount: amt,
          method: payMethod,
          trx_id: payTrxId.trim(),
          sender_phone: paySender.trim() || undefined,
          note: payNote.trim() || undefined,
        },
      });
      if (error || data?.error) {
        toast({ title: bn ? 'ত্রুটি' : 'Error', description: data?.error || error?.message, variant: 'destructive' });
        return;
      }
      toast({
        title: bn ? '✅ রিকোয়েস্ট জমা হয়েছে' : '✅ Submitted',
        description: bn ? 'অ্যাডমিন যাচাই করার পর পেমেন্ট রেকর্ড হবে।' : 'Admin will verify and record the payment.',
      });
      setPayOpen(false);
      setPayAmount(''); setPayTrxId(''); setPaySender(''); setPayNote('');
      qc.invalidateQueries({ queryKey: ['parent-payment-requests', studentUuid, accountId] });
      const newId = (data as any)?.request?.id;
      if (newId) {
        navigate(`/parent/receipt/${newId}`);
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setPaySubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatBox label={bn ? 'মোট ফি' : 'Total Fee'} value={`৳${totals.total.toLocaleString()}`} color="primary" />
        <StatBox label={bn ? 'পরিশোধিত' : 'Paid'} value={`৳${totals.paid.toLocaleString()}`} color="green-600" />
        <StatBox label={bn ? 'বকেয়া' : 'Due'} value={`৳${totals.due.toLocaleString()}`} color="red-500" />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => { setPayAmount(String(totals.due || '')); setPayOpen(true); }} className="rounded-xl bg-emerald-600 hover:bg-emerald-700">
          <Wallet className="w-4 h-4 mr-2" />
          {bn ? 'অনলাইনে ফি পরিশোধ করুন' : 'Pay Fee Online'}
        </Button>
      </div>

      {pendingRequests.length > 0 && (
        <Card className="rounded-[28px] border-0 shadow-lg border-l-4 border-l-amber-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              {bn ? 'যাচাইয়ের অপেক্ষায়' : 'Pending Verification'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingRequests.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-3 text-sm bg-amber-50 rounded-xl p-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">৳{Number(r.amount).toLocaleString()} • {r.method?.toUpperCase()} • TrxID: {r.trx_id}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      r.status === 'pending' ? 'bg-amber-200 text-amber-900' :
                      r.status === 'verified' ? 'bg-emerald-200 text-emerald-900' :
                      'bg-red-200 text-red-900'
                    }`}>
                      {r.status === 'pending' ? (bn ? 'অপেক্ষমাণ' : 'Pending') :
                       r.status === 'verified' ? (bn ? 'যাচাইকৃত' : 'Verified') :
                       (bn ? 'প্রত্যাখ্যাত' : 'Rejected')}
                    </span>
                    <Button size="sm" variant="outline" className="rounded-lg h-7 px-2 text-xs" onClick={() => navigate(`/parent/receipt/${r.id}`)}>
                      {bn ? 'রসিদ' : 'Receipt'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="rounded-[28px] border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {bn ? 'পেমেন্ট ইতিহাস' : 'Payment History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {bn ? 'কোনো পেমেন্ট রেকর্ড নেই' : 'No payment records'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{bn ? 'ফি ধরন' : 'Fee Type'}</TableHead>
                  <TableHead>{bn ? 'মাস' : 'Month'}</TableHead>
                  <TableHead className="text-right">{bn ? 'পরিমাণ' : 'Amount'}</TableHead>
                  <TableHead>{bn ? 'অবস্থা' : 'Status'}</TableHead>
                  <TableHead>{bn ? 'রসিদ' : 'Receipt'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {bn ? p.fee_types?.name_bn : p.fee_types?.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.month} {p.year}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      ৳{Number(p.paid_amount || p.amount).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={p.status} bn={bn} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.receipt_number || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="rounded-[28px] max-w-md">
          <DialogHeader>
            <DialogTitle>{bn ? 'অনলাইনে ফি পরিশোধ' : 'Pay Fee Online'}</DialogTitle>
            <DialogDescription>
              {bn ? 'গেটওয়ে অথবা ম্যানুয়ালি TrxID জমা দিতে পারেন।' : 'Use online gateway or submit TrxID manually.'}
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="gateway">
            <TabsList className="grid grid-cols-2 w-full rounded-xl">
              <TabsTrigger value="gateway" className="rounded-lg">{bn ? 'গেটওয়ে' : 'Gateway'}</TabsTrigger>
              <TabsTrigger value="manual" className="rounded-lg">{bn ? 'ম্যানুয়াল' : 'Manual'}</TabsTrigger>
            </TabsList>
            <TabsContent value="gateway" className="space-y-3 pt-3">
              <div>
                <Label>{bn ? 'পরিমাণ (৳)' : 'Amount (৳)'}</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <Button onClick={handleGatewayPay} disabled={paySubmitting} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">
                {paySubmitting ? (bn ? 'প্রসেসিং...' : 'Processing...') : (bn ? 'গেটওয়েতে যান' : 'Proceed to Gateway')}
              </Button>
            </TabsContent>
            <TabsContent value="manual" className="space-y-3 pt-3">
              <div>
                <Label>{bn ? 'পদ্ধতি' : 'Method'}</Label>
                <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="w-full rounded-xl border h-10 px-3 mt-1 bg-background">
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                  <option value="rocket">Rocket</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="cash">Cash</option>
                </select>
              </div>
              <div>
                <Label>{bn ? 'পরিমাণ (৳)' : 'Amount (৳)'}</Label>
                <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>{bn ? 'TrxID / রেফারেন্স' : 'TrxID / Reference'}</Label>
                <Input value={payTrxId} onChange={(e) => setPayTrxId(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>{bn ? 'প্রেরক ফোন (ঐচ্ছিক)' : 'Sender phone (optional)'}</Label>
                <Input value={paySender} onChange={(e) => setPaySender(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <div>
                <Label>{bn ? 'নোট (ঐচ্ছিক)' : 'Note (optional)'}</Label>
                <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} className="rounded-xl mt-1" />
              </div>
              <Button onClick={handleManualSubmit} disabled={paySubmitting} className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700">
                {paySubmitting ? (bn ? 'জমা হচ্ছে...' : 'Submitting...') : (bn ? 'রিকোয়েস্ট জমা দিন' : 'Submit Request')}
              </Button>
              <p className="text-xs text-muted-foreground">
                {bn ? 'অ্যাডমিন TrxID যাচাই করার পর পেমেন্ট অফিসিয়ালি রেকর্ড হবে।' : 'After admin verification this becomes an official payment.'}
              </p>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ===== Notices Tab =====
const NoticesTab = ({ bn }: { bn: boolean }) => {
  const { data: notices = [] } = useQuery({
    queryKey: ['parent-notices'],
    queryFn: async () => {
      const { data } = await supabase
        .from('notices')
        .select('id, title, title_bn, content, content_bn, created_at, is_published')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  return (
    <Card className="rounded-[28px] border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          {bn ? 'প্রতিষ্ঠানের নোটিশ' : 'Institution Notices'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {notices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {bn ? 'কোনো নোটিশ নেই' : 'No notices available'}
          </p>
        ) : (
          <div className="space-y-3">
            {notices.map((n) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-0 bg-muted/30 hover:bg-muted/50 transition-colors rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-base">{bn ? (n.title_bn || n.title) : n.title}</h3>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {format(new Date(n.created_at), 'dd MMM yyyy')}
                  </Badge>
                </div>
                {(n.content_bn || n.content) && (
                  <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {bn ? (n.content_bn || n.content) : n.content}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ===== Routine Tab (Class + Exam) =====
const RoutineTab = ({ student, bn }: { student: any; bn: boolean }) => {
  const dayNames = bn
    ? ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const { data: classRoutine = [] } = useQuery({
    queryKey: ['parent-class-routine', student?.class_id, student?.session_id],
    enabled: !!student?.class_id,
    queryFn: async () => {
      const { data: routines } = await supabase
        .from('class_routines')
        .select('id')
        .eq('class_id', student.class_id)
        .eq('is_active', true)
        .limit(1);
      if (!routines?.length) return [];
      const { data } = await supabase
        .from('routine_periods')
        .select('*, subjects(name, name_bn)')
        .eq('routine_id', routines[0].id)
        .order('day_of_week', { ascending: true })
        .order('period_number', { ascending: true });
      return data || [];
    },
  });

  const { data: examRoutine = [] } = useQuery({
    queryKey: ['parent-exam-routine', student?.class_id],
    enabled: !!student?.class_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('exam_routine_entries')
        .select('*, subjects(name, name_bn), exam_routines(name, name_bn, exam_sessions(name, name_bn, is_active))')
        .eq('class_id', student.class_id)
        .order('exam_date', { ascending: true });
      return (data || []).filter((e: any) => e.exam_routines?.exam_sessions?.is_active);
    },
  });

  // Group class routine by day
  const grouped = classRoutine.reduce((acc: Record<number, any[]>, p: any) => {
    if (!acc[p.day_of_week]) acc[p.day_of_week] = [];
    acc[p.day_of_week].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {bn ? 'ক্লাস রুটিন' : 'Class Routine'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {classRoutine.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {bn ? 'কোনো ক্লাস রুটিন পাওয়া যায়নি' : 'No class routine available'}
            </p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([day, periods]) => (
                <div key={day} className="rounded-2xl bg-muted/30 p-4">
                  <h4 className="font-semibold mb-2 text-sm">{dayNames[Number(day)]}</h4>
                  <div className="space-y-1.5">
                    {(periods as any[]).map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border/40 last:border-0">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-xs font-medium text-muted-foreground w-24 shrink-0">
                            {p.start_time?.slice(0, 5)} - {p.end_time?.slice(0, 5)}
                          </span>
                          {p.is_break ? (
                            <span className="italic text-muted-foreground">{bn ? (p.break_label_bn || 'বিরতি') : (p.break_label || 'Break')}</span>
                          ) : (
                            <>
                              <span className="font-medium truncate">{bn ? p.subjects?.name_bn : p.subjects?.name}</span>
                              {p.teacher_name && (
                                <span className="text-xs text-muted-foreground truncate">— {bn ? (p.teacher_name_bn || p.teacher_name) : p.teacher_name}</span>
                              )}
                            </>
                          )}
                        </div>
                        {p.room && <span className="text-xs text-muted-foreground shrink-0 ml-2">{p.room}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {bn ? 'পরীক্ষা রুটিন' : 'Exam Routine'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {examRoutine.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {bn ? 'কোনো পরীক্ষা রুটিন পাওয়া যায়নি' : 'No exam routine available'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                  <TableHead>{bn ? 'বিষয়' : 'Subject'}</TableHead>
                  <TableHead>{bn ? 'সময়' : 'Time'}</TableHead>
                  <TableHead>{bn ? 'কক্ষ' : 'Room'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {examRoutine.map((e: any) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{format(new Date(e.exam_date), 'dd MMM yyyy')}</TableCell>
                    <TableCell>{bn ? e.subjects?.name_bn : e.subjects?.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {e.start_time?.slice(0, 5)} - {e.end_time?.slice(0, 5)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{e.room || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ===== Library Tab =====
const LibraryTab = ({ studentUuid, bn }: { studentUuid: string; bn: boolean }) => {
  const { data: issuances = [] } = useQuery({
    queryKey: ['parent-library', studentUuid],
    queryFn: async () => {
      const { data } = await supabase
        .from('library_issuances')
        .select('*, library_books(title, title_bn, author)')
        .eq('student_id', studentUuid)
        .order('issued_date', { ascending: false });
      return data || [];
    },
  });

  const active = issuances.filter((i: any) => i.status === 'issued');
  const overdue = active.filter((i: any) => i.due_date && new Date(i.due_date) < new Date());

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatBox label={bn ? 'মোট ইস্যু' : 'Total Issued'} value={issuances.length} color="primary" />
        <StatBox label={bn ? 'বর্তমানে' : 'Currently Out'} value={active.length} color="amber-500" />
        <StatBox label={bn ? 'বিলম্বিত' : 'Overdue'} value={overdue.length} color="red-500" />
      </div>

      <Card className="rounded-[28px] border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Library className="w-5 h-5" />
            {bn ? 'বই ইস্যু ইতিহাস' : 'Book Issuance History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {issuances.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {bn ? 'কোনো বই ইস্যুর রেকর্ড নেই' : 'No book issuance records'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{bn ? 'বই' : 'Book'}</TableHead>
                  <TableHead>{bn ? 'ইস্যু তারিখ' : 'Issued'}</TableHead>
                  <TableHead>{bn ? 'ফেরত তারিখ' : 'Due'}</TableHead>
                  <TableHead>{bn ? 'অবস্থা' : 'Status'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {issuances.map((i: any) => {
                  const isOverdue = i.status === 'issued' && i.due_date && new Date(i.due_date) < new Date();
                  return (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">
                        {bn ? (i.library_books?.title_bn || i.library_books?.title) : i.library_books?.title}
                        {i.library_books?.author && (
                          <div className="text-xs text-muted-foreground">{i.library_books.author}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {i.issued_date ? format(new Date(i.issued_date), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {i.due_date ? format(new Date(i.due_date), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          isOverdue ? 'bg-red-100 text-red-700 border-red-200'
                          : i.status === 'returned' ? 'bg-green-100 text-green-700 border-green-200'
                          : i.status === 'lost' ? 'bg-red-100 text-red-700 border-red-200'
                          : 'bg-amber-100 text-amber-700 border-amber-200'
                        }>
                          {isOverdue ? (bn ? 'বিলম্বিত' : 'Overdue') :
                           i.status === 'returned' ? (bn ? 'ফেরত' : 'Returned') :
                           i.status === 'lost' ? (bn ? 'হারানো' : 'Lost') :
                           (bn ? 'ইস্যুকৃত' : 'Issued')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ===== Messages Tab =====
const MessagesTab = ({ session, bn }: { session: ParentSession; bn: boolean }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const { data: messages = [] } = useQuery({
    queryKey: ['parent-messages', session.accountId],
    queryFn: async () => {
      if (!session.accountId) return [];
      const { data } = await supabase
        .from('parent_messages' as any)
        .select('*')
        .eq('parent_account_id', session.accountId)
        .order('created_at', { ascending: false });
      return (data as any[]) || [];
    },
    enabled: !!session.accountId,
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: bn ? 'বিষয় ও বার্তা পূরণ করুন' : 'Fill subject and message', variant: 'destructive' });
      return;
    }
    setSending(true);
    try {
      const { error } = await supabase.from('parent_messages' as any).insert({
        parent_account_id: session.accountId,
        student_id: session.studentUuid,
        subject: subject.trim(),
        message: body.trim(),
        sender_type: 'parent',
        sender_name: session.fullName,
      });
      if (error) throw error;
      toast({ title: bn ? 'প্রেরিত' : 'Sent', description: bn ? 'আপনার বার্তা পাঠানো হয়েছে' : 'Your message has been sent' });
      setSubject('');
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['parent-messages', session.accountId] });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="rounded-[28px] border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {bn ? 'নতুন বার্তা পাঠান' : 'Send New Message'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSend} className="space-y-3">
            <div className="space-y-2">
              <Label>{bn ? 'বিষয়' : 'Subject'}</Label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={bn ? 'যেমন: সন্তানের অগ্রগতি' : 'e.g., Child\'s progress'}
                className="rounded-xl h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>{bn ? 'বার্তা' : 'Message'}</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={bn ? 'আপনার বার্তা লিখুন...' : 'Write your message...'}
                rows={4}
                className="rounded-xl resize-none"
              />
            </div>
            <Button type="submit" disabled={sending} className="w-full rounded-xl h-11">
              <Send className="w-4 h-4 mr-2" />
              {sending ? (bn ? 'পাঠানো হচ্ছে...' : 'Sending...') : (bn ? 'পাঠান' : 'Send')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {bn ? 'বার্তার ইতিহাস' : 'Message History'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {bn ? 'কোনো বার্তা নেই' : 'No messages yet'}
            </p>
          ) : (
            <div className="space-y-3">
              {messages.map((m: any) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl p-4 border-0 ${
                    m.sender_type === 'parent' ? 'bg-primary/5' : 'bg-emerald-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        m.sender_type === 'parent'
                          ? 'bg-primary/10 text-primary border-primary/20'
                          : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      }>
                        {m.sender_type === 'parent' ? (bn ? 'আপনি' : 'You') : (bn ? 'প্রতিষ্ঠান' : 'Institution')}
                      </Badge>
                      <span className="text-sm font-semibold">{m.subject}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {format(new Date(m.created_at), 'dd MMM, hh:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap mt-2">{m.message}</p>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ===== Helpers =====
const InfoRow = ({ label, value, icon }: { label: string; value: any; icon?: React.ReactNode }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-xs text-muted-foreground flex items-center gap-1.5">{icon}{label}</span>
    <span className="font-medium text-sm">{value || '—'}</span>
  </div>
);

const StatBox = ({ label, value, color }: { label: string; value: any; color: string }) => (
  <div className="rounded-2xl bg-muted/40 p-4 text-center">
    <div className={`text-2xl font-bold text-${color}`}>{value}</div>
    <div className="text-xs text-muted-foreground mt-1">{label}</div>
  </div>
);

const StatusBadge = ({ status, bn }: { status: string; bn: boolean }) => {
  const map: Record<string, { label_bn: string; label_en: string; cls: string }> = {
    present: { label_bn: 'উপস্থিত', label_en: 'Present', cls: 'bg-green-100 text-green-700 border-green-200' },
    absent: { label_bn: 'অনুপস্থিত', label_en: 'Absent', cls: 'bg-red-100 text-red-700 border-red-200' },
    late: { label_bn: 'দেরি', label_en: 'Late', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    leave: { label_bn: 'ছুটি', label_en: 'Leave', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  };
  const info = map[status] || { label_bn: status, label_en: status, cls: 'bg-muted' };
  return <Badge variant="outline" className={info.cls}>{bn ? info.label_bn : info.label_en}</Badge>;
};

const PaymentStatusBadge = ({ status, bn }: { status: string; bn: boolean }) => {
  const map: Record<string, { label_bn: string; label_en: string; cls: string }> = {
    paid: { label_bn: 'পরিশোধিত', label_en: 'Paid', cls: 'bg-green-100 text-green-700 border-green-200' },
    pending: { label_bn: 'অপেক্ষমাণ', label_en: 'Pending', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    partial: { label_bn: 'আংশিক', label_en: 'Partial', cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  };
  const info = map[status] || { label_bn: status, label_en: status, cls: 'bg-muted' };
  return <Badge variant="outline" className={info.cls}>{bn ? info.label_bn : info.label_en}</Badge>;
};

export default ParentPortal;
