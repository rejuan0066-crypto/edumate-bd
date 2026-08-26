import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Printer, Save, Loader2, Eye, FileDown, FileSpreadsheet, X, Calculator } from 'lucide-react';
import ResultCalculationDialog from '@/components/results/ResultCalculationDialog';
import { useState } from 'react';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import { exportResultCSV, exportResultPDF } from '@/lib/resultExport';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { toBnDigits, toEnDigits, formatOrdinalRank } from '@/lib/digits';
import { studentStats, rankStudents } from '@/lib/grading';
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
  const { getOverallGrade, getGraceLimit, scales, maxMarks, minMarks, passMark } = useGradingSystem();
  
  const tableRef = useRef<HTMLDivElement>(null);
  const [explainStudent, setExplainStudent] = useState<any | null>(null);

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

  // Pre-calculate stats and ranks (shared, unit-tested logic)
  const studentsWithStats = students.map((st: any, idx: number) => {
    const rawMarks = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`]);
    const stats = studentStats(st.id, rawMarks, {
      scales,
      passMark,
      graceLimit: getGraceLimit(st.class_id),
    });
    return { st, ...stats, originalIdx: idx };
  });

  const rankMap = rankStudents(studentsWithStats);

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
      <div className="max-h-[75vh] w-full overflow-y-auto overflow-x-auto relative scrollbar-thin scrollbar-thumb-muted-foreground/20 bg-background" ref={tableRef}>
        <table className="w-full min-w-full border-separate border-spacing-0 table-auto whitespace-nowrap">
          <thead className="sticky top-0 z-40 bg-white shadow-sm">
            <tr className="bg-white h-[56px]">
              {/* Sticky Columns Header */}
              <th className="sticky left-0 top-0 z-[60] bg-white border-b border-r border-border min-w-[32px] w-[32px] px-1 text-center text-[10px] sm:text-xs font-bold text-muted-foreground shadow-[1px_0_0_0_#e2e8f0]">
                <div className="flex items-center justify-center h-full">#</div>
              </th>
              <th className="sticky left-[32px] top-0 z-[60] bg-white border-b border-r border-border min-w-[48px] w-[48px] px-1 text-center text-[10px] sm:text-xs font-bold text-muted-foreground shadow-[1px_0_0_0_#e2e8f0]">
                <div className="flex items-center justify-center h-full">{bn ? 'রোল' : 'Roll'}</div>
              </th>
              <th className="sticky left-[80px] top-0 z-[60] bg-white border-b border-r border-border min-w-[120px] w-[130px] px-2 text-left text-[10px] sm:text-xs font-bold text-muted-foreground shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)]">
                <div className="flex items-center h-full">{bn ? 'নাম' : 'Name'}</div>
              </th>

              {/* Scrollable Columns Header */}
              {subjects.map((s: any) => (
                <th key={s.id} className="min-w-[64px] px-1 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                  <div className="flex items-center justify-center h-full whitespace-normal break-words leading-tight py-2 text-[9px] sm:text-[11px]">
                    {bn ? s.name_bn : s.name}
                  </div>
                </th>
              ))}
              <th className="min-w-[52px] px-1 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                <div className="flex items-center justify-center h-full">{bn ? 'মোট' : 'Total'}</div>
              </th>
              <th className="min-w-[48px] px-1 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                <div className="flex items-center justify-center h-full">{bn ? 'গড়' : 'Avg'}</div>
              </th>
              <th className="min-w-[48px] px-1 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                <div className="flex items-center justify-center h-full">{bn ? 'গ্রেড' : 'Grade'}</div>
              </th>
              <th className="min-w-[44px] px-1 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                <div className="flex items-center justify-center h-full">GPA</div>
              </th>
              <th className="min-w-[72px] px-1 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                <div className="flex items-center justify-center h-full">{bn ? 'মর্যাদা' : 'Title'}</div>
              </th>
              <th className="min-w-[52px] px-1 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                <div className="flex items-center justify-center h-full">{bn ? 'মেধা' : 'Rank'}</div>
              </th>
              <th className="min-w-[56px] px-1 text-center text-[10px] sm:text-xs font-bold text-muted-foreground border-b bg-white sticky top-0 z-40"></th>
            </tr>
          </thead>
          <tbody>
            {studentsWithStats.map(({ st, originalIdx, failed, total, avg, overall, hasEnteredAnyMark }) => {
              const rank = rankMap.get(st.id) || st.rank || st.merit_rank || st.merit_position;
              const rankDisplay = formatOrdinalRank(rank, bn);
              
              return (
                <tr key={st.id} className={`hover:bg-slate-50 transition-colors h-[56px] group ${failed ? 'bg-destructive/5' : ''}`}>
                  {/* Sticky Columns */}
                  <td className={`sticky left-0 z-20 border-b border-r border-border text-center text-[10px] sm:text-xs text-muted-foreground shadow-[1px_0_0_0_#e2e8f0] ${failed ? 'bg-[#fff5f5]' : 'bg-white'}`}>
                    <div className="flex items-center justify-center h-full">{bn ? toBnDigits(originalIdx + 1) : (originalIdx + 1)}</div>
                  </td>
                  <td className={`sticky left-[32px] z-20 border-b border-r border-border text-center text-[10px] sm:text-xs font-medium text-foreground shadow-[1px_0_0_0_#e2e8f0] ${failed ? 'bg-[#fff5f5]' : 'bg-white'}`}>
                    <div className="flex items-center justify-center h-full">{st.roll_number ? (bn ? toBnDigits(st.roll_number) : st.roll_number) : '-'}</div>
                  </td>
                  <td className={`sticky left-[80px] z-20 border-b border-r border-border px-2 text-[10px] sm:text-xs font-medium text-foreground truncate shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)] ${failed ? 'bg-[#fff5f5]' : 'bg-white'}`}>
                    <div className="flex items-center h-full">{bn ? st.name_bn : (st.name_en || st.name_bn)}</div>
                  </td>

                  {/* Scrollable Data Columns */}
                  {subjects.map((sub: any) => {
                    const mark = marksMap[`${st.id}_${sub.id}`] ?? 0;
                    const isFail = mark < passMark && mark > 0;
                    return (
                      <td key={sub.id} className="px-1 text-center border-b border-r border-border">
                        <div className="flex items-center justify-center h-full">
                          <Input
                            className={`w-full max-w-[56px] h-8 px-1 text-center bg-white border-2 rounded-lg text-[10px] sm:text-xs transition-all focus:ring-2 focus:ring-primary/20 ${isFail ? 'border-destructive/40 text-destructive focus:border-destructive' : 'border-border/60 focus:border-primary'}`}
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
                  
                  <td className="px-2 text-center text-[10px] sm:text-xs font-bold border-b border-r border-border">
                    <div className="flex items-center justify-center h-full bg-slate-50/50 rounded-md py-1">{hasEnteredAnyMark ? toBnDigits(total) : '-'}</div>
                  </td>
                  <td className="px-2 text-center text-[10px] sm:text-xs text-muted-foreground border-b border-r border-border">
                    <div className="flex items-center justify-center h-full">{hasEnteredAnyMark ? toBnDigits(avg.toFixed(1)) : '-'}</div>
                  </td>
                  <td className="px-2 text-center border-b border-r border-border">
                    <div className="flex items-center justify-center h-full">
                      {overall ? (
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-[9px] sm:text-[10px] font-bold shadow-sm ${overall.color}`}>
                          {String(overall.grade).toUpperCase()}
                        </span>
                      ) : '-'}
                    </div>
                  </td>
                  <td className="px-2 text-center text-[10px] sm:text-xs font-semibold text-primary border-b border-r border-border">
                    <div className="flex items-center justify-center h-full">{overall ? toBnDigits(overall.gpa) : '-'}</div>
                  </td>
                  <td className="px-2 text-center text-[9px] sm:text-[10px] font-medium text-muted-foreground border-b border-r border-border max-w-[120px]">
                    <div className="flex items-center justify-center h-full truncate">{overall ? (bn ? overall.title_bn : overall.title) : '-'}</div>
                  </td>
                  <td className="px-2 text-center text-[10px] sm:text-xs font-medium text-muted-foreground border-b border-r border-border">
                    <div className="flex items-center justify-center h-full">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full ${rank && rank <= 3 ? 'bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20' : ''}`}>
                        {hasEnteredAnyMark ? rankDisplay : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 text-center border-b">
                    <div className="flex items-center justify-center h-full gap-1">
                      <button
                        onClick={() => setExplainStudent(st)}
                        title={bn ? 'গণনার ব্যাখ্যা' : 'Calculation breakdown'}
                        className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all transform hover:scale-110"
                      >
                        <Calculator className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onViewMarksheet(st.id, rank)}
                        className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all transform hover:scale-110"
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
      
      <ResultCalculationDialog
        open={!!explainStudent}
        onOpenChange={(v) => { if (!v) setExplainStudent(null); }}
        student={explainStudent}
        subjects={subjects}
        marksMap={marksMap}
      />

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