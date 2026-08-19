import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Printer, Save, Loader2, Eye, FileDown, FileSpreadsheet, X } from 'lucide-react';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import { exportResultCSV, exportResultPDF } from '@/lib/resultExport';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { toBnDigits, toEnDigits } from '@/lib/digits';


// Legacy export for backward compat
const getGrade = (avg: number) => {
  if (avg >= 80) return { grade: 'A+', gpa: '5.00', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' };
  if (avg >= 70) return { grade: 'A', gpa: '4.00', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' };
  if (avg >= 60) return { grade: 'A-', gpa: '3.50', color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' };
  if (avg >= 50) return { grade: 'B', gpa: '3.00', color: 'text-sky-600 dark:text-sky-400 bg-sky-500/10' };
  if (avg >= 40) return { grade: 'C', gpa: '2.00', color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10' };
  if (avg >= 33) return { grade: 'D', gpa: '1.00', color: 'text-orange-600 dark:text-orange-400 bg-orange-500/10' };
  return { grade: 'F', gpa: '0.00', color: 'text-destructive bg-destructive/10' };
};

interface ClassResultTableProps {
  students: any[];
  subjects: any[];
  marksMap: Record<string, number>;
  onMarksChange: (key: string, value: number) => void;
  onSave: () => void;
  isSaving: boolean;
  title: string;
  onViewMarksheet: (studentId: string, rank?: number) => void;
  onClose?: () => void;
}

const ClassResultTable = ({ students, subjects, marksMap, onMarksChange, onSave, isSaving, title, onViewMarksheet, onClose }: ClassResultTableProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { getOverallGrade, maxMarks, minMarks, passMark } = useGradingSystem();

  const { data: institution } = useQuery({
    queryKey: ['institution-default'],
    queryFn: async () => {
      const data = await fetchInstitutionInfo();
      return data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const handleExport = (type: 'csv' | 'pdf') => {
    const params = {
      title,
      students,
      subjects,
      marksMap,
      getOverallGrade,
      bn,
      institutionName: bn ? institution?.name : (institution?.name_en || institution?.name),
      institutionLogo: institution?.logo_url || undefined,
      institutionAddress: institution?.address || undefined,
      institutionPhone: institution?.phone || undefined,
    };
    type === 'csv' ? exportResultCSV(params) : exportResultPDF(params);
  };

  if (students.length === 0 || subjects.length === 0) {
    return (
      <div className="card-elevated rounded-xl p-12 text-center">
        <p className="text-muted-foreground">{bn ? 'এই ক্লাসে কোনো ছাত্র বা বিষয় নেই।' : 'No students or subjects in this class.'}</p>
      </div>
    );
  }

  const instName = bn ? institution?.name : (institution?.name_en || institution?.name);

  return (
    <div className="card-elevated rounded-xl overflow-hidden relative">
      {/* Logo Watermark */}
      {institution?.logo_url && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
          <img
            src={institution.logo_url}
            alt=""
            className="w-80 h-80 object-contain opacity-[0.03] dark:opacity-[0.05]"
          />
        </div>
      )}

      {/* Institution Header */}
      <div className="sticky top-0 z-30 border-b border-border bg-background px-5 py-4 text-center">
        <div className="flex items-center justify-center gap-4">
          {institution?.logo_url && (
            <img src={institution.logo_url} alt="" className="w-12 h-12 object-contain rounded" />
          )}
          <div>
            <h2 className="text-base font-bold text-foreground">{instName || ''}</h2>
            {institution?.address && (
              <p className="text-xs text-muted-foreground">{institution.address}</p>
            )}
            {institution?.phone && (
              <p className="text-xs text-muted-foreground">{bn ? 'ফোন' : 'Phone'}: {institution.phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Title & Actions Bar */}
      <div className="sticky top-[81px] sm:top-[89px] lg:top-[112px] z-20 flex items-center justify-between px-5 py-3 border-b border-border bg-background/95 backdrop-blur-sm shadow-sm">
        <div className="flex items-center gap-2">
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title={bn ? 'বন্ধ করুন' : 'Close'}>
              <X className="w-5 h-5" />
            </button>
          )}
          <h3 className="font-display font-bold text-foreground text-lg">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="gap-1.5">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="gap-1.5">
            <FileDown className="w-4 h-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="gap-1.5">
            <Printer className="w-4 h-4" /> {bn ? 'প্রিন্ট' : 'Print'}
          </Button>
          <Button size="sm" className="btn-primary-gradient gap-1.5" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {bn ? 'সংরক্ষণ' : 'Save'}
          </Button>
        </div>
      </div>

      <div className="relative z-10 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-[133px] sm:top-[141px] lg:top-[164px] z-20 bg-background/95 backdrop-blur-sm shadow-sm">
            <tr className="border-b border-border">
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground w-10">#</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground">{bn ? 'রোল' : 'Roll'}</th>
              <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground min-w-[120px]">{bn ? 'নাম' : 'Name'}</th>
              {subjects.map((s: any) => (
                <th key={s.id} className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground min-w-[70px]">
                  {bn ? s.name_bn : s.name}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">{bn ? 'মোট' : 'Total'}</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">{bn ? 'গড়' : 'Avg'}</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">{bn ? 'গ্রেড' : 'Grade'}</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">GPA</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground min-w-[80px]">{bn ? 'মর্যাদা' : 'Title'}</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground">{bn ? 'মেধা' : 'Rank'}</th>
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {(() => {
              const studentsWithStats = students.map((st: any, idx: number) => {
                const hasEnteredAnyMark = subjects.some((sub: any) => marksMap[`${st.id}_${sub.id}`] !== undefined);
                const studentMarks = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`] ?? 0);
                const total = hasEnteredAnyMark ? studentMarks.reduce((a, b) => a + b, 0) : 0;
                const overall = hasEnteredAnyMark ? getOverallGrade(studentMarks, st.class_id) : null;
                const failed = overall ? ((overall as any).graced ? false : (studentMarks.some(m => m < passMark && m > 0) || overall.hasFail)) : false;
                return { st, studentMarks, total, overall, failed, hasEnteredAnyMark, originalIdx: idx };
              });

              const sortedForRank = [...studentsWithStats]
                .filter(a => a.hasEnteredAnyMark)
                .sort((a, b) => {
                  if (a.failed && !b.failed) return 1;
                  if (!a.failed && b.failed) return -1;
                  return b.total - a.total;
                });

              const rankMap = new Map<string, number>();
              sortedForRank.forEach((item, i) => {
                if (!item.failed) rankMap.set(item.st.id, i + 1);
              });

              return studentsWithStats.map(({ st, studentMarks, total, overall, failed, hasEnteredAnyMark, originalIdx }) => {
                const avg = subjects.length > 0 ? total / subjects.length : 0;
                const rank = rankMap.get(st.id);
                let rankDisplay = rank ? rank.toString() : '-';
                if (rank === 1) rankDisplay = bn ? '১ম' : '1st';
                else if (rank === 2) rankDisplay = bn ? '২য়' : '2nd';
                else if (rank === 3) rankDisplay = bn ? '৩য়' : '3rd';

                return (
                  <tr key={st.id} className={`hover:bg-muted/20 transition-colors ${failed ? 'bg-destructive/5' : ''}`}>
                    <td className="px-3 py-2 text-muted-foreground text-xs">{originalIdx + 1}</td>
                    <td className="px-3 py-2 font-medium text-foreground">
                      <div className="flex flex-col">
                        <span>{st.roll_number || '-'}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-foreground">{bn ? st.name_bn : (st.name_en || st.name_bn)}</td>
                  {subjects.map((sub: any) => {
                    const mark = marksMap[`${st.id}_${sub.id}`] ?? 0;
                    const isFail = mark < passMark && mark > 0;
                    return (
                      <td key={sub.id} className="px-1 py-1.5 text-center">
                        <Input
                          className={`w-16 h-8 text-center bg-background text-sm mx-auto focus:border-primary ${isFail ? 'border-destructive text-destructive' : 'border-border/50'}`}
                          type="text"
                          inputMode="numeric"
                          data-bijoy={bn}
                          value={mark === 0 ? '' : (bn ? toBnDigits(mark) : String(mark))}
                          onChange={(e) => {
                            const raw = toEnDigits(e.target.value).replace(/[^0-9]/g, '');
                            if (raw === '') { onMarksChange(`${st.id}_${sub.id}`, 0); return; }
                            let num = parseInt(raw, 10) || 0;
                            if (num > maxMarks) num = maxMarks;
                            onMarksChange(`${st.id}_${sub.id}`, num);
                          }}
                        />

                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-center font-bold text-foreground">{hasEnteredAnyMark ? total : '-'}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{hasEnteredAnyMark ? avg.toFixed(1) : '-'}</td>
                    <td className="px-3 py-2 text-center">
                      {overall ? (
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-semibold ${overall.color}`}>
                          {overall.grade}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">-</span>}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-primary">{overall ? overall.gpa : '-'}</td>
                    <td className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                      {overall ? (bn ? overall.title_bn : overall.title) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full ${rank && rank <= 3 ? 'bg-emerald-500/10 text-emerald-600 font-bold' : ''}`}>
                        {hasEnteredAnyMark ? rankDisplay : '-'}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => {
                          // Find rank from rankMap before viewing
                          const studentRank = rankMap.get(st.id);
                          onViewMarksheet(st.id, studentRank);
                        }}
                        className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                        title={bn ? 'মার্কশিট দেখুন' : 'View Marksheet'}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              });
            })()}
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="relative z-10 px-5 py-6 border-t border-border">
        <div className="grid grid-cols-3 gap-6 mt-6 pt-4">
          {[
            { label: bn ? 'পরীক্ষা নিয়ন্ত্রক' : 'Exam Controller' },
            { label: bn ? 'শিক্ষা সচিব' : 'Education Secretary' },
            { label: bn ? 'মুহতামিম' : 'Principal' },
          ].map((sig, i) => (
            <div key={i} className="text-center space-y-2">
              <div className="border-b border-dashed border-muted-foreground/40 mx-4 pb-1 min-h-[40px]" />
              <p className="text-xs font-semibold text-foreground">{sig.label}</p>
              <Input
                className="text-center text-xs h-7 border-dashed"
                placeholder={bn ? 'নাম লিখুন' : 'Enter name'}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export { getGrade };
export default ClassResultTable;
