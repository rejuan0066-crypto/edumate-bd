import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import { toBnDigits } from '@/lib/digits';
import { CheckCircle2, XCircle, Calculator, Lock } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  student: any | null;
  subjects: any[];
  marksMap: Record<string, number>;
}

/**
 * Explains, step by step, how a student's result was calculated:
 * subject-wise pass/fail, total, average, consideration (grace) rule and final grade.
 * Only visible to signed-in users.
 */
const ResultCalculationDialog = ({ open, onOpenChange, student, subjects, marksMap }: Props) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { user } = useAuth();
  const { passMark, getOverallGrade, getGraceLimit } = useGradingSystem();

  const num = (v: any) => (bn ? toBnDigits(v) : String(v));

  if (!student) return null;

  const rows = subjects.map((s: any) => {
    const raw = marksMap[`${student.id}_${s.id}`];
    const entered = raw !== undefined && raw !== null && (raw as any) !== '' && !Number.isNaN(Number(raw));
    const mark = entered ? Number(raw) : null;
    return {
      id: s.id,
      name: bn ? s.name_bn : (s.name || s.name_bn),
      mark,
      entered,
      passed: entered ? (mark as number) >= passMark : null,
    };
  });

  const graded = rows.filter(r => r.entered).map(r => r.mark as number);
  const total = graded.reduce((a, b) => a + b, 0);
  const avg = graded.length ? total / graded.length : 0;
  const overall: any = graded.length ? getOverallGrade(graded, student.class_id) : null;
  const failedSubjects = rows.filter(r => r.entered && !r.passed);
  const graceLimit = getGraceLimit(student.class_id);

  const reason = !graded.length
    ? (bn ? 'কোনো বিষয়ের নম্বর এন্ট্রি করা হয়নি, তাই ফলাফল গণনা করা যায়নি।' : 'No marks entered, so no result could be calculated.')
    : overall?.graced
      ? (bn
        ? `${num(failedSubjects.length)} টি বিষয়ে পাস নম্বরের কম, কিন্তু বিবেচনায় পাসের সীমা ${num(graceLimit)} টি — তাই "মাকবুল (বিবেচনায়)" দেওয়া হয়েছে।`
        : `${failedSubjects.length} subject(s) below pass mark, within the consideration limit of ${graceLimit} — so "Maqbul (Considered)" was awarded.`)
      : overall?.hasFail
        ? (bn
          ? `${num(failedSubjects.length)} টি বিষয়ে পাস নম্বর (${num(passMark)}) এর কম পেয়েছে${graceLimit > 0 ? `, বিবেচনায় পাসের সীমা ${num(graceLimit)} টি` : ', বিবেচনায় পাস চালু নেই'} — তাই চূড়ান্ত গ্রেড F।`
          : `${failedSubjects.length} subject(s) scored below the pass mark (${passMark})${graceLimit > 0 ? `, consideration limit is ${graceLimit}` : ', consideration pass is off'} — so the final grade is F.`)
        : (bn
          ? `সব বিষয়ে পাস নম্বর (${num(passMark)}) বা তার বেশি পেয়েছে। গড় ${num(avg.toFixed(2))} অনুযায়ী গ্রেড ${overall?.grade}।`
          : `Passed every subject (pass mark ${passMark}). Average ${avg.toFixed(2)} gives grade ${overall?.grade}.`);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-[28px] max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-primary" />
            {bn ? 'ফলাফল গণনার ব্যাখ্যা' : 'Result Calculation Breakdown'}
          </DialogTitle>
          <DialogDescription>
            {bn ? (student.name_bn || student.name_en) : (student.name_en || student.name_bn)}
            {student.roll_number ? ` — ${bn ? 'রোল' : 'Roll'} ${num(student.roll_number)}` : ''}
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-4 rounded-2xl bg-muted/40">
            <Lock className="w-4 h-4" />
            {bn ? 'এই বিবরণ দেখতে লগইন করুন।' : 'Sign in to view this breakdown.'}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-[20px] border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-semibold">{bn ? 'বিষয়' : 'Subject'}</th>
                    <th className="text-center px-3 py-2 font-semibold">{bn ? 'প্রাপ্ত নম্বর' : 'Marks'}</th>
                    <th className="text-center px-3 py-2 font-semibold">{bn ? 'পাস নম্বর' : 'Pass Mark'}</th>
                    <th className="text-center px-3 py-2 font-semibold">{bn ? 'অবস্থা' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 text-center font-medium">{r.entered ? num(r.mark) : '-'}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{num(passMark)}</td>
                      <td className="px-3 py-2 text-center">
                        {!r.entered ? (
                          <span className="text-muted-foreground">{bn ? 'এন্ট্রি নেই' : 'Not entered'}</span>
                        ) : r.passed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="w-3.5 h-3.5" />{bn ? 'পাস' : 'Pass'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <XCircle className="w-3.5 h-3.5" />{bn ? 'ফেইল' : 'Fail'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: bn ? 'গণনায় ধরা বিষয়' : 'Counted Subjects', value: num(graded.length) },
                { label: bn ? 'মোট নম্বর' : 'Total', value: num(total) },
                { label: bn ? 'গড়' : 'Average', value: num(avg.toFixed(2)) },
                { label: 'GPA', value: overall ? num(overall.gpa) : '-' },
              ].map((s) => (
                <div key={s.label} className="rounded-[20px] border border-border bg-muted/30 px-3 py-2 text-center">
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="text-sm font-bold text-foreground">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{bn ? 'চূড়ান্ত গ্রেড' : 'Final Grade'}:</span>
              {overall ? (
                <>
                  <Badge className={`${overall.color} border-0`}>{String(overall.grade).toUpperCase()}</Badge>
                  <Badge variant="outline">{bn ? overall.title_bn : overall.title}</Badge>
                </>
              ) : <Badge variant="outline">-</Badge>}
              {graceLimit > 0 && (
                <Badge variant="outline" className="text-[10px]">
                  {bn ? `বিবেচনায় পাস সীমা: ${num(graceLimit)}` : `Consideration limit: ${graceLimit}`}
                </Badge>
              )}
            </div>

            <div className={`rounded-[20px] p-3 text-xs leading-relaxed border ${overall?.hasFail ? 'bg-destructive/5 border-destructive/30 text-destructive' : 'bg-emerald-500/5 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'}`}>
              <span className="font-semibold">{bn ? 'কারণ: ' : 'Why: '}</span>{reason}
            </div>

            <p className="text-[10px] text-muted-foreground">
              {bn
                ? 'নোট: যেসব বিষয়ে নম্বর এন্ট্রি করা হয়নি সেগুলো মোট, গড় ও গ্রেড কোনো হিসাবেই ধরা হয় না।'
                : 'Note: subjects with no entered marks are excluded from total, average and grade.'}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ResultCalculationDialog;
