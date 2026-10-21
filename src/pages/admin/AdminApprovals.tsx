import { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui/date-picker';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  AlertCircle,
  ExternalLink,
  Filter,
  Coins,
  PlusCircle,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import { invalidateAllStudentQueries } from '@/lib/studentQueryInvalidator';

// Status badge helper
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

  // Staff Approval Modal States (review, salary, signatures, approver)
  const [staffApprovalModal, setStaffApprovalModal] = useState<any | null>(null);
  const [staffSalary, setStaffSalary] = useState('');
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
        .select('id, name_bn, name_en, roll_number, phone, father_name, mother_name, class_id, approval_status, status, created_at, photo_url, blood_group')
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
    const q = searchQuery.toLowerCase();
    return students.filter((s: any) =>
      (s.name_bn || '').toLowerCase().includes(q) ||
      (s.name_en || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.roll_number || '').includes(q)
    );
  }, [students, searchQuery]);

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffList;
    const q = searchQuery.toLowerCase();
    return staffList.filter((s: any) =>
      (s.name_bn || '').toLowerCase().includes(q) ||
      (s.name_en || '').toLowerCase().includes(q) ||
      (s.first_name || '').toLowerCase().includes(q) ||
      (s.last_name || '').toLowerCase().includes(q) ||
      (s.designation || '').toLowerCase().includes(q) ||
      (s.phone || '').includes(q) ||
      (s.mobile || '').includes(q) ||
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

          <div className="flex items-center gap-2">
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
                                      {displayNames.secondary && <p className="text-xs text-muted-foreground">{displayNames.secondary}</p>}
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
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDetailModal({ type: 'student', data: s })}
                                title={bn ? 'বিস্তারিত' : 'View'}
                              >
                                <Eye className="w-4 h-4 text-primary" />
                              </Button>
                              {s.approval_status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5"
                                    onClick={() => studentMutation.mutate({ id: s.id, status: 'approved' })}
                                    disabled={studentMutation.isPending}
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    {bn ? 'অনুমোদন' : 'Approve'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 px-2.5"
                                    onClick={() => studentMutation.mutate({ id: s.id, status: 'rejected' })}
                                    disabled={studentMutation.isPending}
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
                                  <p className="text-xs text-muted-foreground">{s.email || ''}</p>
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
                              {bn ? 'রোল:' : 'Roll:'} {detailModal.data.roll_number || '—'}
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

                {/* 2. Salary Assignment */}
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <Coins className="w-4 h-4 text-emerald-600" />
                      {bn ? 'বেতন নির্ধারণ (টাকা)' : 'Salary (BDT)'} <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      {bn ? 'অনুমোদনের সাথে সাথে এটি কর্মীর মাসিক মূল বেতন হিসেবে কার্যকর হবে' : 'Will be set as active monthly salary'}
                    </span>
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
