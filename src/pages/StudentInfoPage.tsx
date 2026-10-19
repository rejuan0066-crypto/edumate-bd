import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Loader2, User, UserPlus, GraduationCap, Phone, MapPin, Calendar, Users, BookOpen, LogIn, ShieldAlert, Pencil, Save, Mail, Lock, IdCard, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import OtpVerificationDialog from '@/components/OtpVerificationDialog';
import { sanitizePasswordInput } from '@/lib/passwordInput';

const PARENT_STORAGE_KEY = 'parent_portal_session';
const STUDENT_STORAGE_KEY = 'student_portal_session';

interface ParentSession {
  accountId?: string;
  email?: string;
  fullName?: string;
  studentId: string;
  studentUuid: string;
  loggedInAt: string;
}

interface StudentSession {
  accountId?: string;
  contact?: string;
  fullName?: string;
  studentId: string;
  studentUuid: string;
  loggedInAt: string;
}

const StudentInfoPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user, role, loading: authLoading } = useAuth();

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [parentSession, setParentSession] = useState<ParentSession | null>(null);
  const [studentSession, setStudentSession] = useState<StudentSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  // Inline student signup state
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupBusy, setSignupBusy] = useState(false);
  const [suName, setSuName] = useState('');
  const [suStudentId, setSuStudentId] = useState('');
  const [suDob, setSuDob] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [otpOpen, setOtpOpen] = useState(false);

  // Load portal sessions
  useEffect(() => {
    const rawP = sessionStorage.getItem(PARENT_STORAGE_KEY);
    if (rawP) {
      try { setParentSession(JSON.parse(rawP)); } catch { sessionStorage.removeItem(PARENT_STORAGE_KEY); }
    }
    const rawS = sessionStorage.getItem(STUDENT_STORAGE_KEY);
    if (rawS) {
      try { setStudentSession(JSON.parse(rawS)); } catch { sessionStorage.removeItem(STUDENT_STORAGE_KEY); }
    }
  }, []);

  // Determine viewer role
  const isStaff = useMemo(
    () => !!user && ['admin', 'super_admin', 'teacher', 'staff', 'administrative'].includes(role || ''),
    [user, role]
  );
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isStudent = !!studentSession?.studentUuid;
  const isParent = !!parentSession?.studentUuid && !isStudent; // student session takes precedence
  const isLoggedIn = isStaff || isParent || isStudent;

  const handleStudentLogout = () => {
    sessionStorage.removeItem(STUDENT_STORAGE_KEY);
    sessionStorage.removeItem(PARENT_STORAGE_KEY);
    setStudentSession(null);
    window.location.href = '/student-portal';
  };

  const openEdit = (s: any) => {
    // Empty strings allowed → admin can clear any optional field. Only name_bn (NOT NULL) is required.
    setEditForm({
      name_bn: s.name_bn || '',
      name_en: s.name_en || '',
      father_name: s.father_name || '',
      father_name_en: s.father_name_en || '',
      father_phone: s.father_phone || '',
      father_occupation: s.father_occupation || '',
      father_nid: s.father_nid || '',
      mother_name: s.mother_name || '',
      mother_name_en: s.mother_name_en || '',
      mother_phone: s.mother_phone || '',
      mother_occupation: s.mother_occupation || '',
      mother_nid: s.mother_nid || '',
      guardian_phone: s.guardian_phone || '',
      date_of_birth: s.date_of_birth || '',
      gender: s.gender || '',
      religion: s.religion || '',
      blood_group: (s as any).blood_group || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      roll_number: s.roll_number || '',
      registration_no: s.registration_no || '',
      previous_class: s.previous_class || '',
      previous_institute: s.previous_institute || '',
      birth_reg_no: s.birth_reg_no || '',
      status: s.status || 'active',
      photo_url: s.photo_url || '',
    });
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!selectedStudentId) return;
    if (!String(editForm.name_bn || '').trim()) {
      toast({ title: bn ? 'নামের ফিল্ড আবশ্যক' : 'Name (Bangla) required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      // Convert empty strings → null so admin can truly clear optional fields
      const payload: Record<string, any> = {};
      Object.entries(editForm).forEach(([k, v]) => {
        if (k === 'name_bn') {
          payload[k] = String(v).trim();
        } else if (typeof v === 'string') {
          payload[k] = v.trim() === '' ? null : v.trim();
        } else {
          payload[k] = v;
        }
      });
      const { error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', selectedStudentId);
      if (error) throw error;
      toast({ title: bn ? 'সংরক্ষিত হয়েছে' : 'Saved successfully' });
      setEditOpen(false);
      queryClient.invalidateQueries({ queryKey: ['student-info-detail', selectedStudentId] });
      queryClient.invalidateQueries({ queryKey: ['student-info-search'] });
    } catch (err: any) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // Auto-select student's own profile (student session takes precedence over parent)
  useEffect(() => {
    if (isStudent && studentSession?.studentUuid) {
      setSelectedStudentId(studentSession.studentUuid);
    } else if (isParent && parentSession?.studentUuid && !selectedStudentId) {
      setSelectedStudentId(parentSession.studentUuid);
    }
  }, [isStudent, studentSession, isParent, parentSession, selectedStudentId]);

  // Staff search
  const { data: searchResults = [], isFetching: searching } = useQuery({
    queryKey: ['student-info-search', activeQuery],
    enabled: isStaff && activeQuery.trim().length >= 2,
    queryFn: async () => {
      const q = activeQuery.trim();
      const { data, error } = await supabase
        .from('students')
        .select('id, name_bn, name_en, student_id, roll_number, registration_no, photo_url, status, class_id, session_id')
        .or(`name_bn.ilike.%${q}%,name_en.ilike.%${q}%,student_id.ilike.%${q}%,roll_number.ilike.%${q}%,registration_no.ilike.%${q}%`)
        .is('deleted_at', null)
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  // Selected student details
  const { data: student, isLoading: loadingStudent } = useQuery({
    queryKey: ['student-info-detail', selectedStudentId],
    enabled: !!selectedStudentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          classes:class_id (id, name_bn, name_en),
          academic_sessions:session_id (id, name),
          divisions:division_id (id, name_bn, name_en)
        `)
        .eq('id', selectedStudentId!)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveQuery(searchTerm);
    setSelectedStudentId(null);
  };

  // ---- Inline signup ----
  const handleInlineSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = suName.trim();
    const sid = suStudentId.trim();
    const email = suEmail.trim().toLowerCase();
    if (!name || !sid || !suDob || !email || !suPassword) {
      toast({ title: bn ? 'ত্রুটি' : 'Error', description: bn ? 'সব ফিল্ড পূরণ করুন' : 'Fill all fields', variant: 'destructive' });
      return;
    }
    if (suPassword.length < 6) {
      toast({ title: bn ? 'দুর্বল পাসওয়ার্ড' : 'Weak password', description: bn ? 'কমপক্ষে ৬ অক্ষর' : 'At least 6 characters', variant: 'destructive' });
      return;
    }
    setSignupBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('student-auth', {
        body: {
          action: 'signup',
          contact: email,
          contact_type: 'email',
          password: suPassword,
          full_name: name,
          student_id: sid,
          student_dob: suDob,
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

      setOtpOpen(true);
      toast({
        title: bn ? 'একাউন্ট তৈরি হয়েছে' : 'Account created',
        description: bn ? 'ইমেইলে পাঠানো OTP দিয়ে ভেরিফাই করুন।' : 'Verify the OTP sent to your email.',
      });
    } catch (err: any) {
      toast({ title: bn ? 'সাইনআপ ব্যর্থ' : 'Signup failed', description: err.message, variant: 'destructive' });
    } finally {
      setSignupBusy(false);
    }
  };

  const handleInlineOtpVerified = async () => {
    setOtpOpen(false);
    await supabase.functions.invoke('student-auth', {
      body: { action: 'mark_verified', contact: suEmail.trim().toLowerCase() },
    });
    toast({
      title: bn ? 'ভেরিফাই সফল' : 'Verified',
      description: bn ? 'এখন লগইন করতে যান।' : 'You can log in now.',
    });
    // Send them to the portal to log in
    window.location.href = `/student-portal?mode=login`;
  };

  // ---- Render gates ----
  if (authLoading) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-20 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (!isLoggedIn) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <h1 className="text-3xl font-display font-bold text-foreground mb-8">
            {bn ? 'শিক্ষার্থী তথ্য' : 'Student Info'}
          </h1>
          <Card className="rounded-2xl sm:rounded-3xl border-border/60 bg-card/85 shadow-md">
            <CardContent className="p-10 text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {bn ? 'লগইন প্রয়োজন' : 'Login Required'}
              </h2>
              <p className="text-muted-foreground">
                {bn
                  ? 'শিক্ষার্থী নিজে অথবা অভিভাবক — যেকেউ লগইন করে শিক্ষার্থীর তথ্য দেখতে পারবেন। অ্যাকাউন্ট না থাকলে নিচ থেকে তৈরি করুন। শিক্ষক ও প্রশাসন তাদের অ্যাকাউন্ট দিয়ে লগইন করতে পারেন।'
                  : 'A student or parent can log in to view student information. Create an account if you don\'t have one. Teachers and admins can use their accounts.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 flex-wrap">
                <Button asChild className="rounded-full">
                  <Link to="/student-portal">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    {bn ? 'ছাত্র লগইন' : 'Student Login'}
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-full"
                  onClick={() => setSignupOpen((v) => !v)}
                  aria-expanded={signupOpen}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {bn ? 'এখানেই একাউন্ট তৈরি' : 'Create Account Here'}
                  {signupOpen ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/parent-portal">
                    <LogIn className="w-4 h-4 mr-2" />
                    {bn ? 'অভিভাবক লগইন' : 'Parent Login'}
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-full">
                  <Link to="/auth">
                    <User className="w-4 h-4 mr-2" />
                    {bn ? 'স্টাফ লগইন' : 'Staff Login'}
                  </Link>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground pt-2">
                {bn
                  ? 'একাউন্ট তৈরি করতে শিক্ষার্থীর আইডি ও জন্ম তারিখ প্রয়োজন। প্রতি আইডিতে শুধু একটি একাউন্ট খোলা যাবে।'
                  : 'You need the Student ID and date of birth. Only one account per Student ID.'}
              </p>

              {/* Inline student signup form */}
              {signupOpen && (
                <form onSubmit={handleInlineSignup} className="text-left mt-6 pt-6 border-t border-border/50 space-y-4">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    {bn ? 'নতুন ছাত্র একাউন্ট' : 'New Student Account'}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <Label className="flex items-center gap-2"><User className="w-4 h-4" />{bn ? 'পূর্ণ নাম' : 'Full Name'}</Label>
                      <Input value={suName} onChange={(e) => setSuName(e.target.value)} maxLength={100} className="rounded-2xl" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><IdCard className="w-4 h-4" />{bn ? 'শিক্ষার্থী আইডি' : 'Student ID'}</Label>
                      <Input value={suStudentId} onChange={(e) => setSuStudentId(e.target.value)} maxLength={50} className="rounded-2xl" required />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Calendar className="w-4 h-4" />{bn ? 'জন্ম তারিখ' : 'Date of Birth'}</Label>
                      <DatePicker value={suDob} onChange={setSuDob} bengali={bn} fromYear={1990} toYear={2026} placeholder={bn ? 'জন্ম তারিখ নির্বাচন করুন' : 'Select Date of Birth'} />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2"><Mail className="w-4 h-4" />{bn ? 'ইমেইল' : 'Email'}</Label>
                      <Input type="email" value={suEmail} onChange={(e) => setSuEmail(e.target.value)} maxLength={255} className="rounded-2xl" required />
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
                      ? 'নোট: শিক্ষার্থী আইডি ও জন্ম তারিখ অফিস রেকর্ডের সাথে মিলতে হবে। সাইনআপের পর ইমেইল OTP ভেরিফাই করতে হবে।'
                      : 'Note: Student ID and DOB must match official records. Email OTP verification required after signup.'}
                  </p>
                  <Button type="submit" className="w-full rounded-full" disabled={signupBusy}>
                    {signupBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                    {signupBusy ? (bn ? 'প্রক্রিয়া...' : 'Processing...') : (bn ? 'একাউন্ট তৈরি করুন' : 'Create Account')}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        {otpOpen && (
          <OtpVerificationDialog
            open={otpOpen}
            onOpenChange={setOtpOpen}
            email={suEmail.trim().toLowerCase()}
            recipientName={suName}
            purpose="email_verification"
            onVerified={handleInlineOtpVerified}
          />
        )}
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <h1 className="text-3xl font-display font-bold text-foreground">
            {bn ? 'শিক্ষার্থী তথ্য' : 'Student Info'}
          </h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {isStaff
                ? bn ? `স্টাফ (${role})` : `Staff (${role})`
                : isStudent
                  ? bn ? 'শিক্ষার্থী' : 'Student'
                  : bn ? 'অভিভাবক' : 'Parent'}
            </Badge>
            {isStudent && (
              <Button onClick={handleStudentLogout} size="sm" variant="outline" className="rounded-full">
                <LogIn className="w-4 h-4 mr-1 rotate-180" />
                {bn ? 'লগআউট' : 'Logout'}
              </Button>
            )}
          </div>
        </div>

        {/* Staff search — only for staff, never for students/parents */}
        {isStaff && !isStudent && (
          <Card className="rounded-2xl sm:rounded-3xl border-border/60 bg-card/85 shadow-md mb-6">
            <CardContent className="p-6">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={bn ? 'নাম, রোল বা রেজিস্ট্রেশন নম্বর দিয়ে খুঁজুন...' : 'Search by name, roll or reg no...'}
                    className="pl-10 rounded-full bg-background"
                  />
                </div>
                <Button type="submit" disabled={!searchTerm.trim()} className="rounded-full">
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : (bn ? 'খুঁজুন' : 'Search')}
                </Button>
              </form>

              {activeQuery && !selectedStudentId && (
                <div className="mt-5 space-y-2">
                  {searching && (
                    <p className="text-sm text-muted-foreground text-center">
                      {bn ? 'খোঁজা হচ্ছে...' : 'Searching...'}
                    </p>
                  )}
                  {!searching && searchResults.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {bn ? 'কোনো শিক্ষার্থী পাওয়া যায়নি' : 'No students found'}
                    </p>
                  )}
                  {searchResults.map((s: any) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedStudentId(s.id)}
                      className="w-full flex items-center gap-4 p-3 rounded-[20px] hover:bg-accent/50 hover:-translate-y-[3px] transition-all text-left border border-border/40"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{bn ? s.name_bn : (s.name_en || s.name_bn)}</p>
                        <p className="text-xs text-muted-foreground">
                          {bn ? 'রেজিঃ' : 'Reg'}: {s.registration_no || '-'} • {bn ? 'রোল' : 'Roll'}: {s.roll_number || '-'}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">{s.status || 'active'}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Student: chip showing self */}
        {isStudent && studentSession && (
          <p className="text-sm text-muted-foreground mb-4">
            {bn
              ? `শিক্ষার্থী: ${studentSession.fullName || ''} • আইডি: ${studentSession.studentId}`
              : `Student: ${studentSession.fullName || ''} • ID: ${studentSession.studentId}`}
          </p>
        )}

        {/* Parent: small chip showing own student */}
        {isParent && !isStaff && !isStudent && parentSession && (
          <p className="text-sm text-muted-foreground mb-4">
            {bn
              ? `অভিভাবক: ${parentSession.fullName || parentSession.email || ''} • শিক্ষার্থী আইডি: ${parentSession.studentId}`
              : `Parent: ${parentSession.fullName || parentSession.email || ''} • Student ID: ${parentSession.studentId}`}
          </p>
        )}

        {/* Student detail */}
        {loadingStudent && (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!loadingStudent && selectedStudentId && !student && (
          <Card className="rounded-2xl sm:rounded-3xl bg-card/85 backdrop-blur-xl border-border/60 shadow-md">
            <CardContent className="p-10 text-center text-muted-foreground">
              {bn ? 'শিক্ষার্থী পাওয়া যায়নি বা অ্যাক্সেস নেই' : 'Student not found or access denied'}
            </CardContent>
          </Card>
        )}

        {student && (
          <div className="space-y-6">
            {/* Header card */}
            <Card className="rounded-2xl sm:rounded-3xl backdrop-blur-xl border-border/60 bg-gradient-to-br from-primary/5 to-card/60 shadow-md">
              <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
                <div className="w-28 h-28 rounded-3xl bg-primary/10 flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-primary/20">
                  {student.photo_url ? (
                    <img src={student.photo_url} alt={student.name_bn} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-primary" />
                  )}
                </div>
                <div className="flex-1 text-center sm:text-left space-y-2">
                  <h2 className="text-2xl font-display font-bold text-foreground">
                    {bn ? student.name_bn : (student.name_en || student.name_bn)}
                  </h2>
                  {student.name_en && bn && (
                    <p className="text-sm text-muted-foreground">{student.name_en}</p>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                    <Badge variant="secondary" className="rounded-full">
                      {bn ? 'রেজিঃ' : 'Reg'}: {student.registration_no || '-'}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {bn ? 'রোল' : 'Roll'}: {student.roll_number || '-'}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {(student as any).classes?.[bn ? 'name_bn' : 'name_en'] || (student as any).classes?.name_bn || '-'}
                    </Badge>
                    <Badge className="rounded-full">{student.status || 'active'}</Badge>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    onClick={() => openEdit(student)}
                    className="rounded-full self-start"
                    variant="secondary"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    {bn ? 'সম্পাদনা' : 'Edit'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Academic */}
            <Card className="rounded-2xl sm:rounded-3xl border-border/60 bg-card/85 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <GraduationCap className="w-5 h-5 text-primary" />
                  {bn ? 'শিক্ষাগত তথ্য' : 'Academic Info'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <InfoRow label={bn ? 'বিভাগ' : 'Division'} value={(student as any).divisions?.[bn ? 'name_bn' : 'name_en'] || (student as any).divisions?.name_bn} />
                <InfoRow label={bn ? 'সেশন' : 'Session'} value={(student as any).academic_sessions?.name} />
                <InfoRow label={bn ? 'শ্রেণি' : 'Class'} value={(student as any).classes?.[bn ? 'name_bn' : 'name_en'] || (student as any).classes?.name_bn} />
                <InfoRow label={bn ? 'ভর্তির তারিখ' : 'Admission Date'} value={student.admission_date ? format(new Date(student.admission_date), 'dd/MM/yyyy') : null} />
                <InfoRow label={bn ? 'পূর্ববর্তী শ্রেণি' : 'Previous Class'} value={student.previous_class} />
                <InfoRow label={bn ? 'পূর্ববর্তী প্রতিষ্ঠান' : 'Previous Institute'} value={student.previous_institute} />
              </CardContent>
            </Card>

            {/* Personal */}
            <Card className="rounded-2xl sm:rounded-3xl border-border/60 bg-card/85 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="w-5 h-5 text-primary" />
                  {bn ? 'ব্যক্তিগত তথ্য' : 'Personal Info'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <InfoRow label={bn ? 'জন্ম তারিখ' : 'Date of Birth'} value={student.date_of_birth ? format(new Date(student.date_of_birth), 'dd/MM/yyyy') : null} icon={<Calendar className="w-4 h-4" />} />
                <InfoRow label={bn ? 'লিঙ্গ' : 'Gender'} value={student.gender} />
                <InfoRow label={bn ? 'ধর্ম' : 'Religion'} value={student.religion} />
                <InfoRow label={bn ? 'মোবাইল' : 'Phone'} value={student.phone} icon={<Phone className="w-4 h-4" />} />
                <InfoRow label={bn ? 'ঠিকানা' : 'Address'} value={student.address} icon={<MapPin className="w-4 h-4" />} fullWidth />
              </CardContent>
            </Card>

            {/* Guardian */}
            <Card className="rounded-2xl sm:rounded-3xl border-border/60 bg-card/85 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-5 h-5 text-primary" />
                  {bn ? 'অভিভাবক তথ্য' : 'Guardian Info'}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <InfoRow label={bn ? 'পিতার নাম' : "Father's Name"} value={bn ? student.father_name : (student.father_name_en || student.father_name)} />
                <InfoRow label={bn ? 'পিতার পেশা' : "Father's Occupation"} value={student.father_occupation} />
                <InfoRow label={bn ? 'পিতার ফোন' : "Father's Phone"} value={student.father_phone} icon={<Phone className="w-4 h-4" />} />
                <InfoRow label={bn ? 'মাতার নাম' : "Mother's Name"} value={bn ? student.mother_name : (student.mother_name_en || student.mother_name)} />
                <InfoRow label={bn ? 'মাতার পেশা' : "Mother's Occupation"} value={student.mother_occupation} />
                <InfoRow label={bn ? 'মাতার ফোন' : "Mother's Phone"} value={student.mother_phone} icon={<Phone className="w-4 h-4" />} />
                <InfoRow label={bn ? 'অভিভাবকের ফোন' : "Guardian Phone"} value={student.guardian_phone} icon={<Phone className="w-4 h-4" />} />
              </CardContent>
            </Card>

            {isParent && !isStaff && (
              <p className="text-xs text-muted-foreground text-center">
                {bn
                  ? 'আপনি শুধু আপনার সন্তানের তথ্যই দেখতে পাচ্ছেন।'
                  : 'You can only view information for your linked student.'}
              </p>
            )}
          </div>
        )}

        {/* Empty state for staff with no selection */}
        {isStaff && !selectedStudentId && !activeQuery && (
          <Card className="rounded-2xl sm:rounded-3xl bg-card/85 backdrop-blur-xl border-border/60 shadow-md">
            <CardContent className="p-10 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
              {bn ? 'শিক্ষার্থীর তথ্য দেখতে উপরে সার্চ করুন' : 'Search above to view student information'}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Admin / super_admin: edit student dialog — all fields optional except name_bn (DB NOT NULL) */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="rounded-[38px] max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              {bn ? 'শিক্ষার্থীর তথ্য সম্পাদনা' : 'Edit Student Information'}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {bn
                ? 'যেকোনো ফিল্ড ফাঁকা রেখে সংরক্ষণ করা যাবে। শুধু নাম (বাংলা) আবশ্যক।'
                : 'Any field can be left blank. Only Name (Bangla) is required.'}
            </p>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {[
              { k: 'name_bn', l_bn: 'নাম (বাংলা) *', l_en: 'Name (BN) *' },
              { k: 'name_en', l_bn: 'নাম (ইংরেজি)', l_en: 'Name (EN)' },
              { k: 'roll_number', l_bn: 'রোল', l_en: 'Roll' },
              { k: 'registration_no', l_bn: 'রেজিস্ট্রেশন নম্বর', l_en: 'Registration No' },
              { k: 'date_of_birth', l_bn: 'জন্ম তারিখ', l_en: 'Date of Birth', type: 'date' },
              { k: 'gender', l_bn: 'লিঙ্গ', l_en: 'Gender' },
              { k: 'religion', l_bn: 'ধর্ম', l_en: 'Religion' },
              { k: 'blood_group', l_bn: 'রক্তের গ্রুপ', l_en: 'Blood Group' },
              { k: 'phone', l_bn: 'মোবাইল', l_en: 'Phone' },
              { k: 'email', l_bn: 'ইমেইল', l_en: 'Email', type: 'email' },
              { k: 'birth_reg_no', l_bn: 'জন্ম নিবন্ধন নম্বর', l_en: 'Birth Reg No' },
              { k: 'father_name', l_bn: 'পিতার নাম', l_en: "Father's Name" },
              { k: 'father_name_en', l_bn: 'পিতার নাম (EN)', l_en: "Father's Name (EN)" },
              { k: 'father_phone', l_bn: 'পিতার ফোন', l_en: "Father's Phone" },
              { k: 'father_occupation', l_bn: 'পিতার পেশা', l_en: "Father's Occupation" },
              { k: 'father_nid', l_bn: 'পিতার NID', l_en: "Father's NID" },
              { k: 'mother_name', l_bn: 'মাতার নাম', l_en: "Mother's Name" },
              { k: 'mother_name_en', l_bn: 'মাতার নাম (EN)', l_en: "Mother's Name (EN)" },
              { k: 'mother_phone', l_bn: 'মাতার ফোন', l_en: "Mother's Phone" },
              { k: 'mother_occupation', l_bn: 'মাতার পেশা', l_en: "Mother's Occupation" },
              { k: 'mother_nid', l_bn: 'মাতার NID', l_en: "Mother's NID" },
              { k: 'guardian_phone', l_bn: 'অভিভাবকের ফোন', l_en: 'Guardian Phone' },
              { k: 'previous_class', l_bn: 'পূর্ববর্তী শ্রেণি', l_en: 'Previous Class' },
              { k: 'previous_institute', l_bn: 'পূর্ববর্তী প্রতিষ্ঠান', l_en: 'Previous Institute' },
              { k: 'status', l_bn: 'স্ট্যাটাস', l_en: 'Status' },
              { k: 'photo_url', l_bn: 'ছবির URL', l_en: 'Photo URL' },
            ].map((f) => (
              <div key={f.k} className="space-y-1.5">
                <Label className="text-xs">{bn ? f.l_bn : f.l_en}</Label>
                <Input
                  type={(f as any).type || 'text'}
                  value={editForm[f.k] ?? ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, [f.k]: e.target.value }))}
                  className="rounded-xl"
                />
              </div>
            ))}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{bn ? 'ঠিকানা' : 'Address'}</Label>
              <Textarea
                value={editForm.address ?? ''}
                onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                className="rounded-xl"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-full">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-full">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {bn ? 'সংরক্ষণ করুন' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
};

const InfoRow = ({ label, value, icon, fullWidth }: { label: string; value?: string | null; icon?: React.ReactNode; fullWidth?: boolean }) => (
  <div className={fullWidth ? 'sm:col-span-2' : ''}>
    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
      {icon}
      {label}
    </p>
    <p className="font-medium text-foreground break-words">{value || '—'}</p>
  </div>
);

export default StudentInfoPage;
