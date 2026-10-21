import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useAuth } from '@/hooks/useAuth';
import { isAdminRole } from '@/lib/roles';
import ResultSelectionBrowser from '@/components/results/ResultSelectionBrowser';
import ClassResultTable from '@/components/results/ClassResultTable';
import ClassResultStatusList from '@/components/results/ClassResultStatusList';
import { studentStats, rankStudents, gradeFromMark } from '@/lib/grading';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import IndividualMarksheet from '@/components/results/IndividualMarksheet';
import GradingChart from '@/components/results/GradingChart';
import GracePassSettings from '@/components/results/GracePassSettings';
import GradingSettings from '@/components/results/GradingSettings';
import ResultSecuritySettings from '@/components/results/ResultSecuritySettings';
import { useResultSecurity } from '@/hooks/useResultSecurity';
import { useSignatoryAuthorities } from '@/hooks/useSignatoryAuthorities';
import { ShieldCheck } from 'lucide-react';

import { GraduationCap } from 'lucide-react';
import { exportResultCSV, exportResultPDF, printResultSheet, DEFAULT_RESULT_SIGNATORIES, DEFAULT_PRINT_FOOTER_OPTIONS, DEFAULT_PRINT_MARGINS, PRINT_MARGIN_PRESETS, sanitizeMargins, type ResultSignatory, type ResultPrintFooterOptions, type PrintMargins } from '@/lib/resultExport';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { bnToEn, enToBn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings2 } from 'lucide-react';

