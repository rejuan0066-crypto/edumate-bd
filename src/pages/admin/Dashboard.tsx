import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Users, UserCog, BookOpen, UserCheck, UserX, GraduationCap,
  Layers, FileText, CreditCard, ClipboardList, History, Home, HomeIcon, Heart
} from 'lucide-react';
import DashboardInstitutionCard from '@/components/dashboard/DashboardInstitutionCard';
import DashboardSearch from '@/components/dashboard/DashboardSearch';
import DashboardFeeSection from '@/components/dashboard/DashboardFeeSection';
import DashboardStatsList from '@/components/dashboard/DashboardStatsList';
import DashboardCustomWidgets from '@/components/dashboard/DashboardCustomWidgets';

const Dashboard = () => {
  const { language } = useLanguage();
  const [listDialog, setListDialog] = useState<{ open: boolean; title: string; table: 'students' | 'staff' | 'donors'; filters: Record<string, any> }>({
    open: false, title: '', table: 'students', filters: {},
  });

  const { data: students = [] } = useQuery({
    queryKey: ['dashboard-students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('id, status, gender, admission_date, student_category, residence_type, division_id');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ['dashboard-staff'],
    queryFn: async () => {
      const { data, error } = await supabase.from('staff').select('id, status, department, designation, salary');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['dashboard-divisions'],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('id').eq('is_active', true);
      return data || [];
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['dashboard-subjects'],
    queryFn: async () => {
      const { data } = await supabase.from('subjects').select('id').eq('is_active', true);
      return data || [];
    },
  });

  const { data: results = [] } = useQuery({
    queryKey: ['dashboard-results'],
    queryFn: async () => {
      const { data } = await supabase.from('results').select('id');
      return data || [];
    },
  });

  const { data: exams = [] } = useQuery({
    queryKey: ['dashboard-exams'],
    queryFn: async () => {
      const { data } = await supabase.from('exams').select('id');
      return data || [];
    },
  });

  const { data: donors = [] } = useQuery({
    queryKey: ['dashboard-donors'],
    queryFn: async () => {
      const { data } = await supabase.from('donors').select('id, name_bn, donation_amount, status');
      return data || [];
    },
  });

  // Fee payments for non-orphan&poor amounts
  const { data: feePayments = [] } = useQuery({
    queryKey: ['dashboard-fee-payments-summary'],
    queryFn: async () => {
      const { data } = await supabase.from('fee_payments').select('id, amount, paid_amount, status, student_id');
      return data || [];
    },
  });

  // Student stats
  const activeStudents = students.filter(s => s.status === 'active');
  const inactiveStudents = students.filter(s => s.status === 'inactive');
  const currentYear = new Date().getFullYear();
  const newStudents = students.filter(s => s.admission_date && new Date(s.admission_date).getFullYear() === currentYear);
  const oldStudents = students.filter(s => !s.admission_date || new Date(s.admission_date).getFullYear() < currentYear);

  // Category stats
  const orphanStudents = students.filter(s => (s as any).student_category === 'orphan');
  const poorStudents = students.filter(s => (s as any).student_category === 'poor');
  const generalStudents = students.filter(s => (s as any).student_category === 'general' || !(s as any).student_category);

  // Non-orphan&poor total paid amounts
  const generalStudentIds = new Set(generalStudents.map(s => s.id));
  const generalPaidAmount = feePayments
    .filter(fp => generalStudentIds.has(fp.student_id) && fp.status === 'paid')
    .reduce((sum, fp) => sum + Number(fp.paid_amount || fp.amount || 0), 0);

  // Residence stats
  const residentStudents = students.filter(s => (s as any).residence_type === 'resident');
  const nonResidentStudents = students.filter(s => (s as any).residence_type === 'non-resident' || !(s as any).residence_type);

  // Session-wise (admission year) grouping
  const sessionWiseMap: Record<number, number> = {};
  students.forEach(s => {
    const year = s.admission_date ? new Date(s.admission_date).getFullYear() : 0;
    if (year) sessionWiseMap[year] = (sessionWiseMap[year] || 0) + 1;
  });
  const sessionYears = Object.keys(sessionWiseMap).sort((a, b) => Number(b) - Number(a));

  // Staff stats
  const teachers = staff.filter(s => s.department === 'teaching' || s.designation?.includes('শিক্ষক') || s.designation?.includes('teacher') || s.designation?.toLowerCase()?.includes('teacher'));
  const nonTeachingStaff = staff.filter(s => !teachers.includes(s));
  const activeStaff = nonTeachingStaff.filter(s => s.status === 'active');
  const resignedStaff = nonTeachingStaff.filter(s => s.status !== 'active');
  const activeTeachers = teachers.filter(s => s.status === 'active');
  const resignedTeachers = teachers.filter(s => s.status !== 'active');

  // Donor stats
  const totalDonationAmount = donors.reduce((sum, d) => sum + Number(d.donation_amount || 0), 0);
  const activeDonors = donors.filter(d => d.status === 'active');

  const openList = (title: string, table: 'students' | 'staff' | 'donors', filters: Record<string, any> = {}) => {
    setListDialog({ open: true, title, table, filters });
  };

  const statCards = [
    { label: language === 'bn' ? 'মোট ছাত্র' : 'Total Students', value: students.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10', onClick: () => openList(language === 'bn' ? 'মোট ছাত্র' : 'Total Students', 'students') },
    { label: language === 'bn' ? 'সক্রিয় ছাত্র' : 'Active Students', value: activeStudents.length, icon: UserCheck, color: 'text-success', bg: 'bg-success/10', onClick: () => openList(language === 'bn' ? 'সক্রিয় ছাত্র' : 'Active Students', 'students', { status: 'active' }) },
    { label: language === 'bn' ? 'নিষ্ক্রিয় ছাত্র' : 'Inactive Students', value: inactiveStudents.length, icon: UserX, color: 'text-destructive', bg: 'bg-destructive/10', onClick: () => openList(language === 'bn' ? 'নিষ্ক্রিয় ছাত্র' : 'Inactive Students', 'students', { status: 'inactive' }) },
    { label: language === 'bn' ? 'মোট কর্মী' : 'Total Staff', value: nonTeachingStaff.length, icon: UserCog, color: 'text-accent', bg: 'bg-accent/10', onClick: () => openList(language === 'bn' ? 'মোট কর্মী' : 'Total Staff', 'staff') },
  ];

  const staffTeacherStats = [
    { label: language === 'bn' ? 'শিক্ষক (সক্রিয়)' : 'Teachers (Active)', value: activeTeachers.length, icon: UserCheck, color: 'text-success', bg: 'bg-success/10', onClick: () => openList(language === 'bn' ? 'সক্রিয় শিক্ষক' : 'Active Teachers', 'staff', { status: 'active' }) },
    { label: language === 'bn' ? 'শিক্ষক (পদত্যাগী)' : 'Teachers (Resigned)', value: resignedTeachers.length, icon: UserX, color: 'text-destructive', bg: 'bg-destructive/10', onClick: () => openList(language === 'bn' ? 'পদত্যাগী শিক্ষক' : 'Resigned Teachers', 'staff') },
    { label: language === 'bn' ? 'কর্মী (সক্রিয়)' : 'Staff (Active)', value: activeStaff.length, icon: UserCheck, color: 'text-primary', bg: 'bg-primary/10', onClick: () => openList(language === 'bn' ? 'সক্রিয় কর্মী' : 'Active Staff', 'staff', { status: 'active' }) },
    { label: language === 'bn' ? 'কর্মী (পদত্যাগী)' : 'Staff (Resigned)', value: resignedStaff.length, icon: UserX, color: 'text-muted-foreground', bg: 'bg-muted/50', onClick: () => openList(language === 'bn' ? 'পদত্যাগী কর্মী' : 'Resigned Staff', 'staff') },
    { label: language === 'bn' ? 'গত মাসের বেতন' : 'Last Month Salary', value: `৳ ${staff.filter(s => s.status === 'active').reduce((s, x) => s + (Number(x.salary) || 0), 0).toLocaleString()}`, icon: CreditCard, color: 'text-accent', bg: 'bg-accent/10', onClick: () => openList(language === 'bn' ? 'সক্রিয় কর্মী ও শিক্ষক' : 'Active Staff & Teachers', 'staff', { status: 'active' }) },
  ];

  const studentCategoryStats = [
    { label: language === 'bn' ? 'এতিম ছাত্র' : 'Orphan Students', value: orphanStudents.length, icon: Users, color: 'text-destructive', bg: 'bg-destructive/10', onClick: () => openList(language === 'bn' ? 'এতিম ছাত্র' : 'Orphan Students', 'students', { student_category: 'orphan' }) },
    { label: language === 'bn' ? 'গরীব ছাত্র' : 'Poor Students', value: poorStudents.length, icon: Users, color: 'text-accent', bg: 'bg-accent/10', onClick: () => openList(language === 'bn' ? 'গরীব ছাত্র' : 'Poor Students', 'students', { student_category: 'poor' }) },
    { label: language === 'bn' ? 'সাধারণ ছাত্র ও পরিশোধিত' : 'Non-Orphan&Poor + Amounts', value: `${generalStudents.length} (৳${generalPaidAmount.toLocaleString()})`, icon: Users, color: 'text-primary', bg: 'bg-primary/10' },
    { label: language === 'bn' ? 'আবাসিক ছাত্র' : 'Resident Students', value: residentStudents.length, icon: HomeIcon, color: 'text-success', bg: 'bg-success/10', onClick: () => openList(language === 'bn' ? 'আবাসিক ছাত্র' : 'Resident Students', 'students', { residence_type: 'resident' }) },
    { label: language === 'bn' ? 'অনাবাসিক ছাত্র' : 'Non-Resident Students', value: nonResidentStudents.length, icon: HomeIcon, color: 'text-muted-foreground', bg: 'bg-muted/50', onClick: () => openList(language === 'bn' ? 'অনাবাসিক ছাত্র' : 'Non-Resident Students', 'students', { residence_type: 'non-resident' }) },
  ];

  const studentDetailStats = [
    { label: language === 'bn' ? 'নতুন ছাত্র' : 'New Students', value: newStudents.length, icon: UserCheck, color: 'text-success', bg: 'bg-success/10', onClick: () => openList(language === 'bn' ? 'নতুন ছাত্র' : 'New Students', 'students') },
    { label: language === 'bn' ? 'পুরাতন ছাত্র' : 'Old Students', value: oldStudents.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10', onClick: () => openList(language === 'bn' ? 'পুরাতন ছাত্র' : 'Old Students', 'students') },
    { label: language === 'bn' ? 'বিভাগ' : 'Divisions', value: divisions.length, icon: Layers, color: 'text-accent', bg: 'bg-accent/10' },
    { label: language === 'bn' ? 'বিষয়' : 'Subjects', value: subjects.length, icon: BookOpen, color: 'text-info', bg: 'bg-info/10' },
    { label: language === 'bn' ? 'পরীক্ষা' : 'Exams', value: exams.length, icon: ClipboardList, color: 'text-destructive', bg: 'bg-destructive/10' },
    { label: language === 'bn' ? 'ফলাফল' : 'Results', value: results.length, icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
    { label: language === 'bn' ? 'ভর্তি ইতিহাস' : 'Admission History', value: students.length, icon: History, color: 'text-accent', bg: 'bg-accent/10', onClick: () => openList(language === 'bn' ? 'ভর্তি ইতিহাস' : 'Admission History', 'students') },
  ];

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Institution Info */}
        <DashboardInstitutionCard />

        {/* Search */}
        <DashboardSearch />

        {/* Main Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statCards.map((s, i) => (
            <div key={i} onClick={s.onClick} className="stat-card flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow">
              <div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Staff & Teacher Stats */}
        <div className="card-elevated p-4">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-accent" />
            {language === 'bn' ? 'কর্মী ও শিক্ষক পরিসংখ্যান' : 'Staff & Teacher Statistics'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {staffTeacherStats.map((s, i) => (
              <div key={i} onClick={s.onClick} className={`stat-card flex items-center gap-3 ${s.onClick ? 'cursor-pointer' : ''}`}>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground leading-tight">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Student Category Stats */}
        <div className="card-elevated p-4">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            {language === 'bn' ? 'ছাত্র ক্যাটাগরি পরিসংখ্যান' : 'Student Category Statistics'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {studentCategoryStats.map((s, i) => (
              <div key={i} onClick={s.onClick} className={`stat-card flex items-center gap-3 ${s.onClick ? 'cursor-pointer' : ''}`}>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground leading-tight">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session-wise Students */}
        {sessionYears.length > 0 && (
          <div className="card-elevated p-4">
            <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
              <History className="w-5 h-5 text-accent" />
              {language === 'bn' ? 'সেশন ভিত্তিক ছাত্র সংখ্যা' : 'Session-wise Student Count'}
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              {sessionYears.map(year => (
                <div key={year}
                  onClick={() => openList(`${language === 'bn' ? 'সেশন' : 'Session'} ${year}`, 'students')}
                  className="stat-card flex items-center gap-3 cursor-pointer">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-foreground leading-tight">{sessionWiseMap[Number(year)]}</p>
                    <p className="text-[11px] text-muted-foreground leading-tight">{year}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Detail Stats */}
        <div className="card-elevated p-4">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            {language === 'bn' ? 'ছাত্র বিস্তারিত পরিসংখ্যান' : 'Student Detailed Statistics'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {studentDetailStats.map((s, i) => (
              <div key={i} onClick={s.onClick} className={`stat-card flex items-center gap-3 ${s.onClick ? 'cursor-pointer' : ''}`}>
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-foreground leading-tight">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight truncate">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donor Stats */}
        <div className="card-elevated p-4">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-destructive" />
            {language === 'bn' ? 'দাতা তালিকা' : 'Donor List'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div onClick={() => openList(language === 'bn' ? 'মোট দাতা' : 'Total Donors', 'donors')}
              className="stat-card flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
                <Heart className="w-5 h-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-foreground leading-tight">{donors.length}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{language === 'bn' ? 'মোট দাতা' : 'Total Donors'}</p>
              </div>
            </div>
            <div onClick={() => openList(language === 'bn' ? 'সক্রিয় দাতা' : 'Active Donors', 'donors', { status: 'active' })}
              className="stat-card flex items-center gap-3 cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-foreground leading-tight">{activeDonors.length}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{language === 'bn' ? 'সক্রিয় দাতা' : 'Active Donors'}</p>
              </div>
            </div>
            <div className="stat-card flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-foreground leading-tight">৳{totalDonationAmount.toLocaleString()}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">{language === 'bn' ? 'মোট অনুদান' : 'Total Donations'}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            {language === 'bn' ? 'ফি পরিসংখ্যান' : 'Fee Statistics'}
          </h3>
          <DashboardFeeSection category="monthly" titleBn="মাসিক ফি" titleEn="Monthly Fees" />
          <DashboardFeeSection category="exam" titleBn="পরীক্ষা ফি" titleEn="Exam Fees" />
          <DashboardFeeSection category="admission" titleBn="ভর্তি ফি" titleEn="Admission Fees" />
        </div>

        {/* Custom Widgets */}
        <DashboardCustomWidgets />

        {/* Stats List Dialog */}
        <DashboardStatsList
          open={listDialog.open}
          onClose={() => setListDialog(d => ({ ...d, open: false }))}
          title={listDialog.title}
          table={listDialog.table}
          filters={listDialog.filters}
        />
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
