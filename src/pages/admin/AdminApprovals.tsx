
const translateMaritalStatus = (val: string | undefined, bn: boolean): string => {
  if (!val) return '-';
  const map: Record<string, [string, string]> = {
    unmarried: ['অবিবাহিত', 'Unmarried'],
    single: ['অবিবাহিত', 'Unmarried'],
    married: ['বিবাহিত', 'Married'],
    widowed: ['বিধবা / বিপত্নীক', 'Widowed'],
    widow: ['বিধবা / বিপত্নীক', 'Widowed'],
    divorced: ['তালাকপ্রাপ্ত', 'Divorced']
  };
  return map[val.toLowerCase()]?.[bn ? 0 : 1] || val;
};

import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import AdmissionForm from '@/components/admission/AdmissionForm';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { getStaffDisplayNames } from '@/lib/nameFormatter';
import {
  ClipboardCheck,
  Check,
  X,
  Loader2,
  Eye,
  MessageSquare,
  Clock,
  FileText,
  Layers,
  GraduationCap,
  Users,
  Wallet,
  BookOpen,
  UserCheck,
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Filter,
  Coins,
  Home,
  PlusCircle,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
  Copy,
  Printer,
  Download,
  Phone,
} from 'lucide-react';
import {
  buildStudentApplicationHTML,
  buildStaffApplicationHTML,
  downloadHTMLAsPDF,
  printHTML,
} from '@/lib/applicationSlipGenerator';
import { toast } from 'sonner';
import { invalidateAllStudentQueries } from '@/lib/studentQueryInvalidator';

// Status badge helper
const bnToEn = (str: any) => String(str || '').replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  approved: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  verified: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  rejected: 'bg-rose-500/10 text-rose-600 border-rose-500/30',
};

// Module mappings for human-friendly Bengali labels
const TABLE_MODULE_MAP: Record<string, { labelBn: string; labelEn: string; category: string; icon: string }> = {
  expenses: { labelBn: 'খরচ ও ব্যয় ভাউচার', labelEn: 'Expenses', category: 'finance', icon: '💰' },
  fee_payments: { labelBn: 'ফি আদায় ও রসিদ', labelEn: 'Fee Payments', category: 'finance', icon: '💳' },
  salary_records: { labelBn: 'বেতন শিট ও পরিশোধ', labelEn: 'Salary Records', category: 'finance', icon: '💵' },
  budgets: { labelBn: 'বাজেট পরিকল্পনা', labelEn: 'Budgets', category: 'finance', icon: '📊' },
  deposits: { labelBn: 'জমা ও ফান্ড', labelEn: 'Deposits', category: 'finance', icon: '🏦' },
  students: { labelBn: 'শিক্ষার্থী তথ্য', labelEn: 'Students', category: 'students', icon: '🎓' },
  classes: { labelBn: 'ক্লাস ও সেকশন', labelEn: 'Classes', category: 'students', icon: '🏫' },
  subjects: { labelBn: 'পাঠ্য বিষয়', labelEn: 'Subjects', category: 'academic', icon: '📚' },
  staff: { labelBn: 'শিক্ষক ও কর্মচারী', labelEn: 'Staff', category: 'staff', icon: '👨‍🏫' },
  duty_roster: { labelBn: 'ডিউটি রোস্টার', labelEn: 'Duty Roster', category: 'staff', icon: '🕒' },
  joining_letters: { labelBn: 'নিয়োগপত্র', labelEn: 'Joining Letters', category: 'staff', icon: '📄' },
  resign_letters: { labelBn: 'পদত্যাগপত্র', labelEn: 'Resign Letters', category: 'staff', icon: '📑' },
  question_papers: { labelBn: 'প্রশ্নপত্র', labelEn: 'Question Papers', category: 'academic', icon: '📖' },
  results: { labelBn: 'পরীক্ষার ফলাফল / নম্বর', labelEn: 'Exam Results', category: 'academic', icon: '📝' },
  exams: { labelBn: 'পরীক্ষা সময়সূচী', labelEn: 'Exams Routine', category: 'academic', icon: '🗓️' },
  student_certificates: { labelBn: 'সনদপত্র ও প্রত্যয়ন', labelEn: 'Certificates', category: 'identity', icon: '📜' },
  library_books: { labelBn: 'লাইব্রেরি বই', labelEn: 'Library Books', category: 'inventory', icon: '📕' },
  library_issuances: { labelBn: 'বই ইস্যু ও রিটার্ন', labelEn: 'Library Issuances', category: 'inventory', icon: '🔖' },
  fixed_assets: { labelBn: 'স্থায়ী সম্পদ', labelEn: 'Fixed Assets', category: 'inventory', icon: '🏢' },
  inventory_items: { labelBn: 'মালামাল ও ইনভেন্টরি', labelEn: 'Inventory Items', category: 'inventory', icon: '📦' },
  notices: { labelBn: 'নোটিশ ও বিজ্ঞপ্তি', labelEn: 'Notices', category: 'other', icon: '📢' },
  attendance_records: { labelBn: 'উপস্থিতি তথ্য', labelEn: 'Attendance Records', category: 'staff', icon: '⏱️' },
};

const FIELD_LABEL_MAP: Record<string, string> = {
  title: 'শিরোনাম / খাত',
  amount: 'টাকার পরিমাণ',
  net_salary: 'নীট বেতন',
  basic_salary: 'মূল বেতন',
  expense_date: 'তারিখ',
  voucher_no: 'ভাউচার নং',
  name_bn: 'নাম (বাংলা)',
  name_en: 'নাম (ইংরেজি)',
  roll_number: 'রোল নম্বর',
  class_id: 'শ্রেণি আইডি',
  reset_type: 'রিসেটের ধরন',
  target_label: 'রিসেটের আওতাভুক্ত',
  count: 'মোট রেকর্ড সংখ্যা',
  date: 'তারিখ',
  entity_type: 'সত্তা ধরন',
  shift: 'শিফট',
  phone: 'মোবাইল নম্বর',
  mobile: 'মোবাইল নম্বর',
  email: 'ইমেইল',
  designation: 'পদবী',
  month_year: 'মাস ও বছর',
  status: 'স্ট্যাটাস',
  remarks: 'মন্তব্য',
  description: 'বিবরণ',
  father_name: 'পিতার নাম',
  mother_name: 'মাতার নাম',
  blood_group: 'রক্তের গ্রুপ',
  address: 'ঠিকানা',
  transaction_id: 'ট্রানজেকশন আইডি',
  payment_method: 'পেমেন্ট মাধ্যম',
  total_marks: 'পূর্ণমান',
};

