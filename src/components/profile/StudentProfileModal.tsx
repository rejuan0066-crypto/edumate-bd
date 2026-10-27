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
  Printer, Eye, AlertCircle, CheckCircle2, ArrowRight, CheckSquare, Square, Tag, ExternalLink, Percent,
  RotateCcw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { Checkbox } from '@/components/ui/checkbox';
import ProfileInfoItem from './ProfileInfoItem';
import ProfileSectionCard from './ProfileSectionCard';
import DocumentPreviewModal from '@/components/DocumentPreviewModal';
import { toast } from 'sonner';
import { cn, formatDigits } from '@/lib/utils';
import { cleanRoleSuffix } from '@/lib/paymentUtils';
import CollectorSelector from '@/components/fees/CollectorSelector';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { printStudentProfile } from '@/lib/studentProfilePrint';
import { formatAddress } from '@/lib/banglaAddressHelper';
import { formatPhoneNumber } from '@/lib/phoneUtils';

interface StudentProfileModalProps {
  student: any;
  bn: boolean;
  getApprovalBadge?: (status: string) => any;
  getSessionName?: (id: string, fallback?: string) => string;
  getClassName?: (id: string) => string;
  setEditStudent?: (s: any) => void;
  setShowDetail?: (s: any) => void;
  setShowAdd?: (v: boolean) => void;
  statusMutation?: any;
  canEditItem?: boolean;
  canDeleteItem?: boolean;
}

