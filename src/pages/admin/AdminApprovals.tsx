import { useState, useMemo } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
} from 'lucide-react';
import { toast } from 'sonner';

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
  attendance_records: { labelBn: 'উপস্থিতি তথ্য', labelEn: 'Attendance Records', category: 'other', icon: '⏱️' },
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
        .select('id, first_name, last_name, staff_category, designation, mobile, nid, status, created_at, photo_url, email, salary')
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
    } else if (action_type === 'delete' && target_id) {
      const { error } = await supabase.from(target_table).delete().eq('id', target_id);
      if (error) throw error;
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
      (s.first_name || '').toLowerCase().includes(q) ||
      (s.last_name || '').toLowerCase().includes(q) ||
      (s.designation || '').toLowerCase().includes(q) ||
      (s.mobile || '').includes(q)
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
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 rounded-2xl border border-primary/20 backdrop-blur-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                <ClipboardCheck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
                  {bn ? 'কেন্দ্রীয় অনুমোদন হাব' : 'Central Admin Approval Hub'}
                  {totalPending > 0 && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white ml-2 text-xs px-2.5 py-0.5 rounded-full shadow-sm animate-pulse">
                      {totalPending} {bn ? 'পেন্ডিং' : 'Pending'}
                    </Badge>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {bn
                    ? 'মাদ্রাসার সমস্ত ভর্তি, শিক্ষক নিয়োগ, পেমেন্ট ভেরিফিকেশন, প্রশ্নপত্র ও ডেটা পরিবর্তন অনুমোদন'
                    : 'Unified command center for student admissions, staff recruitment, payments, exams & data audit approvals'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={refetchAll} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {bn ? 'রিফ্রেশ' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Top Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-primary/20 ${activeTab === 'students' ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}
            onClick={() => setActiveTab('students')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{bn ? 'ভর্তি আবেদন' : 'Admissions'}</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.students}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                <GraduationCap className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-primary/20 ${activeTab === 'staff' ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}
            onClick={() => setActiveTab('staff')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{bn ? 'শিক্ষক/স্টাফ' : 'Staff'}</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.staff}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-primary/20 ${activeTab === 'finance' ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}
            onClick={() => setActiveTab('finance')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{bn ? 'হিসাব ও লেনদেন' : 'Finance'}</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.finance}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Coins className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-primary/20 ${activeTab === 'payments' ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}
            onClick={() => setActiveTab('payments')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{bn ? 'পেমেন্ট স্লিপ' : 'Payment Slips'}</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.payments}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600">
                <Wallet className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-primary/20 ${activeTab === 'accounts' ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}
            onClick={() => setActiveTab('accounts')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{bn ? 'পোর্টাল আইডি' : 'Student Acct'}</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.accounts}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                <UserCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-primary/20 ${activeTab === 'papers' ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}
            onClick={() => setActiveTab('papers')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{bn ? 'প্রশ্নপত্র' : 'Exams'}</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.papers}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
                <BookOpen className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-primary/20 ${activeTab === 'actions' ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}
            onClick={() => setActiveTab('actions')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{bn ? 'মেকার-চেকার' : 'Maker-Checker'}</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.actions}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all hover:shadow-md border-primary/20 ${activeTab === 'devices' ? 'ring-2 ring-primary bg-primary/5' : 'bg-card'}`}
            onClick={() => setActiveTab('devices')}
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">{bn ? 'ডিভাইস' : 'Devices'}</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{counts.devices}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600">
                <Smartphone className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
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
                  ? bn ? 'অপেক্ষমান' : 'Pending'
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
                              {s.photo_url ? (
                                <img src={s.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 font-bold flex items-center justify-center text-xs">
                                  {(s.name_bn || s.name_en || 'S')[0]}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm text-foreground">{s.name_bn || s.name_en || '—'}</p>
                                <p className="text-xs text-muted-foreground">{s.name_en || ''}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{s.father_name || '—'}</TableCell>
                          <TableCell className="text-sm font-mono">{s.phone || '—'}</TableCell>
                          <TableCell className="text-sm font-semibold">{s.roll_number || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_COLORS[s.approval_status || 'pending']}>
                              {s.approval_status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') : s.approval_status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অপেক্ষমান' : 'Pending')}
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
                        <TableHead>{bn ? 'মোবাইল' : 'Mobile'}</TableHead>
                        <TableHead>{bn ? 'এনআইডি' : 'NID'}</TableHead>
                        <TableHead>{bn ? 'স্ট্যাটাস' : 'Status'}</TableHead>
                        <TableHead>{bn ? 'আবেদনের তারিখ' : 'Date'}</TableHead>
                        <TableHead className="text-right">{bn ? 'পদক্ষেপ' : 'Action'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStaff.map((s: any) => (
                        <TableRow key={s.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {s.photo_url ? (
                                <img src={s.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-purple-500/10 text-purple-600 font-bold flex items-center justify-center text-xs">
                                  {`${s.first_name || ''} ${s.last_name || ''}`.trim()[0] || 'T'}
                                </div>
                              )}
                              <div>
                                <p className="font-medium text-sm text-foreground">{`${s.first_name || ''} ${s.last_name || ''}`.trim()}</p>
                                <p className="text-xs text-muted-foreground">{s.email || ''}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <span className="font-medium">{s.designation || '—'}</span>
                            <span className="text-xs text-muted-foreground block">{s.staff_category || ''}</span>
                          </TableCell>
                          <TableCell className="text-sm font-mono">{s.mobile || '—'}</TableCell>
                          <TableCell className="text-xs font-mono">{s.nid || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_COLORS[s.status] || ''}>
                              {s.status === 'active' ? (bn ? 'সক্রিয়/অনুমোদিত' : 'Active') : s.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অপেক্ষমান' : 'Pending')}
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
                                onClick={() => setDetailModal({ type: 'staff', data: s })}
                                title={bn ? 'বিস্তারিত' : 'View'}
                              >
                                <Eye className="w-4 h-4 text-primary" />
                              </Button>
                              {s.status === 'pending' && (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-2.5"
                                    onClick={() => staffMutation.mutate({ id: s.id, status: 'active' })}
                                    disabled={staffMutation.isPending}
                                  >
                                    <Check className="w-3.5 h-3.5 mr-1" />
                                    {bn ? 'অনুমোদন' : 'Approve'}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="h-8 px-2.5"
                                    onClick={() => staffMutation.mutate({ id: s.id, status: 'rejected' })}
                                    disabled={staffMutation.isPending}
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
                                {action.status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') : action.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অপেক্ষমান' : 'Pending')}
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
                              {p.status === 'verified' ? (bn ? 'যাচাইকৃত' : 'Verified') : p.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অপেক্ষমান' : 'Pending')}
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
                              {a.status === 'active' ? (bn ? 'অনুমোদিত' : 'Approved') : a.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অপেক্ষমান' : 'Pending')}
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
                              {paper.status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') : paper.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অপেক্ষমান' : 'Pending')}
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
                                {action.status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') : action.status === 'rejected' ? (bn ? 'বাতিল' : 'Rejected') : (bn ? 'অপেক্ষমান' : 'Pending')}
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
                              {bn ? 'অপেক্ষমান' : 'Pending'}
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
                      <div>
                        <h3 className="font-bold text-lg">{detailModal.data.name_bn || detailModal.data.name_en}</h3>
                        <p className="text-sm text-muted-foreground">{detailModal.data.name_en || ''}</p>
                        <Badge variant="outline" className="mt-1">
                          {bn ? 'রোল:' : 'Roll:'} {detailModal.data.roll_number || '—'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm bg-card p-4 rounded-xl border">
                      <div><p className="text-muted-foreground text-xs">{bn ? 'পিতার নাম' : 'Father Name'}</p><p className="font-medium">{detailModal.data.father_name || '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">{bn ? 'মাতার নাম' : 'Mother Name'}</p><p className="font-medium">{detailModal.data.mother_name || '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">{bn ? 'মোবাইল' : 'Phone'}</p><p className="font-medium font-mono">{detailModal.data.phone || '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">{bn ? 'রক্তের গ্রুপ' : 'Blood Group'}</p><p className="font-medium">{detailModal.data.blood_group || '—'}</p></div>
                    </div>
                  </div>
                )}

                {detailModal.type === 'staff' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 bg-muted/40 p-4 rounded-xl border">
                      {detailModal.data.photo_url ? (
                        <img src={detailModal.data.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border" />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xl">
                          {(detailModal.data.first_name || 'T')[0]}
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-lg">{`${detailModal.data.first_name || ''} ${detailModal.data.last_name || ''}`}</h3>
                        <p className="text-sm text-muted-foreground">{detailModal.data.designation || 'Staff'}</p>
                        <Badge variant="outline" className="mt-1">
                          {detailModal.data.staff_category || 'General'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm bg-card p-4 rounded-xl border">
                      <div><p className="text-muted-foreground text-xs">{bn ? 'মোবাইল' : 'Mobile'}</p><p className="font-medium font-mono">{detailModal.data.mobile || '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">{bn ? 'ইমেইল' : 'Email'}</p><p className="font-medium">{detailModal.data.email || '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">{bn ? 'জাতীয় পরিচয়পত্র (NID)' : 'NID'}</p><p className="font-medium font-mono">{detailModal.data.nid || '—'}</p></div>
                      <div><p className="text-muted-foreground text-xs">{bn ? 'প্রস্তাবিত বেতন' : 'Salary'}</p><p className="font-medium">৳ {detailModal.data.salary || '—'}</p></div>
                    </div>
                  </div>
                )}

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
                  const displayEntries = Object.entries(payload).filter(([k]) => !k.startsWith('_'));

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
