import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Users, BookMarked, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useConfirm } from '@/contexts/ConfirmContext';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  examSession: any | null;
}

const ManageExamSessionDialog = ({ open, onOpenChange, examSession }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const sessionId = examSession?.id as string | undefined;
  const academicSessionId = examSession?.academic_session_id as string | undefined;

  const [classIds, setClassIds] = useState<string[]>([]);
  const [subjectIds, setSubjectIds] = useState<string[]>([]);
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes_with_divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('classes').select('*, divisions(name, name_bn)').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data || [];
    },
  });

  // Existing mappings
  const { data: existing, isLoading } = useQuery({
    queryKey: ['exam_session_detail', sessionId],
    enabled: !!sessionId && open,
    queryFn: async () => {
      const [c, s, st] = await Promise.all([
        supabase.from('exam_session_classes').select('id, class_id').eq('exam_session_id', sessionId!),
        supabase.from('exam_session_subjects').select('id, subject_id').eq('exam_session_id', sessionId!),
        supabase.from('exam_session_students').select('id, student_id').eq('exam_session_id', sessionId!),
      ]);
      if (c.error) throw c.error;
      if (s.error) throw s.error;
      if (st.error) throw st.error;
      return {
        classIds: (c.data || []).map((r: any) => r.class_id).filter(Boolean),
        subjectIds: (s.data || []).map((r: any) => r.subject_id),
        studentIds: (st.data || []).map((r: any) => r.student_id),
      };
    },
  });

  useEffect(() => {
    if (existing) {
      setClassIds(existing.classIds);
      setSubjectIds(existing.subjectIds);
      setStudentIds(existing.studentIds);
    }
  }, [existing]);

  // Subjects available for currently selected classes
  const { data: subjects = [] } = useQuery({
    queryKey: ['manage_session_subjects', classIds.join(',')],
    enabled: open && classIds.length > 0,
    queryFn: async () => {
      const divIds = [...new Set(classIds.map(cid => (classes as any[]).find((c: any) => c.id === cid)?.division_id).filter(Boolean))] as string[];
      let query = supabase.from('subjects').select('*').eq('is_active', true);
      const orParts: string[] = [];
      divIds.forEach(d => orParts.push(`division_id.eq.${d}`));
      classIds.forEach(c => orParts.push(`class_id.eq.${c}`));
      if (orParts.length > 0) query = query.or(orParts.join(','));
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const { data: students = [] } = useQuery({
    queryKey: ['manage_session_students', academicSessionId, classIds.join(',')],
    enabled: open && !!academicSessionId && classIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('students')
        .select('id, name_bn, name_en, roll_number, class_id')
        .eq('status', 'active')
        .eq('session_id', academicSessionId!)
        .in('class_id', classIds)
        .order('roll_number');
      if (error) throw error;
      return data || [];
    },
  });

  // Auto-include newly added classes' students & subjects by default
  useEffect(() => {
    if (!existing) return;
    const newClasses = classIds.filter(id => !existing.classIds.includes(id));
    if (newClasses.length === 0) return;
    const newStudents = (students as any[]).filter((s: any) => newClasses.includes(s.class_id)).map((s: any) => s.id);
    if (newStudents.length) setStudentIds(prev => [...new Set([...prev, ...newStudents])]);
    const newSubjects = (subjects as any[]).filter((s: any) => !s.class_id || newClasses.includes(s.class_id)).map((s: any) => s.id);
    if (newSubjects.length) setSubjectIds(prev => [...new Set([...prev, ...newSubjects])]);
  }, [students, subjects]);

  const sortedClasses = useMemo(() => [...(classes as any[])].sort((a: any, b: any) => {
    const dA = (divisions as any[]).findIndex((d: any) => d.id === a.division_id);
    const dB = (divisions as any[]).findIndex((d: any) => d.id === b.division_id);
    if (dA !== dB) return dA - dB;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  }), [classes, divisions]);

  const sortedSubjects = useMemo(() => [...(subjects as any[])].sort((a: any, b: any) => {
    const cA = (classes as any[]).find((c: any) => c.id === a.class_id)?.sort_order ?? 999;
    const cB = (classes as any[]).find((c: any) => c.id === b.class_id)?.sort_order ?? 999;
    if (cA !== cB) return cA - cB;
    return (a.name_bn || '').localeCompare(b.name_bn || '');
  }), [subjects, classes]);

  const toggle = (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) =>
    setter(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSave = async () => {
    if (!sessionId || !existing) return;
    if (classIds.length === 0) {
      toast.error(bn ? 'অন্তত একটি ক্লাস রাখতে হবে' : 'Keep at least one class');
      return;
    }
    const removedClasses = existing.classIds.filter((id: string) => !classIds.includes(id));
    if (removedClasses.length > 0) {
      const ok = await confirm({
        title: bn ? 'ক্লাস বাদ দেবেন?' : 'Remove classes?',
        description: bn
          ? `${removedClasses.length} টি ক্লাস এই পরীক্ষা থেকে বাদ যাবে। ঐ ক্লাসের ছাত্র ও বিষয় ম্যাপিংও মুছে যাবে (আগের ফলাফল থাকলে তা অপরিবর্তিত থাকবে)।`
          : `${removedClasses.length} class(es) will be removed along with their student/subject mappings.`,
        variant: 'warning',
        confirmText: bn ? 'হ্যাঁ, সংরক্ষণ করুন' : 'Yes, save',
        cancelText: bn ? 'বাতিল' : 'Cancel',
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      // Classes
      if (removedClasses.length) {
        const { error } = await supabase.from('exam_session_classes').delete().eq('exam_session_id', sessionId).in('class_id', removedClasses);
        if (error) throw error;
      }
      const addedClasses = classIds.filter(id => !existing.classIds.includes(id));
      if (addedClasses.length) {
        const rows = addedClasses.map(cid => ({
          exam_session_id: sessionId,
          class_id: cid,
          student_count: (students as any[]).filter((s: any) => s.class_id === cid).length,
        }));
        const { error } = await supabase.from('exam_session_classes').insert(rows);
        if (error) throw error;
      }

      // Students (limited to kept classes)
      const validStudentIds = studentIds.filter(id => {
        const st = (students as any[]).find((s: any) => s.id === id);
        return st && classIds.includes(st.class_id);
      });
      const removedStudents = existing.studentIds.filter((id: string) => !validStudentIds.includes(id));
      if (removedStudents.length) {
        const { error } = await supabase.from('exam_session_students').delete().eq('exam_session_id', sessionId).in('student_id', removedStudents);
        if (error) throw error;
      }
      const addedStudents = validStudentIds.filter(id => !existing.studentIds.includes(id));
      if (addedStudents.length) {
        const rows = addedStudents.map(id => ({
          exam_session_id: sessionId,
          student_id: id,
          class_id: (students as any[]).find((s: any) => s.id === id)?.class_id,
        }));
        const { error } = await supabase.from('exam_session_students').insert(rows);
        if (error) throw error;
      }

      // Subjects
      const validSubjectIds = subjectIds.filter(id => {
        const sub = (subjects as any[]).find((s: any) => s.id === id);
        return sub && (!sub.class_id || classIds.includes(sub.class_id));
      });
      const removedSubjects = existing.subjectIds.filter((id: string) => !validSubjectIds.includes(id));
      if (removedSubjects.length) {
        const { error } = await supabase.from('exam_session_subjects').delete().eq('exam_session_id', sessionId).in('subject_id', removedSubjects);
        if (error) throw error;
      }
      const addedSubjects = validSubjectIds.filter(id => !existing.subjectIds.includes(id));
      if (addedSubjects.length) {
        const rows = addedSubjects.map(id => ({
          exam_session_id: sessionId,
          subject_id: id,
          class_id: (subjects as any[]).find((s: any) => s.id === id)?.class_id || null,
        }));
        const { error } = await supabase.from('exam_session_subjects').insert(rows);
        if (error) throw error;
      }

      // Refresh student counts for kept classes
      for (const cid of classIds) {
        const count = validStudentIds.filter(id => (students as any[]).find((s: any) => s.id === id)?.class_id === cid).length;
        await supabase.from('exam_session_classes').update({ student_count: count }).eq('exam_session_id', sessionId).eq('class_id', cid);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['exam_sessions_list'] }),
        queryClient.invalidateQueries({ queryKey: ['exam_session_classes_all'] }),
        queryClient.invalidateQueries({ queryKey: ['exam_session_detail', sessionId] }),
      ]);
      toast.success(bn ? 'এক্সাম সেশন আপডেট হয়েছে' : 'Exam session updated');
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {bn ? 'এক্সাম সেশন সম্পাদনা' : 'Manage Exam Session'}
            {examSession && <span className="block text-sm font-normal text-muted-foreground mt-0.5">{bn ? examSession.name_bn : examSession.name}</span>}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <Tabs defaultValue="classes" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="classes" className="gap-1.5"><GraduationCap className="w-4 h-4" />{bn ? 'ক্লাস' : 'Classes'}</TabsTrigger>
              <TabsTrigger value="subjects" className="gap-1.5"><BookMarked className="w-4 h-4" />{bn ? 'বিষয়' : 'Subjects'}</TabsTrigger>
              <TabsTrigger value="students" className="gap-1.5"><Users className="w-4 h-4" />{bn ? 'ছাত্র' : 'Students'}</TabsTrigger>
            </TabsList>

            <TabsContent value="classes" className="mt-3">
              <p className="text-xs text-muted-foreground mb-2">{bn ? 'টিক দিয়ে ক্লাস যোগ করুন, টিক তুলে বাদ দিন।' : 'Check to add, uncheck to remove.'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sortedClasses.map((cls: any) => (
                  <label key={cls.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${classIds.includes(cls.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                    <Checkbox checked={classIds.includes(cls.id)} onCheckedChange={() => toggle(setClassIds, cls.id)} />
                    <span className="text-sm font-medium text-foreground flex-1">{bn ? cls.name_bn : cls.name}</span>
                    {cls.divisions && <span className="text-xs text-muted-foreground">{bn ? cls.divisions.name_bn : cls.divisions.name}</span>}
                  </label>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="subjects" className="mt-3">
              <div className="flex justify-end gap-2 mb-2">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSubjectIds(sortedSubjects.map((s: any) => s.id))}>{bn ? 'সব নির্বাচন' : 'Select All'}</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSubjectIds([])}>{bn ? 'সব বাদ' : 'Deselect All'}</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sortedSubjects.map((subj: any) => {
                  const cls = (classes as any[]).find((c: any) => c.id === subj.class_id);
                  return (
                    <label key={subj.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${subjectIds.includes(subj.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
                      <Checkbox checked={subjectIds.includes(subj.id)} onCheckedChange={() => toggle(setSubjectIds, subj.id)} />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-foreground">{bn ? subj.name_bn : subj.name}</span>
                        {cls && <p className="text-xs text-muted-foreground">{bn ? cls.name_bn : cls.name}</p>}
                      </div>
                    </label>
                  );
                })}
                {sortedSubjects.length === 0 && <p className="text-sm text-muted-foreground col-span-full py-4 text-center">{bn ? 'কোনো বিষয় নেই' : 'No subjects'}</p>}
              </div>
            </TabsContent>

            <TabsContent value="students" className="mt-3 space-y-3">
              {classIds.map(cid => {
                const cls = (classes as any[]).find((c: any) => c.id === cid);
                const list = (students as any[]).filter((s: any) => s.class_id === cid);
                if (list.length === 0) return null;
                const included = list.filter((s: any) => studentIds.includes(s.id)).length;
                return (
                  <div key={cid} className="border border-border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-secondary/50 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{bn ? cls?.name_bn : cls?.name} <span className="text-xs text-muted-foreground">({included}/{list.length})</span></span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setStudentIds(prev => [...new Set([...prev, ...list.map((s: any) => s.id)])])}>{bn ? 'সব রাখুন' : 'All'}</Button>
                        <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={() => setStudentIds(prev => prev.filter(id => !list.some((s: any) => s.id === id)))}>{bn ? 'সব বাদ' : 'None'}</Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 p-2">
                      {list.map((st: any) => (
                        <label key={st.id} className={`flex items-center gap-2 p-2 rounded-md cursor-pointer text-sm border ${studentIds.includes(st.id) ? 'border-border' : 'border-destructive/20 bg-destructive/5 line-through opacity-60'}`}>
                          <Checkbox checked={studentIds.includes(st.id)} onCheckedChange={() => toggle(setStudentIds, st.id)} />
                          <span className="truncate">
                            {st.roll_number && <span className="text-xs text-muted-foreground mr-1">{st.roll_number}</span>}
                            {bn ? st.name_bn : (st.name_en || st.name_bn)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {classIds.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{bn ? 'আগে ক্লাস নির্বাচন করুন' : 'Select classes first'}</p>}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{bn ? 'বাতিল' : 'Cancel'}</Button>
          <Button className="btn-primary-gradient" onClick={handleSave} disabled={saving || isLoading}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {bn ? 'সংরক্ষণ করুন' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ManageExamSessionDialog;
