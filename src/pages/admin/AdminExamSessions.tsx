import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { Plus, Loader2, Trash2, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePagePermissions } from '@/hooks/usePagePermissions';

const AdminExamSessions = () => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const queryClient = useQueryClient();
  const { canAddItem, canDeleteItem } = usePagePermissions('/admin/exam-sessions');

  const [name, setName] = useState('');
  const [nameBn, setNameBn] = useState('');
  const [academicSessionId, setAcademicSessionId] = useState('');
  const [examType, setExamType] = useState('annual');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);

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

  // Filter classes by selected division
  const filteredClasses = selectedDivisionId
    ? classes.filter((c: any) => c.division_id === selectedDivisionId)
    : classes;

  // Count students per class for selected academic session
  const { data: studentCounts = {} } = useQuery({
    queryKey: ['student_counts_by_class', academicSessionId],
    queryFn: async () => {
      if (!academicSessionId) return {};
      const { data, error } = await supabase.from('students').select('id, class_id').eq('status', 'active').eq('session_id', academicSessionId);
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((s: any) => {
        if (s.class_id) counts[s.class_id] = (counts[s.class_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!academicSessionId,
  });

  // Fetch existing exam sessions
  const { data: examSessions = [] } = useQuery({
    queryKey: ['exam_sessions_list'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_sessions').select('*, academic_sessions(name)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch exam session classes for display
  const { data: examSessionClasses = [] } = useQuery({
    queryKey: ['exam_session_classes_all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('exam_session_classes').select('*, classes(name, name_bn)');
      if (error) throw error;
      return data;
    },
  });

  const toggleClass = (classId: string) => {
    setSelectedClassIds(prev =>
      prev.includes(classId) ? prev.filter(id => id !== classId) : [...prev, classId]
    );
  };

  const handleCreate = async () => {
    if (!nameBn.trim() || !academicSessionId || selectedClassIds.length === 0) {
      toast.error(bn ? 'নাম, শিক্ষাবর্ষ ও ক্লাস নির্বাচন করুন' : 'Enter name, select session & classes');
      return;
    }

    setIsCreating(true);
    try {
      // Create exam session
      const { data: examSession, error: esError } = await supabase.from('exam_sessions').insert({
        name: name.trim() || nameBn.trim(),
        name_bn: nameBn.trim(),
        academic_session_id: academicSessionId,
        exam_type: examType,
      }).select().single();

      if (esError) throw esError;

      // Create class mappings
      const classMappings = selectedClassIds.map(classId => ({
        exam_session_id: examSession.id,
        class_id: classId,
        student_count: (studentCounts as Record<string, number>)[classId] || 0,
      }));

      const { error: classError } = await supabase.from('exam_session_classes').insert(classMappings);
      if (classError) throw classError;

      // Auto-select students for each class
      const { data: students, error: studError } = await supabase.from('students')
        .select('id, class_id')
        .eq('status', 'active')
        .eq('session_id', academicSessionId)
        .in('class_id', selectedClassIds);

      if (studError) throw studError;

      if (students && students.length > 0) {
        const studentMappings = students.map((s: any) => ({
          exam_session_id: examSession.id,
          student_id: s.id,
          class_id: s.class_id,
        }));

        const { error: mapError } = await supabase.from('exam_session_students').insert(studentMappings);
        if (mapError) throw mapError;
      }

      toast.success(bn ? `এক্সাম সেশন তৈরি হয়েছে — ${students?.length || 0} জন ছাত্র যোগ হয়েছে` : `Exam session created — ${students?.length || 0} students added`);

      // Reset form
      setName('');
      setNameBn('');
      setSelectedClassIds([]);
      queryClient.invalidateQueries({ queryKey: ['exam_sessions_list'] });
      queryClient.invalidateQueries({ queryKey: ['exam_session_classes_all'] });
    } catch (err: any) {
      toast.error(err.message || 'Error');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('exam_sessions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exam_sessions_list'] });
      queryClient.invalidateQueries({ queryKey: ['exam_session_classes_all'] });
      toast.success(bn ? 'মুছে ফেলা হয়েছে' : 'Deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const totalSelected = selectedClassIds.reduce((sum, cid) => sum + ((studentCounts as Record<string, number>)[cid] || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">
          <BookOpen className="inline w-6 h-6 mr-2" />
          {bn ? 'এক্সাম সেশন ব্যবস্থাপনা' : 'Exam Session Management'}
        </h1>

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
                    {academicSessions.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1 block">{bn ? 'পরীক্ষার ধরন' : 'Exam Type'}</label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">{bn ? 'বার্ষিক' : 'Annual'}</SelectItem>
                    <SelectItem value="half_yearly">{bn ? 'অর্ধবার্ষিক' : 'Half Yearly'}</SelectItem>
                    <SelectItem value="pre_test">{bn ? 'প্রাক-নির্বাচনী' : 'Pre-Test'}</SelectItem>
                  </SelectContent>
                </Select>
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
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  {bn ? 'বিভাগ নির্বাচন করুন' : 'Select Division'}
                </label>
                <Select value={selectedDivisionId} onValueChange={(v) => { setSelectedDivisionId(v); setSelectedClassIds([]); }}>
                  <SelectTrigger className="bg-background w-full sm:w-64"><SelectValue placeholder={bn ? 'বিভাগ নির্বাচন' : 'Select Division'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{bn ? 'সকল বিভাগ' : 'All Divisions'}</SelectItem>
                    {divisions.map((d: any) => <SelectItem key={d.id} value={d.id}>{bn ? d.name_bn : d.name}</SelectItem>)}
                  </SelectContent>
                </Select>

                <label className="text-sm font-medium text-muted-foreground mb-2 block mt-3">
                  {bn ? 'ক্লাস নির্বাচন করুন' : 'Select Classes'} *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredClasses.map((cls: any) => {
                    const count = (studentCounts as Record<string, number>)[cls.id] || 0;
                    const divName = cls.divisions ? (bn ? cls.divisions.name_bn : cls.divisions.name) : '';
                    return (
                      <label
                        key={cls.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedClassIds.includes(cls.id) ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedClassIds.includes(cls.id)}
                          onCheckedChange={() => toggleClass(cls.id)}
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium text-foreground">
                            {bn ? cls.name_bn : cls.name}
                          </span>
                          {divName && <span className="text-xs text-muted-foreground ml-1">({divName})</span>}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${count > 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                          <Users className="inline w-3 h-3 mr-0.5" />{count}
                        </span>
                      </label>
                    );
                  })}
                  {filteredClasses.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-full py-4 text-center">
                      {bn ? 'এই বিভাগে কোনো ক্লাস নেই' : 'No classes in this division'}
                    </p>
                  )}
                </div>

                {selectedClassIds.length > 0 && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm font-medium text-primary">
                      {bn
                        ? `মোট নির্বাচিত: ${selectedClassIds.length} টি ক্লাস — ${totalSelected} জন ছাত্র`
                        : `Total selected: ${selectedClassIds.length} classes — ${totalSelected} students`}
                    </p>
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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{bn ? 'নাম' : 'Name'}</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{bn ? 'শিক্ষাবর্ষ' : 'Session'}</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">{bn ? 'ধরন' : 'Type'}</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">{bn ? 'ক্লাস' : 'Classes'}</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold text-muted-foreground">{bn ? 'ছাত্র' : 'Students'}</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground">{bn ? 'অ্যাকশন' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {examSessions.map((es: any) => {
                    const esClasses = examSessionClasses.filter((c: any) => c.exam_session_id === es.id);
                    const totalStudents = esClasses.reduce((s: number, c: any) => s + (c.student_count || 0), 0);
                    const typeLabel = es.exam_type === 'annual' ? (bn ? 'বার্ষিক' : 'Annual') : es.exam_type === 'half_yearly' ? (bn ? 'অর্ধবার্ষিক' : 'Half Yearly') : (bn ? 'প্রাক-নির্বাচনী' : 'Pre-Test');
                    return (
                      <tr key={es.id} className="hover:bg-secondary/30">
                        <td className="px-4 py-3 font-medium text-foreground">{bn ? es.name_bn : es.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{es.academic_sessions?.name || '-'}</td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">{typeLabel}</span></td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-wrap justify-center gap-1">
                            {esClasses.map((c: any) => (
                              <span key={c.id} className="text-xs bg-secondary px-2 py-0.5 rounded">
                                {bn ? c.classes?.name_bn : c.classes?.name}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-medium text-foreground">{totalStudents}</td>
                        <td className="px-4 py-3 text-right">
                          {canDeleteItem && (
                            <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => deleteMutation.mutate(es.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminExamSessions;
