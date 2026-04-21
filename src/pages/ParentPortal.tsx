import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import PublicLayout from '@/components/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, GraduationCap, Wallet, Bell, LogOut, Calendar, Users, Phone, BookOpen, Mail, Lock, UserPlus, LogIn } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import OtpVerificationDialog from '@/components/OtpVerificationDialog';

const STORAGE_KEY = 'parent_portal_session';

interface ParentSession {
  accountId?: string;
  email?: string;
  fullName?: string;
  studentId: string;
  studentUuid: string;
  loggedInAt: string;
}

const ParentPortal = () => {
  const { language } = useLanguage();
  const { toast } = useToast();
  const bn = language === 'bn';

  const [session, setSession] = useState<ParentSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupStudentId, setSignupStudentId] = useState('');
  const [signupDob, setSignupDob] = useState('');
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);

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
      if (error || !data?.success) {
        const errMsg = data?.error || error?.message || 'Login failed';
        const code = data?.code;
        const friendly =
          code === 'PENDING_APPROVAL' ? (bn ? 'আপনার অ্যাকাউন্ট অনুমোদনের অপেক্ষায়' : 'Account pending admin approval')
          : code === 'EMAIL_NOT_VERIFIED' ? (bn ? 'ইমেইল ভেরিফাই হয়নি' : 'Email not verified')
          : code === 'REJECTED' ? (bn ? `প্রত্যাখ্যাত: ${errMsg}` : `Rejected: ${errMsg}`)
          : code === 'SUSPENDED' ? (bn ? 'অ্যাকাউন্ট স্থগিত' : 'Account suspended')
          : errMsg;
        toast({ title: bn ? 'লগইন ব্যর্থ' : 'Login Failed', description: friendly, variant: 'destructive' });
        return;
      }
      const acc = data.account;
      const newSession: ParentSession = {
        accountId: acc.id,
        email: acc.email,
        fullName: acc.full_name,
        studentId: acc.student_id,
        studentUuid: acc.linked_student_uuid,
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
    if (!signupEmail.trim() || !signupPassword || !signupFullName.trim() || !signupStudentId.trim() || !signupDob) {
      toast({
        title: bn ? 'ত্রুটি' : 'Error',
        description: bn ? 'সব তথ্য পূরণ করুন' : 'Fill all required fields',
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
          student_id: signupStudentId.trim(),
          student_dob: signupDob,
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
      // Open OTP dialog for email verification
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
      title: bn ? 'সাইনআপ সম্পন্ন' : 'Signup Complete',
      description: bn
        ? 'ইমেইল ভেরিফাইড। অ্যাডমিন অনুমোদনের পর লগইন করতে পারবেন।'
        : 'Email verified. You can login after admin approval.',
    });
    // Reset signup form & switch to login
    setSignupEmail('');
    setSignupPassword('');
    setSignupFullName('');
    setSignupPhone('');
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
                          onChange={(e) => setLoginPassword(e.target.value)}
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
                      <div className="space-y-2">
                        <Label htmlFor="su-name">{bn ? 'আপনার নাম' : 'Your Full Name'}</Label>
                        <Input id="su-name" value={signupFullName} onChange={(e) => setSignupFullName(e.target.value)} className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="su-email">{bn ? 'ইমেইল' : 'Email'}</Label>
                        <Input id="su-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="su-phone">{bn ? 'ফোন (ঐচ্ছিক)' : 'Phone (optional)'}</Label>
                        <Input id="su-phone" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="rounded-xl h-11" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="su-pwd">{bn ? 'পাসওয়ার্ড' : 'Password'}</Label>
                        <Input id="su-pwd" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="rounded-xl h-11" />
                      </div>
                      <div className="border-t pt-3 mt-3">
                        <p className="text-xs text-muted-foreground mb-2">{bn ? 'সন্তানের তথ্য (যাচাইয়ের জন্য)' : 'Child Info (for verification)'}</p>
                        <div className="space-y-2">
                          <Label htmlFor="su-sid">{bn ? 'ছাত্র আইডি' : 'Student ID'}</Label>
                          <Input id="su-sid" placeholder="STU-2026-001" value={signupStudentId} onChange={(e) => setSignupStudentId(e.target.value)} className="rounded-xl h-11" />
                        </div>
                        <div className="space-y-2 mt-2">
                          <Label htmlFor="su-dob">{bn ? 'সন্তানের জন্মতারিখ (dd/mm/yyyy)' : "Child's Date of Birth (dd/mm/yyyy)"}</Label>
                          <Input
                            id="su-dob"
                            type="text"
                            inputMode="numeric"
                            placeholder="dd/mm/yyyy"
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
                      </div>
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
  // Fetch student full info
  const { data: student } = useQuery({
    queryKey: ['parent-student', session.studentUuid],
    queryFn: async () => {
      const { data } = await supabase
        .from('students')
        .select('*, classes(name, name_bn), academic_sessions(name, name_bn)')
        .eq('id', session.studentUuid)
        .maybeSingle();
      return data;
    },
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            {bn ? 'স্বাগতম, অভিভাবক' : 'Welcome, Parent'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {bn ? 'ছাত্র আইডি' : 'Student ID'}: <span className="font-semibold text-foreground">{session.studentId}</span>
          </p>
        </div>
        <Button variant="outline" onClick={onLogout} className="rounded-xl">
          <LogOut className="w-4 h-4 mr-2" />
          {bn ? 'লগআউট' : 'Logout'}
        </Button>
      </motion.div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 rounded-2xl mb-6">
          <TabsTrigger value="profile" className="rounded-xl py-2.5">
            <User className="w-4 h-4 mr-2" />
            {bn ? 'প্রোফাইল' : 'Profile'}
          </TabsTrigger>
          <TabsTrigger value="results" className="rounded-xl py-2.5">
            <GraduationCap className="w-4 h-4 mr-2" />
            {bn ? 'ফলাফল' : 'Results'}
          </TabsTrigger>
          <TabsTrigger value="fees" className="rounded-xl py-2.5">
            <Wallet className="w-4 h-4 mr-2" />
            {bn ? 'ফি' : 'Fees'}
          </TabsTrigger>
          <TabsTrigger value="notices" className="rounded-xl py-2.5">
            <Bell className="w-4 h-4 mr-2" />
            {bn ? 'নোটিশ' : 'Notices'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab student={student} studentUuid={session.studentUuid} bn={bn} />
        </TabsContent>
        <TabsContent value="results">
          <ResultsTab studentUuid={session.studentUuid} bn={bn} />
        </TabsContent>
        <TabsContent value="fees">
          <FeesTab studentUuid={session.studentUuid} bn={bn} />
        </TabsContent>
        <TabsContent value="notices">
          <NoticesTab bn={bn} />
        </TabsContent>
      </Tabs>
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
const FeesTab = ({ studentUuid, bn }: { studentUuid: string; bn: boolean }) => {
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatBox label={bn ? 'মোট ফি' : 'Total Fee'} value={`৳${totals.total.toLocaleString()}`} color="primary" />
        <StatBox label={bn ? 'পরিশোধিত' : 'Paid'} value={`৳${totals.paid.toLocaleString()}`} color="green-600" />
        <StatBox label={bn ? 'বকেয়া' : 'Due'} value={`৳${totals.due.toLocaleString()}`} color="red-500" />
      </div>

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
