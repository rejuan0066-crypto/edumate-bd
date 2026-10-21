import { CANONICAL_BANGLA_LABELS as L } from './banglaCanonicalLabels';
import { formatOrdinalRank, toBnDigits } from './digits';
import QRCode from 'qrcode';

/**
 * Merit tier: 0 = regular pass, 1 = grace pass (consideration), 2 = failed.
 * Grace-passed students always rank below regular pass students, even with a
 * higher total; failed students are never ranked.
 */
const meritTierOf = (r: { failed: boolean; overall: any }): number => {
  if (r.failed) return 2;
  if (r.overall?.graced) return 1;
  return 0;
};


interface ExportData {
  title: string;
  students: any[];
  subjects: any[];
  marksMap: Record<string, number>;
  getOverallGrade: (marks: number[], classId?: string | null, extraOptions?: any) => { grade: string; gpa: string; title?: string; title_bn?: string; hasFail: boolean; graced?: boolean };
  bn: boolean;
  institutionName?: string;
  institutionLogo?: string;
  institutionAddress?: string;
  institutionPhone?: string;
  className?: string;
  examName?: string;
  sessionName?: string;
  passMark?: number;
  signatories?: ResultSignatory[];
  statusOverrides?: Record<string, 'fail' | 'grace_pass' | 'auto'>;
  showPageNumbers?: boolean;
  showFooterInstitution?: boolean;
  margins?: PrintMargins;
}

export interface PrintMargins {
  top: number;    // mm
  right: number;  // mm
  bottom: number; // mm
  left: number;   // mm
}

export const DEFAULT_PRINT_MARGINS: PrintMargins = { top: 10, right: 10, bottom: 14, left: 10 };

export const PRINT_MARGIN_PRESETS: Record<string, PrintMargins> = {
  narrow:   { top: 6,  right: 6,  bottom: 10, left: 6  },
  normal:   { top: 10, right: 10, bottom: 14, left: 10 },
  moderate: { top: 13, right: 13, bottom: 16, left: 13 },
  wide:     { top: 18, right: 18, bottom: 20, left: 18 },
};

const clampMargin = (v: number) => Math.max(3, Math.min(25, Number.isFinite(v) ? v : 10));
export const sanitizeMargins = (m?: Partial<PrintMargins>): PrintMargins => ({
  top:    clampMargin(m?.top    ?? DEFAULT_PRINT_MARGINS.top),
  right:  clampMargin(m?.right  ?? DEFAULT_PRINT_MARGINS.right),
  bottom: clampMargin(Math.max(10, m?.bottom ?? DEFAULT_PRINT_MARGINS.bottom)), // ensure footer space
  left:   clampMargin(m?.left   ?? DEFAULT_PRINT_MARGINS.left),
});

export interface ResultPrintFooterOptions {
  show_page_numbers: boolean;
  show_footer_institution: boolean;
  margins?: PrintMargins;
}

export const DEFAULT_PRINT_FOOTER_OPTIONS: ResultPrintFooterOptions = {
  show_page_numbers: true,
  show_footer_institution: true,
  margins: DEFAULT_PRINT_MARGINS,
};

export interface ResultSignatory {
  title_bn?: string;
  title_en?: string;
  name_bn?: string;
  name_en?: string;
  show_name?: boolean;
  enabled?: boolean;
}

export const DEFAULT_RESULT_SIGNATORIES: ResultSignatory[] = [
  { title_bn: L.classTeacher,        title_en: 'Class Teacher',     name_bn: '', name_en: '', show_name: true, enabled: true },
  { title_bn: L.examController,      title_en: 'Exam Controller',   name_bn: '', name_en: '', show_name: true, enabled: true },
  { title_bn: L.educationSecretary,  title_en: 'Education Secretary', name_bn: '', name_en: '', show_name: true, enabled: true },
  { title_bn: `${L.muhtamim} / ${L.headmaster}`, title_en: 'Principal', name_bn: '', name_en: '', show_name: true, enabled: true },
];

/** Build "[Exam] - [Session] - [Class]" document/file name for result sheets. */
export const buildResultDocName = (p: { examName?: string; sessionName?: string; className?: string; title?: string }): string => {
  const parts = [p.examName, p.sessionName, p.className].map(x => (x || '').trim()).filter(Boolean);
  return parts.length ? parts.join(' - ') : (p.title || 'Result Sheet');
};

