import { CANONICAL_BANGLA_LABELS as L } from './banglaCanonicalLabels';

interface ExportData {
  title: string;
  students: any[];
  subjects: any[];
  marksMap: Record<string, number>;
  getOverallGrade: (marks: number[], classId?: string | null) => { grade: string; gpa: string; title?: string; title_bn?: string; hasFail: boolean };
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
}

export const DEFAULT_RESULT_SIGNATORIES: ResultSignatory[] = [
  { title_bn: L.classTeacher,        title_en: 'Class Teacher',     name_bn: '', name_en: '' },
  { title_bn: L.examController,      title_en: 'Exam Controller',   name_bn: '', name_en: '' },
  { title_bn: L.educationSecretary,  title_en: 'Education Secretary', name_bn: '', name_en: '' },
  { title_bn: `${L.muhtamim} / ${L.headmaster}`, title_en: 'Principal', name_bn: '', name_en: '' },
];

export const exportResultCSV = (params: ExportData) => {
  const { title, students, subjects, marksMap, getOverallGrade, bn } = params;
  const headers = [
    bn ? 'ক্রম' : '#',
    bn ? 'রোল' : 'Roll',
    bn ? 'নাম' : 'Name',
    ...subjects.map((s: any) => bn ? s.name_bn : s.name),
    bn ? 'মোট' : 'Total',
    bn ? 'গড়' : 'Avg',
    bn ? 'গ্রেড' : 'Grade',
    'GPA',
    bn ? 'মর্যাদা' : 'Title',
    bn ? 'মেধা' : 'Rank',
  ];

  const computed = students.map((st: any, idx: number) => {
    const marks = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`] ?? 0);
    const total = marks.reduce((a, b) => a + b, 0);
    const overall = getOverallGrade(marks, st.class_id);
    const failed = (overall as any).graced ? false : (marks.some(m => m < (params?.passMark || 33)) || overall.hasFail);
    return { idx, st, marks, total, overall, failed };
  });

  const sortedByTotal = [...computed].sort((a, b) => {
    if (a.failed && !b.failed) return 1;
    if (!a.failed && b.failed) return -1;
    return b.total - a.total;
  });

  const rankMap = new Map<number, number>();
  sortedByTotal.forEach((r, i) => {
    if (!r.failed) rankMap.set(r.idx, i + 1);
  });

  const rows = computed.map(({ st, idx, marks, total, overall, failed }) => {
    const avg = subjects.length > 0 ? total / subjects.length : 0;
    const rank = rankMap.get(idx);
    let rankDisplay = rank ? rank.toString() : '-';
    if (rank === 1) rankDisplay = bn ? '১ম' : '1st';
    else if (rank === 2) rankDisplay = bn ? '২য়' : '2nd';
    else if (rank === 3) rankDisplay = bn ? '৩য়' : '3rd';

    return [
      idx + 1,
      st.roll_number || '-',
      bn ? st.name_bn : (st.name_en || st.name_bn),
      ...marks,
      total,
      avg.toFixed(1),
      overall.grade,
      overall.gpa,
      bn ? overall.title_bn : overall.title,
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
  if (isMobileOrPwa()) {
    const html = getResultSheetHtml(params);
    const fname = `result-sheet-${(params.className || 'class').replace(/\s+/g, '_')}.pdf`;
    try {
      const { toast } = await import('sonner');
      const bn = params.bn;
      toast.info(bn ? 'পিডিএফ তৈরি হচ্ছে…' : 'Generating PDF…');
      await downloadSheetAsPdf(html, fname, params.orientation || 'landscape');
      toast.success(bn ? 'পিডিএফ ডাউনলোড হয়েছে' : 'PDF downloaded');
    } catch (e) {
      console.error('PDF export failed:', e);
    }
    return;
  }
  printResultSheet(params);
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

const downloadSheetAsPdf = async (html: string, filename: string, orientation: 'landscape' | 'portrait' = 'landscape') => {
  const { downloadSheetAsPdf: dl } = await import('./salarySlipPdf');
  return dl(html, filename, null, orientation);
};

export const getResultSheetHtml = ({ 
  title, students, subjects, marksMap, getOverallGrade, bn, institutionName, 
  institutionLogo, institutionAddress, institutionPhone, className, examName, 
  sessionName, passMark = 33, signatories, orientation = 'landscape', 
  showPageNumbers = true, showFooterInstitution = true, margins 
}: ExportData & { orientation?: 'landscape' | 'portrait' }): string => {
  const m = sanitizeMargins(margins);
  const sigList = (signatories && signatories.length ? signatories : DEFAULT_RESULT_SIGNATORIES).slice(0, 6);
  
  const computed = students.map((st: any, idx: number) => {
    const hasEnteredAnyMark = subjects.some((sub: any) => marksMap[`${st.id}_${sub.id}`] !== undefined);
    const marks = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`] ?? 0);
    const total = hasEnteredAnyMark ? marks.reduce((a, b) => a + b, 0) : 0;
    const avg = subjects.length > 0 ? total / subjects.length : 0;
    const overall = hasEnteredAnyMark ? getOverallGrade(marks, st.class_id) : null;
    const failed = overall ? ((overall as any).graced ? false : (marks.some(m => m < passMark && m > 0) || overall.hasFail)) : false;
    return { idx, st, marks, total, avg, overall, failed, hasEnteredAnyMark };
  });
  const sortedByTotal = [...computed].sort((a, b) => {
    if (a.failed && !b.failed) return 1;
    if (!a.failed && b.failed) return -1;
    return b.total - a.total;
  });
  const rankMap = new Map<number, number>();
  sortedByTotal.forEach((r, i) => {
    if (r.failed) {
      rankMap.set(r.idx, 0); // 0 or -1 to indicate no rank for fails
    } else {
      rankMap.set(r.idx, i + 1);
    }
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
    return `<th class="sub-th"><span class="${sizeClass}" title="${safeTitle}">${fullName}</span><span class="sub-max">100</span></th>`;
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
    const fixedW = { idx: 3, roll: 5, name: 17, total: 6, avg: 5, grade: 6, gpa: 5, merit: 10, rank: 6 };
    const used = Object.values(fixedW).reduce((a, b) => a + b, 0);
    const subjectPool = Math.max(20, 100 - used);
    const sw = n > 0 ? +(subjectPool / n).toFixed(3) : 0;
    const cols = [
      `<col style="width:${fixedW.idx}%">`,
      `<col style="width:${fixedW.roll}%">`,
      `<col style="width:${fixedW.name}%">`,
      ...subjects.map(() => `<col style="width:${sw}%">`),
      `<col style="width:${fixedW.total}%">`,
      `<col style="width:${fixedW.avg}%">`,
      `<col style="width:${fixedW.grade}%">`,
      `<col style="width:${fixedW.gpa}%">`,
      `<col style="width:${fixedW.merit}%">`,
      `<col style="width:${fixedW.rank}%">`,
    ].join('');
    return `<colgroup>${cols}</colgroup>`;
  })();

  const renderRow = ({ idx, st, marks, total, avg, overall, failed, hasEnteredAnyMark }: any) => {
    const rank = rankMap.get(idx);
    const merit = hasEnteredAnyMark ? ((bn ? (overall as any).title_bn : (overall as any).title) || (overall as any).title_bn || (overall as any).title || '-') : '-';
    
    let rankDisplay = hasEnteredAnyMark && rank && rank > 0 ? rank.toString() : '-';
    if (hasEnteredAnyMark && rank === 1) rankDisplay = bn ? '১ম' : '1st';
    else if (hasEnteredAnyMark && rank === 2) rankDisplay = bn ? '২য়' : '2nd';
    else if (hasEnteredAnyMark && rank === 3) rankDisplay = bn ? '৩য়' : '3rd';

    const marksCells = marks.map((mk: number, i: number) => {
      const subjectId = subjects[i].id;
      const isEntered = marksMap[`${st.id}_${subjectId}`] !== undefined;
      return `<td class="num ${isEntered && mk < passMark ? 'fail-cell' : ''}">${isEntered ? mk : '-'}</td>`;
    }).join('');

    return `<tr class="${failed ? 'row-fail' : ''}">
      <td class="num">${idx + 1}</td>
      <td class="num bold">${st.roll_number || '-'}</td>
      <td class="name">${bn ? st.name_bn : (st.name_en || st.name_bn)}</td>
      ${marksCells}
      <td class="num bold">${hasEnteredAnyMark ? total : '-'}</td>
      <td class="num">${hasEnteredAnyMark ? avg.toFixed(1) : '-'}</td>
      <td class="num bold grade-${overall?.grade?.replace(/[^A-Z]/g, '') || 'N'}">${overall?.grade || '-'}</td>
      <td class="num bold">${overall?.gpa || '-'}</td>
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
          <header class="header">
            ${institutionLogo ? `<img src="${institutionLogo}" class="header-logo" alt="logo">` : '<div></div>'}
            <div class="header-text">
              <h1>${institutionName || ''}</h1>
              <div class="addr">${institutionAddress || ''}</div>
              <div class="phone">${institutionPhone || ''}</div>
            </div>
            <div></div>
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
                <th>${bn ? 'ক্রম' : '#'}</th>
                <th>${bn ? 'রোল' : 'Roll'}</th>
                <th>${bn ? 'নাম' : 'Name'}</th>
                ${subjectHeaders}
                <th>${bn ? 'মোট' : 'Total'}</th>
                <th>${bn ? 'গড়' : 'Avg'}</th>
                <th>${bn ? 'গ্রেড' : 'Grade'}</th>
                <th>GPA</th>
                <th>${bn ? 'মর্যাদা' : 'Merit'}</th>
                <th>${bn ? 'মেধা' : 'Rank'}</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>

          <div class="summary-wrap">
            ${pageIdx === totalPages - 1 ? `
            <div class="top-rankers" style="margin-bottom:12px; display:flex; gap:10px; justify-content:center;">
              ${(() => {
                const top3 = sortedByTotal.filter(r => !r.failed && rankMap.get(r.idx) && rankMap.get(r.idx)! <= 3);
                return top3.map(r => {
                  const rank = rankMap.get(r.idx);
                  const rankLabel = rank === 1 ? (bn ? '১ম' : '1st') : rank === 2 ? (bn ? '২য়' : '2nd') : (bn ? '৩য়' : '3rd');
                  const name = bn ? r.st.name_bn : (r.st.name_en || r.st.name_bn);
                  return `<div style="border:1.5px solid #064e3b; border-radius:6px; padding:6px 12px; background:#f0fdf4; text-align:center; min-width:120px;">
                    <div style="font-size:10px; font-weight:700; color:#064e3b; text-transform:uppercase;">${rankLabel} ${bn ? 'স্থান' : 'Rank'}</div>
                    <div style="font-size:12px; font-weight:800; color:#0f172a; margin-top:2px;">${name}</div>
                  </div>`;
                }).join('');
              })()}
            </div>
            <div class="summary">
              <div class="stat"><div class="stat-k">${bn ? 'অংশগ্রহণকারী' : 'TOTAL'}</div><div class="stat-v">${computed.length}</div></div>
              <div class="stat"><div class="stat-k">${bn ? 'কৃতকার্য' : 'PASSED'}</div><div class="stat-v">${passCount}</div></div>
              <div class="stat"><div class="stat-k">${bn ? 'অকৃতকার্য' : 'FAILED'}</div><div class="stat-v" style="color:#dc2626">${failCount}</div></div>
              <div class="stat"><div class="stat-k">${bn ? 'পাসের হার' : 'PASS RATE'}</div><div class="stat-v">${computed.length ? ((passCount / computed.length) * 100).toFixed(1) : '0'}%</div></div>
              <div class="stat"><div class="stat-k">${bn ? 'গড় নম্বর' : 'CLASS AVG'}</div><div class="stat-v">${classAvg}</div></div>
            </div>
            ` : ''}
          </div>

          <div class="signatures-keeper">
            <div class="signatures-wrap">
              <div class="signatures">
                ${sigList.map(sig => `
                  <div class="sig-block">
                    <div class="sig-line">
                      <div class="sig-name">${bn ? (sig.name_bn || '') : (sig.name_en || sig.name_bn || '')}</div>
                      <div class="sig-title">${bn ? (sig.title_bn || '') : (sig.title_en || sig.title_bn || '')}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="footer">
            <div>${showFooterInstitution ? (institutionName || '') : ''}</div>
            <div class="screen-pageinfo">${bn ? 'পৃষ্ঠা' : 'Page'} ${pageIdx + 1} / ${totalPages}</div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${title}</title>
<style>@font-face{font-family:"Kalpurush";src:url("/fonts/Kalpurush.ttf") format("truetype");font-display:block;}@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{
    size:A4 ${orientation};
    margin:${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
    @bottom-left{
      content:${showFooterInstitution ? `"${(institutionName || '').replace(/"/g, '\\"')}"` : `""`};
      font-family:'Kalpurush','Noto Sans Bengali','SutonnyOMJ','Inter',sans-serif;
      font-size:9pt;color:#64748b;
    }
    @bottom-right{
      content:${showPageNumbers ? `"${bn ? 'পৃষ্ঠা' : 'Page'} " counter(page${bn ? ', bengali' : ''}) " ${bn ? 'এর' : 'of'} " counter(pages${bn ? ', bengali' : ''})` : `""`};
      font-family:'Kalpurush','Noto Sans Bengali','SutonnyOMJ','Inter',sans-serif;
      font-size:9pt;color:#64748b;
    }
  }
  html,body{width:100%;margin:0;padding:0;}
  body{font-family:'Kalpurush','Noto Sans Bengali','SutonnyOMJ','Inter',sans-serif;color:#0f172a;background:#fff;}
  .screen-pageinfo{display:none;}
  @media screen{body{padding:6mm 8mm;}.screen-pageinfo{display:flex;justify-content:flex-end;font-size:10px;color:#94a3b8;margin-top:6px;}}
  .sheet{border:2px solid #064e3b;border-radius:6px;padding:10px 14px 14px;box-sizing:border-box;width:100%;}
  .header{display:grid;grid-template-columns:60px 1fr 60px;gap:12px;align-items:center;border-bottom:2px double #064e3b;padding-bottom:8px;}
  .header-logo{width:60px;height:60px;object-fit:contain;}
  .header-text{text-align:center;}
  .header-text h1{font-size:22px;font-weight:800;color:#064e3b;letter-spacing:.3px;margin-bottom:2px;}
  .header-text .addr{font-size:11px;color:#475569;}
  .header-text .phone{font-size:11px;color:#475569;margin-top:1px;}
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
  thead th{background:#064e3b;color:#fff;font-weight:700;padding:6px 4px;border:1px solid #064e3b;text-align:center;font-size:10.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;}
  .sub-th{padding:4px 3px;vertical-align:middle;height:38px;}
  .sub-name{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;overflow:hidden;text-overflow:ellipsis;line-height:1.15;word-break:break-word;overflow-wrap:anywhere;hyphens:auto;font-size:10.5px;}
  .sub-name.md{font-size:9.5px;}
  .sub-name.sm{font-size:8.5px;-webkit-line-clamp:3;line-clamp:3;line-height:1.1;}
  .sub-name.xs{font-size:7.5px;-webkit-line-clamp:3;line-clamp:3;line-height:1.05;letter-spacing:-.2px;}
  .sub-max{display:block;font-size:8.5px;font-weight:500;opacity:.85;margin-top:1px;}
  tbody td{padding:4px 5px;border:1px solid #d1d5db;}
  tbody tr{page-break-inside:avoid;break-inside:avoid;}
  tbody tr:nth-child(even) td{background:#f8fafc;}
  tbody tr:hover td{background:#ecfdf5;}
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
  .signatures-keeper{page-break-inside:avoid;break-inside:avoid-page;-webkit-column-break-inside:avoid;display:block;}
  .signatures-wrap{margin-top:42px;page-break-inside:avoid;break-inside:avoid-page;-webkit-column-break-inside:avoid;display:block;}
  .signatures{display:flex;flex-wrap:nowrap;justify-content:space-between;gap:16px;padding:0 10px;page-break-inside:avoid;break-inside:avoid-page;-webkit-column-break-inside:avoid;}
  .sig-block{flex:1 1 0;min-width:0;text-align:center;page-break-inside:avoid;break-inside:avoid-page;-webkit-column-break-inside:avoid;}
  .sig-line{border-top:1.5px solid #334155;padding-top:4px;margin-top:30px;}
  .sig-name{font-size:11px;font-weight:700;color:#0f172a;min-height:14px;}
  .sig-title{font-size:11.5px;font-weight:700;color:#064e3b;margin-top:1px;}
  .sig-sub{font-size:9.5px;color:#64748b;}
  .footer{margin-top:14px;display:flex;justify-content:space-between;font-size:9.5px;color:#64748b;border-top:1px dashed #cbd5e1;padding-top:6px;}
  @media print{
    html,body{padding:0 !important;}
    .sheet{border-color:#064e3b;}
    .header,.doc-band,.meta{page-break-inside:avoid;break-inside:avoid;}
    table{page-break-inside:auto;}
    tr{page-break-inside:avoid;break-inside:avoid;page-break-after:auto;}
    thead{display:table-header-group;}
    tfoot{display:table-footer-group;}
    .summary-wrap{page-break-inside:avoid;break-inside:avoid;-webkit-column-break-inside:avoid;break-before:auto;}
    .summary{page-break-inside:avoid;break-inside:avoid;}
    .stat{page-break-inside:avoid;break-inside:avoid;}
    .signatures-keeper{page-break-inside:avoid !important;break-inside:avoid-page !important;-webkit-column-break-inside:avoid !important;}
    .signatures-wrap{page-break-inside:avoid !important;break-inside:avoid-page !important;-webkit-column-break-inside:avoid !important;page-break-before:auto;break-before:auto;page-break-after:avoid;}
    .signatures{page-break-inside:avoid !important;break-inside:avoid-page !important;-webkit-column-break-inside:avoid !important;display:flex !important;flex-wrap:nowrap !important;}
    .sig-block{page-break-inside:avoid !important;break-inside:avoid-page !important;-webkit-column-break-inside:avoid !important;}
  }
  .result-page{position:relative;box-sizing:border-box;padding:2px;width:${orientation === 'landscape' ? 297 - m.left - m.right : 210 - m.left - m.right}mm;height:${orientation === 'landscape' ? 210 - m.top - m.bottom : 297 - m.top - m.bottom}mm;break-after:page;page-break-after:always;break-inside:avoid;page-break-inside:avoid;overflow:hidden;margin:0 auto;}
  .result-page:last-child{break-after:auto;page-break-after:auto;}
  .fit-inner{position:absolute;top:2px;left:2px;right:2px;transform-origin:top left;width:calc(100% - 4px);box-sizing:border-box;}
  .signatures-wrap{margin-top:20px;}
  .sig-line{margin-top:22px;}
</style>
<script>
(function(){
  function fit(){
    var isLandscape = ${orientation === 'landscape' ? 'true' : 'false'};
    var PX = 96 / 25.4;
    var pageH = (isLandscape ? 210 : 297) * PX;
    var pageW = (isLandscape ? 297 : 210) * PX;
    var availH = pageH - (${m.top} + ${m.bottom}) * PX - 6;
    var availW = pageW - (${m.left} + ${m.right}) * PX - 6;
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

export const printResultSheet = (params: ExportData & { orientation?: 'landscape' | 'portrait' }) => {
  const html = getResultSheetHtml(params);
  renderPrintDocument(html, params.title);
};

const renderPrintDocument = (html: string, title: string) => {
  try {
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
      setTimeout(() => iframe.remove(), 60000);
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
