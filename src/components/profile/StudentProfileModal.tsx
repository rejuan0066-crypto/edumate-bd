import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  User, Hash, Calendar, Heart, Phone, Mail, MapPin, BookOpen, Banknote,
  BadgePercent, FileText, Pencil, CheckCircle, XCircle, Clock, Loader2,
  Plus, Trash2, GraduationCap, Users, Home, CreditCard, ClipboardList,
  Fingerprint, School, Building2, Library, CalendarCheck, BarChart3, Award, TrendingUp,
  Printer
} from 'lucide-react';
import ProfileInfoItem from './ProfileInfoItem';
import ProfileSectionCard from './ProfileSectionCard';
import { toast } from 'sonner';
import { cn, formatDigits } from '@/lib/utils';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { printStudentProfile } from '@/lib/studentProfilePrint';

interface StudentProfileModalProps {
  student: any;
  bn: boolean;
  getApprovalBadge: (status: string) => any;
  getSessionName: (id: string, fallback?: string) => string;
  getClassName: (id: string) => string;
  setEditStudent: (s: any) => void;
  setShowDetail: (s: any) => void;
  setShowAdd: (v: boolean) => void;
  statusMutation: any;
  canEditItem: boolean;
  canDeleteItem?: boolean;
}

const StudentProfileModal = ({
  student, bn, getApprovalBadge, getSessionName, getClassName,
  setEditStudent, setShowDetail, setShowAdd, statusMutation, canEditItem, canDeleteItem
}: StudentProfileModalProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'profile' | 'finance' | 'academic' | 'others'>('profile');
  const [showWaiverDialog, setShowWaiverDialog] = useState(false);
  const [waiverForm, setWaiverForm] = useState({ fee_type_id: '', waiver_amount: '', reason: '' });
  const [duesSessionId, setDuesSessionId] = useState<string>('');
  const { data: institution } = useInstitutionInfo();

  const handlePrintProfile = () => {
    printStudentProfile({
      student,
      bn,
      institution: institution || {},
      className: getClassName(student.class_id),
      sessionName: getSessionName(student.session_id, student.admission_session),
    });
  };

  const { data: allSessions = [] } = useQuery({
    queryKey: ['profile-academic-sessions'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('id, name, name_bn, start_date, end_date, is_active').order('start_date', { ascending: false, nullsFirst: false });
      return data || [];
    },
  });

  useEffect(() => {
    if (!duesSessionId && allSessions.length > 0) {
      const active = allSessions.find((s: any) => s.is_active) || allSessions[0];
      setDuesSessionId(active.id);
    }
  }, [allSessions, duesSessionId]);

  const { data: libraryHistory = [], isLoading: libLoading } = useQuery({
    queryKey: ['student-library-history', student.id],
    queryFn: async () => {
      const { data } = await supabase.from('library_issuances').select('*, library_books(title, title_bn)').eq('student_id', student.id).order('issued_date', { ascending: false });
      return data || [];
    },
  });

  const { data: feePayments = [], isLoading: feeLoading } = useQuery({
    queryKey: ['student-fee-payments', student.id],
    queryFn: async () => {
      const { data } = await supabase.from('fee_payments').select('*, fee_types(name, name_bn, amount)').eq('student_id', student.id).order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: feeWaivers = [], isLoading: waiverLoading } = useQuery({
    queryKey: ['student-fee-waivers', student.id],
    queryFn: async () => {
      const { data } = await supabase.from('fee_waivers').select('*, fee_types(name, name_bn, amount)').eq('student_id', student.id).eq('is_active', true);
      return data || [];
    },
  });

  const { data: applicableFeeTypes = [], isLoading: feeTypesLoading } = useQuery({
    queryKey: ['student-applicable-fee-types', student.division_id, student.class_id],
    queryFn: async () => {
      const { data } = await supabase.from('fee_types').select('*, divisions(name_bn), classes(name_bn)').eq('is_active', true).order('fee_category').order('name_bn');
      if (!data) return [];
      return data.filter((ft: any) => {
        if (ft.division_id && ft.division_id !== student.division_id) return false;
        if (ft.class_id && ft.class_id !== student.class_id) return false;
        return true;
      });
    },
  });

  const { data: studentResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['student-results', student.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('results')
        .select('*, exam_sessions(name, name_bn, exam_type), subjects(name, name_bn)')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const { data: attendanceRecords = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['student-attendance', student.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('entity_id', student.id)
        .eq('entity_type', 'student')
        .eq('shift', 'full_day')
        .order('attendance_date', { ascending: false });
      return data || [];
    },
  });

  const resultStats = useMemo(() => {
    if (studentResults.length === 0) return null;
    const examMap = new Map<string, any[]>();
    studentResults.forEach((r: any) => {
      const examId = r.exam_id;
      if (!examMap.has(examId)) examMap.set(examId, []);
      examMap.get(examId)!.push(r);
    });
    return Array.from(examMap.entries()).map(([examId, results]) => {
      const totalMarks = results.reduce((s: number, r: any) => s + (r.marks || 0), 0);
      const count = results.filter((r: any) => r.marks != null).length;
      const avgGpa = count > 0 ? results.reduce((s: number, r: any) => s + (r.gpa || 0), 0) / count : 0;
      return {
        examId,
        examName: bn ? results[0]?.exam_sessions?.name_bn : results[0]?.exam_sessions?.name,
        examType: results[0]?.exam_sessions?.exam_type,
        results,
        totalMarks,
        avgGpa: Math.round(avgGpa * 100) / 100,
        subjectCount: count,
      };
    });
  }, [studentResults, bn]);

  const attendanceStats = useMemo(() => {
    const total = attendanceRecords.length;
    const present = attendanceRecords.filter((a: any) => a.status === 'present').length;
    const absent = attendanceRecords.filter((a: any) => a.status === 'absent').length;
    const late = attendanceRecords.filter((a: any) => a.status === 'late').length;
    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;
    const last7 = attendanceRecords.slice(0, 10);
    return { total, present, absent, late, percentage, last7 };
  }, [attendanceRecords]);

  const totalPaid = feePayments.filter((p: any) => p.status === 'paid').reduce((s: number, p: any) => s + (p.paid_amount || p.amount || 0), 0);
  const totalApplicable = applicableFeeTypes.reduce((sum: number, ft: any) => {
    const waiver = feeWaivers.find((w: any) => w.fee_type_id === ft.id);
    const isFreeMonthly = student.is_free && ft.fee_category === 'monthly';
    const waiverPercent = isFreeMonthly ? 100 : (waiver ? waiver.waiver_percent : 0);
    const netAmount = ft.amount - Math.round(ft.amount * waiverPercent / 100);
    return sum + netAmount;
  }, 0);
  const totalDue = Math.max(0, totalApplicable - totalPaid);

  const addWaiverMutation = useMutation({
    mutationFn: async () => {
      if (!waiverForm.fee_type_id) throw new Error(bn ? 'ফি ধরন নির্বাচন করুন' : 'Select fee type');
      const selectedFt = applicableFeeTypes.find((ft: any) => ft.id === waiverForm.fee_type_id);
      const amount = parseFloat(waiverForm.waiver_amount) || 0;
      const percent = selectedFt && selectedFt.amount > 0 ? Math.min(100, Math.round((amount / selectedFt.amount) * 100)) : 100;
      const { error } = await supabase.from('fee_waivers').insert({
        student_id: student.id, fee_type_id: waiverForm.fee_type_id, waiver_percent: percent, reason: waiverForm.reason || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-fee-waivers', student.id] });
      setShowWaiverDialog(false);
      setWaiverForm({ fee_type_id: '', waiver_amount: '', reason: '' });
      toast.success(bn ? 'ডিসকাউন্ট যোগ হয়েছে' : 'Discount added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteWaiverMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fee_waivers').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-fee-waivers', student.id] });
      toast.success(bn ? 'ডিসকাউন্ট সরানো হয়েছে' : 'Discount removed');
    },
  });

  const availableFeeTypesForWaiver = applicableFeeTypes.filter(
    (ft: any) => !feeWaivers.some((w: any) => w.fee_type_id === ft.id)
  );

  const getLibStatusBadge = (status: string) => {
    switch (status) {
      case 'issued': return <Badge className="bg-blue-500/10 text-blue-600 rounded-full px-3 text-[10px]">{bn ? 'ইস্যু' : 'Issued'}</Badge>;
      case 'returned': return <Badge className="bg-emerald-500/10 text-emerald-600 rounded-full px-3 text-[10px]">{bn ? 'জমা ✓' : 'Returned ✓'}</Badge>;
      case 'lost': return <Badge variant="destructive" className="rounded-full px-3 text-[10px]">{bn ? 'হারিয়েছে' : 'Lost'}</Badge>;
      default: return <Badge variant="secondary" className="rounded-full px-3 text-[10px]">{status}</Badge>;
    }
  };

  const getFeeStatusBadge = (status: string) => {
    switch (status) {
      case 'paid': return <Badge className="bg-emerald-500/10 text-emerald-600 rounded-full px-3 text-[10px] shadow-[0_0_12px_rgba(16,185,129,0.15)]">{bn ? 'পরিশোধিত ✓' : 'Paid ✓'}</Badge>;
      case 'unpaid': return <Badge className="bg-destructive/10 text-destructive rounded-full px-3 text-[10px]">{bn ? 'বকেয়া' : 'Unpaid'}</Badge>;
      case 'pending': return <Badge className="bg-amber-500/10 text-amber-600 rounded-full px-3 text-[10px]">{bn ? 'অপেক্ষমাণ' : 'Pending'}</Badge>;
      default: return <Badge variant="secondary" className="rounded-full px-3 text-[10px]">{status}</Badge>;
    }
  };

  const tabs = [
    { id: 'profile' as const, label: bn ? 'প্রোফাইল' : 'Profile', icon: User },
    { id: 'finance' as const, label: bn ? 'আর্থিক' : 'Finance', icon: Banknote },
    { id: 'academic' as const, label: bn ? 'শিক্ষা ও উপস্থিতি' : 'Academic', icon: GraduationCap },
    { id: 'others' as const, label: bn ? 'অন্যান্য' : 'Others', icon: ClipboardList },
  ];

  const translateGender = (val: string) => {
    if (!val) return '-';
    const map: Record<string, [string, string]> = { male: ['পুরুষ', 'Male'], female: ['মহিলা', 'Female'], other: ['অন্যান্য', 'Other'] };
    return map[val.toLowerCase()]?.[bn ? 0 : 1] || val;
  };

  const translateReligion = (val: string) => {
    if (!val) return '-';
    const map: Record<string, [string, string]> = { islam: ['ইসলাম', 'Islam'], hinduism: ['হিন্দু', 'Hinduism'], christianity: ['খ্রিস্টান', 'Christianity'], buddhism: ['বৌদ্ধ', 'Buddhism'], other: ['অন্যান্য', 'Other'] };
    return map[val.toLowerCase()]?.[bn ? 0 : 1] || val;
  };

  const translateResidence = (val: string) => {
    if (!val) return '-';
    const map: Record<string, [string, string]> = { residential: ['আবাসিক', 'Residential'], non_residential: ['অনাবাসিক', 'Non-Residential'], day_scholar: ['ডে স্কলার', 'Day Scholar'] };
    return map[val.toLowerCase()]?.[bn ? 0 : 1] || val;
  };

  const statusColor = student.approval_status === 'approved'
    ? 'from-emerald-400 to-emerald-600 shadow-emerald-500/40'
    : student.approval_status === 'rejected'
    ? 'from-rose-400 to-rose-600 shadow-rose-500/40'
    : 'from-amber-400 to-amber-500 shadow-amber-500/40';

  const statusLabel = student.approval_status === 'approved'
    ? (bn ? 'অনুমোদিত' : 'Active')
    : student.approval_status === 'rejected'
    ? (bn ? 'প্রত্যাখ্যাত' : 'Rejected')
    : (bn ? 'অপেক্ষমাণ' : 'Pending');

  return (
    <div className="space-y-5">
      {/* ═══════════ HERO HEADER ═══════════ */}
      <div className="relative rounded-[20px] overflow-hidden">
        {/* Deep emerald gradient - high contrast */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#064e3b] to-[#065f46]" />

        <div className="relative p-6 flex items-start gap-5">
          {/* Profile Image with glow */}
          <div className="relative shrink-0">
            <div className="absolute -inset-1.5 rounded-2xl bg-white/25 blur-md" />
            {student.photo_url ? (
              <img
                src={student.photo_url}
                className="relative w-28 h-32 rounded-2xl object-cover border-[3px] border-white shadow-xl"
                alt=""
              />
            ) : (
              <div className="relative w-28 h-32 rounded-2xl bg-white/15 flex items-center justify-center text-4xl font-bold text-white border-[3px] border-white/50">
                {student.name_bn?.[0] || <User className="w-10 h-10 text-white" />}
              </div>
            )}
          </div>

          {/* Name & Quick Info - all pure white */}
          <div className="flex-1 min-w-0 space-y-2">
            <h3 className="text-xl font-bold text-white tracking-tight truncate">
              {bn ? (student.name_bn || student.name_en) : (student.name_en || student.name_bn)}
            </h3>
            {student.name_bn && student.name_en && (
              <p className="text-sm text-white/80 truncate">{bn ? student.name_en : student.name_bn}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-white/20 text-white border border-white/20">
                <Hash className="w-3 h-3 text-white" /> {formatDigits(student.registration_no || student.student_id, bn)}
              </span>
              {student.roll_number && (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-white/15 text-white border border-white/15">
                  {bn ? 'রোল: ' : 'Roll: '}{formatDigits(student.roll_number, bn)}
                </span>
              )}
              {/* Neon Status Pill */}
              <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full text-white shadow-lg bg-gradient-to-r',
                statusColor
              )}>
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                {statusLabel}
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {student.is_free && <Badge className="bg-white/20 text-white border-white/20 rounded-full text-[10px] px-2.5 font-bold">{bn ? '✓ বিনা বেতন' : '✓ Free'}</Badge>}
              {student.is_orphan && <Badge className="bg-white/15 text-white border-white/15 rounded-full text-[10px] px-2.5 font-bold">{bn ? 'এতিম' : 'Orphan'}</Badge>}
              {student.is_poor && <Badge className="bg-white/15 text-white border-white/15 rounded-full text-[10px] px-2.5 font-bold">{bn ? 'গরীব' : 'Poor'}</Badge>}
            </div>
          </div>
        </div>

        {/* Quick Stats Row - white text, clear dividers */}
        <div className="relative grid grid-cols-3 border-t border-white/20">
          <div className="px-4 py-3.5 text-center border-r border-white/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{bn ? 'উপস্থিতি' : 'Attendance'}</p>
            <p className="text-xl font-black text-white">{formatDigits(attendanceStats.percentage, bn)}%</p>
          </div>
          <div className="px-4 py-3.5 text-center border-r border-white/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/70">{bn ? 'পরিশোধিত' : 'Paid'}</p>
            <p className="text-xl font-black text-white">৳{formatDigits(totalPaid.toLocaleString(), bn)}</p>
          </div>
          <div className="px-4 py-3.5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-300">{bn ? 'বকেয়া' : 'Due'}</p>
            <p className="text-xl font-black text-red-400">৳{formatDigits(totalDue.toLocaleString(), bn)}</p>
          </div>
        </div>
      </div>

      {/* ═══════════ TABS ═══════════ */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all duration-150',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-xs border border-border'
                : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════ PROFILE TAB ═══════════ */}
      {activeTab === 'profile' && (
        <div className="space-y-4">
          <ProfileSectionCard title={bn ? 'মৌলিক তথ্য' : 'Basic Info'} icon={User}>
            <ProfileInfoItem icon={Fingerprint} label={bn ? 'রেজিস্ট্রেশন নং' : 'Reg No'} value={formatDigits(student.registration_no || student.student_id, bn)} />
            <ProfileInfoItem icon={Calendar} label={bn ? 'জন্ম তারিখ' : 'Date of Birth'} value={student.date_of_birth ? formatDigits(student.date_of_birth, bn) : undefined} />
            <ProfileInfoItem icon={User} label={bn ? 'লিঙ্গ' : 'Gender'} value={translateGender(student.gender)} />
            <ProfileInfoItem icon={Heart} label={bn ? 'ধর্ম' : 'Religion'} value={translateReligion(student.religion)} />
            <ProfileInfoItem icon={CreditCard} label={bn ? 'জন্ম নিবন্ধন' : 'Birth Reg'} value={student.birth_reg_no ? formatDigits(student.birth_reg_no, bn) : undefined} />
            <ProfileInfoItem icon={Mail} label={bn ? 'ইমেইল' : 'Email'} value={student.email} />
            <ProfileInfoItem icon={Phone} label={bn ? 'ফোন' : 'Phone'} value={student.phone ? formatDigits(student.phone, bn) : undefined} />
            <ProfileInfoItem icon={Phone} label={bn ? 'অভিভাবক ফোন' : 'Guardian Phone'} value={student.guardian_phone ? formatDigits(student.guardian_phone, bn) : undefined} />
          </ProfileSectionCard>

          <ProfileSectionCard title={bn ? 'অভিভাবক তথ্য' : 'Parents Info'} icon={Users}>
            <ProfileInfoItem icon={User} label={bn ? 'পিতা (বাংলা)' : 'Father (BN)'} value={student.father_name} />
            <ProfileInfoItem icon={User} label={bn ? 'পিতা (ইংরেজি)' : 'Father (EN)'} value={student.father_name_en} />
            <ProfileInfoItem icon={ClipboardList} label={bn ? 'পিতার পেশা' : 'Father Occupation'} value={student.father_occupation} />
            <ProfileInfoItem icon={CreditCard} label={bn ? 'পিতার NID' : 'Father NID'} value={student.father_nid ? formatDigits(student.father_nid, bn) : undefined} />
            <ProfileInfoItem icon={Phone} label={bn ? 'পিতার ফোন' : 'Father Phone'} value={student.father_phone ? formatDigits(student.father_phone, bn) : undefined} />
            <div className="col-span-full border-t border-border/15 my-1" />
            <ProfileInfoItem icon={User} label={bn ? 'মাতা (বাংলা)' : 'Mother (BN)'} value={student.mother_name} />
            <ProfileInfoItem icon={User} label={bn ? 'মাতা (ইংরেজি)' : 'Mother (EN)'} value={student.mother_name_en} />
            <ProfileInfoItem icon={ClipboardList} label={bn ? 'মাতার পেশা' : 'Mother Occupation'} value={student.mother_occupation} />
            <ProfileInfoItem icon={CreditCard} label={bn ? 'মাতার NID' : 'Mother NID'} value={student.mother_nid ? formatDigits(student.mother_nid, bn) : undefined} />
            <ProfileInfoItem icon={Phone} label={bn ? 'মাতার ফোন' : 'Mother Phone'} value={student.mother_phone ? formatDigits(student.mother_phone, bn) : undefined} />
          </ProfileSectionCard>

          <ProfileSectionCard title={bn ? 'একাডেমিক তথ্য' : 'Academic Info'} icon={GraduationCap}>
            <ProfileInfoItem icon={Building2} label={bn ? 'বিভাগ' : 'Division'} value={bn ? student.divisions?.name_bn : student.divisions?.name} />
            <ProfileInfoItem icon={School} label={bn ? 'শ্রেণী' : 'Class'} value={getClassName(student.class_id)} />
            <ProfileInfoItem icon={CalendarCheck} label={bn ? 'সেশন' : 'Session'} value={getSessionName(student.session_id, student.admission_session)} />
            <ProfileInfoItem icon={Calendar} label={bn ? 'সেশন বছর' : 'Session Year'} value={student.session_year ? formatDigits(student.session_year, bn) : undefined} />
            <ProfileInfoItem icon={Calendar} label={bn ? 'ভর্তির তারিখ' : 'Admission Date'} value={student.admission_date ? formatDigits(student.admission_date, bn) : undefined} />
            <ProfileInfoItem icon={School} label={bn ? 'পূর্বের শ্রেণী' : 'Previous Class'} value={student.previous_class} />
            <ProfileInfoItem icon={School} label={bn ? 'পূর্বের প্রতিষ্ঠান' : 'Previous Institute'} value={student.previous_institute} fullWidth />
          </ProfileSectionCard>

          <ProfileSectionCard title={bn ? 'অন্যান্য তথ্য' : 'Other Info'} icon={ClipboardList}>
            <ProfileInfoItem icon={Home} label={bn ? 'আবাসিক' : 'Residence'} value={translateResidence(student.residence_type)} />
            <ProfileInfoItem icon={Users} label={bn ? 'ক্যাটাগরি' : 'Category'} value={
              student.student_category === 'orphan' ? (bn ? 'এতিম' : 'Orphan') :
              student.student_category === 'poor' ? (bn ? 'গরীব' : 'Poor') :
              student.student_category === 'teacher_child' ? (bn ? 'শিক্ষক সন্তান' : "Teacher's Child") :
              (bn ? 'সাধারণ' : 'General')
            } />
            <ProfileInfoItem icon={MapPin} label={bn ? 'ঠিকানা' : 'Address'} value={student.address} fullWidth />
          </ProfileSectionCard>
        </div>
      )}

      {/* ═══════════ FINANCE TAB ═══════════ */}
      {activeTab === 'finance' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-emerald-500/15 via-emerald-500/8 to-teal-500/5 border border-emerald-500/15 p-4 text-center">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
              <Banknote className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/60">{bn ? 'মোট পরিশোধিত' : 'Total Paid'}</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">৳{formatDigits(totalPaid.toLocaleString(), bn)}</p>
            </div>
            <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-rose-500/15 via-rose-500/8 to-orange-500/5 border border-rose-500/15 p-4 text-center">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
              <CreditCard className="w-5 h-5 text-rose-600 mx-auto mb-1.5" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700/60">{bn ? 'মোট বকেয়া' : 'Total Due'}</p>
              <p className="text-2xl font-black text-rose-600 mt-1">৳{formatDigits(totalDue.toLocaleString(), bn)}</p>
            </div>
          </div>

          {/* Session-based Dues Matrix (Month × Fee Type) */}
          <ProfileSectionCard title={bn ? 'সেশন বকেয়া ম্যাট্রিক্স' : 'Session Dues Matrix'} icon={ClipboardList}>
            <div className="col-span-full space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{bn ? 'সেশন:' : 'Session:'}</span>
                <Select value={duesSessionId} onValueChange={setDuesSessionId}>
                  <SelectTrigger className="h-8 text-xs w-auto min-w-[160px] rounded-full"><SelectValue placeholder={bn ? 'সেশন' : 'Session'} /></SelectTrigger>
                  <SelectContent>
                    {allSessions.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{bn ? s.name_bn : s.name}{s.is_active && (bn ? ' (চলমান)' : ' (Active)')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(() => {
                const MONTHS_M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
                const MONTHS_BN_M = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্ট','অক্টো','নভে','ডিসে'];
                const session = allSessions.find((s: any) => s.id === duesSessionId);
                if (!session) return <p className="text-xs text-muted-foreground/60 text-center py-3">{bn ? 'সেশন নির্বাচন করুন' : 'Select a session'}</p>;
                // Build month timeline from session window
                const monthsTimeline: { name: string; year: number; label: string }[] = [];
                if (session.start_date && session.end_date) {
                  const start = new Date(session.start_date);
                  const end = new Date(session.end_date);
                  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
                  while (cur <= end) {
                    monthsTimeline.push({ name: MONTHS_M[cur.getMonth()], year: cur.getFullYear(), label: bn ? `${MONTHS_BN_M[cur.getMonth()]} ${cur.getFullYear()}` : `${MONTHS_M[cur.getMonth()].slice(0,3)} ${cur.getFullYear()}` });
                    cur.setMonth(cur.getMonth() + 1);
                  }
                }
                // Monthly fee types applicable to student in this session
                const monthlyFeeTypes = (applicableFeeTypes as any[]).filter((ft: any) => ft.payment_frequency === 'monthly' && (!ft.session_id || ft.session_id === duesSessionId));
                if (monthsTimeline.length === 0 || monthlyFeeTypes.length === 0) {
                  return <p className="text-xs text-muted-foreground/60 text-center py-3">{bn ? 'এই সেশনে কোনো মাসিক ফি নেই' : 'No monthly fees for this session'}</p>;
                }
                const studentWaivers = (feeWaivers as any[]);
                const paidLookup = new Set((feePayments as any[]).filter((p: any) => p.status === 'paid').map((p: any) => `${p.month}|${p.year}|${p.fee_type_id}`));
                let grandDue = 0;
                let grandPaid = 0;
                return (
                  <div className="overflow-x-auto rounded-xl border border-border/20">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/30">
                        <tr>
                          <th className="text-left px-2.5 py-2 font-bold sticky left-0 bg-muted/30">{bn ? 'মাস' : 'Month'}</th>
                          {monthlyFeeTypes.map((ft: any) => (
                            <th key={ft.id} className="text-right px-2.5 py-2 font-bold whitespace-nowrap">{bn ? ft.name_bn : ft.name}</th>
                          ))}
                          <th className="text-right px-2.5 py-2 font-bold">{bn ? 'মোট' : 'Total'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthsTimeline.map(m => {
                          let rowTotal = 0;
                          const cells = monthlyFeeTypes.map((ft: any) => {
                            const months = Array.isArray(ft.applicable_months) ? ft.applicable_months : [];
                            const applicable = months.length === 0 || months.includes(m.name);
                            if (!applicable) return { ft, kind: 'na' as const };
                            const isFreeMonthly = student.is_free && ft.fee_category === 'monthly';
                            const waiver = studentWaivers.find((w: any) => w.fee_type_id === ft.id);
                            const waiverPct = isFreeMonthly ? 100 : (waiver?.waiver_percent || 0);
                            const net = ft.amount * (1 - waiverPct / 100);
                            const paid = paidLookup.has(`${m.name}|${m.year}|${ft.id}`);
                            if (paid) { grandPaid += net; return { ft, kind: 'paid' as const, amount: net }; }
                            if (waiverPct >= 100) return { ft, kind: 'waived' as const };
                            rowTotal += net;
                            grandDue += net;
                            return { ft, kind: 'due' as const, amount: net };
                          });
                          return (
                            <tr key={`${m.name}-${m.year}`} className="border-t border-border/10 hover:bg-muted/20">
                              <td className="px-2.5 py-2 font-semibold sticky left-0 bg-card">{m.label}</td>
                              {cells.map((c, idx) => (
                                <td key={idx} className="text-right px-2.5 py-2">
                                  {c.kind === 'na' && <span className="text-muted-foreground/30">—</span>}
                                  {c.kind === 'paid' && <span className="text-emerald-600 font-semibold">✓ ৳{c.amount}</span>}
                                  {c.kind === 'waived' && <span className="text-amber-600 text-[10px] font-semibold">{bn ? 'মওকুফ' : 'Waived'}</span>}
                                  {c.kind === 'due' && <span className="text-rose-600 font-bold">৳{c.amount}</span>}
                                </td>
                              ))}
                              <td className="text-right px-2.5 py-2 font-bold text-rose-700">{rowTotal > 0 ? `৳${rowTotal}` : '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted/40 border-t border-border/30">
                        <tr>
                          <td className="px-2.5 py-2 font-black sticky left-0 bg-muted/40">{bn ? 'সারাংশ' : 'Summary'}</td>
                          <td colSpan={monthlyFeeTypes.length} className="px-2.5 py-2 text-right">
                            <span className="text-emerald-600 font-bold mr-3">{bn ? 'পরিশোধিত' : 'Paid'}: ৳{grandPaid.toLocaleString()}</span>
                          </td>
                          <td className="text-right px-2.5 py-2 font-black text-rose-700">৳{grandDue.toLocaleString()}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}
            </div>
          </ProfileSectionCard>

          <ProfileSectionCard title={bn ? 'প্রযোজ্য ফি ধরন' : 'Applicable Fee Types'} icon={FileText}>
            <div className="col-span-full">
              {feeTypesLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>
              ) : applicableFeeTypes.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 text-center py-4">{bn ? 'কোনো প্রযোজ্য ফি ধরন নেই' : 'No applicable fee types'}</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {applicableFeeTypes.map((ft: any) => {
                    const waiver = feeWaivers.find((w: any) => w.fee_type_id === ft.id);
                    const isFreeMonthly = student.is_free && ft.fee_category === 'monthly';
                    const waiverPercent = isFreeMonthly ? 100 : (waiver ? waiver.waiver_percent : 0);
                    const discountAmount = Math.round(ft.amount * waiverPercent / 100);
                    const netAmount = ft.amount - discountAmount;
                    const paidPayments = feePayments.filter((p: any) => p.fee_type_id === ft.id && p.status === 'paid');
                    const pendingPayment = feePayments.find((p: any) => p.fee_type_id === ft.id && p.status === 'pending');
                    const totalPaidForThis = paidPayments.reduce((s: number, p: any) => s + (p.paid_amount || p.amount || 0), 0);
                    const remaining = Math.max(0, netAmount - totalPaidForThis);
                    const isFullyPaid = remaining === 0 && totalPaidForThis >= netAmount;
                    const isPartialPaid = totalPaidForThis > 0 && remaining > 0;
                    const categoryLabel = ft.fee_category === 'monthly' ? (bn ? 'মাসিক' : 'Monthly') : ft.fee_category === 'admission' ? (bn ? 'ভর্তি' : 'Admission') : ft.fee_category === 'exam' ? (bn ? 'পরীক্ষা' : 'Exam') : ft.fee_category;

                    return (
                      <div key={ft.id} className="p-3 rounded-xl bg-muted/20 border border-border/15 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{bn ? ft.name_bn : ft.name}</p>
                            <p className="text-[10px] text-muted-foreground/60">{categoryLabel}{ft.classes?.name_bn && ` • ${ft.classes.name_bn}`}</p>
                          </div>
                          <div className="text-right ml-2 shrink-0">
                            {waiverPercent > 0 ? (
                              <div>
                                <p className="text-[10px] line-through text-muted-foreground/40">৳{ft.amount}</p>
                                <p className="font-black text-emerald-600 text-sm">৳{netAmount}</p>
                              </div>
                            ) : (
                              <p className="font-black text-foreground text-sm">৳{ft.amount}</p>
                            )}
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {isFullyPaid ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] px-2.5 shadow-[0_0_8px_rgba(16,185,129,0.12)]">{bn ? '✓ সম্পূর্ণ পরিশোধিত' : '✓ Fully Paid'}</Badge>
                          ) : isPartialPaid ? (
                            <>
                              <Badge className="bg-amber-500/10 text-amber-600 rounded-full text-[9px] px-2.5">{bn ? `আংশিক ৳${totalPaidForThis}` : `Partial ৳${totalPaidForThis}`}</Badge>
                              <Badge className="bg-destructive/10 text-destructive rounded-full text-[9px] px-2.5">{bn ? `বকেয়া ৳${remaining}` : `Due ৳${remaining}`}</Badge>
                            </>
                          ) : pendingPayment ? (
                            <Badge className="bg-amber-500/10 text-amber-600 rounded-full text-[9px] px-2.5">{bn ? '⏳ পেন্ডিং' : '⏳ Pending'}</Badge>
                          ) : (
                            <Badge className="bg-destructive/10 text-destructive rounded-full text-[9px] px-2.5">{bn ? `বকেয়া ৳${netAmount}` : `Due ৳${netAmount}`}</Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ProfileSectionCard>

          {/* Payment History */}
          <ProfileSectionCard title={bn ? 'ফি পরিশোধের ইতিহাস' : 'Payment History'} icon={Banknote}>
            <div className="col-span-full">
              {feeLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>
              ) : feePayments.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 text-center py-4">{bn ? 'কোনো ফি পেমেন্ট রেকর্ড নেই' : 'No payment records'}</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                  {feePayments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/15 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{bn ? (p.fee_types?.name_bn || p.fee_types?.name) : p.fee_types?.name || '-'}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          ৳{(p.paid_amount || p.amount || 0).toLocaleString()}
                          {p.receipt_number && <> • {bn ? 'রসিদ: ' : '#'}{p.receipt_number}</>}
                        </p>
                      </div>
                      <div className="ml-2 shrink-0">{getFeeStatusBadge(p.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ProfileSectionCard>

          {/* Discounts */}
          <ProfileSectionCard title={bn ? 'ফি ছাড় / ডিসকাউন্ট' : 'Discounts'} icon={BadgePercent}>
            <div className="col-span-full">
              {canEditItem && (
                <div className="flex justify-end mb-3">
                  <Button size="sm" variant="outline" className="h-8 text-xs rounded-full border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10" onClick={() => setShowWaiverDialog(true)} disabled={availableFeeTypesForWaiver.length === 0}>
                    <Plus className="w-3 h-3 mr-1" /> {bn ? 'ছাড় দিন' : 'Add Discount'}
                  </Button>
                </div>
              )}
              {waiverLoading ? (
                <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>
              ) : feeWaivers.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 text-center py-3">{bn ? 'কোনো ছাড় নেই' : 'No waivers'}</p>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1 scrollbar-thin">
                  {feeWaivers.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{bn ? (w.fee_types?.name_bn || w.fee_types?.name) : w.fee_types?.name || '-'}</p>
                        {w.reason && <p className="text-[10px] text-muted-foreground/60 truncate">{w.reason}</p>}
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <Badge className="bg-amber-500/10 text-amber-600 rounded-full text-[9px] px-2.5">৳{Math.round((w.fee_types?.amount || 0) * w.waiver_percent / 100)}</Badge>
                        {canDeleteItem && (
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive rounded-full hover:bg-destructive/10" onClick={() => deleteWaiverMutation.mutate(w.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ProfileSectionCard>
        </div>
      )}

      {/* ═══════════ ACADEMIC TAB ═══════════ */}
      {activeTab === 'academic' && (
        <div className="space-y-4">
          {/* Attendance Circular Gauge + Stats */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500/15 to-teal-500/10">
                <CalendarCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h4 className="text-sm font-bold text-foreground">{bn ? 'উপস্থিতি পরিসংখ্যান' : 'Attendance Statistics'}</h4>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Large circular gauge */}
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 112 112">
                  <circle cx="56" cy="56" r="48" fill="none" stroke="hsl(var(--muted) / 0.2)" strokeWidth="8" />
                  <circle cx="56" cy="56" r="48" fill="none" stroke="url(#gaugeGrad)" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(attendanceStats.percentage / 100) * 301.6} 301.6`}
                    className="transition-all duration-700"
                  />
                  <defs>
                    <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#14b8a6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-emerald-600">{attendanceStats.percentage}%</span>
                  <span className="text-[9px] font-semibold uppercase text-muted-foreground/60">{bn ? 'উপস্থিতি' : 'Rate'}</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="flex-1 grid grid-cols-3 gap-3 w-full">
                <div className="text-center p-3 rounded-xl bg-blue-500/8 border border-blue-500/10">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-blue-600/60">{bn ? 'কার্যদিবস' : 'Total'}</p>
                  <p className="text-xl font-black text-blue-600">{attendanceStats.total}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/10">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-600/60">{bn ? 'উপস্থিত' : 'Present'}</p>
                  <p className="text-xl font-black text-emerald-600">{attendanceStats.present}</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-rose-500/8 border border-rose-500/10">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-rose-600/60">{bn ? 'অনুপস্থিত' : 'Absent'}</p>
                  <p className="text-xl font-black text-rose-600">{attendanceStats.absent}</p>
                </div>
              </div>
            </div>

            {/* Calendar Dots - Last 10 days */}
            {attendanceStats.last7.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border/15">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mb-3">{bn ? 'সাম্প্রতিক (শেষ ১০ দিন)' : 'Recent (Last 10 Days)'}</p>
                <div className="flex items-center gap-2 flex-wrap">
                  {attendanceStats.last7.map((a: any, i: number) => (
                    <div key={i} className="flex flex-col items-center gap-1" title={`${a.attendance_date} - ${a.status}`}>
                      <div className={cn(
                        'w-4 h-4 rounded-full shadow-sm transition-transform hover:scale-125',
                        a.status === 'present' ? 'bg-emerald-500 shadow-emerald-500/30' :
                        a.status === 'late' ? 'bg-amber-500 shadow-amber-500/30' :
                        'bg-rose-500 shadow-rose-500/30'
                      )} />
                      <span className="text-[8px] text-muted-foreground/50 font-medium">{a.attendance_date?.slice(-2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Academic Results */}
          {resultsLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>
          ) : !resultStats || resultStats.length === 0 ? (
            <ProfileSectionCard title={bn ? 'পরীক্ষার ফলাফল' : 'Exam Results'} icon={BookOpen}>
              <div className="col-span-full">
                <p className="text-xs text-muted-foreground/50 text-center py-6">{bn ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No results found'}</p>
              </div>
            </ProfileSectionCard>
          ) : (
            resultStats.map((exam: any) => (
              <div key={exam.examId} className="space-y-3">
                {/* Exam Summary */}
                <div className="rounded-[18px] bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/12 p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/15 to-teal-500/10">
                        <Award className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-foreground">{exam.examName || 'Exam'}</h5>
                        <p className="text-[9px] text-muted-foreground/60 uppercase tracking-wider">{exam.subjectCount} {bn ? 'বিষয়' : 'subjects'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="text-center px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/12">
                        <p className="text-[8px] font-bold uppercase text-emerald-700/60">{bn ? 'মোট' : 'Total'}</p>
                        <p className="text-lg font-black text-emerald-600">{exam.totalMarks}</p>
                      </div>
                      <div className="text-center px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/12">
                        <p className="text-[8px] font-bold uppercase text-teal-700/60">GPA</p>
                        <p className="text-lg font-black text-teal-600">{exam.avgGpa}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subject-wise with progress bars */}
                <ProfileSectionCard title={bn ? 'বিষয়ভিত্তিক ফলাফল' : 'Subject-wise Results'} icon={BarChart3}>
                  <div className="col-span-full space-y-2.5 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                    {exam.results.filter((r: any) => r.marks != null).map((r: any) => {
                      const maxMarks = 100;
                      const pct = Math.min(100, Math.round((r.marks / maxMarks) * 100));
                      const barColor = pct >= 80 ? 'from-emerald-500 to-teal-400' : pct >= 60 ? 'from-blue-500 to-cyan-400' : pct >= 40 ? 'from-amber-500 to-orange-400' : 'from-rose-500 to-red-400';
                      return (
                        <div key={r.id} className="p-3 rounded-xl bg-muted/20 border border-border/15 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="text-sm font-bold truncate">{bn ? r.subjects?.name_bn : r.subjects?.name || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm font-black text-foreground">{r.marks}</span>
                              {r.grade && <Badge className="bg-emerald-500/10 text-emerald-600 rounded-full text-[9px] px-2">{r.grade}</Badge>}
                              {r.gpa != null && <span className="text-[9px] text-muted-foreground/60 font-semibold">GPA {r.gpa}</span>}
                            </div>
                          </div>
                          <div className="w-full h-2 rounded-full bg-muted/40 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-700', barColor)}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ProfileSectionCard>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══════════ OTHERS TAB ═══════════ */}
      {activeTab === 'others' && (
        <div className="space-y-4">
          <ProfileSectionCard title={bn ? 'লাইব্রেরি বই ইতিহাস' : 'Library Book History'} icon={Library}>
            <div className="col-span-full">
              {libLoading ? (
                <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-emerald-600" /></div>
              ) : libraryHistory.length === 0 ? (
                <p className="text-xs text-muted-foreground/50 text-center py-4">{bn ? 'কোনো বই ইস্যু/জমার রেকর্ড নেই' : 'No library records'}</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                  {libraryHistory.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/15 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{bn ? (item.library_books?.title_bn || item.library_books?.title) : item.library_books?.title}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {bn ? 'ইস্যু: ' : 'Issued: '}{item.issued_date}
                          {item.returned_date && <> • {bn ? 'জমা: ' : 'Returned: '}{item.returned_date}</>}
                        </p>
                      </div>
                      <div className="ml-2 shrink-0">{getLibStatusBadge(item.status)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ProfileSectionCard>
        </div>
      )}

      {/* ═══════════ WAIVER DIALOG ═══════════ */}
      <Dialog open={showWaiverDialog} onOpenChange={setShowWaiverDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{bn ? 'ফি ছাড় / ডিসকাউন্ট দিন' : 'Add Fee Discount'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">{bn ? 'ফি ধরন' : 'Fee Type'} *</label>
              <Select value={waiverForm.fee_type_id} onValueChange={v => setWaiverForm(p => ({ ...p, fee_type_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} /></SelectTrigger>
                <SelectContent>
                  {availableFeeTypesForWaiver.map((ft: any) => (
                    <SelectItem key={ft.id} value={ft.id}>{bn ? ft.name_bn : ft.name} (৳{ft.amount})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">{bn ? 'ছাড়ের পরিমাণ (৳)' : 'Discount Amount (৳)'} *</label>
              <Input type="number" min="1" value={waiverForm.waiver_amount || ''} onChange={e => setWaiverForm(p => ({ ...p, waiver_amount: e.target.value }))} className="mt-1" placeholder={bn ? 'টাকার পরিমাণ' : 'Amount in Taka'} />
              {waiverForm.fee_type_id && waiverForm.waiver_amount && (() => {
                const ft = applicableFeeTypes.find((f: any) => f.id === waiverForm.fee_type_id);
                if (!ft) return null;
                const pct = Math.min(100, Math.round((parseFloat(waiverForm.waiver_amount) / ft.amount) * 100));
                return <p className="text-xs text-muted-foreground mt-1">{bn ? `ফি ৳${ft.amount} এর ${pct}%` : `${pct}% of ৳${ft.amount}`}</p>;
              })()}
            </div>
            <div>
              <label className="text-sm font-medium">{bn ? 'কারণ' : 'Reason'}</label>
              <Textarea value={waiverForm.reason} onChange={e => setWaiverForm(p => ({ ...p, reason: e.target.value }))} className="mt-1" rows={2} placeholder={bn ? 'ঐচ্ছিক...' : 'Optional...'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWaiverDialog(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button onClick={() => addWaiverMutation.mutate()} disabled={addWaiverMutation.isPending || !waiverForm.fee_type_id} className="btn-primary-gradient">
              {addWaiverMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
              {bn ? 'সেভ' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ BOTTOM ACTIONS (Ghost Buttons) ═══════════ */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-border/20">
        <Button
          variant="outline"
          onClick={handlePrintProfile}
          className="flex-1 min-w-[140px] rounded-full h-11 border-blue-500/20 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all duration-300"
        >
          <Printer className="w-4 h-4 mr-2" /> {bn ? 'প্রোফাইল প্রিন্ট' : 'Print Profile'}
        </Button>
        {canEditItem && (
          <Button
            variant="outline"
            onClick={() => { setEditStudent(student); setShowDetail(null); setShowAdd(true); }}
            className="flex-1 min-w-[140px] rounded-full h-11 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300"
          >
            <Pencil className="w-4 h-4 mr-2" /> {bn ? 'সম্পাদনা' : 'Edit'}
          </Button>
        )}
        {student.approval_status !== 'approved' && (
          <Button
            variant="outline"
            onClick={() => { statusMutation.mutate({ id: student.id, status: 'approved' }); setShowDetail(null); }}
            className="flex-1 rounded-full h-11 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-300"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> {bn ? 'অনুমোদন' : 'Approve'}
          </Button>
        )}
        {student.approval_status !== 'rejected' && (
          <Button
            variant="outline"
            onClick={() => { statusMutation.mutate({ id: student.id, status: 'rejected' }); setShowDetail(null); }}
            className="flex-1 rounded-full h-11 border-rose-500/20 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all duration-300"
          >
            <XCircle className="w-4 h-4 mr-2" /> {bn ? 'প্রত্যাখ্যান' : 'Reject'}
          </Button>
        )}
        {student.approval_status === 'rejected' && (
          <Button
            variant="outline"
            onClick={() => { statusMutation.mutate({ id: student.id, status: 'pending' }); setShowDetail(null); }}
            className="flex-1 rounded-full h-11 border-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all duration-300"
          >
            <Clock className="w-4 h-4 mr-2" /> {bn ? 'অপেক্ষমাণে ফেরত' : 'Back to Pending'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default StudentProfileModal;