const safeFileName = (name: string) => name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim();

export const exportResultCSV = (params: ExportData) => {
  const { title, students, subjects, marksMap, getOverallGrade, bn } = params;
  const headers = [
    bn ? 'ক্রম' : '#',
    bn ? 'রোল' : 'Roll',
    bn ? 'নাম' : 'Name',
    ...subjects.map((s: any) => bn ? s.name_bn : s.name),
    bn ? 'মোট' : 'Total',
    
    bn ? 'গ্রেড' : 'Grade',
    'GPA',
    bn ? 'মর্যাদা' : 'Title',
    bn ? 'মেধা' : 'Rank',
  ];

  const computed = students.map((st: any, idx: number) => {
    const raw = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`]);
    const hasEnteredAnyMark = raw.some((m: any) => m !== undefined && m !== null && m !== '');
    const marks = raw.map((m: any) => (m === undefined || m === null || m === '' ? 0 : Number(m)));
    const graded = raw.filter((m: any) => m !== undefined && m !== null && m !== '' && !Number.isNaN(Number(m))).map((m: any) => Number(m));
    const total = hasEnteredAnyMark ? graded.reduce((a, b) => a + b, 0) : 0;
    const blankCount = raw.filter((m: any) => m === undefined || m === null || m === '').length;
    const hasBlank = blankCount > 0;
    const hasZero = graded.some((m: any) => Number(m) === 0);
    const override = params.statusOverrides?.[st.id] || 'auto';
    const overall = hasEnteredAnyMark
      ? getOverallGrade(graded, st.class_id, { blankFailCount: blankCount, hasBlankOrZero: hasBlank || hasZero, override })
      : { grade: '-', gpa: '-', hasFail: false };
    const failed = hasEnteredAnyMark ? ((overall as any).graced ? false : overall.hasFail) : false;
    return { idx, st, marks, total, overall, failed, hasEnteredAnyMark };
  });


  const sortedByTotal = [...computed]
    .filter(a => a.hasEnteredAnyMark)
    .sort((a, b) => {
      const tierDiff = meritTierOf(a) - meritTierOf(b);
      if (tierDiff !== 0) return tierDiff;
      return b.total - a.total;
    });

  const rankMap = new Map<number, number>();
  let currentRank = 1;
  sortedByTotal.forEach((r, i) => {
    if (r.failed) return;
    const meritRank = r.st.rank || r.st.merit_rank || r.st.merit_position;
    if (meritRank) {
      rankMap.set(r.idx, meritRank);
      return;
    }
    if (i > 0) {
      const prev = sortedByTotal[i - 1];
      if (meritTierOf(prev) === meritTierOf(r) && prev.total === r.total) {
        rankMap.set(r.idx, rankMap.get(prev.idx) || currentRank);
        return;
      }
    }
    currentRank = i + 1;
    rankMap.set(r.idx, currentRank);
  });

  const rows = computed.map(({ st, idx, marks, total, overall, failed, hasEnteredAnyMark }) => {
    const rank = rankMap.get(idx);
    const rankDisplay = hasEnteredAnyMark ? formatOrdinalRank(rank, true) : '-';


    return [
      idx + 1,
      st.roll_number || '-',
      bn ? st.name_bn : (st.name_en || st.name_bn),
      ...marks.map((m, i) => marksMap[`${st.id}_${subjects[i].id}`] !== undefined ? m : '-'),
      hasEnteredAnyMark ? total : '-',
      overall.grade,
      overall.gpa,
      hasEnteredAnyMark ? (bn ? overall.title_bn : overall.title) : '-',
      rankDisplay,
    ];
  });

  const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const csvBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(csvBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9\u0980-\u09FF\s]/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 100);
};

export const exportResultPDF = async (params: ExportData & { orientation?: 'landscape' | 'portrait' }) => {
  let activeSignatories = params.signatories;
  if (!activeSignatories || !activeSignatories.length) {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: v2Data } = await supabase.from('website_settings').select('value').eq('key', 'result_signatories_v2').maybeSingle();
      if (Array.isArray(v2Data?.value) && v2Data.value.length) {
        activeSignatories = v2Data.value as any;
      } else {
        const { data: legData } = await supabase.from('website_settings').select('value').eq('key', 'result_signatories').maybeSingle();
        if (Array.isArray(legData?.value) && legData.value.length) {
          activeSignatories = legData.value as any;
        }
      }
    } catch (e) {
      console.warn('Could not auto-fetch signatories for PDF:', e);
    }
  }

  const effectiveParams = {
    ...params,
    signatories: activeSignatories,
  };

  let qrCodeDataUrl = '';
  try {
    const qrUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/result`;
    qrCodeDataUrl = await QRCode.toDataURL(qrUrl, { margin: 1, width: 120 });
  } catch (err) {
    console.error('QR generation failed:', err);
  }

  if (isMobileOrPwa()) {
    const html = getResultSheetHtml({ ...effectiveParams, qrCodeDataUrl });
    const fname = `${safeFileName(buildResultDocName(params))}.pdf`;
    try {
      const { toast } = await import('sonner');
      const bn = params.bn;
      toast.info(bn ? 'পিডিএফ তৈরি হচ্ছে…' : 'Generating PDF…');
      await downloadSheetAsPdf(html, fname, null, params.orientation || 'landscape', 'download');
      toast.success(bn ? 'পিডিএফ ডাউনলোড হয়েছে' : 'PDF downloaded');
    } catch (e) {
      console.error('PDF export failed:', e);
    }
    return;
  }
  printResultSheet({ ...effectiveParams, qrCodeDataUrl });
};

const isMobileOrPwa = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    if ((window.navigator as any).standalone === true) return true;
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  } catch {
    return false;
  }
};

