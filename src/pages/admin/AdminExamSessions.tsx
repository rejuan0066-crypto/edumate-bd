import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Users, BookOpen, Edit2, Check, X, Settings2, BookMarked, UserMinus, GraduationCap, ChevronDown, ChevronRight, Eye, FileSpreadsheet, AlertTriangle, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useConfirm } from '@/contexts/ConfirmContext';
import ManageExamSessionDialog from '@/components/admin/exam-sessions/ManageExamSessionDialog';


const AdminExamSessions = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { canAddItem, canDeleteItem, canEditItem } = usePagePermissions('/admin/exam-sessions');

  const confirm = useConfirm();
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);
  const [manageSession, setManageSession] = useState<any | null>(null);

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editSessionName, setEditSessionName] = useState('');
  const [editSessionNameBn, setEditSessionNameBn] = useState('');


  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [academicSessionId, setAcademicSessionId] = useState('');
  const [examType, setExamType] = useState('');
  const [activeDivisionTab, setActiveDivisionTab] = useState<string>('all');
  const [searchSessionQuery, setSearchSessionQuery] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
  const [showStudentSelection, setShowStudentSelection] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Exam type manager state
  const [showTypeManager, setShowTypeManager] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeNameBn, setNewTypeNameBn] = useState('');
  const [newTypeKey, setNewTypeKey] = useState('');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [editTypeNameBn, setEditTypeNameBn] = useState('');

  // Inline quick-add type (from form dropdown)
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickTypeNameBn, setQuickTypeNameBn] = useState('');
  const [quickTypeName, setQuickTypeName] = useState('');
  const [quickTypeNameAr, setQuickTypeNameAr] = useState('');
  const [quickTypeKey, setQuickTypeKey] = useState('');
  const [quickAdding, setQuickAdding] = useState(false);

  const handleQuickAddType = async () => {
    if (!quickTypeNameBn.trim() || !quickTypeKey.trim()) {
      toast.error(bn ? 'বাংলা নাম ও কী দিন' : 'Bangla name & key required');
      return;
    }
    setQuickAdding(true);
    try {
      const key = quickTypeKey.trim().toLowerCase().replace(/\s+/g, '_');
      const maxSort = examTypes.length > 0 ? Math.max(...examTypes.map((t: any) => t.sort_order || 0)) : 0;
      const { error } = await supabase.from('exam_types').insert({
        name: quickTypeName.trim() || quickTypeNameBn.trim(),
        name_bn: quickTypeNameBn.trim(),
        name_ar: quickTypeNameAr.trim() || null,
        key,
        sort_order: maxSort + 1,
      } as any);
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ['exam_types'] });
      setExamType(key); // auto-select newly added type
      setQuickTypeName(''); setQuickTypeNameBn(''); setQuickTypeNameAr(''); setQuickTypeKey('');
      setQuickAddOpen(false);
      toast.success(bn ? 'নতুন ধরন যোগ হয়েছে ও নির্বাচিত' : 'Type added & selected');
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setQuickAdding(false);
    }
  };

  // Fetch exam types from DB
  const { data: examTypes = [] } = useQuery({
    queryKey: ['exam_types'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_types').select('*').order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch academic sessions
  const { data: academicSessions = [] } = useQuery({
    queryKey: ['academic_sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch divisions
  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all classes with divisions
  const { data: classes = [] } = useQuery({
    queryKey: ['classes_with_divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*, divisions(name, name_bn)').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const filteredClasses = (activeDivisionTab !== 'all'
    ? classes.filter((c: any) => c.division_id === activeDivisionTab)
    : classes
  ).sort((a: any, b: any) => {
    const divA = divisions.findIndex((d: any) => d.id === a.division_id);
    const divB = divisions.findIndex((d: any) => d.id === b.division_id);
    if (divA !== divB) return divA - divB;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });

  // Fetch subjects for selected classes/divisions
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects_for_exam', selectedClassIds],
    queryFn: async () => {
      if (selectedClassIds.length === 0) return [];
      const divIds = [...new Set(selectedClassIds.map(cid => {
        const cls = classes.find((c: any) => c.id === cid);
        return cls?.division_id;
      }).filter(Boolean))] as string[];

      // Get subjects matching selected divisions or classes
      let query = supabase.from('subjects').select('*').eq('is_active', true);
      const orParts: string[] = [];
      divIds.forEach(d => orParts.push(`division_id.eq.${d}`));
      selectedClassIds.forEach(c => orParts.push(`class_id.eq.${c}`));
      if (orParts.length > 0) {
        query = query.or(orParts.join(','));
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: selectedClassIds.length > 0,
  });

  // Sort subjects by class order and division order
  const sortedSubjects = [...subjects].sort((a: any, b: any) => {
    // Sort by class first
    if (a.class_id !== b.class_id) {
      if (!a.class_id) return 1;
      if (!b.class_id) return -1;
      const classA = classes.find((c: any) => c.id === a.class_id);
      const classB = classes.find((c: any) => c.id === b.class_id);
      return (classA?.sort_order ?? 0) - (classB?.sort_order ?? 0);
    }
    // Then by division
    if (a.division_id !== b.division_id) {
      if (!a.division_id) return 1;
      if (!b.division_id) return -1;
      const divA = divisions.find((d: any) => d.id === a.division_id);
      const divB = divisions.find((d: any) => d.id === b.division_id);
      return (divA?.sort_order ?? 0) - (divB?.sort_order ?? 0);
    }
    // Finally by name
    return (a.name_bn || '').localeCompare(b.name_bn || '');
  });

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds(prev => prev.includes(subjectId) ? prev.filter(id => id !== subjectId) : [...prev, subjectId]);
  };

  // Auto-select all subjects when subjects list changes
  useEffect(() => {
    if (sortedSubjects.length > 0 && selectedSubjectIds.length === 0) {
      setSelectedSubjectIds(sortedSubjects.map((s: any) => s.id));
    }
  }, [sortedSubjects]);

  const { data: studentCounts = {} } = useQuery({
    queryKey: ['student_counts_by_class', academicSessionId],
    queryFn: async () => {
      if (!academicSessionId) return {};
      const { data, error } = await supabase.from('students').select('id, class_id').eq('status', 'active').is('deleted_at', null).eq('session_id', academicSessionId);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((s: any) => { if (s.class_id) counts[s.class_id] = (counts[s.class_id] || 0) + 1; });
      return counts;
    },
    enabled: !!academicSessionId,
  });

  // Fetch students for selected classes
  const { data: classStudents = [] } = useQuery({
    queryKey: ['students_for_exam_selection', academicSessionId, selectedClassIds],
    queryFn: async () => {
      if (!academicSessionId || selectedClassIds.length === 0) return [];
      const { data, error } = await supabase.from('students')
        .select('id, name_bn, name_en, roll_number, student_id, class_id')
        .eq('status', 'active')
        .is('deleted_at', null)
        .eq('session_id', academicSessionId)
        .in('class_id', selectedClassIds)
        .order('roll_number');
      if (error) throw error;
      return data || [];
    },
    enabled: !!academicSessionId && selectedClassIds.length > 0,
  });

  // Reset excluded students when classes change
  useEffect(() => {
    setExcludedStudentIds([]);
    setShowStudentSelection(true);
  }, [selectedClassIds.join(',')]);

  const { data: examSessions = [] } = useQuery({
    queryKey: ['exam_sessions_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_sessions').select('*, academic_sessions(name, name_bn)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredExamSessions = examSessions.filter((es: any) => {
    if (!searchSessionQuery.trim()) return true;
    const q = searchSessionQuery.toLowerCase();
    return (
      (es.name && es.name.toLowerCase().includes(q)) ||
      (es.name_bn && es.name_bn.toLowerCase().includes(q)) ||
      (es.academic_sessions?.name && es.academic_sessions.name.toLowerCase().includes(q)) ||
      (es.academic_sessions?.name_bn && es.academic_sessions.name_bn.toLowerCase().includes(q))
    );
  });

  const { data: examSessionClasses = [] } = useQuery({
    queryKey: ['exam_session_classes_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_session_classes').select('*, classes(name, name_bn, division_id)');
      if (error) throw error;
      return data;
    },
  });

  // Fetch result counts and question paper counts per exam session
  const { data: sessionDependencyCounts = {} } = useQuery({
    queryKey: ['exam_session_dependency_counts'],
    queryFn: async () => {
      const { data: sessions } = await supabase.from('exam_sessions').select('id');
      if (!sessions?.length) return {};
      const sessionIds = sessions.map(s => s.id);

      // Fetch result counts
      const { data: results } = await supabase
        .from('results')
        .select('exam_id')
        .in('exam_id', sessionIds);

      // Fetch question paper counts
      const { data: papers } = await supabase
        .from('question_papers')
        .select('exam_session_id')
        .in('exam_session_id', sessionIds);

      const counts: Record<string, { resultCount: number; paperCount: number }> = {};
      
      sessions.forEach(s => {
        const resultCount = results?.filter(r => r.exam_id === s.id).length || 0;
        const paperCount = papers?.filter(p => p.exam_session_id === s.id).length || 0;
        counts[s.id] = { resultCount, paperCount };
      });

      return counts;
    },
    staleTime: 30 * 1000,
  });

  const toggleClass = (classId: string) => {
    setSelectedClassIds(prev => {
      const next = prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId];
      // Reset subjects when classes change
      setSelectedSubjectIds([]);
      return next;
    });
  };

  const selectAllClasses = () => {
    const ids = filteredClasses.map((c: any) => c.id);
    setSelectedClassIds(prev => Array.from(new Set([...prev, ...ids])));
    setSelectedSubjectIds([]);
  };

  const deselectAllClasses = () => {
    if (activeDivisionTab === 'all') {
      setSelectedClassIds([]);
    } else {
      const idsToRemove = new Set(filteredClasses.map((c: any) => c.id));
      setSelectedClassIds(prev => prev.filter(id => !idsToRemove.has(id)));
    }
    setSelectedSubjectIds([]);
  };

  const handleCreate = async () => {
    if (!nameBn.trim() || !academicSessionId || selectedClassIds.length === 0 || !examType) {
      toast.error(bn ? 'নাম, শিক্ষাবর্ষ, পরীক্ষার ধরন ও ক্লাস নির্বাচন করুন' : 'Enter name, select session, exam type & classes');
      return;
    }
    setIsCreating(true);
    try {
      const { data: examSession, error: esError } = await supabase.from('exam_sessions').insert({
        name: name.trim() || nameBn.trim(),
        name_bn: nameBn.trim(),
        academic_session_id: academicSessionId,
        exam_type: examType,
      }).select().single();
      if (esError) throw esError;

      const classMappings = selectedClassIds.map(classId => ({
        exam_session_id: examSession.id, class_id: classId,
        student_count: (studentCounts as Record<string, number>)[classId] || 0,
      }));
      const { error: classError } = await supabase.from('exam_session_classes').insert(classMappings);
      if (classError) throw classError;

      const { data: students, error: studError } = await supabase.from('students')
        .select('id, class_id').eq('status', 'active').is('deleted_at', null).eq('session_id', academicSessionId).in('class_id', selectedClassIds);
      if (studError) throw studError;

      // Filter out excluded students
      const includedStudents = (students || []).filter((s: any) => !excludedStudentIds.includes(s.id));

      if (includedStudents.length > 0) {
        const studentMappings = includedStudents.map((s: any) => ({ exam_session_id: examSession.id, student_id: s.id, class_id: s.class_id }));
        const { error: mapError } = await supabase.from('exam_session_students').insert(studentMappings);
        if (mapError) throw mapError;
      }

      // Save selected subjects
      if (selectedSubjectIds.length > 0) {
        const subjectMappings = selectedSubjectIds.map(subjectId => {
          const subj = sortedSubjects.find((s: any) => s.id === subjectId);
          return {
            exam_session_id: examSession.id,
            subject_id: subjectId,
            class_id: subj?.class_id || null,
          };
        });
        const { error: subjError } = await supabase.from('exam_session_subjects').insert(subjectMappings);
        if (subjError) throw subjError;
      }

      toast.success(bn ? `এক্সাম সেশন তৈরি হয়েছে — ${includedStudents.length} জন ছাত্র, ${selectedSubjectIds.length} টি বিষয়` : `Exam session created — ${includedStudents.length} students, ${selectedSubjectIds.length} subjects`);
      setName(''); setNameBn(''); setSelectedClassIds([]); setSelectedSubjectIds([]); setExcludedStudentIds([]); setShowStudentSelection(false);
      queryClient.invalidateQueries({ queryKey: ['exam_sessions_list'] });
      queryClient.invalidateQueries({ queryKey: ['exam_session_classes_all'] });
    } catch (err: any) { toast.error(err.message || 'Error'); }
    finally { setIsCreating(false); }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const session = examSessions.find((s: any) => s.id === id);
      const depInfo = (sessionDependencyCounts as Record<string, any>)[id] || { resultCount: 0, paperCount: 0 };
      const { resultCount, paperCount } = depInfo;
      const hasDependencies = resultCount > 0 || paperCount > 0;

      let description = bn 
        ? `আপনি কি "${session?.name_bn}" এক্সাম সেশনটি মুছে ফেলতে চান?` 
        : `Do you want to delete "${session?.name}" exam session?`;

      if (hasDependencies) {
        const warnings = [];
        if (resultCount > 0) warnings.push(bn ? `${resultCount}টি ফলাফল (Result)` : `${resultCount} results`);
        if (paperCount > 0) warnings.push(bn ? `${paperCount}টি প্রশ্নপত্র (Question Paper)` : `${paperCount} question papers`);
        
        const warningText = warnings.join(bn ? ' এবং ' : ' and ');
        description = bn 
          ? `এই সেশনের সাথে ${warningText} যুক্ত আছে। সেশন মুছলে এই তথ্যগুলোও মুছে যাবে। আপনি কি নিশ্চিত?`
          : `This session has ${warningText} linked to it. Deleting the session will also delete these records. Are you sure?`;
      }

      const isConfirmed = await confirm({
        title: bn ? 'এক্সাম সেশন মুছুন?' : 'Delete Exam Session?',
        description,
        variant: 'destructive',
        confirmText: bn ? 'হ্যাঁ, মুছুন' : 'Yes, Delete',
        cancelText: bn ? 'বাতিল' : 'Cancel'
      });

      if (!isConfirmed) return;

      const { error } = await supabase.from('exam_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_sessions_list'] });
      queryClient.invalidateQueries({ queryKey: ['exam_session_classes_all'] });
      toast.success(bn ? 'সফলভাবে মুছে ফেলা হয়েছে' : 'Successfully deleted');
    },
    onError: (e: any) => {
      console.error('Delete error:', e);
      toast.error(bn ? `মুছে ফেলা সম্ভব হয়নি: ${e.message}` : `Could not delete: ${e.message}`);
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, name, name_bn }: { id: string; name: string; name_bn: string }) => {
      if (!name_bn.trim()) throw new Error(bn ? 'বাংলা নাম দিন' : 'Bangla name required');
      const { error } = await supabase.from('exam_sessions')
        .update({ name: name.trim() || name_bn.trim(), name_bn: name_bn.trim() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_sessions_list'] });
      setEditingSessionId(null);
      toast.success(bn ? 'সেশনের নাম আপডেট হয়েছে' : 'Session name updated');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  // --- Exam Type CRUD ---
  const addTypeMutation = useMutation({

    mutationFn: async () => {
      if (!newTypeNameBn.trim() || !newTypeKey.trim()) throw new Error(bn ? 'নাম ও কী দিন' : 'Name & key required');
      const maxSort = examTypes.length > 0 ? Math.max(...examTypes.map((t: any) => t.sort_order || 0)) : 0;
      const { error } = await supabase.from('exam_types').insert({
        name: newTypeName.trim() || newTypeNameBn.trim(),
        name_bn: newTypeNameBn.trim(),
        key: newTypeKey.trim().toLowerCase().replace(/\s+/g, '_'),
        sort_order: maxSort + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_types'] });
      setNewTypeName(''); setNewTypeNameBn(''); setNewTypeKey('');
      toast.success(bn ? 'পরীক্ষার ধরন যোগ হয়েছে' : 'Exam type added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateTypeMutation = useMutation({
    mutationFn: async ({ id, name, name_bn }: { id: string; name: string; name_bn: string }) => {
      const { error } = await supabase.from('exam_types').update({ name, name_bn, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_types'] });
      setEditingTypeId(null);
      toast.success(bn ? 'আপডেট হয়েছে' : 'Updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTypeMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('exam_types').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_types'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const getTypeLabel = (key: string) => {
    const t = examTypes.find((et: any) => et.key === key);
    return t ? (bn ? t.name_bn : t.name) : key;
  };

  const totalSelected = selectedClassIds.reduce((sum, cid) => sum + ((studentCounts as Record<string, number>)[cid] || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header matching Mockup */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                {bn ? 'এক্সাম সেশন ব্যবস্থাপনা' : 'Exam Session Management'}
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  v2.0 Modern
                </span>
              </h1>
              <p className="text-sm text-muted-foreground">
                {bn ? 'পরীক্ষার সেশন তৈরি, শ্রেণি ও বিষয় বরাদ্দ এবং ফলাফল কার্যক্রম পরিচালনা' : 'Manage exam sessions, assign classes & subjects, and process results'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTypeManager(!showTypeManager)}
              className="gap-2 shadow-xs bg-background"
            >
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              {bn ? 'পরীক্ষার ধরন (Exam Types)' : 'Exam Types'}
            </Button>
          </div>
        </div>

        {/* Stats Grid matching Mockup */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-card p-4 rounded-xl border border-border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{bn ? 'মোট এক্সাম সেশন' : 'Total Exam Sessions'}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{examSessions.length} {bn ? 'টি' : ''}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
              {examSessions.length}
            </div>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{bn ? 'সক্রিয় সেশন' : 'Active Sessions'}</p>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                {examSessions.filter((s: any) => s.academic_sessions?.is_active).length} {bn ? 'টি' : ''}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 flex items-center justify-center font-bold">
              ✓
            </div>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{bn ? 'অন্তর্ভুক্ত শ্রেণি' : 'Total Classes'}</p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400 mt-1">{classes.length} {bn ? 'টি' : ''}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
              {classes.length}
            </div>
          </div>

          <div className="bg-card p-4 rounded-xl border border-border shadow-xs flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{bn ? 'মোট পরীক্ষার্থী' : 'Total Candidates'}</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400 mt-1">
                {examSessionClasses.reduce((s: number, c: any) => s + (c.student_count || 0), 0)} {bn ? 'জন' : ''}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Exam Type Manager */}
        {showTypeManager && (
          <div className="card-elevated p-5 space-y-4 border-l-4 border-l-primary">
            <h3 className="font-display font-bold text-foreground">
              <Settings2 className="inline w-4 h-4 mr-1" />
              {bn ? 'পরীক্ষার ধরন ব্যবস্থাপনা' : 'Exam Type Management'}
            </h3>

            {/* Add new type */}
            {canAddItem && (
              <div className="flex flex-wrap gap-2 items-end">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</label>
                  <Input value={newTypeNameBn} onChange={e => setNewTypeNameBn(e.target.value)} placeholder={bn ? 'যেমন: নির্বাচনী' : 'e.g. নির্বাচনী'} className="bg-background w-44" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</label>
                  <Input value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="e.g. Selective" className="bg-background w-44" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">{bn ? 'কি' : 'Key'} *</label>
                  <Input value={newTypeKey} onChange={e => setNewTypeKey(e.target.value)} placeholder="e.g. selective" className="bg-background w-36" />
                </div>
                <Button size="sm" onClick={() => addTypeMutation.mutate()} disabled={addTypeMutation.isPending} className="btn-primary-gradient">
                  {addTypeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {bn ? 'যোগ' : 'Add'}
                </Button>
              </div>
            )}

            {/* List existing types */}
            <div className="space-y-1.5">
              {examTypes.map((et: any) => (
                <div key={et.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-background hover:bg-secondary/30 transition-colors">
                  {editingTypeId === et.id ? (
                    <>
                      <Input value={editTypeNameBn} onChange={e => setEditTypeNameBn(e.target.value)} className="bg-background h-8 w-40 text-sm" />
                      <Input value={editTypeName} onChange={e => setEditTypeName(e.target.value)} className="bg-background h-8 w-40 text-sm" />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={() => updateTypeMutation.mutate({ id: et.id, name: editTypeName, name_bn: editTypeNameBn })}>
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingTypeId(null)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-foreground flex-1">
                        {bn ? et.name_bn : et.name}
                        <span className="text-xs text-muted-foreground ml-2">({et.key})</span>
                      </span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingTypeId(et.id); setEditTypeName(et.name); setEditTypeNameBn(et.name_bn); }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      {canDeleteItem && (
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => deleteTypeMutation.mutate(et.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              ))}
              {examTypes.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">{bn ? 'কোনো পরীক্ষার ধরন নেই' : 'No exam types'}</p>}
            </div>
          </div>
        )}

        {/* Modern Create Form */}
        {canAddItem && (
          <div className="card-elevated p-0 overflow-hidden border border-border/80 shadow-sm">
            {/* Emerald Gradient Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/20 shadow-xs">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    {bn ? 'নতুন এক্সাম সেশন তৈরি করুন' : 'Create New Exam Session'}
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                      {bn ? 'স্মার্ট সেটআপ' : 'Smart Setup'}
                    </span>
                  </h2>
                  <p className="text-xs text-emerald-100/80">
                    {bn ? 'স্বয়ংক্রিয় নামকরণের সাথে শ্রেণি, বিষয় ও ছাত্র নির্বাচন করে সেশন তৈরি করুন' : 'Select classes, subjects & students with smart auto-naming to create session'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-6 space-y-6">
              {/* Step 1: Basic Information */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">১</span>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                    {bn ? 'মৌলিক তথ্য ও স্বয়ংক্রিয় নামকরণ' : 'Basic Information & Auto-Naming'}
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/30 border border-border">
                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">
                      {bn ? 'শিক্ষাবর্ষ' : 'Academic Session'} <span className="text-destructive">*</span>
                    </label>
                    <Select value={academicSessionId} onValueChange={setAcademicSessionId}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder={bn ? 'শিক্ষাবর্ষ নির্বাচন' : 'Select session'} />
                      </SelectTrigger>
                      <SelectContent>
                        {academicSessions.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {bn ? (s.name_bn || s.name) : s.name}
                            {s.is_active && (
                              <span className="text-[10px] text-emerald-600 font-bold ml-1.5 bg-emerald-50 dark:bg-emerald-950 px-1 rounded">
                                ({bn ? 'বর্তমান' : 'Active'})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 flex justify-between items-center">
                      <span>{bn ? 'পরীক্ষার ধরন' : 'Exam Type'} <span className="text-destructive">*</span></span>
                      {canAddItem && (
                        <button
                          type="button"
                          onClick={() => setQuickAddOpen(true)}
                          className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold flex items-center gap-0.5"
                        >
                          + {bn ? 'নতুন ধরন' : 'New Type'}
                        </button>
                      )}
                    </label>
                    <div className="flex gap-2">
                      <Select value={examType} onValueChange={setExamType}>
                        <SelectTrigger className="bg-background flex-1">
                          <SelectValue placeholder={bn ? 'ধরন নির্বাচন' : 'Select type'} />
                        </SelectTrigger>
                        <SelectContent>
                          {examTypes.filter((t: any) => t.is_active).map((t: any) => (
                            <SelectItem key={t.id} value={t.key}>
                              <span className="flex items-center gap-2">
                                <span>{bn ? t.name_bn : t.name}</span>
                                {t.name_ar && (
                                  <span
                                    dir="rtl"
                                    lang="ar"
                                    className="text-muted-foreground text-xs"
                                    style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}
                                  >
                                    — {t.name_ar}
                                  </span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 flex items-center justify-between">
                      <span>{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} <span className="text-destructive">*</span></span>
                      {nameBn && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-1.5 py-0.5 rounded">
                          {bn ? 'অটো-জেনারেটেড' : 'Auto-Generated'}
                        </span>
                      )}
                    </label>
                    <Input
                      value={nameBn}
                      onChange={e => setNameBn(e.target.value)}
                      placeholder={bn ? 'যেমন: বার্ষিক পরীক্ষা ২০২৬' : 'e.g. Annual Exam 2026'}
                      className="bg-background font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-foreground mb-1.5 block">
                      {bn ? 'নাম (ইংরেজি)' : 'Name (English)'}
                    </label>
                    <Input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Annual Exam 2026"
                      className="bg-background font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Division & Class Selection */}
              {academicSessionId && (
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">২</span>
                      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">
                        {bn ? 'বিভাগ ও শ্রেণি নির্বাচন' : 'Division & Class Selection'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                        onClick={selectAllClasses}
                      >
                        {bn ? '✓ সব শ্রেণি নির্বাচন' : 'Select All Classes'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs font-semibold"
                        onClick={deselectAllClasses}
                      >
                        {bn ? 'সব বাদ' : 'Deselect All'}
                      </Button>
                    </div>
                  </div>

                  {/* Division Filter Tabs */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1.5 custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => setActiveDivisionTab('all')}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                        activeDivisionTab === 'all'
                          ? 'bg-emerald-800 text-white shadow-xs'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted border border-border'
                      }`}
                    >
                      {bn ? `সকল বিভাগ (${classes.length})` : `All Divisions (${classes.length})`}
                    </button>
                    {divisions.map((d: any) => {
                      const divClassCount = classes.filter((c: any) => c.division_id === d.id).length;
                      return (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setActiveDivisionTab(d.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 ${
                            activeDivisionTab === d.id
                              ? 'bg-emerald-800 text-white shadow-xs'
                              : 'bg-muted/60 text-muted-foreground hover:bg-muted border border-border'
                          }`}
                        >
                          {bn ? d.name_bn : d.name} ({divClassCount})
                        </button>
                      );
                    })}
                  </div>

                  {/* Class Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                    {filteredClasses.map((cls: any) => {
                      const isSelected = selectedClassIds.includes(cls.id);
                      const count = (studentCounts as Record<string, number>)[cls.id] || 0;
                      const divName = cls.divisions ? (bn ? cls.divisions.name_bn : cls.divisions.name) : '';
                      return (
                        <div
                          key={cls.id}
                          onClick={() => toggleClass(cls.id)}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-500 shadow-xs'
                              : 'border-border bg-card hover:border-emerald-300 dark:hover:border-emerald-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleClass(cls.id)}
                              onClick={e => e.stopPropagation()}
                            />
                            <div className="truncate">
                              <p className="text-xs font-bold text-foreground truncate">{bn ? cls.name_bn : cls.name}</p>
                              {divName && <p className="text-[10px] text-muted-foreground truncate">{divName}</p>}
                            </div>
                          </div>
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              count > 0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <Users className="inline w-3 h-3 mr-0.5" />{count} {bn ? 'জন' : ''}
                          </span>
                        </div>
                      );
                    })}
                    {filteredClasses.length === 0 && (
                      <p className="text-xs text-muted-foreground col-span-full py-4 text-center">
                        {bn ? 'এই বিভাগে কোনো শ্রেণি নেই' : 'No classes in this division'}
                      </p>
                    )}
                  </div>

                  {/* Selected Classes Summary Bar */}
                  {selectedClassIds.length > 0 && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-xs font-semibold text-emerald-900 dark:text-emerald-200 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        <span>
                          {bn 
                            ? `মোট নির্বাচিত: ${selectedClassIds.length} টি শ্রেণি` 
                            : `Total selected: ${selectedClassIds.length} classes`}
                        </span>
                        <span>•</span>
                        <span>
                          {bn 
                            ? `মোট পরীক্ষার্থী: ${totalSelected} জন ছাত্র` 
                            : `Total candidates: ${totalSelected} students`}
                        </span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => setShowStudentSelection(true)}
                        className="text-emerald-700 dark:text-emerald-400 hover:underline text-[11px] font-bold"
                      >
                        {bn ? 'শিক্ষার্থী তালিকা যাচাই করুন →' : 'Review Students →'}
                      </button>
                    </div>
                  )}

                  {/* Step 3: Subject Selection */}
                  {selectedClassIds.length > 0 && sortedSubjects.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">৩</span>
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                            <BookMarked className="w-4 h-4 text-emerald-600" />
                            {bn ? 'বিষয় নির্বাচন' : 'Subject Selection'}
                            <span className="text-xs font-normal text-muted-foreground">
                              ({selectedSubjectIds.length}/{sortedSubjects.length} {bn ? 'নির্বাচিত' : 'selected'})
                            </span>
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => setSelectedSubjectIds(sortedSubjects.map((s: any) => s.id))}
                          >
                            {bn ? '✓ সব বিষয় নির্বাচন' : 'Select All'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-semibold"
                            onClick={() => setSelectedSubjectIds([])}
                          >
                            {bn ? 'সব বাদ' : 'Deselect All'}
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 custom-scrollbar">
                        {sortedSubjects.map((subj: any) => {
                          const isSelected = selectedSubjectIds.includes(subj.id);
                          const subjClass = subj.class_id ? classes.find((c: any) => c.id === subj.class_id) : null;
                          const subjDiv = subj.division_id ? divisions.find((d: any) => d.id === subj.division_id) : null;
                          const context = subjClass ? (bn ? subjClass.name_bn : subjClass.name) : subjDiv ? (bn ? subjDiv.name_bn : subjDiv.name) : '';
                          return (
                            <div
                              key={subj.id}
                              onClick={() => toggleSubject(subj.id)}
                              className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                                  : 'border-border bg-card hover:border-emerald-300'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleSubject(subj.id)}
                                  onClick={e => e.stopPropagation()}
                                />
                                <div className="truncate">
                                  <span className="text-xs font-bold text-foreground truncate block">
                                    {bn ? subj.name_bn : subj.name}
                                    {subj.code && <span className="text-[10px] text-muted-foreground ml-1 font-mono">({subj.code})</span>}
                                  </span>
                                  {context && <p className="text-[10px] text-muted-foreground truncate">{context}</p>}
                                </div>
                              </div>
                              {subj.is_optional && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-medium shrink-0">
                                  {bn ? 'ঐচ্ছিক' : 'Optional'}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {selectedSubjectIds.length > 0 && (
                        <div className="p-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
                          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                            {bn ? `✓ ${selectedSubjectIds.length} টি বিষয় নির্বাচিত হয়েছে` : `✓ ${selectedSubjectIds.length} subjects selected`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Step 4: Student Selection / Inclusion & Exclusion */}
                  {selectedClassIds.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-center">৪</span>
                          <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5 flex-wrap">
                            <Users className="w-4 h-4 text-emerald-600" />
                            {bn ? 'শিক্ষার্থী নির্বাচন ও অন্তর্ভুক্তি' : 'Student Selection & Inclusion'}
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                              {bn ? `${classStudents.length - excludedStudentIds.length} জন অন্তর্ভুক্ত` : `${classStudents.length - excludedStudentIds.length} included`}
                            </span>
                            {excludedStudentIds.length > 0 && (
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                {bn ? `${excludedStudentIds.length} জন বাদ` : `${excludedStudentIds.length} excluded`}
                              </span>
                            )}
                          </h4>
                        </div>

                        {/* Global Batch Action Buttons & Search */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={studentSearchQuery}
                              onChange={(e) => setStudentSearchQuery(e.target.value)}
                              placeholder={bn ? 'ছাত্র বা রোল খুঁজুন...' : 'Search student or roll...'}
                              className="h-7 pl-8 text-xs w-40 sm:w-48 bg-background"
                            />
                            {studentSearchQuery && (
                              <button 
                                onClick={() => setStudentSearchQuery('')} 
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                            onClick={() => setExcludedStudentIds([])}
                          >
                            {bn ? '✓ সব ছাত্র অন্তর্ভুক্ত' : 'Include All'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/30"
                            onClick={() => setExcludedStudentIds(classStudents.map((s: any) => s.id))}
                          >
                            {bn ? 'সব বাদ দিন' : 'Exclude All'}
                          </Button>
                        </div>
                      </div>

                      {/* Helper notice explaining click to select/unselect */}
                      <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg border border-border">
                        💡 {bn 
                          ? 'পরীক্ষায় যেসব ছাত্র অংশগ্রহণ করবে তাদের টিকচিহ্ন (✓) দিয়ে অন্তর্ভুক্ত রাখুন। কাউকে বাদ দিতে কার্ডের উপর ক্লিক করুন বা টিকচিহ্ন তুলে দিন।' 
                          : 'Students participating in the exam are checked (✓). Click any student to exclude/include them.'}
                      </p>

                      {/* Class-wise Student List */}
                      <div className="space-y-3 max-h-80 overflow-y-auto p-1.5 border border-border rounded-xl bg-muted/20 custom-scrollbar">
                        {classStudents.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-6">
                            {bn ? 'নির্বাচিত শ্রেণিগুলোতে কোনো শিক্ষার্থী লোড হয়নি বা পাওয়া যায়নি' : 'No students found for selected classes'}
                          </p>
                        ) : (
                          selectedClassIds.map(classId => {
                            const cls = classes.find((c: any) => c.id === classId);
                            let clsStudents = classStudents.filter((s: any) => s.class_id === classId);
                            if (studentSearchQuery.trim()) {
                              const q = studentSearchQuery.toLowerCase();
                              clsStudents = clsStudents.filter((s: any) =>
                                (s.name_bn && s.name_bn.toLowerCase().includes(q)) ||
                                (s.name_en && s.name_en.toLowerCase().includes(q)) ||
                                (s.roll_number && String(s.roll_number).includes(q)) ||
                                (s.student_id && s.student_id.toLowerCase().includes(q))
                              );
                            }
                            if (clsStudents.length === 0 && !studentSearchQuery.trim()) return null;

                            const totalInThisClass = classStudents.filter((s: any) => s.class_id === classId).length;
                            const excludedInClass = classStudents.filter((s: any) => s.class_id === classId && excludedStudentIds.includes(s.id)).length;
                            const includedInClass = totalInThisClass - excludedInClass;

                            const includeAllInClass = () => {
                              const classStudentIds = new Set(classStudents.filter((s: any) => s.class_id === classId).map((s: any) => s.id));
                              setExcludedStudentIds(prev => prev.filter(id => !classStudentIds.has(id)));
                            };

                            const excludeAllInClass = () => {
                              const classStudentIds = classStudents.filter((s: any) => s.class_id === classId).map((s: any) => s.id);
                              setExcludedStudentIds(prev => Array.from(new Set([...prev, ...classStudentIds])));
                            };

                            return (
                              <div key={classId} className="border border-border/70 rounded-xl overflow-hidden bg-card shadow-xs">
                                <div className="px-3.5 py-2 bg-muted/60 flex items-center justify-between border-b border-border/60 flex-wrap gap-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-foreground">
                                      {bn ? cls?.name_bn : cls?.name}
                                    </span>
                                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                      {bn ? `${includedInClass}/${totalInThisClass} জন অন্তর্ভুক্ত` : `${includedInClass}/${totalInThisClass} included`}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-xs">
                                    <button
                                      type="button"
                                      onClick={includeAllInClass}
                                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                    >
                                      {bn ? 'এই শ্রেণির সব অন্তর্ভুক্ত' : 'Include All'}
                                    </button>
                                    <span className="text-muted-foreground">|</span>
                                    <button
                                      type="button"
                                      onClick={excludeAllInClass}
                                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-destructive hover:bg-destructive/10"
                                    >
                                      {bn ? 'সব বাদ' : 'Exclude All'}
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-2.5">
                                  {clsStudents.map((st: any) => {
                                    const isExcluded = excludedStudentIds.includes(st.id);
                                    return (
                                      <div
                                        key={st.id}
                                        onClick={() => setExcludedStudentIds(prev => isExcluded ? prev.filter(id => id !== st.id) : [...prev, st.id])}
                                        className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                                          !isExcluded
                                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs'
                                            : 'border-destructive/30 bg-destructive/5 line-through opacity-60 text-muted-foreground'
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 min-w-0">
                                          <Checkbox
                                            checked={!isExcluded}
                                            onCheckedChange={() => setExcludedStudentIds(prev => isExcluded ? prev.filter(id => id !== st.id) : [...prev, st.id])}
                                            onClick={e => e.stopPropagation()}
                                          />
                                          <div className="truncate">
                                            <span className="text-xs font-semibold text-foreground truncate block">
                                              {st.roll_number && <span className="font-bold text-emerald-700 dark:text-emerald-400 mr-1.5">#{st.roll_number}</span>}
                                              {bn ? st.name_bn : (st.name_en || st.name_bn)}
                                            </span>
                                            <span className="text-[10px] font-mono text-muted-foreground">{st.student_id}</span>
                                          </div>
                                        </div>

                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                          !isExcluded 
                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' 
                                            : 'bg-destructive/10 text-destructive'
                                        }`}>
                                          {!isExcluded ? (bn ? 'অন্তর্ভুক্ত' : 'Included') : (bn ? 'বাদ' : 'Excluded')}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Action Footer */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border">
                <div className="text-xs text-muted-foreground">
                  {selectedClassIds.length > 0 ? (
                    <span className="font-medium text-foreground">
                      {bn 
                        ? `✓ প্রস্তুত: ${selectedClassIds.length} টি শ্রেণি • ${classStudents.length - excludedStudentIds.length} জন ছাত্র • ${selectedSubjectIds.length} টি বিষয়` 
                        : `Ready: ${selectedClassIds.length} classes • ${classStudents.length - excludedStudentIds.length} students • ${selectedSubjectIds.length} subjects`}
                    </span>
                  ) : (
                    <span>{bn ? 'কমপক্ষে একটি শ্রেণি নির্বাচন করুন' : 'Select at least one class to proceed'}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedClassIds([]);
                      setSelectedSubjectIds([]);
                      setExcludedStudentIds([]);
                      setName('');
                      setNameBn('');
                    }}
                    disabled={isCreating}
                    className="text-xs"
                  >
                    {bn ? 'রিসেট' : 'Reset'}
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={isCreating || !nameBn.trim() || !academicSessionId || selectedClassIds.length === 0}
                    className="px-7 py-2.5 text-sm font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-md shadow-emerald-700/20 flex items-center gap-2 transition-all"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    {bn 
                      ? `এক্সাম সেশন তৈরি করুন (${classStudents.length - excludedStudentIds.length} জন ছাত্র, ${selectedSubjectIds.length} টি বিষয়)` 
                      : `Create Exam Session (${classStudents.length - excludedStudentIds.length} students, ${selectedSubjectIds.length} subjects)`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modern Exam Sessions List matching Mockup */}
        <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="p-4 px-6 bg-muted/40 border-b border-border flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-foreground">{bn ? 'বিদ্যমান এক্সাম সেশন তালিকা' : 'Exam Sessions List'}</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-muted text-foreground font-bold">
                {filteredExamSessions.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchSessionQuery}
                  onChange={(e) => setSearchSessionQuery(e.target.value)}
                  placeholder={bn ? 'সেশন বা পরীক্ষা খুঁজুন...' : 'Search session...'}
                  className="h-8 pl-8 text-xs w-48 sm:w-56 bg-background"
                />
                {searchSessionQuery && (
                  <button 
                    onClick={() => setSearchSessionQuery('')} 
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredExamSessions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">
              {searchSessionQuery 
                ? (bn ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No matching sessions found') 
                : (bn ? 'কোনো এক্সাম সেশন নেই' : 'No exam sessions yet')}
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {filteredExamSessions.map((es: any) => {
                const esClasses = examSessionClasses.filter((c: any) => c.exam_session_id === es.id);
                const totalStudents = esClasses.reduce((s: number, c: any) => s + (c.student_count || 0), 0);
                const isExpanded = expandedSessionId === es.id;
                const depInfo = (sessionDependencyCounts as Record<string, any>)[es.id] || { resultCount: 0, paperCount: 0 };
                const hasResults = depInfo.resultCount > 0;
                const sessionYear = String(es.academic_sessions?.name || es.academic_sessions?.name_bn || '২০২৬').split('-')[0].trim();
                const typeShort = es.exam_type?.includes('1st') ? '১ম' : es.exam_type?.includes('2nd') ? '২য়' : es.exam_type?.includes('annual') ? 'বার্ষিক' : 'পরীক্ষা';

                return (
                  <div key={es.id} className="transition-colors hover:bg-muted/20">
                    {/* Session Header Card Row matching Mockup */}
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        {/* Square Year/Type Badge */}
                        <div className="w-12 h-12 rounded-xl bg-emerald-100/80 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex flex-col items-center justify-center shrink-0 shadow-xs">
                          <span className="text-[10px] font-bold uppercase leading-none">{sessionYear}</span>
                          <span className="text-xs font-bold mt-0.5 truncate max-w-[40px] text-center">{typeShort}</span>
                        </div>

                        <div className="min-w-0">
                          {editingSessionId === es.id ? (
                            <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editSessionNameBn}
                                onChange={e => setEditSessionNameBn(e.target.value)}
                                placeholder={bn ? 'বাংলা নাম' : 'Bangla name'}
                                className="h-8 w-44 text-sm bg-background"
                              />
                              <Input
                                value={editSessionName}
                                onChange={e => setEditSessionName(e.target.value)}
                                placeholder={bn ? 'ইংরেজি নাম' : 'English name'}
                                className="h-8 w-44 text-sm bg-background"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs text-success"
                                disabled={updateSessionMutation.isPending}
                                onClick={() => updateSessionMutation.mutate({ id: es.id, name: editSessionName, name_bn: editSessionNameBn })}
                              >
                                <Check className="w-4 h-4 mr-1" />
                                {bn ? 'সেভ' : 'Save'}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-xs"
                                onClick={() => setEditingSessionId(null)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-bold text-foreground leading-tight">
                                {bn ? es.name_bn : es.name}
                              </h3>
                              {es.academic_sessions?.is_active && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-xs">
                                  {bn ? 'সক্রিয়' : 'Active'}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground font-medium">
                                {bn ? `শিক্ষাবর্ষ: ${es.academic_sessions?.name_bn || es.academic_sessions?.name || '-'}` : `Session: ${es.academic_sessions?.name || '-'}`}
                              </span>
                            </div>
                          )}

                          {/* Metadata badges matching Mockup */}
                          <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                              📚 {esClasses.length} {bn ? 'টি শ্রেণি' : 'classes'}
                            </span>
                            <span className="inline-flex items-center gap-1 font-semibold text-foreground bg-muted px-2 py-0.5 rounded">
                              👥 {totalStudents} {bn ? 'জন ছাত্র' : 'students'}
                            </span>
                            {hasResults ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                ✓ {bn ? 'ফলাফল প্রস্তুত' : 'Result Ready'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                • {bn ? 'অপেক্ষমান' : 'Pending'}
                              </span>
                            )}
                            <button
                              onClick={() => setExpandedSessionId(isExpanded ? null : es.id)}
                              className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5 ml-1 font-medium"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                  {bn ? 'শ্রেণি তালিকা লুকান' : 'Hide Classes'}
                                </>
                              ) : (
                                <>
                                  <ChevronRight className="w-3.5 h-3.5" />
                                  {bn ? 'শ্রেণি তালিকা দেখুন' : 'View Classes'}
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons matching Mockup */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <Button
                          size="sm"
                          className="h-8 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs flex items-center gap-1.5 transition-all"
                          onClick={() => navigate(`/admin/results?year=${es.academic_session_id}&session=${es.id}`)}
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          {bn ? 'ফলাফল তৈরি' : 'Create Result'}
                        </Button>

                        {canEditItem && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-semibold rounded-lg bg-background border-border hover:bg-muted text-foreground flex items-center gap-1.5 transition-all"
                            onClick={() => setManageSession(es)}
                          >
                            <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {bn ? 'ক্লাস/বিষয়/ছাত্র' : 'Classes/Subjects/Students'}
                          </Button>
                        )}

                        {canEditItem && editingSessionId !== es.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                            title={bn ? 'সম্পাদনা' : 'Edit'}
                            onClick={() => {
                              setEditingSessionId(es.id);
                              setEditSessionName(es.name || '');
                              setEditSessionNameBn(es.name_bn || '');
                            }}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}

                        {canDeleteItem && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                            title={bn ? 'মুছুন' : 'Delete'}
                            onClick={() => deleteMutation.mutate(es.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Expanded: Class-wise Result List */}
                    {isExpanded && esClasses.length > 0 && (
                      <div className="border-t border-border bg-muted/20">
                        <div className="hidden sm:block px-4 py-2 bg-muted/40 border-b border-border">
                          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground">
                            <div className="col-span-1">#</div>
                            <div className="col-span-4">{bn ? 'শ্রেণী' : 'Class'}</div>
                            <div className="col-span-2 text-center">{bn ? 'ছাত্র' : 'Students'}</div>
                            <div className="col-span-2 text-center">{bn ? 'ফলাফল' : 'Result'}</div>
                            <div className="col-span-3 text-right">{bn ? 'অ্যাকশন' : 'Action'}</div>
                          </div>
                        </div>
                        {esClasses.map((ec: any, idx: number) => {
                          const depInfo = (sessionDependencyCounts as Record<string, any>)[es.id] || { resultCount: 0, paperCount: 0 };
                          const hasResults = depInfo.resultCount > 0;

                          return (
                            <div key={ec.id} className="border-b border-border/50 last:border-b-0 hover:bg-secondary/20 transition-colors">
                              {/* Desktop grid */}
                              <div className="hidden sm:grid grid-cols-12 gap-2 items-center px-4 py-2.5 text-sm">
                                <div className="col-span-1 text-xs text-muted-foreground">{idx + 1}</div>
                                <div className="col-span-4 font-medium text-foreground">{bn ? ec.classes?.name_bn : ec.classes?.name}</div>
                                <div className="col-span-2 text-center text-muted-foreground">{ec.student_count || 0}</div>
                                <div className="col-span-2 text-center">
                                  {hasResults ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                                      <Check className="w-3 h-3" />
                                      {bn ? 'সংরক্ষিত' : 'Saved'}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                      {bn ? 'অপেক্ষমান' : 'Pending'}
                                    </span>
                                  )}
                                </div>
                                <div className="col-span-3 text-right">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => navigate(`/admin/results?year=${es.academic_session_id}&session=${es.id}&class=${ec.class_id || ec.classes?.id}`)}
                                  >
                                    {hasResults ? <Eye className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
                                    {hasResults ? (bn ? 'দেখুন' : 'View') : (bn ? 'এন্ট্রি' : 'Entry')}
                                  </Button>
                                </div>
                              </div>
                              {/* Mobile card */}
                              <div className="sm:hidden flex items-center justify-between gap-2 px-4 py-2.5 text-sm">
                                <div className="min-w-0">
                                  <div className="font-medium text-foreground truncate">
                                    <span className="text-xs text-muted-foreground mr-1">{idx + 1}.</span>
                                    {bn ? ec.classes?.name_bn : ec.classes?.name}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground">{ec.student_count || 0} {bn ? 'ছাত্র' : 'students'}</span>
                                    {hasResults ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                                        <Check className="w-2.5 h-2.5" />
                                        {bn ? 'সংরক্ষিত' : 'Saved'}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                                        {bn ? 'অপেক্ষমান' : 'Pending'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 text-xs shrink-0"
                                  onClick={() => navigate(`/admin/results?year=${es.academic_session_id}&session=${es.id}&class=${ec.class_id || ec.classes?.id}`)}
                                >
                                  {hasResults ? <Eye className="w-3.5 h-3.5" /> : <GraduationCap className="w-3.5 h-3.5" />}
                                  {hasResults ? (bn ? 'দেখুন' : 'View') : (bn ? 'এন্ট্রি' : 'Entry')}
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ManageExamSessionDialog
        open={!!manageSession}
        onOpenChange={(v) => { if (!v) setManageSession(null); }}
        examSession={manageSession}
      />

      {/* Quick Add Exam Type Dialog */}

      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{bn ? 'নতুন পরীক্ষার ধরন যোগ' : 'Add New Exam Type'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</label>
              <Input
                value={quickTypeNameBn}
                onChange={e => setQuickTypeNameBn(e.target.value)}
                placeholder={bn ? 'যেমন: নির্বাচনী পরীক্ষা' : 'e.g. নির্বাচনী পরীক্ষা'}
                className="bg-background"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</label>
              <Input
                value={quickTypeName}
                onChange={e => setQuickTypeName(e.target.value)}
                placeholder="e.g. Selective Exam"
                className="bg-background"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'নাম (আরবি)' : 'Name (Arabic)'}</label>
              <Input
                value={quickTypeNameAr}
                onChange={e => setQuickTypeNameAr(e.target.value)}
                placeholder="الاسم بالعربية"
                className="bg-background text-right"
                dir="rtl"
                lang="ar"
                style={{ fontFamily: '"Traditional Arabic", "Amiri", "Noto Naskh Arabic", serif' }}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">{bn ? 'কী (ইংরেজি, ইউনিক)' : 'Key (English, unique)'} *</label>
              <Input
                value={quickTypeKey}
                onChange={e => setQuickTypeKey(e.target.value)}
                placeholder="e.g. selective"
                className="bg-background"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {bn ? 'সিস্টেম-ইন্টারনাল পরিচায়ক — যেমন: annual, half_yearly' : 'System identifier — e.g. annual, half_yearly'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickAddOpen(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
            <Button className="btn-primary-gradient" onClick={handleQuickAddType} disabled={quickAdding}>
              {quickAdding && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {bn ? 'যোগ করুন' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminExamSessions;