const StudentProfileModal = ({
  student,
  bn,
  getApprovalBadge,
  getSessionName,
  getClassName,
  setEditStudent,
  setShowDetail,
  setShowAdd,
  statusMutation,
  canEditItem = true,
  canDeleteItem = true,
}: StudentProfileModalProps) => {
  const queryClient = useQueryClient();

  const resolveClassName = getClassName || ((cId: string) => student?.classes?.name_bn || student?.classes?.name || cId || '-');
  const resolveSessionName = getSessionName || ((sId: string, fallback?: string) => student?.academic_sessions?.name_bn || student?.academic_sessions?.name || fallback || sId || '-');
  const resolveApprovalBadge = getApprovalBadge || ((st: string) => (
    <Badge className={st === 'approved' ? 'bg-emerald-600 text-white' : st === 'rejected' ? 'bg-rose-600 text-white' : 'bg-amber-600 text-white'}>
      {st === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') : st === 'rejected' ? (bn ? 'প্রত্যাখ্যাত' : 'Rejected') : (bn ? 'অপেক্ষমাণ' : 'Pending')}
    </Badge>
  ));
  const [activeTab, setActiveTab] = useState<'profile' | 'finance' | 'academic' | 'others'>('profile');
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name?: string } | null>(null);

  const studentDocs = useMemo(() => {
    const adm = student.admission_data || {};
    const results: Array<{ id: string; name: string; url: string }> = [];

    if (adm.custom_fields && typeof adm.custom_fields === 'object') {
      Object.entries(adm.custom_fields).forEach(([k, v]) => {
        const strVal = String(v || '');
        if (typeof v === 'string' && (strVal.startsWith('http://') || strVal.startsWith('https://') || strVal.startsWith('photos/') || strVal.startsWith('receipts/') || /\.(pdf|png|jpe?g|webp)($|[?#])/i.test(strVal))) {
          results.push({
            id: k,
            name: k.replace(/_/g, ' '),
            url: strVal,
          });
        }
      });
    }

    if (Array.isArray(adm.documents)) {
      adm.documents.forEach((d: any, idx: number) => {
        if (d && (d.url || d.file_url)) {
          results.push({
            id: d.id || `doc-${idx}`,
            name: d.name || d.type || `Document ${idx + 1}`,
            url: d.url || d.file_url,
          });
        }
      });
    }

    return results;
  }, [student.admission_data]);
  const [showWaiverDialog, setShowWaiverDialog] = useState(false);
  const [waiverForm, setWaiverForm] = useState({ fee_type_id: '', waiver_amount: '', reason: '' });
  const [duesSessionId, setDuesSessionId] = useState<string>('');
  const { data: institution } = useInstitutionInfo();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { checkApproval } = useApprovalCheck('/admin/students-fees', 'fee_payments');

  // Payment states for quick fee payment
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payingItems, setPayingItems] = useState<any[]>([]);
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [payRemarks, setPayRemarks] = useState<string>('');
  const [customCollector, setCustomCollector] = useState<string>('');
  const [isPaying, setIsPaying] = useState(false);

  // Multi-select state for dues
  const [selectedDueIds, setSelectedDueIds] = useState<string[]>([]);

  // Bulk / Item Discount Dialog state
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [discountType, setDiscountType] = useState<'full' | 'amount' | 'percent'>('full');
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountReason, setDiscountReason] = useState<string>('');
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });
  const collectorName = currentProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'Admin';

  const handlePrintProfile = () => {
    printStudentProfile({
      student,
      bn,
      institution: institution || {},
      className: resolveClassName(student.class_id),
      sessionName: resolveSessionName(student.session_id, student.admission_session),
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
      const { data } = await supabase
        .from('fee_payments')
        .select('*, fee_types(name, name_bn, amount)')
        .eq('student_id', student.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      return (data || []).filter((p: any) => p.status !== 'unpaid');
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

  // Dynamic financial calculation across the selected session window (months * monthly fees + one-time fees)
  const sessionFinancials = useMemo(() => {
    const session = allSessions.find((s: any) => s.id === duesSessionId);
    const MONTHS_M = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const MONTHS_BN_M = ['জানু','ফেব্রু','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্ট','অক্টো','নভে','ডিসে'];
    
    // 1. Months timeline for the selected session window
    const monthsTimeline: { name: string; year: number; label: string }[] = [];
    if (session?.start_date && session?.end_date) {
      const start = new Date(session.start_date);
      const end = new Date(session.end_date);
      const cur = new Date(start.getFullYear(), start.getMonth(), 1);
      while (cur <= end) {
        monthsTimeline.push({
          name: MONTHS_M[cur.getMonth()],
          year: cur.getFullYear(),
          label: bn ? `${MONTHS_BN_M[cur.getMonth()]} ${cur.getFullYear()}` : `${MONTHS_M[cur.getMonth()].slice(0,3)} ${cur.getFullYear()}`
        });
        cur.setMonth(cur.getMonth() + 1);
      }
    }

    // 2. Monthly Fee Types applicable to student for this session
    const monthlyFeeTypes = (applicableFeeTypes as any[]).filter(
      (ft: any) => ft.payment_frequency === 'monthly' && (!ft.session_id || ft.session_id === duesSessionId)
    );

    const studentWaivers = (feeWaivers as any[]);
    const paidRecords = (feePayments as any[]).filter((p: any) => p.status === 'paid' || p.status === 'waived');
    const paidLookup = new Map<string, any>(
      paidRecords.map((p: any) => [`${p.month}|${p.year}|${p.fee_type_id}`, p])
    );

    let monthlyDue = 0;
    let monthlyPaid = 0;
    const dueList: Array<{
      id: string;
      fee_type_id: string;
      name: string;
      name_bn: string;
      category: string;
      categoryLabel: string;
      month?: string;
      monthLabel?: string;
      year: number;
      originalAmount: number;
      dueAmount: number;
      waiverPercent: number;
      isMonthly: boolean;
    }> = [];

    monthsTimeline.forEach(m => {
      monthlyFeeTypes.forEach((ft: any) => {
        const months = Array.isArray(ft.applicable_months) ? ft.applicable_months : [];
        const applicable = months.length === 0 || months.includes(m.name);
        if (!applicable) return;

        const isFreeMonthly = student.is_free && ft.fee_category === 'monthly';
        const waiver = studentWaivers.find((w: any) => w.fee_type_id === ft.id);
        const waiverPct = isFreeMonthly ? 100 : (waiver?.waiver_percent || 0);
        const net = Math.round(ft.amount * (1 - waiverPct / 100));

        const paymentRec = paidLookup.get(`${m.name}|${m.year}|${ft.id}`);
        const isWaivedRecord = paymentRec && (paymentRec.status === 'waived' || paymentRec.paid_amount === 0);
        const isPaid = !!paymentRec && !isWaivedRecord;

        if (isWaivedRecord) {
          // Waived, no dues added
        } else if (isPaid) {
          monthlyPaid += (paymentRec.paid_amount ?? net);
        } else if (waiverPct < 100 && net > 0) {
          monthlyDue += net;
          dueList.push({
            id: `monthly-${ft.id}-${m.name}-${m.year}`,
            fee_type_id: ft.id,
            name: ft.name,
            name_bn: ft.name_bn,
            category: ft.fee_category,
            categoryLabel: ft.fee_category === 'monthly' ? (bn ? 'মাসিক ফি' : 'Monthly Fee') : ft.fee_category,
            month: m.name,
            monthLabel: m.label,
            year: m.year,
            originalAmount: ft.amount,
            dueAmount: net,
            waiverPercent: waiverPct,
            isMonthly: true,
          });
        }
      });
    });

    // 3. One-Time / Term / Annual Fee Types for this session
    const oneTimeFeeTypes = (applicableFeeTypes as any[]).filter(
      (ft: any) => ft.payment_frequency !== 'monthly' && (!ft.session_id || ft.session_id === duesSessionId)
    );

    let oneTimeDue = 0;
    let oneTimePaid = 0;

    oneTimeFeeTypes.forEach((ft: any) => {
      const waiver = studentWaivers.find((w: any) => w.fee_type_id === ft.id);
      const waiverPercent = waiver ? waiver.waiver_percent : 0;
      const netAmount = ft.amount - Math.round(ft.amount * waiverPercent / 100);

      const paidPayments = (feePayments as any[]).filter((p: any) => p.fee_type_id === ft.id && p.status === 'paid');
      const totalPaidForThis = paidPayments.reduce((s: number, p: any) => s + (p.paid_amount || p.amount || 0), 0);

      oneTimePaid += totalPaidForThis;
      const remaining = Math.max(0, netAmount - totalPaidForThis);
      if (waiverPercent < 100 && remaining > 0) {
        oneTimeDue += remaining;
        const categoryLabel = ft.fee_category === 'admission' ? (bn ? 'ভর্তি ফি' : 'Admission Fee') : ft.fee_category === 'exam' ? (bn ? 'পরীক্ষা ফি' : 'Exam Fee') : (bn ? 'অন্যান্য ফি' : 'Other Fee');
        dueList.push({
          id: `onetime-${ft.id}`,
          fee_type_id: ft.id,
          name: ft.name,
          name_bn: ft.name_bn,
          category: ft.fee_category,
          categoryLabel,
          year: session?.start_date ? new Date(session.start_date).getFullYear() : new Date().getFullYear(),
          originalAmount: ft.amount,
          dueAmount: remaining,
          waiverPercent: waiverPercent,
          isMonthly: false,
        });
      }
    });

    const totalDue = monthlyDue + oneTimeDue;
    const totalPaid = monthlyPaid + oneTimePaid;

    return {
      session,
      monthsTimeline,
      monthlyFeeTypes,
      oneTimeFeeTypes,
      monthlyDue,
      monthlyPaid,
      oneTimeDue,
      oneTimePaid,
      totalDue,
      totalPaid,
      dueList,
      paidLookup,
      studentWaivers,
    };
  }, [allSessions, duesSessionId, applicableFeeTypes, feeWaivers, feePayments, student.is_free, bn]);

  const totalPaid = sessionFinancials.totalPaid;
  const totalDue = sessionFinancials.totalDue;

  // Multi-select helpers for dues
  const handleToggleSelectDue = (id: string) => {
    setSelectedDueIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllDues = (checked: boolean) => {
    if (checked) {
      setSelectedDueIds(sessionFinancials.dueList.map(d => d.id));
    } else {
      setSelectedDueIds([]);
    }
  };

  const selectedDueItems = useMemo(() => {
    return sessionFinancials.dueList.filter(d => selectedDueIds.includes(d.id));
  }, [sessionFinancials.dueList, selectedDueIds]);

  const selectedDueTotal = useMemo(() => {
    return selectedDueItems.reduce((sum, d) => sum + d.dueAmount, 0);
  }, [selectedDueItems]);

  // Handlers for quick payment
  const handleOpenPaySingle = (item: any) => {
    setPayingItems([item]);
    setPayAmount(String(item.dueAmount));
    setPayMethod('cash');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRemarks('');
    if (!customCollector) setCustomCollector(collectorName);
    setPayDialogOpen(true);
  };

  const handleOpenPaySelected = () => {
    if (selectedDueItems.length === 0) return;
    setPayingItems(selectedDueItems);
    setPayAmount(String(selectedDueTotal));
    setPayMethod('cash');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRemarks('');
    if (!customCollector) setCustomCollector(collectorName);
    setPayDialogOpen(true);
  };

  const handleOpenPayAll = () => {
    if (sessionFinancials.dueList.length === 0) return;
    setPayingItems(sessionFinancials.dueList);
    setPayAmount(String(sessionFinancials.totalDue));
    setPayMethod('cash');
    setPayDate(new Date().toISOString().split('T')[0]);
    setPayRemarks('');
    if (!customCollector) setCustomCollector(collectorName);
    setPayDialogOpen(true);
  };

  const handleOpenDiscountForSelected = () => {
    if (selectedDueItems.length === 0) {
      toast.warning(bn ? 'প্রথমে অন্তত একটি ফি নির্বাচন করুন' : 'Select at least one fee first');
      return;
    }
    setDiscountType('full');
    setDiscountValue('');
    setDiscountReason('');
    setDiscountDialogOpen(true);
  };

  const handleOpenDiscountSingle = (item: any) => {
    setSelectedDueIds([item.id]);
    setDiscountType('full');
    setDiscountValue('');
    setDiscountReason('');
    setDiscountDialogOpen(true);
  };

  const handleNavigateToPaymentPage = (feeTypeId?: string) => {
    setShowDetail?.(null);
    let url = `/admin/students-fees?tab=collection&studentId=${student.id}`;
    if (feeTypeId) {
      url += `&feeType=${feeTypeId}`;
    }
    navigate(url);
  };

  const handleOpenPayFromFeeType = (ft: any, remaining: number) => {
    const isMonthly = ft.payment_frequency === 'monthly';
    if (isMonthly) {
      const pendingMonth = sessionFinancials.dueList.find((d: any) => d.fee_type_id === ft.id);
      if (pendingMonth) {
        handleOpenPaySingle(pendingMonth);
      } else {
        handleOpenPayAll();
      }
    } else {
      const waiver = sessionFinancials.studentWaivers.find((w: any) => w.fee_type_id === ft.id);
      const categoryLabel = ft.fee_category === 'admission' ? (bn ? 'ভর্তি ফি' : 'Admission Fee') : ft.fee_category === 'exam' ? (bn ? 'পরীক্ষা ফি' : 'Exam Fee') : (bn ? 'অন্যান্য ফি' : 'Other Fee');
      handleOpenPaySingle({
        id: `onetime-${ft.id}`,
        fee_type_id: ft.id,
        name: ft.name,
        name_bn: ft.name_bn,
        category: ft.fee_category,
        categoryLabel,
        year: sessionFinancials.session?.start_date ? new Date(sessionFinancials.session.start_date).getFullYear() : new Date().getFullYear(),
        originalAmount: ft.amount,
        dueAmount: remaining,
        waiverPercent: waiver?.waiver_percent || 0,
        isMonthly: false,
      });
    }
  };

  const executeApplyDiscount = async () => {
    if (selectedDueItems.length === 0) return;
    setIsApplyingDiscount(true);
    try {
      if (discountType === 'full') {
        const monthlyItems = selectedDueItems.filter(itm => itm.isMonthly);
        if (monthlyItems.length > 0) {
          const records = monthlyItems.map(itm => ({
            student_id: student.id,
            fee_type_id: itm.fee_type_id,
            amount: itm.originalAmount,
            paid_amount: 0,
            month: itm.month,
            year: itm.year,
            status: 'waived',
            paid_at: new Date().toISOString(),
            receipt_number: `WAIVE-${Date.now().toString().slice(-6)}`,
            collected_by: collectorName,
            approved_by: collectorName,
          }));
          const { error } = await supabase.from('fee_payments').insert(records);
          if (error) throw error;
        }

        const oneTimeItems = selectedDueItems.filter(itm => !itm.isMonthly);
        for (const itm of oneTimeItems) {
          const existingWaiver = sessionFinancials.studentWaivers.find((w: any) => w.fee_type_id === itm.fee_type_id);
          if (existingWaiver) {
            await supabase.from('fee_waivers').update({
              waiver_percent: 100,
              reason: discountReason || 'সম্পূর্ণ মওকুফ',
              is_active: true,
            }).eq('id', existingWaiver.id);
          } else {
            await supabase.from('fee_waivers').insert({
              student_id: student.id,
              fee_type_id: itm.fee_type_id,
              waiver_percent: 100,
              reason: discountReason || 'সম্পূর্ণ মওকুফ',
              is_active: true,
            });
          }
        }
      } else if (discountType === 'percent') {
        const pct = Math.min(100, Math.max(1, parseInt(discountValue) || 0));
        if (pct <= 0) {
          toast.error(bn ? 'সঠিক শতকরা হার লিখুন' : 'Enter valid percentage');
          return;
        }
        const uniqueFeeTypeIds = Array.from(new Set(selectedDueItems.map(itm => itm.fee_type_id)));
        for (const ftId of uniqueFeeTypeIds) {
          const existingWaiver = sessionFinancials.studentWaivers.find((w: any) => w.fee_type_id === ftId);
          if (existingWaiver) {
            await supabase.from('fee_waivers').update({
              waiver_percent: pct,
              reason: discountReason || `${pct}% ছাড়`,
              is_active: true,
            }).eq('id', existingWaiver.id);
          } else {
            await supabase.from('fee_waivers').insert({
              student_id: student.id,
              fee_type_id: ftId,
              waiver_percent: pct,
              reason: discountReason || `${pct}% ছাড়`,
              is_active: true,
            });
          }
        }
      } else if (discountType === 'amount') {
        const amt = parseFloat(discountValue) || 0;
        if (amt <= 0) {
          toast.error(bn ? 'সঠিক টাকার পরিমাণ লিখুন' : 'Enter valid amount');
          return;
        }
        const uniqueFeeTypeIds = Array.from(new Set(selectedDueItems.map(itm => itm.fee_type_id)));
        for (const ftId of uniqueFeeTypeIds) {
          const itemsOfThisType = selectedDueItems.filter(itm => itm.fee_type_id === ftId);
          const totalOriginal = itemsOfThisType.reduce((s, itm) => s + itm.originalAmount, 0);
          const pct = totalOriginal > 0 ? Math.min(100, Math.round((amt / totalOriginal) * 100)) : 100;
          const existingWaiver = sessionFinancials.studentWaivers.find((w: any) => w.fee_type_id === ftId);
          if (existingWaiver) {
            await supabase.from('fee_waivers').update({
              waiver_percent: pct,
              reason: discountReason || `৳${amt} ছাড়`,
              is_active: true,
            }).eq('id', existingWaiver.id);
          } else {
            await supabase.from('fee_waivers').insert({
              student_id: student.id,
              fee_type_id: ftId,
              waiver_percent: pct,
              reason: discountReason || `৳${amt} ছাড়`,
              is_active: true,
            });
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['student-fee-payments', student.id] });
      queryClient.invalidateQueries({ queryKey: ['student-fee-waivers', student.id] });
      queryClient.invalidateQueries({ queryKey: ['student-applicable-fee-types'] });
      queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
      queryClient.invalidateQueries({ queryKey: ['student_fee_payments_status'] });
      queryClient.invalidateQueries({ queryKey: ['dues-fee-payments'] });

      toast.success(bn ? 'ফি ছাড় / মওকুফ সফলভাবে কার্যকর হয়েছে' : 'Discount / waiver applied successfully');
      setSelectedDueIds([]);
      setDiscountDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || (bn ? 'ছাড় কার্যকর করা সম্ভব হয়নি' : 'Failed to apply discount'));
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  const executePayment = async () => {
    if (payingItems.length === 0) return;
    const enteredAmount = parseFloat(payAmount);
    if (isNaN(enteredAmount) || enteredAmount <= 0) {
      toast.error(bn ? 'সঠিক পরিশোধের পরিমাণ লিখুন' : 'Enter a valid payment amount');
      return;
    }

    setIsPaying(true);
    try {
      let serialNumber: string | null = null;
      try {
        const { data: sNum } = await supabase.rpc('get_next_receipt_serial');
        if (sNum) serialNumber = sNum;
      } catch (e) {
        console.warn('Receipt serial generation fallback:', e);
      }
      if (!serialNumber) {
        serialNumber = `REC-${Date.now().toString().slice(-6)}`;
      }

      const isoPaidAt = payDate ? new Date(payDate).toISOString() : new Date().toISOString();
      const finalCollector = cleanRoleSuffix(customCollector || collectorName);

      // Check role & approval workflow for fee payment
      const description = payingItems.length === 1
        ? `${bn ? 'ফি পরিশোধ' : 'Fee Payment'}: ৳${enteredAmount} - ${student.name_bn || student.name_en} (${payingItems[0].name_bn || payingItems[0].name})`
        : `${bn ? 'বকেয়া ফি পরিশোধ' : 'Bulk Fee Payment'}: ৳${enteredAmount} - ${student.name_bn || student.name_en} (${payingItems.length} টি ফি)`;

      const approvalPayload = {
        student_id: student.id,
        amount: enteredAmount,
        paying_items: payingItems,
        payment_method: payMethod,
        date: isoPaidAt,
        receipt_number: serialNumber,
        collected_by: finalCollector,
        notes: payRemarks || `সরাসরি পরিশোধ (${payMethod})`,
      };

      if (await checkApproval('add', approvalPayload, undefined, description)) {
        setPayDialogOpen(false);
        setIsPaying(false);
        return;
      }

      if (payingItems.length === 1) {
        const item = payingItems[0];
        const record = {
          student_id: student.id,
          fee_type_id: item.fee_type_id,
          amount: item.originalAmount,
          paid_amount: enteredAmount,
          month: item.isMonthly ? item.month : null,
          year: item.year || new Date().getFullYear(),
          status: 'paid',
          paid_at: isoPaidAt,
          receipt_number: serialNumber,
          collected_by: finalCollector,
          approved_by: finalCollector,
        };
        const { error: feeErr } = await supabase.from('fee_payments').insert(record);
        if (feeErr) throw feeErr;

        try {
          await supabase.from('payments').insert({
            student_id: student.id,
            fee_type_id: item.fee_type_id,
            amount: enteredAmount,
            payment_method: payMethod,
            month: item.isMonthly ? item.month : null,
            year: item.year || new Date().getFullYear(),
            status: 'completed',
            receipt_number: serialNumber,
            collected_by: finalCollector,
            notes: payRemarks || `সরাসরি পরিশোধ (${payMethod})`,
          } as any);
        } catch (e) {
          console.warn('Optional payments table insert:', e);
        }
      } else {
        const totalTarget = payingItems.reduce((s: number, itm: any) => s + itm.dueAmount, 0);
        const ratio = totalTarget > 0 ? enteredAmount / totalTarget : 1;

        const records = payingItems.map((itm: any) => ({
          student_id: student.id,
          fee_type_id: itm.fee_type_id,
          amount: itm.originalAmount,
          paid_amount: Math.round(itm.dueAmount * ratio),
          month: itm.isMonthly ? itm.month : null,
          year: itm.year || new Date().getFullYear(),
          status: 'paid',
          paid_at: isoPaidAt,
          receipt_number: serialNumber,
          collected_by: finalCollector,
          approved_by: finalCollector,
        }));

        const { error: feeErr } = await supabase.from('fee_payments').insert(records);
        if (feeErr) throw feeErr;

        try {
          await supabase.from('payments').insert({
            student_id: student.id,
            fee_type_id: payingItems[0].fee_type_id,
            amount: enteredAmount,
            payment_method: payMethod,
            year: new Date().getFullYear(),
            status: 'completed',
            receipt_number: serialNumber,
            collected_by: finalCollector,
            notes: payRemarks || `একসাথে সকল বকেয়া পরিশোধ (${payingItems.length} টি আইটেম, ${payMethod})`,
          } as any);
        } catch (e) {
          console.warn('Optional payments table insert:', e);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['student-fee-payments', student.id] });
      queryClient.invalidateQueries({ queryKey: ['student-applicable-fee-types'] });
      queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
      queryClient.invalidateQueries({ queryKey: ['student_fee_payments_status'] });
      queryClient.invalidateQueries({ queryKey: ['dues-fee-payments'] });

      toast.success(
        bn
          ? `৳${formatDigits(enteredAmount.toLocaleString(), true)} ফি সফলভাবে পরিশোধ হয়েছে (রসিদ নং: ${serialNumber})`
          : `৳${enteredAmount.toLocaleString()} fee paid successfully (Receipt: ${serialNumber})`
      );
      setSelectedDueIds([]);
      setPayDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || (bn ? 'পরিশোধ সম্পন্ন করা সম্ভব হয়নি' : 'Failed to complete payment'));
    } finally {
      setIsPaying(false);
    }
  };

  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error, data } = await supabase.from('fee_payments').delete().eq('id', paymentId).select();
      if (error || !data || data.length === 0) {
        const { error: updErr } = await supabase.from('fee_payments').update({
          status: 'unpaid',
          paid_amount: 0,
          paid_at: null,
          deleted_at: new Date().toISOString(),
        }).eq('id', paymentId);
        if (updErr) throw updErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-fee-payments', student.id] });
      queryClient.invalidateQueries({ queryKey: ['student-applicable-fee-types'] });
      queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
      queryClient.invalidateQueries({ queryKey: ['student_fee_payments_status'] });
      queryClient.invalidateQueries({ queryKey: ['dues-fee-payments'] });
      toast.success(bn ? 'পেমেন্ট আনপেইড করা হয়েছে ও পুনরায় বকেয়া হিসেবে ফেরত এসেছে' : 'Payment marked as unpaid and restored to dues');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteAllPaymentsMutation = useMutation({
    mutationFn: async () => {
      const { error, data } = await supabase.from('fee_payments').delete().eq('student_id', student.id).select();
      if (error || !data || data.length === 0) {
        const { error: updErr } = await supabase.from('fee_payments').update({
          status: 'unpaid',
          paid_amount: 0,
          paid_at: null,
          deleted_at: new Date().toISOString(),
        }).eq('student_id', student.id);
        if (updErr) throw updErr;
      }
      try {
        await supabase.from('payments').delete().eq('student_id', student.id);
      } catch (e) {
        console.warn('Optional payments table cleanup:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student-fee-payments', student.id] });
      queryClient.invalidateQueries({ queryKey: ['student-applicable-fee-types'] });
      queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
      queryClient.invalidateQueries({ queryKey: ['student_fee_payments_status'] });
      queryClient.invalidateQueries({ queryKey: ['dues-fee-payments'] });
      toast.success(bn ? 'সকল পেমেন্ট আনপেইড করা হয়েছে ও বকেয়ায় ফিরে এসেছে' : 'All payments marked as unpaid and restored to dues');
    },
    onError: (e: any) => toast.error(e.message),
  });

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
            <ProfileInfoItem icon={Phone} label={bn ? 'ফোন' : 'Phone'} value={formatPhoneNumber(student.phone, undefined, bn)} />
            <ProfileInfoItem icon={Phone} label={bn ? 'অভিভাবক ফোন' : 'Guardian Phone'} value={formatPhoneNumber(student.guardian_phone, undefined, bn)} />
          </ProfileSectionCard>

          <ProfileSectionCard title={bn ? 'অভিভাবক তথ্য' : 'Parents Info'} icon={Users}>
            <ProfileInfoItem icon={User} label={bn ? 'পিতা (বাংলা)' : 'Father (BN)'} value={student.father_name} />
            <ProfileInfoItem icon={User} label={bn ? 'পিতা (ইংরেজি)' : 'Father (EN)'} value={student.father_name_en} />
            <ProfileInfoItem icon={ClipboardList} label={bn ? 'পিতার পেশা' : 'Father Occupation'} value={student.father_occupation} />
            <ProfileInfoItem icon={CreditCard} label={bn ? 'পিতার NID' : 'Father NID'} value={student.father_nid ? formatDigits(student.father_nid, bn) : undefined} />
            <ProfileInfoItem icon={Phone} label={bn ? 'পিতার ফোন' : 'Father Phone'} value={formatPhoneNumber(student.father_phone, undefined, bn)} />
            <div className="col-span-full border-t border-border/15 my-1" />
            <ProfileInfoItem icon={User} label={bn ? 'মাতা (বাংলা)' : 'Mother (BN)'} value={student.mother_name} />
            <ProfileInfoItem icon={User} label={bn ? 'মাতা (ইংরেজি)' : 'Mother (EN)'} value={student.mother_name_en} />
            <ProfileInfoItem icon={ClipboardList} label={bn ? 'মাতার পেশা' : 'Mother Occupation'} value={student.mother_occupation} />
            <ProfileInfoItem icon={CreditCard} label={bn ? 'মাতার NID' : 'Mother NID'} value={student.mother_nid ? formatDigits(student.mother_nid, bn) : undefined} />
            <ProfileInfoItem icon={Phone} label={bn ? 'মাতার ফোন' : 'Mother Phone'} value={formatPhoneNumber(student.mother_phone, undefined, bn)} />
          </ProfileSectionCard>

          <ProfileSectionCard title={bn ? 'একাডেমিক তথ্য' : 'Academic Info'} icon={GraduationCap}>
            <ProfileInfoItem icon={Building2} label={bn ? 'বিভাগ' : 'Division'} value={bn ? student.divisions?.name_bn : student.divisions?.name} />
            <ProfileInfoItem icon={School} label={bn ? 'শ্রেণী' : 'Class'} value={resolveClassName(student.class_id)} />
            <ProfileInfoItem icon={CalendarCheck} label={bn ? 'সেশন' : 'Session'} value={resolveSessionName(student.session_id, student.admission_session)} />
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
            <ProfileInfoItem icon={MapPin} label={bn ? 'ঠিকানা' : 'Address'} value={formatAddress(student.address, bn)} fullWidth />
          </ProfileSectionCard>
        </div>
      )}

      {/* ═══════════ FINANCE TAB ═══════════ */}
      {activeTab === 'finance' && (
        <div className="space-y-4">
          {/* Session Switcher Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{bn ? 'সেশন নির্বাচন:' : 'Select Session:'}</span>
              <Select value={duesSessionId} onValueChange={setDuesSessionId}>
                <SelectTrigger className="h-8 text-xs w-auto min-w-[170px] rounded-full border-primary/30">
                  <SelectValue placeholder={bn ? 'সেশন বাছুন' : 'Select Session'} />
                </SelectTrigger>
                <SelectContent>
                  {allSessions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {bn ? s.name_bn : s.name}{s.is_active && (bn ? ' (চলমান)' : ' (Active)')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {sessionFinancials.monthsTimeline.length > 0 && (
              <Badge variant="outline" className="text-[11px] font-medium border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">
                {bn ? `${sessionFinancials.monthsTimeline.length} টি মাস` : `${sessionFinancials.monthsTimeline.length} Months`}
              </Badge>
            )}
          </div>

          {/* Dynamic Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-emerald-500/15 via-emerald-500/8 to-teal-500/5 border border-emerald-500/15 p-4 text-center">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
              <Banknote className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-700/60">{bn ? 'মোট পরিশোধিত' : 'Total Paid'}</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">৳{formatDigits(sessionFinancials.totalPaid.toLocaleString(), bn)}</p>
              {sessionFinancials.totalPaid > 0 && (
                <p className="text-[10px] text-emerald-700/80 mt-1">
                  {bn ? `মাসিক: ৳${sessionFinancials.monthlyPaid} • অন্যান্য: ৳${sessionFinancials.oneTimePaid}` : `Monthly: ৳${sessionFinancials.monthlyPaid} • Other: ৳${sessionFinancials.oneTimePaid}`}
                </p>
              )}
              {canDeleteItem && sessionFinancials.totalPaid > 0 && (
                <div className="pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm(bn ? 'আপনি কি এই শিক্ষার্থীর সকল পরিশোধিত ফি অপরিশোধিত (Unpaid) করতে চান? সমস্ত ফি পুনরায় বকেয়া তালিকায় ফিরে যাবে।' : 'Reset all paid fees for this student to unpaid?')) {
                        deleteAllPaymentsMutation.mutate();
                      }
                    }}
                    disabled={deleteAllPaymentsMutation.isPending}
                    className="h-6 text-[10px] text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-full font-bold px-2.5 shadow-xs"
                  >
                    {deleteAllPaymentsMutation.isPending ? (
                      <Loader2 className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <RotateCcw className="w-3 h-3 mr-1" />
                    )}
                    {bn ? 'সকল পরিশোধ আনপেইড করুন' : 'Unpay All'}
                  </Button>
                </div>
              )}
            </div>
            <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-rose-500/15 via-rose-500/8 to-orange-500/5 border border-rose-500/15 p-4 text-center">
              <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-xl" />
              <CreditCard className="w-5 h-5 text-rose-600 mx-auto mb-1.5" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700/60">{bn ? 'মোট বকেয়া' : 'Total Due'}</p>
              <p className="text-2xl font-black text-rose-600 mt-1">৳{formatDigits(sessionFinancials.totalDue.toLocaleString(), bn)}</p>
              {sessionFinancials.oneTimeDue > 0 && (
                <p className="text-[10px] text-rose-700/80 dark:text-rose-400/80 mt-1 font-medium">
                  {bn ? `মাসিক: ৳${sessionFinancials.monthlyDue} • এককালীন/অন্যান্য: ৳${sessionFinancials.oneTimeDue}` : `Monthly: ৳${sessionFinancials.monthlyDue} • Other: ৳${sessionFinancials.oneTimeDue}`}
                </p>
              )}
            </div>
          </div>

          {/* ═══ 1. বকেয়া ফি তালিকা ও সরাসরি পরিশোধ (Unified Dues & Quick Pay) ═══ */}
          <ProfileSectionCard
            title={bn ? 'বকেয়া ফি তালিকা ও সরাসরি পরিশোধ' : 'Outstanding Dues & Direct Payment'}
            icon={AlertCircle}
          >
            <div className="col-span-full space-y-3">
              {/* Banner: Total Due, Site Page Link & Pay All */}
              <div className={cn(
                "rounded-2xl p-4 border flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all",
                sessionFinancials.totalDue > 0
                  ? "bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-rose-500/5 border-rose-500/20"
                  : "bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border-emerald-500/20"
              )}>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-xs",
                    sessionFinancials.totalDue > 0 ? "bg-rose-500/15 text-rose-600" : "bg-emerald-500/15 text-emerald-600"
                  )}>
                    {sessionFinancials.totalDue > 0 ? <AlertCircle className="w-6 h-6 animate-pulse" /> : <CheckCircle2 className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      {bn ? 'মোট অপরিশোধিত বকেয়া' : 'Total Outstanding Dues'}
                    </p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className={cn(
                        "text-2xl sm:text-3xl font-black tracking-tight",
                        sessionFinancials.totalDue > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        ৳{formatDigits(sessionFinancials.totalDue.toLocaleString(), bn)}
                      </span>
                      {sessionFinancials.dueList.length > 0 && (
                        <Badge variant="outline" className="text-[10px] border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-300 font-semibold">
                          {bn ? `${sessionFinancials.dueList.length} টি ফি বকেয়া` : `${sessionFinancials.dueList.length} dues pending`}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    onClick={() => handleNavigateToPaymentPage()}
                    className="h-10 px-3 rounded-xl border-primary/30 text-primary hover:bg-primary/10 font-bold text-xs shadow-xs flex items-center gap-1.5"
                    title={bn ? 'সাইটের মূল ফি কালেকশন পেজে গিয়ে পরিশোধ করুন' : 'Open in official fees collection page'}
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{bn ? 'সাইটের পেমেন্ট পেজে যান' : 'Go to Payment Page'}</span>
                  </Button>

                  {sessionFinancials.dueList.length > 0 ? (
                    <Button
                      onClick={handleOpenPayAll}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-4 rounded-xl shadow-md flex items-center justify-center gap-1.5 shrink-0 transition-transform active:scale-95 text-xs"
                    >
                      <CreditCard className="w-4 h-4" />
                      <span>{bn ? `সকল বকেয়া একসাথে পরিশোধ (৳${formatDigits(sessionFinancials.totalDue.toLocaleString(), bn)})` : `Pay All Dues (৳${sessionFinancials.totalDue.toLocaleString()})`}</span>
                    </Button>
                  ) : (
                    <Badge className="bg-emerald-600 text-white px-3 py-1.5 text-xs self-start sm:self-center font-bold">
                      {bn ? '✓ সমস্ত ফি পরিশোধিত' : '✓ All Fees Paid'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Multi-select and Bulk Action Toolbar */}
              {sessionFinancials.dueList.length > 0 && (
                <div className="flex items-center justify-between flex-wrap gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border/30">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="select-all-dues-cb"
                      checked={selectedDueIds.length === sessionFinancials.dueList.length && sessionFinancials.dueList.length > 0}
                      onCheckedChange={(checked) => handleSelectAllDues(!!checked)}
                    />
                    <label htmlFor="select-all-dues-cb" className="text-xs font-bold cursor-pointer select-none">
                      {bn ? 'সবগুলো নির্বাচন করুন' : 'Select All'}
                    </label>
                    {selectedDueIds.length > 0 && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">
                        {bn ? `${selectedDueIds.length} টি ফি নির্বাচিত • মোট ৳${formatDigits(selectedDueTotal.toLocaleString(), bn)}` : `${selectedDueIds.length} selected • ৳${selectedDueTotal.toLocaleString()}`}
                      </Badge>
                    )}
                  </div>

                  {selectedDueIds.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleOpenDiscountForSelected}
                        className="h-7 text-xs rounded-lg border-amber-500/40 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-bold"
                      >
                        <Tag className="w-3.5 h-3.5 mr-1" />
                        {bn ? 'নির্বাচিত ফি-তে ছাড় দিন' : 'Discount Selected'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleOpenPaySelected}
                        className="h-7 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                      >
                        <Banknote className="w-3.5 h-3.5 mr-1" />
                        {bn ? `নির্বাচিত ফি পরিশোধ (৳${formatDigits(selectedDueTotal.toLocaleString(), bn)})` : `Pay Selected (৳${selectedDueTotal.toLocaleString()})`}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Itemized dues list */}
              {sessionFinancials.dueList.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-emerald-500/30 rounded-2xl bg-emerald-500/5">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5 opacity-80" />
                  <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                    {bn ? 'আলহামদুলিল্লাহ! এই সেশনে শিক্ষার্থীর কোনো বকেয়া ফি নেই।' : 'No outstanding fees found for this session.'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {bn ? 'পূর্বের সমস্ত প্রযোজ্য ফি যথাযথভাবে পরিশোধ করা হয়েছে।' : 'All applicable fee obligations have been met.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                  {sessionFinancials.dueList.map((item: any) => {
                    const isSelected = selectedDueIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-xl border transition-all shadow-2xs",
                          isSelected
                            ? "bg-primary/5 border-primary/40 ring-1 ring-primary/20"
                            : "bg-muted/20 border-rose-500/15 hover:border-rose-500/30 hover:bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelectDue(item.id)}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground truncate">{bn ? item.name_bn : item.name}</span>
                              <Badge variant="outline" className="text-[10px] px-2 py-0 border-primary/20 text-primary">
                                {item.categoryLabel}
                              </Badge>
                              {item.monthLabel && (
                                <Badge className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-none text-[10px] px-2 py-0 font-medium">
                                  {item.monthLabel}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                              {item.waiverPercent > 0 ? (
                                <span>
                                  {bn ? 'মূল ফি:' : 'Base:'} <span className="line-through">৳{item.originalAmount}</span> • {bn ? 'ছাড়:' : 'Discount:'} {item.waiverPercent}%
                                </span>
                              ) : (
                                <span>{bn ? `মূল ফি: ৳${item.originalAmount}` : `Fee: ৳${item.originalAmount}`}</span>
                              )}
                              {item.isMonthly && <span>• {bn ? 'মাসিক বরাদ্দ' : 'Monthly'}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right mr-1">
                            <p className="text-[10px] uppercase font-bold text-rose-600/70">{bn ? 'বকেয়া' : 'Due'}</p>
                            <p className="text-base font-black text-rose-600 dark:text-rose-400">
                              ৳{formatDigits(item.dueAmount.toLocaleString(), bn)}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenDiscountSingle(item)}
                            className="h-8 text-xs rounded-lg border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 font-bold px-2.5"
                            title={bn ? 'এই ফি-তে ছাড় দিন' : 'Discount this fee'}
                          >
                            <Tag className="w-3.5 h-3.5 mr-1" />
                            {bn ? 'ছাড়' : 'Discount'}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleOpenPaySingle(item)}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs flex items-center gap-1 font-bold active:scale-95 transition-transform px-3"
                          >
                            <Banknote className="w-3.5 h-3.5" />
                            <span>{bn ? 'পরিশোধ' : 'Pay'}</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                    const isMonthly = ft.payment_frequency === 'monthly';
                    const monthsCount = isMonthly ? (sessionFinancials.monthsTimeline.length || 1) : 1;
                    const baseTotal = ft.amount * monthsCount;

                    const waiver = feeWaivers.find((w: any) => w.fee_type_id === ft.id);
                    const isFreeMonthly = student.is_free && ft.fee_category === 'monthly';
                    const waiverPercent = isFreeMonthly ? 100 : (waiver ? waiver.waiver_percent : 0);
                    const discountAmount = Math.round(baseTotal * waiverPercent / 100);
                    const netAmount = baseTotal - discountAmount;

                    // Compute paid payments for this fee type
                    let totalPaidForThis = 0;
                    if (isMonthly) {
                      // Sum payments for this fee type in the selected session months
                      (feePayments as any[]).filter((p: any) => p.fee_type_id === ft.id && p.status === 'paid').forEach((p: any) => {
                        const inTimeline = sessionFinancials.monthsTimeline.some(m => m.name === p.month && m.year === p.year);
                        if (inTimeline || !p.month) {
                          totalPaidForThis += Number(p.paid_amount || p.amount || 0);
                        }
                      });
                    } else {
                      totalPaidForThis = (feePayments as any[])
                        .filter((p: any) => p.fee_type_id === ft.id && p.status === 'paid')
                        .reduce((s: number, p: any) => s + (p.paid_amount || p.amount || 0), 0);
                    }

                    const pendingPayment = feePayments.find((p: any) => p.fee_type_id === ft.id && p.status === 'pending');
                    const remaining = Math.max(0, netAmount - totalPaidForThis);
                    const isFullyPaid = remaining === 0 && totalPaidForThis >= netAmount && netAmount > 0;
                    const isPartialPaid = totalPaidForThis > 0 && remaining > 0;
                    const categoryLabel = ft.fee_category === 'monthly' ? (bn ? 'মাসিক ফি' : 'Monthly Fee') : ft.fee_category === 'admission' ? (bn ? 'ভর্তি ফি' : 'Admission Fee') : ft.fee_category === 'exam' ? (bn ? 'পরীক্ষা ফি' : 'Exam Fee') : ft.fee_category;

                    return (
                      <div key={ft.id} className="p-3 rounded-xl bg-muted/20 border border-border/15 hover:bg-muted/30 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate">{bn ? ft.name_bn : ft.name}</p>
                            <p className="text-[10px] text-muted-foreground/70">
                              {categoryLabel}
                              {isMonthly && (bn ? ` • ৳${ft.amount}/মাস × ${monthsCount} মাস` : ` • ৳${ft.amount}/mo × ${monthsCount} mo`)}
                              {ft.classes?.name_bn && ` • ${ft.classes.name_bn}`}
                            </p>
                          </div>
                          <div className="text-right ml-2 shrink-0">
                            {waiverPercent > 0 ? (
                              <div>
                                <p className="text-[10px] line-through text-muted-foreground/40">৳{baseTotal}</p>
                                <p className="font-black text-emerald-600 text-sm">৳{netAmount}</p>
                              </div>
                            ) : (
                              <p className="font-black text-foreground text-sm">৳{baseTotal}</p>
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
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-5 text-[9px] px-2 text-emerald-700 dark:text-emerald-300 border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full font-bold ml-auto"
                                onClick={() => handleOpenPayFromFeeType(ft, remaining)}
                              >
                                <Banknote className="w-2.5 h-2.5 mr-1" /> {bn ? 'বকেয়া পরিশোধ' : 'Pay Due'}
                              </Button>
                            </>
                          ) : pendingPayment ? (
                            <Badge className="bg-amber-500/10 text-amber-600 rounded-full text-[9px] px-2.5">{bn ? '⏳ পেন্ডিং' : '⏳ Pending'}</Badge>
                          ) : (
                            <>
                              <Badge className="bg-destructive/10 text-destructive rounded-full text-[9px] px-2.5">{bn ? `বকেয়া ৳${netAmount}` : `Due ৳${netAmount}`}</Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-5 text-[9px] px-2 text-emerald-700 dark:text-emerald-300 border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-full font-bold ml-auto"
                                onClick={() => handleOpenPayFromFeeType(ft, netAmount)}
                              >
                                <Banknote className="w-2.5 h-2.5 mr-1" /> {bn ? 'বকেয়া পরিশোধ' : 'Pay Due'}
                              </Button>
                            </>
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
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 scrollbar-thin">
                  {canDeleteItem && feePayments.some((p: any) => p.status === 'paid' || p.status === 'waived') && (
                    <div className="flex justify-end pb-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm(bn ? 'আপনি কি সমস্ত পরিশোধিত রেকর্ড আনপেইড/মুছে ফেলতে চান? সমস্ত ফি পুনরায় বকেয়া তালিকায় ফিরে যাবে।' : 'Reset and mark all payments unpaid? All fees will return to dues.')) {
                            deleteAllPaymentsMutation.mutate();
                          }
                        }}
                        disabled={deleteAllPaymentsMutation.isPending}
                        className="h-6 text-[10px] text-destructive border-destructive/20 hover:bg-destructive/10 rounded-md font-bold"
                      >
                        <Trash2 className="w-3 h-3 mr-1" />
                        {bn ? 'সকল পেমেন্ট আনপেইড করুন' : 'Unpay All'}
                      </Button>
                    </div>
                  )}
                  {feePayments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20 border border-border/15 hover:bg-muted/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{bn ? (p.fee_types?.name_bn || p.fee_types?.name) : p.fee_types?.name || '-'}</p>
                        <p className="text-[10px] text-muted-foreground/60">
                          ৳{(p.paid_amount || p.amount || 0).toLocaleString()}
                          {p.month && ` • ${p.month} ${p.year || ''}`}
                          {p.receipt_number && <> • {bn ? 'রসিদ: ' : '#'}{p.receipt_number}</>}
                        </p>
                      </div>
                      <div className="ml-2 shrink-0 flex items-center gap-1.5">
                        {getFeeStatusBadge(p.status)}
                        {canDeleteItem && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              if (confirm(bn ? 'এই পেমেন্টটি আনপেইড করতে চান? এটি পুনরায় বকেয়া হবে।' : 'Mark this payment unpaid? It will return to dues.')) {
                                deletePaymentMutation.mutate(p.id);
                              }
                            }}
                            disabled={deletePaymentMutation.isPending}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-full"
                            title={bn ? 'আনপেইড করুন' : 'Mark Unpaid'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
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
          {studentDocs.length > 0 && (
            <ProfileSectionCard title={bn ? 'সংযুক্ত ডকুমেন্টস ও ফাইল' : 'Attached Documents & Files'} icon={FileText}>
              <div className="col-span-full space-y-2">
                {studentDocs.map((doc, idx) => (
                  <div key={doc.id || idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/15 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold truncate">{doc.name}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 rounded-full border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 shrink-0"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {bn ? 'দেখুন' : 'View'}
                    </Button>
                  </div>
                ))}
              </div>
            </ProfileSectionCard>
          )}

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

      {/* ═══════════ BULK / SINGLE FEE DISCOUNT & WAIVER DIALOG ═══════════ */}
      <Dialog open={discountDialogOpen} onOpenChange={setDiscountDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg p-5 sm:p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Tag className="h-4 w-4" />
              </div>
              <span>{bn ? 'ফি ছাড় / ডিসকাউন্ট ও মওকুফ' : 'Fee Discount & Waiver'}</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {student.name_bn || student.name_en} • {resolveClassName(student.class_id)} {student.roll_number ? `• রোল: ${formatDigits(student.roll_number, bn)}` : ''}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Selected items to discount */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-800 dark:text-amber-300">
                <span>{bn ? 'নির্বাচিত ফি তালিকা:' : 'Selected Fees:'}</span>
                <span>{bn ? `${selectedDueItems.length} টি ফি • মোট ৳${formatDigits(selectedDueTotal.toLocaleString(), bn)}` : `${selectedDueItems.length} fees • ৳${selectedDueTotal.toLocaleString()}`}</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {selectedDueItems.map((itm: any) => (
                  <div key={itm.id} className="flex items-center justify-between py-1 border-b border-border/10 last:border-none text-xs">
                    <span className="font-semibold truncate pr-2">{bn ? itm.name_bn : itm.name} {itm.monthLabel ? `(${itm.monthLabel})` : ''}</span>
                    <span className="font-bold text-rose-600 shrink-0">৳{formatDigits(itm.dueAmount.toLocaleString(), bn)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Discount Type Options */}
            <div className="space-y-1.5">
              <label className="font-bold text-muted-foreground text-[11px]">{bn ? 'ছাড়ের ধরন:' : 'Discount Type:'}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'full', label: bn ? 'সম্পূর্ণ মওকুফ' : '100% Waiver', sub: '১০০% ছাড়' },
                  { id: 'percent', label: bn ? 'শতকরা ছাড়' : 'Percentage', sub: '% হার' },
                  { id: 'amount', label: bn ? 'টাকায় ছাড়' : 'Fixed Amount', sub: 'নির্দিষ্ট ৳' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDiscountType(t.id as any)}
                    className={cn(
                      'py-2 px-2 text-center rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-0.5',
                      discountType === t.id
                        ? 'border-amber-500 bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-xs ring-1 ring-amber-500/30'
                        : 'border-border/40 hover:bg-muted/30 text-muted-foreground'
                    )}
                  >
                    <span>{t.label}</span>
                    <span className="text-[10px] font-normal opacity-70">{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic input based on discount type */}
            {discountType === 'percent' && (
              <div className="space-y-1.5">
                <label className="font-bold text-muted-foreground text-[11px]">{bn ? 'ছাড়ের শতকরা হার (%):' : 'Discount Percentage (%):'} *</label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="pr-8 font-bold text-base h-10 rounded-xl"
                    placeholder="যেমন: ৫০"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">%</span>
                </div>
              </div>
            )}

            {discountType === 'amount' && (
              <div className="space-y-1.5">
                <label className="font-bold text-muted-foreground text-[11px]">{bn ? 'ছাড়ের পরিমাণ (টাকা):' : 'Discount Amount (BDT):'} *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">৳</span>
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="pl-7 font-bold text-base h-10 rounded-xl"
                    placeholder="যেমন: ১০০"
                  />
                </div>
              </div>
            )}

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="font-bold text-muted-foreground text-[11px]">{bn ? 'ছাড়ের কারণ বা রেফারেন্স:' : 'Reason / Note:'}</label>
              <Input
                value={discountReason}
                onChange={(e) => setDiscountReason(e.target.value)}
                placeholder={bn ? 'উদা: এতিম / দরিদ্র তহবিল / বিশেষ বিবেচনা' : 'e.g. Orphan / Special concession...'}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDiscountDialogOpen(false)} disabled={isApplyingDiscount} className="rounded-xl">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={executeApplyDiscount} disabled={isApplyingDiscount} className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold">
              {isApplyingDiscount ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Tag className="w-4 h-4 mr-1.5" />}
              {bn ? 'ছাড় নিশ্চিত করুন' : 'Confirm Discount'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════ DIRECT FEE PAYMENT DIALOG ═══════════ */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg p-5 sm:p-6 rounded-2xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <Banknote className="h-4 w-4" />
              </div>
              <span>{bn ? 'সরাসরি ফি পরিশোধ' : 'Direct Fee Payment'}</span>
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              {student.name_bn || student.name_en} • {resolveClassName(student.class_id)} {student.roll_number ? `• রোল: ${formatDigits(student.roll_number, bn)}` : ''}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Items being paid */}
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
                <span>{bn ? 'পরিশোধিতব্য ফি তালিকা:' : 'Fee Items:'}</span>
                <span className="text-foreground font-semibold">{bn ? `${payingItems.length} টি আইটেম` : `${payingItems.length} items`}</span>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {payingItems.map((itm: any) => (
                  <div key={itm.id} className="flex items-center justify-between py-1 border-b border-border/10 last:border-none text-xs">
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold truncate">{bn ? itm.name_bn : itm.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {itm.monthLabel || itm.categoryLabel}
                        {itm.waiverPercent > 0 && ` (${bn ? 'ছাড়' : 'Discount'} ${itm.waiverPercent}%)`}
                      </p>
                    </div>
                    <span className="font-bold text-rose-600 shrink-0">৳{formatDigits(itm.dueAmount.toLocaleString(), bn)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Amount input */}
            <div className="space-y-1.5">
              <label className="font-bold text-muted-foreground text-[11px]">{bn ? 'পরিশোধের পরিমাণ (টাকা):' : 'Payment Amount (BDT):'} *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground text-sm">৳</span>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="pl-7 font-bold text-base h-10 rounded-xl"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Collector Selector */}
            <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3">
              <CollectorSelector
                value={customCollector}
                onChange={setCustomCollector}
                defaultCollectorName={collectorName}
              />
            </div>

            {/* Payment method selector */}
            <div className="space-y-1.5">
              <label className="font-bold text-muted-foreground text-[11px]">{bn ? 'পরিশোধের মাধ্যম:' : 'Payment Method:'}</label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: 'cash', label: 'ক্যাশ', icon: Banknote },
                  { id: 'bkash', label: 'বিকাশ', icon: CreditCard },
                  { id: 'nagad', label: 'নগদ', icon: CreditCard },
                  { id: 'rocket', label: 'রকেট', icon: CreditCard },
                  { id: 'bank', label: 'ব্যাংক', icon: Building2 },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayMethod(m.id)}
                    className={cn(
                      'py-2 px-1 text-center rounded-xl border text-[11px] font-bold transition-all flex flex-col items-center gap-1',
                      payMethod === m.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'border-border/40 hover:bg-muted/30 text-muted-foreground'
                    )}
                  >
                    <m.icon className="w-3.5 h-3.5" />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <label className="font-bold text-muted-foreground text-[11px]">{bn ? 'পরিশোধের তারিখ:' : 'Payment Date:'}</label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            {/* Remarks */}
            <div className="space-y-1.5">
              <label className="font-bold text-muted-foreground text-[11px]">{bn ? 'মন্তব্য বা ট্রানজেকশন আইডি (ঐচ্ছিক):' : 'Remarks / TrxID (Optional):'}</label>
              <Input
                value={payRemarks}
                onChange={(e) => setPayRemarks(e.target.value)}
                placeholder={bn ? 'উদা: ক্যাশ জমা নেওয়া হয়েছে / TxID: 9X7...' : 'e.g. Cash collected / TxID...'}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button variant="outline" size="sm" onClick={() => setPayDialogOpen(false)} disabled={isPaying} className="rounded-xl">
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button size="sm" onClick={executePayment} disabled={isPaying} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
              {isPaying ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <CheckCircle2 className="w-4 h-4 mr-1.5" />}
              {bn ? 'পরিশোধ নিশ্চিত করুন' : 'Confirm Payment'}
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
        {canEditItem && setEditStudent && setShowDetail && setShowAdd && (
          <Button
            variant="outline"
            onClick={() => { setEditStudent(student); setShowDetail(null); setShowAdd(true); }}
            className="flex-1 min-w-[140px] rounded-full h-11 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300"
          >
            <Pencil className="w-4 h-4 mr-2" /> {bn ? 'সম্পাদনা' : 'Edit'}
          </Button>
        )}
        {statusMutation && student.approval_status !== 'approved' && (
          <Button
            variant="outline"
            onClick={() => { statusMutation.mutate({ id: student.id, status: 'approved' }); setShowDetail?.(null); }}
            className="flex-1 rounded-full h-11 border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all duration-300"
          >
            <CheckCircle className="w-4 h-4 mr-2" /> {bn ? 'অনুমোদন' : 'Approve'}
          </Button>
        )}
        {statusMutation && student.approval_status !== 'rejected' && (
          <Button
            variant="outline"
            onClick={() => { statusMutation.mutate({ id: student.id, status: 'rejected' }); setShowDetail?.(null); }}
            className="flex-1 rounded-full h-11 border-rose-500/20 text-rose-600 hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all duration-300"
          >
            <XCircle className="w-4 h-4 mr-2" /> {bn ? 'প্রত্যাখ্যান' : 'Reject'}
          </Button>
        )}
        {statusMutation && student.approval_status === 'rejected' && (
          <Button
            variant="outline"
            onClick={() => { statusMutation.mutate({ id: student.id, status: 'pending' }); setShowDetail?.(null); }}
            className="flex-1 rounded-full h-11 border-amber-500/20 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-all duration-300"
          >
            <Clock className="w-4 h-4 mr-2" /> {bn ? 'অপেক্ষমাণে ফেরত' : 'Back to Pending'}
          </Button>
        )}
      </div>
      {/* Universal Document Preview Modal */}
      <DocumentPreviewModal
        open={!!previewDoc}
        onOpenChange={() => setPreviewDoc(null)}
        fileUrl={previewDoc?.url}
        fileName={previewDoc?.name}
        title={previewDoc?.name || (bn ? 'ডকুমেন্ট প্রিভিউ' : 'Document Preview')}
      />
    </div>
  );
};

export default StudentProfileModal;
