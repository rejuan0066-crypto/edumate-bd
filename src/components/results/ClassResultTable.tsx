import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Printer, Save, Loader2, Eye, FileDown, FileSpreadsheet, X } from 'lucide-react';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import { exportResultCSV, exportResultPDF } from '@/lib/resultExport';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { toBnDigits, toEnDigits, formatOrdinalRank } from '@/lib/digits';
import React, { useRef, useEffect } from 'react';

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
  lastSaved?: { at: string; name: string } | null;
}

const ClassResultTable = ({ students, subjects, marksMap, onMarksChange, onSave, isSaving, title, onViewMarksheet, onClose, lastSaved }: ClassResultTableProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { getOverallGrade, maxMarks, minMarks, passMark } = useGradingSystem();
  
  const tableRef = useRef<HTMLDivElement>(null);

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

  // Pre-calculate stats and ranks
  const studentsWithStats = students.map((st: any, idx: number) => {
    const hasEnteredAnyMark = subjects.some((sub: any) => marksMap[`${st.id}_${sub.id}`] !== undefined);
    const studentMarks = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`] ?? 0);
    const total = hasEnteredAnyMark ? studentMarks.reduce((a, b) => a + b, 0) : 0;
    const overall = hasEnteredAnyMark ? getOverallGrade(studentMarks, st.class_id) : null;
    const failed = overall ? ((overall as any).graced ? false : (studentMarks.some(m => m < passMark && m > 0) || overall.hasFail)) : false;
    const avg = subjects.length > 0 ? total / subjects.length : 0;
    return { st, studentMarks, total, avg, overall, failed, hasEnteredAnyMark, originalIdx: idx };
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

  return (
    <div className="card-elevated rounded-xl overflow-hidden relative flex flex-col h-full bg-background">
      {/* Institution Header */}
      <div className="border-b border-border bg-background px-5 py-4 text-center shrink-0">
        <div className="flex flex-col items-center justify-center gap-2">
          {institution?.logo_url && (
            <img src={institution.logo_url} alt="" className="w-12 h-12 object-contain rounded" />
          )}
          <div>
            <h2 className="text-base font-bold text-foreground">{instName || ''}</h2>
            <h3 className="font-display font-bold text-foreground text-lg mt-1">{title}</h3>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-background shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title={bn ? 'বন্ধ করুন' : 'Close'}>
              <X className="w-5 h-5" />
            </button>
          )}
          {lastSaved?.at && (
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
              {bn ? 'সর্বশেষ সংরক্ষণ' : 'Last saved'}: {new Date(lastSaved.at).toLocaleString(bn ? 'bn-BD' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="h-8 px-2 sm:px-3 text-[10px] sm:text-sm gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Excel</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="h-8 px-2 sm:px-3 text-[10px] sm:text-sm gap-1">
            <FileDown className="w-3.5 h-3.5" /> <span className="hidden xs:inline">PDF</span>
          </Button>
          <Button size="sm" className="btn-primary-gradient h-8 px-2 sm:px-3 text-[10px] sm:text-sm gap-1" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {bn ? 'সংরক্ষণ' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Main Grid Container */}
      <div className="flex-1 overflow-auto relative" ref={tableRef}>
        <table className="w-full border-collapse table-fixed">
          <thead className="sticky top-0 z-40">
            <tr className="bg-slate-50 border-b border-border h-[48px]">
              {/* Sticky Columns Header */}
              <th className="sticky left-0 z-50 bg-slate-50 border-r border-border w-8 sm:w-10 px-1 sm:px-2 text-center text-[10px] sm:text-xs font-bold text-muted-foreground flex items-center justify-center h-[48px]">#</th>
              <th className="sticky left-[32px] sm:left-[40px] z-50 bg-slate-50 border-r border-border w-10 sm:w-16 px-1 sm:px-2 text-center text-[10px] sm:text-xs font-bold text-muted-foreground flex items-center justify-center h-[48px]">{bn ? 'রোল' : 'Roll'}</th>
              <th className="sticky left-[72px] sm:left-[104px] z-50 bg-slate-50 border-r border-border w-[80px] xs:w-[140px] sm:w-[180px] px-2 text-left text-[10px] sm:text-xs font-bold text-muted-foreground flex items-center h-[48px]">{bn ? 'নাম' : 'Name'}</th>
              
              {/* Scrollable Columns Header */}
              {subjects.map((s: any) => (
                <th key={s.id} className="min-w-[70px] sm:min-w-[90px] px-2 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-r border-border bg-slate-50 h-[48px]">
                  <div className="flex items-center justify-center h-full whitespace-normal break-words leading-tight py-1">
                    {bn ? s.name_bn : s.name}
                  </div>
                </th>
              ))}
              <th className="w-[60px] sm:w-[80px] px-2 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-r border-border bg-slate-50 h-[48px]">
                <div className="flex items-center justify-center h-full">{bn ? 'মোট' : 'Total'}</div>
              </th>
              <th className="w-[60px] sm:w-[80px] px-2 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-r border-border bg-slate-50 h-[48px]">
                <div className="flex items-center justify-center h-full">{bn ? 'গড়' : 'Avg'}</div>
              </th>
              <th className="w-[60px] sm:w-[80px] px-2 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-r border-border bg-slate-50 h-[48px]">
                <div className="flex items-center justify-center h-full">{bn ? 'গ্রেড' : 'Grade'}</div>
              </th>
              <th className="w-[60px] sm:w-[80px] px-2 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-r border-border bg-slate-50 h-[48px]">
                <div className="flex items-center justify-center h-full">GPA</div>
              </th>
              <th className="w-[80px] sm:w-[100px] px-2 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-r border-border bg-slate-50 h-[48px]">
                <div className="flex items-center justify-center h-full">{bn ? 'মর্যাদা' : 'Title'}</div>
              </th>
              <th className="w-[60px] sm:w-[80px] px-2 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-r border-border bg-slate-50 h-[48px]">
                <div className="flex items-center justify-center h-full">{bn ? 'মেধা' : 'Rank'}</div>
              </th>
              <th className="w-[50px] px-2 text-center text-[10px] sm:text-xs font-bold text-muted-foreground bg-slate-50 h-[48px]"></th>
            </tr>
          </thead>
          <tbody>
            {studentsWithStats.map(({ st, originalIdx, failed, total, avg, overall, hasEnteredAnyMark }) => {
              const rank = rankMap.get(st.id);
              const rankDisplay = formatOrdinalRank(rank, true);
              
              return (
                <tr key={st.id} className={`border-b border-border hover:bg-slate-50 transition-colors h-[48px] ${failed ? 'bg-destructive/5' : 'bg-white'}`}>
                  {/* Sticky Columns */}
                  <td className="sticky left-0 z-20 bg-inherit border-r border-border text-center text-[10px] sm:text-xs text-muted-foreground h-[48px]">
                    <div className="flex items-center justify-center h-full">{toBnDigits(originalIdx + 1)}</div>
                  </td>
                  <td className="sticky left-[32px] sm:left-[40px] z-20 bg-inherit border-r border-border text-center text-[10px] sm:text-xs font-medium text-foreground h-[48px]">
                    <div className="flex items-center justify-center h-full">{st.roll_number ? toBnDigits(st.roll_number) : '-'}</div>
                  </td>
                  <td className="sticky left-[72px] sm:left-[104px] z-20 bg-inherit border-r border-border px-2 text-[10px] sm:text-xs font-medium text-foreground truncate h-[48px]">
                    <div className="flex items-center h-full">{bn ? st.name_bn : (st.name_en || st.name_bn)}</div>
                  </td>

                  {/* Scrollable Data Columns */}
                  {subjects.map((sub: any) => {
                    const mark = marksMap[`${st.id}_${sub.id}`] ?? 0;
                    const isFail = mark < passMark && mark > 0;
                    return (
                      <td key={sub.id} className="px-1 text-center border-r border-border h-[48px]">
                        <div className="flex items-center justify-center h-full">
                          <Input
                            className={`w-full h-8 text-center bg-transparent text-[10px] sm:text-sm focus:border-primary ${isFail ? 'border-destructive text-destructive' : 'border-border/50'}`}
                            type="text"
                            inputMode="numeric"
                            data-bijoy={bn}
                            value={mark === 0 ? '' : toBnDigits(mark)}
                            onChange={(e) => {
                              const raw = toEnDigits(e.target.value).replace(/[^0-9]/g, '');
                              if (raw === '') { onMarksChange(`${st.id}_${sub.id}`, 0); return; }
                              let num = parseInt(raw, 10) || 0;
                              if (num > maxMarks) num = maxMarks;
                              onMarksChange(`${st.id}_${sub.id}`, num);
                            }}
                          />
                        </div>
                      </td>
                    );
                  })}
                  
                  <td className="px-2 text-center text-[10px] sm:text-xs font-bold border-r border-border h-[48px]">
                    <div className="flex items-center justify-center h-full">{hasEnteredAnyMark ? toBnDigits(total) : '-'}</div>
                  </td>
                  <td className="px-2 text-center text-[10px] sm:text-xs text-muted-foreground border-r border-border h-[48px]">
                    <div className="flex items-center justify-center h-full">{hasEnteredAnyMark ? toBnDigits(avg.toFixed(1)) : '-'}</div>
                  </td>
                  <td className="px-2 text-center border-r border-border h-[48px]">
                    <div className="flex items-center justify-center h-full">
                      {overall ? (
                        <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold ${overall.color}`}>
                          {String(overall.grade).toUpperCase()}
                        </span>
                      ) : '-'}
                    </div>
                  </td>
                  <td className="px-2 text-center text-[10px] sm:text-xs font-semibold text-primary border-r border-border h-[48px]">
                    <div className="flex items-center justify-center h-full">{overall ? toBnDigits(overall.gpa) : '-'}</div>
                  </td>
                  <td className="px-2 text-center text-[9px] sm:text-[10px] font-medium text-muted-foreground border-r border-border truncate h-[48px]">
                    <div className="flex items-center justify-center h-full">{overall ? (bn ? overall.title_bn : overall.title) : '-'}</div>
                  </td>
                  <td className="px-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground border-r border-border h-[48px]">
                    <div className="flex items-center justify-center h-full">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full ${rank && rank <= 3 ? 'bg-emerald-500/10 text-emerald-600 font-bold' : ''}`}>
                        {hasEnteredAnyMark ? rankDisplay : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 text-center h-[48px]">
                    <div className="flex items-center justify-center h-full">
                      <button
                        onClick={() => onViewMarksheet(st.id, rank)}
                        className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Signature Section */}
      <div className="px-5 py-6 border-t border-border bg-background shrink-0">
        <div className="grid grid-cols-3 gap-2 sm:gap-6 mt-2 pt-2">
          {[
            { label: bn ? 'পরীক্ষা নিয়ন্ত্রক' : 'Exam Controller' },
            { label: bn ? 'শিক্ষা সচিব' : 'Education Secretary' },
            { label: bn ? 'মুহতামিম' : 'Principal' },
          ].map((sig, i) => (
            <div key={i} className="text-center space-y-1 sm:space-y-2">
              <div className="border-b border-dashed border-muted-foreground/40 mx-2 sm:mx-4 pb-1 min-h-[30px] sm:min-h-[40px]" />
              <p className="text-[9px] sm:text-xs font-semibold text-foreground truncate">{sig.label}</p>
              <Input
                className="text-center text-[9px] sm:text-xs h-6 sm:h-7 border-dashed"
                placeholder={bn ? 'নাম লিখুন' : 'Enter name'}
              />
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export { getGrade };
export default ClassResultTable;