const AdminApprovals = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>('students');

  // Quick Application Tracker States
  const [showQuickTrackerModal, setShowQuickTrackerModal] = useState(false);
  const [trackerQuery, setTrackerQuery] = useState('');
  const [isSearchingTracker, setIsSearchingTracker] = useState(false);
  const [trackerHasSearched, setTrackerHasSearched] = useState(false);
  const [trackerResult, setTrackerResult] = useState<{
    type: 'student' | 'staff';
    data: any;
  } | null>(null);
  const [isDownloadingTrackerSlip, setIsDownloadingTrackerSlip] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');

  // Maker-checker Sub Filters
  const [actionModuleFilter, setActionModuleFilter] = useState<string>('all');
  const [actionTypeFilter, setActionTypeFilter] = useState<'all' | 'add' | 'edit' | 'delete'>('all');
  const [showRawJson, setShowRawJson] = useState(false);

  // Modal / Detail States
  const [detailModal, setDetailModal] = useState<{ type: string; data: any } | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{ type: string; id: string; name?: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNote, setAdminNote] = useState('');

  // Student Approval Modal States (review, roll/reg assignment, approver)
  const [studentApprovalModal, setStudentApprovalModal] = useState<any | null>(null);
  const [assignedRoll, setAssignedRoll] = useState('');
  const [assignedReg, setAssignedReg] = useState('');
  const [studentApproverName, setStudentApproverName] = useState('');
  const [studentApproverDesignation, setStudentApproverDesignation] = useState('');
  const [studentApproverDate, setStudentApproverDate] = useState('');
  const [calculatingRoll, setCalculatingRoll] = useState(false);
  const [editStudentForModal, setEditStudentForModal] = useState<any | null>(null);
  const [showEditAdmissionForm, setShowEditAdmissionForm] = useState(false);
  const [assignedCategory, setAssignedCategory] = useState('general');
  const [assignedIsFree, setAssignedIsFree] = useState(false);
  const [studentReferralType, setStudentReferralType] = useState<string>('none');
  const [studentReferralName, setStudentReferralName] = useState('');
  const [studentReferralPhone, setStudentReferralPhone] = useState('');
  const [studentReferralDesignation, setStudentReferralDesignation] = useState('');

  // Staff Approval Modal States (review, salary, signatures, approver)
  const [staffApprovalModal, setStaffApprovalModal] = useState<any | null>(null);
  const [staffSalary, setStaffSalary] = useState('');
  const [staffResidenceType, setStaffResidenceType] = useState<string>('non_residential');
  const [principalName, setPrincipalName] = useState('');
  const [principalPosition, setPrincipalPosition] = useState(bn ? 'অধ্যক্ষ' : 'Principal');
  const [otherSignName, setOtherSignName] = useState('');
  const [otherSignPosition, setOtherSignPosition] = useState('');
  const [approverName, setApproverName] = useState('');
  const [approverPosition, setApproverPosition] = useState(bn ? 'অধ্যক্ষ / অ্যাডমিন' : 'Principal / Admin');
  const [approverSignatureUrl, setApproverSignatureUrl] = useState('');
  const [approverDate, setApproverDate] = useState('');
  const [uploadingSig, setUploadingSig] = useState(false);
  const staffApproverSigRef = useRef<HTMLInputElement>(null);

  // Institution info
  const { data: institution } = useQuery({
    queryKey: ['institution'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
  });

  // Student Categories for approval assignment
  const { data: studentCategories = [] } = useQuery({
    queryKey: ['student-categories-approvals'],
    queryFn: async () => {
      const { data } = await supabase.from('student_categories').select('id, name, name_bn').order('name');
      return data || [];
    },
  });

  // Classes and Divisions for roll/reg auto-generation
  const { data: allClasses = [] } = useQuery({
    queryKey: ['all-classes-approvals'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('id, name, name_bn, sort_order, division_id').order('sort_order');
      return data || [];
    },
  });

  const { data: allDivisions = [] } = useQuery({
    queryKey: ['all-divisions-approvals'],
    queryFn: async () => {
      const { data } = await supabase.from('divisions').select('id, name, name_bn, prefix');
      return data || [];
    },
  });

  const { data: allActiveStaff = [] } = useQuery({
    queryKey: ['active-staff-for-approvals'],
    queryFn: async () => {
      const { data } = await supabase.from('staff').select('id, name_bn, name_en, phone, designation').eq('status', 'active');
      return data || [];
    },
  });

  // 1. Fetch Current User Profile
  const { data: currentProfile } = useQuery({
    queryKey: ['current-profile-approvals', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  // 2. Data Queries with Realtime updates via Query Keys
  // Tab 1: Student Admissions
  const { data: students = [], isLoading: loadingStudents, refetch: refetchStudents } = useQuery({
    queryKey: ['approvals-students', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('students')
        .select(`
          *,
          classes:class_id(id, name, name_bn, division_id, sort_order, divisions(id, name, name_bn, prefix))
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        q = q.eq('approval_status', statusFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Tab 2: Teacher & Staff
  const { data: staffList = [], isLoading: loadingStaff, refetch: refetchStaff } = useQuery({
    queryKey: ['approvals-staff', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('staff')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter === 'pending') {
        q = q.eq('status', 'pending');
      } else if (statusFilter === 'approved') {
        q = q.eq('status', 'active');
      } else if (statusFilter === 'rejected') {
        q = q.eq('status', 'rejected');
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Tab 3: Parent Payment Requests (TrxID / Slips)
  const { data: parentPayments = [], isLoading: loadingPayments, refetch: refetchPayments } = useQuery({
    queryKey: ['approvals-parent-payments', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('parent_payment_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter === 'pending') {
        q = q.eq('status', 'pending');
      } else if (statusFilter === 'approved') {
        q = q.eq('status', 'verified');
      } else if (statusFilter === 'rejected') {
        q = q.eq('status', 'rejected');
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Tab 4: Student Accounts (Portal Access)
  const { data: studentAccounts = [], isLoading: loadingAccounts, refetch: refetchAccounts } = useQuery({
    queryKey: ['approvals-student-accounts', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('student_accounts')
        .select('id, contact, contact_type, full_name, student_id, linked_student_uuid, status, contact_verified, rejection_reason, created_at')
        .order('created_at', { ascending: false });

      if (statusFilter === 'pending') {
        q = q.eq('status', 'pending');
      } else if (statusFilter === 'approved') {
        q = q.eq('status', 'active');
      } else if (statusFilter === 'rejected') {
        q = q.eq('status', 'rejected');
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Tab 5: Question Papers
  const { data: questionPapers = [], isLoading: loadingPapers, refetch: refetchPapers } = useQuery({
    queryKey: ['approvals-question-papers', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('question_papers')
        .select('id, title, class_id, subject_id, total_marks, status, created_at, created_by, duration_minutes, rejection_note')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Tab 6: Pending Actions (Maker-Checker / Edit & Delete / Accounts Audit)
  const { data: pendingActions = [], isLoading: loadingActions, refetch: refetchActions } = useQuery({
    queryKey: ['approvals-pending-actions', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('pending_actions')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Tab 7: Device Approval Requests
  const { data: deviceRequests = [], isLoading: loadingDevices, refetch: refetchDevices } = useQuery({
    queryKey: ['approvals-devices', statusFilter],
    queryFn: async () => {
      if (statusFilter === 'all' || statusFilter === 'pending') {
        const { data, error } = await (supabase as any).rpc('list_device_approval_requests', { _status: 'pending' });
        if (error) return [];
        return data || [];
      }
      return [];
    },
  });

  // Tab 8: WhatsApp Message Queue
  const { data: whatsappQueue = [], isLoading: loadingWhatsApp, refetch: refetchWhatsApp } = useQuery({
    queryKey: ['approvals-whatsapp', statusFilter],
    queryFn: async () => {
      let q = supabase
        .from('whatsapp_message_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (statusFilter === 'pending') {
        q = q.in('status', ['pending', 'approved']);
      } else if (statusFilter === 'approved') {
        q = q.eq('status', 'sent');
      } else if (statusFilter === 'rejected') {
        q = q.in('status', ['failed', 'rejected']);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Pending counts for stat cards & badges
  const counts = useMemo(() => {
    const financePending = pendingActions.filter((a: any) =>
      a.status === 'pending' && ['expenses', 'fee_payments', 'salary_records', 'budgets', 'deposits'].includes(a.target_table)
    ).length;

    return {
      students: students.filter((s: any) => s.approval_status === 'pending').length,
      staff: staffList.filter((s: any) => s.status === 'pending').length,
      finance: financePending,
      payments: parentPayments.filter((p: any) => p.status === 'pending').length,
      accounts: studentAccounts.filter((a: any) => a.status === 'pending').length,
      papers: questionPapers.filter((q: any) => q.status === 'pending').length,
      actions: pendingActions.filter((a: any) => a.status === 'pending').length,
      devices: deviceRequests.length,
      whatsapp: whatsappQueue.filter((w: any) => w.status === 'pending').length,
    };
  }, [students, staffList, parentPayments, studentAccounts, questionPapers, pendingActions, deviceRequests, whatsappQueue]);

  const totalPending = useMemo(() => {
    return counts.students + counts.staff + counts.payments + counts.accounts + counts.papers + counts.actions + counts.devices + counts.whatsapp;
  }, [counts]);

  // Refetch all queries
  const refetchAll = () => {
    refetchStudents();
    refetchStaff();
    refetchPayments();
    refetchAccounts();
    refetchPapers();
    refetchActions();
    refetchDevices();
    refetchWhatsApp();
    toast.success(bn ? '🔄 তথ্য রিফ্রেশ করা হয়েছে' : '🔄 Data refreshed');
  };

  // ─── Mutations ───

  // 1. Student Admission Approval / Rejection
  const studentMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('students')
        .update({
          approval_status: status,
          status: status === 'approved' ? 'active' : 'inactive',
        } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals-students'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success(status === 'approved' ? (bn ? '✅ শিক্ষার্থী ভর্তি অনুমোদিত হয়েছে' : '✅ Student admitted') : (bn ? '❌ শিক্ষার্থী আবেদন বাতিল হয়েছে' : '❌ Student application rejected'));
      setDetailModal(null);
    },
    onError: (e: any) => toast.error(e.message || (bn ? 'সমস্যা হয়েছে' : 'Error occurred')),
  });

  // ─── Quick Application Tracker Lookup ───
  const handleTrackerSearch = async (targetId?: string) => {
    const raw = (targetId !== undefined ? targetId : trackerQuery).trim();
    if (!raw) {
      toast.error(bn ? 'আবেদন নম্বর, রোল বা মোবাইল নম্বর দিন' : 'Please enter Application ID, Roll or Mobile');
      return;
    }
    const cleanQ = raw.replace(/[-\s]/g, '').toUpperCase();
    setIsSearchingTracker(true);
    setTrackerHasSearched(true);
    setTrackerResult(null);

    try {
      // 1. Staff lookup if starts with STF
      if (cleanQ.startsWith('STF')) {
        const { data: stfList } = await supabase
          .from('staff')
          .select('*')
          .or(`staff_id.ilike.%${cleanQ}%,application_no.ilike.%${cleanQ}%,staff_data->>application_no.ilike.%${cleanQ}%`)
          .limit(1);

        if (stfList && stfList.length > 0) {
          setTrackerResult({ type: 'staff', data: stfList[0] });
          setIsSearchingTracker(false);
          return;
        }
      }

      // 2. Student lookup
      const { data: stdList } = await supabase
        .from('students')
        .select(`
          *,
          classes:class_id(id, name, name_bn, division_id, sort_order, divisions(id, name, name_bn, prefix))
        `)
        .or(`student_id.ilike.%${cleanQ}%,application_no.ilike.%${cleanQ}%,registration_no.ilike.%${cleanQ}%,roll_number.ilike.%${cleanQ}%,phone.ilike.%${cleanQ}%,father_phone.ilike.%${cleanQ}%`)
        .limit(1);

      if (stdList && stdList.length > 0) {
        setTrackerResult({ type: 'student', data: stdList[0] });
        setIsSearchingTracker(false);
        return;
      }

      // 3. Fallback Staff lookup
      const { data: fallbackStaff } = await supabase
        .from('staff')
        .select('*')
        .or(`phone.ilike.%${cleanQ}%,mobile.ilike.%${cleanQ}%,staff_id.ilike.%${cleanQ}%,application_no.ilike.%${cleanQ}%,staff_data->>application_no.ilike.%${cleanQ}%`)
        .limit(1);

      if (fallbackStaff && fallbackStaff.length > 0) {
        setTrackerResult({ type: 'staff', data: fallbackStaff[0] });
        setIsSearchingTracker(false);
        return;
      }

      setTrackerResult(null);
      toast.info(bn ? 'কোনো আবেদন পাওয়া যায়নি' : 'No application record found');
    } catch (err: any) {
      console.error('Tracker search error:', err);
      toast.error(err.message || (bn ? 'অনুসন্ধানে ত্রুটি হয়েছে' : 'Search error'));
    } finally {
      setIsSearchingTracker(false);
    }
  };

  const handleDownloadTrackerSlip = async () => {
    if (!trackerResult) return;
    setIsDownloadingTrackerSlip(true);
    try {
      const inst = institution || await fetchInstitutionInfo();
      if (trackerResult.type === 'student') {
        const html = buildStudentApplicationHTML(trackerResult.data, inst);
        const appNo = trackerResult.data.application_no || trackerResult.data.student_id || trackerResult.data.roll_number || 'admission_slip';
        await downloadHTMLAsPDF(html, `admission_slip_${appNo}.pdf`);
      } else {
        const html = buildStaffApplicationHTML(trackerResult.data, inst);
        const appNo = trackerResult.data.application_no || trackerResult.data.staff_id || 'staff_slip';
        await downloadHTMLAsPDF(html, `staff_application_${appNo}.pdf`);
      }
      toast.success(bn ? 'স্লিপ PDF সফলভাবে ডাউনলোড হয়েছে' : 'Slip PDF downloaded');
    } catch (e: any) {
      console.error(e);
      toast.error(bn ? 'PDF তৈরি করতে সমস্যা হয়েছে' : 'Failed to generate PDF');
    } finally {
      setIsDownloadingTrackerSlip(false);
    }
  };

  const handlePrintTrackerSlip = async () => {
    if (!trackerResult) return;
    try {
      const inst = institution || await fetchInstitutionInfo();
      if (trackerResult.type === 'student') {
        const html = buildStudentApplicationHTML(trackerResult.data, inst);
        printHTML(html);
      } else {
        const html = buildStaffApplicationHTML(trackerResult.data, inst);
        printHTML(html);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(bn ? 'প্রিন্ট করতে সমস্যা হয়েছে' : 'Failed to print');
    }
  };

  // ─── Student Admission Approval Handlers ───
  const openStudentApprovalModal = async (s: any) => {
    setStudentApprovalModal(s);
    setStudentApproverName(currentProfile?.full_name || institution?.name || (bn ? 'অধ্যক্ষ' : 'Principal'));
    setStudentApproverDesignation(bn ? 'অধ্যক্ষ / ভর্তি পরিচালক' : 'Principal / Admission Incharge');
    setStudentApproverDate(new Date().toISOString().split('T')[0]);
    setAssignedCategory(s.student_category || (s.is_poor ? 'poor' : s.is_orphan ? 'orphan' : 'general'));
    setAssignedIsFree(!!s.is_free);

    const existingRef = s.extra_fields?.referral_info || {};
    setStudentReferralType(existingRef.type || (s.referred_by ? 'other' : 'none'));
    setStudentReferralName(existingRef.name || s.referred_by || '');
    setStudentReferralPhone(existingRef.phone || '');
    setStudentReferralDesignation(existingRef.designation || '');

    let roll = s.roll_number ? String(s.roll_number) : '';
    let reg = s.registration_no || s.student_id || '';

    if (!roll) {
      setCalculatingRoll(true);
      try {
        const cls = allClasses.find((c: any) => c.id === s.class_id || c.name === s.admission_class || c.name_bn === s.admission_class);
        const classId = cls?.id || s.class_id;
        const sortOrder = cls?.sort_order ?? 1;
        const rollStart = sortOrder * 1000 + 1;
        const rollPrefix = Math.floor(rollStart / 1000);

        let nextRoll = '';
        try {
          const { data: rpcRoll, error: rpcErr } = await (supabase as any).rpc('get_next_student_roll', {
            p_class_id: classId,
            p_session_id: s.session_id || null,
            p_roll_start: rollStart,
          });
          if (!rpcErr && rpcRoll) {
            nextRoll = String(rpcRoll);
          }
        } catch {}

        if (!nextRoll) {
          let q = supabase.from('students').select('roll_number').not('roll_number', 'is', null);
          if (classId) q = q.eq('class_id', classId);
          if (s.session_id) q = q.eq('session_id', s.session_id);
          const { data: rollData } = await q;

          let maxRoll = rollStart - 1;
          if (rollData && rollData.length > 0) {
            for (const r of rollData) {
              const num = parseInt(r.roll_number || '0', 10);
              if (!isNaN(num) && num >= rollStart && num < (rollPrefix + 1) * 1000) {
                maxRoll = Math.max(maxRoll, num);
              }
            }
          }
          nextRoll = String(maxRoll + 1);
        }
        roll = nextRoll;
      } catch (err) {
        console.warn('Error calculating roll:', err);
      } finally {
        setCalculatingRoll(false);
      }
    }

    setAssignedRoll(roll);

    if (!reg) {
      const year = (s.session_year || s.admission_date || new Date().toISOString()).slice(0, 4);
      const div = allDivisions.find((d: any) => d.id === s.division_id || d.name === s.admission_division || d.name_bn === s.admission_division);
      const prefix = div?.prefix || '';
      reg = prefix ? `${prefix}-${year}${roll}` : `${year}${roll}`;
    }
    setAssignedReg(reg);
  };

  const handleAutoRegenerateReg = (overrideRoll?: string) => {
    if (!studentApprovalModal) return;
    const s = studentApprovalModal;
    const roll = bnToEn(overrideRoll !== undefined ? overrideRoll : assignedRoll).trim();
    const year = (s.session_year || s.admission_date || new Date().toISOString()).slice(0, 4);
    const div = allDivisions.find((d: any) => d.id === s.division_id || d.name === s.admission_division || d.name_bn === s.admission_division);
    const prefix = div?.prefix || '';
    const reg = prefix ? `${prefix}-${year}${roll}` : `${year}${roll}`;
    setAssignedReg(reg);
  };

  const approveStudentWithDetailsMutation = useMutation({
    mutationFn: async ({ studentId, status, reason }: { studentId?: string; status: 'approved' | 'rejected'; reason?: string }) => {
      const targetId = studentId || studentApprovalModal?.id;
      if (!targetId) return;

      if (status === 'rejected') {
        const { error } = await supabase
          .from('students')
          .update({
            approval_status: 'rejected',
            status: 'inactive',
          } as any)
          .eq('id', targetId);
        if (error) throw error;
        return;
      }

      // Approved
      const finalRoll = bnToEn(assignedRoll).trim();
      const finalReg = bnToEn(assignedReg).trim();

      const currentExtra = (studentApprovalModal?.extra_fields as any) || {};
      const updatedExtra = {
        ...currentExtra,
        approver_info: {
          name: studentApproverName,
          designation: studentApproverDesignation,
          date: studentApproverDate,
        },
        referral_info: {
          type: studentReferralType,
          name: studentReferralName,
          phone: studentReferralPhone,
          designation: studentReferralDesignation,
        },
      };

      const updatePayload: any = {
        approval_status: 'approved',
        status: 'active',
        roll_number: finalRoll || null,
        registration_no: finalReg || null,
        student_id: studentApprovalModal?.student_id || finalReg || null,
        student_category: assignedCategory,
        is_free: assignedIsFree,
        is_orphan: assignedCategory === 'orphan',
        is_poor: assignedCategory === 'poor' || assignedCategory === 'insolvent',
        referred_by: studentReferralName || null,
        extra_fields: updatedExtra,
      };

      const { error } = await supabase
        .from('students')
        .update(updatePayload)
        .eq('id', targetId);

      if (error) throw error;

      if (studentApprovalModal?.phone) {
        try {
          await supabase
            .from('student_accounts')
            .update({
              status: 'active',
              student_id: updatePayload.student_id,
              linked_student_uuid: targetId,
              approved_at: new Date().toISOString(),
            })
            .eq('contact', studentApprovalModal.phone);
        } catch {}
      }
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals-students'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      invalidateAllStudentQueries(queryClient);
      toast.success(
        status === 'approved'
          ? (bn ? '✅ শিক্ষার্থী ভর্তি অনুমোদিত হয়েছে এবং রোল ও রেজিস্ট্রেশন বরাদ্দ সম্পন্ন!' : '✅ Student admitted with roll and registration assigned!')
          : (bn ? '❌ শিক্ষার্থীর আবেদন বাতিল করা হয়েছে' : '❌ Student application rejected')
      );
      setStudentApprovalModal(null);
      setRejectionReason('');
    },
    onError: (e: any) => {
      toast.error(e.message || (bn ? 'অনুমোদনে সমস্যা হয়েছে' : 'Error updating student approval'));
    },
  });

  // 2. Staff Application Approval / Rejection
  const staffMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'rejected' }) => {
      const { error } = await supabase
        .from('staff')
        .update({ status } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals-staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(status === 'active' ? (bn ? '✅ শিক্ষক/স্টাফ অনুমোদিত হয়েছে' : '✅ Staff member approved') : (bn ? '❌ শিক্ষক/স্টাফ আবেদন বাতিল হয়েছে' : '❌ Staff application rejected'));
      setDetailModal(null);
    },
    onError: (e: any) => toast.error(e.message || (bn ? 'সমস্যা হয়েছে' : 'Error occurred')),
  });

  const openStaffApprovalModal = (s: any) => {
    const sd = (s.staff_data as any) || {};
    const sigs = sd.signatures || {};
    const app = sd.approver || {};
    setStaffSalary(s.salary ? String(s.salary) : '');
    setStaffResidenceType(s.residence_type || (s.staff_data as any)?.residence_type || 'non_residential');
    setPrincipalName(sigs.principal?.name || institution?.name || '');
    setPrincipalPosition(sigs.principal?.position || (bn ? 'অধ্যক্ষ' : 'Principal'));
    setOtherSignName(sigs.other?.name || '');
    setOtherSignPosition(sigs.other?.position || '');
    setApproverName(app.name || currentProfile?.full_name || '');
    setApproverPosition(app.position || (bn ? 'অধ্যক্ষ / অ্যাডমিন' : 'Principal / Admin'));
    setApproverSignatureUrl(app.signature_url || '');
    setApproverDate(app.date || new Date().toISOString().split('T')[0]);
    setStaffApprovalModal(s);
  };

  const handleStaffApproverSigUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error(bn ? 'স্বাক্ষর ফাইলের সাইজ ৫০০KB এর কম হতে হবে' : 'Signature size must be under 500KB');
      return;
    }
    setUploadingSig(true);
    try {
      const res = await uploadToCloudinary(file, { folder: 'approver-signatures' });
      setApproverSignatureUrl(res.secure_url);
      toast.success(bn ? 'স্বাক্ষর আপলোড সম্পন্ন' : 'Signature uploaded');
    } catch (err: any) {
      console.warn('Cloudinary upload error, trying Supabase storage fallback:', err);
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userPrefix = authData?.user?.id || 'public-uploads';
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const path = `${userPrefix}/approver-signatures/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('photos').upload(path, file, { upsert: false });
        if (error) {
          toast.error(bn ? 'স্বাক্ষর আপলোড ব্যর্থ' : 'Signature upload failed');
        } else {
          setApproverSignatureUrl(`photos/${path}`);
          toast.success(bn ? 'স্বাক্ষর আপলোড সম্পন্ন' : 'Signature uploaded');
        }
      } catch {
        toast.error(bn ? 'স্বাক্ষর আপলোড ব্যর্থ' : 'Signature upload failed');
      }
    } finally {
      setUploadingSig(false);
    }
  };

  const approveStaffWithDetailsMutation = useMutation({
    mutationFn: async () => {
      if (!staffApprovalModal) return;
      const currentSd = (staffApprovalModal.staff_data as any) || {};
      const updatedStaffData = {
        ...currentSd,
        residence_type: staffResidenceType,
        signatures: {
          principal: { name: principalName, position: principalPosition },
          other: { name: otherSignName, position: otherSignPosition },
        },
        approver: {
          name: approverName,
          position: approverPosition,
          signature_url: approverSignatureUrl,
          date: approverDate,
        },
      };

      const updatePayload: any = {
        status: 'active',
        salary: staffSalary ? parseFloat(staffSalary) : (staffApprovalModal.salary || 0),
        residence_type: staffResidenceType,
        staff_data: updatedStaffData,
      };

      if (!staffApprovalModal.joining_date) {
        updatePayload.joining_date = new Date().toISOString().split('T')[0];
      }

      // Ensure id_format_config has include_year = true for this staff category
      try {
        if (staffApprovalModal.staff_category) {
          await supabase
            .from('id_format_config')
            .update({ include_year: true, reset_mode: 'yearly' })
            .eq('entity_key', staffApprovalModal.staff_category);
        }
      } catch {}

      // Ensure staff_id contains joining year (e.g. TCH-2026-2017 instead of TCH-2017)
      const jYear = (updatePayload.joining_date || staffApprovalModal.joining_date || new Date().toISOString()).slice(0, 4);
      const targetStaffId = staffApprovalModal.staff_id;
      if (targetStaffId && /^([A-Za-z]+)-(\d{4,})$/.test(targetStaffId)) {
        const m = targetStaffId.match(/^([A-Za-z]+)-(\d{4,})$/);
        if (m) {
          updatePayload.staff_id = `${m[1]}-${jYear}-${m[2]}`;
        }
      } else if (!targetStaffId) {
        updatePayload.staff_id = null;
      }

      const { error } = await supabase
        .from('staff')
        .update(updatePayload)
        .eq('id', staffApprovalModal.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvals-staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      toast.success(bn ? '✅ শিক্ষক/স্টাফ আবেদন অনুমোদিত ও সক্রিয় করা হয়েছে!' : '✅ Staff member approved and activated!');
      setStaffApprovalModal(null);
    },
    onError: (e: any) => {
      toast.error(e.message || (bn ? 'অনুমোদনে সমস্যা হয়েছে' : 'Error approving staff'));
    },
  });

  // 3. Parent Payment Verification / Rejection
  const paymentMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: 'verified' | 'rejected'; reason?: string }) => {
      const updates: any = { status };
      if (status === 'rejected') updates.rejection_reason = reason || null;
      const { error } = await supabase.from('parent_payment_requests').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals-parent-payments'] });
      queryClient.invalidateQueries({ queryKey: ['fee_payments'] });
      toast.success(status === 'verified' ? (bn ? '✅ পেমেন্ট ও ফি স্লিপ যাচাই সম্পন্ন' : '✅ Payment verified & reconciled') : (bn ? '❌ পেমেন্ট বাতিল করা হয়েছে' : '❌ Payment rejected'));
      setRejectionModal(null);
      setRejectionReason('');
      setDetailModal(null);
    },
    onError: (e: any) => toast.error(e.message || (bn ? 'সমস্যা হয়েছে' : 'Error occurred')),
  });

  // 4. Student Account Portal Access Approval
  const accountMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: 'active' | 'rejected'; reason?: string }) => {
      const updates: any = { status };
      if (status === 'active') {
        updates.approved_at = new Date().toISOString();
        updates.rejection_reason = null;
      }
      if (status === 'rejected') {
        updates.rejection_reason = reason || null;
      }
      const { error } = await supabase.from('student_accounts').update(updates).eq('id', id);
      if (error) throw error;

      // Invoke notify if needed
      supabase.functions.invoke('student-auth', {
        body: { action: status === 'active' ? 'notify_approved' : 'notify_rejected', account_id: id, reason },
      }).catch(console.warn);
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals-student-accounts'] });
      toast.success(status === 'active' ? (bn ? '✅ শিক্ষার্থী অ্যাকাউন্ট অনুমোদিত' : '✅ Student account approved') : (bn ? '❌ শিক্ষার্থী অ্যাকাউন্ট বাতিল' : '❌ Student account rejected'));
      setRejectionModal(null);
      setRejectionReason('');
      setDetailModal(null);
    },
    onError: (e: any) => toast.error(e.message || (bn ? 'সমস্যা হয়েছে' : 'Error occurred')),
  });

  // 5. Question Paper Approval
  const paperMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: 'approved' | 'rejected'; note?: string }) => {
      const update: Record<string, any> = { status };
      if (status === 'approved') {
        update.approved_by = user?.id;
        update.approved_at = new Date().toISOString();
      }
      if (note) update.rejection_note = note;
      const { error } = await supabase.from('question_papers').update(update as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals-question-papers'] });
      queryClient.invalidateQueries({ queryKey: ['question-papers'] });
      toast.success(status === 'approved' ? (bn ? '✅ প্রশ্নপত্র অনুমোদিত হয়েছে' : '✅ Question paper approved') : (bn ? '❌ প্রশ্নপত্র বাতিল করা হয়েছে' : '❌ Question paper rejected'));
      setRejectionModal(null);
      setRejectionReason('');
      setDetailModal(null);
    },
    onError: (e: any) => toast.error(e.message || (bn ? 'সমস্যা হয়েছে' : 'Error occurred')),
  });

  // 6. Maker-Checker Pending Action Execution & Approval
  const executeApprovedAction = async (action: any) => {
    const { action_type, target_table, target_id, payload } = action;
    const cleanPayload = { ...payload };
    delete cleanPayload._description;

    if (target_table === 'fee_payments' && action_type === 'add') {
      cleanPayload.approved_by = currentProfile?.full_name || '';
    }

    if (target_table === 'results') {
      if (Array.isArray(cleanPayload.results) && cleanPayload.results.length > 0) {
        const { error } = await supabase
          .from('results')
          .upsert(cleanPayload.results, { onConflict: 'exam_id,student_id,subject_id' });
        if (error) throw error;
      }
      return;
    }

    if (action_type === 'add') {
      delete (cleanPayload as any).id;
      const { error } = await supabase.from(target_table).insert(cleanPayload as any);
      if (error) throw error;
    } else if (action_type === 'edit' && target_id) {
      delete (cleanPayload as any).id;
      const { error } = await supabase.from(target_table).update(cleanPayload as any).eq('id', target_id);
      if (error) throw error;

      // If approving a class status change, sync to students
      if (target_table === 'classes' && typeof cleanPayload.is_active === 'boolean') {
        const studentStatus = cleanPayload.is_active ? 'active' : 'inactive';
        await supabase
          .from('students')
          .update({ status: studentStatus } as any)
          .eq('class_id', target_id)
          .is('deleted_at', null);
      }
      // If approving a division status change, sync to classes and students
      if (target_table === 'divisions' && typeof cleanPayload.is_active === 'boolean') {
        const studentStatus = cleanPayload.is_active ? 'active' : 'inactive';
        await supabase.from('classes').update({ is_active: cleanPayload.is_active } as any).eq('division_id', target_id);
        await supabase
          .from('students')
          .update({ status: studentStatus } as any)
          .eq('division_id', target_id)
          .is('deleted_at', null);
      }
    } else if (action_type === 'delete') {
      if (target_table === 'classes' && target_id) {
        await supabase.from('students').update({ status: 'inactive' } as any).eq('class_id', target_id).is('deleted_at', null);
      }
      if (cleanPayload.ids && Array.isArray(cleanPayload.ids) && cleanPayload.ids.length > 0) {
        const { error } = await supabase.from(target_table).delete().in('id', cleanPayload.ids);
        if (error) throw error;
      } else if (target_id) {
        const { error } = await supabase.from(target_table).delete().eq('id', target_id);
        if (error) throw error;
      }
    } else if (action_type === 'reject' && target_id) {
      delete (cleanPayload as any).id;
      const { error } = await supabase.from(target_table).update(cleanPayload as any).eq('id', target_id);
      if (error) throw error;
    }
  };

  const pendingActionMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: 'approved' | 'rejected'; note?: string }) => {
      if (status === 'rejected' && !(note ?? '').trim()) {
        throw new Error(bn ? 'প্রত্যাখ্যানের কারণ লিখুন' : 'Please provide a rejection reason');
      }

      if (status === 'approved') {
        const action = pendingActions.find((a: any) => a.id === id) || detailModal?.data;
        if (action) {
          await executeApprovedAction(action);
        }
      }

      const { error } = await supabase
        .from('pending_actions')
        .update({
          status,
          admin_note: (note ?? '').trim() || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals-pending-actions'] });
      queryClient.invalidateQueries({ queryKey: ['pending-actions'] });
      queryClient.invalidateQueries({ queryKey: ['all-pending-actions'] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['salary'] });
      queryClient.invalidateQueries({ queryKey: ['all-classes'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['salary-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['salary-duty-attendance'] });
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['class-result-status'] });
      invalidateAllStudentQueries(queryClient);
      toast.success(status === 'approved' ? (bn ? '✅ ডেটা পরিবর্তন অনুমোদিত ও কার্যকর হয়েছে!' : '✅ Action executed & approved!') : (bn ? '❌ পরিবর্তন বাতিল করা হয়েছে' : '❌ Action rejected'));
      setDetailModal(null);
      setAdminNote('');
    },
    onError: (e: any) => toast.error(e.message || (bn ? 'সমস্যা হয়েছে' : 'Error occurred')),
  });

  // 7. Device Request Approval
  const deviceMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const rpcName = action === 'approve' ? 'approve_device_request' : 'reject_device_request';
      const { error } = await (supabase as any).rpc(rpcName, { _request_id: id });
      if (error) throw error;
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['approvals-devices'] });
      toast.success(action === 'approve' ? (bn ? '✅ ডিভাইস লগইন অনুমোদিত' : '✅ Device approved') : (bn ? '❌ ডিভাইস লগইন বাতিল' : '❌ Device rejected'));
      setDetailModal(null);
    },
    onError: (e: any) => toast.error(e.message || (bn ? 'সমস্যা হয়েছে' : 'Error occurred')),
  });

  // Filter lists based on Search Query
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/[-\s]/g, '');
    return students.filter((s: any) =>
      (s.name_bn || '').toLowerCase().includes(q) ||
      (s.name_en || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.roll_number || '').includes(q) ||
      (s.student_id || '').toLowerCase().replace(/[-\s]/g, '').includes(cleanQ) ||
      (s.application_no || '').toLowerCase().replace(/[-\s]/g, '').includes(cleanQ) || ((s.admission_data as any)?.application_no || '').toLowerCase().replace(/[-\s]/g, '').includes(cleanQ) || (s.father_phone || '').includes(q)
    );
  }, [students, searchQuery]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffList;
    const q = searchQuery.toLowerCase().trim();
    const cleanQ = q.replace(/[-\s]/g, '');
    return staffList.filter((s: any) =>
      (s.name_bn || '').toLowerCase().includes(q) ||
      (s.name_en || '').toLowerCase().includes(q) ||
      (s.first_name || '').toLowerCase().includes(q) ||
      (s.last_name || '').toLowerCase().includes(q) ||
      (s.designation || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.mobile || '').includes(q) ||
      (s.staff_id || '').toLowerCase().replace(/[-\s]/g, '').includes(cleanQ) || (s.application_no || '').toLowerCase().replace(/[-\s]/g, '').includes(cleanQ) ||
      ((s.staff_data as any)?.application_no || '').toLowerCase().replace(/[-\s]/g, '').includes(cleanQ) ||
      (s.nid || '').includes(q) ||
      String(s.salary || '').includes(q)
    );
  }, [staffList, searchQuery]);

  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return parentPayments;
    const q = searchQuery.toLowerCase();
    return parentPayments.filter((p: any) =>
      (p.transaction_id || '').toLowerCase().includes(q) ||
      (p.payment_method || '').toLowerCase().includes(q) ||
      String(p.amount || '').includes(q)
    );
  }, [parentPayments, searchQuery]);

  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return studentAccounts;
    const q = searchQuery.toLowerCase();
    return studentAccounts.filter((a: any) =>
      (a.full_name || '').toLowerCase().includes(q) ||
      (a.contact || '').toLowerCase().includes(q) ||
      (a.student_id || '').toLowerCase().includes(q)
    );
  }, [studentAccounts, searchQuery]);

  const filteredPapers = useMemo(() => {
    if (!searchQuery.trim()) return questionPapers;
    const q = searchQuery.toLowerCase();
    return questionPapers.filter((p: any) =>
      (p.title || '').toLowerCase().includes(q)
    );
  }, [questionPapers, searchQuery]);

  const financeActions = useMemo(() => {
    return pendingActions.filter((a: any) =>
      ['expenses', 'fee_payments', 'salary_records', 'budgets', 'deposits'].includes(a.target_table)
    );
  }, [pendingActions]);

  const filteredFinanceActions = useMemo(() => {
    if (!searchQuery.trim()) return financeActions;
    const q = searchQuery.toLowerCase();
    return financeActions.filter((a: any) =>
      (a.user_name || '').toLowerCase().includes(q) ||
      (a.target_table || '').toLowerCase().includes(q) ||
      (a.action_type || '').toLowerCase().includes(q) ||
      JSON.stringify(a.payload || {}).toLowerCase().includes(q)
    );
  }, [financeActions, searchQuery]);

  const filteredActions = useMemo(() => {
    return pendingActions.filter((a: any) => {
      // module filter
      if (actionModuleFilter !== 'all') {
        const meta = TABLE_MODULE_MAP[a.target_table];
        const cat = meta ? meta.category : 'other';
        if (cat !== actionModuleFilter) return false;
      }
      // action type filter
      if (actionTypeFilter !== 'all') {
        if (a.action_type !== actionTypeFilter) return false;
      }
      // search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (a.user_name || '').toLowerCase().includes(q);
        const matchesTable = (a.target_table || '').toLowerCase().includes(q);
        const matchesType = (a.action_type || '').toLowerCase().includes(q);
        const matchesPayload = JSON.stringify(a.payload || {}).toLowerCase().includes(q);
        if (!matchesName && !matchesTable && !matchesType && !matchesPayload) return false;
      }
      return true;
    });
  }, [pendingActions, actionModuleFilter, actionTypeFilter, searchQuery]);

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        {/* ── Standard Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <ClipboardCheck className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
                {bn ? 'কেন্দ্রীয় অনুমোদন হাব' : 'Central Admin Approval Hub'}
              </h1>
              {totalPending > 0 && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-xs px-2 py-0.5 rounded-full font-medium">
                  {totalPending} {bn ? 'পেন্ডিং' : 'Pending'}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {bn
                ? 'মাদ্রাসার সমস্ত ভর্তি, শিক্ষক নিয়োগ, পেমেন্ট ভেরিফিকেশন, প্রশ্নপত্র ও ডেটা পরিবর্তন অনুমোদন'
                : 'Unified command center for student admissions, staff recruitment, payments, exams & data audit approvals'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowQuickTrackerModal(true);
                setTrackerHasSearched(false);
              }}
              className="h-9 rounded-xl font-medium gap-2 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 bg-white dark:bg-card hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-xs"
            >
              <Search className="w-4 h-4 text-emerald-600" />
              <span>{bn ? 'আবেদন অনুসন্ধান ও ট্র্যাকিং' : 'Application Quick Tracker'}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={refetchAll} className="h-9 rounded-xl font-medium gap-2">
              <RefreshCw className="w-4 h-4" />
              {bn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* ── Top Stat Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
          {[
            { key: 'students', label: bn ? 'ভর্তি আবেদন' : 'Admissions', count: counts.students, icon: GraduationCap, iconColor: 'text-blue-600 bg-blue-500/10' },
            { key: 'staff', label: bn ? 'শিক্ষক/স্টাফ' : 'Staff', count: counts.staff, icon: Users, iconColor: 'text-purple-600 bg-purple-500/10' },
            { key: 'finance', label: bn ? 'হিসাব ও লেনদেন' : 'Finance', count: counts.finance, icon: Coins, iconColor: 'text-emerald-600 bg-emerald-500/10' },
            { key: 'payments', label: bn ? 'পেমেন্ট স্লিপ' : 'Payment Slips', count: counts.payments, icon: Wallet, iconColor: 'text-teal-600 bg-teal-500/10' },
            { key: 'accounts', label: bn ? 'পোর্টাল আইডি' : 'Student Acct', count: counts.accounts, icon: UserCheck, iconColor: 'text-amber-600 bg-amber-500/10' },
            { key: 'papers', label: bn ? 'প্রশ্নপত্র' : 'Exams', count: counts.papers, icon: BookOpen, iconColor: 'text-indigo-600 bg-indigo-500/10' },
            { key: 'actions', label: bn ? 'মেকার-চেকার' : 'Maker-Checker', count: counts.actions, icon: ShieldCheck, iconColor: 'text-rose-600 bg-rose-500/10' },
            { key: 'devices', label: bn ? 'ডিভাইস' : 'Devices', count: counts.devices, icon: Smartphone, iconColor: 'text-cyan-600 bg-cyan-500/10' },
          ].map((c) => {
            const Icon = c.icon;
            const isSelected = activeTab === c.key;
            return (
              <div
                key={c.key}
                onClick={() => setActiveTab(c.key as any)}
                className={`cursor-pointer transition-all rounded-xl border p-3 flex flex-col justify-between ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-xs'
                    : 'border-border/70 bg-card hover:border-border hover:bg-muted/30 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-medium text-muted-foreground truncate">{c.label}</span>
                  <div className={`w-7 h-7 rounded-lg ${c.iconColor} flex items-center justify-center shrink-0`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-lg font-bold tabular-nums text-foreground">{c.count}</p>
              </div>
            );
          })}
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={bn ? 'নাম, মোবাইল, ট্রানজেকশন আইডি বা রোল দিয়ে খুঁজুন...' : 'Search by name, phone, trx id or roll...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <span className="text-xs text-muted-foreground font-medium hidden sm:inline mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> {bn ? 'ফিল্টার:' : 'Filter:'}
            </span>
            {(['pending', 'approved', 'rejected', 'all'] as const).map((st) => (
              <Button
                key={st}
                size="sm"
                variant={statusFilter === st ? 'default' : 'outline'}
                onClick={() => setStatusFilter(st)}
                className={`h-8 px-3 text-xs ${statusFilter === st ? 'btn-primary-gradient' : ''}`}
              >
                {st === 'pending'
                  ? bn ? 'অনুমোদন প্রযোজ্য' : 'Pending'
                  : st === 'approved'
                  ? bn ? 'অনুমোদিত' : 'Approved'
                  : st === 'rejected'
                  ? bn ? 'বাতিল' : 'Rejected'
                  : bn ? 'সব' : 'All'}
              </Button>
            ))}
          </div>
        </div>

        {/* Tabs Command Center */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <TabsList className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 h-auto p-1.5 gap-1.5 bg-muted/60 rounded-xl">
            <TabsTrigger value="students" className="gap-2 py-2 text-xs">
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{bn ? 'ভর্তি আবেদন' : 'Students'}</span>
              {counts.students > 0 && <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">{counts.students}</span>}
            </TabsTrigger>

            <TabsTrigger value="staff" className="gap-2 py-2 text-xs">
              <Users className="w-3.5 h-3.5" />
              <span>{bn ? 'শিক্ষক ও স্টাফ' : 'Staff'}</span>
              {counts.staff > 0 && <span className="bg-purple-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">{counts.staff}</span>}
            </TabsTrigger>

            <TabsTrigger value="finance" className="gap-2 py-2 text-xs">
              <Coins className="w-3.5 h-3.5" />
              <span>{bn ? 'হিসাব ও লেনদেন' : 'Finance'}</span>
              {counts.finance > 0 && <span className="bg-emerald-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">{counts.finance}</span>}
            </TabsTrigger>

            <TabsTrigger value="payments" className="gap-2 py-2 text-xs">
              <Wallet className="w-3.5 h-3.5" />
              <span>{bn ? 'পেমেন্ট স্লিপ' : 'Payments'}</span>
              {counts.payments > 0 && <span className="bg-teal-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">{counts.payments}</span>}
            </TabsTrigger>

            <TabsTrigger value="accounts" className="gap-2 py-2 text-xs">
              <UserCheck className="w-3.5 h-3.5" />
              <span>{bn ? 'পোর্টাল অ্যাকাউন্ট' : 'Accounts'}</span>
              {counts.accounts > 0 && <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">{counts.accounts}</span>}
            </TabsTrigger>

            <TabsTrigger value="papers" className="gap-2 py-2 text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{bn ? 'প্রশ্নপত্র' : 'Papers'}</span>
              {counts.papers > 0 && <span className="bg-indigo-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">{counts.papers}</span>}
            </TabsTrigger>

            <TabsTrigger value="actions" className="gap-2 py-2 text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{bn ? 'মেকার-চেকার হাব' : 'Maker-Checker'}</span>
              {counts.actions > 0 && <span className="bg-rose-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">{counts.actions}</span>}
            </TabsTrigger>

            <TabsTrigger value="devices" className="gap-2 py-2 text-xs">
              <Smartphone className="w-3.5 h-3.5" />
              <span>{bn ? 'ডিভাইস লগইন' : 'Devices'}</span>
              {counts.devices > 0 && <span className="bg-cyan-500 text-white rounded-full px-1.5 py-0.2 text-[10px] font-bold">{counts.devices}</span>}
            </TabsTrigger>
          </TabsList>

          {/* ══════════════ TAB 1: STUDENT ADMISSIONS ══════════════ */}
          <TabsContent value="students" className="mt-0">
            <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-blue-600" />
                      {bn ? 'নতুন শিক্ষার্থী ভর্তি আবেদন' : 'Student Admission Applications'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {bn ? 'ভর্তি ফরম পূরণ করা শিক্ষার্থীদের যাচাই করে রোল নম্বর ও ক্লাস অনুমোদন দিন' : 'Review submitted admission forms and approve student admission'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {filteredStudents.length} {bn ? 'টি আবেদন' : 'Applications'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingStudents ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <GraduationCap className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    {bn ? 'কোনো শিক্ষার্থী ভর্তি আবেদন পাওয়া যায়নি' : 'No student admission applications found'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead>{bn ? 'শিক্ষার্থীর নাম' : 'Student Name'}</TableHead>
                        <TableHead>{bn ? 'পিতা / অভিভাবক' : 'Father / Guardian'}</TableHead>
                        <TableHead>{bn ? 'যোগাযোগ' : 'Phone'}</TableHead>
                        <TableHead>{bn ? 'রোল' : 'Roll'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead>{bn ? 'আবেদনের তারিখ' : 'Date'}</TableHead>
                        <TableHead className="text-right">{bn ? 'পদক্ষেপ' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.map((s: any) => (
                        <TableRow key={s.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {(() => {
                                const displayNames = getStaffDisplayNames(s.name_bn, s.name_en, bn);
                                return (
                                  <>
                                    {s.photo_url ? (
                                      <img src={s.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border" />
                                    ) : (
                                      <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center text-xs">
                                        {(displayNames.primary || 'S')[0]}
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-medium text-sm text-foreground">{displayNames.primary || '—'}</p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        {(s.admission_data?.application_no || s.student_id) && (
                                          <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1 py-0.2 rounded border border-primary/20">
                                            {s.admission_data?.application_no || s.student_id}
                                          </span>
                                        )}
                                        {displayNames.secondary && <span className="text-xs text-muted-foreground">{displayNames.secondary}</span>}
                                      </div>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{s.father_name || '—'}</TableCell>
                          <TableCell className="text-sm font-mono">{s.phone || '—'}</TableCell>
                          <TableCell className="text-sm font-semibold">{s.roll_number || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_COLORS[s.approval_status || 'pending']}>
                              {s.approval_status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') : s.approval_status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অনুমোদন প্রযোজ্য' : 'Pending')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 px-2.5 gap-1 text-xs border-primary/30 text-primary hover:bg-primary/10"
                                onClick={() => {
                                  setEditStudentForModal(s);
                                  setShowEditAdmissionForm(true);
                                }}
                                title={bn ? 'সম্পূর্ণ ফর্ম পর্যালোচনা ও সংশোধন করুন' : 'Review & Edit Full Form'}
                              >
                                <Edit className="w-3.5 h-3.5" />
                                {bn ? 'কারেকশন' : 'Edit'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openStudentApprovalModal(s)}
                                title={bn ? 'বিস্তারিত ও রোল বরাদ্দ' : 'View & Assign Roll'}
                              >
                                <Eye className="w-4 h-4 text-primary" />
                              </Button>
                              {s.approval_status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 gap-1 shadow-sm font-medium"
                                    onClick={() => openStudentApprovalModal(s)}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    {bn ? 'অনুমোদন' : 'Approve'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 px-2.5 gap-1"
                                    onClick={() => {
                                      setRejectionModal({ type: 'student', id: s.id, name: s.name_bn || s.name_en || 'শিক্ষার্থী' });
                                    }}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    {bn ? 'বাতিল' : 'Reject'}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════ TAB 2: TEACHER & STAFF ══════════════ */}
          <TabsContent value="staff" className="mt-0">
            <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-600" />
                      {bn ? 'শিক্ষক ও স্টাফ আবেদন' : 'Teacher & Staff Recruitment Applications'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {bn ? 'নিয়োগ ফরম থেকে আসা নতুন শিক্ষক ও কর্মচারীদের তথ্য যাচাই ও সক্রিয়করণ' : 'Review teacher & staff employment submissions and activate status'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {filteredStaff.length} {bn ? 'জন প্রার্থী' : 'Candidates'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingStaff ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filteredStaff.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    {bn ? 'কোনো শিক্ষক বা স্টাফ আবেদন পাওয়া যায়নি' : 'No staff recruitment applications found'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead>{bn ? 'শিক্ষক/স্টাফ নাম' : 'Name'}</TableHead>
                        <TableHead>{bn ? 'পদবি ও বিভাগ' : 'Designation'}</TableHead>
                        <TableHead>{bn ? 'বেতন' : 'Salary'}</TableHead>
                        <TableHead>{bn ? 'মোবাইল' : 'Mobile'}</TableHead>
                        <TableHead>{bn ? 'এনআইডি' : 'NID'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead>{bn ? 'আবেদনের তারিখ' : 'Date'}</TableHead>
                        <TableHead className="text-right">{bn ? 'পদক্ষেপ' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((s: any) => {
                        const staffDisplayName = s.name_bn || s.name_en || `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—';
                        const staffDisplayPhone = s.phone || s.mobile || '—';
                        return (
                          <TableRow key={s.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {s.photo_url ? (
                                  <img src={s.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border" />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center text-xs">
                                    {(staffDisplayName || 'T')[0]}
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium text-sm text-foreground">{staffDisplayName}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {((s.staff_data as any)?.application_no || s.staff_id) && (
                                      <span className="font-mono text-[10px] font-bold text-purple-600 bg-purple-500/10 px-1 py-0.2 rounded border border-purple-500/20">
                                        {(s.staff_data as any)?.application_no || s.staff_id}
                                      </span>
                                    )}
                                    {s.email && <span className="text-xs text-muted-foreground">{s.email}</span>}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">
                              <span className="font-medium">{s.designation || '—'}</span>
                              <span className="text-xs text-muted-foreground block">{s.staff_category || ''}</span>
                            </TableCell>
                            <TableCell className="text-sm font-semibold font-mono text-emerald-600 whitespace-nowrap">
                              {s.salary ? (
                                `৳ ${Number(s.salary).toLocaleString('en-IN')}`
                              ) : (
                                <span className="text-xs text-amber-600 font-normal italic">{bn ? 'নির্ধারিত হয়নি' : 'Not set'}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-mono">{staffDisplayPhone}</TableCell>
                            <TableCell className="text-xs font-mono">{s.nid || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_COLORS[s.status] || ''}>
                                {s.status === 'active' ? (bn ? 'সক্রিয়/অনুমোদিত' : 'Active') : s.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অনুমোদন প্রযোজ্য' : 'Pending')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(s.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setDetailModal({ type: 'staff', data: s })}
                                  title={bn ? 'বিস্তারিত' : 'View'}
                                >
                                  <Eye className="w-4 h-4 text-primary" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 px-2.5 gap-1 text-xs border-primary/30 text-primary hover:bg-primary/10"
                                  onClick={() => navigate(`/admin/staff/edit/${s.id}?from=approvals&mode=approve`)}
                                  title={bn ? 'পূর্ণ ফর্ম পর্যালোচনা ও সংশোধন করুন' : 'Review & Edit Full Form'}
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                  {bn ? 'কারেকশন' : 'Edit'}
                                </Button>
                                {s.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5 gap-1 shadow-sm font-medium"
                                      onClick={() => openStaffApprovalModal(s)}
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      {bn ? 'অনুমোদন' : 'Approve'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-8 px-2.5 gap-1"
                                      onClick={() => staffMutation.mutate({ id: s.id, status: 'rejected' })}
                                      disabled={staffMutation.isPending}
                                    >
                                      <X className="w-3.5 h-3.5" />
                                      {bn ? 'বাতিল' : 'Reject'}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════ TAB: FINANCE & ACCOUNTS ══════════════ */}
          <TabsContent value="finance" className="mt-0">
            <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Coins className="w-5 h-5 text-emerald-600" />
                      {bn ? 'হিসাব ও লেনদেন অনুমোদন (Finance & Accounts)' : 'Finance & Accounts Approvals'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {bn ? 'সহকারী বা কর্মীদের এন্ট্রি করা ব্যয় ভাউচার, ফি ছাড়, বেতন ও অন্যান্য আর্থিক অনুমোদন' : 'Approve expense vouchers, fee discounts, payroll & financial records'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {filteredFinanceActions.length} {bn ? 'টি লেনদেন' : 'Records'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingActions ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filteredFinanceActions.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Coins className="w-12 h-12 mx-auto mb-2 opacity-30 text-emerald-600" />
                    {bn ? 'কোনো আর্থিক হিসাব বা ব্যয় ভাউচার অনুমোদনের অপেক্ষায় নেই' : 'No financial approval requests pending'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead>{bn ? 'খাত / বিবরণ' : 'Description / Title'}</TableHead>
                        <TableHead>{bn ? 'মডিউল' : 'Module'}</TableHead>
                        <TableHead>{bn ? 'টাকার পরিমাণ' : 'Amount'}</TableHead>
                        <TableHead>{bn ? 'অনুরোধকারী' : 'Prepared By'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                        <TableHead className="text-right">{bn ? 'পদক্ষেপ' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFinanceActions.map((action: any) => {
                        const amount = action.payload?.amount || action.payload?.net_salary || action.payload?.total_amount || 0;
                        const meta = TABLE_MODULE_MAP[action.target_table] || { labelBn: action.target_table, icon: '💰' };
                        return (
                          <TableRow key={action.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <p className="font-semibold text-sm text-foreground">
                                  {action.payload?.title || action.payload?.name || action.payload?._description || 'আর্থিক লেনদেন'}
                                </p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {action.payload?.voucher_no ? `ভাউচার: ${action.payload.voucher_no}` : action.target_table}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs gap-1 border-primary/20 bg-primary/5">
                                <span>{meta.icon}</span>
                                <span>{meta.labelBn}</span>
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="font-mono font-bold text-base text-emerald-600">
                                ৳ {Number(amount).toLocaleString('en-IN')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-xs">{action.user_name || 'Staff'}</p>
                                <p className="text-[11px] text-muted-foreground">{action.user_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_COLORS[action.status] || ''}>
                                {action.status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') : action.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অনুমোদন প্রযোজ্য' : 'Pending')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(action.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setDetailModal({ type: 'action', data: action });
                                    setAdminNote(action.admin_note || '');
                                  }}
                                  title={bn ? 'বিস্তারিত' : 'View Details'}
                                >
                                  <Eye className="w-4 h-4 text-primary" />
                                </Button>
                                {action.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5"
                                      onClick={() => pendingActionMutation.mutate({ id: action.id, status: 'approved' })}
                                      disabled={pendingActionMutation.isPending}
                                    >
                                      <Check className="w-3.5 h-3.5 mr-1" />
                                      {bn ? 'অনুমোদন' : 'Approve'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-8 px-2.5"
                                      onClick={() => {
                                        setDetailModal({ type: 'action', data: action });
                                        setAdminNote(action.admin_note || '');
                                        toast.info(bn ? 'প্রত্যাখ্যানের কারণ লিখুন' : 'Enter rejection reason');
                                      }}
                                    >
                                      <X className="w-3.5 h-3.5 mr-1" />
                                      {bn ? 'বাতিল' : 'Reject'}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════ TAB 3: PAYMENT REQUESTS ══════════════ */}
          <TabsContent value="payments" className="mt-0">
            <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-emerald-600" />
                      {bn ? 'অভিভাবক পেমেন্ট স্লিপ ও TrxID যাচাই' : 'Parent Payment Verification'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {bn ? 'বিকাশ, নগদ, রকেট বা ব্যাংক জমা স্লিপ যাচাই করে অনুমোদন দিলে ফি স্বয়ংক্রিয়ভাবে সমন্বয় হয়' : 'Verify transaction ID or receipt slips. Approving reconciles fee payments automatically'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {filteredPayments.length} {bn ? 'টি রিকোয়েস্ট' : 'Requests'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingPayments ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filteredPayments.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Wallet className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    {bn ? 'কোনো পেমেন্ট অনুমোদন রিকোয়েস্ট পাওয়া যায়নি' : 'No payment requests found'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead>{bn ? 'মেথড' : 'Method'}</TableHead>
                        <TableHead>{bn ? 'টাকার পরিমাণ' : 'Amount'}</TableHead>
                        <TableHead>{bn ? 'ট্রানজেকশন আইডি (TrxID)' : 'TrxID'}</TableHead>
                        <TableHead>{bn ? 'স্লিপ' : 'Slip'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                        <TableHead className="text-right">{bn ? 'পদক্ষেপ' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((p: any) => (
                        <TableRow key={p.id} className="hover:bg-muted/30">
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">
                              {p.payment_method || 'Manual'}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-emerald-600 text-sm">
                            ৳ {p.amount}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-semibold">{p.transaction_id || '—'}</TableCell>
                          <TableCell>
                            {p.slip_url ? (
                              <a href={p.slip_url} target="_blank" rel="noreferrer" className="text-xs text-primary underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> {bn ? 'স্লিপ দেখুন' : 'View Slip'}
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_COLORS[p.status] || ''}>
                              {p.status === 'verified' ? (bn ? 'যাচাইকৃত' : 'Verified') : p.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অনুমোদন প্রযোজ্য' : 'Pending')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(p.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDetailModal({ type: 'payment', data: p })}
                                title={bn ? 'বিস্তারিত' : 'View'}
                              >
                                <Eye className="w-4 h-4 text-primary" />
                              </Button>
                              {p.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5"
                                    onClick={() => paymentMutation.mutate({ id: p.id, status: 'verified' })}
                                    disabled={paymentMutation.isPending}
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    {bn ? 'যাচাই' : 'Verify'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 px-2.5"
                                    onClick={() => setRejectionModal({ type: 'payment', id: p.id, name: `TrxID: ${p.transaction_id}` })}
                                  >
                                    <X className="w-3.5 h-3.5 mr-1" />
                                    {bn ? 'বাতিল' : 'Reject'}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════ TAB 4: STUDENT PORTAL ACCOUNTS ══════════════ */}
          <TabsContent value="accounts" className="mt-0">
            <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <UserCheck className="w-5 h-5 text-amber-600" />
                      {bn ? 'শিক্ষার্থী পোর্টাল অ্যাকাউন্ট অনুমোদন' : 'Student Portal Account Approvals'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {bn ? 'শিক্ষার্থী পোর্টালে লগইন করার জন্য নিবন্ধিত শিক্ষার্থীদের অ্যাকাউন্ট অনুমোদন করুন' : 'Approve registered student portal accounts to grant login access'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {filteredAccounts.length} {bn ? 'টি অ্যাকাউন্ট' : 'Accounts'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingAccounts ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filteredAccounts.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <UserCheck className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    {bn ? 'কোনো শিক্ষার্থী অ্যাকাউন্ট রিকোয়েস্ট নেই' : 'No student account requests found'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead>{bn ? 'শিক্ষার্থীর নাম' : 'Name'}</TableHead>
                        <TableHead>{bn ? 'শিক্ষার্থী আইডি' : 'Student ID'}</TableHead>
                        <TableHead>{bn ? 'যোগাযোগ / ইমেইল' : 'Contact'}</TableHead>
                        <TableHead>{bn ? 'OTP যাচাই' : 'OTP Verified'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                        <TableHead className="text-right">{bn ? 'পদক্ষেপ' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((a: any) => (
                        <TableRow key={a.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-sm">{a.full_name || '—'}</TableCell>
                          <TableCell className="font-mono text-xs font-semibold">{a.student_id || '—'}</TableCell>
                          <TableCell className="text-xs font-mono">{a.contact || '—'}</TableCell>
                          <TableCell>
                            {a.contact_verified ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                {bn ? 'যাচাইকৃত' : 'Verified'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                {bn ? 'যাচাইহীন' : 'Unverified'}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_COLORS[a.status] || ''}>
                              {a.status === 'active' ? (bn ? 'অনুমোদিত' : 'Approved') : a.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অনুমোদন প্রযোজ্য' : 'Pending')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(a.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {a.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5"
                                    onClick={() => accountMutation.mutate({ id: a.id, status: 'active' })}
                                    disabled={accountMutation.isPending}
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    {bn ? 'অনুমোদন' : 'Approve'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 px-2.5"
                                    onClick={() => setRejectionModal({ type: 'account', id: a.id, name: a.full_name })}
                                  >
                                    <X className="w-3.5 h-3.5 mr-1" />
                                    {bn ? 'বাতিল' : 'Reject'}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════ TAB 5: QUESTION PAPERS ══════════════ */}
          <TabsContent value="papers" className="mt-0">
            <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-indigo-600" />
                      {bn ? 'প্রশ্নপত্র যাচাই ও প্রকাশ অনুমোদন' : 'Question Paper Moderation & Approval'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {bn ? 'শিক্ষকদের তৈরি করা প্রশ্নপত্র প্রিন্ট বা পরীক্ষার জন্য চূড়ান্ত অনুমোদন দিন' : 'Review & approve question papers drafted by teachers before printing'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {filteredPapers.length} {bn ? 'টি প্রশ্নপত্র' : 'Papers'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingPapers ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filteredPapers.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    {bn ? 'কোনো প্রশ্নপত্র অনুমোদন রিকোয়েস্ট নেই' : 'No question papers pending approval'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead>{bn ? 'শিরোনাম' : 'Title'}</TableHead>
                        <TableHead>{bn ? 'পূর্ণমান' : 'Total Marks'}</TableHead>
                        <TableHead>{bn ? 'সময় (মিনিট)' : 'Duration'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                        <TableHead className="text-right">{bn ? 'পদক্ষেপ' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPapers.map((paper: any) => (
                        <TableRow key={paper.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-sm">{paper.title}</TableCell>
                          <TableCell className="text-sm font-semibold">{paper.total_marks || '100'}</TableCell>
                          <TableCell className="text-sm">{paper.duration_minutes ? `${paper.duration_minutes} min` : '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_COLORS[paper.status] || ''}>
                              {paper.status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') : paper.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অনুমোদন প্রযোজ্য' : 'Pending')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(paper.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {paper.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5"
                                    onClick={() => paperMutation.mutate({ id: paper.id, status: 'approved' })}
                                    disabled={paperMutation.isPending}
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    {bn ? 'অনুমোদন' : 'Approve'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 px-2.5"
                                    onClick={() => setRejectionModal({ type: 'paper', id: paper.id, name: paper.title })}
                                  >
                                    <X className="w-3.5 h-3.5 mr-1" />
                                    {bn ? 'বাতিল' : 'Reject'}
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════ TAB 6: MAKER-CHECKER HUB ══════════════ */}
          <TabsContent value="actions" className="mt-0">
            <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-rose-600" />
                      {bn ? 'সার্বিক মেকার-চেকার হাব (All Module Maker-Checker Hub)' : 'All Module Maker-Checker Hub'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {bn ? 'সফটওয়্যারের যেকোনো মডিউলে সাধারণ কর্মীদের দ্বারা নতুন তথ্য যোগ, সম্পাদনা বা মোছার অনুমোদনের কেন্দ্রীয় কমান্ড সেন্টার' : 'Universal approval command center for Add, Edit & Delete operations across all modules'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs self-start md:self-auto">
                    {filteredActions.length} {bn ? 'টি রিকোয়েস্ট' : 'Requests'}
                  </Badge>
                </div>

                {/* Sub-Filters: Module Category and Action Type */}
                <div className="pt-3 border-t border-border/40 mt-3 flex flex-col gap-2.5">
                  {/* Category Filter */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                      {bn ? 'মডিউল বিভাগ:' : 'Module Category:'}
                    </span>
                    {[
                      { id: 'all', label: bn ? 'সব মডিউল' : 'All Modules' },
                      { id: 'finance', label: bn ? '💰 হিসাব ও অর্থ' : '💰 Finance' },
                      { id: 'students', label: bn ? '🎓 শিক্ষার্থী ও ক্লাস' : '🎓 Students' },
                      { id: 'staff', label: bn ? '👨‍🏫 শিক্ষক ও কর্মী' : '👨‍🏫 Staff' },
                      { id: 'academic', label: bn ? '📝 পরীক্ষা ও ফলাফল' : '📝 Academic' },
                      { id: 'identity', label: bn ? '📜 আইডি ও সনদ' : '📜 Certificates' },
                      { id: 'inventory', label: bn ? '📦 ইনভেন্টরি ও সম্পদ' : '📦 Assets' },
                      { id: 'other', label: bn ? '⚙️ অন্যান্য' : '⚙️ Other' },
                    ].map((cat) => (
                      <Button
                        key={cat.id}
                        size="sm"
                        variant={actionModuleFilter === cat.id ? 'default' : 'outline'}
                        onClick={() => setActionModuleFilter(cat.id)}
                        className={`h-7 px-2.5 text-[11px] rounded-lg ${actionModuleFilter === cat.id ? 'btn-primary-gradient shadow-xs' : 'bg-background/80'}`}
                      >
                        {cat.label}
                      </Button>
                    ))}
                  </div>

                  {/* Action Type Filter */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-1">
                      {bn ? 'অ্যাকশন ধরন:' : 'Action Type:'}
                    </span>
                    {[
                      { id: 'all', label: bn ? 'সব ধরন' : 'All Types', icon: Layers },
                      { id: 'add', label: bn ? '➕ নতুন যোগ' : '➕ Add New', icon: PlusCircle },
                      { id: 'edit', label: bn ? '✏️ সম্পাদনা' : '✏️ Edit', icon: Edit },
                      { id: 'delete', label: bn ? '🗑️ মুছে ফেলা' : '🗑️ Delete', icon: Trash2 },
                    ].map((act) => (
                      <Button
                        key={act.id}
                        size="sm"
                        variant={actionTypeFilter === act.id ? 'secondary' : 'ghost'}
                        onClick={() => setActionTypeFilter(act.id as any)}
                        className={`h-6 px-2 text-[11px] border border-transparent ${actionTypeFilter === act.id ? 'border-primary/30 font-bold bg-primary/10 text-primary' : 'text-muted-foreground'}`}
                      >
                        {act.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingActions ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : filteredActions.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <ShieldCheck className="w-12 h-12 mx-auto mb-2 opacity-30 text-rose-500" />
                    {bn ? 'নির্বাচিত ফিল্টারে কোনো মেকার-চেকার অনুমোদন রিকোয়েস্ট নেই' : 'No audit action requests found in this filter'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead>{bn ? 'অনুরোধকারী' : 'User'}</TableHead>
                        <TableHead>{bn ? 'অ্যাকশন ধরন' : 'Action'}</TableHead>
                        <TableHead>{bn ? 'টার্গেট মডিউল / খাত' : 'Module'}</TableHead>
                        <TableHead>{bn ? 'বিবরণ / সারসংক্ষেপ' : 'Description'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead>{bn ? 'তারিখ' : 'Date'}</TableHead>
                        <TableHead className="text-right">{bn ? 'পদক্ষেপ' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredActions.map((action: any) => {
                        const meta = TABLE_MODULE_MAP[action.target_table] || { labelBn: action.target_table, icon: '📁' };
                        return (
                          <TableRow key={action.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{action.user_name || '—'}</p>
                                <p className="text-xs text-muted-foreground">{action.user_email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={
                                  action.action_type === 'delete'
                                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                    : action.action_type === 'edit'
                                    ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                    : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                                }
                              >
                                {action.action_type === 'add'
                                  ? bn ? '➕ নতুন যোগ' : '➕ Add'
                                  : action.action_type === 'edit'
                                  ? bn ? '✏️ সম্পাদনা' : '✏️ Edit'
                                  : action.action_type === 'delete'
                                  ? bn ? '🗑️ মুছে ফেলা' : '🗑️ Delete'
                                  : action.action_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs gap-1 border-muted-foreground/20 font-medium">
                                <span>{meta.icon}</span>
                                <span>{meta.labelBn}</span>
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                              {action.payload?._description || action.payload?.title || action.payload?.name_bn || action.payload?.full_name || '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_COLORS[action.status] || ''}>
                                {action.status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') : action.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অনুমোদন প্রযোজ্য' : 'Pending')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(action.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setDetailModal({ type: 'action', data: action });
                                    setAdminNote(action.admin_note || '');
                                  }}
                                  title={bn ? 'বিস্তারিত' : 'View Details'}
                                >
                                  <Eye className="w-4 h-4 text-primary" />
                                </Button>
                                {action.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5"
                                      onClick={() => pendingActionMutation.mutate({ id: action.id, status: 'approved' })}
                                      disabled={pendingActionMutation.isPending}
                                    >
                                      <Check className="w-3.5 h-3.5 mr-1" />
                                      {bn ? 'অনুমোদন' : 'Approve'}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      className="h-8 px-2.5"
                                      onClick={() => {
                                        setDetailModal({ type: 'action', data: action });
                                        setAdminNote(action.admin_note || '');
                                        toast.info(bn ? 'প্রত্যাখ্যানের কারণ লিখুন' : 'Enter rejection reason');
                                      }}
                                    >
                                      <X className="w-3.5 h-3.5 mr-1" />
                                      {bn ? 'বাতিল' : 'Reject'}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════════════ TAB 7: DEVICE APPROVALS ══════════════ */}
          <TabsContent value="devices" className="mt-0">
            <Card className="rounded-2xl border-border shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 px-6 py-4 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-teal-600" />
                      {bn ? 'ডিভাইস লগইন অনুমোদন' : 'Device Login Authorizations'}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {bn ? 'নতুন কম্পিউটার বা মোবাইল থেকে আসা ইউজারদের অনুমোদন দিয়ে সাইবার সিকিউরিটি রক্ষা করুন' : 'Approve trusted devices to enforce zero-trust visitor security'}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="font-mono text-xs">
                    {deviceRequests.length} {bn ? 'টি রিকোয়েস্ট' : 'Requests'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingDevices ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                ) : deviceRequests.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Smartphone className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    {bn ? 'কোনো নতুন ডিভাইস অনুমোদন অপেক্ষায় নেই' : 'No device authorization requests pending'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead>{bn ? 'ইউজার' : 'User'}</TableHead>
                        <TableHead>{bn ? 'ব্রাউজার ও ওএস' : 'Browser & OS'}</TableHead>
                        <TableHead>{bn ? 'আইপি অ্যাড্রেস' : 'IP'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead>{bn ? 'সময়' : 'Time'}</TableHead>
                        <TableHead className="text-right">{bn ? 'পদক্ষেপ' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deviceRequests.map((d: any) => (
                        <TableRow key={d.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-sm">{d.user_email || d.user_name || 'User'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {d.device_browser || 'Browser'} / {d.device_os || 'OS'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{d.ip_address || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                              {bn ? 'অনুমোদন প্রযোজ্য' : 'Pending'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(d.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5"
                                onClick={() => deviceMutation.mutate({ id: d.id, action: 'approve' })}
                                disabled={deviceMutation.isPending}
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                {bn ? 'অনুমোদন' : 'Allow'}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-8 px-2.5"
                                onClick={() => deviceMutation.mutate({ id: d.id, action: 'reject' })}
                                disabled={deviceMutation.isPending}
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                {bn ? 'ব্লক' : 'Block'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ══════════════ DETAIL MODAL ══════════════ */}
        <Dialog open={!!detailModal} onOpenChange={(open) => { if (!open) setDetailModal(null); }}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-primary" />
                  {bn ? 'রিকোয়েস্ট বিস্তারিত' : 'Request Details'}
                </div>
              </DialogTitle>
            </DialogHeader>

            {detailModal && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Custom Rendering based on type */}
                {detailModal.type === 'student' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border">
                      {detailModal.data.photo_url ? (
                        <img src={detailModal.data.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xl">
                          {(detailModal.data.name_bn || 'S')[0]}
                        </div>
                      )}
                      {(() => {
                        const displayNames = getStaffDisplayNames(detailModal.data.name_bn, detailModal.data.name_en, bn);
                        return (
                          <div>
                            <h3 className="font-bold text-lg">{displayNames.primary || '—'}</h3>
                            {displayNames.secondary && <p className="text-sm text-muted-foreground">{displayNames.secondary}</p>}
                            <Badge variant="outline" className="mt-1">
                              {bn ? 'রোল:' : 'Roll:'} {detailModal.data.roll_number || (bn ? 'বরাদ্দ বাকি' : 'Unassigned')}
                            </Badge>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm bg-card p-4 rounded-xl border">
                      <div><p className="text-muted-foreground text-xs">{bn ? 'পিতার নাম' : 'Father Name'}</p><p className="font-medium">{detailModal.data.father_name || '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">{bn ? 'মাতার নাম' : 'Mother Name'}</p><p className="font-medium">{detailModal.data.mother_name || '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">{bn ? 'মোবাইল' : 'Phone'}</p><p className="font-medium font-mono">{detailModal.data.phone || '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">{bn ? 'রক্তের গ্রুপ' : 'Blood Group'}</p><p className="font-medium">{detailModal.data.blood_group || '—'}</p></div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 gap-1.5"
                        onClick={() => {
                          const s = detailModal.data;
                          setDetailModal(null);
                          setEditStudentForModal(s);
                          setShowEditAdmissionForm(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                        {bn ? 'কারেকশন / পূর্ণ ফর্ম রিভিউ' : 'Review & Edit Full Form'}
                      </Button>
                      <Button
                        type="button"
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium"
                        onClick={() => {
                          const s = detailModal.data;
                          setDetailModal(null);
                          openStudentApprovalModal(s);
                        }}
                      >
                        <ShieldCheck className="w-4 h-4" />
                        {bn ? 'রোল নির্ধারণ ও অনুমোদন' : 'Assign Roll & Approve'}
                      </Button>
                    </div>
                  </div>
                )}

                {detailModal.type === 'staff' && (() => {
                  const s = detailModal.data;
                  const displayName = s.name_bn || s.name_en || `${s.first_name || ''} ${s.last_name || ''}`.trim() || '—';
                  const displayPhone = s.phone || s.mobile || '—';
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xl">
                            {(displayName || 'T')[0]}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg">{displayName}</h3>
                          <p className="text-sm text-muted-foreground">{s.designation || 'Staff'} {s.department ? `• ${s.department}` : ''}</p>
                          <Badge variant="outline" className="mt-1">
                            {s.staff_category || 'General'}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm bg-card p-4 rounded-xl border">
                        <div><p className="text-muted-foreground text-xs">{bn ? 'মোবাইল' : 'Mobile'}</p><p className="font-medium font-mono">{displayPhone}</p></div>
                        <div><p className="text-muted-foreground text-xs">{bn ? 'ইমেইল' : 'Email'}</p><p className="font-medium">{s.email || '—'}</p></div>
                        <div><p className="text-muted-foreground text-xs">{bn ? 'জাতীয় পরিচয়পত্র (NID)' : 'NID'}</p><p className="font-medium font-mono">{s.nid || '—'}</p></div>
                        <div><p className="text-muted-foreground text-xs">{bn ? 'বেতন' : 'Salary'}</p><p className="font-semibold text-emerald-600 font-mono">৳ {s.salary ? Number(s.salary).toLocaleString('en-IN') : (bn ? 'নির্ধারিত হয়নি' : 'Not set')}</p></div>
                        {s.education && <div className="col-span-2"><p className="text-muted-foreground text-xs">{bn ? 'শিক্ষাগত যোগ্যতা' : 'Education'}</p><p className="font-medium">{s.education}</p></div>}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 gap-1.5"
                          onClick={() => {
                            const id = s.id;
                            setDetailModal(null);
                            navigate(`/admin/staff/edit/${id}?from=approvals&mode=approve`);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                          {bn ? 'কারেকশন / পূর্ণ ফর্ম রিভিউ' : 'Review & Edit Full Form'}
                        </Button>
                        {s.status === 'pending' && (
                          <Button
                            type="button"
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-bold shadow-sm"
                            onClick={() => {
                              const staffObj = s;
                              setDetailModal(null);
                              openStaffApprovalModal(staffObj);
                            }}
                          >
                            <Check className="w-4 h-4" />
                            {bn ? 'অনুমোদন ও বেতন নির্ধারণ' : 'Approve & Set Salary'}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {detailModal.type === 'payment' && (
                  <div className="space-y-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                      <p className="text-xs text-muted-foreground uppercase">{bn ? 'টাকার পরিমাণ' : 'Amount'}</p>
                      <p className="text-3xl font-extrabold text-emerald-600 mt-1">৳ {detailModal.data.amount}</p>
                      <Badge className="mt-2 capitalize bg-emerald-600 text-white">{detailModal.data.payment_method}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm bg-card p-4 rounded-xl border">
                      <div><p className="text-muted-foreground text-xs">{bn ? 'ট্রানজেকশন আইডি (TrxID)' : 'TrxID'}</p><p className="font-mono font-bold text-sm">{detailModal.data.transaction_id || '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">{bn ? 'তারিখ' : 'Date'}</p><p className="font-medium">{new Date(detailModal.data.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US')}</p></div>
                    </div>

                    {detailModal.data.slip_url && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">{bn ? 'পেমেন্ট স্লিপ ইমেজ:' : 'Payment Receipt Slip Image:'}</p>
                        <a href={detailModal.data.slip_url} target="_blank" rel="noreferrer">
                          <img src={detailModal.data.slip_url} alt="Slip" className="w-full max-h-72 object-contain rounded-xl border bg-slate-900/5 shadow-inner" />
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {detailModal.type === 'action' && (() => {
                  const action = detailModal.data;
                  const payload = action.payload || {};
                  const amount = payload.amount || payload.net_salary || payload.total_amount;
                  const meta = TABLE_MODULE_MAP[action.target_table] || { labelBn: action.target_table, icon: '📁' };
                  const displayEntries = Object.entries(payload).filter(([k]) => !k.startsWith('_') && k !== 'ids');

                  return (
                    <div className="space-y-4">
                      {/* Action Header Card */}
                      <div className="bg-muted/40 p-4 rounded-xl border space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
                          <div>
                            <span className="text-xs text-muted-foreground">{bn ? 'অনুরোধকারী:' : 'Requested By:'}</span>
                            <p className="font-bold text-sm text-foreground">{action.user_name || '—'}</p>
                            <p className="text-xs text-muted-foreground">{action.user_email}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs gap-1">
                              <span>{meta.icon}</span>
                              <span>{meta.labelBn}</span>
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                action.action_type === 'delete'
                                  ? 'bg-rose-500/10 text-rose-600 border-rose-500/30'
                                  : action.action_type === 'edit'
                                  ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                              }
                            >
                              {action.action_type === 'add'
                                ? bn ? '➕ নতুন যোগ' : '➕ Add'
                                : action.action_type === 'edit'
                                ? bn ? '✏️ সম্পাদনা' : '✏️ Edit'
                                : action.action_type === 'delete'
                                ? bn ? '🗑️ মুছে ফেলা' : '🗑️ Delete'
                                : action.action_type}
                            </Badge>
                          </div>
                        </div>

                        {payload._description && (
                          <div className="text-xs bg-card p-2.5 rounded-lg border">
                            <span className="font-semibold text-muted-foreground">{bn ? 'বিবরণ:' : 'Description:'} </span>
                            <span className="text-foreground">{payload._description}</span>
                          </div>
                        )}

                        {action.status === 'pending' && (
                          <div className="flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 bg-amber-500/10 px-3 py-2 rounded-lg border border-amber-500/20 font-medium">
                            <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                            <span>{bn ? 'অনুমোদন করার পর কার্যকর হবে' : 'Will take effect after approval'}</span>
                          </div>
                        )}
                      </div>

                      {/* If amount exists, prominent highlight card */}
                      {amount !== undefined && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                          <p className="text-xs text-muted-foreground uppercase">{bn ? 'টাকার পরিমাণ' : 'Amount'}</p>
                          <p className="text-3xl font-extrabold text-emerald-600 mt-1">
                            ৳ {Number(amount).toLocaleString('en-IN')}
                          </p>
                        </div>
                      )}

                      {/* Formatted Key-Value Grid */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                          {bn ? 'পরিবর্তন বা এন্ট্রিকৃত তথ্যাবলী' : 'Submitted Field Details'}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-card p-4 rounded-xl border max-h-60 overflow-y-auto">
                          {displayEntries.length === 0 ? (
                            <p className="text-xs text-muted-foreground col-span-2">{bn ? 'কোনো অতিরিক্ত তথ্য নেই' : 'No extra fields'}</p>
                          ) : (
                            displayEntries.map(([k, v]) => (
                              <div key={k} className="p-2 rounded-lg bg-muted/20 border border-border/40 text-xs">
                                <p className="text-muted-foreground font-medium text-[11px]">
                                  {FIELD_LABEL_MAP[k] || k}
                                </p>
                                <p className="font-semibold text-foreground mt-0.5 break-all">
                                  {typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Collapsible Developer JSON */}
                      <div className="border border-border/40 rounded-xl overflow-hidden">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30"
                          onClick={() => setShowRawJson(!showRawJson)}
                        >
                          <span>{bn ? '🛠️ ডেভেলপার কোড ভিউ (Raw JSON)' : '🛠️ Raw JSON View'}</span>
                          {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        {showRawJson && (
                          <pre className="bg-slate-950 text-slate-50 p-4 text-xs overflow-auto max-h-48 font-mono border-t border-border/30">
                            {JSON.stringify(payload, null, 2)}
                          </pre>
                        )}
                      </div>

                      {action.status === 'pending' && (
                        <div className="space-y-3 pt-2">
                          <Textarea
                            placeholder={bn ? 'প্রত্যাখ্যান বা অনুমোদনের মন্তব্য লিখুন...' : 'Admin note for approval or rejection...'}
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            className="min-h-[80px]"
                          />
                          <div className="flex gap-2">
                            <Button
                              className="flex-1 btn-primary-gradient"
                              onClick={() => pendingActionMutation.mutate({ id: action.id, status: 'approved', note: adminNote })}
                              disabled={pendingActionMutation.isPending}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              {bn ? 'অনুমোদন করুন' : 'Approve Action'}
                            </Button>
                            <Button
                              variant="destructive"
                              className="flex-1"
                              onClick={() => pendingActionMutation.mutate({ id: action.id, status: 'rejected', note: adminNote })}
                              disabled={pendingActionMutation.isPending || !adminNote.trim()}
                            >
                              <X className="w-4 h-4 mr-2" />
                              {bn ? 'প্রত্যাখ্যান করুন' : 'Reject Action'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ══════════════ STAFF APPROVAL & REVIEW MODAL ══════════════ */}
        <Dialog open={!!staffApprovalModal} onOpenChange={(open) => { if (!open) setStaffApprovalModal(null); }}>
          <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 py-4 border-b bg-muted/40">
              <DialogTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-600 text-white">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold">{bn ? 'শিক্ষক/স্টাফ আবেদন অনুমোদন ও বেতন নির্ধারণ' : 'Approve Staff Application & Set Salary'}</span>
                    <p className="text-xs text-muted-foreground font-normal mt-0.5">
                      {bn ? 'আবেদনকারীর তথ্য পর্যালোচনা করুন, বেতন ও স্বাক্ষর তথ্য প্রদান করে অনুমোদন নিশ্চিত করুন' : 'Review candidate details, assign salary, provide signatory info and approve'}
                    </p>
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>

            {staffApprovalModal && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Candidate Overview Card */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/30">
                  <div className="flex items-center gap-4">
                    {staffApprovalModal.photo_url ? (
                      <img src={staffApprovalModal.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover border shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-2xl border">
                        {(staffApprovalModal.name_bn || staffApprovalModal.first_name || 'T')[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {staffApprovalModal.name_bn || staffApprovalModal.name_en || `${staffApprovalModal.first_name || ''} ${staffApprovalModal.last_name || ''}`.trim()}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium">
                        {staffApprovalModal.designation || 'Staff'} {staffApprovalModal.department ? `• ${staffApprovalModal.department}` : ''}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                        {(staffApprovalModal.phone || staffApprovalModal.mobile) && (
                          <span className="font-mono">📱 {staffApprovalModal.phone || staffApprovalModal.mobile}</span>
                        )}
                        {staffApprovalModal.nid && <span className="font-mono">🆔 {staffApprovalModal.nid}</span>}
                        {staffApprovalModal.education && <span>🎓 {staffApprovalModal.education}</span>}
                        {(staffApprovalModal.marital_status || staffApprovalModal.staff_data?.marital_status) && <span>💍 {translateMaritalStatus(staffApprovalModal.marital_status || staffApprovalModal.staff_data?.marital_status, bn)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Full Form Review & Correction Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs border-primary/40 text-primary hover:bg-primary/10 shrink-0"
                    onClick={() => {
                      const id = staffApprovalModal.id;
                      setStaffApprovalModal(null);
                      navigate(`/admin/staff/edit/${id}?from=approvals&mode=approve`);
                    }}
                  >
                    <Edit className="w-3.5 h-3.5" />
                    {bn ? 'পূর্ণ ফর্মে গিয়ে সব তথ্য কারেকশন করুন' : 'Review & Edit Full Form'}
                    <ExternalLink className="w-3 h-3 ml-0.5" />
                  </Button>
                </div>

                {/* 2. Salary & Residential Status Assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-emerald-600" />
                        {bn ? 'বেতন নির্ধারণ (টাকা)' : 'Salary (BDT)'} <span className="text-destructive">*</span>
                      </Label>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">৳</span>
                      <Input
                        type="number"
                        className="bg-background pl-8 text-base font-bold font-mono"
                        placeholder={bn ? 'যেমন: ১৫০০০' : 'e.g. 15000'}
                        value={staffSalary}
                        onChange={(e) => setStaffSalary(e.target.value)}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {bn ? 'কর্মীর মাসিক মূল বেতন হিসেবে কার্যকর হবে' : 'Active monthly salary'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-sm text-foreground flex items-center gap-1.5">
                        <Home className="w-4 h-4 text-blue-600" />
                        {bn ? 'আবাসিক ধরন নির্ধারণ' : 'Residential Status'} <span className="text-destructive">*</span>
                      </Label>
                    </div>
                    <Select value={staffResidenceType} onValueChange={setStaffResidenceType}>
                      <SelectTrigger className="bg-background text-sm font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="non_residential">{bn ? 'অনাবাসিক (Non-Residential)' : 'Non-Residential'}</SelectItem>
                        <SelectItem value="residential">{bn ? 'আবাসিক (Residential)' : 'Residential'}</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                      {bn ? 'অনুমোদনের পর কর্মীর আবাসন স্ট্যাটাস' : 'Residential status upon approval'}
                    </p>
                  </div>
                </div>

                {/* 3. Signatures for Print (স্বাক্ষর - প্রিন্ট/ডাউনলোডে দেখাবে) */}
                <div className="p-4 rounded-xl border bg-card space-y-3">
                  <h4 className="font-bold text-sm text-foreground border-b pb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    {bn ? 'স্বাক্ষর (প্রিন্ট/ডাউনলোডে দেখাবে)' : 'Signatures (shown in print/download)'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{bn ? 'অধ্যক্ষের নাম' : 'Principal Name'}</Label>
                      <Input
                        className="bg-background mt-1 h-9 text-xs"
                        value={principalName}
                        onChange={(e) => setPrincipalName(e.target.value)}
                        placeholder={bn ? 'অধ্যক্ষের নাম লিখুন' : 'Enter principal name'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'অধ্যক্ষের পদবী' : 'Principal Position'}</Label>
                      <Input
                        className="bg-background mt-1 h-9 text-xs"
                        value={principalPosition}
                        onChange={(e) => setPrincipalPosition(e.target.value)}
                        placeholder={bn ? 'পদবী' : 'Position'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'অন্য স্বাক্ষরকারীর নাম' : 'Other Signatory Name'}</Label>
                      <Input
                        className="bg-background mt-1 h-9 text-xs"
                        value={otherSignName}
                        onChange={(e) => setOtherSignName(e.target.value)}
                        placeholder={bn ? 'ঐচ্ছিক' : 'Optional'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'অন্য স্বাক্ষরকারীর পদবী' : 'Other Signatory Position'}</Label>
                      <Input
                        className="bg-background mt-1 h-9 text-xs"
                        value={otherSignPosition}
                        onChange={(e) => setOtherSignPosition(e.target.value)}
                        placeholder={bn ? 'ঐচ্ছিক' : 'Optional'}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Approver Details (এপ্রোভকারীর তথ্য) */}
                <div className="p-4 rounded-xl border bg-card space-y-3">
                  <h4 className="font-bold text-sm text-foreground border-b pb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {bn ? 'এপ্রোভকারীর তথ্য' : 'Approver Details'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">{bn ? 'এপ্রোভকারীর নাম' : "Approver's Name"} <span className="text-destructive">*</span></Label>
                      <Input
                        className="bg-background mt-1 h-9 text-xs"
                        value={approverName}
                        onChange={(e) => setApproverName(e.target.value)}
                        placeholder={bn ? 'আপনার বা কর্তৃপক্ষের নাম' : 'Enter name'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'পদবী' : 'Position'} <span className="text-destructive">*</span></Label>
                      <Input
                        className="bg-background mt-1 h-9 text-xs"
                        value={approverPosition}
                        onChange={(e) => setApproverPosition(e.target.value)}
                        placeholder={bn ? 'পদবী' : 'Position'}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'স্বাক্ষর (আপলোড বা প্রিন্টে বক্স দেখাবে)' : 'Signature (upload or box shown in print)'}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          ref={staffApproverSigRef}
                          type="file"
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.webp"
                          onChange={handleStaffApproverSigUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={uploadingSig}
                          onClick={() => staffApproverSigRef.current?.click()}
                          className="gap-1 h-9 text-xs"
                        >
                          {uploadingSig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          {bn ? 'স্বাক্ষর আপলোড' : 'Upload Signature'}
                        </Button>
                        {approverSignatureUrl && (
                          <div className="flex items-center gap-2 bg-muted/40 p-1 rounded border">
                            <img src={approverSignatureUrl} alt="Signature" className="h-7 max-w-[100px] object-contain rounded" />
                            <button
                              type="button"
                              onClick={() => setApproverSignatureUrl('')}
                              className="text-destructive hover:opacity-80 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                        {!approverSignatureUrl && !uploadingSig && (
                          <span className="text-[11px] text-muted-foreground">{bn ? 'স্বাক্ষর না দিলে প্রিন্টে ফাঁকা বক্স দেখাবে' : 'Blank box in print'}</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'তারিখ' : 'Date'}</Label>
                      <DatePicker
                        bengali={bn}
                        className="mt-1 h-9 text-xs"
                        value={approverDate}
                        onChange={(v) => setApproverDate(v)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="px-6 py-3 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStaffApprovalModal(null)}
              >
                {bn ? 'বন্ধ করুন' : 'Cancel'}
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold px-6 shadow-md shadow-emerald-600/20"
                onClick={() => approveStaffWithDetailsMutation.mutate()}
                disabled={approveStaffWithDetailsMutation.isPending || uploadingSig}
              >
                {approveStaffWithDetailsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {bn ? 'অনুমোদন ও সক্রিয় করুন' : 'Save & Approve Application'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ══════════════ STUDENT ADMISSION APPROVAL & REVIEW MODAL ══════════════ */}
        <Dialog open={!!studentApprovalModal} onOpenChange={(open) => { if (!open) setStudentApprovalModal(null); }}>
          <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b bg-muted/40">
              <DialogTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2 font-bold text-lg">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  {bn ? 'শিক্ষার্থী ভর্তি আবেদন ও অনুমোদন পর্যালোচনা' : 'Student Admission Review & Approval'}
                </span>
                {studentApprovalModal && (
                  <Badge variant="outline" className={STATUS_COLORS[studentApprovalModal.approval_status || 'pending']}>
                    {studentApprovalModal.approval_status === 'approved'
                      ? (bn ? 'অনুমোদিত' : 'Approved')
                      : studentApprovalModal.approval_status === 'rejected'
                      ? (bn ? 'বাতিল' : 'Rejected')
                      : (bn ? 'অনুমোদন প্রযোজ্য' : 'Pending')}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            {studentApprovalModal && (
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Candidate Overview Card */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/30">
                  <div className="flex items-center gap-4">
                    {studentApprovalModal.photo_url ? (
                      <img src={studentApprovalModal.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover border shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-2xl border">
                        {(studentApprovalModal.name_bn || studentApprovalModal.name_en || 'S')[0]}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-base text-foreground">
                        {studentApprovalModal.name_bn || studentApprovalModal.name_en || '—'}
                      </h3>
                      {studentApprovalModal.name_en && studentApprovalModal.name_bn && (
                        <p className="text-xs text-muted-foreground font-medium">{studentApprovalModal.name_en}</p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                        {(studentApprovalModal.admission_data?.application_no || studentApprovalModal.student_id) && (
                          <Badge variant="outline" className="font-mono font-bold text-[10px] border-primary/30 text-primary bg-primary/5">
                            App ID: {studentApprovalModal.admission_data?.application_no || studentApprovalModal.student_id}
                          </Badge>
                        )}
                        {studentApprovalModal.phone && (
                          <span className="font-mono">📱 {studentApprovalModal.phone}</span>
                        )}
                        {studentApprovalModal.gender && <span>👤 {studentApprovalModal.gender}</span>}
                        {studentApprovalModal.blood_group && <span>🩸 {studentApprovalModal.blood_group}</span>}
                        {studentApprovalModal.student_category && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                            {studentApprovalModal.student_category === 'poor' ? 'অসচ্ছল' : studentApprovalModal.student_category}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="border-primary/40 text-primary hover:bg-primary/10 gap-2 shrink-0"
                    onClick={() => {
                      setEditStudentForModal(studentApprovalModal);
                      setShowEditAdmissionForm(true);
                    }}
                  >
                    <Edit className="w-4 h-4" />
                    {bn ? 'সম্পূর্ণ ফর্ম এডিট / সংশোধন' : 'Review & Edit Full Form'}
                  </Button>
                </div>

                {/* 2. Application Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Academic Info */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <BookOpen className="w-4 h-4 text-primary" />
                      {bn ? 'একাডেমিক তথ্য' : 'Academic Information'}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'ভর্তি সেশন' : 'Session'}</span>
                        <span className="font-medium text-foreground">{studentApprovalModal.admission_session || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'শ্রেণি' : 'Class'}</span>
                        <span className="font-medium text-foreground">
                          {studentApprovalModal.classes?.name_bn || studentApprovalModal.classes?.name || studentApprovalModal.admission_class || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'বিভাগ' : 'Division'}</span>
                        <span className="font-medium text-foreground">
                          {studentApprovalModal.classes?.divisions?.name_bn || studentApprovalModal.classes?.divisions?.name || studentApprovalModal.admission_division || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'আবেদনের তারিখ' : 'Admission Date'}</span>
                        <span className="font-medium text-foreground font-mono">
                          {studentApprovalModal.admission_date || new Date(studentApprovalModal.created_at).toLocaleDateString(bn ? 'bn-BD' : 'en-US')}
                        </span>
                      </div>
                      {studentApprovalModal.previous_institute && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground block">{bn ? 'পূর্ববর্তী প্রতিষ্ঠান' : 'Previous Institute'}</span>
                          <span className="font-medium text-foreground">{studentApprovalModal.previous_institute}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Parents Info */}
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      {bn ? 'পিতামাতা ও অভিভাবক' : 'Parents & Guardian'}
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'পিতার নাম' : 'Father Name'}</span>
                        <span className="font-medium text-foreground">{studentApprovalModal.father_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'পিতার মোবাইল' : 'Father Phone'}</span>
                        <span className="font-medium text-foreground font-mono">{studentApprovalModal.father_phone || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'মাতার নাম' : 'Mother Name'}</span>
                        <span className="font-medium text-foreground">{studentApprovalModal.mother_name || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'মাতার মোবাইল' : 'Mother Phone'}</span>
                        <span className="font-medium text-foreground font-mono">{studentApprovalModal.mother_phone || '—'}</span>
                      </div>
                      {studentApprovalModal.guardian_name && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground block">{bn ? 'অভিভাবক' : 'Guardian'}</span>
                          <span className="font-medium text-foreground">
                            {studentApprovalModal.guardian_name} {studentApprovalModal.guardian_relation ? `(${studentApprovalModal.guardian_relation})` : ''} - {studentApprovalModal.guardian_phone || ''}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Personal & Address */}
                  <div className="p-4 rounded-xl border bg-card space-y-3 md:col-span-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      {bn ? 'ব্যক্তিগত তথ্য ও ঠিকানা' : 'Personal & Address Information'}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'জন্ম তারিখ' : 'Date of Birth'}</span>
                        <span className="font-medium text-foreground font-mono">{studentApprovalModal.date_of_birth || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'জন্ম নিবন্ধন / NID' : 'Birth Reg / NID'}</span>
                        <span className="font-medium text-foreground font-mono">{studentApprovalModal.birth_certificate_no || studentApprovalModal.birth_reg_no || studentApprovalModal.nid || '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'ভর্তি ফি' : 'Admission Fee'}</span>
                        <span className="font-medium text-foreground font-mono">৳ {studentApprovalModal.admission_fee || '0'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">{bn ? 'মাসিক বেতন' : 'Monthly Fee'}</span>
                        <span className="font-medium text-foreground font-mono">৳ {studentApprovalModal.monthly_fee || '0'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">{bn ? 'বর্তমান ঠিকানা' : 'Present Address'}</span>
                        <span className="font-medium text-foreground">
                          {[studentApprovalModal.present_village, studentApprovalModal.present_post, studentApprovalModal.present_thana, studentApprovalModal.present_district].filter(Boolean).join(', ') || studentApprovalModal.present_address || '—'}
                        </span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground block">{bn ? 'স্থায়ী ঠিকানা' : 'Permanent Address'}</span>
                        <span className="font-medium text-foreground">
                          {[studentApprovalModal.permanent_village, studentApprovalModal.permanent_post, studentApprovalModal.permanent_thana, studentApprovalModal.permanent_district].filter(Boolean).join(', ') || studentApprovalModal.permanent_address || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Division Specific Custom Fields */}
                {studentApprovalModal.admission_data?.custom_fields && Object.keys(studentApprovalModal.admission_data.custom_fields).length > 0 && (
                  <div className="p-4 rounded-xl border bg-card space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      {bn ? 'বিভাগভিত্তিক অতিরিক্ত তথ্য (Custom Fields)' : 'Division Specific Information'}
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {Object.entries(studentApprovalModal.admission_data.custom_fields).map(([k, v]) => (
                        <div key={k} className="p-2 rounded-lg bg-muted/30">
                          <span className="text-[11px] text-muted-foreground block">{k}</span>
                          <span className="font-semibold text-foreground text-xs mt-0.5 block">{String(v || '—')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Office Assignment & Approval Card (রোল ও রেজিস্ট্রেশন বরাদ্দ) */}
                <div className="p-5 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-4">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        {bn ? 'অফিস ও অনুমোদন নির্ধারণ (রোল ও রেজিস্ট্রেশন বরাদ্দ)' : 'Office Approval & Roll/Registration Assignment'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {bn
                          ? 'পাবলিক পেজে রোল ও রেজিস্ট্রেশন গোপন রাখা হয়েছিল। আপনি অনুমোদন দিয়ে রোল ও রেজিস্ট্রেশন নম্বর চূড়ান্ত করুন।'
                          : 'Assign roll number and registration number to finalize admission.'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Roll Number Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground">
                          {bn ? 'রোল নম্বর *' : 'Roll Number *'}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10"
                          onClick={() => openStudentApprovalModal(studentApprovalModal)}
                          disabled={calculatingRoll}
                          title={bn ? 'পরবর্তী রোল পুনরায় হিসাব করুন' : 'Recalculate next roll'}
                        >
                          <RefreshCw className={`w-3 h-3 ${calculatingRoll ? 'animate-spin' : ''}`} />
                          {bn ? 'অটো রোল' : 'Auto'}
                        </Button>
                      </div>
                      <Input
                        value={assignedRoll}
                        onChange={(e) => {
                          const val = e.target.value;
                          setAssignedRoll(val);
                          handleAutoRegenerateReg(val);
                        }}
                        placeholder={bn ? 'যেমন: ১০১ বা ১০০১' : 'e.g. 101'}
                        className="h-10 font-mono font-bold text-base bg-background"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {bn ? '💡 শ্রেণি অনুযায়ী পরবর্তী ফাঁকা রোল অটো প্রস্তাবিত করা হয়েছে।' : 'Auto-suggested next roll for this class.'}
                      </p>
                    </div>

                    {/* Registration Number Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground">
                          {bn ? 'রেজিস্ট্রেশন নম্বর *' : 'Registration Number *'}
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[11px] gap-1 text-primary hover:bg-primary/10"
                          onClick={() => handleAutoRegenerateReg()}
                          title={bn ? 'রোল ও শিক্ষাবর্ষ অনুযায়ী রেজিস্ট্রেশন জেনারেট' : 'Generate registration'}
                        >
                          <Sparkles className="w-3 h-3" />
                          {bn ? 'অটো জেনারেট' : 'Auto Reg'}
                        </Button>
                      </div>
                      <Input
                        value={assignedReg}
                        onChange={(e) => setAssignedReg(e.target.value)}
                        placeholder={bn ? 'যেমন: HIFZ-2026101' : 'e.g. HIFZ-2026101'}
                        className="h-10 font-mono font-bold text-base bg-background"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {bn ? '💡 ফরম্যাট: [বিভাগ প্রিফিক্স]-[শিক্ষাবর্ষ][রোল]' : 'Format: [Prefix]-[Year][Roll]'}
                      </p>
                    </div>

                    {/* Student Category Field */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground">
                        {bn ? 'ছাত্রের ক্যাটাগরি *' : 'Student Category *'}
                      </Label>
                      <Select value={assignedCategory} onValueChange={setAssignedCategory}>
                        <SelectTrigger className="h-10 bg-background text-xs font-medium">
                          <SelectValue placeholder={bn ? 'ক্যাটাগরি নির্বাচন করুন' : 'Select Category'} />
                        </SelectTrigger>
                        <SelectContent>
                          {studentCategories.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {bn ? cat.name_bn : cat.name}
                            </SelectItem>
                          ))}
                          {studentCategories.length === 0 && (
                            <>
                              <SelectItem value="general">{bn ? 'সাধারণ' : 'General'}</SelectItem>
                              <SelectItem value="poor">{bn ? 'অসচ্ছল' : 'Insolvent'}</SelectItem>
                              <SelectItem value="orphan">{bn ? 'এতিম' : 'Orphan'}</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-[11px] text-muted-foreground">
                        {bn ? '💡 ভর্তির অনুমোদন অনুযায়ী ক্যাটাগরি নির্ধারণ করুন।' : 'Assign student category on admission.'}
                      </p>
                    </div>

                    {/* Free Student (No Fee) Toggle */}
                    <div className="space-y-1.5 flex flex-col justify-end">
                      <Label className="text-xs font-bold text-foreground">
                        {bn ? 'ফি মওকুফ সুবিধা' : 'Fee Waiver'}
                      </Label>
                      <div className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-border bg-background h-10">
                        <div className="flex items-center gap-2.5">
                          <Switch
                            id="adminIsFree"
                            checked={assignedIsFree}
                            onCheckedChange={setAssignedIsFree}
                          />
                          <Label htmlFor="adminIsFree" className="text-xs font-semibold cursor-pointer">
                            {bn ? 'বিনা বেতন (Free Student)' : 'Free Student (No Fee)'}
                          </Label>
                        </div>
                        {assignedIsFree && (
                          <Badge className="bg-emerald-600 text-white text-[10px] py-0 px-1.5 font-bold">
                            {bn ? 'সক্রিয়' : 'Active'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {bn ? '💡 সক্রিয় করলে শিক্ষার্থীর মাসিক ফি ফ্রি প্রযোজ্য হবে।' : 'No monthly fee charged if active.'}
                      </p>
                    </div>

                    {/* 👤 ভর্তির মাধ্যম / রেফারেন্স (Referred By) */}
                    <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-3">
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span>{bn ? 'ভর্তির মাধ্যম / রেফারেন্স (Referred By)' : 'Referred By / Reference'}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <Label className="text-[11px] font-medium text-muted-foreground">{bn ? 'রেফারেন্সের ধরন' : 'Referral Type'}</Label>
                          <Select
                            value={studentReferralType}
                            onValueChange={(val: string) => {
                              setStudentReferralType(val);
                              if (val === 'none') {
                                setStudentReferralName('');
                                setStudentReferralPhone('');
                                setStudentReferralDesignation('');
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder={bn ? 'নির্বাচন করুন' : 'Select'} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{bn ? 'সরাসরি ভর্তি (রেফারেন্স নেই)' : 'Direct (No Reference)'}</SelectItem>
                              <SelectItem value="staff">{bn ? 'মাদরাসার শিক্ষক / স্টাফ' : 'Madrasa Teacher / Staff'}</SelectItem>
                              <SelectItem value="committee">{bn ? 'পরিচালনা কমিটির সদস্য' : 'Managing Committee'}</SelectItem>
                              <SelectItem value="guardian">{bn ? 'অভিভাবক / পুরাতন ছাত্র' : 'Guardian / Alumni'}</SelectItem>
                              <SelectItem value="other">{bn ? 'অন্যান্য শুভাকাঙ্ক্ষী' : 'Other'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {studentReferralType === 'staff' ? (
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-muted-foreground">{bn ? 'শিক্ষক / স্টাফ নির্বাচন' : 'Select Staff'}</Label>
                            <Select
                              value={studentReferralName}
                              onValueChange={(val) => {
                                const selectedStaff = allActiveStaff.find((st: any) => (st.name_bn || st.name_en) === val);
                                setStudentReferralName(val);
                                if (selectedStaff?.phone) setStudentReferralPhone(selectedStaff.phone);
                                if (selectedStaff?.designation) setStudentReferralDesignation(selectedStaff.designation);
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue placeholder={bn ? 'শিক্ষক নির্বাচন করুন' : 'Select Teacher'} />
                              </SelectTrigger>
                              <SelectContent>
                                {allActiveStaff.map((st: any) => (
                                  <SelectItem key={st.id} value={st.name_bn || st.name_en}>
                                    {st.name_bn || st.name_en} {st.designation ? `(${st.designation})` : ''}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : studentReferralType !== 'none' ? (
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-muted-foreground">{bn ? 'রেফারেন্সকারীর নাম' : 'Referrer Name'}</Label>
                            <Input
                              value={studentReferralName}
                              onChange={(e) => setStudentReferralName(e.target.value)}
                              placeholder={bn ? 'ব্যক্তির নাম লিখুন' : 'Enter name'}
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                        ) : null}
                      </div>

                      {studentReferralType !== 'none' && (
                        <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-border/40">
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-muted-foreground">{bn ? 'মোবাইল নম্বর' : 'Phone Number'}</Label>
                            <Input
                              value={studentReferralPhone}
                              onChange={(e) => setStudentReferralPhone(e.target.value)}
                              placeholder="017XXXXXXXX"
                              className="h-8 text-xs bg-background font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[11px] font-medium text-muted-foreground">{bn ? 'পদবি / সম্পর্ক' : 'Designation / Relation'}</Label>
                            <Input
                              value={studentReferralDesignation}
                              onChange={(e) => setStudentReferralDesignation(e.target.value)}
                              placeholder={bn ? 'যেমন: সদস্য / প্রতিবেশী' : 'e.g. Member'}
                              className="h-8 text-xs bg-background"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Approver Name */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-foreground">
                        {bn ? 'অনুমোদনকারীর নাম' : 'Approver Name'}
                      </Label>
                      <Input
                        value={studentApproverName}
                        onChange={(e) => setStudentApproverName(e.target.value)}
                        placeholder={bn ? 'অনুমোদনকারীর নাম' : 'Approver Name'}
                        className="h-9 text-xs bg-background"
                      />
                    </div>

                    {/* Approver Designation & Date */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">
                          {bn ? 'পদবি' : 'Designation'}
                        </Label>
                        <Input
                          value={studentApproverDesignation}
                          onChange={(e) => setStudentApproverDesignation(e.target.value)}
                          placeholder={bn ? 'যেমন: অধ্যক্ষ' : 'e.g. Principal'}
                          className="h-9 text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium text-foreground">
                          {bn ? 'অনুমোদনের তারিখ' : 'Approval Date'}
                        </Label>
                        <Input
                          type="date"
                          value={studentApproverDate}
                          onChange={(e) => setStudentApproverDate(e.target.value)}
                          className="h-9 text-xs bg-background font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="px-6 py-3 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStudentApprovalModal(null)}
                >
                  {bn ? 'বন্ধ করুন' : 'Close'}
                </Button>
                {studentApprovalModal?.approval_status !== 'rejected' && (
                  <Button
                    variant="destructive"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      const s = studentApprovalModal;
                      setStudentApprovalModal(null);
                      setRejectionModal({ type: 'student', id: s.id, name: s.name_bn || s.name_en || 'শিক্ষার্থী' });
                    }}
                  >
                    <X className="w-4 h-4" />
                    {bn ? 'আবেদন বাতিল' : 'Reject'}
                  </Button>
                )}
              </div>

              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold px-6 shadow-md shadow-emerald-600/20"
                onClick={() => approveStudentWithDetailsMutation.mutate({ status: 'approved' })}
                disabled={approveStudentWithDetailsMutation.isPending || !assignedRoll.trim()}
              >
                {approveStudentWithDetailsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {bn ? 'সংরক্ষণ ও অনুমোদন করুন' : 'Save & Approve Application'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dynamic Admission Form Modal for Edit / Review */}
        {showEditAdmissionForm && (
          <AdmissionForm
            open={showEditAdmissionForm}
            onOpenChange={(o) => {
              setShowEditAdmissionForm(o);
              if (!o) {
                refetchStudents();
                if (editStudentForModal?.id) {
                  supabase
                    .from('students')
                    .select('*, classes:class_id(id, name, name_bn, division_id, sort_order, divisions(id, name, name_bn, prefix))')
                    .eq('id', editStudentForModal.id)
                    .maybeSingle()
                    .then(({ data }) => {
                      if (data) {
                        setStudentApprovalModal(data);
                        if (data.roll_number) setAssignedRoll(data.roll_number);
                        if (data.registration_no) setAssignedReg(data.registration_no);
                      }
                    });
                }
              }
            }}
            editStudent={editStudentForModal}
          />
        )}

        {/* ══════════════ QUICK APPLICATION TRACKER MODAL ══════════════ */}
        <Dialog open={showQuickTrackerModal} onOpenChange={setShowQuickTrackerModal}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2.5 text-base sm:text-lg font-bold">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <span>{bn ? 'আবেদন অনুসন্ধান ও ট্র্যাকিং (Quick Tracker)' : 'Application Quick Tracker'}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                {bn
                  ? 'ছাত্র ভর্তি আবেদন বা শিক্ষক নিয়োগ আবেদন নম্বর (ADM... / STF...), রোল বা মোবাইল নম্বর দিয়ে সরাসরি অনুসন্ধান করুন।'
                  : 'Search student admissions or staff applications by Application ID, Roll or Mobile.'}
              </DialogDescription>
            </DialogHeader>

            {/* Search Input Bar */}
            <div className="space-y-2 pt-1">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleTrackerSearch();
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder={bn ? 'আবেদন নং (যেমন ADM20260001 / STF20260001), মোবাইল বা রোল...' : 'Application ID (e.g. ADM20260001 / STF20260001), Phone or Roll...'}
                    value={trackerQuery}
                    onChange={(e) => setTrackerQuery(e.target.value)}
                    className="pl-9 h-10 font-mono text-sm"
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSearchingTracker}
                  className="h-10 px-4 btn-primary-gradient shrink-0"
                >
                  {isSearchingTracker ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
                  <span>{bn ? 'অনুসন্ধান' : 'Search'}</span>
                </Button>
              </form>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground/80">{bn ? 'দ্রুত ফিল্টার:' : 'Quick:'}</span>
                <button
                  type="button"
                  onClick={() => {
                    const firstStudent = students[0];
                    if (firstStudent) {
                      const id = (firstStudent as any).application_no || firstStudent.student_id || firstStudent.roll_number || '';
                      setTrackerQuery(id);
                      handleTrackerSearch(id);
                    }
                  }}
                  className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  {bn ? 'সর্বশেষ ভর্তি আবেদন' : 'Latest Student'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const firstStaff = staffList[0];
                    if (firstStaff) {
                      const id = (firstStaff as any).application_no || (firstStaff.staff_data as any)?.application_no || firstStaff.staff_id || '';
                      setTrackerQuery(id);
                      handleTrackerSearch(id);
                    }
                  }}
                  className="px-2 py-0.5 rounded-md bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  {bn ? 'সর্বশেষ শিক্ষক আবেদন' : 'Latest Staff'}
                </button>
              </div>
            </div>

            {/* Results Display */}
            {isSearchingTracker && (
              <div className="py-12 text-center space-y-2">
                <Loader2 className="w-7 h-7 animate-spin mx-auto text-emerald-600" />
                <p className="text-xs text-muted-foreground">{bn ? 'রেকর্ড খোঁজা হচ্ছে...' : 'Searching database...'}</p>
              </div>
            )}

            {!isSearchingTracker && trackerHasSearched && !trackerResult && (
              <div className="py-10 text-center space-y-3 bg-muted/20 border border-dashed rounded-2xl">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{bn ? 'কোনো আবেদন পাওয়া যায়নি' : 'No Application Found'}</p>
                  <p className="text-xs text-muted-foreground">
                    {bn ? 'প্রদত্ত নম্বরে কোনো ভর্তি বা নিয়োগ আবেদন রেকর্ড পাওয়া যায়নি।' : 'No records matching the provided ID or number.'}
                  </p>
                </div>
              </div>
            )}

            {!isSearchingTracker && trackerResult && (() => {
              const r = trackerResult;
              const isStudent = r.type === 'student';
              const d = r.data;
              const isApproved = d.status === 'active' || d.approval_status === 'approved';
              const isRejected = d.approval_status === 'rejected' || d.status === 'inactive';
              const isPending = !isApproved && !isRejected;

              const appNo = isStudent
                ? (d.application_no || d.student_id || d.id?.slice(0, 8))
                : (d.application_no || (d.staff_data as any)?.application_no || d.staff_id || d.id?.slice(0, 8));

              const nameBn = d.name_bn || (d.first_name ? `${d.first_name} ${d.last_name || ''}` : '') || d.name_en;
              const nameEn = d.name_en || '';
              const roleOrClass = isStudent
                ? (d.classes?.name_bn || d.classes?.name || d.admission_class || '—')
                : (d.designation || '—');

              const phone = d.phone || d.mobile || d.father_phone || '—';
              const applyDate = d.admission_date || d.joining_date || d.created_at?.split('T')[0] || '—';

              return (
                <div className="space-y-4 pt-2 border-t border-border">
                  {/* Status Banner */}
                  <div
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      isApproved
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                        : isRejected
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {isApproved ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      ) : isRejected ? (
                        <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                      ) : (
                        <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-bold">
                          {isApproved
                            ? (bn ? 'অনুমোদিত ও সক্রিয়' : 'Approved & Active')
                            : isRejected
                            ? (bn ? 'আবেদন গৃহীত হয়নি (বাতিল)' : 'Application Rejected')
                            : (bn ? 'অপেক্ষমাণ / অনুমোদন প্রযোজ্য' : 'Pending Administrative Review')}
                        </div>
                        <div className="text-[11px] opacity-85">
                          {isStudent ? (bn ? 'ছাত্র ভর্তি আবেদন' : 'Student Admission') : (bn ? 'শিক্ষক / স্টাফ নিয়োগ আবেদন' : 'Staff Application')}
                        </div>
                      </div>
                    </div>

                    <Badge
                      className={`text-xs px-2.5 py-0.5 font-semibold ${
                        isApproved
                          ? 'bg-emerald-600 text-white'
                          : isRejected
                          ? 'bg-rose-600 text-white'
                          : 'bg-amber-600 text-white'
                      }`}
                    >
                      {isApproved ? (bn ? 'অনুমোদিত' : 'Approved') : isRejected ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'পেন্ডিং' : 'Pending')}
                    </Badge>
                  </div>

                  {/* Profile Header Card */}
                  <div className="p-4 rounded-xl border bg-muted/30 flex flex-col sm:flex-row items-center sm:items-start gap-3.5">
                    {d.photo_url ? (
                      <img src={d.photo_url} alt="" className="w-16 h-16 rounded-xl object-cover border shadow-xs shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl border shrink-0">
                        {(nameBn || 'A')[0]}
                      </div>
                    )}

                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <h4 className="text-base font-bold text-foreground">{nameBn}</h4>
                        {nameEn && nameBn !== nameEn && (
                          <span className="text-xs text-muted-foreground">({nameEn})</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-0.5">
                        <Badge variant="outline" className="font-mono text-xs gap-1 border-primary/30 text-primary bg-primary/5">
                          {bn ? 'আইডি:' : 'ID:'} {appNo}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(appNo);
                              toast.success(bn ? 'আইডি কপি হয়েছে' : 'ID copied');
                            }}
                            className="ml-1 text-primary hover:text-primary/70"
                          >
                            <Copy className="w-3 h-3 inline" />
                          </button>
                        </Badge>

                        <Badge variant="secondary" className="text-xs">
                          {isStudent ? (bn ? `শ্রেণি: ${roleOrClass}` : `Class: ${roleOrClass}`) : (bn ? `পদবী: ${roleOrClass}` : `Post: ${roleOrClass}`)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl border bg-card text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">{isStudent ? (bn ? 'শ্রেণি' : 'Class') : (bn ? 'পদবী' : 'Designation')}</span>
                      <span className="font-bold text-foreground">{roleOrClass}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">{bn ? 'মোবাইল' : 'Phone'}</span>
                      <span className="font-bold text-foreground font-mono">{phone}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">{isStudent ? (bn ? 'রোল নম্বর' : 'Roll') : (bn ? 'স্টাফ আইডি' : 'Staff ID')}</span>
                      <span className="font-bold text-foreground font-mono">
                        {isStudent ? (d.roll_number || (bn ? 'অনুমোদনের পর' : 'Pending')) : (d.staff_id || '—')}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">{bn ? 'আবেদনের তারিখ' : 'Apply Date'}</span>
                      <span className="font-bold text-foreground font-mono">{applyDate}</span>
                    </div>
                    {isStudent && (
                      <>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">{bn ? 'পিতার নাম' : 'Father'}</span>
                          <span className="font-medium text-foreground">{d.father_name || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">{bn ? 'মাতার নাম' : 'Mother'}</span>
                          <span className="font-medium text-foreground">{d.mother_name || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">{bn ? 'অভিভাবক ফোন' : 'Guardian Phone'}</span>
                          <span className="font-medium text-foreground font-mono">{d.guardian_phone || d.father_phone || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">{bn ? 'রেজিস্ট্রেশন' : 'Reg No'}</span>
                          <span className="font-medium text-foreground font-mono">{d.registration_no || '—'}</span>
                        </div>
                      </>
                    )}
                    {!isStudent && (
                      <>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">{bn ? 'জাতীয় পরিচয়পত্র' : 'NID'}</span>
                          <span className="font-medium text-foreground font-mono">{d.nid || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">{bn ? 'শিক্ষাগত যোগ্যতা' : 'Education'}</span>
                          <span className="font-medium text-foreground">{d.qualification || (d.staff_data as any)?.personal?.qualification || '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">{bn ? 'বেতন' : 'Salary'}</span>
                          <span className="font-medium text-foreground font-mono">{d.salary ? `৳${d.salary}` : '—'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[11px]">{bn ? 'বৈবাহিক অবস্থা' : 'Marital Status'}</span>
                          <span className="font-medium text-foreground">{translateMaritalStatus(d.marital_status || (d.staff_data as any)?.personal?.marital_status, bn)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleDownloadTrackerSlip}
                        disabled={isDownloadingTrackerSlip}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        {isDownloadingTrackerSlip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        <span>{bn ? 'স্লিপ PDF' : 'Download Slip'}</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handlePrintTrackerSlip}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{bn ? 'প্রিন্ট' : 'Print'}</span>
                      </Button>

                      <Button
                        asChild
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs font-semibold gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <a href={`/application-tracking?id=${appNo}`} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>{bn ? 'পাবলিক পেজ' : 'Public Link'}</span>
                        </a>
                      </Button>
                    </div>

                    {/* Approve Action Button if pending */}
                    {isPending && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => {
                          setShowQuickTrackerModal(false);
                          if (isStudent) {
                            openStudentApprovalModal(d);
                          } else {
                            openStaffApprovalModal(d);
                          }
                        }}
                        className="h-8 px-3 text-xs font-bold btn-primary-gradient gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{bn ? 'অনুমোদন প্রক্রিয়া শুরু করুন' : 'Review & Approve'}</span>
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* ══════════════ REJECTION REASON MODAL ══════════════ */}
        <Dialog open={!!rejectionModal} onOpenChange={(open) => { if (!open) setRejectionModal(null); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                {bn ? 'প্রত্যাখ্যানের কারণ লিখুন' : 'Reason for Rejection'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                {bn
                  ? `আপনি "${rejectionModal?.name || 'এই রিকোয়েস্ট'}" প্রত্যাখ্যান করতে যাচ্ছেন। অনুগ্রহ করে কারণ উল্লেখ করুন যাতে ব্যবহারকারী বা অভিভাবক জানতে পারে:`
                  : `You are rejecting "${rejectionModal?.name || 'this request'}". Please enter a reason:`}
              </p>
              <Textarea
                placeholder={bn ? 'যেমন: ট্রানজেকশন আইডি সঠিক নয় / ভুল তথ্য / স্লিপ অস্পষ্ট...' : 'E.g., invalid transaction id / incorrect amount / blur slip...'}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[90px]"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setRejectionModal(null)}>
                {bn ? 'ফিরে যান' : 'Cancel'}
              </Button>
              <Button
                variant="destructive"
                disabled={!rejectionReason.trim()}
                onClick={() => {
                  if (!rejectionModal) return;
                  if (rejectionModal.type === 'payment') {
                    paymentMutation.mutate({ id: rejectionModal.id, status: 'rejected', reason: rejectionReason });
                  } else if (rejectionModal.type === 'account') {
                    accountMutation.mutate({ id: rejectionModal.id, status: 'rejected', reason: rejectionReason });
                  } else if (rejectionModal.type === 'paper') {
                    paperMutation.mutate({ id: rejectionModal.id, status: 'rejected', note: rejectionReason });
                  } else if (rejectionModal.type === 'student') {
                    approveStudentWithDetailsMutation.mutate({ studentId: rejectionModal.id, status: 'rejected', reason: rejectionReason });
                    setRejectionModal(null);
                  }
                }}
              >
                {bn ? 'নিশ্চিত প্রত্যাখ্যান' : 'Confirm Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminApprovals;
