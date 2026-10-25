import { useLanguage } from '@/contexts/LanguageContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Printer, Save, Loader2, Eye, FileDown, FileSpreadsheet, X, Calculator, ChevronDown, UserX, Trash2, RotateCcw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import ResultCalculationDialog from '@/components/results/ResultCalculationDialog';
import { useState } from 'react';
import { useGradingSystem } from '@/hooks/useGradingSystem';
import { exportResultCSV, exportResultPDF, getResultSheetHtml } from '@/lib/resultExport';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchInstitutionInfo } from '@/hooks/useInstitutionInfo';
import { toBnDigits, toEnDigits, formatOrdinalRank } from '@/lib/digits';
import { studentStats, rankStudents, gradeFromMark, isAbsentMark } from '@/lib/grading';
import React, { useRef, useEffect, useMemo } from 'react';

// Per-subject grade helper (total-based scale, no average anywhere)
const getGrade = (mark: number, fullMarks = 100) => gradeFromMark(mark, fullMarks);


interface ClassResultTableProps {
  students: any[];
  subjects: any[];
  marksMap: Record<string, number | string>;
  onMarksChange: (key: string, value: number | string) => void;
  onSave: () => void;
  isSaving: boolean;
  title: string;
  onViewMarksheet: (studentId: string, rank?: number) => void;
  onClose?: () => void;
  lastSaved?: { at: string; name: string } | null;
  /** Read-only preview of saved results (no editing / saving) */
  readOnly?: boolean;
  onEdit?: () => void;
  className?: string;
  examName?: string;
  sessionName?: string;
  signatories?: any[];
  statusOverrides?: Record<string, 'fail' | 'grace_pass' | 'auto'>;
  onStatusOverrideChange?: (studentId: string, status: 'fail' | 'grace_pass' | 'auto') => void;
}

