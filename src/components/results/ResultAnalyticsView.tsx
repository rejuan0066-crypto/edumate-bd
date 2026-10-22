import { useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { enToBn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Award, Users, CheckCircle2, XCircle, Percent, BookOpen } from 'lucide-react';

const toBnDigits = (n: any) => enToBn(String(n ?? ''));

interface ResultAnalyticsViewProps {
  students: any[];
  subjects: any[];
  marksMap: Record<string, number>;
  className?: string;
  examName?: string;
  sessionName?: string;
  getOverallGrade: (marks: number[], classId?: string, opts?: any) => any;
  statusOverrides?: Record<string, 'fail' | 'grace_pass' | 'auto'>;
}

export const ResultAnalyticsView = ({
  students,
  subjects,
  marksMap,
  className,
  examName,
  sessionName,
  getOverallGrade,
  statusOverrides = {},
}: ResultAnalyticsViewProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';

  // Compute student stats
  const computed = useMemo(() => {
    return students.map((st, idx) => {
      const raw = subjects.map(s => marksMap[`${st.id}_${s.id}`]);
      const hasEnteredAny = raw.some(m => m !== undefined && m !== null && m !== '');
      const graded = raw
        .filter(m => m !== undefined && m !== null && m !== '' && !Number.isNaN(Number(m)))
        .map(m => Number(m));
      const total = hasEnteredAny ? graded.reduce((a, b) => a + b, 0) : 0;
      const blankCount = raw.filter(m => m === undefined || m === null || m === '').length;
      const hasBlank = blankCount > 0;
      const hasZero = graded.some(m => Number(m) === 0);
      const override = statusOverrides[st.id] || 'auto';
      const overall = hasEnteredAny
        ? getOverallGrade(graded, st.class_id, {
            blankFailCount: blankCount,
            hasBlankOrZero: hasBlank || hasZero,
            override,
          })
        : null;

      const failed = overall ? (overall.graced ? false : overall.hasFail) : false;
      const gpa = overall?.gpa || '0.00';
      const grade = overall?.grade || '-';
      const titleBn = overall?.title_bn || '-';
      const titleEn = overall?.title || '-';

      return {
        idx,
        st,
        total,
        graded,
        hasEnteredAny,
        failed,
        gpa,
        grade,
        titleBn,
        titleEn,
      };
    });
  }, [students, subjects, marksMap, statusOverrides, getOverallGrade]);

  const activeStudents = useMemo(() => computed.filter(c => c.hasEnteredAny), [computed]);

  // Sort by merit
  const sortedMerit = useMemo(() => {
    return [...activeStudents].sort((a, b) => {
      if (a.failed !== b.failed) return a.failed ? 1 : -1;
      return b.total - a.total;
    });
  }, [activeStudents]);

  const top3 = useMemo(() => sortedMerit.filter(s => !s.failed).slice(0, 3), [sortedMerit]);

  const passCount = useMemo(() => activeStudents.filter(s => !s.failed).length, [activeStudents]);
  const failCount = activeStudents.length - passCount;
  const passPercent = activeStudents.length ? ((passCount / activeStudents.length) * 100).toFixed(1) : '0';
  const avgTotal = activeStudents.length
    ? (activeStudents.reduce((sum, s) => sum + s.total, 0) / activeStudents.length).toFixed(1)
    : '0';

  // Grade breakdown
  const gradeBreakdown = useMemo(() => {
    const counts: Record<string, { label: string; count: number; color: string }> = {
      mumtaz: { label: bn ? 'মুমতাজ (A+)' : 'Mumtaz (A+)', count: 0, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
      jayyid_jiddan: { label: bn ? 'জায়্যিদ জিদ্দান (A)' : 'Jayyid Jiddan (A)', count: 0, color: 'text-sky-700 bg-sky-50 border-sky-200' },
      jayyid: { label: bn ? 'জায়্যিদ (B)' : 'Jayyid (B)', count: 0, color: 'text-blue-700 bg-blue-50 border-blue-200' },
      maqbul: { label: bn ? 'মাকবুল (বিবেচনায় পাস)' : 'Maqbul (Grace Pass)', count: 0, color: 'text-amber-800 bg-amber-50 border-amber-300' },
      rasib: { label: bn ? 'রাসিব (ফেল)' : 'Rasib (Fail)', count: 0, color: 'text-rose-700 bg-rose-50 border-rose-200' },
    };

    activeStudents.forEach(s => {
      if (s.failed) {
        counts.rasib.count++;
      } else if (s.titleBn?.includes('বিবেচনা') || s.grade === 'D' || (statusOverrides[s.st.id] === 'grace_pass')) {
        counts.maqbul.count++;
      } else if (s.grade === 'A+' || s.titleBn?.includes('মুমতাজ')) {
        counts.mumtaz.count++;
      } else if (s.grade === 'A' || s.titleBn?.includes('জিদ্দান')) {
        counts.jayyid_jiddan.count++;
      } else {
        counts.jayyid.count++;
      }
    });

    return counts;
  }, [activeStudents, statusOverrides, bn]);

  // Subject-wise stats
  const subjectStats = useMemo(() => {
    return subjects.map(sub => {
      const marks = students
        .map(st => marksMap[`${st.id}_${sub.id}`])
        .filter(m => m !== undefined && m !== null && m !== '' && !Number.isNaN(Number(m)))
        .map(m => Number(m));

      const count = marks.length;
      const highest = count ? Math.max(...marks) : 0;
      const lowest = count ? Math.min(...marks) : 0;
      const avg = count ? (marks.reduce((a, b) => a + b, 0) / count).toFixed(1) : '0';
      const passed = marks.filter(m => m >= 33).length;
      const rate = count ? ((passed / count) * 100).toFixed(0) : '0';

      return {
        id: sub.id,
        name: bn ? sub.name_bn || sub.name : sub.name,
        count,
        highest,
        lowest,
        avg,
        passed,
        rate,
      };
    });
  }, [subjects, students, marksMap, bn]);

  if (!students.length) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        {bn ? 'কোনো শিক্ষার্থী পাওয়া যায়নি।' : 'No students found.'}
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span>{bn ? '📊 ফলাফল বিশ্লেষণ ও পরিসংখ্যান' : '📊 Result Analytics & Performance'}</span>
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {className} {examName ? `— ${examName}` : ''} {sessionName ? `(${sessionName})` : ''}
          </p>
        </div>
        <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 px-3 py-1 font-semibold self-start sm:self-auto">
          {toBnDigits(students.length)} {bn ? 'জন মোট শিক্ষার্থী' : 'total students'}
        </Badge>
      </div>

      {/* Summary Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 flex items-center gap-3 border-border">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{bn ? 'অংশগ্রহণকারী' : 'Examinees'}</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{toBnDigits(activeStudents.length)}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border-emerald-500/30 bg-emerald-50/10">
          <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{bn ? 'কৃতকার্য (পাস)' : 'Passed'}</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-600">{toBnDigits(passCount)}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border-destructive/30 bg-destructive/5">
          <div className="p-2.5 rounded-xl bg-destructive/15 text-destructive">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{bn ? 'অকৃতকার্য (ফেল)' : 'Failed'}</p>
            <p className="text-xl sm:text-2xl font-bold text-destructive">{toBnDigits(failCount)}</p>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-3 border-border">
          <div className="p-2.5 rounded-xl bg-sky-500/15 text-sky-600">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground">{bn ? 'পাশের হার' : 'Pass Rate'}</p>
            <p className="text-xl sm:text-2xl font-bold text-foreground">{toBnDigits(passPercent)}%</p>
          </div>
        </Card>
      </div>

      {/* Top 3 Merit Podium */}
      {top3.length > 0 && (
        <Card className="p-5 border-border">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{bn ? 'শীর্ষ মেধা তালিকা (Top 3 Ranks)' : 'Top 3 Merit Positions'}</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {top3.map((student, i) => {
              const medals = ['🥇', '🥈', '🥉'];
              const rankLabels = [bn ? '১ম স্থান' : '1st Rank', bn ? '২য় স্থান' : '2nd Rank', bn ? '৩য় স্থান' : '3rd Rank'];
              const borderColors = ['border-amber-400 bg-amber-50/20', 'border-slate-300 bg-slate-50/20', 'border-amber-600/30 bg-amber-50/10'];
              return (
                <div key={student.st.id} className={`p-4 rounded-xl border-2 ${borderColors[i]} text-center relative`}>
                  <span className="text-2xl">{medals[i]}</span>
                  <p className="text-xs font-bold text-primary mt-1">{rankLabels[i]}</p>
                  <p className="text-base font-bold text-foreground mt-0.5 truncate">
                    {bn ? student.st.name_bn || student.st.name : student.st.name || student.st.name_bn}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bn ? 'রোল:' : 'Roll:'} {toBnDigits(student.st.roll_number || student.idx + 1)} • {bn ? 'মোট:' : 'Total:'} <strong className="text-foreground">{toBnDigits(student.total)}</strong>
                  </p>
                  <Badge variant="outline" className="mt-2 text-[10px] font-semibold bg-background">
                    {student.titleBn} ({student.gpa})
                  </Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Grade Breakdown Cards */}
      <Card className="p-5 border-border">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
          <Award className="w-4 h-4 text-primary" />
          <span>{bn ? 'বিভাগ ও গ্রেড বণ্টন' : 'Grade & Division Distribution'}</span>
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {Object.entries(gradeBreakdown).map(([key, item]) => (
            <div key={key} className={`p-3.5 rounded-xl border text-center ${item.color}`}>
              <span className="text-xs font-semibold">{item.label}</span>
              <p className="text-xl font-bold mt-1">{toBnDigits(item.count)} {bn ? 'জন' : ''}</p>
              <p className="text-[10px] opacity-80 mt-0.5">
                {activeStudents.length ? toBnDigits(((item.count / activeStudents.length) * 100).toFixed(0)) : 0}%
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Subject Performance Breakdown */}
      {subjectStats.length > 0 && (
        <Card className="p-5 border-border overflow-hidden">
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>{bn ? 'বিষয়ভিত্তিক ফলাফল বিশ্লেষণ' : 'Subject-wise Performance Breakdown'}</span>
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="p-2.5">{bn ? 'বিষয়' : 'Subject'}</th>
                  <th className="p-2.5 text-center">{bn ? 'পরীক্ষার্থী' : 'Examinees'}</th>
                  <th className="p-2.5 text-center">{bn ? 'সর্বোচ্চ' : 'Highest'}</th>
                  <th className="p-2.5 text-center">{bn ? 'সর্বনিম্ন' : 'Lowest'}</th>
                  <th className="p-2.5 text-center">{bn ? 'গড় নম্বর' : 'Average'}</th>
                  <th className="p-2.5 text-center">{bn ? 'পাসের হার' : 'Pass Rate'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjectStats.map(sub => (
                  <tr key={sub.id} className="hover:bg-muted/20">
                    <td className="p-2.5 font-medium text-foreground">{sub.name}</td>
                    <td className="p-2.5 text-center text-muted-foreground">{toBnDigits(sub.count)}</td>
                    <td className="p-2.5 text-center font-bold text-emerald-600">{toBnDigits(sub.highest)}</td>
                    <td className="p-2.5 text-center font-semibold text-rose-600">{toBnDigits(sub.lowest)}</td>
                    <td className="p-2.5 text-center font-semibold text-foreground">{toBnDigits(sub.avg)}</td>
                    <td className="p-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${Number(sub.rate) >= 80 ? 'bg-emerald-50 text-emerald-700' : Number(sub.rate) >= 60 ? 'bg-sky-50 text-sky-700' : 'bg-rose-50 text-rose-700'}`}>
                        {toBnDigits(sub.rate)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ResultAnalyticsView;
