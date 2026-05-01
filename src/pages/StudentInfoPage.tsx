import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, User, UserPlus, GraduationCap, Phone, MapPin, Calendar, Users, BookOpen, LogIn, ShieldAlert } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const PARENT_STORAGE_KEY = 'parent_portal_session';

interface ParentSession {
  accountId?: string;
  email?: string;
  fullName?: string;
  studentId: string;
  studentUuid: string;
  loggedInAt: string;
}

const StudentInfoPage = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user, role, loading: authLoading } = useAuth();

  const [parentSession, setParentSession] = useState<ParentSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  // Load parent portal session
  useEffect(() => {
    const raw = sessionStorage.getItem(PARENT_STORAGE_KEY);
    if (raw) {
      try {
        setParentSession(JSON.parse(raw));
      } catch {
        sessionStorage.removeItem(PARENT_STORAGE_KEY);
      }
    }
  }, []);

  // Determine viewer role
  const isStaff = useMemo(
    () => !!user && ['admin', 'super_admin', 'teacher', 'staff', 'administrative'].includes(role || ''),
    [user, role]
  );
  const isParent = !!parentSession?.studentUuid;
  const isLoggedIn = isStaff || isParent;

  // Auto-select for parent
  useEffect(() => {
    if (isParent && parentSession?.studentUuid && !selectedStudentId) {
      setSelectedStudentId(parentSession.studentUuid);
    }
  }, [isParent, parentSession, selectedStudentId]);

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
          <Card className="rounded-[45px] backdrop-blur-xl border-border/50 bg-card/60">
            <CardContent className="p-10 text-center space-y-5">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldAlert className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                {bn ? 'লগইন প্রয়োজন' : 'Login Required'}
              </h2>
              <p className="text-muted-foreground">
                {bn
                  ? 'শিক্ষার্থীর তথ্য দেখতে অনুগ্রহ করে অভিভাবক পোর্টালে লগইন করুন। অ্যাকাউন্ট না থাকলে নতুন একাউন্ট তৈরি করুন। শিক্ষক ও প্রশাসন তাদের অ্যাকাউন্ট দিয়ে লগইন করতে পারেন।'
                  : 'Please log in to view student information. If you don\'t have an account yet, create one. Teachers and admins can use their accounts.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2 flex-wrap">
                <Button asChild className="rounded-full">
                  <Link to="/parent-portal">
                    <LogIn className="w-4 h-4 mr-2" />
                    {bn ? 'অভিভাবক লগইন' : 'Parent Login'}
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-full">
                  <Link to="/parent-portal?mode=signup">
                    <UserPlus className="w-4 h-4 mr-2" />
                    {bn ? 'একাউন্ট তৈরি করুন' : 'Create Account'}
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
                  ? 'একাউন্ট তৈরি করতে শিক্ষার্থীর রেজিস্ট্রেশন/আইডি ও জন্ম তারিখ প্রয়োজন।'
                  : 'You will need the student\'s registration/ID number and date of birth to create an account.'}
              </p>
            </CardContent>
          </Card>
        </div>
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
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {isStaff
              ? bn ? `স্টাফ (${role})` : `Staff (${role})`
              : bn ? 'অভিভাবক' : 'Parent'}
          </Badge>
        </div>

        {/* Staff search */}
        {isStaff && (
          <Card className="rounded-[45px] backdrop-blur-xl border-border/50 bg-card/60 mb-6">
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

        {/* Parent: small chip showing own student */}
        {isParent && !isStaff && parentSession && (
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
          <Card className="rounded-[45px] bg-card/60 backdrop-blur-xl border-border/50">
            <CardContent className="p-10 text-center text-muted-foreground">
              {bn ? 'শিক্ষার্থী পাওয়া যায়নি বা অ্যাক্সেস নেই' : 'Student not found or access denied'}
            </CardContent>
          </Card>
        )}

        {student && (
          <div className="space-y-6">
            {/* Header card */}
            <Card className="rounded-[45px] backdrop-blur-xl border-border/50 bg-gradient-to-br from-primary/5 to-card/60">
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
              </CardContent>
            </Card>

            {/* Academic */}
            <Card className="rounded-[45px] backdrop-blur-xl border-border/50 bg-card/60">
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
            <Card className="rounded-[45px] backdrop-blur-xl border-border/50 bg-card/60">
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
            <Card className="rounded-[45px] backdrop-blur-xl border-border/50 bg-card/60">
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
          <Card className="rounded-[45px] bg-card/60 backdrop-blur-xl border-border/50">
            <CardContent className="p-10 text-center text-muted-foreground">
              <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-50" />
              {bn ? 'শিক্ষার্থীর তথ্য দেখতে উপরে সার্চ করুন' : 'Search above to view student information'}
            </CardContent>
          </Card>
        )}
      </div>
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
