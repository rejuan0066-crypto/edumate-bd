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
import { bnToEn, enToBn } from '@/lib/utils';

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
      const rawRoll = rollNumber.trim();
      const enRoll = bnToEn(rawRoll);
      const bnRoll = enToBn(rawRoll);

      // Try English normalized roll first (since DB stores standard digits)
      let { data: matched } = await (supabase as any).rpc('public_find_exam_student', {
        p_session_id: examSessionId,
        p_roll: enRoll,
        p_class_id: classId,
      });

      // If not found and input had Bengali digits or legacy records, try raw/Bengali
      if (!matched || (Array.isArray(matched) && matched.length === 0)) {
        if (rawRoll !== enRoll) {
          const { data: matchedRaw } = await (supabase as any).rpc('public_find_exam_student', {
            p_session_id: examSessionId,
            p_roll: rawRoll,
            p_class_id: classId,
          });
          matched = matchedRaw;
        } else if (rawRoll !== bnRoll) {
          const { data: matchedBn } = await (supabase as any).rpc('public_find_exam_student', {
            p_session_id: examSessionId,
            p_roll: bnRoll,
            p_class_id: classId,
          });
          matched = matchedBn;
        }
      }

      const found = Array.isArray(matched) ? matched[0] : matched;

      if (!found?.student_id) {
        setError(bn ? 'ছাত্র পাওয়া যায়নি' : 'Student not found');
        return;
      }

      const foundClassId = found.class_id;

      // Get class info to find division
      const { data: classInfo } = await supabase.from('classes').select('*, divisions(name, name_bn)').eq('id', foundClassId).single();
      const divisionId = classInfo?.division_id;

      // Try to fetch additional profile fields if available/authorized
      let extraProfile: any = null;
      try {
        const { data: prof } = await supabase
          .from('students')
          .select('father_name, father_name_en, date_of_birth, section')
          .eq('id', found.student_id)
          .maybeSingle();
        if (prof) extraProfile = prof;
      } catch {
        // Ignored for unauthenticated users
      }

      const divisionName = (classInfo as any)?.divisions?.name_bn || (classInfo as any)?.divisions?.name || null;

      // The verified public RPC returns only this student's safe profile and marks.
      const student = {
        id: found.student_id,
        name_bn: found.name_bn,
        name_en: found.name_en,
        roll_number: found.roll_number,
        registration_no: found.registration_no,
        registration_number: found.registration_no,
        student_id: found.student_id,
        father_name: extraProfile?.father_name || (found as any).father_name || null,
        father_name_en: extraProfile?.father_name_en || (found as any).father_name_en || null,
        date_of_birth: extraProfile?.date_of_birth || (found as any).date_of_birth || null,
        section: extraProfile?.section || divisionName || '-',
        division_name: divisionName,
        division_id: found.division_id,
        class_id: found.class_id,
        session_id: found.session_id,
        photo_url: found.photo_url,
      };

      const marksMap: Record<string, number> = {};
      Object.entries(found.marks || {}).forEach(([subjectId, marks]) => {
        marksMap[`${found.student_id}_${subjectId}`] = Number(marks) || 0;
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
      const examNameStr = bn ? (examSession?.name_bn || examSession?.name) : (examSession?.name || examSession?.name_bn);
      const classNameStr = bn ? (classInfo?.name_bn || classInfo?.name) : (classInfo?.name || classInfo?.name_bn);
      const sessionNameStr = bn ? (year?.name_bn || year?.name) : (year?.name || year?.name_bn);
      const examTitle = `${examNameStr} — ${classNameStr} — ${sessionNameStr}`;

      const meritRank = Number(found.merit_rank);
      const resolvedRank = Number.isInteger(meritRank) && meritRank > 0 ? meritRank : null;

      setResultData({ 
        student: {
          ...student,
          class_id: foundClassId || student.class_id,
          rank: resolvedRank,
        }, 
        rank: resolvedRank,
        subjects, 
        marksMap, 
        examTitle,
        className: classNameStr,
        examName: examNameStr,
        sessionName: sessionNameStr,
      });
    } catch (err: any) {
      setError(err.message || 'Error');
    } finally {
      setSearching(false);
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-12 print:p-0 print:m-0 print:max-w-none">
        <div className="flex items-center gap-3 mb-8 print:hidden">
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
            className={resultData.className}
            examName={resultData.examName}
            sessionName={resultData.sessionName}
            rank={resultData.rank}
            onBack={() => setResultData(null)}
          />
        ) : (
          <div className="card-elevated p-8 max-w-2xl mx-auto print:hidden">
            <h2 className="text-xl font-display font-bold mb-6 text-center">
              {bn ? 'ফলাফল অনুসন্ধান করুন' : 'Search Result'}
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
                placeholder={bn ? 'রোল / রেজিস্ট্রেশন নম্বর (বাংলা বা ইংরেজি)' : 'Roll / Registration Number (BN or EN)'}
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
