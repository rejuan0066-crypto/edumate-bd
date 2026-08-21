import PublicLayout from '@/components/PublicLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, GraduationCap, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import IndividualMarksheet from '@/components/results/IndividualMarksheet';

const ResultFind = () => {
  const { t, language } = useLanguage();
  const bn = language === 'bn';
  const { getOverallGrade } = useGradingSystem();

  const [examYear, setExamYear] = useState('');
  const [examSessionId, setExamSessionId] = useState('');
  const [classId, setClassId] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [resultData, setResultData] = useState<any>(null);
  const [error, setError] = useState('');

  const { data: academicSessions = [] } = useQuery({
    queryKey: ['public-academic-sessions'],
    queryFn: async () => {
      const { data } = await supabase.from('academic_sessions').select('*').eq('is_active', true).order('name', { ascending: false });
      return data || [];
    },
  });

  const { data: examSessions = [] } = useQuery({
    queryKey: ['public-exam-sessions', examYear],
    queryFn: async () => {
      const { data } = await supabase.from('exam_sessions').select('*').eq('academic_session_id', examYear).eq('is_active', true).order('name');
      return data || [];
    },
    enabled: !!examYear,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['public-classes'],
    queryFn: async () => {
      const { data } = await supabase.from('classes').select('*').eq('is_active', true).order('sort_order');
      return data || [];
    },
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResultData(null);

    if (!examYear || !examSessionId || !classId || !rollNumber.trim()) {
      setError(bn ? 'সব ফিল্ড পূরণ করুন' : 'Please fill all fields');
      return;
    }

    setSearching(true);
    try {
      const examSession = examSessions.find((es: any) => es.id === examSessionId);
      if (!examSession) throw new Error('Session not found');

      // Check if this exam session is published
      const isPublished = (examSession as any).is_published;

      if (!isPublished) {
        setError(bn ? 'এই সেশনে কোনো প্রকাশিত ফলাফল নেই' : 'No published results for this session');
        return;
      }

      // Find the matching student via a security-definer RPC (only returns the
      // single matched student for a published session — no bulk UUID exposure).
      const { data: matched } = await (supabase as any).rpc('public_find_exam_student', {
        p_session_id: examSessionId,
        p_roll: rollNumber.trim(),
        p_class_id: classId,
      });
      const found = Array.isArray(matched) ? matched[0] : matched;

      if (!found?.student_id) {
        setError(bn ? 'ছাত্র পাওয়া যায়নি' : 'Student not found');
        return;
      }

      // Get student info from public view (non-sensitive fields only)
      const { data: publicStudents } = await (supabase as any)
        .from('students_public')
        .select('*')
        .eq('id', found.student_id);

      const student = (publicStudents || []).find((ps: any) => ps.id === found.student_id) || null;
      if (!student) {
        setError(bn ? 'ছাত্র পাওয়া যায়নি' : 'Student not found');
        return;
      }

      const foundClassId = found.class_id;

      // Get class info to find division
      const { data: classInfo } = await supabase.from('classes').select('*').eq('id', foundClassId).single();
      const divisionId = classInfo?.division_id;

      // Load results
      const { data: results } = await supabase.from('results').select('*').eq('exam_id', examSessionId);
      const marksMap: Record<string, number> = {};
      results?.forEach((r: any) => {
        marksMap[`${r.student_id}_${r.subject_id}`] = r.marks ?? 0;
      });

      // Load subjects
      const { data: subjectData } = await supabase
        .from('exam_session_subjects')
        .select('subject_id, subjects(*)')
        .eq('exam_session_id', examSessionId);
      const allSubjects = subjectData?.map((es: any) => es.subjects).filter(Boolean) || [];
      const subjects = allSubjects
        .filter((s: any) => s.division_id === divisionId || s.class_id === foundClassId)
        .sort((a: any, b: any) => (a.name_bn || '').localeCompare(b.name_bn || ''));

      const year = academicSessions.find((s: any) => s.id === examYear);
      const examTitle = `${bn ? examSession.name_bn : examSession.name} — ${bn ? classInfo?.name_bn : classInfo?.name} — ${bn ? (year?.name_bn || year?.name) : year?.name}`;

      setResultData({ student, subjects, marksMap, examTitle });
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setSearching(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground">{t('result')}</h1>
        </div>

        {resultData ? (
          <IndividualMarksheet
            student={resultData.student}
            subjects={resultData.subjects}
            marksMap={resultData.marksMap}
            examTitle={resultData.examTitle}
            onBack={() => setResultData(null)}
          />
        ) : (
          <div className="card-elevated p-8 max-w-2xl mx-auto">
            <h2 className="text-xl font-display font-bold mb-6 text-center">
              {`'''Do not make any visual modifications. The phrases I write are commands to understand what I want, not to be written down. Understand their content well, then execute what is required.'''
                                        
                                            
                                            Please fix the mobile view responsiveness for both the Marksheet Preview and Marks Entry Table to match the desktop layout:

1. Enable Horizontal Scroll on Mobile:

   - Wrap both the Marksheet preview and Marks Entry table inside an overflow container (\`w-full overflow-x-auto\`).

   - Set a minimum width on the table element (\`min-w-[700px]\` or \`min-w-[800px]\`) so that fields/columns do not shrink, squish, or stack vertically on smaller mobile screens.

2. Preserve Desktop Structure on Mobile:

   - Ensure the table maintains its exact desktop layout with horizontal scrolling instead of squeezing all columns into the small mobile screen width.

   - Keep font sizes, input boxes, and padding readable and proportionate on mobile devices.`}
            </h2>
            <form className="space-y-4" onSubmit={handleSearch}>
              <Select value={examYear} onValueChange={(v) => { setExamYear(v); setExamSessionId(''); }}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={bn ? 'শিক্ষাবর্ষ নির্বাচন' : 'Select Academic Year'} />
                </SelectTrigger>
                <SelectContent>
                  {academicSessions.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{bn ? (s.name_bn || s.name) : s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={examSessionId} onValueChange={setExamSessionId} disabled={!examYear}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={bn ? 'পরীক্ষা সেশন নির্বাচন' : 'Select Exam Session'} />
                </SelectTrigger>
                <SelectContent>
                  {examSessions.map((es: any) => (
                    <SelectItem key={es.id} value={es.id}>{bn ? es.name_bn : es.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder={bn ? 'শ্রেণি নির্বাচন' : 'Select Class'} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{bn ? (c.name_bn || c.name) : c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder={bn ? 'রোল / রেজিস্ট্রেশন নম্বর' : 'Roll / Registration Number'}
                className="bg-background"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
              />

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              <Button type="submit" className="btn-primary-gradient w-full flex items-center gap-2" disabled={searching}>
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                {t('search')}
              </Button>
            </form>
          </div>
        )}
      </div>
    </PublicLayout>
  );
};

export default ResultFind;