const downloadSheetAsPdf = async (
  html: string,
  filename: string,
  _targetWindow: Window | null = null,
  orientation: 'landscape' | 'portrait' = 'landscape',
  mode: 'preview' | 'download' = 'download',
) => {
  const { downloadSheetAsPdf: dl } = await import('./salarySlipPdf');
  return dl(html, filename, _targetWindow, orientation, mode);
};

export const getResultSheetHtml = ({ 
  title, students, subjects, marksMap, getOverallGrade, bn, institutionName, 
  institutionLogo, institutionAddress, institutionPhone, className, examName, 
  sessionName, passMark = 33, signatories, statusOverrides, orientation = 'landscape', 
  showPageNumbers = true, showFooterInstitution = true, margins, qrCodeDataUrl
}: ExportData & { orientation?: 'landscape' | 'portrait', qrCodeDataUrl?: string }): string => {
  const m = sanitizeMargins(margins);
  const docName = buildResultDocName({ examName, sessionName, className, title });
  const rawSigList = (signatories && signatories.length ? signatories : DEFAULT_RESULT_SIGNATORIES);
  const sigList = rawSigList.filter(s => s.show_name !== false && (s as any).enabled !== false).slice(0, 4);
  
  const computed = students.map((st: any, idx: number) => {
    const raw = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`]);
    const hasEnteredAnyMark = raw.some((m: any) => m !== undefined && m !== null && m !== '');
    const marks = raw.map((m: any) => (m === undefined || m === null || m === '' ? 0 : Number(m)));
    const graded = raw.filter((m: any) => m !== undefined && m !== null && m !== '' && !Number.isNaN(Number(m))).map((m: any) => Number(m));
    const total = hasEnteredAnyMark ? graded.reduce((a, b) => a + b, 0) : 0;
    const blankCount = raw.filter((m: any) => m === undefined || m === null || m === '').length;
    const hasBlank = blankCount > 0;
    const hasZero = graded.some((m: any) => Number(m) === 0);
    const override = statusOverrides?.[st.id] || 'auto';
    const overall = hasEnteredAnyMark ? getOverallGrade(graded, st.class_id, {
      blankFailCount: blankCount,
      hasBlankOrZero: hasBlank || hasZero,
      override,
    }) : null;
    const failed = overall ? ((overall as any).graced ? false : overall.hasFail) : false;
    return { idx, st, marks, total, overall, failed, hasEnteredAnyMark };
  });

  const sortedByTotal = [...computed].sort((a, b) => {
    const tierDiff = meritTierOf(a) - meritTierOf(b);
    if (tierDiff !== 0) return tierDiff;
    return b.total - a.total;
  });
  const rankMap = new Map<number, number>();
  let currentRank = 1;
  sortedByTotal.forEach((r, i) => {
    if (r.failed) {
      rankMap.set(r.idx, 0); 
      return;
    }
    const meritRank = r.st.rank || r.st.merit_rank || r.st.merit_position;
    if (meritRank) {
      rankMap.set(r.idx, meritRank);
      return;
    }
    if (i > 0) {
      const prev = sortedByTotal[i - 1];
      if (meritTierOf(prev) === meritTierOf(r) && prev.total === r.total) {
        rankMap.set(r.idx, rankMap.get(prev.idx) || currentRank);
        return;
      }
    }
    currentRank = i + 1;
    rankMap.set(r.idx, currentRank);
  });

  const activeStudents = computed.filter(c => c.hasEnteredAnyMark);
  const passCount = activeStudents.filter(c => !c.failed).length;
  const failCount = activeStudents.length - passCount;
  const classAvg = activeStudents.length ? (activeStudents.reduce((s, c) => s + c.total, 0) / activeStudents.length).toFixed(2) : '0';

  const subjectHeaders = subjects.map((s: any) => {
    const fullName = (bn ? s.name_bn : s.name) || '';
    const len = fullName.length;
    const sizeClass = len > 22 ? 'sub-name xs' : len > 16 ? 'sub-name sm' : len > 10 ? 'sub-name md' : 'sub-name';
    const safeTitle = fullName.replace(/"/g, '&quot;');
    const fullMark = s.full_marks || 100;
    return `<th class="sub-th"><span class="${sizeClass}" title="${safeTitle}">${fullName}</span><span class="sub-max">${bn ? toBnDigits(fullMark) : fullMark}</span></th>`;
  }).join('');

  const metaRow = (label: string, value: string) =>
    value ? `<div class="meta-item"><span class="meta-k">${label}</span><span class="meta-v">${value}</span></div>` : '';

  const ROWS_PER_PAGE = orientation === 'landscape' ? 11 : 14;
  const chunks: any[][] = [];
  if (computed.length === 0) chunks.push([]);
  for (let i = 0; i < computed.length; i += ROWS_PER_PAGE) {
    chunks.push(computed.slice(i, i + ROWS_PER_PAGE));
  }
  const totalPages = chunks.length;

  const colgroupHtml = (() => {
    const n = subjects.length;
    const fixedW = { idx: 3, roll: 5, name: 17, total: 6, grade: 6, gpa: 5, merit: 12, rank: 6 };
    const used = Object.values(fixedW).reduce((a, b) => a + b, 0);
    const subjectPool = Math.max(20, 100 - used);
    const sw = n > 0 ? +(subjectPool / n).toFixed(3) : 0;
    const cols = [
      `<col style="width:${fixedW.idx}%">`,
      `<col style="width:${fixedW.roll}%">`,
      `<col style="width:${fixedW.name}%">`,
      ...subjects.map(() => `<col style="width:${sw}%">`),
      `<col style="width:${fixedW.total}%">`,
      
      `<col style="width:${fixedW.grade}%">`,
      `<col style="width:${fixedW.gpa}%">`,
      `<col style="width:${fixedW.merit}%">`,
      `<col style="width:${fixedW.rank}%">`,
    ].join('');
    return `<colgroup>${cols}</colgroup>`;
  })();

  const renderRow = ({ idx, st, marks, total, overall, failed, hasEnteredAnyMark }: any) => {
    const rank = rankMap.get(idx);
    const merit = hasEnteredAnyMark ? ((bn ? (overall as any).title_bn : (overall as any).title) || (overall as any).title_bn || (overall as any).title || '-') : '-';
    
    const rankDisplay = hasEnteredAnyMark ? formatOrdinalRank(rank, true) : '-';


    const marksCells = marks.map((mk: number, i: number) => {
      const subjectId = subjects[i].id;
      const isEntered = marksMap[`${st.id}_${subjectId}`] !== undefined;
      return `<td class="num ${isEntered && mk < passMark ? 'fail-cell' : ''}">${isEntered ? toBnDigits(mk) : '-'}</td>`;
    }).join('');

    return `<tr class="${failed ? 'row-fail' : ''}">
      <td class="num">${toBnDigits(idx + 1)}</td>
      <td class="num bold">${st.roll_number ? toBnDigits(st.roll_number) : '-'}</td>
      <td class="name">${bn ? st.name_bn : (st.name_en || st.name_bn)}</td>
      ${marksCells}
      <td class="num bold">${hasEnteredAnyMark ? toBnDigits(total) : '-'}</td>
      
      <td class="num bold grade-${overall?.grade?.replace(/[^A-Z]/g, '') || 'N'}">${(overall?.grade || '-').toUpperCase()}</td>
      <td class="num bold">${overall?.gpa ? toBnDigits(overall.gpa) : '-'}</td>
      <td class="num">${merit}</td>
      <td class="num"><span class="rank-pill ${rank && rank <= 3 ? 'rank-top' : ''}">${rankDisplay}</span></td>
    </tr>`;
  };

  const pagesHtml = chunks.map((chunk, pageIdx) => {
    const rowsHtml = chunk.map(renderRow).join('');
    return `
    <div class="result-page">
      <div class="fit-inner">
        <div class="sheet">
          ${institutionLogo ? `<div class="watermark"><img src="${institutionLogo}" alt=""></div>` : ''}
          <header class="header">
            ${institutionLogo ? `<img src="${institutionLogo}" class="header-logo" alt="logo">` : '<div class="header-logo"></div>'}
            <div class="header-text">
              <h1>${institutionName || ''}</h1>
              <div class="addr">${institutionAddress || ''}</div>
              <div class="phone">${institutionPhone || ''}</div>
            </div>
            <div class="header-logo qr-container">
              ${qrCodeDataUrl ? `<img src="${qrCodeDataUrl}" class="qr-img" alt="QR">` : ''}
            </div>
          </header>

          <div class="doc-band"><span>${title}</span></div>

          <div class="meta">
            ${metaRow(bn ? 'শ্রেণী:' : 'Class:', className)}
            ${metaRow(bn ? 'পরীক্ষা:' : 'Exam:', examName)}
            ${metaRow(bn ? 'শিক্ষাবর্ষ:' : 'Session:', sessionName)}
          </div>

          <table class="result-table">
            ${colgroupHtml}
            <thead>
              <tr>
                <th style="width:40px">${bn ? 'ক্রম' : '#'}</th>
                <th style="width:60px">${bn ? 'রোল' : 'Roll'}</th>
                <th style="width:180px; text-align:left; padding-left:10px;">${bn ? 'নাম' : 'Name'}</th>
                ${subjectHeaders}
                <th style="width:60px">${bn ? 'মোট' : 'Total'}</th>
                
                <th style="width:60px">${bn ? 'গ্রেড' : 'Grade'}</th>
                <th style="width:50px">GPA</th>
                <th style="width:100px">${bn ? 'মর্যাদা' : 'Merit'}</th>
                <th style="width:60px">${bn ? 'মেধা' : 'Rank'}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="summary-wrap">
            ${pageIdx === totalPages - 1 ? `
            <div class="top-rankers" style="margin-bottom:15px; display:flex; gap:15px; justify-content:center;">
              ${(() => {
                const top3 = sortedByTotal.filter(r => !r.failed && rankMap.get(r.idx) && rankMap.get(r.idx)! <= 3);
                return top3.map(r => {
                  const rank = rankMap.get(r.idx);
                  const rankLabel = rank === 1 ? '১ম' : rank === 2 ? '২য়' : '৩য়';
                  const name = bn ? r.st.name_bn : (r.st.name_en || r.st.name_bn);
                  return `<div style="border:2px solid #064e3b; border-radius:8px; padding:8px 15px; background:#f0fdf4; text-align:center; min-width:160px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                    <div style="font-size:11px; font-weight:800; color:#064e3b; text-transform:uppercase; letter-spacing:0.5px;">${rankLabel} ${bn ? 'স্থান' : 'Rank'}</div>
                    <div style="font-size:14px; font-weight:800; color:#0f172a; margin-top:3px;">${name}</div>
                  </div>`;
                }).join('');
              })()}
            </div>
            <div class="summary">
              <div class="stat"><div class="stat-k">${bn ? 'অংশগ্রহণকারী' : 'TOTAL'}</div><div class="stat-v">${toBnDigits(activeStudents.length)}</div></div>
              <div class="stat"><div class="stat-k">${bn ? 'কৃতকার্য' : 'PASSED'}</div><div class="stat-v" style="color:#059669">${toBnDigits(passCount)}</div></div>
              <div class="stat"><div class="stat-k">${bn ? 'অকৃতকার্য' : 'FAILED'}</div><div class="stat-v" style="color:#dc2626">${toBnDigits(failCount)}</div></div>
              <div class="stat"><div class="stat-k">${bn ? 'পাসের হার' : 'PASS RATE'}</div><div class="stat-v">${toBnDigits(activeStudents.length ? ((passCount / activeStudents.length) * 100).toFixed(1) : '0')}%</div></div>
              
            </div>
            ` : ''}
          </div>

          ${sigList.length > 0 ? `
          <div class="signatures-wrap">
            <div class="signatures">
              ${sigList.map(sig => `
                <div class="sig-block">
                  <div class="sig-line"></div>
                  ${(sig.name_bn || sig.name_en) && sig.name_bn !== '—' && sig.name_bn !== '-' ? `<div class="sig-name">${bn ? (sig.name_bn || sig.name_en || '') : (sig.name_en || sig.name_bn || '')}</div>` : ''}
                  <div class="sig-title">${bn ? (sig.title_bn || sig.title_en || '') : (sig.title_en || sig.title_bn || '')}</div>
                </div>
              `).join('')}
            </div>
          </div>` : ''}

          <div class="footer print-hidden">
            <div style="font-weight:700;">${showFooterInstitution ? (institutionName || '') : ''}</div>
            <div class="screen-pageinfo" style="font-weight:600;">${bn ? `পৃষ্ঠা ${toBnDigits(pageIdx + 1)} / ${toBnDigits(totalPages)}` : `Page ${pageIdx + 1} / ${totalPages}`}</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${docName}</title>
<style>@font-face{font-family:"Kalpurush";src:url("/fonts/Kalpurush.ttf") format("truetype");font-display:block;}@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{
    size:A4 ${orientation};
    margin:0;
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  html,body{width:100%;margin:0;padding:0;}
  body{font-family:'Kalpurush','Noto Sans Bengali','SutonnyOMJ','Inter',sans-serif;color:#0f172a;background:#f8fafc;}
  .screen-pageinfo{display:none;}
  @media screen{
    html{overflow-x:auto;-webkit-overflow-scrolling:touch;}
    body{padding:20px;min-width:min-content;}
    .screen-pageinfo{display:flex;justify-content:flex-end;font-size:10px;color:#94a3b8;margin-top:6px;}
  }
  .sheet{position:relative;background:#fff;border:1px solid #94a3b8;border-radius:2px;padding:8mm 8mm;box-sizing:border-box;width:100%;box-shadow:0 0 10px rgba(0,0,0,0.1);margin:0 auto;overflow:hidden;}
  .watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;opacity:0.04;pointer-events:none;z-index:0;display:flex;align-items:center;justify-content:center;filter:grayscale(100%);}
  .watermark img{width:100%;height:100%;object-fit:contain;}
  .header{display:grid;grid-template-columns:100px 1fr 100px;gap:12px;align-items:center;margin-bottom:15px;}
  .header-logo{width:80px;height:80px;object-fit:contain;display:flex;align-items:center;justify-content:center;}
  .qr-container{border:1px solid #e2e8f0;padding:4px;background:#f8fafc;border-radius:4px;}
  .qr-img{width:100%;height:100%;object-fit:contain;}
  .header-text{text-align:center;}
  .header-text h1{font-size:24px;font-weight:800;color:#064e3b;letter-spacing:.5px;margin-bottom:4px;}
  .header-text .addr{font-size:13px;color:#334155;font-weight:500;}
  .header-text .phone{font-size:13px;color:#334155;margin-top:2px;font-weight:500;}
  .doc-band{margin-top:8px;display:flex;justify-content:center;}
  .doc-band span{background:#064e3b;color:#fff;font-size:13px;font-weight:700;padding:4px 16px;border-radius:999px;letter-spacing:.4px;}
  .meta{display:flex;flex-wrap:wrap;gap:6px 18px;justify-content:center;margin-top:10px;padding:6px 10px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;}
  .meta-item{display:flex;gap:4px;font-size:11px;}
  .meta-k{color:#475569;font-weight:500;}
  .meta-v{color:#064e3b;font-weight:700;}
  table{width:100%;border-collapse:collapse;margin-top:10px;font-size:10.5px;table-layout:fixed;}
  .result-table th,.result-table td{overflow:hidden;}
  thead{display:table-header-group !important;}
  tfoot{display:table-footer-group;}
  thead tr{page-break-inside:avoid;break-inside:avoid;}
  thead th{background:#064e3b;color:#fff;font-weight:700;padding:8px 4px;border:1px solid #4b5563;text-align:center;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;}
  .sub-th{padding:6px 3px;vertical-align:middle;height:45px;}
  .sub-name{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;text-overflow:ellipsis;line-height:1.2;word-break:break-word;overflow-wrap:anywhere;hyphens:auto;font-size:11px;}
  .sub-name.md{font-size:10px;}
  .sub-name.sm{font-size:9px;-webkit-line-clamp:3;line-clamp:3;line-height:1.15;}
  .sub-name.xs{font-size:8px;-webkit-line-clamp:3;line-clamp:3;line-height:1.1;letter-spacing:-.1px;}
  .sub-max{display:block;font-size:9px;font-weight:500;opacity:.9;margin-top:2px;}
  tbody td{padding:6px 6px;border:1px solid #94a3b8;font-size:11px;background:#fff;}
  tbody tr{page-break-inside:avoid;break-inside:avoid;}
  tbody tr:nth-child(even) td{background:#f9fafb;}
  tbody tr:hover td{background:#f0fdf4;}
  td.num{text-align:center;}
  td.name{text-align:left;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  td.bold{font-weight:700;}
  .fail-cell{color:#dc2626;font-weight:700;background:#fef2f2 !important;}
  .row-fail td{background:#fff7ed !important;}
  .status-pass{color:#059669;font-weight:700;}
  .status-fail{color:#dc2626;font-weight:700;}
  .rank-pill{display:inline-block;min-width:26px;padding:1px 6px;border-radius:999px;background:#64748b;color:#fff;font-size:10px;font-weight:700;}
  .rank-pill.rank-top{background:#064e3b;min-width:32px;}
  .grade-A,.grade-AP{color:#059669;}
  .grade-B{color:#0284c7;}
  .grade-C{color:#d97706;}
  .grade-D,.grade-F{color:#dc2626;}
  .summary-wrap{margin-top:14px;page-break-inside:avoid;break-inside:avoid;-webkit-column-break-inside:avoid;}
  .summary{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;page-break-inside:avoid;break-inside:avoid;}
  .stat{border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;background:#f8fafc;page-break-inside:avoid;break-inside:avoid;}
  .stat-k{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;}
  .stat-v{font-size:15px;font-weight:800;color:#064e3b;margin-top:2px;}
  .signatures-keeper{page-break-inside:avoid;break-inside:avoid;display:block;}
  .signatures-wrap{margin-top:45px;page-break-inside:avoid;break-inside:avoid;display:block;}
  .signatures{display:flex;flex-wrap:nowrap;justify-content:space-around;gap:25px;padding:0 5px;page-break-inside:avoid;break-inside:avoid;}
  .sig-block{flex:1 1 0;min-width:0;max-width:260px;text-align:center;page-break-inside:avoid;break-inside:avoid;}
  .sig-line{border-top:1.5px solid #64748b;padding-top:6px;margin-top:35px;}
  .sig-name{font-size:12px;font-weight:700;color:#0f172a;min-height:16px;}
  .sig-title{font-size:12.5px;font-weight:700;color:#064e3b;margin-top:2px;}
  .sig-sub{font-size:10px;color:#64748b;}
  .footer{display:flex;justify-content:space-between;font-size:10px;color:#64748b;border-top:1px dashed #cbd5e1;padding-top:8px;}
  .print-only{display:none;}
  @media print{
    html,body{padding:0 !important;background:#fff !important;}
    .sheet{box-shadow:none !important;border:none !important;padding-bottom:50px !important;}
    .header,.doc-band,.meta{page-break-inside:avoid;break-inside:avoid;}
    table{page-break-inside:auto;}
    tr{page-break-inside:avoid;break-inside:avoid;page-break-after:auto;}
    thead{display:table-header-group;}
    tfoot{display:table-footer-group;}
    .summary-wrap{page-break-inside:avoid;break-inside:avoid;}
    .signatures-wrap{
      position:fixed !important;
      bottom:0 !important;
      left:8mm !important;
      right:8mm !important;
      background:white !important;
      margin-top:0 !important;
      padding-bottom:10mm !important;
      z-index:9999 !important;
      page-break-inside:avoid !important;
      break-inside:avoid !important;
    }
    .print-only{display:block !important;}
    .print-hidden{display:none !important;}
    .result-page{margin:0 !important;padding:0 !important;height:auto !important;break-after:auto !important;page-break-after:auto !important;}
    .fit-inner{position:static !important;transform:none !important;width:100% !important;}
  }
  .result-page{position:relative;box-sizing:border-box;padding:8mm;width:297mm;height:209.5mm;break-after:page;page-break-after:always;break-inside:avoid;page-break-inside:avoid;overflow:hidden;margin:0 auto 14px;}
  .result-page:last-child{break-after:auto;page-break-after:auto;margin-bottom:0;}
  @media print{.result-page{margin:0 auto;}}
  .fit-inner{position:absolute;top:8mm;left:8mm;right:8mm;transform-origin:top left;width:calc(100% - 16mm);box-sizing:border-box;}
  .signatures-wrap{margin-top:30px;}
  .sig-line{margin-top:28px;}
</style>
<script>
(function(){
  function fit(){
    var PX = 96 / 25.4;
    var pageH = 209.5 * PX;
    var pageW = 297 * PX;
    var availH = pageH - 16 * PX;
    var availW = pageW - 16 * PX;
    var pages = document.querySelectorAll('.result-page');
    for (var i = 0; i < pages.length; i++) {
      var page = pages[i];
      var inner = page.querySelector('.fit-inner');
      if (!inner) continue;
      inner.style.transform = 'none';
      inner.style.width = '100%';
      var h = inner.scrollHeight;
      var w = inner.scrollWidth;
      var scale = Math.min(1, availH / h, availW / w);
      if (scale < 1) {
        scale = Math.max(0.45, scale - 0.015);
        inner.style.transform = 'scale(' + scale + ')';
        inner.style.width = (availW / scale) + 'px';
      }
    }
  }
  if (document.readyState === 'complete') fit();
  else window.addEventListener('load', fit);
  window.addEventListener('beforeprint', fit);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  setTimeout(fit, 300);
})();
</script>
</head><body>
${pagesHtml}
</body></html>`;
};

export const printResultSheet = (params: ExportData & { orientation?: 'landscape' | 'portrait', qrCodeDataUrl?: string }) => {
  const html = getResultSheetHtml(params);
  renderPrintDocument(html, buildResultDocName(params));
};

const renderPrintDocument = (html: string, title: string) => {
  const prevTitle = typeof document !== 'undefined' ? document.title : '';
  try {
    if (typeof document !== 'undefined') document.title = title;
    const existing = document.getElementById('__result_print_frame__');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = '__result_print_frame__';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('no iframe document');

    doc.open();
    doc.write(html);
    doc.close();

    const fire = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) return;
        win.focus();
        if (win.document.readyState === 'complete') {
          win.print();
        } else {
          win.onload = () => {
            setTimeout(() => win.print(), 100);
          };
        }
      } catch {
        /* ignore */
      }
      setTimeout(() => { iframe.remove(); document.title = prevTitle; }, 60000);
    };

    const ready = () => {
      const fonts = (doc as any).fonts;
      if (fonts?.ready) {
        fonts.ready.then(() => setTimeout(fire, 350)).catch(() => setTimeout(fire, 600));
      } else {
        setTimeout(fire, 700);
      }
    };

    if (doc.readyState === 'complete') ready();
    else iframe.onload = ready;
  } catch {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const w = window.open(url, '_blank');
    if (w) {
      w.onload = () => setTimeout(() => { w.print(); URL.revokeObjectURL(url); }, 700);
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[^a-zA-Z0-9\u0980-\u09FF\s]/g, '_')}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
};
