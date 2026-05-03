import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import ResultSearchFilters from '@/components/results/ResultSearchFilters';
import ClassResultTable from '@/components/results/ClassResultTable';
import ClassResultStatusList from '@/components/results/ClassResultStatusList';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import IndividualMarksheet from '@/components/results/IndividualMarksheet';
import GradingChart from '@/components/results/GradingChart';
import { GraduationCap } from 'lucide-react';
import { exportResultCSV, exportResultPDF, printResultSheet, DEFAULT_RESULT_SIGNATORIES, type ResultSignatory } from '@/lib/resultExport';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { Button } from '@/components/ui/button';
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
  const { getGrade, getOverallGrade } = useGradingSystem();

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

  // Show class list when we have year+session from URL but no class selected
  const showClassList = !!examYear && !!examSessionId && !selectedClass && !showResults;

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

  // Fetch exam sessions
  const { data: examSessions = [] } = useQuery({
    queryKey: ['exam-sessions', examYear],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_sessions').select('*').eq('academic_session_id', examYear).eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!examYear,
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

  // Fetch result status for each class (check if results exist for this exam session)
  const { data: classResultStatus = {} } = useQuery({
    queryKey: ['class-result-status', examSessionId, examClasses.map((c: any) => c.id)],
    queryFn: async () => {
      const examSession = examSessions.find((es: any) => es.id === examSessionId);
      if (!examSession) return {};

      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select('id')
        .eq('exam_id', examSessionId)
        .limit(1);
      if (resultsError) throw resultsError;

      const hasResults = (results?.length || 0) > 0;
      const map: Record<string, boolean> = {};
      examClasses.forEach((c: any) => {
        map[c.id] = hasResults;
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

  const handlePublishToggle = async (classId: string, publish: boolean) => {
    const examSession = examSessions.find((es: any) => es.id === examSessionId);
    if (!examSession) return;

    const { error } = await supabase.from('exam_sessions').update({ is_published: publish } as any).eq('id', examSessionId);
    if (error) {
      toast.error(error.message);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['class-publish-status'] });
    queryClient.invalidateQueries({ queryKey: ['exam-sessions'] });
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
        .select('student_id, students(*)')
        .eq('exam_session_id', examSessionId)
        .eq('class_id', selectedClass);
      if (error) throw error;
      return data?.map((es: any) => es.students).filter(Boolean).sort((a: any, b: any) => (a.roll_number || 0) - (b.roll_number || 0)) || [];
    },
    enabled: !!examSessionId && !!selectedClass,
  });

  // When class is selected from the list, auto-trigger search
  const handleClassFromList = async (classId: string) => {
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
      setSelectedExamId(examId);
      await loadResultsForExam(examId);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load saved results');
      return;
    }

    if (searchMode === 'individual') {
      const found = students.find((st: any) =>
        String(st.roll_number) === rollNumber.trim() ||
        st.student_id === rollNumber.trim() ||
        st.registration_number === rollNumber.trim()
      );
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
      if (!selectedExamId) return;
      const upserts = Object.entries(marksMap).map(([key, marks]) => {
        const [student_id, subject_id] = key.split('_');
        const { grade, gpa } = getGrade(marks);
        return { exam_id: selectedExamId, student_id, subject_id, marks, grade, gpa: parseFloat(gpa) };
      });
      if (await checkApproval('edit', { exam_id: selectedExamId, results_count: upserts.length, results: upserts }, selectedExamId, `ফলাফল সংরক্ষণ`)) return;
      const { error } = await supabase.from('results').upsert(upserts, { onConflict: 'exam_id,student_id,subject_id' });
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['class-result-status'] });
      if (selectedExamId) {
        await loadResultsForExam(selectedExamId);
      }
      toast.success(bn ? 'ফলাফল সংরক্ষিত হয়েছে' : 'Results saved');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
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
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'result_signatories').maybeSingle();
      const v = (data?.value as any);
      if (Array.isArray(v) && v.length) return v as ResultSignatory[];
      return DEFAULT_RESULT_SIGNATORIES;
    },
    staleTime: 5 * 60 * 1000,
  });

  const [sigDialogOpen, setSigDialogOpen] = useState(false);
  const [sigDraft, setSigDraft] = useState<ResultSignatory[]>(DEFAULT_RESULT_SIGNATORIES);
  const [sigErrors, setSigErrors] = useState<Record<number, { title?: string; name?: string; title_bn?: string; title_en?: string; name_bn?: string; name_en?: string }>>({});
  useEffect(() => { setSigDraft(signatories); setSigErrors({}); }, [signatories]);

  const MAX_LEN = 100;
  const validateSignatories = (rows: ResultSignatory[]) => {
    const errs: typeof sigErrors = {};
    rows.forEach((s, i) => {
      const tBn = (s.title_bn || '').trim();
      const tEn = (s.title_en || '').trim();
      const nBn = (s.name_bn || '').trim();
      const nEn = (s.name_en || '').trim();
      const e: any = {};
      if (!tBn && !tEn) e.title = bn ? 'অন্তত একটি ভাষায় পদবী দিন' : 'Title required in at least one language';
      if (!nBn && !nEn) e.name = bn ? 'অন্তত একটি ভাষায় নাম দিন' : 'Name required in at least one language';
      if (tBn.length > MAX_LEN) e.title_bn = bn ? `সর্বোচ্চ ${MAX_LEN} অক্ষর` : `Max ${MAX_LEN} chars`;
      if (tEn.length > MAX_LEN) e.title_en = bn ? `সর্বোচ্চ ${MAX_LEN} অক্ষর` : `Max ${MAX_LEN} chars`;
      if (nBn.length > MAX_LEN) e.name_bn = bn ? `সর্বোচ্চ ${MAX_LEN} অক্ষর` : `Max ${MAX_LEN} chars`;
      if (nEn.length > MAX_LEN) e.name_en = bn ? `সর্বোচ্চ ${MAX_LEN} অক্ষর` : `Max ${MAX_LEN} chars`;
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
      const cleaned = rows.map(r => ({
        title_bn: (r.title_bn || '').trim(),
        title_en: (r.title_en || '').trim(),
        name_bn: (r.name_bn || '').trim(),
        name_en: (r.name_en || '').trim(),
      }));
      const { error } = await supabase
        .from('website_settings')
        .upsert({ key: 'result_signatories', value: cleaned as any, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) throw error;
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
    setExportingClassId(classId);
    try {
      const examSession = examSessions.find((es: any) => es.id === examSessionId);
      if (!examSession) return;

      const cls = examClasses.find((c: any) => c.id === classId);
      const classDivisionId = cls?.division_id;

      // Get exam
      const examId = examSessionId;

      // Load results
      const { data: results } = await supabase.from('results').select('*').eq('exam_id', examId);
      const exportMarksMap: Record<string, number> = {};
      results?.forEach((r: any) => { exportMarksMap[`${r.student_id}_${r.subject_id}`] = r.marks ?? 0; });

      // Load students
      const { data: studentData } = await supabase
        .from('exam_session_students')
        .select('student_id, students(*)')
        .eq('exam_session_id', examSessionId)
        .eq('class_id', classId);
      const exportStudents = studentData?.map((es: any) => es.students).filter(Boolean).sort((a: any, b: any) => (a.roll_number || 0) - (b.roll_number || 0)) || [];

      // Load subjects
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
      };

      if (type === 'csv') exportResultCSV(params);
      else if (type === 'pdf') exportResultPDF(params);
      else if (type === 'print') printResultSheet(params);
    } catch (e: any) {
      toast.error(e.message || 'Export failed');
    } finally {
      setExportingClassId(null);
    }
  };

  const viewingStudent = viewingStudentId ? students.find((st: any) => st.id === viewingStudentId) : null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-foreground">{bn ? 'ফলাফল ব্যবস্থাপনা' : 'Result Management'}</h1>
            <p className="text-sm text-muted-foreground">{bn ? 'ক্লাস-ওয়াইজ বা ব্যক্তিগত ফলাফল অনুসন্ধান করুন' : 'Search class-wise or individual results'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSigDialogOpen(true)} className="gap-2">
            <Settings2 className="w-4 h-4" />
            {bn ? 'স্বাক্ষরকারী' : 'Signatories'}
          </Button>
        </div>

        <Dialog open={sigDialogOpen} onOpenChange={setSigDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{bn ? 'রেজাল্ট শীটের স্বাক্ষরকারী সম্পাদনা' : 'Edit Result Sheet Signatories'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {sigDraft.map((s, i) => {
                const err = sigErrors[i] || {};
                const setField = (field: keyof ResultSignatory, val: string) => {
                  setSigDraft(d => d.map((x, j) => j === i ? { ...x, [field]: val } : x));
                  setSigErrors(prev => { const n = { ...prev }; delete n[i]; return n; });
                };
                return (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
                    <div className="md:col-span-2 flex items-center justify-between">
                      <div className="text-xs font-semibold text-muted-foreground">
                        {bn ? `স্বাক্ষরকারী ${i + 1}` : `Signatory ${i + 1}`}
                      </div>
                      {(err.title || err.name) && (
                        <div className="text-[11px] text-destructive font-medium">
                          {err.title || err.name}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'পদবী (বাংলা)' : 'Title (Bangla)'} <span className="text-muted-foreground">*</span></Label>
                      <Input maxLength={MAX_LEN} value={s.title_bn || ''} onChange={(e) => setField('title_bn', e.target.value)}
                        className={(err.title || err.title_bn) ? 'border-destructive focus-visible:ring-destructive' : ''} />
                      {err.title_bn && <p className="text-[11px] text-destructive mt-1">{err.title_bn}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'পদবী (English)' : 'Title (English)'} <span className="text-muted-foreground">*</span></Label>
                      <Input maxLength={MAX_LEN} value={s.title_en || ''} onChange={(e) => setField('title_en', e.target.value)}
                        className={(err.title || err.title_en) ? 'border-destructive focus-visible:ring-destructive' : ''} />
                      {err.title_en && <p className="text-[11px] text-destructive mt-1">{err.title_en}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} <span className="text-muted-foreground">*</span></Label>
                      <Input maxLength={MAX_LEN} value={s.name_bn || ''} onChange={(e) => setField('name_bn', e.target.value)}
                        className={(err.name || err.name_bn) ? 'border-destructive focus-visible:ring-destructive' : ''} />
                      {err.name_bn && <p className="text-[11px] text-destructive mt-1">{err.name_bn}</p>}
                    </div>
                    <div>
                      <Label className="text-xs">{bn ? 'নাম (English)' : 'Name (English)'} <span className="text-muted-foreground">*</span></Label>
                      <Input maxLength={MAX_LEN} value={s.name_en || ''} onChange={(e) => setField('name_en', e.target.value)}
                        className={(err.name || err.name_en) ? 'border-destructive focus-visible:ring-destructive' : ''} />
                      {err.name_en && <p className="text-[11px] text-destructive mt-1">{err.name_en}</p>}
                    </div>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground">
                {bn ? 'প্রতিটি স্বাক্ষরকারীর জন্য পদবী ও নাম অন্তত একটি ভাষায় (বাংলা বা English) আবশ্যক।' : 'Title and name are required in at least one language (Bangla or English) for each signatory.'}
              </p>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setSigDraft(DEFAULT_RESULT_SIGNATORIES)}>
                {bn ? 'ডিফল্টে রিসেট' : 'Reset to default'}
              </Button>
              <Button variant="outline" onClick={() => setSigDialogOpen(false)}>
                {bn ? 'বাতিল' : 'Cancel'}
              </Button>
              <Button onClick={() => saveSignatories.mutate(sigDraft)} disabled={saveSignatories.isPending}>
                {saveSignatories.isPending ? (bn ? 'সংরক্ষণ হচ্ছে...' : 'Saving...') : (bn ? 'সংরক্ষণ' : 'Save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


        <ResultSearchFilters
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
            setSelectedClass('');
            setSelectedExamId(null);
            setMarksMap({});
            setShowResults(false);
          }}
          selectedClass={selectedClass}
          onClassChange={(v) => {
            setSelectedClass(v);
            setSelectedExamId(null);
            setMarksMap({});
            setShowResults(false);
          }}
          rollNumber={rollNumber}
          onRollNumberChange={setRollNumber}
          academicSessions={academicSessions}
          classes={examClasses}
          examSessions={examSessions}
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
          />
        )}

        {showResults && <GradingChart />}

        {showResults && viewingStudent ? (
          <IndividualMarksheet
            student={viewingStudent}
            subjects={subjects}
            marksMap={marksMap}
            examTitle={getExamTitle()}
            onBack={() => setViewingStudentId(null)}
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
            onViewMarksheet={(id) => setViewingStudentId(id)}
            onClose={() => {
              setShowResults(false);
              setSelectedExamId(null);
              setSelectedClass('');
              setMarksMap({});
            }}
          />
        ) : null}
      </div>
    </AdminLayout>
  );
};

export default AdminResults;