const AdminResults = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { checkApproval } = useApprovalCheck('/admin/results', 'results');
  const { canAddItem, canEditItem } = usePagePermissions('/admin/results');
  const { getGrade, getOverallGrade, scales, maxMarks, passMark, getGraceLimit, gracePass } = useGradingSystem();
  const { role } = useAuth();
  const isAdmin = isAdminRole(role);
  const [rejectPublishOpen, setRejectPublishOpen] = useState(false);
  const [rejectPublishReason, setRejectPublishReason] = useState('');
  const [securityDialogOpen, setSecurityDialogOpen] = useState(false);
  const { enabled: isSecurityActive, requireApproval: securityRequireApproval, lockPublished: securityLockPublished, allowAdminDirect } = useResultSecurity();

  const [searchMode, setSearchMode] = useState<'class' | 'individual'>('class');
  const [examYear, setExamYear] = useState(searchParams.get('year') || '');
  const [examSessionId, setExamSessionId] = useState(searchParams.get('session') || '');
  const [selectedClass, setSelectedClass] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [marksMap, setMarksMap] = useState<Record<string, number>>({});
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [exportingClassId, setExportingClassId] = useState<string | null>(null);
  const [readOnlyView, setReadOnlyView] = useState(false);

  // Show class list when we have year+session from URL but no class selected
  const showClassList = searchMode === 'class' && !!examYear && !!examSessionId && !selectedClass && !showResults;

  // Scroll the saved result sheet into view as soon as it opens
  const resultsSectionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showResults) return;
    const t = setTimeout(() => {
      resultsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
    return () => clearTimeout(t);
  }, [showResults, viewingStudentId, selectedClass]);

  const loadResultsForExam = async (examId: string) => {
    const { data, error } = await supabase.from('results').select('*').eq('exam_id', examId);
    if (error) throw error;
    const map: Record<string, number> = {};
    data?.forEach((result: any) => {
      map[`${result.student_id}_${result.subject_id}`] = result.marks ?? 0;
    });
    setMarksMap(map);
    return data || [];
  };

  // Fetch academic sessions
  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic-sessions-results'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch exam sessions (filter by year when selected, otherwise show all)
  const { data: examSessions = [] } = useQuery({
    queryKey: ['exam-sessions', examYear],
    queryFn: async () => {
      let q = supabase.from('exam_sessions').select('*').eq('is_active', true);
      if (examYear) q = q.eq('academic_session_id', examYear);
      const { data, error } = await q.order('name');
      if (error) throw error;
      return data;
    },
  });


  // Fetch classes linked to exam session
  const { data: examClasses = [] } = useQuery({
    queryKey: ['exam-session-classes', examSessionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_session_classes').select('*, classes(*)').eq('exam_session_id', examSessionId);
      if (error) throw error;
      return data?.map((ec: any) => ec.classes).filter(Boolean) || [];
    },
    enabled: !!examSessionId,
  });

  // Fetch result status for each class (check per-class results)
  const { data: classResultStatus = {} } = useQuery({
    queryKey: ['class-result-status', examSessionId, examClasses.map((c: any) => c.id)],
    queryFn: async () => {
      const examSession = examSessions.find((es: any) => es.id === examSessionId);
      if (!examSession || !examClasses.length) return {};

      // Check results for each class specifically
      const { data: results, error } = await supabase
        .from('results')
        .select('student_id, students!inner(class_id)')
        .eq('exam_id', examSessionId);
      
      if (error) throw error;

      const map: Record<string, boolean> = {};
      examClasses.forEach((c: any) => {
        // A class is "done" if there's at least one result for a student in that class
        map[c.id] = results?.some((r: any) => r.students.class_id === c.id) || false;
      });
      return map;
    },
    enabled: showClassList && examClasses.length > 0 && examSessions.length > 0,
  });

  // Fetch publish status (now on exam_sessions directly)
  const { data: classPublishStatus = {} } = useQuery({
    queryKey: ['class-publish-status', examSessionId, examClasses.map((c: any) => c.id)],
    queryFn: async () => {
      const examSession = examSessions.find((es: any) => es.id === examSessionId);
      if (!examSession) return {};

      const isPublished = (examSession as any).is_published || false;
      const map: Record<string, boolean> = {};
      examClasses.forEach((c: any) => {
        map[c.id] = isPublished;
      });
      return map;
    },
    enabled: showClassList && examClasses.length > 0 && examSessions.length > 0,
  });

  const currentExamSession: any = examSessions.find((es: any) => es.id === examSessionId);
  const isClassPublished = selectedClass ? (classPublishStatus[selectedClass] === true) : false;
  const isClassLocked = isSecurityActive && securityLockPublished && isClassPublished && !isAdmin;
  const publishApprovalStatus = (currentExamSession?.publish_approval_status || 'pending') as 'pending' | 'approved' | 'rejected';

  const refreshSessions = () => {
    queryClient.invalidateQueries({ queryKey: ['exam-sessions'] });
    queryClient.invalidateQueries({ queryKey: ['class-publish-status'] });
  };

  const handleApprovePublish = async () => {
    if (!examSessionId) return;
    const { error } = await (supabase as any).rpc('approve_result_publish', { p_exam_session_id: examSessionId });
    if (error) { toast.error(error.message); return; }
    refreshSessions();
    toast.success(bn ? 'পাবলিশ অনুমোদিত হয়েছে' : 'Publishing approved');
  };

  const handleRejectPublish = async () => {
    if (!examSessionId || !rejectPublishReason.trim()) return;
    const { error } = await (supabase as any).rpc('reject_result_publish', {
      p_exam_session_id: examSessionId,
      p_reason: rejectPublishReason.trim(),
    });
    if (error) { toast.error(error.message); return; }
    setRejectPublishOpen(false);
    setRejectPublishReason('');
    refreshSessions();
    toast.success(bn ? 'পাবলিশ প্রত্যাখ্যান করা হয়েছে' : 'Publishing rejected');
  };

  const handlePublishToggle = async (classId: string, publish: boolean) => {
    const examSession = examSessions.find((es: any) => es.id === examSessionId);
    if (!examSession) return;

    if (publish && publishApprovalStatus !== 'approved') {
      if (!isAdmin) {
        await (supabase as any).rpc('submit_result_publish_for_approval', { p_exam_session_id: examSessionId });
        refreshSessions();
      }
      toast.warning(bn
        ? '⏳ ফলাফল পাবলিশ করতে অ্যাডমিনের অনুমোদন প্রয়োজন।'
        : '⏳ Admin approval is required before publishing results.');
      return;
    }

    const { error } = await supabase.from('exam_sessions').update({ is_published: publish } as any).eq('id', examSessionId);
    if (error) {
      toast.error(error.message);
      return;
    }

    refreshSessions();
    toast.success(publish
      ? (bn ? 'ফলাফল পাবলিশ করা হয়েছে' : 'Result published')
      : (bn ? 'ফলাফল আনপাবলিশ করা হয়েছে' : 'Result unpublished')
    );
  };

  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['exam-session-subjects', examSessionId, selectedClass],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_session_subjects')
        .select('subject_id, subjects(*)')
        .eq('exam_session_id', examSessionId);
      if (error) throw error;
      const selectedClassObj = examClasses.find((c: any) => c.id === selectedClass);
      const divId = selectedClassObj?.division_id;
      const allSubjects = data?.map((es: any) => es.subjects).filter(Boolean) || [];
      return allSubjects
        .filter((s: any) => s.division_id === divId || s.class_id === selectedClass)
        .sort((a: any, b: any) => (a.name_bn || '').localeCompare(b.name_bn || ''));
    },
    enabled: !!examSessionId && !!selectedClass && examClasses.length > 0,
  });

  // Fetch students
  const { data: students = [] } = useQuery({
    queryKey: ['exam-students', examSessionId, selectedClass],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exam_session_students')
        .select('student_id, students(*, divisions(name, name_bn))')
        .eq('exam_session_id', examSessionId)
        .eq('class_id', selectedClass);
      if (error) throw error;
      return data?.map((es: any) => es.students).filter(Boolean).sort((a: any, b: any) => (a.roll_number || 0) - (b.roll_number || 0)) || [];
    },
    enabled: !!examSessionId && !!selectedClass,
    staleTime: 0,
  });

  // When class is selected from the list, auto-trigger search
  const handleClassFromList = async (classId: string, mode: 'view' | 'entry' = 'entry') => {
    setReadOnlyView(mode === 'view');
    setSelectedClass(classId);
    // We need to wait for students/subjects queries, so set state and trigger search after
    setShowResults(false);
    setSelectedExamId(null);
    setMarksMap({});

    // Trigger search after state updates via effect
    setTimeout(async () => {
      // exam_id is now the exam_session id directly
      const examId = examSessionId;
      try {
        setSelectedExamId(examId);
        await loadResultsForExam(examId);
        setShowResults(true);
      } catch (error: any) {
        toast.error(error.message || 'Failed to load results');
      }
    }, 100);
  };

  // Auto-open entry for a class passed in the URL (?class=...)
  const urlClassId = searchParams.get('class') || '';
  const [autoClassDone, setAutoClassDone] = useState(false);
  useEffect(() => {
    if (autoClassDone || !urlClassId || !examSessionId) return;
    if (!examClasses.length) return;
    if (!examClasses.some((c: any) => c.id === urlClassId)) return;
    setAutoClassDone(true);
    handleClassFromList(urlClassId);
  }, [urlClassId, examSessionId, examClasses, autoClassDone]);

  const handleSearch = async () => {
    if (!examYear || !examSessionId || !selectedClass) {
      toast.error(bn ? 'শিক্ষাবর্ষ, সেশন ও ক্লাস নির্বাচন করুন' : 'Select year, session and class');
      return;
    }
    if (searchMode === 'individual' && !rollNumber.trim()) {
      toast.error(bn ? 'রোল / রেজিস্ট্রেশন নম্বর দিন' : 'Enter roll or registration number');
      return;
    }

    // exam_id is now the exam_session id directly
    const examId = examSessionId;

    try {
      setReadOnlyView(false);
      setSelectedExamId(examId);
      await loadResultsForExam(examId);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load saved results');
      return;
    }

    if (searchMode === 'individual') {
      const q = rollNumber.trim();
      const qEn = bnToEn(q);
      const qBn = enToBn(q);
      const found = students.find((st: any) => {
        const r = String(st.roll_number ?? '').trim();
        const sid = String(st.student_id ?? '').trim();
        const reg = String((st.registration_no || st.registration_number) ?? '').trim();
        return (
          r === q || r === qEn || r === qBn ||
          sid === q || sid === qEn || sid === qBn ||
          reg === q || reg === qEn || reg === qBn
        );
      });
      if (found) {
        setViewingStudentId(found.id);
      } else {
        toast.error(bn ? 'ছাত্র পাওয়া যায়নি' : 'Student not found');
        return;
      }
    } else {
      setViewingStudentId(null);
    }
    setShowResults(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId) return { saved: false as const, reason: 'no-exam' as const };
      const upserts = Object.entries(marksMap)
        .filter(([, marks]) => marks !== undefined && marks !== null && (marks as any) !== '' && !Number.isNaN(Number(marks)))
        .map(([key, marks]) => {
          const [student_id, subject_id] = key.split('_');
          const markNum = Number(marks);
          const sub = subjects.find((s: any) => s.id === subject_id);
          const subFull = sub?.full_marks || maxMarks || 100;
          const { grade, gpa } = gradeFromMark(markNum, subFull, scales);
          return { exam_id: selectedExamId, student_id, subject_id, marks: markNum, grade, gpa: parseFloat(gpa) };
        });

      const cleared = Object.entries(marksMap)
        .filter(([, marks]) => marks === undefined || marks === null || (marks as any) === '')
        .map(([key]) => {
          const [student_id, subject_id] = key.split('_');
          return { student_id, subject_id };
        });

      if (upserts.length === 0 && cleared.length === 0) return { saved: false as const, reason: 'empty' as const };

      // Check if Result Security is active and requires approval
      const shouldCheckApproval = isSecurityActive && securityRequireApproval ? (!isAdmin || !allowAdminDirect) : false;

      if (shouldCheckApproval) {
        const examName = examSessions.find((s: any) => s.id === examSessionId)?.name_bn || examSessions.find((s: any) => s.id === examSessionId)?.name || '';
        const className = examClasses.find((c: any) => c.id === selectedClass)?.name_bn || examClasses.find((c: any) => c.id === selectedClass)?.name || '';
        const desc = `ফলাফল সংরক্ষণ (${className} — ${examName}, মোট ${upserts.length} টি নম্বর)`;

        const requiresApproval = await checkApproval(
          'edit', 
          { exam_id: selectedExamId, results_count: upserts.length, results: upserts }, 
          selectedExamId, 
          desc
        );

        if (requiresApproval) {
          return { saved: false as const, reason: 'approval' as const };
        }
      }

      if (cleared.length > 0) {
        for (const c of cleared) {
          await supabase
            .from('results')
            .delete()
            .eq('exam_id', selectedExamId)
            .eq('student_id', c.student_id)
            .eq('subject_id', c.subject_id);
        }
      }

      if (upserts.length > 0) {
        const { error } = await supabase.from('results').upsert(upserts, { onConflict: 'exam_id,student_id,subject_id' });
        if (error) throw error;
      }
      return { saved: true as const, count: upserts.length };
    },
    onSuccess: async (res: any) => {
      if (!res?.saved) {
        if (res?.reason === 'empty') {
          toast.error(bn ? 'সংরক্ষণের জন্য কোনো নম্বর পাওয়া যায়নি' : 'No marks to save');
        }
        // If it was intercepted by approval workflow, useApprovalCheck already showed a toast
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['class-result-status'] });
      queryClient.invalidateQueries({ queryKey: ['results-last-saved'] });
      if (selectedExamId) {
        await loadResultsForExam(selectedExamId);
      }
      toast.success(bn ? `ফলাফল সংরক্ষিত হয়েছে (${res.count})` : `Results saved (${res.count})`);
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  // Last saved info (who + when) for the currently open exam
  const { data: lastSavedInfo } = useQuery({
    queryKey: ['results-last-saved', selectedExamId, marksMap && Object.keys(marksMap).length],
    queryFn: async () => {
      if (!selectedExamId) return null;
      const { data } = await supabase
        .from('results')
        .select('updated_at, updated_by, created_by')
        .eq('exam_id', selectedExamId)
        .order('updated_at', { ascending: false })
        .limit(1);
      const row: any = data?.[0];
      if (!row) return null;
      const userId = row.updated_by || row.created_by;
      let name = '';
      if (userId) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', userId)
          .maybeSingle();
        name = (prof as any)?.full_name || (prof as any)?.email || '';
      }
      return { at: row.updated_at as string, name };
    },
    enabled: !!selectedExamId && showResults,
  });

  const getExamTitle = () => {

    const session = examSessions.find((es: any) => es.id === examSessionId);
    const year = academicSessions.find((s: any) => s.id === examYear);
    const cls = examClasses.find((c: any) => c.id === selectedClass);
    return `${bn ? session?.name_bn : session?.name} — ${bn ? cls?.name_bn : cls?.name} — ${bn ? (year?.name_bn || year?.name) : year?.name}`;
  };

  const getExamSessionName = () => {
    const session = examSessions.find((es: any) => es.id === examSessionId);
    const year = academicSessions.find((s: any) => s.id === examYear);
    return `${bn ? session?.name_bn : session?.name} — ${bn ? (year?.name_bn || year?.name) : year?.name}`;
  };

  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: signatories = DEFAULT_RESULT_SIGNATORIES } = useQuery<ResultSignatory[]>({
    queryKey: ['result-signatories'],
    queryFn: async () => {
      // 1. Check modern v2 storage first (supports show_name without schema constraints)
      const { data: v2Data } = await supabase.from('website_settings').select('value').eq('key', 'result_signatories_v2').maybeSingle();
      const v2 = (v2Data?.value as any);
      if (Array.isArray(v2) && v2.length) {
        return (v2 as ResultSignatory[]).map(r => ({
          ...r,
          show_name: r.show_name !== false,
        }));
      }

      // 2. Fallback to legacy result_signatories
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'result_signatories').maybeSingle();
      const v = (data?.value as any);
      if (Array.isArray(v) && v.length) {
        return (v as ResultSignatory[]).map(r => ({
          ...r,
          show_name: r.show_name !== false && r.name_bn !== '—' && r.name_bn !== '-',
        }));
      }
      return DEFAULT_RESULT_SIGNATORIES;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: signatoryAuthorities = [] } = useSignatoryAuthorities();

  const { data: staffList = [] } = useQuery({
    queryKey: ['staff-for-result-signatories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff')
        .select('id, name_bn, name_en, designation, status')
        .is('deleted_at', null)
        .eq('status', 'active')
        .order('name_bn');
      if (error) {
        console.error('Error fetching staff list for signatories:', error);
        return [];
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Find Muhtamim / Principal:
  // 1. From official Signatory Authorities (institution_signatories / institutions: head_of_institute)
  // 2. Fallback to active staff, strictly excluding assistant/vice roles
  const detectedMuhtamim = useMemo(() => {
    const officialHead = signatoryAuthorities.find((a: any) => a.role_key === 'head_of_institute');
    if (officialHead?.person_name_bn) {
      return {
        name_bn: officialHead.person_name_bn,
        name_en: officialHead.person_name_en || officialHead.person_name_bn,
        designation: officialHead.person_designation_bn || 'প্রতিষ্ঠাতা ও প্রিন্সিপাল',
      };
    }

    const assistantKeywords = ['সহকারী', 'নায়েবে', 'নায়েবে', 'উপ-', 'সহ-', 'সহঃ', 'vice', 'assistant', 'sub-'];
    return staffList.find((s: any) => {
      if (s.status && s.status !== 'active') return false;
      const des = (s.designation || '').toLowerCase();
      const isAssistant = assistantKeywords.some(k => des.includes(k));
      if (isAssistant) return false;
      return (
        des.includes('মুহতামিম') ||
        des.includes('অধ্যক্ষ') ||
        des.includes('প্রধান শিক্ষক') ||
        des.includes('প্রিন্সিপাল') ||
        des.includes('principal') ||
        des.includes('headmaster') ||
        des.includes('প্রতিষ্ঠাতা')
      );
    });
  }, [signatoryAuthorities, staffList]);

  // Combined staff for dropdown, ensuring the principal is always selectable
  const combinedStaffList = useMemo(() => {
    const list = [...staffList];
    if (detectedMuhtamim?.name_bn && !list.some((s: any) => s.name_bn === detectedMuhtamim.name_bn)) {
      list.unshift({
        id: 'authority-principal-head',
        name_bn: detectedMuhtamim.name_bn,
        name_en: detectedMuhtamim.name_en,
        designation: detectedMuhtamim.designation,
        status: 'active',
      } as any);
    }
    return list;
  }, [staffList, detectedMuhtamim]);



  const { data: footerOptions = DEFAULT_PRINT_FOOTER_OPTIONS, refetch: refetchFooterOptions } = useQuery<ResultPrintFooterOptions>({
    queryKey: ['result-print-footer'],
    queryFn: async () => {
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'result_print_footer').maybeSingle();
      const v = (data?.value as any);
      if (v && typeof v === 'object') {
        return {
          show_page_numbers: v.show_page_numbers !== false,
          show_footer_institution: v.show_footer_institution !== false,
          margins: sanitizeMargins(v.margins),
        };
      }
      return DEFAULT_PRINT_FOOTER_OPTIONS;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Per-class / per-exam footer overrides (null = inherit global)
  type FooterOverrideRow = { scope: 'class' | 'exam'; scope_id: string; show_page_numbers: boolean | null; show_footer_institution: boolean | null };
  const { data: footerOverrides = [], refetch: refetchOverrides } = useQuery<FooterOverrideRow[]>({
    queryKey: ['result-print-footer-overrides'],
    queryFn: async () => {
      const { data } = await supabase
        .from('result_print_footer_overrides' as any)
        .select('scope, scope_id, show_page_numbers, show_footer_institution');
      return ((data as any) || []) as FooterOverrideRow[];
    },
    staleTime: 60 * 1000,
  });

  const resolveFooterFor = (classId: string | null, examId: string | null) => {
    const cls = classId ? footerOverrides.find(o => o.scope === 'class' && o.scope_id === classId) : undefined;
    const exm = examId ? footerOverrides.find(o => o.scope === 'exam' && o.scope_id === examId) : undefined;
    const pages = cls?.show_page_numbers ?? exm?.show_page_numbers ?? footerOptions.show_page_numbers;
    const inst = cls?.show_footer_institution ?? exm?.show_footer_institution ?? footerOptions.show_footer_institution;
    const srcPages: 'class' | 'exam' | 'global' = cls?.show_page_numbers != null ? 'class' : exm?.show_page_numbers != null ? 'exam' : 'global';
    const srcInst: 'class' | 'exam' | 'global' = cls?.show_footer_institution != null ? 'class' : exm?.show_footer_institution != null ? 'exam' : 'global';
    return { show_page_numbers: !!pages, show_footer_institution: !!inst, source: { pages: srcPages, inst: srcInst } };
  };

  const upsertFooterOverride = async (
    scope: 'class' | 'exam',
    scopeId: string,
    patch: { show_page_numbers?: boolean | null; show_footer_institution?: boolean | null },
  ) => {
    const existing = footerOverrides.find(o => o.scope === scope && o.scope_id === scopeId);
    const merged = {
      scope,
      scope_id: scopeId,
      show_page_numbers: patch.show_page_numbers !== undefined ? patch.show_page_numbers : (existing?.show_page_numbers ?? null),
      show_footer_institution: patch.show_footer_institution !== undefined ? patch.show_footer_institution : (existing?.show_footer_institution ?? null),
    };
    if (merged.show_page_numbers === null && merged.show_footer_institution === null) {
      const { error } = await supabase.from('result_print_footer_overrides' as any)
        .delete().eq('scope', scope).eq('scope_id', scopeId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from('result_print_footer_overrides' as any)
        .upsert(merged as any, { onConflict: 'scope,scope_id' });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(bn ? 'ওভাররাইড সংরক্ষিত' : 'Override saved');
    refetchOverrides();
  };

  const saveFooterOptions = async (next: ResultPrintFooterOptions) => {
    const { error } = await supabase
      .from('website_settings')
      .upsert({ key: 'result_print_footer', value: next as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(bn ? 'প্রিন্ট ফুটার সেটিং সংরক্ষিত' : 'Print footer setting saved');
    refetchFooterOptions();
  };
  const [sigDialogOpen, setSigDialogOpen] = useState(false);
  const [graceDialogOpen, setGraceDialogOpen] = useState(false);
  const [gradingDialogOpen, setGradingDialogOpen] = useState(false);

  const [sigDraft, setSigDraft] = useState<ResultSignatory[]>(DEFAULT_RESULT_SIGNATORIES);
  const [sigErrors, setSigErrors] = useState<Record<number, { title?: string; name?: string; title_bn?: string; title_en?: string; name_bn?: string; name_en?: string }>>({});
  useEffect(() => { setSigDraft(signatories); setSigErrors({}); }, [signatories]);

  // When dialog opens, if Muhtamim row has no name (or previously had resigned staff), auto-fill with detected Muhtamim
  useEffect(() => {
    if (sigDialogOpen && detectedMuhtamim) {
      setSigDraft(prev => prev.map((s, idx) => {
        const isMuhtamimRow = idx === 3 || (s.title_bn || '').includes('মুহতামিম') || (s.title_bn || '').includes('অধ্যক্ষ') || (s.title_bn || '').includes('প্রিন্সিপাল');
        const hasResignedAutoFill = s.name_bn?.includes('আব্দুল হাফিজ');
        if (isMuhtamimRow && (!s.name_bn && !s.name_en || hasResignedAutoFill)) {
          return {
            ...s,
            name_bn: detectedMuhtamim.name_bn || '',
            name_en: detectedMuhtamim.name_en || detectedMuhtamim.name_bn || '',
            title_bn: detectedMuhtamim.designation || s.title_bn || 'মুহতামিম / অধ্যক্ষ',
            show_name: true,
          };
        }
        return s;
      }));
    }
  }, [sigDialogOpen, detectedMuhtamim]);

  // Export options: PDF vs browser print + A4 portrait/landscape
  const [exportOptions, setExportOptions] = useState<{ open: boolean; classId: string | null; mode: 'pdf' | 'print'; orientation: 'landscape' | 'portrait' }>(
    { open: false, classId: null, mode: 'print', orientation: 'landscape' }
  );

  const MAX_LEN = 100;
  const validateSignatories = (rows: ResultSignatory[]) => {
    const errs: typeof sigErrors = {};
    rows.forEach((s, i) => {
      const tBn = (s.title_bn || '').trim();
      const tEn = (s.title_en || '').trim();
      const nBn = (s.name_bn || '').trim();
      const nEn = (s.name_en || '').trim();
      const isShowName = s.show_name !== false;
      const e: any = {};
      if (!tBn && !tEn) e.title = bn ? 'অন্তত একটি ভাষায় পদবী দিন' : 'Title required in at least one language';
      if (isShowName) {
        if (!nBn && !nEn) e.name = bn ? 'অন্তত একটি ভাষায় নাম দিন' : 'Name required in at least one language';
      }
      if (tBn.length > MAX_LEN) e.title_bn = bn ? `সর্বোচ্চ ${MAX_LEN} অক্ষর` : `Max ${MAX_LEN} chars`;
      if (tEn.length > MAX_LEN) e.title_en = bn ? `সর্বোচ্চ ${MAX_LEN} অক্ষর` : `Max ${MAX_LEN} chars`;
      if (isShowName) {
        if (nBn.length > MAX_LEN) e.name_bn = bn ? `সর্বোচ্চ ${MAX_LEN} অক্ষর` : `Max ${MAX_LEN} chars`;
        if (nEn.length > MAX_LEN) e.name_en = bn ? `সর্বোচ্চ ${MAX_LEN} অক্ষর` : `Max ${MAX_LEN} chars`;
      }
      if (Object.keys(e).length) errs[i] = e;
    });
    return errs;
  };

  const liveSigErrors = useMemo(() => validateSignatories(sigDraft), [sigDraft, bn]);
  const hasSigErrors = Object.keys(liveSigErrors).length > 0;
  const saveSignatories = useMutation({
    mutationFn: async (rows: ResultSignatory[]) => {
      const errs = validateSignatories(rows);
      if (Object.keys(errs).length) {
        setSigErrors(errs);
        throw new Error(bn ? 'কিছু ক্ষেত্র সঠিকভাবে পূরণ করা হয়নি' : 'Please fix the highlighted fields');
      }
      // Modern v2 format with full show_name support (bypasses legacy check constraint on key = 'result_signatories')
      const v2Payload = rows.map(r => ({
        title_bn: (r.title_bn || '').trim(),
        title_en: (r.title_en || '').trim(),
        name_bn: (r.name_bn || '').trim(),
        name_en: (r.name_en || '').trim(),
        show_name: r.show_name !== false,
      }));

      // Legacy payload for key = 'result_signatories' to satisfy the strict DB check constraint:
      // IF btrim(n_bn) = '' AND btrim(n_en) = '' THEN RETURN false;
      const legacyPayload = rows.map(r => {
        const tBn = (r.title_bn || '').trim();
        const tEn = (r.title_en || '').trim();
        let nBn = (r.name_bn || '').trim();
        let nEn = (r.name_en || '').trim();
        if (!nBn && !nEn) {
          nBn = tBn || '—';
          nEn = tEn || '—';
        }
        return {
          title_bn: tBn,
          title_en: tEn,
          name_bn: nBn,
          name_en: nEn,
        };
      });

      // Save both: v2 for modern clients, legacy for backward compatibility
      const { error: v2Error } = await supabase
        .from('website_settings')
        .upsert({ key: 'result_signatories_v2', value: v2Payload as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (v2Error) console.warn('Could not save result_signatories_v2:', v2Error);

      const { error } = await supabase
        .from('website_settings')
        .upsert({ key: 'result_signatories', value: legacyPayload as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error && !v2Error) {
        console.warn('Legacy signatories save failed, but v2 succeeded:', error);
      } else if (error && v2Error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast.success(bn ? 'স্বাক্ষরকারীর তথ্য সংরক্ষিত' : 'Signatories saved');
      setSigErrors({});
      queryClient.invalidateQueries({ queryKey: ['result-signatories'] });
      setSigDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message || 'Save failed'),
  });

  const handleClassExport = async (classId: string, type: 'csv' | 'pdf' | 'print') => {
    if (type === 'pdf' || type === 'print') {
      // Open chooser instead of running immediately
      setExportOptions({ open: true, classId, mode: type, orientation: 'landscape' });
      return;
    }
    await runClassExport(classId, 'csv', 'landscape');
  };

  const runClassExport = async (classId: string, mode: 'csv' | 'pdf' | 'print', orientation: 'landscape' | 'portrait') => {
    setExportingClassId(classId);
    try {
      const examSession = examSessions.find((es: any) => es.id === examSessionId);
      if (!examSession) return;

      const cls = examClasses.find((c: any) => c.id === classId);
      const classDivisionId = cls?.division_id;

      const examId = examSessionId;
      const { data: results } = await supabase.from('results').select('*').eq('exam_id', examId);
      const exportMarksMap: Record<string, number> = {};
      results?.forEach((r: any) => { exportMarksMap[`${r.student_id}_${r.subject_id}`] = r.marks ?? 0; });

      const { data: studentData } = await supabase
        .from('exam_session_students')
        .select('student_id, students(*)')
        .eq('exam_session_id', examSessionId)
        .eq('class_id', classId);
      const exportStudents = studentData?.map((es: any) => es.students).filter(Boolean).sort((a: any, b: any) => (a.roll_number || 0) - (b.roll_number || 0)) || [];

      const { data: subjectData } = await supabase
        .from('exam_session_subjects')
        .select('subject_id, subjects(*)')
        .eq('exam_session_id', examSessionId);
      const allSubjects = subjectData?.map((es: any) => es.subjects).filter(Boolean) || [];
      const exportSubjects = allSubjects
        .filter((s: any) => s.division_id === classDivisionId || s.class_id === classId)
        .sort((a: any, b: any) => (a.name_bn || '').localeCompare(b.name_bn || ''));

      const year = academicSessions.find((s: any) => s.id === examYear);
      const exportTitle = `${bn ? examSession.name_bn : examSession.name} — ${bn ? cls?.name_bn : cls?.name} — ${bn ? (year?.name_bn || year?.name) : year?.name}`;
      const instName = bn ? institution?.name : (institution?.name_en || institution?.name);

      // Server-authoritative footer resolution (prevents client-side tampering)
      let serverFooter: { show_page_numbers: boolean; show_footer_institution: boolean; margins: { top: number; right: number; bottom: number; left: number } } | null = null;
      if (mode === 'pdf' || mode === 'print') {
        const { data: resolved, error: resolveErr } = await supabase.rpc('get_resolved_print_footer' as any, {
          p_class_id: classId,
          p_exam_id: examSessionId,
        });
        if (resolveErr) {
          toast.error(resolveErr.message || 'Failed to resolve print footer settings');
          return;
        }
        serverFooter = resolved as any;
      }

      const params = {
        title: exportTitle,
        students: exportStudents,
        subjects: exportSubjects,
        marksMap: exportMarksMap,
        getOverallGrade,
        bn,
        institutionName: instName,
        institutionLogo: institution?.logo_url || undefined,
        institutionAddress: institution?.address || undefined,
        institutionPhone: institution?.phone || undefined,
        className: bn ? cls?.name_bn : cls?.name,
        examName: bn ? examSession.name_bn : examSession.name,
        sessionName: bn ? (year?.name_bn || year?.name) : year?.name,
        signatories,
        orientation,
        showPageNumbers: serverFooter ? serverFooter.show_page_numbers : true,
        showFooterInstitution: serverFooter ? serverFooter.show_footer_institution : true,
        margins: serverFooter ? sanitizeMargins(serverFooter.margins) : (footerOptions.margins || DEFAULT_PRINT_MARGINS),
      };

      if (mode === 'csv') exportResultCSV(params);
      else if (mode === 'pdf') exportResultPDF(params);
      else if (mode === 'print') printResultSheet(params);
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    } finally {
      setExportingClassId(null);
    }
  };

  const viewingStudent = viewingStudentId ? students.find((st: any) => st.id === viewingStudentId) : null;
  const viewingStudentRank = useMemo(() => {
    if (!viewingStudentId || !students?.length || !subjects?.length) return undefined;
    const statsList = students.map((st: any) => {
      const rawMarks = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`]);
      return studentStats(st.id, rawMarks, {
        scales,
        passMark,
        fullMarks: maxMarks,
        graceLimit: getGraceLimit(st.class_id),
        graceGrade: gracePass?.grade,
        minAggregatePercent: gracePass?.min_aggregate_percent,
        maxMarkDeficit: gracePass?.max_mark_deficit,
      });
    });
    const rankMap = rankStudents(statsList);
    return rankMap.get(viewingStudentId);
  }, [viewingStudentId, students, subjects, marksMap, scales, passMark, maxMarks, getGraceLimit, gracePass]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* ── Standard Page Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <GraduationCap className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
              {bn ? 'ফলাফল ব্যবস্থাপনা' : 'Result Management'}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              {bn ? 'ক্লাস-ওয়াইজ বা ব্যক্তিগত ফলাফল অনুসন্ধান, নম্বর এন্ট্রি ও প্রকাশনা' : 'Search class-wise or individual results, enter marks and publish marksheets'}
            </p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setSecurityDialogOpen(true)} className={`h-9 rounded-xl font-medium gap-1.5 text-xs sm:text-sm ${isSecurityActive ? 'border-primary/40 bg-primary/5 text-primary' : ''}`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {bn ? 'রেজাল্ট সুরক্ষা ও অনুমোদন' : 'Result Security'}
                {isSecurityActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSigDialogOpen(true)} className="h-9 rounded-xl font-medium gap-1.5 text-xs sm:text-sm">
                <Settings2 className="w-3.5 h-3.5" />
                {bn ? 'স্বাক্ষরকারী' : 'Signatories'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setGraceDialogOpen(true)} className="h-9 rounded-xl font-medium gap-1.5 text-xs sm:text-sm">
                <Settings2 className="w-3.5 h-3.5" />
                {bn ? 'বিবেচনায় পাস' : 'Consideration Pass'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setGradingDialogOpen(true)} className="h-9 rounded-xl font-medium gap-1.5 text-xs sm:text-sm">
                <Settings2 className="w-3.5 h-3.5" />
                {bn ? 'গ্রেডিং নিয়ম' : 'Grading Rules'}
              </Button>
            </div>
          )}
        </div>

        <GracePassSettings open={graceDialogOpen} onOpenChange={setGraceDialogOpen} />
        <GradingSettings open={gradingDialogOpen} onOpenChange={setGradingDialogOpen} />
        <ResultSecuritySettings open={securityDialogOpen} onOpenChange={setSecurityDialogOpen} />



        <Dialog open={sigDialogOpen} onOpenChange={setSigDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{bn ? 'রেজাল্ট শীটের স্বাক্ষরকারী সম্পাদনা' : 'Edit Result Sheet Signatories'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {sigDraft.map((s, i) => {
                const err = sigErrors[i] || liveSigErrors[i] || {};
                const setField = (field: keyof ResultSignatory, val: string) => {
                  // Collapse internal whitespace runs and strip leading spaces while typing.
                  // Trailing space is preserved during typing so users can type multi-word values,
                  // but is trimmed on blur (see trimField below).
                  const cleaned = val.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
                  setSigDraft(d => d.map((x, j) => j === i ? { ...x, [field]: cleaned } : x));
                  setSigErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
                };
                const trimField = (field: keyof ResultSignatory) => {
                  setSigDraft(d => d.map((x, j) => {
                    if (j !== i) return x;
                    const cur = (x[field] as string | undefined) || '';
                    const trimmed = cur.trim().replace(/\s{2,}/g, ' ');
                    return trimmed === cur ? x : { ...x, [field]: trimmed };
                  }));
                };
                const isShowName = s.show_name !== false;
                return (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3.5 rounded-xl border bg-card/60 shadow-sm">
                    <div className="md:col-span-2 flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">
                          {bn ? `স্বাক্ষরকারী ${i + 1}` : `Signatory ${i + 1}`}
                        </span>
                        {!isShowName && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-2 font-normal">
                            {bn ? 'নাম বন্ধ (শুধু পদবী)' : 'Name Off (Title Only)'}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {(err.title || err.name) && (
                          <div className="text-[11px] text-destructive font-medium">
                            {err.title || err.name}
                          </div>
                        )}
                        <div className="flex items-center gap-2 bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50">
                          <Label htmlFor={`sig-toggle-${i}`} className="text-xs font-medium cursor-pointer select-none">
                            {bn ? 'নাম প্রদর্শন' : 'Show Name'}
                          </Label>
                          <Switch
                            id={`sig-toggle-${i}`}
                            checked={isShowName}
                            onCheckedChange={(checked) => {
                              setSigDraft(d => d.map((x, j) => j === i ? { ...x, show_name: checked } : x));
                              setSigErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">{bn ? 'পদবী (বাংলা)' : 'Title (Bangla)'} <span className="text-muted-foreground">*</span></Label>
                      <Input maxLength={MAX_LEN} value={s.title_bn || ''} onChange={(e) => setField('title_bn', e.target.value)}
                        onBlur={() => trimField('title_bn')}
                        className={(err.title || err.title_bn) ? 'border-destructive focus-visible:ring-destructive' : ''} />
                      {err.title_bn && <p className="text-[11px] text-destructive mt-1">{err.title_bn}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'পদবী (English)' : 'Title (English)'} <span className="text-muted-foreground">*</span></Label>
                      <Input maxLength={MAX_LEN} value={s.title_en || ''} onChange={(e) => setField('title_en', e.target.value)}
                        onBlur={() => trimField('title_en')}
                        className={(err.title || err.title_en) ? 'border-destructive focus-visible:ring-destructive' : ''} />
                      {err.title_en && <p className="text-[11px] text-destructive mt-1">{err.title_en}</p>}
                    </div>

                    {detectedMuhtamim && (i === 3 || (s.title_bn || '').includes('মুহতামিম') || (s.title_bn || '').includes('অধ্যক্ষ') || (s.title_bn || '').includes('প্রিন্সিপাল')) && (
                      <div className="md:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                        <div className="text-xs text-emerald-900 dark:text-emerald-200 font-medium">
                          <span className="font-bold">⭐ {bn ? 'প্রতিষ্ঠানের প্রধান (মুহতামিম/প্রিন্সিপাল):' : 'Principal:'} </span>
                          <span className="font-bold underline text-emerald-700 dark:text-emerald-300">{detectedMuhtamim.name_bn}</span>
                          <span className="text-muted-foreground ml-1">({detectedMuhtamim.designation || (bn ? 'মুহতামিম' : 'Principal')})</span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-sm shrink-0"
                          onClick={() => {
                            setSigDraft(d => d.map((x, j) => j === i ? {
                              ...x,
                              name_bn: detectedMuhtamim.name_bn || '',
                              name_en: detectedMuhtamim.name_en || detectedMuhtamim.name_bn || '',
                              title_bn: detectedMuhtamim.designation || 'মুহতামিম / অধ্যক্ষ',
                              title_en: detectedMuhtamim.name_en ? 'Founder & Principal' : 'Principal',
                              show_name: true,
                            } : x));
                            setSigErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
                            toast.success(bn ? 'মুহতামিম/প্রিন্সিপাল সাহেবের নাম ও পদবী যুক্ত করা হয়েছে' : 'Applied Principal name & title');
                          }}
                        >
                          {bn ? 'উনার পদবী সহ বসান' : 'Apply with Title'}
                        </Button>
                      </div>
                    )}

                    {/* Staff Dropdown selector */}
                    <div className="md:col-span-2">
                      <Label className="text-xs flex items-center justify-between text-muted-foreground mb-1">
                        <span>{bn ? 'শিক্ষক/স্টাফ ড্রপডাউন (বাছাই করলে নাম ও পদবী স্বয়ংক্রিয়ভাবে বসবে)' : 'Teacher/Staff Dropdown (Auto-fills name & title)'}</span>
                      </Label>
                      <Select
                        disabled={!isShowName}
                        value=""
                        onValueChange={(staffId) => {
                          const staffMember = combinedStaffList.find((st: any) => st.id === staffId);
                          if (staffMember) {
                            const nameBn = staffMember.name_bn || '';
                            const nameEn = staffMember.name_en || staffMember.name_bn || '';
                            const newTitleBn = staffMember.designation || s.title_bn || '';
                            let newTitleEn = s.title_en || '';
                            if (staffMember.designation) {
                              const desLower = staffMember.designation.toLowerCase();
                              if (desLower.includes('মুহতামিম') || desLower.includes('অধ্যক্ষ') || desLower.includes('প্রধান') || desLower.includes('প্রিন্সিপাল')) {
                                newTitleEn = 'Principal';
                              } else if (desLower.includes('পরীক্ষা')) {
                                newTitleEn = 'Exam Controller';
                              } else if (desLower.includes('শিক্ষা সচিব')) {
                                newTitleEn = 'Education Secretary';
                              } else if (desLower.includes('শ্রেণি') || desLower.includes('শিক্ষক')) {
                                newTitleEn = s.title_en || 'Teacher';
                              }
                            }
                            setSigDraft(d => d.map((x, j) => j === i ? {
                              ...x,
                              name_bn: nameBn,
                              name_en: nameEn,
                              title_bn: newTitleBn,
                              title_en: newTitleEn,
                            } : x));
                            setSigErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 rounded-md text-xs bg-background">
                          <SelectValue placeholder={bn ? 'তালিকা থেকে শিক্ষক বা স্টাফ বাছাই করুন...' : 'Choose teacher or staff from list...'} />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {combinedStaffList.map((st: any) => {
                            const displayName = bn
                              ? st.name_bn + (st.designation ? ` — ${st.designation}` : '')
                              : (st.name_en || st.name_bn) + (st.designation ? ` — ${st.designation}` : '');
                            return (
                              <SelectItem key={st.id} value={st.id} className="text-xs">
                                {displayName}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">
                        {bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} {isShowName && <span className="text-muted-foreground">*</span>}
                      </Label>
                      <Input
                        maxLength={MAX_LEN}
                        value={s.name_bn || ''}
                        disabled={!isShowName}
                        placeholder={!isShowName ? (bn ? 'নাম প্রদর্শন বন্ধ রয়েছে' : 'Name display disabled') : ''}
                        onChange={(e) => setField('name_bn', e.target.value)}
                        onBlur={() => trimField('name_bn')}
                        className={(err.name || err.name_bn) ? 'border-destructive focus-visible:ring-destructive' : ''}
                      />
                      {err.name_bn && <p className="text-[11px] text-destructive mt-1">{err.name_bn}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">
                        {bn ? 'নাম (English)' : 'Name (English)'} {isShowName && <span className="text-muted-foreground">*</span>}
                      </Label>
                      <Input
                        maxLength={MAX_LEN}
                        value={s.name_en || ''}
                        disabled={!isShowName}
                        placeholder={!isShowName ? (bn ? 'নাম প্রদর্শন বন্ধ রয়েছে' : 'Name display disabled') : ''}
                        onChange={(e) => setField('name_en', e.target.value)}
                        onBlur={() => trimField('name_en')}
                        className={(err.name || err.name_en) ? 'border-destructive focus-visible:ring-destructive' : ''}
                      />
                      {err.name_en && <p className="text-[11px] text-destructive mt-1">{err.name_en}</p>}
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground">
                {bn ? 'প্রতিটি স্বাক্ষরকারীর পদবী আবশ্যক। নাম প্রদর্শন চালু থাকলে নাম অন্তত একটি ভাষায় (বাংলা বা English) প্রদান করুন।' : 'Title is required for each signatory. When Show Name is on, name is required in at least one language.'}
              </p>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              {hasSigErrors && (
                <div className="text-[12px] text-destructive font-medium sm:mr-auto px-3 py-2 rounded-md bg-destructive/10 border border-destructive/30">
                  {bn ? `${Object.keys(liveSigErrors).length} টি স্বাক্ষরকারীর তথ্যে ত্রুটি রয়েছে — সংশোধন করুন।` : `${Object.keys(liveSigErrors).length} signatory row(s) have errors — please fix before saving.`}
                </div>
              )}
              <Button variant="ghost" onClick={() => setSigDraft(DEFAULT_RESULT_SIGNATORIES)}>
                {bn ? 'ডিফল্টে রিসেট' : 'Reset to default'}
              </Button>
              <Button variant="outline" onClick={() => setSigDialogOpen(false)}>
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                onClick={() => saveSignatories.mutate(sigDraft)}
                disabled={saveSignatories.isPending || hasSigErrors}
                title={hasSigErrors ? (bn ? 'ত্রুটি সংশোধনের পর সংরক্ষণ করুন' : 'Fix errors before saving') : undefined}
              >
                {saveSignatories.isPending ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'সংরক্ষণ' : 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Export options dialog: PDF vs Browser Print + A4 orientation */}
        <Dialog open={exportOptions.open} onOpenChange={(o) => setExportOptions(s => ({ ...s, open: o }))}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{bn ? 'এক্সপোর্ট অপশন' : 'Export Options'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{bn ? 'ফরম্যাট' : 'Format'}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['pdf', 'print'] as const).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExportOptions(s => ({ ...s, mode: m }))}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${exportOptions.mode === m ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                    >
                      {m === 'pdf' ? (bn ? 'PDF ডাউনলোড' : 'Download PDF') : (bn ? 'ব্রাউজার প্রিন্ট' : 'Browser Print')}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{bn ? 'A4 ওরিয়েন্টেশন' : 'A4 Orientation'}</p>
                <div className="grid grid-cols-2 gap-2">
                  {(['landscape', 'portrait'] as const).map(o => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setExportOptions(s => ({ ...s, orientation: o }))}
                      className={`p-3 rounded-lg border text-sm font-medium transition-all ${exportOptions.orientation === o ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                    >
                      {o === 'landscape' ? (bn ? 'ল্যান্ডস্কেপ' : 'Landscape') : (bn ? 'পোর্ট্রেট' : 'Portrait')}
                    </button>
                  ))}
                </div>
                {exportOptions.orientation === 'portrait' && (
                  <p className="text-[11px] text-muted-foreground mt-2">
                    {bn ? 'অনেক বিষয় থাকলে পোর্ট্রেটে কলাম সংকুচিত হতে পারে।' : 'Columns may be narrower in portrait when many subjects are present.'}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{bn ? 'প্রিন্ট মার্জিন (mm)' : 'Print Margins (mm)'}</p>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {(Object.keys(PRINT_MARGIN_PRESETS) as Array<keyof typeof PRINT_MARGIN_PRESETS>).map(key => {
                    const preset = PRINT_MARGIN_PRESETS[key];
                    const cur = footerOptions.margins || DEFAULT_PRINT_MARGINS;
                    const active = cur.top === preset.top && cur.right === preset.right && cur.bottom === preset.bottom && cur.left === preset.left;
                    const labels: Record<string, { en: string; bn: string }> = {
                      narrow: { en: 'Narrow', bn: 'সংকীর্ণ' },
                      normal: { en: 'Normal', bn: 'সাধারণ' },
                      moderate: { en: 'Moderate', bn: 'মাঝারি' },
                      wide: { en: 'Wide', bn: 'প্রশস্ত' },
                    };
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => saveFooterOptions({ ...footerOptions, margins: preset })}
                        className={`p-2 rounded-lg border text-xs font-medium transition-all ${active ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                        title={`T${preset.top} R${preset.right} B${preset.bottom} L${preset.left}`}
                      >
                        {bn ? labels[key].bn : labels[key].en}
                      </button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {(['top', 'right', 'bottom', 'left'] as const).map(side => {
                    const cur = footerOptions.margins || DEFAULT_PRINT_MARGINS;
                    const sideLabels: Record<typeof side, { en: string; bn: string }> = {
                      top: { en: 'Top', bn: 'উপর' },
                      right: { en: 'Right', bn: 'ডান' },
                      bottom: { en: 'Bottom', bn: 'নিচ' },
                      left: { en: 'Left', bn: 'বাম' },
                    };
                    return (
                      <div key={side} className="space-y-1">
                        <label className="text-[10px] text-muted-foreground uppercase">{bn ? sideLabels[side].bn : sideLabels[side].en}</label>
                        <input
                          type="number"
                          min={3}
                          max={25}
                          step={1}
                          value={cur[side] || ''}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            const next = sanitizeMargins({ ...cur, [side]: v });
                            saveFooterOptions({ ...footerOptions, margins: next });
                          }}
                          className="w-full h-8 px-2 text-sm rounded-md border border-border bg-background"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  {bn ? 'প্রিন্টার ভেদে টেবিল কাটা গেলে মার্জিন কমান বা বাড়ান (3–25 mm)। ফুটার দেখানোর জন্য নিচের মার্জিন কমপক্ষে 10 mm রাখা হয়।' : 'Tweak margins (3–25 mm) if your printer clips the table. Bottom is kept ≥ 10 mm to fit the footer.'}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{bn ? 'প্রিন্ট ফুটার (সংরক্ষিত হবে)' : 'Print Footer (saved)'}</p>
                <div className="space-y-2 rounded-lg border p-3 bg-muted/30">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-sm">{bn ? 'প্রতিটি পৃষ্ঠায় পৃষ্ঠা নম্বর দেখান' : 'Show page numbers (Page X of Y)'}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary cursor-pointer"
                      checked={footerOptions.show_page_numbers}
                      onChange={(e) => saveFooterOptions({ ...footerOptions, show_page_numbers: e.target.checked })}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <span className="text-sm">{bn ? 'ফুটারে প্রতিষ্ঠানের নাম দেখান' : 'Show institution name in footer'}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-primary cursor-pointer"
                      checked={footerOptions.show_footer_institution}
                      onChange={(e) => saveFooterOptions({ ...footerOptions, show_footer_institution: e.target.checked })}
                    />
                  </label>
                </div>
              </div>

              {/* Per-class / per-exam overrides */}
              {(() => {
                const classId = exportOptions.classId;
                const examId = examSessionId || null;
                if (!classId && !examId) return null;
                const resolved = resolveFooterFor(classId, examId);
                const clsOv = classId ? footerOverrides.find(o => o.scope === 'class' && o.scope_id === classId) : undefined;
                const exmOv = examId ? footerOverrides.find(o => o.scope === 'exam' && o.scope_id === examId) : undefined;
                const clsName = examClasses.find((c: any) => c.id === classId);
                const exmName = examSessions.find((es: any) => es.id === examId);
                const tri = (val: boolean | null | undefined): 'inherit' | 'on' | 'off' =>
                  val === true ? 'on' : val === false ? 'off' : 'inherit';
                const triToVal = (t: 'inherit' | 'on' | 'off'): boolean | null => t === 'inherit' ? null : t === 'on';
                const TriSelect: React.FC<{ value: 'inherit' | 'on' | 'off'; onChange: (v: 'inherit' | 'on' | 'off') => void }> = ({ value, onChange }) => (
                  <div className="inline-flex rounded-md border overflow-hidden text-[11px]">
                    {(['inherit', 'on', 'off'] as const).map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onChange(opt)}
                        className={`px-2 py-1 transition-colors ${value === opt ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                      >
                        {opt === 'inherit' ? (bn ? 'গ্লোবাল' : 'Inherit') : opt === 'on' ? (bn ? 'চালু' : 'On') : (bn ? 'বন্ধ' : 'Off')}
                      </button>
                    ))}
                  </div>
                );
                const Row = (label: string, scope: 'class' | 'exam', scopeId: string, scopeLabel: string, ov: typeof clsOv) => (
                  <div className="flex flex-col gap-1.5 py-2 border-b last:border-b-0">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-medium">{scopeLabel}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">{bn ? 'পৃষ্ঠা নম্বর' : 'Page numbers'}</span>
                      <TriSelect value={tri(ov?.show_page_numbers)} onChange={(v) => upsertFooterOverride(scope, scopeId, { show_page_numbers: triToVal(v) })} />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs">{bn ? 'প্রতিষ্ঠানের নাম' : 'Institution name'}</span>
                      <TriSelect value={tri(ov?.show_footer_institution)} onChange={(v) => upsertFooterOverride(scope, scopeId, { show_footer_institution: triToVal(v) })} />
                    </div>
                  </div>
                );
                return (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                      {bn ? 'এই এক্সপোর্টের জন্য ওভাররাইড' : 'Overrides for this export'}
                    </p>
                    <div className="rounded-lg border p-3 bg-muted/30">
                      {examId && exmName ? Row(
                        'exam', 'exam', examId,
                        `${bn ? 'পরীক্ষা' : 'Exam'}: ${bn ? (exmName.name_bn || exmName.name) : exmName.name}`,
                        exmOv,
                      ) : null}
                      {classId && clsName ? Row(
                        'class', 'class', classId,
                        `${bn ? 'ক্লাস' : 'Class'}: ${bn ? (clsName.name_bn || clsName.name) : clsName.name}`,
                        clsOv,
                      ) : null}
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {bn
                          ? 'ক্লাস > পরীক্ষা > গ্লোবাল — যেটি সবার আগে নন-Inherit পাওয়া যায়, সেটি ব্যবহার হয়।'
                          : 'Resolution order: Class → Exam → Global. First non-Inherit value wins.'}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Live footer preview (resolved) */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{bn ? 'ফুটার প্রিভিউ (লাইভ)' : 'Footer Preview (live)'}</p>
                {(() => {
                  const r = resolveFooterFor(exportOptions.classId, examSessionId || null);
                  return (
                    <>
                      <div className="rounded-lg border bg-white text-black overflow-hidden">
                        <div className="px-3 py-6 text-[11px] text-gray-400 italic text-center border-b border-dashed">
                          {bn ? '— রেজাল্ট শীটের বিষয়বস্তু —' : '— result sheet content —'}
                        </div>
                        <div
                          className="flex items-center justify-between gap-3 px-3 py-2 text-[10px] border-t"
                          style={{ fontFamily: '"Times New Roman", serif' }}
                        >
                          <span className="truncate flex-1 text-left">
                            {r.show_footer_institution
                              ? ((bn ? institution?.name : (institution?.name_en || institution?.name)) || (bn ? 'প্রতিষ্ঠানের নাম' : 'Institution Name'))
                              : '\u00A0'}
                          </span>
                          <span className="shrink-0 text-center text-gray-600">
                            {new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB')}
                          </span>
                          <span className="shrink-0 text-right flex-1">
                            {r.show_page_numbers ? (bn ? 'পৃষ্ঠা ১ / ৩' : 'Page 1 of 3') : '\u00A0'}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-2">
                        {bn
                          ? `উৎস — পৃষ্ঠা: ${r.source.pages === 'class' ? 'ক্লাস' : r.source.pages === 'exam' ? 'পরীক্ষা' : 'গ্লোবাল'}, প্রতিষ্ঠান: ${r.source.inst === 'class' ? 'ক্লাস' : r.source.inst === 'exam' ? 'পরীক্ষা' : 'গ্লোবাল'}`
                          : `Source — pages: ${r.source.pages}, institution: ${r.source.inst}`}
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setExportOptions(s => ({ ...s, open: false }))}>
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button
                onClick={() => {
                  const { classId, mode, orientation } = exportOptions;
                  setExportOptions(s => ({ ...s, open: false }));
                  if (classId) runClassExport(classId, mode, orientation);
                }}
              >
                {bn ? 'এক্সপোর্ট করুন' : 'Export'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        <ResultSelectionBrowser
          searchMode={searchMode}
          onSearchModeChange={(m) => {
            setSearchMode(m);
            setShowResults(false);
            setSelectedExamId(null);
            setMarksMap({});
            setViewingStudentId(null);
          }}
          examYear={examYear}
          onExamYearChange={(v) => {
            setExamYear(v);
            setExamSessionId('');
            setSelectedClass('');
            setSelectedExamId(null);
            setMarksMap({});
            setShowResults(false);
          }}
          examSession={examSessionId}
          onExamSessionChange={(v) => {
            setExamSessionId(v);
            const es: any = examSessions.find((s: any) => s.id === v);
            if (es?.academic_session_id && es.academic_session_id !== examYear) {
              setExamYear(es.academic_session_id);
            }
            setSelectedClass('');
            setSelectedExamId(null);
            setMarksMap({});
            setShowResults(false);
          }}
          rollNumber={rollNumber}
          onRollNumberChange={setRollNumber}
          academicSessions={academicSessions}
          examSessions={examSessions}
          classes={examClasses}
          selectedClass={selectedClass}
          onClassChange={(v) => {
            setSelectedClass(v);
            setShowResults(false);
            setViewingStudentId(null);
          }}
          onSearch={handleSearch}

          onReset={() => {
            setExamYear('');
            setExamSessionId('');
            setSelectedClass('');
            setRollNumber('');
            setSelectedExamId(null);
            setMarksMap({});
            setShowResults(false);
            setViewingStudentId(null);
          }}
        />


        {/* Class list with status when year+session selected but no class */}
        {showClassList && examClasses.length > 0 && (
          <ClassResultStatusList
            classes={examClasses}
            resultStatusMap={classResultStatus as Record<string, boolean>}
            publishStatusMap={classPublishStatus as Record<string, boolean>}
            onClassClick={handleClassFromList}
            onExport={handleClassExport}
            onPublishToggle={handlePublishToggle}
            exportingClassId={exportingClassId}
            examSessionName={getExamSessionName()}
            publishApprovalStatus={publishApprovalStatus}
            publishRejectionReason={currentExamSession?.publish_rejection_reason}
            isAdmin={isAdmin}
            onApprovePublish={handleApprovePublish}
            onRejectPublish={() => setRejectPublishOpen(true)}
          />
        )}

        <div ref={resultsSectionRef} className="scroll-mt-24 space-y-4">
          {showResults && <GradingChart />}

          {showResults && viewingStudent ? (
            <IndividualMarksheet
              student={viewingStudent}
              subjects={subjects}
              marksMap={marksMap}
              examTitle={getExamTitle()}
              examName={bn ? examSessions.find((es: any) => es.id === examSessionId)?.name_bn : examSessions.find((es: any) => es.id === examSessionId)?.name}
              className={bn ? examClasses.find((c: any) => c.id === selectedClass)?.name_bn : examClasses.find((c: any) => c.id === selectedClass)?.name}
              sessionName={(() => { const y = academicSessions.find((s: any) => s.id === examYear); return bn ? (y?.name_bn || y?.name) : y?.name; })()}
              onBack={() => setViewingStudentId(null)}
              rank={viewingStudentRank}
            />
          ) : showResults ? (
            <ClassResultTable
              students={students}
              subjects={subjects}
              marksMap={marksMap}
              onMarksChange={(key, value) => setMarksMap(prev => ({ ...prev, [key]: value }))}
              onSave={() => saveMutation.mutate()}
              isSaving={saveMutation.isPending}
              title={getExamTitle()}
              lastSaved={lastSavedInfo || null}
              readOnly={isClassLocked ? true : readOnlyView}
              onEdit={() => {
                if (isClassLocked) {
                  toast.warning(bn ? '🔒 এই ক্লাসের ফলাফল পাবলিশড এবং লক করা রয়েছে। সংশোধন করতে অ্যাডমিনের অনুমোদন প্রয়োজন।' : '🔒 This class result is published and locked.');
                  return;
                }
                setReadOnlyView(false);
              }}
              className={bn ? examClasses.find((c: any) => c.id === selectedClass)?.name_bn : examClasses.find((c: any) => c.id === selectedClass)?.name}
              examName={bn ? examSessions.find((es: any) => es.id === examSessionId)?.name_bn : examSessions.find((es: any) => es.id === examSessionId)?.name}
              sessionName={(() => { const y = academicSessions.find((s: any) => s.id === examYear); return bn ? (y?.name_bn || y?.name) : y?.name; })()}



              onViewMarksheet={(id) => {
                setViewingStudentId(id);
              }}
              onClose={() => {
                setShowResults(false);
                setSelectedExamId(null);
                setSelectedClass('');
                setMarksMap({});
              }}
            />
          ) : null}
        </div>
        <Dialog open={rejectPublishOpen} onOpenChange={setRejectPublishOpen}>
          <DialogContent className="rounded-[28px]">
            <DialogHeader>
              <DialogTitle>{bn ? 'ফলাফল পাবলিশ প্রত্যাখ্যান' : 'Reject Result Publishing'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>{bn ? 'কারণ' : 'Reason'}</Label>
              <Input
                value={rejectPublishReason}
                onChange={(e) => setRejectPublishReason(e.target.value)}
                placeholder={bn ? 'কারণ লিখুন...' : 'Enter reason...'}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectPublishOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
              <Button variant="destructive" disabled={!rejectPublishReason.trim()} onClick={handleRejectPublish}>
                {bn ? 'নিশ্চিত করুন' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminResults;
