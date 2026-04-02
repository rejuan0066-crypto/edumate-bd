import AdminLayout from '@/components/AdminLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { Printer, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApprovalCheck } from '@/hooks/useApprovalCheck';

const getGrade = (avg: number) => {
  if (avg >= 80) return { grade: 'A+', gpa: '5.00' };
  if (avg >= 70) return { grade: 'A', gpa: '4.00' };
  if (avg >= 60) return { grade: 'A-', gpa: '3.50' };
  if (avg >= 50) return { grade: 'B', gpa: '3.00' };
  if (avg >= 40) return { grade: 'C', gpa: '2.00' };
  if (avg >= 33) return { grade: 'D', gpa: '1.00' };
  return { grade: 'F', gpa: '0.00' };
};

const AdminResults = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { checkApproval } = useApprovalCheck('/admin/results', 'results');
  const [examYear, setExamYear] = useState('2026');
  const [examSession, setExamSession] = useState('');
  const [examType, setExamType] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [marksMap, setMarksMap] = useState<Record<string, number>>({});

  const { data: divisions = [] } = useQuery({
    queryKey: ['divisions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('divisions').select('*').eq('is_active', true).order('sort_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects', selectedDivision],
    queryFn: async () => {
      let q = supabase.from('subjects').select('*').eq('is_active', true);
      if (selectedDivision) q = q.eq('division_id', selectedDivision);
      const { data, error } = await q.order('name_bn');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDivision,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students', selectedDivision],
    queryFn: async () => {
      let q = supabase.from('students').select('*').eq('status', 'active');
      if (selectedDivision) q = q.eq('division_id', selectedDivision);
      const { data, error } = await q.order('roll_number');
      if (error) throw error;
      return data;
    },
    enabled: !!selectedDivision,
  });

  const { data: results = [] } = useQuery({
    queryKey: ['results', selectedExamId],
    queryFn: async () => {
      if (!selectedExamId) return [];
      const { data, error } = await supabase.from('results').select('*').eq('exam_id', selectedExamId);
      if (error) throw error;
      // Initialize marksMap
      const map: Record<string, number> = {};
      data?.forEach((r: any) => { map[`${r.student_id}_${r.subject_id}`] = r.marks ?? 0; });
      setMarksMap(map);
      return data;
    },
    enabled: !!selectedExamId,
  });

  const handleSearch = async () => {
    if (!examYear || !selectedDivision || !examType) {
      toast.error(language === 'bn' ? 'বছর, বিভাগ ও পরীক্ষার ধরন নির্বাচন করুন' : 'Select year, division and exam type');
      return;
    }

    // Find or create exam
    const { data: existing } = await supabase.from('exams').select('*')
      .eq('exam_year', parseInt(examYear))
      .eq('exam_type', examType)
      .eq('division_id', selectedDivision)
      .maybeSingle();

    if (existing) {
      setSelectedExamId(existing.id);
    } else {
      const { data: newExam, error } = await supabase.from('exams').insert({
        name: `${examType} ${examYear}`,
        name_bn: `${examType === 'annual' ? 'বার্ষিক' : examType === 'half_yearly' ? 'অর্ধবার্ষিক' : 'প্রাক-নির্বাচনী'} ${examYear}`,
        exam_year: parseInt(examYear),
        exam_session: examSession || examType,
        exam_type: examType,
        division_id: selectedDivision,
      }).select().single();
      if (error) { toast.error(error.message); return; }
      setSelectedExamId(newExam.id);
    }
    setShowResults(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedExamId) return;
      const upserts = Object.entries(marksMap).map(([key, marks]) => {
        const [student_id, subject_id] = key.split('_');
        const avg = marks;
        const { grade, gpa } = getGrade(avg);
        return { exam_id: selectedExamId, student_id, subject_id, marks, grade, gpa: parseFloat(gpa) };
      });
      if (await checkApproval('edit', { exam_id: selectedExamId, results_count: upserts.length, results: upserts }, selectedExamId, `ফলাফল সংরক্ষণ`)) return;
      const { error } = await supabase.from('results').upsert(upserts, { onConflict: 'exam_id,student_id,subject_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['results'] });
      toast.success(language === 'bn' ? 'ফলাফল সংরক্ষিত হয়েছে' : 'Results saved');
    },
    onError: (e: any) => toast.error(e.message || 'Error'),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">{language === 'bn' ? 'ফলাফল ব্যবস্থাপনা' : 'Result Management'}</h1>

        <div className="card-elevated p-5">
          <h3 className="font-display font-bold text-foreground mb-4">{language === 'bn' ? 'ফলাফল অনুসন্ধান / তৈরি' : 'Search / Create Result'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <Select value={examYear} onValueChange={setExamYear}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={language === 'bn' ? 'বছর' : 'Year'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2026">২০২৬</SelectItem>
                <SelectItem value="2025">২০২৫</SelectItem>
                <SelectItem value="2024">২০২৪</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder={language === 'bn' ? 'সেশন' : 'Session'} value={examSession} onChange={(e) => setExamSession(e.target.value)} className="bg-background" />
            <Select value={examType} onValueChange={setExamType}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={language === 'bn' ? 'পরীক্ষার ধরন' : 'Exam Type'} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="annual">{language === 'bn' ? 'বার্ষিক' : 'Annual'}</SelectItem>
                <SelectItem value="half_yearly">{language === 'bn' ? 'অর্ধবার্ষিক' : 'Half Yearly'}</SelectItem>
                <SelectItem value="pre_test">{language === 'bn' ? 'প্রাক-নির্বাচনী' : 'Pre-Test'}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDivision} onValueChange={setSelectedDivision}>
              <SelectTrigger className="bg-background"><SelectValue placeholder={language === 'bn' ? 'বিভাগ' : 'Division'} /></SelectTrigger>
              <SelectContent>{divisions.map(d => <SelectItem key={d.id} value={d.id}>{language === 'bn' ? d.name_bn : d.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={handleSearch} className="btn-primary-gradient"><Search className="w-4 h-4 mr-1" /> {language === 'bn' ? 'অনুসন্ধান' : 'Search'}</Button>
          </div>
        </div>

        {showResults && (
          <div className="card-elevated p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-foreground">
                {divisions.find(d => d.id === selectedDivision)?.name_bn} — {examType === 'annual' ? 'বার্ষিক' : examType === 'half_yearly' ? 'অর্ধবার্ষিক' : 'প্রাক-নির্বাচনী'} {examYear}
              </h3>
              <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> {language === 'bn' ? 'প্রিন্ট' : 'Print'}</Button>
            </div>

            {students.length === 0 || subjects.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">{language === 'bn' ? 'এই বিভাগে কোনো ছাত্র বা বিষয় নেই। আগে ছাত্র ও বিষয় যোগ করুন।' : 'No students or subjects in this division.'}</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'রোল' : 'Roll'}</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'নাম' : 'Name'}</th>
                        {subjects.map((s: any) => <th key={s.id} className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{s.name_bn}</th>)}
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'মোট' : 'Total'}</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">{language === 'bn' ? 'গ্রেড' : 'Grade'}</th>
                        <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground">GPA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {students.map((st: any) => {
                        const studentMarks = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`] ?? 0);
                        const total = studentMarks.reduce((a: number, b: number) => a + b, 0);
                        const avg = subjects.length > 0 ? total / subjects.length : 0;
                        const { grade, gpa } = getGrade(avg);
                        return (
                          <tr key={st.id} className="hover:bg-secondary/30">
                            <td className="px-3 py-2 font-medium text-foreground">{st.roll_number || '-'}</td>
                            <td className="px-3 py-2 text-foreground">{st.name_bn}</td>
                            {subjects.map((sub: any) => (
                              <td key={sub.id} className="px-3 py-2 text-center">
                                <Input
                                  className="w-16 h-8 text-center bg-background text-sm mx-auto"
                                  type="number" min={0} max={100}
                                  value={marksMap[`${st.id}_${sub.id}`] ?? ''}
                                  onChange={(e) => setMarksMap(prev => ({ ...prev, [`${st.id}_${sub.id}`]: parseInt(e.target.value) || 0 }))}
                                />
                              </td>
                            ))}
                            <td className="px-3 py-2 text-center font-bold text-foreground">{total}</td>
                            <td className="px-3 py-2 text-center"><span className={`px-2 py-1 rounded-full text-xs font-medium ${grade === 'F' ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>{grade}</span></td>
                            <td className="px-3 py-2 text-center font-medium text-primary">{gpa}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <Button className="btn-primary-gradient" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
                    {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    {language === 'bn' ? 'সংরক্ষণ করুন' : 'Save Results'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminResults;
