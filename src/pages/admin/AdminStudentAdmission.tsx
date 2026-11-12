import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import AdminLayout from '@/components/AdminLayout';
import AdmissionForm from '@/components/admission/AdmissionForm';
import StudentProfileModal from '@/components/profile/StudentProfileModal';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  UserPlus,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Sparkles,
  Search,
  RotateCcw,
  Eye,
  Pencil,
  Trash2,
  Printer,
  MoreHorizontal,
  Loader2,
  FileCheck,
  Plus,
  ClipboardList,
  AlertCircle,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import { printStudentProfile } from '@/lib/studentProfilePrint';
import { invalidateAllStudentQueries } from '@/lib/studentQueryInvalidator';
import { bnToEn, enToBn, formatDigits, cn } from '@/lib/utils';
import {
  STUDENT_CORRECTION_FIELDS,
  dispatchRevisionNotification,
  dispatchRejectionNotification,
} from '@/lib/applicationRevisionService';

type AdmissionStatusFilter = 'all' | 'pending' | 'needs_revision' | 'approved' | 'rejected' | 'new_student';

const AdminStudentAdmission = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { role } = useAuth();
  const { data: institution } = useInstitutionInfo();
  const { checkApproval } = useApprovalCheck('/admin/students', 'students');
  const { canAddItem, canEditItem, canDeleteItem, canApproveItem, isFeatureAllowed } = usePagePermissions('/admin/students');
  const canBypassRequirements = isAdminRole(role) || isFeatureAllowed('action_bypass_requirements');

  const [showAdd, setShowAdd] = useState(false);
  const [admissionModalMode, setAdmissionModalMode] = useState<'admission' | 'edit' | 'approve'>('admission');
  const [editStudent, setEditStudent] = useState<any>(null);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Revision & Rejection Modals
  const [revisionStudent, setRevisionStudent] = useState<any | null>(null);
  const [selectedCorrectionFields, setSelectedCorrectionFields] = useState<string[]>([]);
  const [correctionNotes, setCorrectionNotes] = useState('');
  const [rejectionStudent, setRejectionStudent] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AdmissionStatusFilter>('pending');
  const [filterDivisionId, setFilterDivisionId] = useState('all');
  const [filterSessionId, setFilterSessionId] = useState('all');
  const [filterClassId, setFilterClassId] = useState('all');

  // Realtime sync on students table
  useEffect(() => {
    const channelName = `admission-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let channel: any = null;
    try {
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
          invalidateAllStudentQueries(queryClient);
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error in AdminStudentAdmission:', e);
    }
    return () => {
      if (channel) {
        try {
          supabase.removeChannel(channel);
        } catch {}
      }
    };
  }, [queryClient]);

  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic-sessions-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('academic_sessions')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('divisions')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-admin-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('classes')
        .select('*, divisions(name, name_bn, sort_order)')
        .order('sort_order');
      if (error) throw error;
      return [...(data || [])].sort((a: any, b: any) => {
        const da = a.divisions?.sort_order ?? 9999;
        const db = b.divisions?.sort_order ?? 9999;
        if (da !== db) return da - db;
        return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
      });
    },
  });

  const filteredClasses = (filterDivisionId !== 'all'
    ? classes.filter((c: any) => c.division_id === filterDivisionId)
    : classes
  ).filter((c: any) => c.is_active);

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('*, divisions(name, name_bn)')
        .is('deleted_at', null)
        .order('roll_number', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: string; reason?: string }) => {
      if (await checkApproval('edit', { id, approval_status: status }, id, `ভর্তি স্ট্যাটাস: ${status}`)) return;
      const student = students.find((s: any) => s.id === id);
      const currentAdm = (student?.admission_data as any) || {};
      const updatedAdm = {
        ...currentAdm,
        approval_status: status,
        ...(reason ? { rejection_reason: reason } : {}),
      };

      const payload: any = {
        approval_status: status,
        status: status === 'rejected' || status === 'needs_revision' ? 'inactive' : 'active',
        admission_data: updatedAdm,
      };
      if (reason) payload.rejection_reason = reason;

      const { error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', id);
      if (error) throw error;

      if (status === 'rejected' && student) {
        try {
          await dispatchRejectionNotification({
            type: 'student',
            id,
            name: student.name_bn || student.name_en,
            phone: student.phone || student.father_phone,
            email: student.email,
            appNo: student.student_id,
            rejectionReason: reason || 'আবেদনটি এই মুহূর্তে গ্রহণ করা সম্ভব হয়নি',
            institutionName: institution?.name_bn || institution?.name,
          });
        } catch {}
      }
    },
    onSuccess: (_data, vars) => {
      invalidateAllStudentQueries(queryClient);
      const msg =
        vars.status === 'approved'
          ? bn ? 'আবেদন অনুমোদিত হয়েছে' : 'Application approved'
          : vars.status === 'rejected'
          ? bn ? 'আবেদন প্রত্যাখ্যাত হয়েছে' : 'Application rejected'
          : bn ? 'আবেদন অপেক্ষমাণ হিসেবে সংরক্ষিত' : 'Marked as pending';
      toast.success(msg);
      setRejectionStudent(null);
      setRejectionReason('');
    },
    onError: () => toast.error(bn ? 'স্ট্যাটাস আপডেট ব্যর্থ হয়েছে' : 'Failed to update status'),
  });

  const revisionMutation = useMutation({
    mutationFn: async ({ id, fields, notes }: { id: string; fields: string[]; notes: string }) => {
      const student = students.find((s: any) => s.id === id);
      const currentAdm = (student?.admission_data as any) || {};
      const updatedAdm = {
        ...currentAdm,
        approval_status: 'needs_revision',
        correction_fields: fields,
        correction_notes: notes,
      };
      const { error } = await supabase
        .from('students')
        .update({
          approval_status: 'needs_revision',
          status: 'inactive',
          correction_notes: notes,
          correction_fields: fields,
          admission_data: updatedAdm,
        } as any)
        .eq('id', id);
      if (error) throw error;

      if (student) {
        try {
          await dispatchRevisionNotification({
            type: 'student',
            id,
            name: student.name_bn || student.name_en,
            phone: student.phone || student.father_phone,
            email: student.email,
            appNo: student.student_id,
            correctionFields: fields,
            correctionNotes: notes,
            institutionName: institution?.name_bn || institution?.name,
          });
        } catch {}
      }
    },
    onSuccess: () => {
      invalidateAllStudentQueries(queryClient);
      toast.success(bn ? 'সংশোধনের নির্দেশ সহ আবেদন ফেরত পাঠানো হয়েছে' : 'Sent back for revision');
      setRevisionStudent(null);
      setSelectedCorrectionFields([]);
      setCorrectionNotes('');
    },
    onError: () => toast.error(bn ? 'সংশোধন পাঠাতে ব্যর্থ হয়েছে' : 'Failed to send revision'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const student = students.find((s: any) => s.id === id);
      if (await checkApproval('delete', { id, name_bn: student?.name_bn, student_id: student?.student_id }, id, `আবেদন মুছুন: ${student?.name_bn}`)) return;

      const { error: hardErr } = await supabase.from('students').delete().eq('id', id);
      if (hardErr) {
        const { error: softErr } = await supabase
          .from('students')
          .update({ deleted_at: new Date().toISOString(), status: 'inactive' } as any)
          .eq('id', id);
        if (softErr) throw softErr;
      }
    },
    onSuccess: () => {
      invalidateAllStudentQueries(queryClient);
      toast.success(bn ? 'আবেদন মুছে ফেলা হয়েছে' : 'Application deleted');
    },
    onError: () => toast.error(bn ? 'মুছতে সমস্যা হয়েছে' : 'Failed to delete'),
  });

  const getEffectiveClassId = useCallback(
    (student: any) => {
      if (!student) return null;
      if (student.class_id) return student.class_id;
      if (student.admission_data && typeof student.admission_data === 'object' && student.admission_data.admission_class) {
        return student.admission_data.admission_class;
      }
      return null;
    },
    []
  );

  const getClassName = useCallback(
    (classId: string | null | undefined) => {
      if (!classId) return '-';
      const c = classes.find((cls: any) => cls.id === classId);
      return c ? (bn ? c.name_bn : c.name) : '-';
    },
    [classes, bn]
  );

  const getSessionName = useCallback(
    (sessionId: string | null | undefined, fallbackYear?: string) => {
      if (sessionId) {
        const s = academicSessions.find((as: any) => as.id === sessionId);
        if (s) return bn ? (s.name_bn || s.name) : s.name;
      }
      return fallbackYear ? formatDigits(fallbackYear, bn) : '-';
    },
    [academicSessions, bn]
  );

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="w-3 h-3" />
            {bn ? 'অনুমোদিত' : 'Approved'}
          </span>
        );
      case 'needs_revision':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
            <RotateCcw className="w-3 h-3" />
            {bn ? 'সংশোধন আবশ্যক' : 'Needs Revision'}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <XCircle className="w-3 h-3" />
            {bn ? 'প্রত্যাখ্যাত' : 'Rejected'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="w-3 h-3" />
            {bn ? 'অপেক্ষমাণ' : 'Pending'}
          </span>
        );
    }
  };

  // Base search + academic filters (for metric counts)
  const baseFiltered = useMemo(() => {
    return students.filter((s: any) => {
      if (filterDivisionId !== 'all' && s.division_id !== filterDivisionId) return false;
      if (filterSessionId !== 'all') {
        const selectedSession = academicSessions.find((as: any) => as.id === filterSessionId);
        const matchesId = s.session_id === filterSessionId;
        let matchesName =
          selectedSession &&
          (s.admission_session === selectedSession.name ||
            s.session_year === selectedSession.name ||
            s.admission_session === selectedSession.name_bn ||
            s.session_year === selectedSession.name_bn);
        if (!matchesId && !matchesName && selectedSession) {
          const sessYearDigits = selectedSession.name?.match(/\d{4}/)?.[0];
          const studentYearDigits = String(s.session_year || s.admission_session || '')
            .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
            .match(/\d{4}/)?.[0];
          if (sessYearDigits && studentYearDigits && sessYearDigits === studentYearDigits) {
            matchesName = true;
          }
        }
        if (!matchesId && !matchesName) return false;
      }
      if (filterClassId !== 'all') {
        if (getEffectiveClassId(s) !== filterClassId) return false;
      }
      if (search) {
        const q = search.toLowerCase().trim();
        const qEn = bnToEn(q);
        const qBn = enToBn(q);
        return (
          String(s.name_bn || '').toLowerCase().includes(q) ||
          String(s.name_en || '').toLowerCase().includes(q) ||
          String(s.student_id || '').toLowerCase().includes(q) ||
          String(s.registration_no || '').toLowerCase().includes(q) ||
          String(s.roll_number || '').toLowerCase().includes(q) ||
          String(s.roll_number || '').includes(qEn) ||
          String(s.roll_number || '').includes(qBn) ||
          String(s.phone || '').toLowerCase().includes(q) ||
          String(s.father_phone || '').toLowerCase().includes(q) ||
          String(s.guardian_phone || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, filterDivisionId, filterSessionId, academicSessions, filterClassId, getEffectiveClassId, search]);

  const totalCount = baseFiltered.length;
  const pendingCount = useMemo(
    () => baseFiltered.filter((s: any) => (s.approval_status || 'pending') === 'pending').length,
    [baseFiltered]
  );
  const approvedCount = useMemo(
    () => baseFiltered.filter((s: any) => s.approval_status === 'approved').length,
    [baseFiltered]
  );
  const rejectedCount = useMemo(
    () => baseFiltered.filter((s: any) => s.approval_status === 'rejected').length,
    [baseFiltered]
  );
  const newStudentCount = useMemo(
    () => baseFiltered.filter((s: any) => s.student_type !== 'old').length,
    [baseFiltered]
  );

  const filteredList = useMemo(() => {
    const list = baseFiltered.filter((s: any) => {
      const appStatus = s.approval_status || 'pending';
      if (statusFilter === 'pending') return appStatus === 'pending';
      if (statusFilter === 'needs_revision') return appStatus === 'needs_revision';
      if (statusFilter === 'approved') return appStatus === 'approved';
      if (statusFilter === 'rejected') return appStatus === 'rejected';
      if (statusFilter === 'new_student') return s.student_type !== 'old';
      return true;
    });
    // Show pending first, then newest created_at
    return [...list].sort((a: any, b: any) => {
      const aP = (a.approval_status || 'pending') === 'pending' ? 0 : 1;
      const bP = (b.approval_status || 'pending') === 'pending' ? 0 : 1;
      if (aP !== bP) return aP - bP;
      return String(b.created_at || '').localeCompare(String(a.created_at || ''));
    });
  }, [baseFiltered, statusFilter]);

  const handleApproveReject = async (student: any, nextStatus: 'approved' | 'rejected' | 'pending') => {
    if (nextStatus === 'rejected') {
      setRejectionStudent(student);
      return;
    }
    statusMutation.mutate({ id: student.id, status: nextStatus });
  };

  const formatDate = (val: string | null | undefined) => {
    if (!val) return '-';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return formatDigits(val, bn);
    const formatted = d.toLocaleDateString(bn ? 'bn-BD' : 'en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    return formatted;
  };

  return (
    <>
      <AdminLayout>
        <div className="space-y-4 sm:space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground flex items-center gap-2 leading-tight">
                <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
                {bn ? 'ছাত্র ভর্তি ও আবেদন ব্যবস্থাপনা' : 'Student Admission & Applications'}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                {bn
                  ? `মোট ${formatDigits(filteredList.length, true)} টি আবেদন প্রদর্শিত হচ্ছে`
                  : `Showing ${filteredList.length} applications`}
              </p>
            </div>

            <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/students')}
                className="h-8 text-xs flex items-center gap-1.5 rounded-xl border-border/80 shadow-xs"
              >
                <Users className="w-3.5 h-3.5 text-primary" />
                {bn ? 'ছাত্র তালিকা' : 'Student List'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/admission-letters')}
                className="h-8 text-xs flex items-center gap-1.5 rounded-xl border-border/80 shadow-xs"
              >
                <FileCheck className="w-3.5 h-3.5 text-primary" />
                {bn ? 'ভর্তি পত্র' : 'Admission Letters'}
              </Button>
              {canAddItem && (
                <Button
                  onClick={() => {
                    setEditStudent(null);
                    setAdmissionModalMode('admission');
                    setShowAdd(true);
                  }}
                  className="btn-primary-gradient h-8 text-xs flex items-center gap-1.5 shadow-sm rounded-xl px-4"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {bn ? 'নতুন ভর্তি আবেদন' : 'New Admission'}
                </Button>
              )}
            </div>
          </div>

          {/* Summary Filter Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5',
                statusFilter === 'all'
                  ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40'
                  : 'bg-card border-border/80 hover:border-border hover:bg-muted/30 shadow-xs'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{bn ? 'সকল আবেদন' : 'All Applications'}</span>
                <ClipboardList className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="text-2xl font-black font-display tracking-tight text-foreground mt-1">
                {formatDigits(totalCount, bn)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('pending')}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5',
                statusFilter === 'pending'
                  ? 'bg-amber-500/10 border-amber-500 shadow-xs ring-1 ring-amber-500/40'
                  : 'bg-card border-border/80 hover:border-border hover:bg-muted/30 shadow-xs'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{bn ? 'অপেক্ষমাণ আবেদন' : 'Pending'}</span>
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="text-2xl font-black font-display tracking-tight text-amber-600 dark:text-amber-400 mt-1">
                {formatDigits(pendingCount, bn)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5',
                statusFilter === 'approved'
                  ? 'bg-emerald-500/10 border-emerald-500 shadow-xs ring-1 ring-emerald-500/40'
                  : 'bg-card border-border/80 hover:border-border hover:bg-muted/30 shadow-xs'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{bn ? 'অনুমোদিত' : 'Approved'}</span>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl font-black font-display tracking-tight text-emerald-600 dark:text-emerald-400 mt-1">
                {formatDigits(approvedCount, bn)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5',
                statusFilter === 'rejected'
                  ? 'bg-rose-500/10 border-rose-500 shadow-xs ring-1 ring-rose-500/40'
                  : 'bg-card border-border/80 hover:border-border hover:bg-muted/30 shadow-xs'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</span>
                <XCircle className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div className="text-2xl font-black font-display tracking-tight text-rose-600 dark:text-rose-400 mt-1">
                {formatDigits(rejectedCount, bn)}
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('new_student')}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5',
                statusFilter === 'new_student'
                  ? 'bg-sky-500/10 border-sky-500 shadow-xs ring-1 ring-sky-500/40'
                  : 'bg-card border-border/80 hover:border-border hover:bg-muted/30 shadow-xs'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-muted-foreground">{bn ? 'নতুন আবেদনকারী' : 'New Applicants'}</span>
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
              </div>
              <div className="text-2xl font-black font-display tracking-tight text-sky-600 dark:text-sky-400 mt-1">
                {formatDigits(newStudentCount, bn)}
              </div>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="card-elevated p-3 sm:p-4 flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2.5 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder={bn ? 'আবেদনকারীর নাম, আইডি, রোল, মোবাইল দিয়ে খুঁজুন...' : 'Search by name, ID, roll, phone...'}
                  className="pl-9 h-9 text-xs sm:text-sm bg-background border-border/80 rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AdmissionStatusFilter)}>
                <SelectTrigger className="h-9 text-xs sm:text-sm w-full sm:w-[150px] shrink-0 bg-background border-border/80 rounded-xl">
                  <SelectValue placeholder={bn ? 'স্ট্যাটাস' : 'Status'} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{bn ? 'সকল স্ট্যাটাস' : 'All Status'}</SelectItem>
                  <SelectItem value="pending">{bn ? 'অপেক্ষমাণ' : 'Pending'}</SelectItem>
                  <SelectItem value="approved">{bn ? 'অনুমোদিত' : 'Approved'}</SelectItem>
                  <SelectItem value="rejected">{bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</SelectItem>
                  <SelectItem value="new_student">{bn ? 'নতুন আবেদনকারী' : 'New Applicants'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterDivisionId} onValueChange={(v) => { setFilterDivisionId(v); setFilterClassId('all'); }}>
                <SelectTrigger className="h-9 text-xs sm:text-sm w-full sm:w-[135px] shrink-0 bg-background border-border/80 rounded-xl">
                  <SelectValue placeholder={bn ? 'বিভাগ' : 'Division'} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{bn ? 'সকল বিভাগ' : 'All Divisions'}</SelectItem>
                  {divisions.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSessionId} onValueChange={setFilterSessionId}>
                <SelectTrigger className="h-9 text-xs sm:text-sm w-full sm:w-[125px] shrink-0 bg-background border-border/80 rounded-xl">
                  <SelectValue placeholder={bn ? 'সেশন' : 'Session'} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{bn ? 'সকল সেশন' : 'All Sessions'}</SelectItem>
                  {academicSessions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{bn ? (s.name_bn || s.name) : s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterClassId} onValueChange={setFilterClassId}>
                <SelectTrigger className="h-9 text-xs sm:text-sm w-full sm:w-[140px] shrink-0 bg-background border-border/80 rounded-xl">
                  <SelectValue placeholder={bn ? 'শ্রেণী' : 'Class'} />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="all">{bn ? 'সকল শ্রেণী' : 'All Classes'}</SelectItem>
                  {filteredClasses.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {bn ? c.name_bn : c.name}{c.divisions ? ` (${bn ? c.divisions.name_bn : c.divisions.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(filterDivisionId !== 'all' || filterSessionId !== 'all' || filterClassId !== 'all' || statusFilter !== 'all' || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterDivisionId('all');
                  setFilterSessionId('all');
                  setFilterClassId('all');
                  setStatusFilter('all');
                  setSearch('');
                }}
                className="h-9 text-xs text-muted-foreground hover:text-foreground shrink-0 rounded-xl cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                {bn ? 'রিসেট' : 'Reset'}
              </Button>
            )}
          </div>

          {/* Applications Table / Mobile Cards */}
          <div className="card-elevated overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="md:hidden divide-y divide-border/60">
                  {filteredList.map((s: any) => {
                    const effectiveClass = getClassName(getEffectiveClassId(s));
                    const appStatus = s.approval_status || 'pending';
                    return (
                      <div
                        key={s.id}
                        className="p-3.5 bg-card/60 hover:bg-card transition-colors space-y-2.5 cursor-pointer"
                        onClick={() => setShowDetail(s)}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {s.photo_url ? (
                              <img src={s.photo_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-border shadow-xs" />
                            ) : (
                              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0 ring-1 ring-primary/20">
                                {s.name_bn?.[0] || s.name_en?.[0] || '?'}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-semibold text-foreground text-sm truncate leading-tight">
                                {s.name_bn || s.name_en || '-'}
                              </h4>
                              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                                <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4.5 bg-primary/5 text-primary border-primary/20">
                                  {formatDigits(s.registration_no || s.student_id || '-', bn)}
                                </Badge>
                                {effectiveClass !== '-' && (
                                  <span className="text-[10px] text-muted-foreground truncate">• {effectiveClass}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {getApprovalBadge(appStatus)}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-[11px] text-muted-foreground">
                            {formatDate(s.admission_date || s.created_at)}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {canApproveItem && appStatus !== 'approved' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveReject(s, 'approved')}
                                className="h-7 px-2.5 text-[11px] text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 rounded-lg"
                              >
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {bn ? 'অনুমোদন' : 'Approve'}
                              </Button>
                            )}
                            {canApproveItem && appStatus === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApproveReject(s, 'rejected')}
                                className="h-7 px-2.5 text-[11px] text-rose-600 border-rose-500/30 hover:bg-rose-500/10 rounded-lg"
                              >
                                <XCircle className="w-3 h-3 mr-1" />
                                {bn ? 'প্রত্যাখ্যান' : 'Reject'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowDetail(s)}
                              className="h-7 px-2 text-[11px]"
                            >
                              <Eye className="w-3.5 h-3.5 text-primary" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {filteredList.length === 0 && (
                    <div className="text-center py-10 text-sm text-muted-foreground">
                      {bn ? 'কোনো ভর্তি আবেদন পাওয়া যায়নি' : 'No admission applications found'}
                    </div>
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/40 border-b border-border/60">
                      <tr>
                        <th className="text-center w-14 px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                          {bn ? 'রোল' : 'Roll'}
                        </th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                          {bn ? 'আবেদনকারীর নাম' : 'Applicant Name'}
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                          {bn ? 'রেজি / আইডি' : 'Reg / ID'}
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                          {bn ? 'শ্রেণী ও বিভাগ' : 'Class & Division'}
                        </th>
                        <th className="text-left px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                          {bn ? 'আবেদনের তারিখ' : 'Applied Date'}
                        </th>
                        <th className="text-center px-3 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                          {bn ? 'ধরন' : 'Type'}
                        </th>
                        <th className="text-center px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                          {bn ? 'স্ট্যাটাস' : 'Status'}
                        </th>
                        <th className="text-right px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                          {bn ? 'অ্যাকশন' : 'Actions'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {filteredList.map((s: any) => {
                        const effectiveClass = getClassName(getEffectiveClassId(s));
                        const divName = bn ? s.divisions?.name_bn : (s.divisions?.name || '-');
                        const isOld = s.student_type === 'old';
                        const appStatus = s.approval_status || 'pending';
                        return (
                          <tr
                            key={s.id}
                            className="group border-b border-border/40 last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer"
                            onClick={() => setShowDetail(s)}
                          >
                            <td className="text-center px-4 py-3.5 text-xs font-mono font-bold text-primary/80">
                              {s.roll_number ? formatDigits(s.roll_number, bn) : <span className="text-muted-foreground/40">—</span>}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-3">
                                {s.photo_url ? (
                                  <img src={s.photo_url} className="w-10 h-10 rounded-full object-cover shrink-0 ring-1 ring-border shadow-xs" alt="" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-primary/20">
                                    {s.name_bn?.[0] || s.name_en?.[0] || '?'}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-foreground text-sm block truncate">
                                      {s.name_bn || s.name_en || '-'}
                                    </span>
                                    {s.is_free && (
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                                        {bn ? 'বিনা বেতন' : 'Free'}
                                      </span>
                                    )}
                                  </div>
                                  {(s.father_phone || s.phone || s.guardian_phone) && (
                                    <span className="text-xs text-muted-foreground block">
                                      {formatDigits(s.father_phone || s.phone || s.guardian_phone, bn)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-xs font-mono text-muted-foreground">
                              <Badge variant="outline" className="font-mono text-[11px] px-2 py-0.5 bg-primary/5 text-primary border-primary/20">
                                {formatDigits(s.registration_no || s.student_id || '-', bn)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 text-xs">
                              <div className="font-medium text-foreground">{effectiveClass}</div>
                              {divName !== '-' && <div className="text-[11px] text-muted-foreground">{divName}</div>}
                            </td>
                            <td className="px-4 py-3.5 text-xs text-muted-foreground">
                              <div>{formatDate(s.admission_date || s.created_at)}</div>
                              <div className="text-[11px] opacity-80">
                                {getSessionName(s.session_id, s.admission_session || s.session_year)}
                              </div>
                            </td>
                            <td className="text-center px-3 py-3.5">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                                  isOld
                                    ? 'bg-violet-500/10 text-violet-600 border-violet-500/20'
                                    : 'bg-sky-500/10 text-sky-600 border-sky-500/20'
                                }`}
                              >
                                {isOld ? (bn ? 'পুরাতন' : 'Old') : (bn ? 'নতুন' : 'New')}
                              </span>
                            </td>
                            <td className="text-center px-4 py-3.5">
                              {getApprovalBadge(appStatus)}
                            </td>
                            <td className="text-right px-6 py-3.5" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-end gap-1.5">
                                {(appStatus === 'pending' || appStatus === 'needs_revision') && (
                                  <>
                                    {canApproveItem && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApproveReject(s, 'approved')}
                                        disabled={statusMutation.isPending}
                                        className="h-8 px-2.5 text-xs font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 rounded-xl"
                                        title={bn ? 'অনুমোদন করুন' : 'Approve'}
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                        {bn ? 'অনুমোদন' : 'Approve'}
                                      </Button>
                                    )}
                                    {canApproveItem && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setRevisionStudent(s)}
                                        className="h-8 px-2 text-xs font-semibold text-amber-600 border-amber-500/30 hover:bg-amber-500/10 rounded-xl"
                                        title={bn ? 'সংশোধনের নির্দেশ দিন' : 'Send for Revision'}
                                      >
                                        <RotateCcw className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                    {canApproveItem && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleApproveReject(s, 'rejected')}
                                        disabled={statusMutation.isPending}
                                        className="h-8 px-2 text-xs font-semibold text-rose-600 border-rose-500/30 hover:bg-rose-500/10 rounded-xl"
                                        title={bn ? 'প্রত্যাখ্যান করুন' : 'Reject'}
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                      </Button>
                                    )}
                                  </>
                                )}

                                {canApproveItem && (appStatus === 'pending' || appStatus === 'needs_revision') && (
                                  <Button
                                    size="sm"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-bold rounded-xl shadow-xs h-8 px-3"
                                    onClick={() => {
                                      setEditStudent(s);
                                      setAdmissionModalMode('approve');
                                      setShowAdd(true);
                                    }}
                                  >
                                    <FileCheck className="w-3.5 h-3.5" />
                                    <span>{bn ? 'ফুল ফর্ম রিভিউ ও অনুমোদন' : 'Review & Approve'}</span>
                                  </Button>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowDetail(s)}
                                  className="gap-1.5 text-xs font-semibold rounded-xl shadow-xs hover:bg-primary/10 hover:text-primary transition-colors h-8"
                                >
                                  <Eye className="w-3.5 h-3.5 text-primary" />
                                  <span>{bn ? 'বিস্তারিত' : 'View'}</span>
                                </Button>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl cursor-pointer">
                                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-52 rounded-xl">
                                    {canApproveItem && (
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditStudent(s);
                                          setAdmissionModalMode('approve');
                                          setShowAdd(true);
                                        }}
                                        className="gap-2 cursor-pointer text-xs font-semibold text-emerald-600"
                                      >
                                        <FileCheck className="w-3.5 h-3.5" />
                                        <span>{bn ? 'ফুল ফর্ম রিভিউ ও অনুমোদন' : 'Full Form Review'}</span>
                                      </DropdownMenuItem>
                                    )}
                                    {canApproveItem && appStatus !== 'approved' && (
                                      <DropdownMenuItem onClick={() => handleApproveReject(s, 'approved')} className="gap-2 cursor-pointer text-xs text-emerald-600">
                                        <CheckCircle className="w-3.5 h-3.5" />
                                        <span>{bn ? 'সরাসরি অনুমোদন করুন' : 'Direct Approve'}</span>
                                      </DropdownMenuItem>
                                    )}
                                    {canApproveItem && appStatus !== 'needs_revision' && (
                                      <DropdownMenuItem onClick={() => setRevisionStudent(s)} className="gap-2 cursor-pointer text-xs text-amber-600">
                                        <RotateCcw className="w-3.5 h-3.5" />
                                        <span>{bn ? 'সংশোধনের নির্দেশ দিন' : 'Send for Revision'}</span>
                                      </DropdownMenuItem>
                                    )}
                                    {canApproveItem && appStatus !== 'rejected' && (
                                      <DropdownMenuItem onClick={() => handleApproveReject(s, 'rejected')} className="gap-2 cursor-pointer text-xs text-rose-600">
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>{bn ? 'প্রত্যাখ্যান করুন' : 'Reject'}</span>
                                      </DropdownMenuItem>
                                    )}
                                    {canApproveItem && appStatus !== 'pending' && (
                                      <DropdownMenuItem onClick={() => handleApproveReject(s, 'pending')} className="gap-2 cursor-pointer text-xs text-amber-600">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>{bn ? 'অপেক্ষমাণে রাখুন' : 'Move to Pending'}</span>
                                      </DropdownMenuItem>
                                    )}
                                    {canEditItem && (
                                      <DropdownMenuItem onClick={() => { setEditStudent(s); setAdmissionModalMode('edit'); setShowAdd(true); }} className="gap-2 cursor-pointer text-xs">
                                        <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>{bn ? 'তথ্য সম্পাদনা' : 'Edit Info'}</span>
                                      </DropdownMenuItem>
                                    )}
                                    {isFeatureAllowed('action_print_profile') !== false && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          printStudentProfile({
                                            student: s,
                                            bn,
                                            institution: institution || {},
                                            className: getClassName(getEffectiveClassId(s)),
                                            sessionName: getSessionName(s.session_id, s.admission_session || s.session_year),
                                          })
                                        }
                                        className="gap-2 cursor-pointer text-xs"
                                      >
                                        <Printer className="w-3.5 h-3.5 text-blue-600" />
                                        <span>{bn ? 'প্রোফাইল প্রিন্ট' : 'Print Profile'}</span>
                                      </DropdownMenuItem>
                                    )}
                                    {canDeleteItem && isFeatureAllowed('action_delete_student') !== false && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => setDeleteId(s.id)}
                                          className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                          <span>{bn ? 'মুছে ফেলুন' : 'Delete'}</span>
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {filteredList.length === 0 && (
                        <tr>
                          <td colSpan={8} className="text-center py-16 text-sm text-muted-foreground">
                            {bn ? 'কোনো ভর্তি আবেদন পাওয়া যায়নি' : 'No admission applications found'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </AdminLayout>

      {/* Admission Form Modal (opens on + নতুন ভর্তি আবেদন, Edit or Review & Approve) */}
      <AdmissionForm
        open={showAdd}
        onOpenChange={(o) => {
          setShowAdd(o);
          if (!o) {
            setEditStudent(null);
            setAdmissionModalMode('admission');
          }
        }}
        editStudent={editStudent}
        mode={admissionModalMode}
        bypassRequirements={canBypassRequirements}
        onRevision={(st) => setRevisionStudent(st)}
        onReject={(st) => setRejectionStudent(st)}
        onApprove={() => {
          queryClient.invalidateQueries({ queryKey: ['admission-students'] });
          refetch();
        }}
      />

      {/* Detail View Dialog */}
      <Dialog open={!!showDetail} onOpenChange={(o) => { if (!o) setShowDetail(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[40px]">
          <DialogHeader>
            <DialogTitle className="text-center">{bn ? 'আবেদনকারীর বিস্তারিত' : 'Applicant Details'}</DialogTitle>
          </DialogHeader>
          {showDetail && (
            <StudentProfileModal
              student={showDetail}
              bn={bn}
              getApprovalBadge={getApprovalBadge}
              getSessionName={getSessionName}
              getClassName={(cId: string) => getClassName(cId || getEffectiveClassId(showDetail))}
              setEditStudent={setEditStudent}
              setShowDetail={setShowDetail}
              setShowAdd={setShowAdd}
              statusMutation={statusMutation}
              canEditItem={canEditItem}
              canDeleteItem={canDeleteItem}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => { if (!o) setDeleteId(null); }}
        onConfirm={() => {
          if (deleteId) {
            deleteMutation.mutate(deleteId);
            setDeleteId(null);
          }
        }}
        isPending={deleteMutation.isPending}
        itemName={(() => {
          const s = students.find((st: any) => st.id === deleteId);
          return s?.name_bn || s?.name_en;
        })()}
        itemIdentifier={(() => {
          const s = students.find((st: any) => st.id === deleteId);
          return s?.roll_number ? `${bn ? 'রোল:' : 'Roll:'} ${formatDigits(s.roll_number, bn)}` : (s?.student_id || s?.registration_no);
        })()}
        itemDetails={(() => {
          const s = students.find((st: any) => st.id === deleteId);
          if (!s) return [];
          return [
            { label: bn ? 'শ্রেণি' : 'Class', value: getClassName(getEffectiveClassId(s)) },
            { label: bn ? 'অভিভাবকের মোবাইল' : 'Guardian Phone', value: s.father_phone || s.phone || '-' },
          ];
        })()}
        moduleKey="student"
        title={bn ? 'আবেদন মুছে ফেলতে চান?' : 'Delete Application?'}
        description={
          bn
            ? 'এই শিক্ষার্থীর ভর্তি আবেদন এবং সংশ্লিষ্ট সকল রেকর্ড অপসারিত হবে।'
            : 'This admission application and all related records will be removed.'
        }
      />

      {/* ══════════════ REJECTION REASON MODAL ══════════════ */}
      <Dialog open={!!rejectionStudent} onOpenChange={(o) => { if (!o) { setRejectionStudent(null); setRejectionReason(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              {bn ? 'ভর্তি আবেদন প্রত্যাখ্যানের কারণ' : 'Reason for Admission Rejection'}
            </DialogTitle>
            <DialogDescription>
              {bn
                ? `"${rejectionStudent?.name_bn || rejectionStudent?.name_en || 'শিক্ষার্থী'}"-এর ভর্তি আবেদন প্রত্যাখ্যানের নির্দিষ্ট কারণ উল্লেখ করুন:`
                : `Specify the reason for rejecting this admission application:`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Textarea
              placeholder={bn ? 'যেমন: বয়সের সীমাবদ্ধতা / ভুয়া জন্ম নিবন্ধন / প্রয়োজনীয় সনদের অভাব...' : 'E.g., age criteria not met / invalid birth cert...'}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="min-h-[90px]"
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setRejectionStudent(null); setRejectionReason(''); }}>
              {bn ? 'ফিরে যান' : 'Cancel'}
            </Button>
            <Button
              variant="destructive"
              disabled={statusMutation.isPending || !rejectionReason.trim()}
              onClick={() => {
                if (rejectionStudent) {
                  statusMutation.mutate({ id: rejectionStudent.id, status: 'rejected', reason: rejectionReason.trim() });
                }
              }}
            >
              {statusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <XCircle className="w-4 h-4 mr-1" />}
              {bn ? 'নিশ্চিত প্রত্যাখ্যান' : 'Confirm Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════ REVISION / CORRECTION MODAL ══════════════ */}
      <Dialog open={!!revisionStudent} onOpenChange={(o) => { if (!o) { setRevisionStudent(null); setSelectedCorrectionFields([]); setCorrectionNotes(''); } }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              {bn ? 'ভর্তি আবেদনে তথ্য সংশোধনের নির্দেশ দিন' : 'Send Back for Revision'}
            </DialogTitle>
            <DialogDescription>
              {bn
                ? `"${revisionStudent?.name_bn || revisionStudent?.name_en || 'শিক্ষার্থী'}"-এর যে যে ফিল্ডে ভুল রয়েছে তা নির্বাচন করুন এবং নির্দেশনা লিখে পাঠান:`
                : `Select the fields requiring correction and provide instructions for the applicant:`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs font-bold mb-2 block text-muted-foreground">
                {bn ? 'যে যে ফিল্ডে ভুল রয়েছে (টিক দিন):' : 'Select fields requiring correction:'}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-muted/30 p-3 rounded-xl border max-h-56 overflow-y-auto">
                {STUDENT_CORRECTION_FIELDS.map((field) => {
                  const isChecked = selectedCorrectionFields.includes(field.key);
                  return (
                    <label
                      key={field.key}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isChecked ? 'bg-amber-500/10 border-amber-500/40 text-foreground font-medium' : 'bg-background hover:bg-muted/50 border-border text-muted-foreground'
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedCorrectionFields(prev => [...prev, field.key]);
                          } else {
                            setSelectedCorrectionFields(prev => prev.filter(k => k !== field.key));
                          }
                        }}
                        className="mt-0.5"
                      />
                      <span>{bn ? field.label_bn : field.label_en}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-muted-foreground">
                {bn ? 'অ্যাডমিন নির্দেশনা বা সংশোধনী বার্তা:' : 'Revision Instructions:'}
              </Label>
              <Textarea
                placeholder={bn ? 'যেমন: আপনার ছবি স্পষ্ট নয় এবং জন্ম নিবন্ধন সনদের সাথে মাতার নামের বানান মেলেনি। অনুগ্রহ করে সঠিক তথ্য আপলোড করুন।' : 'E.g., Your photo is blurred and mother name does not match birth cert. Please update.'}
                value={correctionNotes}
                onChange={(e) => setCorrectionNotes(e.target.value)}
                className="min-h-[100px] text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setRevisionStudent(null); setSelectedCorrectionFields([]); setCorrectionNotes(''); }}>
              {bn ? 'বাতিল' : 'Cancel'}
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2"
              disabled={revisionMutation.isPending || (!correctionNotes.trim() && selectedCorrectionFields.length === 0)}
              onClick={() => {
                if (revisionStudent) {
                  revisionMutation.mutate({
                    id: revisionStudent.id,
                    fields: selectedCorrectionFields,
                    notes: correctionNotes.trim(),
                  });
                }
              }}
            >
              {revisionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {bn ? 'সংশোধনের নির্দেশ পাঠান' : 'Send Revision Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminStudentAdmission;
