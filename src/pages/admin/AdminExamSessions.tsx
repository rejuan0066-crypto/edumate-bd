import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Users, BookOpen, Edit2, Check, X, Settings2, BookMarked, UserMinus, GraduationCap, ChevronDown, ChevronRight, Eye, FileSpreadsheet, AlertTriangle } from 'lucide-react';
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
  const [selectedDivisionIds, setSelectedDivisionIds] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [excludedStudentIds, setExcludedStudentIds] = useState<string[]>([]);
  const [showStudentSelection, setShowStudentSelection] = useState(false);
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

  const filteredClasses = (selectedDivisionIds.length > 0
    ? classes.filter((c: any) => selectedDivisionIds.includes(c.division_id))
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
    setShowStudentSelection(false);
  }, [selectedClassIds.join(',')]);

  const { data: examSessions = [] } = useQuery({
    queryKey: ['exam_sessions_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_sessions').select('*, academic_sessions(name, name_bn)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
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
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground">
            <BookOpen className="inline w-6 h-6 mr-2" />
            {bn ? 'এক্সাম সেশন ব্যবস্থাপনা' : 'Exam Session Management'}
          </h1>
          <Button variant="outline" size="sm" onClick={() => setShowTypeManager(!showTypeManager)} className="gap-1.5">
            <Settings2 className="w-4 h-4" />
            {bn ? 'পরীক্ষার ধরন' : 'Exam Types'}
          </Button>
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

        {/* Create Form */}
        {canAddItem && (
          <div className="card-elevated p-5 space-y-4">
            <h3 className="font-display font-bold text-foreground">
              <Plus className="inline w-4 h-4 mr-1" />
              {bn ? 'নতুন এক্সাম সেশন তৈরি' : 'Create New Exam Session'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">{bn ? 'শিক্ষাবর্ষ' : 'Academic Session'} *</label>
                <Select value={academicSessionId} onValueChange={setAcademicSessionId}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder={bn ? 'শিক্ষাবর্ষ নির্বাচন' : 'Select session'} /></SelectTrigger>
                  <SelectContent>
                    {academicSessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{bn ? (s.name_bn || s.name) : s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">{bn ? 'পরীক্ষার ধরন' : 'Exam Type'} *</label>
                <div className="flex gap-2">
                  <Select value={examType} onValueChange={setExamType}>
                    <SelectTrigger className="bg-background flex-1"><SelectValue placeholder={bn ? 'ধরন নির্বাচন' : 'Select type'} /></SelectTrigger>
                    <SelectContent>
                      {examTypes.filter((t: any) => t.is_active).map((t: any) => (
                        <SelectItem key={t.id} value={t.key}>
                          <span className="flex items-center gap-2">
                            <span>{bn ? t.name_bn : t.name}</span>
                            {t.name_ar && (
                              <span
                                dir="rtl"
                                lang="ar"
                                className="text-muted-foreground text-sm"
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
                  {canAddItem && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuickAddOpen(true)}
                      title={bn ? 'নতুন ধরন যোগ' : 'Add new type'}
                      className="shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">{bn ? 'নাম (বাংলা)' : 'Name (Bangla)'} *</label>
                <Input value={nameBn} onChange={e => setNameBn(e.target.value)} placeholder={bn ? 'যেমন: বার্ষিক পরীক্ষা ২০২৬' : 'e.g. Annual Exam 2026'} className="bg-background" />
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">{bn ? 'নাম (ইংরেজি)' : 'Name (English)'}</label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={bn ? 'যেমন: Annual Exam 2026' : 'e.g. Annual Exam 2026'} className="bg-background" />
              </div>
            </div>

            {/* Class Selection */}
            {academicSessionId && (
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">{bn ? 'বিভাগ নির্বাচন করুন' : 'Select Division'}</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedDivisionIds.length === 0 ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <Checkbox checked={selectedDivisionIds.length === 0} onCheckedChange={() => { setSelectedDivisionIds([]); setSelectedClassIds([]); }} />
                    <span className="text-sm font-medium text-foreground">{bn ? 'সকল বিভাগ' : 'All Divisions'}</span>
                  </label>
                  {divisions.map((d: any) => (
                    <label key={d.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedDivisionIds.includes(d.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                      <Checkbox checked={selectedDivisionIds.includes(d.id)} onCheckedChange={() => {
                        setSelectedDivisionIds(prev => prev.includes(d.id) ? prev.filter(id => id !== d.id) : [...prev, d.id]);
                        setSelectedClassIds([]);
                      }} />
                      <span className="text-sm font-medium text-foreground">{bn ? d.name_bn : d.name}</span>
                    </label>
                  ))}
                </div>

                <label className="text-sm font-medium text-muted-foreground mb-2 block mt-3">{bn ? 'ক্লাস নির্বাচন করুন' : 'Select Classes'} *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredClasses.map((cls: any) => {
                    const count = (studentCounts as Record<string, number>)[cls.id] || 0;
                    const divName = cls.divisions ? (bn ? cls.divisions.name_bn : cls.divisions.name) : '';
                    return (
                      <label key={cls.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedClassIds.includes(cls.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                        <Checkbox checked={selectedClassIds.includes(cls.id)} onCheckedChange={() => toggleClass(cls.id)} />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">{bn ? cls.name_bn : cls.name}</span>
                          {divName && <span className="text-xs text-muted-foreground ml-1">({divName})</span>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${count > 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          <Users className="inline w-3 h-3 mr-0.5" />{count}
                        </span>
                      </label>
                    );
                  })}
                  {filteredClasses.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-full py-4 text-center">{bn ? 'এই বিভাগে কোনো ক্লাস নেই' : 'No classes in this division'}</p>
                  )}
                </div>

                {selectedClassIds.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium text-primary">
                      {bn ? `মোট নির্বাচিত: ${selectedClassIds.length} টি ক্লাস — ${totalSelected} জন ছাত্র` : `Total selected: ${selectedClassIds.length} classes — ${totalSelected} students`}
                    </p>
                  </div>
                )}

                {/* Subject Selection */}
                {selectedClassIds.length > 0 && sortedSubjects.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <BookMarked className="w-4 h-4" />
                        {bn ? 'বিষয় নির্বাচন করুন' : 'Select Subjects'}
                      </label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedSubjectIds(sortedSubjects.map((s: any) => s.id))}>
                          {bn ? 'সব নির্বাচন' : 'Select All'}
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelectedSubjectIds([])}>
                          {bn ? 'সব বাদ' : 'Deselect All'}
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {sortedSubjects.map((subj: any) => {
                        const subjClass = subj.class_id ? classes.find((c: any) => c.id === subj.class_id) : null;
                        const subjDiv = subj.division_id ? divisions.find((d: any) => d.id === subj.division_id) : null;
                        const context = subjClass ? (bn ? subjClass.name_bn : subjClass.name) : subjDiv ? (bn ? subjDiv.name_bn : subjDiv.name) : '';
                        return (
                          <label key={subj.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedSubjectIds.includes(subj.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                            <Checkbox checked={selectedSubjectIds.includes(subj.id)} onCheckedChange={() => toggleSubject(subj.id)} />
                            <div className="flex-1">
                              <span className="text-sm font-medium text-foreground">{bn ? subj.name_bn : subj.name}</span>
                              {subj.code && <span className="text-xs text-muted-foreground ml-1.5">({subj.code})</span>}
                              {context && <p className="text-xs text-muted-foreground">{context}</p>}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {selectedSubjectIds.length > 0 && (
                      <div className="mt-2 p-2 rounded-lg bg-accent/50 border border-accent">
                        <p className="text-xs font-medium text-foreground">
                          {bn ? `${selectedSubjectIds.length} টি বিষয় নির্বাচিত` : `${selectedSubjectIds.length} subjects selected`}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Student Exclusion */}
                {selectedClassIds.length > 0 && classStudents.length > 0 && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                        <UserMinus className="w-4 h-4" />
                        {bn ? 'ছাত্র নির্বাচন / বাদ দিন' : 'Select / Exclude Students'}
                        {excludedStudentIds.length > 0 && (
                          <span className="text-xs text-destructive ml-1">({bn ? `${excludedStudentIds.length} জন বাদ` : `${excludedStudentIds.length} excluded`})</span>
                        )}
                      </label>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowStudentSelection(!showStudentSelection)}>
                          {showStudentSelection ? (bn ? 'লুকান' : 'Hide') : (bn ? 'দেখান' : 'Show')}
                        </Button>
                        {showStudentSelection && (
                          <>
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setExcludedStudentIds([])}>
                              {bn ? 'সব রাখুন' : 'Include All'}
                            </Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive" onClick={() => setExcludedStudentIds(classStudents.map((s: any) => s.id))}>
                              {bn ? 'সব বাদ' : 'Exclude All'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    {showStudentSelection && (
                      <div className="space-y-3">
                        {selectedClassIds.map(classId => {
                          const cls = classes.find((c: any) => c.id === classId);
                          const clsStudents = classStudents.filter((s: any) => s.class_id === classId);
                          if (clsStudents.length === 0) return null;
                          const excludedInClass = clsStudents.filter((s: any) => excludedStudentIds.includes(s.id)).length;
                          return (
                            <div key={classId} className="border border-border rounded-lg overflow-hidden">
                              <div className="px-3 py-2 bg-secondary/50 flex items-center justify-between">
                                <span className="text-sm font-medium text-foreground">
                                  {bn ? cls?.name_bn : cls?.name}
                                  <span className="text-xs text-muted-foreground ml-2">({clsStudents.length - excludedInClass}/{clsStudents.length})</span>
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1 p-2">
                                {clsStudents.map((st: any) => {
                                  const isExcluded = excludedStudentIds.includes(st.id);
                                  return (
                                    <label key={st.id} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors text-sm ${isExcluded ? 'bg-destructive/5 border border-destructive/20 line-through opacity-60' : 'border border-border hover:border-primary/50'}`}>
                                      <Checkbox checked={!isExcluded} onCheckedChange={() => setExcludedStudentIds(prev => isExcluded ? prev.filter(id => id !== st.id) : [...prev, st.id])} />
                                      <span className="flex-1 truncate">
                                        {st.roll_number && <span className="font-medium mr-1">{st.roll_number}.</span>}
                                        {bn ? st.name_bn : (st.name_en || st.name_bn)}
                                      </span>
                                      <span className="text-xs text-muted-foreground">{st.student_id}</span>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-xs font-medium text-primary">
                        {bn ? `মোট: ${classStudents.length} জন — অন্তর্ভুক্ত: ${classStudents.length - excludedStudentIds.length} জন — বাদ: ${excludedStudentIds.length} জন` : `Total: ${classStudents.length} — Included: ${classStudents.length - excludedStudentIds.length} — Excluded: ${excludedStudentIds.length}`}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button onClick={handleCreate} disabled={isCreating} className="btn-primary-gradient">
              {isCreating && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {bn ? 'এক্সাম সেশন তৈরি করুন' : 'Create Exam Session'}
            </Button>
          </div>
        )}

        {/* Existing Exam Sessions List */}
        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4">{bn ? 'এক্সাম সেশন তালিকা' : 'Exam Sessions List'}</h3>
          {examSessions.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">{bn ? 'কোনো এক্সাম সেশন নেই' : 'No exam sessions yet'}</p>
          ) : (
            <div className="space-y-2">
              {examSessions.map((es: any) => {
                const esClasses = examSessionClasses.filter((c: any) => c.exam_session_id === es.id);
                const totalStudents = esClasses.reduce((s: number, c: any) => s + (c.student_count || 0), 0);
                const isExpanded = expandedSessionId === es.id;

                return (
                  <div key={es.id} className="border border-border rounded-lg overflow-hidden">
                    {/* Session Header Row */}
                    <div
                      className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-4 py-3 bg-background hover:bg-secondary/30 cursor-pointer transition-colors"
                      onClick={() => setExpandedSessionId(isExpanded ? null : es.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <button className="p-0.5 text-muted-foreground shrink-0">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <div className="min-w-0">
                          {editingSessionId === es.id ? (
                            <div className="flex flex-wrap items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <Input value={editSessionNameBn} onChange={e => setEditSessionNameBn(e.target.value)} placeholder={bn ? 'বাংলা নাম' : 'Bangla name'} className="h-7 w-40 text-sm bg-background" />
                              <Input value={editSessionName} onChange={e => setEditSessionName(e.target.value)} placeholder={bn ? 'ইংরেজি নাম' : 'English name'} className="h-7 w-40 text-sm bg-background" />
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-success" disabled={updateSessionMutation.isPending} onClick={() => updateSessionMutation.mutate({ id: es.id, name: editSessionName, name_bn: editSessionNameBn })}>
                                <Check className="w-3.5 h-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingSessionId(null)}>
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="font-medium text-foreground text-sm truncate">{bn ? es.name_bn : es.name}</div>
                          )}
                          <div className="text-xs text-muted-foreground truncate">
                            {bn ? (es.academic_sessions?.name_bn || es.academic_sessions?.name) : es.academic_sessions?.name || '-'}
                          </div>
                        </div>

                      </div>
                      <div className="flex items-center gap-2 flex-wrap pl-7 sm:pl-0 sm:ml-auto">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary whitespace-nowrap">{getTypeLabel(es.exam_type)}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {esClasses.length} {bn ? 'ক্লাস' : 'classes'} • {totalStudents} {bn ? 'ছাত্র' : 'students'}
                        </span>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => navigate(`/admin/results?year=${es.academic_session_id}&session=${es.id}`)}>
                            <GraduationCap className="w-3.5 h-3.5" />
                            {bn ? 'ফলাফল তৈরি' : 'Create Result'}
                          </Button>
                          {canEditItem && (
                            <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setManageSession(es)}>
                              <Settings2 className="w-3.5 h-3.5" />
                              {bn ? 'ক্লাস/বিষয়/ছাত্র' : 'Classes/Subjects/Students'}
                            </Button>
                          )}
                          {canEditItem && editingSessionId !== es.id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingSessionId(es.id); setEditSessionName(es.name || ''); setEditSessionNameBn(es.name_bn || ''); }}>
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          )}


                          {canDeleteItem && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(es.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
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