const ClassResultTable = ({ 
  students, subjects, marksMap, onMarksChange, onSave, isSaving, title, 
  onViewMarksheet, onClose, lastSaved, readOnly = false, onEdit, 
  className: classNameProp, examName, sessionName, signatories,
  statusOverrides = {}, onStatusOverrideChange
}: ClassResultTableProps) => {
  const { language } = useLanguage();
  const bn = language === 'bn';
  const { getOverallGrade, getGraceLimit, scales, maxMarks, minMarks, passMark, gracePass } = useGradingSystem();
  
  const tableRef = useRef<HTMLDivElement>(null);
  const [explainStudent, setExplainStudent] = useState<any | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'fail_or_grace'>('all');

  const { data: fallbackSignatories } = useQuery({
    queryKey: ['result-signatories'],
    queryFn: async () => {
      const { data: v2Data } = await supabase.from('website_settings').select('value').eq('key', 'result_signatories_v2').maybeSingle();
      if (Array.isArray(v2Data?.value) && v2Data.value.length) {
        return (v2Data.value as any[]).map(r => {
          const isAct = r.show_name !== false && r.enabled !== false;
          return { ...r, show_name: isAct, enabled: isAct };
        });
      }
      const { data } = await supabase.from('website_settings').select('value').eq('key', 'result_signatories').maybeSingle();
      if (Array.isArray(data?.value)) {
        return (data.value as any[]).map(r => {
          const isAct = r.show_name !== false && r.name_bn !== '—' && r.name_bn !== '-';
          return { ...r, show_name: isAct, enabled: isAct };
        });
      }
      return [];
    },
    staleTime: 60 * 1000,
  });

  const activeSignatories = signatories && signatories.length ? signatories : fallbackSignatories;

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
      className: classNameProp,
      examName,
      sessionName,
      signatories: activeSignatories,
      statusOverrides,
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
    const override = statusOverrides?.[st.id] || 'auto';
    const stats = studentStats(st.id, rawMarks, {
      scales,
      passMark,
      fullMarks: maxMarks,
      graceLimit: getGraceLimit(st.class_id),
      graceGrade: gracePass?.grade,
      minAggregatePercent: gracePass?.min_aggregate_percent,
      maxMarkDeficit: gracePass?.max_mark_deficit,
      override,
    });

    return { st, ...stats, originalIdx: idx };
  });

  const rankMap = rankStudents(studentsWithStats);

  const failedOrGracedCount = studentsWithStats.filter(s => s.failed || s.overall?.graced || (statusOverrides?.[s.st.id] && statusOverrides[s.st.id] !== 'auto')).length;

  const displayedStudents = filterMode === 'fail_or_grace'
    ? studentsWithStats.filter(s => s.failed || s.overall?.graced || (statusOverrides?.[s.st.id] && statusOverrides[s.st.id] !== 'auto'))
    : studentsWithStats;

  const sheetHtml = useMemo(() => {
    if (!readOnly) return '';
    try {
      return getResultSheetHtml({
        title,
        students,
        subjects,
        marksMap,
        getOverallGrade,
        bn,
        institutionName: instName,
        institutionLogo: institution?.logo_url || undefined,
        institutionAddress: institution?.address || undefined,
        institutionPhone: institution?.phone || undefined,
        className: classNameProp,
        examName,
        sessionName,
        passMark,
        signatories: activeSignatories,
        statusOverrides,
      });
    } catch (e) {
      console.error('Result sheet preview failed', e);
      return '';
    }
  }, [readOnly, title, students, subjects, marksMap, bn, instName, institution, classNameProp, examName, sessionName, passMark, getOverallGrade, activeSignatories, statusOverrides]);

  // Scale pages to fit iframe width and report full content height to parent
  const previewHtml = useMemo(() => {
    if (!sheetHtml) return '';
    const inject = `
<style>
  @media screen {
    html,body{background:#f1f5f9 !important;overflow-x:hidden !important;min-width:0 !important;padding:0 !important;}
    #fitwrap{transform-origin:top left;}
  }
</style>
<script>
  (function(){
    function fit(){
      var pages = document.querySelectorAll('.result-page');
      if(!pages.length) return;
      var wrap = document.getElementById('fitwrap');
      if(!wrap){
        wrap = document.createElement('div');
        wrap.id='fitwrap';
        var host = pages[0].parentNode;
        host.insertBefore(wrap, pages[0]);
        pages.forEach(function(p){ wrap.appendChild(p); });
      }
      wrap.style.transform='none';
      var pw = wrap.scrollWidth || 1;
      var avail = document.documentElement.clientWidth - 16;
      var scale = Math.min(1, avail / pw);
      wrap.style.transform = 'scale(' + scale + ')';
      wrap.style.width = pw + 'px';
      var h = wrap.scrollHeight * scale + 24;
      document.body.style.height = h + 'px';
      window.parent.postMessage({ type: 'result-sheet-height', height: Math.ceil(h) }, '*');
    }
    window.addEventListener('load', function(){ fit(); setTimeout(fit, 300); });
    window.addEventListener('resize', fit);
    setTimeout(fit, 100);
  })();
<\/script>`;
    return sheetHtml.includes('</body>') ? sheetHtml.replace('</body>', inject + '</body>') : sheetHtml + inject;
  }, [sheetHtml]);

  const [previewHeight, setPreviewHeight] = useState(900);
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'result-sheet-height' && typeof e.data.height === 'number') {
        setPreviewHeight(Math.max(400, Math.min(20000, e.data.height)));
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colIdx: number) => {
    let targetRow = rowIdx;
    let targetCol = colIdx;

    if (e.key === 'Enter' || e.key === 'ArrowDown') {
      e.preventDefault();
      targetRow = rowIdx + 1;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      targetRow = rowIdx - 1;
    } else if (e.key === 'ArrowRight' && (e.currentTarget.selectionStart === e.currentTarget.value.length || !e.currentTarget.value)) {
      if (colIdx < subjects.length - 1) {
        e.preventDefault();
        targetCol = colIdx + 1;
      }
    } else if (e.key === 'ArrowLeft' && e.currentTarget.selectionStart === 0) {
      if (colIdx > 0) {
        e.preventDefault();
        targetCol = colIdx - 1;
      }
    } else {
      return;
    }

    const nextInput = document.querySelector<HTMLInputElement>(`input[data-row="${targetRow}"][data-col="${targetCol}"]`);
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  };

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
            <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
              <h3 className="font-display font-bold text-foreground text-lg">{title}</h3>
              {readOnly ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-muted text-foreground border border-border">
                  {bn ? '📋 ক্লাস রেজাল্ট শিট' : 'Tabulation Sheet'}
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                  {bn ? '✍️ নম্বর এন্ট্রি মোড' : 'Marks Entry Mode'}
                </span>
              )}
            </div>
            {!readOnly && (
              <p className="text-[11px] text-muted-foreground mt-1">
                {bn ? '💡 কীবোর্ডের Tab চেপে সহজে এক ঘর থেকে অন্য ঘরে যাওয়া যাবে। কোনো বিষয় খালি বা ০ থাকলে অকৃতকার্য হিসেব হবে।' : 'Tip: Press Tab to move across cells. Empty or 0 marks count as Fail.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-5 py-3 border-b border-border bg-background shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors" title={bn ? 'বন্ধ করুন' : 'Close'}>
              <X className="w-5 h-5" />
            </button>
          )}
          {lastSaved?.at && (
            <p className="text-[10px] sm:text-xs text-muted-foreground hidden lg:block">
              {bn ? 'সর্বশেষ সংরক্ষণ' : 'Last saved'}: {new Date(lastSaved.at).toLocaleString(bn ? 'bn-BD' : 'en-GB', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          )}

          {/* Quick Filter: All vs Failed & Graced */}
          <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border text-[11px] sm:text-xs">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-2 py-1 rounded-md transition-all font-medium ${filterMode === 'all' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {bn ? `সব শিক্ষার্থী (${toBnDigits(students.length)})` : `All (${students.length})`}
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('fail_or_grace')}
              className={`px-2 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${filterMode === 'fail_or_grace' ? 'bg-background shadow-xs text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <span>{bn ? 'অকৃতকার্য ও বিবেচনায়' : 'Failed & Graced'}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${failedOrGracedCount > 0 ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                {bn ? toBnDigits(failedOrGracedCount) : failedOrGracedCount}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')} className="h-9 px-3 text-xs sm:text-sm font-semibold gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> <span className="hidden xs:inline">Excel</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="h-9 px-3 text-xs sm:text-sm font-semibold gap-1.5">
            <FileDown className="w-4 h-4 text-rose-600" /> <span className="hidden xs:inline">PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-9 px-3 text-xs sm:text-sm font-semibold gap-1.5">
            <Printer className="w-4 h-4 text-slate-700 dark:text-slate-300" /> <span className="hidden xs:inline">{bn ? 'প্রিন্ট' : 'Print'}</span>
          </Button>
          {!readOnly && (
            <Button size="sm" className="btn-primary-gradient h-9 px-4 text-xs sm:text-sm font-semibold gap-1.5" onClick={onSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {bn ? 'সংরক্ষণ' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {readOnly ? (
        <div className="w-full overflow-y-auto overflow-x-hidden bg-slate-100">
          <iframe
            title={title}
            srcDoc={previewHtml}
            scrolling="no"
            className="w-full block bg-slate-100 border-0"
            style={{ height: previewHeight }}
          />
        </div>
      ) : (
        <>
      {/* Main Grid Container */}
      <div className="max-h-[75vh] w-full overflow-y-auto overflow-x-auto relative scrollbar-thin scrollbar-thumb-muted-foreground/20 bg-background" ref={tableRef}>
        <table className="w-full min-w-full border-separate border-spacing-0 table-auto whitespace-nowrap">
          <thead className="sticky top-0 z-40 bg-white shadow-sm">
            <tr className="bg-white h-[56px]">
              {/* Sticky Columns Header */}
              <th className="sticky left-0 top-0 z-[60] bg-white border-b border-r border-border w-[40px] min-w-[40px] max-w-[40px] px-1 text-center text-xs sm:text-sm font-bold text-muted-foreground shadow-[1px_0_0_0_#e2e8f0]">
                <div className="flex items-center justify-center h-full">#</div>
              </th>
              <th className="sticky left-[40px] top-0 z-[60] bg-white border-b border-r border-border w-[58px] min-w-[58px] max-w-[58px] px-1 text-center text-xs sm:text-sm font-bold text-muted-foreground shadow-[1px_0_0_0_#e2e8f0]">
                <div className="flex items-center justify-center h-full">{bn ? 'রোল' : 'Roll'}</div>
              </th>
              <th className="sticky left-[98px] top-0 z-[60] bg-white border-b border-r border-border w-[160px] min-w-[160px] max-w-[160px] px-2 text-left text-xs sm:text-sm font-bold text-muted-foreground shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)]">
                <div className="flex items-center h-full">{bn ? 'নাম' : 'Name'}</div>
              </th>

              {/* Scrollable Columns Header */}
              {subjects.map((s: any) => (
                <th key={s.id} className="w-[90px] min-w-[90px] max-w-[90px] px-1 text-center text-xs sm:text-sm font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                  <div className="flex items-center justify-center h-full text-center whitespace-normal break-words leading-snug py-1.5 text-xs sm:text-sm font-bold line-clamp-2" title={bn ? s.name_bn : s.name}>
                    {bn ? s.name_bn : s.name}
                  </div>
                </th>
              ))}
              <th className="w-[70px] min-w-[70px] max-w-[70px] px-1 text-center text-xs sm:text-sm font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                <div className="flex items-center justify-center h-full">{bn ? 'মোট' : 'Total'}</div>
              </th>
              <th className="w-[64px] min-w-[64px] max-w-[64px] px-1 text-center text-xs sm:text-sm font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                <div className="flex items-center justify-center h-full">{bn ? 'গ্রেড' : 'Grade'}</div>
              </th>
              <th className="w-[64px] min-w-[64px] max-w-[64px] px-1 text-center text-xs sm:text-sm font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                <div className="flex items-center justify-center h-full">GPA</div>
              </th>
              <th className="w-[130px] min-w-[130px] max-w-[130px] px-1 text-center text-xs sm:text-sm font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                <div className="flex items-center justify-center h-full">{bn ? 'মর্যাদা' : 'Title'}</div>
              </th>
              <th className="w-[64px] min-w-[64px] max-w-[64px] px-1 text-center text-xs sm:text-sm font-bold text-muted-foreground border-b border-r border-border bg-white sticky top-0 z-40">
                <div className="flex items-center justify-center h-full">{bn ? 'মেধা' : 'Rank'}</div>
              </th>
              <th className="w-[68px] min-w-[68px] max-w-[68px] px-1 text-center text-xs sm:text-sm font-bold text-muted-foreground border-b bg-white sticky top-0 z-40"></th>
            </tr>
          </thead>
          <tbody>
            {displayedStudents.map(({ st, originalIdx, failed, total, overall, hasEnteredAnyMark, isAllAbsent }, rowIdx) => {
              const rank = rankMap.get(st.id) || st.rank || st.merit_rank || st.merit_position;
              const rankDisplay = formatOrdinalRank(rank, bn);
              
              return (
                <tr key={st.id} className={`hover:bg-slate-50 transition-colors h-[56px] group ${isAllAbsent ? 'bg-amber-500/5' : failed ? 'bg-destructive/5' : ''}`}>
                  {/* Sticky Columns */}
                  <td className={`sticky left-0 z-20 border-b border-r border-border w-[40px] min-w-[40px] max-w-[40px] text-center text-xs sm:text-sm text-muted-foreground shadow-[1px_0_0_0_#e2e8f0] ${isAllAbsent ? 'bg-[#fffbf0]' : failed ? 'bg-[#fff5f5]' : 'bg-white'}`}>
                    <div className="flex items-center justify-center h-full">{bn ? toBnDigits(originalIdx + 1) : (originalIdx + 1)}</div>
                  </td>
                  <td className={`sticky left-[40px] z-20 border-b border-r border-border w-[58px] min-w-[58px] max-w-[58px] text-center text-xs sm:text-sm font-semibold text-foreground shadow-[1px_0_0_0_#e2e8f0] ${isAllAbsent ? 'bg-[#fffbf0]' : failed ? 'bg-[#fff5f5]' : 'bg-white'}`}>
                    <div className="flex items-center justify-center h-full">{st.roll_number ? (bn ? toBnDigits(st.roll_number) : st.roll_number) : '-'}</div>
                  </td>
                  <td className={`sticky left-[98px] z-20 border-b border-r border-border w-[160px] min-w-[160px] max-w-[160px] px-2 text-xs sm:text-sm font-semibold text-foreground truncate shadow-[2px_0_8px_-2px_rgba(0,0,0,0.1)] ${isAllAbsent ? 'bg-[#fffbf0]' : failed ? 'bg-[#fff5f5]' : 'bg-white'}`}>
                    <div className="flex items-center h-full truncate">{bn ? st.name_bn : (st.name_en || st.name_bn)}</div>
                  </td>

                  {/* Scrollable Data Columns */}
                  {subjects.map((sub: any, colIdx: number) => {
                    const rawVal = marksMap[`${st.id}_${sub.id}`];
                    const isAbsent = isAbsentMark(rawVal);
                    const isEntered = !isAbsent && rawVal !== undefined && rawVal !== null && (rawVal as any) !== '' && !Number.isNaN(Number(rawVal));
                    const mark = isEntered ? Number(rawVal) : null;
                    const isFail = isEntered && mark !== null && mark < passMark;
                    return (
                      <td key={sub.id} className="w-[90px] min-w-[90px] max-w-[90px] px-1 text-center border-b border-r border-border">
                        <div className="flex items-center justify-center h-full">
                          {readOnly ? (
                            isAbsent ? (
                              <span className="text-xs sm:text-sm font-extrabold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded shadow-xs" title={bn ? 'অনুপস্থিত' : 'Absent'}>
                                {bn ? 'অনুপস্থিত' : 'Abs'}
                              </span>
                            ) : (
                              <span className={`text-sm sm:text-base font-bold ${isFail ? 'text-destructive' : 'text-foreground'}`}>
                                {!isEntered ? '-' : (bn ? toBnDigits(mark) : mark)}
                              </span>
                            )
                          ) : (
                            isAbsent ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    className="w-[74px] h-9 px-1 bg-amber-100/90 hover:bg-amber-200/90 text-amber-900 border-2 border-amber-400/80 rounded-lg text-xs font-bold flex items-center justify-center gap-0.5 transition-all shadow-xs"
                                    title={bn ? 'অনুপস্থিত (ক্লিক করে পরিবর্তন করুন)' : 'Absent (click to change)'}
                                  >
                                    <span className="truncate">{bn ? 'অনুপস্থিত' : 'Abs'}</span>
                                    <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="center" className="w-40">
                                  <DropdownMenuItem onClick={() => onMarksChange(`${st.id}_${sub.id}`, '' as any)}>
                                    <RotateCcw className="h-3.5 w-3.5 mr-2 text-primary" />
                                    {bn ? 'নম্বর লিখুন' : 'Enter Marks'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onMarksChange(`${st.id}_${sub.id}`, '' as any)}>
                                    <Trash2 className="h-3.5 w-3.5 mr-2 text-destructive" />
                                    {bn ? 'খালি করুন' : 'Clear'}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <div className="relative flex items-center justify-center">
                                <Input
                                  data-row={rowIdx}
                                  data-col={colIdx}
                                  className={`w-[72px] h-9 pl-1 pr-4 text-center bg-white border-2 rounded-lg text-sm sm:text-base font-bold transition-all focus:ring-2 focus:ring-primary/20 ${isFail ? 'border-destructive/40 text-destructive focus:border-destructive' : 'border-border/60 focus:border-primary'}`}
                                  type="text"
                                  inputMode="numeric"
                                  data-bijoy={bn}
                                  placeholder="-"
                                  value={!isEntered ? '' : (bn ? toBnDigits(mark) : String(mark))}
                                  onFocus={(e) => e.target.select()}
                                  onKeyDown={(e) => handleKeyDown(e, rowIdx, colIdx)}
                                  onChange={(e) => {
                                    const rawInput = e.target.value;
                                    const lower = rawInput.trim().toLowerCase();
                                    if (lower === 'a' || lower === 'abs' || lower === 'absent' || lower === '/absent' || lower === 'অনুপস্থিত') {
                                      onMarksChange(`${st.id}_${sub.id}`, 'abs');
                                      return;
                                    }
                                    const raw = toEnDigits(rawInput).replace(/[^0-9]/g, '');
                                    if (raw === '') {
                                      onMarksChange(`${st.id}_${sub.id}`, '' as any);
                                      return;
                                    }
                                    let num = parseInt(raw, 10) || 0;
                                    const subjectMax = sub.full_marks || maxMarks || 100;
                                    if (num > subjectMax) num = subjectMax;
                                    onMarksChange(`${st.id}_${sub.id}`, num);
                                  }}
                                />
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button
                                      type="button"
                                      tabIndex={-1}
                                      className="absolute right-0.5 w-4 h-8 flex items-center justify-center text-muted-foreground/60 hover:text-foreground hover:bg-slate-100 rounded transition-colors"
                                      title={bn ? 'অপশন (অনুপস্থিত)' : 'Options (Absent)'}
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-36">
                                    <DropdownMenuItem onClick={() => onMarksChange(`${st.id}_${sub.id}`, 'abs')}>
                                      <UserX className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                      <span className="font-semibold text-amber-700">{bn ? 'অনুপস্থিত' : 'Absent (Abs)'}</span>
                                    </DropdownMenuItem>
                                    {isEntered && (
                                      <DropdownMenuItem onClick={() => onMarksChange(`${st.id}_${sub.id}`, '' as any)}>
                                        <Trash2 className="h-3.5 w-3.5 mr-2 text-destructive" />
                                        {bn ? 'খালি করুন' : 'Clear'}
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            )
                          )}
                        </div>
                      </td>
                    );
                  })}
                  
                  <td className="w-[70px] min-w-[70px] max-w-[70px] px-1 text-center text-sm sm:text-base font-bold border-b border-r border-border">
                    <div className="flex items-center justify-center h-full bg-slate-50/50 rounded-md py-1">
                      {hasEnteredAnyMark ? (isAllAbsent ? '-' : toBnDigits(total)) : '-'}
                    </div>
                  </td>
                  <td className="w-[64px] min-w-[64px] max-w-[64px] px-1 text-center border-b border-r border-border">
                    <div className="flex items-center justify-center h-full">
                      {overall ? (
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-extrabold shadow-sm ${overall.color}`}>
                          {String(overall.grade).toUpperCase()}
                        </span>
                      ) : '-'}
                    </div>
                  </td>
                  <td className="w-[64px] min-w-[64px] max-w-[64px] px-1 text-center text-sm sm:text-base font-bold text-primary border-b border-r border-border">
                    <div className="flex items-center justify-center h-full">
                      {overall ? (overall.gpa === '-' ? '-' : toBnDigits(overall.gpa)) : '-'}
                    </div>
                  </td>
                  <td className="w-[130px] min-w-[130px] max-w-[130px] px-1 text-center text-xs sm:text-sm font-semibold border-b border-r border-border">
                    <div className="flex items-center justify-center h-full">
                      {(() => {
                        const isEligibleForChange = !isAllAbsent && (failed || overall?.graced || (statusOverrides?.[st.id] && statusOverrides[st.id] !== 'auto'));
                        const currentVal = statusOverrides?.[st.id] === 'grace_pass'
                          ? 'grace_pass'
                          : statusOverrides?.[st.id] === 'fail'
                          ? 'fail'
                          : overall?.graced
                          ? 'grace_pass'
                          : failed
                          ? 'fail'
                          : 'auto';

                        if (readOnly || !isEligibleForChange || isAllAbsent) {
                          return (
                            <div className="truncate flex items-center justify-center gap-1 font-semibold text-foreground text-xs sm:text-sm">
                              <span>{isAllAbsent ? (bn ? 'অনুপস্থিত' : 'Absent') : overall ? (bn ? overall.title_bn : overall.title) : '-'}</span>
                              {!isAllAbsent && statusOverrides?.[st.id] && statusOverrides[st.id] !== 'auto' && (
                                <span className="text-[10px] text-amber-600 font-bold px-1 rounded bg-amber-50 border border-amber-200" title={bn ? 'ম্যানুয়াল পরিবর্তিত' : 'Manually modified'}>
                                  {statusOverrides[st.id] === 'fail' ? (bn ? 'ফেল' : 'F') : (bn ? 'বিবেচনা' : 'G')}
                                </span>
                              )}
                            </div>
                          );
                        }

                        return (
                          <select
                            value={currentVal}
                            onChange={(e) => onStatusOverrideChange?.(st.id, e.target.value as any)}
                            className={`text-xs font-semibold rounded px-2 py-1 border transition-all ${
                              currentVal === 'fail'
                                ? 'border-destructive/60 text-destructive bg-destructive/10'
                                : 'border-amber-500/70 text-amber-800 bg-amber-500/15'
                            } focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer w-full max-w-[120px] truncate`}
                            title={bn ? 'ফলাফল পরিবর্তন (ফেইল ⇄ বিবেচনায় পাস)' : 'Toggle Fail / Grace Pass'}
                          >
                            <option value="fail">
                              {bn ? 'অকৃতকার্য (রাসিব)' : 'Fail (Rasib)'}
                            </option>
                            <option value="grace_pass">
                              {bn ? 'মাকবুল (বিবেচনায়)' : 'Grace Pass (Maqbul)'}
                            </option>
                          </select>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="w-[64px] min-w-[64px] max-w-[64px] px-1 text-center text-xs sm:text-sm font-semibold text-muted-foreground border-b border-r border-border">
                    <div className="flex items-center justify-center h-full">
                      <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full ${rank && rank <= 3 ? 'bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20' : ''}`}>
                        {hasEnteredAnyMark && !isAllAbsent ? rankDisplay : '-'}
                      </span>
                    </div>
                  </td>
                  <td className="w-[68px] min-w-[68px] max-w-[68px] px-1 text-center border-b">
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
      {(() => {
        const visibleSigs = (activeSignatories || [])
          .filter((s: any) => s.show_name !== false && s.enabled !== false)
          .slice(0, 4);
        if (!visibleSigs.length) return null;
        return (
          <div className="px-5 py-6 border-t border-border bg-background shrink-0">
            <div
              className="grid gap-4 sm:gap-8 mt-2 pt-2 max-w-4xl mx-auto"
              style={{ gridTemplateColumns: `repeat(${visibleSigs.length}, minmax(0, 1fr))` }}
            >
              {visibleSigs.map((sig: any, i: number) => {
                const title = bn ? (sig.title_bn || sig.title_en) : (sig.title_en || sig.title_bn);
                const name = bn ? (sig.name_bn || sig.name_en) : (sig.name_en || sig.name_bn);
                return (
                  <div key={i} className="text-center space-y-1 sm:space-y-1.5">
                    <div className="border-b-2 border-dashed border-muted-foreground/40 mx-2 sm:mx-4 pb-1 min-h-[28px] sm:min-h-[36px]" />
                    <p className="text-xs sm:text-sm font-bold text-foreground truncate">{title}</p>
                    {name && name !== '—' && name !== '-' && (
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{name}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
        </>
      )}
      
      <ResultCalculationDialog
        open={!!explainStudent}
        onOpenChange={(v) => { if (!v) setExplainStudent(null); }}
        student={explainStudent}
        subjects={subjects}
        marksMap={marksMap as any}
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