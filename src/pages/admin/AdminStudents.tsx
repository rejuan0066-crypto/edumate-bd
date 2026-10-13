import AdminLayout from '@/components/AdminLayout';
import TabContainer from '@/components/TabContainer';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Trash2, Loader2, CheckCircle, Eye, XCircle, Clock, Pencil, Filter, UserX, UserCheck, Printer, History } from 'lucide-react';
import StudentProfileModal from '@/components/profile/StudentProfileModal';
import { useInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { printStudentProfile } from '@/lib/studentProfilePrint';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const { canAddItem, canEditItem, canDeleteItem, canApproveItem } = usePagePermissions('/admin/students');
  const confirm = useConfirm();
  const bn = language === 'bn';
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
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typeChangeFor, setTypeChangeFor] = useState<any>(null);
  const [typeChangeReason, setTypeChangeReason] = useState('');
  const [typeHistoryFor, setTypeHistoryFor] = useState<any>(null);
  // Realtime subscription for auto-refresh
  useEffect(() => {
    const channel = supabase
      .channel('students-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        invalidateAllStudentQueries(queryClient);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    queryKey: ['classes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*, divisions(name, name_bn, sort_order)').eq('is_active', true).order('sort_order');
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


  // Filter classes by selected division
  const filteredClasses = filterDivisionId !== 'all'
    ? classes.filter((c: any) => c.division_id === filterDivisionId)
    : classes;

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*, divisions(name, name_bn)').order('roll_number', { ascending: true });
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
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAllStudentQueries(queryClient);
      toast.success(bn ? 'ছাত্র মুছে ফেলা হয়েছে' : 'Student deleted');
    },
    onError: () => toast.error('Error'),
  });

  const filtered = students.filter((s: any) => {
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
    // Approval status filter
    if (filterApproval !== 'all') {
      const status = s.approval_status || 'pending';
      if (status !== filterApproval) return false;
    }
    // Active/Inactive status filter
    if (filterStatus !== 'all') {
      const st = s.status || 'active';
      if (st !== filterStatus) return false;
    }
    // Text search
    if (search) {
      const q = search.toLowerCase();
      const qEn = bnToEn(q);
      const qBn = enToBn(q);
      return (
        String(s.name_bn || '').toLowerCase().includes(q) ||
        String(s.student_id || '').toLowerCase().includes(q) ||
        String(s.student_id || '').toLowerCase().includes(qEn) ||
        String(s.student_id || '').toLowerCase().includes(qBn) ||
        String(s.registration_no || '').toLowerCase().includes(q) ||
        String(s.registration_no || '').toLowerCase().includes(qEn) ||
        String(s.registration_no || '').toLowerCase().includes(qBn) ||
        String(s.roll_number || '').toLowerCase().includes(q) ||
        String(s.roll_number || '').toLowerCase().includes(qEn) ||
        String(s.roll_number || '').toLowerCase().includes(qBn) ||
        String(s.name_en || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const parseRollNumber = (roll: string | null | undefined) => {
    const clean = String(roll || '').replace(/[০-৯]/g, d => String('০১২৩৪৫৬৭৮৯'.indexOf(d)));
    const parsed = Number.parseInt(clean, 10);
    return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
  };

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

  const sortedFiltered = [...filtered].sort((a: any, b: any) => {
    const rollDiff = parseRollNumber(a.roll_number) - parseRollNumber(b.roll_number);
    if (rollDiff !== 0) return rollDiff;
    return String(a.created_at || '').localeCompare(String(b.created_at || ''));
  });

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
    return cls ? (bn ? cls.name_bn : cls.name) : '-';
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
    <div className="space-y-6">
        {/* Action bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{bn ? `মোট ${formatDigits(filtered.length, true)} জন ছাত্র` : `Total ${filtered.length} students`}</p>
          {canAddItem && (
            <Button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 rounded-full px-6 h-11 text-sm font-semibold transition-all duration-300">
              <Plus className="w-4 h-4" /> {bn ? 'নতুন ভর্তি' : 'New Admission'}
            </Button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="rounded-[24px] border border-border/40 bg-card/80 backdrop-blur-md p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-sm">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input placeholder={bn ? 'নাম, আইডি বা রোল দিয়ে খুঁজুন...' : 'Search by name, ID or roll...'} className="pl-11 h-10 rounded-full border-border/40 bg-muted/30 text-sm placeholder:text-muted-foreground/50 focus:bg-background focus:border-emerald-500/40 focus:ring-emerald-500/20 transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterDivisionId} onValueChange={(v) => { setFilterDivisionId(v); setFilterClassId('all'); }}>
              <SelectTrigger className="h-10 rounded-full border-border/40 bg-muted/30 text-sm w-auto min-w-[120px] hover:bg-muted/50 transition-colors">
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
              <SelectTrigger className="h-10 rounded-full border-border/40 bg-muted/30 text-sm w-auto min-w-[120px] hover:bg-muted/50 transition-colors">
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
              <SelectTrigger className="h-10 rounded-full border-border/40 bg-muted/30 text-sm w-auto min-w-[120px] hover:bg-muted/50 transition-colors">
                <SelectValue placeholder={bn ? 'শ্রেণী' : 'Class'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সকল শ্রেণী' : 'All Classes'}</SelectItem>
                {filteredClasses.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{bn ? c.name_bn : c.name}{c.divisions ? ` (${bn ? c.divisions.name_bn : c.divisions.name})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterApproval} onValueChange={setFilterApproval}>
              <SelectTrigger className="h-10 rounded-full border-border/40 bg-muted/30 text-sm w-auto min-w-[120px] hover:bg-muted/50 transition-colors">
                <SelectValue placeholder={bn ? 'অনুমোদন' : 'Approval'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সকল স্ট্যাটাস' : 'All Status'}</SelectItem>
                <SelectItem value="pending">{bn ? 'অপেক্ষমাণ' : 'Pending'}</SelectItem>
                <SelectItem value="approved">{bn ? 'অনুমোদিত' : 'Approved'}</SelectItem>
                <SelectItem value="rejected">{bn ? 'প্রত্যাখ্যাত' : 'Rejected'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-10 rounded-full border-border/40 bg-muted/30 text-sm w-auto min-w-[120px] hover:bg-muted/50 transition-colors">
                <SelectValue placeholder={bn ? 'স্ট্যাটাস' : 'Status'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{bn ? 'সকল' : 'All'}</SelectItem>
                <SelectItem value="active">{bn ? 'সক্রিয়' : 'Active'}</SelectItem>
                <SelectItem value="inactive">{bn ? 'নিষ্ক্রিয়' : 'Inactive'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Student List Card */}
        <div className="rounded-[32px] border border-border/30 bg-card/90 backdrop-blur-md shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'সি.' : '#'}</th>
                    <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'নাম' : 'Name'}</th>
                    <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'রেজি / আইডি' : 'Reg / ID'}</th>
                    <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'রোল' : 'Roll'}</th>
                    <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'বিভাগ' : 'Division'}</th>
                    <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'সেশন' : 'Session'}</th>
                    <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'শ্রেণী' : 'Class'}</th>
                    <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'অনুমোদন' : 'Approval'}</th>
                    <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'পেন্ডিং অবস্থা' : 'Pending Status'}</th>
                    {canApproveItem && <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'ধরন' : 'Type'}</th>}
                    <th className="text-left px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'স্ট্যাটাস' : 'Status'}</th>
                    <th className="text-right px-5 py-4 text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{bn ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiltered.map((s: any, idx: number) => (
                    <tr key={s.id} className="group border-b border-border/15 last:border-b-0 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 transition-all duration-200 hover:scale-[1.005] origin-center">
                      <td className="px-5 py-4 text-sm font-mono font-bold text-primary/80">{getClassSerial(s) !== '-' ? formatDigits(getClassSerial(s), bn) : '-'}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3.5">
                          {s.photo_url ? (
                            <img src={s.photo_url} className="w-10 h-10 rounded-2xl object-cover ring-2 ring-border/30 shadow-sm" alt="" />
                          ) : (
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-bold text-sm shadow-sm">
                              {s.name_bn?.[0] || '?'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-foreground text-sm block truncate">
                              {s.name_bn}
                              {s.is_free && <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-success/15 text-success border border-success/20">{bn ? 'বিনা বেতন' : 'Free'}</span>}
                            </span>
                            {s.name_en && <span className="text-xs text-muted-foreground/60 block truncate">{s.name_en}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm font-mono text-muted-foreground">{formatDigits(s.registration_no || s.student_id, bn)}</td>
                      <td className="px-5 py-4 text-sm font-mono font-medium text-foreground/80">{s.roll_number ? formatDigits(s.roll_number, bn) : <span className="text-muted-foreground/30">—</span>}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{bn ? s.divisions?.name_bn : s.divisions?.name || '-'}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{getSessionName(s.session_id, s.admission_session || s.session_year)}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{getClassName(getEffectiveClassId(s))}</td>
                      <td className="px-5 py-4">{getApprovalBadge(s.approval_status || 'pending')}</td>
                      <td className="px-5 py-4">
                        {isRecordPending(s.id) && (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse text-[10px]">
                            <Clock className="w-3 h-3 mr-1" />
                            {bn ? 'অ্যাডমিন অনুমোদনের অপেক্ষায়' : 'Awaiting Admin Approval'}
                          </Badge>
                        )}
                      </td>
                      {canApproveItem && <td className="px-5 py-4">
                        {(() => {
                          const t = (s.student_type === 'old') ? 'old' : 'new';
                          const isOld = t === 'old';
                          const label = isOld ? (bn ? 'পুরাতন' : 'Old') : (bn ? 'নতুন' : 'New');
                          const cls = isOld
                            ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20'
                            : 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20';
                          const isApproved = s.approval_status === 'approved';
                          const isRowPending = studentTypeMutation.isPending && studentTypeMutation.variables?.id === s.id;
                          const badge = (
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cls} ${isRowPending ? 'animate-pulse' : ''}`}>
                              {isRowPending ? (
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <span className={`w-1.5 h-1.5 rounded-full ${isOld ? 'bg-violet-500' : 'bg-sky-500'}`} />
                              )}
                              {label}
                            </span>
                          );
                          return (
                            <div className={`flex items-center gap-1.5 ${isRowPending ? 'opacity-70 pointer-events-none' : ''}`}>
                              {isApproved ? (
                                <button
                                  disabled={isRowPending}
                                  onClick={() => { setTypeChangeFor(s); setTypeChangeReason(''); }}
                                  title={bn ? 'ক্লিক করে পরিবর্তন করুন' : 'Click to change'}
                                  className="hover:scale-105 transition-transform disabled:cursor-not-allowed"
                                >{badge}</button>
                              ) : (
                                <span title={bn ? 'অনুমোদনের পরই পরিবর্তন করা যাবে' : 'Editable only after approval'} className="opacity-70">{badge}</span>
                              )}
                              <button
                                disabled={isRowPending}
                                onClick={() => setTypeHistoryFor(s)}
                                title={bn ? 'হিস্টোরি' : 'History'}
                                className="w-6 h-6 rounded-full bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors disabled:opacity-50"
                              >
                                <History className="w-3 h-3" strokeWidth={2} />
                              </button>
                            </div>
                          );
                        })()}
                      </td>}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${(s.status || 'active') === 'active' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-destructive/10 text-destructive'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${(s.status || 'active') === 'active' ? 'bg-emerald-500' : 'bg-destructive'}`} />
                          {(s.status || 'active') === 'active' ? (bn ? 'সক্রিয়' : 'Active') : (bn ? 'নিষ্ক্রিয়' : 'Inactive')}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 flex-nowrap">
                          <button onClick={() => setShowDetail(s)} className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/30 shadow-sm border border-blue-200/50 dark:border-blue-800/30 flex items-center justify-center text-blue-600 dark:text-blue-400 hover:shadow-md hover:scale-110 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200" title={bn ? 'দেখুন' : 'View'}><Eye className="w-4 h-4" strokeWidth={1.75} /></button>
                          <button onClick={() => printStudentProfile({ student: s, bn, institution: institution || {}, className: getClassName(getEffectiveClassId(s)), sessionName: getSessionName(s.session_id, s.admission_session || s.session_year) })} className="w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-950/30 shadow-sm border border-indigo-200/50 dark:border-indigo-800/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 hover:shadow-md hover:scale-110 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all duration-200" title={bn ? 'প্রোফাইল প্রিন্ট' : 'Print Profile'}><Printer className="w-4 h-4" strokeWidth={1.75} /></button>
                          {canEditItem && (
                            <button 
                              disabled={isRecordPending(s.id)}
                              onClick={() => { setEditStudent(s); setShowAdd(true); }} 
                              className={`w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 shadow-sm border border-emerald-200/50 dark:border-emerald-800/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:shadow-md hover:scale-110 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all duration-200 ${isRecordPending(s.id) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`} 
                              title={bn ? 'সম্পাদনা' : 'Edit'}
                            >
                              <Pencil className="w-4 h-4" strokeWidth={1.75} />
                            </button>
                          )}
                          {canEditItem && (s.approval_status !== 'approved') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'approved' })} className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-950/30 shadow-sm border border-emerald-200/50 dark:border-emerald-800/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:shadow-md hover:scale-110 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all duration-200" title={bn ? 'অনুমোদন' : 'Approve'}><CheckCircle className="w-4 h-4" strokeWidth={1.75} /></button>
                          )}
                          {canEditItem && (s.approval_status !== 'rejected') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'rejected' })} className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/30 shadow-sm border border-rose-200/50 dark:border-rose-800/30 flex items-center justify-center text-rose-600 dark:text-rose-400 hover:shadow-md hover:scale-110 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all duration-200" title={bn ? 'প্রত্যাখ্যান' : 'Reject'}><XCircle className="w-4 h-4" strokeWidth={1.75} /></button>
                          )}
                          {canEditItem && (s.approval_status === 'rejected') && (
                            <button onClick={() => statusMutation.mutate({ id: s.id, status: 'pending' })} className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/30 shadow-sm border border-amber-200/50 dark:border-amber-800/30 flex items-center justify-center text-amber-600 dark:text-amber-400 hover:shadow-md hover:scale-110 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all duration-200" title={bn ? 'অপেক্ষমাণে ফেরত' : 'Back to Pending'}><Clock className="w-4 h-4" strokeWidth={1.75} /></button>
                          )}
                          {canEditItem && (
                            <button
                              onClick={async () => { const cur = s.status || 'active'; const next = cur === 'active' ? 'inactive' : 'active'; const ok = await confirm({ title: bn ? (next === 'active' ? 'ছাত্র সক্রিয় করবেন?' : 'ছাত্র নিষ্ক্রিয় করবেন?') : (next === 'active' ? 'Activate student?' : 'Deactivate student?'), description: bn ? `"${s.name_bn || s.name_en}" কে ${next === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করতে চান?` : `Are you sure you want to ${next === 'active' ? 'activate' : 'deactivate'} "${s.name_en || s.name_bn}"?`, confirmText: bn ? 'হ্যাঁ' : 'Yes', cancelText: bn ? 'বাতিল' : 'Cancel', variant: next === 'active' ? 'default' : 'warning' }); if (!ok) return; toggleActiveMutation.mutate({ id: s.id, currentStatus: cur }); }}
                              className={`w-8 h-8 rounded-full shadow-sm border flex items-center justify-center transition-all duration-200 hover:shadow-md hover:scale-110 ${(s.status || 'active') === 'active' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200/50 dark:border-amber-800/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40' : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'}`}
                              title={(s.status || 'active') === 'active' ? (bn ? 'ডিএক্টিভ করুন' : 'Deactivate') : (bn ? 'এক্টিভ করুন' : 'Activate')}
                            >
                              {(s.status || 'active') === 'active' ? <UserX className="w-4 h-4" strokeWidth={1.75} /> : <UserCheck className="w-4 h-4" strokeWidth={1.75} />}
                            </button>
                          )}
                           {canDeleteItem && (
                            <button 
                              disabled={isRecordPending(s.id)}
                              onClick={() => setDeleteId(s.id)} 
                              className={`w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-950/30 shadow-sm border border-rose-200/50 dark:border-rose-800/30 flex items-center justify-center text-rose-600 dark:text-rose-400 hover:shadow-md hover:scale-110 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all duration-200 ${isRecordPending(s.id) ? 'opacity-50 cursor-not-allowed grayscale' : ''}`} 
                              title={bn ? 'মুছুন' : 'Delete'}
                            >
                              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedFiltered.length === 0 && (
                    <tr><td colSpan={canApproveItem ? 11 : 10} className="text-center py-16 text-sm text-muted-foreground/60">{bn ? 'কোনো ছাত্র পাওয়া যায়নি' : 'No students found'}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

      {/* Dynamic Admission Form */}
      <AdmissionForm open={showAdd} onOpenChange={(o) => { setShowAdd(o); if (!o) setEditStudent(null); }} editStudent={editStudent} />

      {/* Detail View Dialog */}
      <Dialog open={!!showDetail} onOpenChange={o => { if (!o) setShowDetail(null); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-[40px]">
          <DialogHeader><DialogTitle className="text-center">{bn ? 'ছাত্রের বিস্তারিত' : 'Student Details'}</DialogTitle></DialogHeader>
          {showDetail && <StudentProfileModal student={showDetail} bn={bn} getApprovalBadge={getApprovalBadge} getSessionName={getSessionName} getClassName={(cId: string) => getClassName(cId || getEffectiveClassId(showDetail))} setEditStudent={setEditStudent} setShowDetail={setShowDetail} setShowAdd={setShowAdd} statusMutation={statusMutation} canEditItem={canEditItem} />}
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <>
    <AdminLayout>
      <TabContainer
        tabs={[
          {
            id: 'list',
            label: bn ? 'ছাত্র তালিকা' : 'Student List',
            icon: Eye,
            content: studentListContent,
          },
          ...(canAddItem ? [{
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
