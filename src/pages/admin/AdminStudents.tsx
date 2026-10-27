import AdminLayout from '@/components/AdminLayout';
import TabContainer from '@/components/TabContainer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Trash2, Loader2, CheckCircle, Eye, XCircle, Clock, Pencil, Filter, UserX, UserCheck, Printer, History, Download, BarChart3, Layers, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import StudentProfileModal from '@/components/profile/StudentProfileModal';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { printStudentProfile } from '@/lib/studentProfilePrint';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useConfirm } from '@/contexts/ConfirmContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import AdmissionForm from '@/components/admission/AdmissionForm';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { bnToEn, enToBn, formatDigits } from '@/lib/utils';
import { invalidateAllStudentQueries } from '@/lib/studentQueryInvalidator';

const AdminStudents = () => {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const { checkApproval, isRecordPending } = useApprovalCheck('/admin/students', 'students');
  const { canAddItem, canEditItem, canDeleteItem, canApproveItem, isFeatureAllowed } = usePagePermissions('/admin/students');
  const confirm = useConfirm();
  const bn = language === 'bn';
  const navigate = useNavigate();
  const { data: institution } = useInstitutionInfo();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<any>(null);
  const [editStudent, setEditStudent] = useState<any>(null);
  const [filterDivisionId, setFilterDivisionId] = useState('all');
  const [filterSessionId, setFilterSessionId] = useState('all');
  const [filterClassId, setFilterClassId] = useState('all');
  const [filterApproval, setFilterApproval] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortKey, setSortKey] = useState<'roll' | 'name' | 'student_id'>('roll');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typeChangeFor, setTypeChangeFor] = useState<any>(null);
  const [typeChangeReason, setTypeChangeReason] = useState('');
  const [typeHistoryFor, setTypeHistoryFor] = useState<any>(null);
  // Realtime subscription for auto-refresh
  useEffect(() => {
    const channelName = `students-realtime-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    let channel: any = null;
    try {
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
          invalidateAllStudentQueries(queryClient);
        })
        .subscribe();
    } catch (e) {
      console.warn('Realtime subscription error in AdminStudents:', e);
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
      const { data, error } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes-admin-all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*, divisions(name, name_bn, sort_order)').order('sort_order');
      if (error) throw error;
      // Sort by division serial first, then class serial
      return [...(data || [])].sort((a: any, b: any) => {
        const da = a.divisions?.sort_order ?? 9999;
        const db = b.divisions?.sort_order ?? 9999;
        if (da !== db) return da - db;
        return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
      });
    },
  });

  // Filter classes by selected division (only active classes in selection dropdown)
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

  // Self-healing migration: automatically convert any legacy Bengali digits in DB to English digits
  useEffect(() => {
    if (students && students.length > 0) {
      const bengaliRegex = /[০-৯]/;
      const needsFix = students.filter((s: any) => 
        (s.registration_no && bengaliRegex.test(String(s.registration_no))) ||
        (s.student_id && bengaliRegex.test(String(s.student_id))) ||
        (s.roll_number && bengaliRegex.test(String(s.roll_number)))
      );
      if (needsFix.length > 0) {
        Promise.all(needsFix.map((s: any) => {
          const newReg = bnToEn(s.registration_no || s.student_id);
          const newId = bnToEn(s.student_id || s.registration_no);
          const newRoll = s.roll_number ? bnToEn(s.roll_number) : s.roll_number;
          return supabase.from('students').update({
            registration_no: newReg,
            student_id: newId,
            roll_number: newRoll,
          } as any).eq('id', s.id);
        })).then(() => {
          queryClient.invalidateQueries({ queryKey: ['students'] });
          queryClient.invalidateQueries({ queryKey: ['exam-students'] });
        }).catch(err => {
          console.error('Self-healing student digits migration error:', err);
        });
      }
    }
  }, [students, queryClient]);

  // Self-healing migration: sync students of inactive classes to 'inactive' status
  useEffect(() => {
    if (classes && classes.length > 0 && students && students.length > 0) {
      const inactiveClassIds = new Set(classes.filter((c: any) => c.is_active === false).map((c: any) => c.id));
      if (inactiveClassIds.size > 0) {
        const activeStudentsInInactiveClass = students.filter((s: any) => 
          s.class_id && inactiveClassIds.has(s.class_id) && (s.status === 'active' || !s.status)
        );
        if (activeStudentsInInactiveClass.length > 0) {
          Promise.all(
            activeStudentsInInactiveClass.map((s: any) =>
              supabase.from('students').update({ status: 'inactive' } as any).eq('id', s.id)
            )
          ).then(() => {
            invalidateAllStudentQueries(queryClient);
          }).catch(err => {
            console.error('Self-healing inactive class students status sync error:', err);
          });
        }
      }
    }
  }, [classes, students, queryClient]);

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      if (await checkApproval('edit', { id, approval_status: status }, id, `ছাত্র স্ট্যাটাস: ${status}`)) return;
      const { error } = await supabase.from('students').update({ approval_status: status, status: status === 'approved' ? 'active' : status === 'rejected' ? 'inactive' : 'active' } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllStudentQueries(queryClient);
      toast.success(bn ? 'স্ট্যাটাস আপডেট হয়েছে' : 'Status updated');
    },
    onError: () => toast.error('Error'),
  });

  const studentTypeMutation = useMutation({
    mutationFn: async ({ id, type, reason }: { id: string; type: 'new' | 'old'; reason: string }) => {
      if (await checkApproval('edit', { id, student_type: type, reason }, id, `ছাত্রের ধরন: ${type} (${reason})`)) return;
      const { error } = await supabase.rpc('change_student_type', {
        p_student_id: id,
        p_new_type: type,
        p_reason: reason,
      });
      if (error) throw error;
    },
    onMutate: async ({ id, type }) => {
      await queryClient.cancelQueries({ queryKey: ['students'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['students'] });
      snapshots.forEach(([key, data]: any) => {
        if (Array.isArray(data)) {
          queryClient.setQueryData(key, data.map((s: any) => s.id === id ? { ...s, student_type: type } : s));
        }
      });
      return { snapshots };
    },
    onSuccess: () => {
      toast.success(bn ? 'ছাত্রের ধরন আপডেট হয়েছে' : 'Student type updated');
      setTypeChangeFor(null);
      setTypeChangeReason('');
    },
    onError: (e: any, _vars, ctx: any) => {
      ctx?.snapshots?.forEach(([key, data]: any) => queryClient.setQueryData(key, data));
      toast.error(e?.message || 'Error');
    },
    onSettled: () => {
      invalidateAllStudentQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['student-type-history'] });
    },
  });

  const { data: typeHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['student-type-history', typeHistoryFor?.id],
    queryFn: async () => {
      if (!typeHistoryFor?.id) return [];
      const { data, error } = await supabase.rpc('get_student_type_history', { p_student_id: typeHistoryFor.id });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!typeHistoryFor?.id,
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, currentStatus }: { id: string; currentStatus: string }) => {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
      if (await checkApproval('edit', { id, status: newStatus }, id, `ছাত্র ${newStatus === 'inactive' ? 'ডিএক্টিভ' : 'এক্টিভ'}`)) return;
      const { error } = await supabase.from('students').update({ status: newStatus } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllStudentQueries(queryClient);
      toast.success(bn ? 'স্ট্যাটাস আপডেট হয়েছে' : 'Status updated');
    },
    onError: () => toast.error('Error'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const student = students.find((s: any) => s.id === id);
      if (await checkApproval('delete', { id, name_bn: student?.name_bn, student_id: student?.student_id }, id, `ছাত্র মুছুন: ${student?.name_bn}`)) return;
      
      const { error: hardErr } = await supabase.from('students').delete().eq('id', id);
      if (hardErr) {
        // Fallback to soft-delete if foreign key constraint blocks hard delete
        const { error: softErr } = await supabase
          .from('students')
          .update({ deleted_at: new Date().toISOString(), status: 'inactive' } as any)
          .eq('id', id);
        if (softErr) throw softErr;
      }
    },
    onSuccess: () => {
      invalidateAllStudentQueries(queryClient);
      toast.success(bn ? 'ছাত্র মুছে ফেলা হয়েছে' : 'Student deleted');
    },
    onError: () => toast.error('Error'),
  });

  const parseRollNumber = useCallback((roll: string | null | undefined) => {
    const clean = String(roll || '').replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    const parsed = Number.parseInt(clean, 10);
    return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
  }, []);

  const getEffectiveClassId = useCallback((student: any) => {
    if (!student) return null;
    if (student.class_id) return student.class_id;
    if (student.admission_data && typeof student.admission_data === 'object' && student.admission_data.admission_class) {
      return student.admission_data.admission_class;
    }
    // Fallback: infer from roll number and division if available
    if (student.roll_number && classes.length > 0) {
      const cleanRoll = String(student.roll_number || '').replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
      const rollNum = parseInt(cleanRoll, 10);
      if (!isNaN(rollNum) && rollNum >= 1000) {
        const order = Math.floor(rollNum / 1000);
        const divClasses = student.division_id
          ? classes.filter((c: any) => c.division_id === student.division_id)
          : classes;
        if (divClasses.length > 0 && order >= 1 && order <= divClasses.length) {
          return divClasses[order - 1].id;
        }
      }
    }
    return null;
  }, [classes]);

  const isStudentEffectivelyInactive = useCallback((s: any) => {
    if (s.status === 'inactive') return true;
    const cId = getEffectiveClassId(s);
    const cls = classes.find((c: any) => c.id === cId);
    return cls && cls.is_active === false;
  }, [classes, getEffectiveClassId]);

  const baseFiltered = useMemo(() => {
    return students.filter((s: any) => {
      // Division filter
      if (filterDivisionId !== 'all') {
        if (s.division_id !== filterDivisionId) return false;
      }
      // Session filter
      if (filterSessionId !== 'all') {
        const selectedSession = academicSessions.find((as: any) => as.id === filterSessionId);
        const matchesId = s.session_id === filterSessionId;
        let matchesName = selectedSession && (s.admission_session === selectedSession.name || s.session_year === selectedSession.name || s.admission_session === selectedSession.name_bn || s.session_year === selectedSession.name_bn);
        if (!matchesId && !matchesName && selectedSession) {
          const sessYearDigits = selectedSession.name?.match(/\d{4}/)?.[0];
          const studentYearDigits = (String(s.session_year || s.admission_session || '')).replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d))).match(/\d{4}/)?.[0];
          if (sessYearDigits && studentYearDigits && sessYearDigits === studentYearDigits) {
            matchesName = true;
          }
        }
        if (!matchesId && !matchesName) return false;
      }
      // Class filter
      if (filterClassId !== 'all') {
        const effectiveCId = getEffectiveClassId(s);
        if (effectiveCId !== filterClassId) return false;
      }
      // Text search
      if (search) {
        const q = search.toLowerCase().trim();
        const qEn = bnToEn(q);
        const qBn = enToBn(q);
        const isNumeric = /^[0-9]+$/.test(qEn);

        if (isNumeric) {
          const sRoll = String(s.roll_number || '').trim();
          const sId = String(s.student_id || '').trim();
          const sReg = String(s.registration_no || '').trim();

          // Prioritize exact match on roll number, student ID, or registration
          if (
            sRoll === q || sRoll === qEn || sRoll === qBn ||
            sId === q || sId === qEn || sId === qBn ||
            sReg === q || sReg === qEn || sReg === qBn
          ) {
            return true;
          }
        }

        return (
          String(s.name_bn || '').toLowerCase().includes(q) ||
          String(s.name_en || '').toLowerCase().includes(q) ||
          String(s.student_id || '').toLowerCase().includes(q) ||
          String(s.registration_no || '').toLowerCase().includes(q) ||
          String(s.phone || '').toLowerCase().includes(q) ||
          String(s.guardian_phone || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [students, filterDivisionId, filterSessionId, academicSessions, filterClassId, getEffectiveClassId, search]);

  const allCount = baseFiltered.length;
  const activeCount = useMemo(() => baseFiltered.filter((s: any) => !isStudentEffectivelyInactive(s) && (s.approval_status === 'approved' || !s.approval_status)).length, [baseFiltered, isStudentEffectivelyInactive]);
  const pendingCount = useMemo(() => baseFiltered.filter((s: any) => (s.approval_status || 'pending') === 'pending').length, [baseFiltered]);
  const oldCount = useMemo(() => baseFiltered.filter((s: any) => s.student_type === 'old').length, [baseFiltered]);
  const newCount = useMemo(() => baseFiltered.filter((s: any) => s.student_type !== 'old').length, [baseFiltered]);
  const inactiveCount = useMemo(() => baseFiltered.filter((s: any) => isStudentEffectivelyInactive(s) || s.approval_status === 'rejected').length, [baseFiltered, isStudentEffectivelyInactive]);

  const filtered = useMemo(() => {
    return baseFiltered.filter((s: any) => {
      if (filterStatus === 'active') {
        return !isStudentEffectivelyInactive(s) && (s.approval_status === 'approved' || !s.approval_status);
      }
      if (filterStatus === 'pending') {
        return (s.approval_status || 'pending') === 'pending';
      }
      if (filterStatus === 'old') {
        return s.student_type === 'old';
      }
      if (filterStatus === 'new') {
        return s.student_type !== 'old';
      }
      if (filterStatus === 'inactive') {
        return isStudentEffectivelyInactive(s) || s.approval_status === 'rejected';
      }
      return true;
    });
  }, [baseFiltered, filterStatus, isStudentEffectivelyInactive]);

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const sortIcon = (key: typeof sortKey) => sortKey !== key ? '↕' : (sortDir === 'asc' ? '↑' : '↓');

  const sortedFiltered = useMemo(() => {
    return [...filtered].sort((a: any, b: any) => {
      let cmp = 0;
      if (sortKey === 'roll') {
        cmp = parseRollNumber(a.roll_number) - parseRollNumber(b.roll_number);
      } else if (sortKey === 'name') {
        const nameA = a.name_bn || a.name_en || '';
        const nameB = b.name_bn || b.name_en || '';
        cmp = nameA.localeCompare(nameB, 'bn');
      } else if (sortKey === 'student_id') {
        const idA = a.registration_no || a.student_id || '';
        const idB = b.registration_no || b.student_id || '';
        cmp = String(idA).localeCompare(String(idB));
      }
      if (cmp !== 0) return sortDir === 'asc' ? cmp : -cmp;
      return String(a.created_at || '').localeCompare(String(b.created_at || ''));
    });
  }, [filtered, sortKey, sortDir, parseRollNumber]);

  const handleExportStudents = () => {
    if (!sortedFiltered || sortedFiltered.length === 0) {
      toast.info(bn ? 'এক্সপোর্ট করার মতো কোনো শিক্ষার্থী নেই' : 'No students to export');
      return;
    }
    const headers = [
      bn ? 'ক্রমিক' : 'Serial',
      bn ? 'রোল' : 'Roll',
      bn ? 'রেজি/আইডি' : 'Student ID',
      bn ? 'নাম (বাংলা)' : 'Name (Bangla)',
      bn ? 'নাম (ইংরেজি)' : 'Name (English)',
      bn ? 'শ্রেণী' : 'Class',
      bn ? 'বিভাগ' : 'Division',
      bn ? 'সেশন' : 'Session',
      bn ? 'ছাত্রের ধরন' : 'Student Type',
      bn ? 'অনুমোদন' : 'Approval',
      bn ? 'স্ট্যাটাস' : 'Status',
      bn ? 'মোবাইল' : 'Mobile',
      bn ? 'পিতার নাম' : 'Father Name',
    ];
    const rows = sortedFiltered.map((s: any, idx: number) => {
      const clsName = getClassName(getEffectiveClassId(s));
      const divName = bn ? s.divisions?.name_bn : (s.divisions?.name || '-');
      const sessName = getSessionName(s.session_id, s.admission_session || s.session_year);
      const isInactive = isStudentEffectivelyInactive(s);
      return [
        idx + 1,
        s.roll_number || '-',
        s.registration_no || s.student_id || '-',
        `"${(s.name_bn || '').replace(/"/g, '""')}"`,
        `"${(s.name_en || '').replace(/"/g, '""')}"`,
        `"${clsName.replace(/"/g, '""')}"`,
        `"${divName.replace(/"/g, '""')}"`,
        `"${sessName.replace(/"/g, '""')}"`,
        s.student_type === 'old' ? (bn ? 'পুরাতন' : 'Old') : (bn ? 'নতুন' : 'New'),
        s.approval_status === 'approved' ? (bn ? 'অনুমোদিত' : 'Approved') : (bn ? 'অপেক্ষমাণ' : 'Pending'),
        !isInactive ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive'),
        s.phone || s.guardian_phone || '-',
        `"${(s.father_name || '').replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(bn ? 'শিক্ষার্থী তালিকা সফলভাবে এক্সপোর্ট হয়েছে' : 'Students list exported successfully');
  };

  const getApprovalBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success"><CheckCircle className="w-3 h-3" />{bn ? 'অনুমোদিত' : 'Approved'}</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-destructive/10 text-destructive"><XCircle className="w-3 h-3" />{bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</span>;
      default: return <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-warning/10 text-warning"><Clock className="w-3 h-3" />{bn ? 'অপেক্ষমাণ' : 'Pending'}</span>;
    }
  };

  const getClassName = (classId: string | null) => {
    if (!classId) return '-';
    const cls = classes.find((c: any) => c.id === classId);
    if (!cls) return '-';
    const name = bn ? cls.name_bn : cls.name;
    return cls.is_active ? name : `${name} (${bn ? 'নিষ্ক্রিয়' : 'Inactive'})`;
  };

  // Pre-calculate class-wise serials for all students
  const classSerialMap = useMemo(() => {
    const map = new Map<string, number>();
    const byClass: Record<string, any[]> = {};
    for (const s of students) {
      const cId = getEffectiveClassId(s);
      if (cId) {
        if (!byClass[cId]) byClass[cId] = [];
        byClass[cId].push(s);
      }
    }
    for (const cId of Object.keys(byClass)) {
      const sorted = [...byClass[cId]].sort((a: any, b: any) => {
        const rollA = parseRollNumber(a.roll_number);
        const rollB = parseRollNumber(b.roll_number);
        if (rollA !== rollB) return rollA - rollB;
        return String(a.created_at || '').localeCompare(String(b.created_at || ''));
      });
      sorted.forEach((s, idx) => {
        map.set(s.id, idx + 1);
      });
    }
    return map;
  }, [students, getEffectiveClassId]);

  const getClassSerial = (student: any) => {
    return classSerialMap.get(student?.id) ?? '-';
  };

  const getSessionName = (sessionId: string | null, fallback: any) => {
    let name = '';
    if (sessionId) {
      const session = academicSessions.find((s: any) => s.id === sessionId);
      if (session) name = bn ? (session.name_bn || session.name) : session.name;
    }
    if (!name && fallback != null && fallback !== '') {
      const fbStr = String(fallback);
      const session = academicSessions.find((s: any) => s.name === fbStr || s.name_bn === fbStr || s.id === fbStr);
      if (session) {
        name = bn ? (session.name_bn || session.name) : session.name;
      } else {
        const cleanFb = fbStr.replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
        const yearDigits = cleanFb.match(/\d{4}/)?.[0];
        if (yearDigits) {
          const matchYear = academicSessions.find((s: any) => (s.name || '').includes(yearDigits) || (s.name_bn || '').includes(yearDigits));
          if (matchYear) name = bn ? (matchYear.name_bn || matchYear.name) : matchYear.name;
        }
        if (!name) name = fbStr;
      }
    }
    if (!name) return '-';
    return formatDigits(name, bn);
  };

  const studentListContent = (
    <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground leading-tight">
              {bn ? 'শিক্ষার্থী ব্যবস্থাপনা' : 'Student Management'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {bn ? `মোট ${formatDigits(sortedFiltered.length, true)} জন শিক্ষার্থী` : `Total ${sortedFiltered.length} students`}
            </p>
          </div>
          <div className="flex gap-2 items-center flex-wrap w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/reports')}
              className="h-8 text-xs flex items-center gap-1.5"
            >
              <BarChart3 className="w-3.5 h-3.5 text-primary" />
              {bn ? 'রিপোর্ট' : 'Reports'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/classes')}
              className="h-8 text-xs flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-primary" />
              {bn ? 'শ্রেণী ও বিভাগ' : 'Classes'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportStudents}
              className="h-8 text-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              {bn ? 'এক্সপোর্ট' : 'Export'}
            </Button>
            {canAddItem && isFeatureAllowed('tab_admission') !== false && (
              <Button onClick={() => setShowAdd(true)} className="btn-primary-gradient h-8 text-xs flex items-center gap-1.5 shadow-sm rounded-xl px-4">
                <Plus className="w-3.5 h-3.5 mr-1" /> {bn ? 'নতুন ভর্তি' : 'New Admission'}
              </Button>
            )}
          </div>
        </div>

        {/* Filter Bar (Matching Staff Style) */}
        <div className="card-elevated p-2.5 sm:p-4 space-y-2 lg:space-y-0 flex flex-col lg:flex-row gap-2 lg:gap-3 items-stretch lg:items-center">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={bn ? 'নাম, আইডি, রোল, ফোন দিয়ে খুঁজুন...' : 'Search by name, ID, roll, phone...'}
                className="pl-8 h-8 sm:h-9 text-xs sm:text-sm bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterDivisionId} onValueChange={(v) => { setFilterDivisionId(v); setFilterClassId('all'); }}>
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-[130px] shrink-0">
                <SelectValue placeholder={bn ? 'বিভাগ' : 'Division'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সকল বিভাগ' : 'All Divisions'}</SelectItem>
                {divisions.map((d: any) => (
                  <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSessionId} onValueChange={setFilterSessionId}>
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-[120px] shrink-0">
                <SelectValue placeholder={bn ? 'সেশন' : 'Session'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সকল সেশন' : 'All Sessions'}</SelectItem>
                {academicSessions.map((s: any) => (
                  <SelectItem key={s.id} value={s.id}>{bn ? (s.name_bn || s.name) : s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterClassId} onValueChange={setFilterClassId}>
              <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-[130px] shrink-0">
                <SelectValue placeholder={bn ? 'শ্রেণী' : 'Class'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সকল শ্রেণী' : 'All Classes'}</SelectItem>
                {filteredClasses.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {bn ? c.name_bn : c.name}{c.divisions ? ` (${bn ? c.divisions.name_bn : c.divisions.name})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scrollable Compact Filter Chips on Mobile & Desktop */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === 'all' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {bn ? 'সবগুলো' : 'All'} ({allCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('active')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === 'active' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {bn ? 'সক্রিয়' : 'Active'} ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === 'pending' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {bn ? 'অপেক্ষমাণ' : 'Pending'} ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('old')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === 'old' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {bn ? 'পুরাতন' : 'Old'} ({oldCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('new')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === 'new' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {bn ? 'নতুন' : 'New'} ({newCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('inactive')}
              className={`h-7 px-2.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === 'inactive' ? 'bg-primary text-primary-foreground shadow-xs' : 'bg-muted/60 text-muted-foreground hover:bg-muted'
              }`}
            >
              {bn ? 'নিষ্ক্রিয়' : 'Inactive'} ({inactiveCount})
            </button>
          </div>
        </div>

        {/* Student List Card */}
        <div className="card-elevated overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
          ) : (
            <>
              {/* Mobile Card View (< md) */}
              <div className="md:hidden divide-y divide-border/60">
                {sortedFiltered.map((s: any) => {
                  const effectiveClass = getClassName(getEffectiveClassId(s));
                  const isInactive = isStudentEffectivelyInactive(s);
                  const isPending = (s.approval_status || 'pending') === 'pending';
                  const classSerial = getClassSerial(s);
                  return (
                    <div 
                      key={s.id} 
                      className="p-3.5 bg-card/60 hover:bg-card transition-colors flex items-center justify-between gap-3 cursor-pointer"
                      onClick={() => navigate(`/admin/students/profile/${s.id}`)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {s.photo_url ? (
                          <img src={s.photo_url} alt="" className="w-11 h-11 rounded-full object-cover shrink-0 ring-1 ring-border shadow-xs" />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0 ring-1 ring-primary/20">
                            {s.name_bn?.[0] || s.name_en?.[0] || '?'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="font-semibold text-foreground text-sm truncate leading-tight">
                              {s.name_bn || s.name_en || '-'}
                            </h4>
                            {s.is_free && (
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-500/15 text-emerald-600 border border-emerald-500/20">
                                {bn ? 'বিনা বেতন' : 'Free'}
                              </span>
                            )}
                          </div>
                          {s.name_en && s.name_bn && (
                            <p className="text-[11px] text-muted-foreground truncate">{s.name_en}</p>
                          )}
                          <div className="flex items-center gap-1.5 flex-wrap mt-1">
                            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 h-4.5 bg-primary/5 text-primary border-primary/20">
                              {formatDigits(s.registration_no || s.student_id, bn)}
                            </Badge>
                            {s.roll_number && (
                              <span className="text-[10px] text-muted-foreground font-mono font-medium">
                                • রোল: {formatDigits(s.roll_number, bn)}
                              </span>
                            )}
                            {effectiveClass !== '-' && (
                              <span className="text-[10px] text-muted-foreground truncate">
                                • {effectiveClass}
                              </span>
                            )}
                            {isPending ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 font-medium">
                                {bn ? 'অপেক্ষমাণ' : 'Pending'}
                              </span>
                            ) : isInactive ? (
                              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-600 font-medium">
                                {bn ? 'নিষ্ক্রিয়' : 'Inactive'}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div onClick={(e) => e.stopPropagation()} className="shrink-0 flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/admin/students/profile/${s.id}`)}
                          className="gap-1.5 text-xs font-semibold rounded-xl shadow-xs"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span>{bn ? 'প্রোফাইল' : 'Profile'}</span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {sortedFiltered.length === 0 && (
                  <div className="text-center py-8 text-sm text-muted-foreground">{bn ? 'কোনো শিক্ষার্থী পাওয়া যায়নি' : 'No students found'}</div>
                )}
              </div>

              {/* Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/40 border-b border-border/60">
                    <tr>
                      <th className="text-center w-14 px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('roll')}>
                        {bn ? 'রোল' : 'Roll'} <span className="ml-1 opacity-60">{sortIcon('roll')}</span>
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('name')}>
                        {bn ? 'শিক্ষার্থীর নাম' : 'Student Name'} <span className="ml-1 opacity-60">{sortIcon('name')}</span>
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort('student_id')}>
                        {bn ? 'রেজি / আইডি' : 'Reg / ID'} <span className="ml-1 opacity-60">{sortIcon('student_id')}</span>
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                        {bn ? 'শ্রেণী ও বিভাগ' : 'Class & Division'}
                      </th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                        {bn ? 'সেশন' : 'Session'}
                      </th>
                      <th className="text-center px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                        {bn ? 'ধরন' : 'Type'}
                      </th>
                      <th className="text-center px-4 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                        {bn ? 'স্ট্যাটাস' : 'Status'}
                      </th>
                      <th className="text-right px-6 py-3.5 text-xs font-semibold text-muted-foreground uppercase">
                        {bn ? 'প্রোফাইল' : 'Profile'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {sortedFiltered.map((s: any) => {
                      const effectiveClass = getClassName(getEffectiveClassId(s));
                      const divName = bn ? s.divisions?.name_bn : (s.divisions?.name || '-');
                      const isOld = s.student_type === 'old';
                      const isApproved = s.approval_status === 'approved';
                      const isInactive = isStudentEffectivelyInactive(s);
                      const isPending = (s.approval_status || 'pending') === 'pending';
                      const isRowPending = studentTypeMutation.isPending && studentTypeMutation.variables?.id === s.id;

                      return (
                        <tr
                          key={s.id}
                          className="group border-b border-border/40 last:border-b-0 hover:bg-muted/40 transition-colors cursor-pointer"
                          onClick={() => navigate(`/admin/students/profile/${s.id}`)}
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
                                {s.name_en && s.name_bn && (
                                  <span className="text-xs text-muted-foreground truncate block">{s.name_en}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono text-muted-foreground">
                            <Badge variant="outline" className="font-mono text-[11px] px-2 py-0.5 bg-primary/5 text-primary border-primary/20">
                              {formatDigits(s.registration_no || s.student_id, bn)}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 text-xs">
                            <div className="font-medium text-foreground">{effectiveClass}</div>
                            {divName !== '-' && <div className="text-[11px] text-muted-foreground">{divName}</div>}
                          </td>
                          <td className="px-5 py-3.5 text-xs text-muted-foreground">
                            {getSessionName(s.session_id, s.admission_session || s.session_year)}
                          </td>
                          <td className="text-center px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            {canApproveItem ? (
                              <button
                                disabled={!isApproved || isRowPending}
                                onClick={() => { if (isApproved) { setTypeChangeFor(s); setTypeChangeReason(''); } }}
                                className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all cursor-pointer ${
                                  isOld ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20 hover:bg-violet-500/20' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/20'
                                }`}
                                title={bn ? 'ধরন পরিবর্তন করতে ক্লিক করুন' : 'Click to change type'}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isOld ? 'bg-violet-500' : 'bg-sky-500'}`} />
                                {isOld ? (bn ? 'পুরাতন' : 'Old') : (bn ? 'নতুন' : 'New')}
                              </button>
                            ) : (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${isOld ? 'bg-violet-500/10 text-violet-600 border-violet-500/20' : 'bg-sky-500/10 text-sky-600 border-sky-500/20'}`}>
                                {isOld ? (bn ? 'পুরাতন' : 'Old') : (bn ? 'নতুন' : 'New')}
                              </span>
                            )}
                          </td>
                          <td className="text-center px-4 py-3.5">
                            <div className="flex flex-col items-center gap-1">
                              {getApprovalBadge(s.approval_status || 'pending')}
                              {isInactive && (
                                <span className="text-[10px] text-destructive font-medium">({bn ? 'নিষ্ক্রিয়' : 'Inactive'})</span>
                              )}
                            </div>
                          </td>
                          <td className="text-right px-6 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/admin/students/profile/${s.id}`)}
                                className="gap-1.5 text-xs font-semibold rounded-xl shadow-xs hover:bg-primary/10 hover:text-primary transition-colors h-8"
                              >
                                <Eye className="w-3.5 h-3.5 text-primary" />
                                <span>{bn ? 'প্রোফাইল' : 'Profile'}</span>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl cursor-pointer">
                                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                  {canEditItem && (
                                    <DropdownMenuItem onClick={() => { setEditStudent(s); setShowAdd(true); }} className="gap-2 cursor-pointer text-xs">
                                      <Pencil className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>{bn ? 'তথ্য সম্পাদনা' : 'Edit Info'}</span>
                                    </DropdownMenuItem>
                                  )}
                                  {isFeatureAllowed('action_print_profile') !== false && (
                                    <DropdownMenuItem onClick={() => printStudentProfile({ student: s, bn, institution: institution || {}, className: getClassName(getEffectiveClassId(s)), sessionName: getSessionName(s.session_id, s.admission_session || s.session_year) })} className="gap-2 cursor-pointer text-xs">
                                      <Printer className="w-3.5 h-3.5 text-blue-600" />
                                      <span>{bn ? 'প্রোফাইল প্রিন্ট' : 'Print Profile'}</span>
                                    </DropdownMenuItem>
                                  )}
                                  {canEditItem && isFeatureAllowed('action_status_change') !== false && (
                                    <DropdownMenuItem
                                      onClick={async () => {
                                        const cur = s.status || 'active';
                                        const next = cur === 'active' ? 'inactive' : 'active';
                                        const ok = await confirm({
                                          title: bn ? (next === 'active' ? 'ছাত্র সক্রিয় করবেন?' : 'ছাত্র নিষ্ক্রিয় করবেন?') : (next === 'active' ? 'Activate student?' : 'Deactivate student?'),
                                          description: bn ? `"${s.name_bn || s.name_en}" কে ${next === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করতে চান?` : `Are you sure you want to ${next === 'active' ? 'activate' : 'deactivate'} "${s.name_en || s.name_bn}"?`,
                                          confirmText: bn ? 'হ্যাঁ' : 'Yes',
                                          cancelText: bn ? 'বাতিল' : 'Cancel',
                                          variant: next === 'active' ? 'default' : 'warning'
                                        });
                                        if (!ok) return;
                                        toggleActiveMutation.mutate({ id: s.id, currentStatus: cur });
                                      }}
                                      className="gap-2 cursor-pointer text-xs"
                                    >
                                      {(s.status || 'active') === 'active' ? (
                                        <>
                                          <UserX className="w-3.5 h-3.5 text-amber-600" />
                                          <span>{bn ? 'নিষ্ক্রিয় করুন' : 'Deactivate'}</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>{bn ? 'সক্রিয় করুন' : 'Activate'}</span>
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                  )}
                                  {canDeleteItem && isFeatureAllowed('action_delete_student') !== false && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => setDeleteId(s.id)} className="gap-2 cursor-pointer text-xs text-destructive focus:text-destructive">
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
                    {sortedFiltered.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-16 text-sm text-muted-foreground">
                          {bn ? 'কোনো শিক্ষার্থী পাওয়া যায়নি' : 'No students found'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      {/* Dynamic Admission Form */}
      <AdmissionForm open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) setEditStudent(null); }} editStudent={editStudent} />

      {/* Detail View Dialog */}
      <Dialog open={!!showDetail} onOpenChange={o => { if (!o) setShowDetail(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[40px]">
          <DialogHeader><DialogTitle className="text-center">{bn ? 'ছাত্রের বিস্তারিত' : 'Student Details'}</DialogTitle></DialogHeader>
          {showDetail && <StudentProfileModal student={showDetail} bn={bn} getApprovalBadge={getApprovalBadge} getSessionName={getSessionName} getClassName={(cId: string) => getClassName(cId || getEffectiveClassId(showDetail))} setEditStudent={setEditStudent} setShowDetail={setShowDetail} setShowAdd={setShowAdd} statusMutation={statusMutation} canEditItem={canEditItem} canDeleteItem={canDeleteItem} />}
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <>
    <AdminLayout>
      <TabContainer
        tabs={[
          ...(isFeatureAllowed('tab_list') !== false ? [{
            id: 'list',
            label: bn ? 'ছাত্র তালিকা' : 'Student List',
            icon: Eye,
            content: studentListContent,
          }] : []),
          ...(canAddItem && isFeatureAllowed('tab_admission') !== false ? [{
            id: 'admission',
            label: bn ? 'নতুন ভর্তি' : 'New Admission',
            icon: Plus,
            content: (
              <div className="space-y-4">
                <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                  <Plus className="w-6 h-6 text-primary" />
                  {bn ? 'নতুন ভর্তি ফর্ম' : 'New Admission Form'}
                </h1>
                <p className="text-muted-foreground text-sm">{bn ? 'নতুন ছাত্র ভর্তি করতে নিচের বাটনে ক্লিক করুন' : 'Click below to open the admission form'}</p>
                <Button onClick={() => setShowAdd(true)} className="btn-primary-gradient">
                  <Plus className="w-4 h-4 mr-2" /> {bn ? 'ভর্তি ফর্ম খুলুন' : 'Open Admission Form'}
                </Button>
                <AdmissionForm open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) setEditStudent(null); }} editStudent={editStudent} />
              </div>
            ),
          }] : []),
        ]}
        paramKey="tab"
      />
    </AdminLayout>
    <DeleteConfirmDialog
      open={!!deleteId}
      onOpenChange={(o) => { if (!o) setDeleteId(null); }}
      onConfirm={() => { if (deleteId) { deleteMutation.mutate(deleteId); setDeleteId(null); } }}
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
          { label: bn ? 'শ্রেণি' : 'Class', value: s.classes?.name_bn || s.classes?.name || '-' },
          { label: bn ? 'অভিভাবকের মোবাইল' : 'Guardian Phone', value: s.father_phone || s.phone || '-' },
        ];
      })()}
      moduleKey="student"
      title={bn ? 'শিক্ষার্থী প্রোফাইল মুছে ফেলতে চান?' : 'Delete Student Profile?'}
      description={bn ? 'এই শিক্ষার্থীর ভর্তি, ফলাফল, হাজিরা এবং বিগত ফি সংক্রান্ত যাবতীয় রেকর্ড অপসারিত হবে।' : 'All admission, results, attendance, and fee history for this student will be removed.'}
    />

    {/* Student Type Change Dialog */}
    <Dialog open={!!typeChangeFor} onOpenChange={(o) => { if (!o) { setTypeChangeFor(null); setTypeChangeReason(''); } }}>
      <DialogContent className="sm:max-w-md rounded-[28px]">
        <DialogHeader>
          <DialogTitle>{bn ? 'ছাত্রের ধরন পরিবর্তন' : 'Change Student Type'}</DialogTitle>
        </DialogHeader>
        {typeChangeFor && (() => {
          const current = (typeChangeFor.student_type === 'old') ? 'old' : 'new';
          const next: 'new' | 'old' = current === 'old' ? 'new' : 'old';
          const currentLabel = current === 'old' ? (bn ? 'পুরাতন' : 'Old') : (bn ? 'নতুন' : 'New');
          const nextLabel = next === 'old' ? (bn ? 'পুরাতন' : 'Old') : (bn ? 'নতুন' : 'New');
          return (
            <div className="space-y-4">
              <div className="text-sm">
                <div className="font-semibold">{typeChangeFor.name_bn}</div>
                <div className="text-xs text-muted-foreground">{typeChangeFor.student_id}</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{currentLabel}</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge>{nextLabel}</Badge>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  {bn ? 'কারণ (আবশ্যক)' : 'Reason (required)'}
                </label>
                <Textarea
                  value={typeChangeReason}
                  onChange={e => setTypeChangeReason(e.target.value)}
                  placeholder={bn ? 'কেন পরিবর্তন করছেন...' : 'Why are you changing...'}
                  rows={3}
                />
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => { setTypeChangeFor(null); setTypeChangeReason(''); }}>
                  {bn ? 'বাতিল' : 'Cancel'}
                </Button>
                <Button
                  disabled={!typeChangeReason.trim() || studentTypeMutation.isPending}
                  onClick={() => studentTypeMutation.mutate({ id: typeChangeFor.id, type: next, reason: typeChangeReason.trim() })}
                >
                  {studentTypeMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {bn ? 'নিশ্চিত করুন' : 'Confirm'}
                </Button>
              </DialogFooter>
            </div>
          );
        })()}
      </DialogContent>
    </Dialog>

    {/* Student Type History Dialog */}
    <Dialog open={!!typeHistoryFor} onOpenChange={(o) => { if (!o) setTypeHistoryFor(null); }}>
      <DialogContent className="sm:max-w-lg rounded-[28px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            {bn ? 'ধরন পরিবর্তনের ইতিহাস' : 'Type Change History'}
          </DialogTitle>
        </DialogHeader>
        {typeHistoryFor && (
          <div className="space-y-3">
            <div className="text-sm">
              <div className="font-semibold">{typeHistoryFor.name_bn}</div>
              <div className="text-xs text-muted-foreground">{typeHistoryFor.student_id}</div>
            </div>
            {historyLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : typeHistory.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {bn ? 'কোনো পরিবর্তনের রেকর্ড নেই' : 'No change records'}
              </div>
            ) : (
              <ol className="relative border-l border-border/40 pl-5 space-y-4">
                {typeHistory.map((h: any) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">
                        {h.old_type === 'old' ? (bn ? 'পুরাতন' : 'Old') : (bn ? 'নতুন' : 'New')}
                      </Badge>
                      <span className="text-muted-foreground">→</span>
                      <Badge>
                        {h.new_type === 'old' ? (bn ? 'পুরাতন' : 'Old') : (bn ? 'নতুন' : 'New')}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {h.changed_by_name || h.changed_by_email || '—'} · {new Date(h.created_at).toLocaleString(bn ? 'bn-BD' : 'en-US')}
                    </div>
                    {h.reason && (
                      <div className="mt-1.5 text-sm bg-muted/50 rounded-lg px-3 py-2 whitespace-pre-wrap">
                        {h.reason}
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AdminStudents;
