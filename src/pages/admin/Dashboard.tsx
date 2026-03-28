import { useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
  Users, UserCog, BookOpen, UserCheck, UserX, GraduationCap,
  Layers, FileText, CreditCard, ClipboardList, History, Home, HomeIcon
} from 'lucide-react';
import DashboardInstitutionCard from '@/components/dashboard/DashboardInstitutionCard';
import DashboardSearch from '@/components/dashboard/DashboardSearch';
import DashboardFeeSection from '@/components/dashboard/DashboardFeeSection';
import DashboardStatsList from '@/components/dashboard/DashboardStatsList';

const Dashboard = () => {
  const { language } = useLanguage();
  const [listDialog, setListDialog] = useState<{ open: boolean; title: string; table: 'students' | 'staff'; filters: Record<string, any> }>({
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

  const openList = (title: string, table: 'students' | 'staff', filters: Record<string, any> = {}) => {
    setListDialog({ open: true, title, table, filters });
  };

  const statCards = [
    { label: language === 'bn' ? 'মোট ছাত্র' : 'Total Students', value: students.length, icon: Users, color: 'text-primary', bg: 'bg-primary/10', onClick: () => openList(language === 'bn' ? 'মোট ছাত্র' : 'Total Students', 'students') },
    { label: language === 'bn' ? 'সক্রিয় ছাত্র' : 'Active Students', value: activeStudents.length, icon: UserCheck, color: 'text-success', bg: 'bg-success/10', onClick: () => openList(language === 'bn' ? 'সক্রিয় ছাত্র' : 'Active Students', 'students', { status: 'active' }) },
    { label: language === 'bn' ? 'নিষ্ক্রিয় ছাত্র' : 'Inactive Students', value: inactiveStudents.length, icon: UserX, color: 'text-destructive', bg: 'bg-destructive/10', onClick: () => openList(language === 'bn' ? 'নিষ্ক্রিয় ছাত্র' : 'Inactive Students', 'students', { status: 'inactive' }) },
    { label: language === 'bn' ? 'মোট কর্মী' : 'Total Staff', value: nonTeachingStaff.length, icon: UserCog, color: 'text-accent', bg: 'bg-accent/10', onClick: () => openList(language === 'bn' ? 'মোট কর্মী' : 'Total Staff', 'staff') },
  ];

  const staffTeacherStats = [
    { label: language === 'bn' ? 'শিক্ষক (সক্রিয়)' : 'Teachers (Active)', value: activeTeachers.length, onClick: () => openList(language === 'bn' ? 'সক্রিয় শিক্ষক' : 'Active Teachers', 'staff', { status: 'active' }) },
    { label: language === 'bn' ? 'শিক্ষক (পদত্যাগী)' : 'Teachers (Resigned)', value: resignedTeachers.length, onClick: () => openList(language === 'bn' ? 'পদত্যাগী শিক্ষক' : 'Resigned Teachers', 'staff') },
    { label: language === 'bn' ? 'কর্মী (সক্রিয়)' : 'Staff (Active)', value: activeStaff.length, onClick: () => openList(language === 'bn' ? 'সক্রিয় কর্মী' : 'Active Staff', 'staff', { status: 'active' }) },
    { label: language === 'bn' ? 'কর্মী (পদত্যাগী)' : 'Staff (Resigned)', value: resignedStaff.length, onClick: () => openList(language === 'bn' ? 'পদত্যাগী কর্মী' : 'Resigned Staff', 'staff') },
    { label: language === 'bn' ? 'গত মাসের বেতন' : 'Last Month Salary', value: `৳ ${staff.filter(s => s.status === 'active').reduce((s, x) => s + (Number(x.salary) || 0), 0).toLocaleString()}`, onClick: () => openList(language === 'bn' ? 'সক্রিয় কর্মী ও শিক্ষক' : 'Active Staff & Teachers', 'staff', { status: 'active' }) },
  ];

  const studentCategoryStats = [
    { label: language === 'bn' ? 'এতিম ছাত্র' : 'Orphan Students', value: orphanStudents.length, onClick: () => openList(language === 'bn' ? 'এতিম ছাত্র' : 'Orphan Students', 'students', { student_category: 'orphan' }) },
    { label: language === 'bn' ? 'গরীব ছাত্র' : 'Poor Students', value: poorStudents.length, onClick: () => openList(language === 'bn' ? 'গরীব ছাত্র' : 'Poor Students', 'students', { student_category: 'poor' }) },
    { label: language === 'bn' ? 'সাধারণ ছাত্র ও পরিশোধিত' : 'Non-Orphan&Poor + Amounts', value: `${generalStudents.length} (৳${generalPaidAmount.toLocaleString()})` },
    { label: language === 'bn' ? 'আবাসিক ছাত্র' : 'Resident Students', value: residentStudents.length, onClick: () => openList(language === 'bn' ? 'আবাসিক ছাত্র' : 'Resident Students', 'students', { residence_type: 'resident' }) },
    { label: language === 'bn' ? 'অনাবাসিক ছাত্র' : 'Non-Resident Students', value: nonResidentStudents.length, onClick: () => openList(language === 'bn' ? 'অনাবাসিক ছাত্র' : 'Non-Resident Students', 'students', { residence_type: 'non-resident' }) },
  ];

  const studentDetailStats = [
    { label: language === 'bn' ? 'নতুন ছাত্র' : 'New Students', value: newStudents.length, onClick: () => openList(language === 'bn' ? 'নতুন ছাত্র' : 'New Students', 'students') },
    { label: language === 'bn' ? 'পুরাতন ছাত্র' : 'Old Students', value: oldStudents.length, onClick: () => openList(language === 'bn' ? 'পুরাতন ছাত্র' : 'Old Students', 'students') },
    { label: language === 'bn' ? 'বিভাগ' : 'Divisions', value: divisions.length },
    { label: language === 'bn' ? 'বিষয়' : 'Subjects', value: subjects.length },
    { label: language === 'bn' ? 'পরীক্ষা' : 'Exams', value: exams.length },
    { label: language === 'bn' ? 'ফলাফল' : 'Results', value: results.length },
    { label: language === 'bn' ? 'ভর্তি ইতিহাস' : 'Admission History', value: students.length, onClick: () => openList(language === 'bn' ? 'ভর্তি ইতিহাস' : 'Admission History', 'students') },
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {staffTeacherStats.map((s, i) => (
              <div key={i} onClick={s.onClick}
                className={`p-3 rounded-lg bg-secondary/50 text-center hover:bg-secondary transition-colors ${s.onClick ? 'cursor-pointer' : ''}`}>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Student Category Stats (Orphan, Poor, Resident etc.) */}
        <div className="card-elevated p-4">
          <h3 className="font-display font-bold text-foreground mb-3 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-primary" />
            {language === 'bn' ? 'ছাত্র ক্যাটাগরি পরিসংখ্যান' : 'Student Category Statistics'}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {studentCategoryStats.map((s, i) => (
              <div key={i} onClick={s.onClick}
                className={`p-3 rounded-lg bg-secondary/50 text-center hover:bg-secondary transition-colors ${s.onClick ? 'cursor-pointer' : ''}`}>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
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
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {sessionYears.map(year => (
                <div key={year}
                  onClick={() => openList(`${language === 'bn' ? 'সেশন' : 'Session'} ${year}`, 'students')}
                  className="p-3 rounded-lg bg-secondary/50 text-center hover:bg-secondary transition-colors cursor-pointer">
                  <p className="text-lg font-bold text-foreground">{sessionWiseMap[Number(year)]}</p>
                  <p className="text-xs text-muted-foreground">{year}</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {studentDetailStats.map((s, i) => (
              <div key={i} onClick={s.onClick}
                className={`p-3 rounded-lg bg-secondary/50 text-center hover:bg-secondary transition-colors ${s.onClick ? 'cursor-pointer' : ''}`}>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fee Sections */}
        <div className="space-y-3">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            {language === 'bn' ? 'ফি পরিসংখ্যান' : 'Fee Statistics'}
          </h3>
          <DashboardFeeSection category="monthly" titleBn="মাসিক ফি" titleEn="Monthly Fees" />
          <DashboardFeeSection category="exam" titleBn="পরীক্ষা ফি" titleEn="Exam Fees" />
          <DashboardFeeSection category="admission" titleBn="ভর্তি ফি" titleEn="Admission Fees" />
        </div>

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
