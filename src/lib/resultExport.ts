import jsPDF from 'jspdf';
import { CANONICAL_BANGLA_LABELS as L } from './banglaCanonicalLabels';

interface ExportData {
  title: string;
  students: any[];
  subjects: any[];
  marksMap: Record<string, number>;
  getOverallGrade: (marks: number[]) => { grade: string; gpa: string; title?: string; title_bn?: string; hasFail: boolean };
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

export const exportResultCSV = ({ title, students, subjects, marksMap, getOverallGrade, bn }: ExportData) => {
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
  ];

  const rows = students.map((st: any, idx: number) => {
    const marks = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`] ?? 0);
    const total = marks.reduce((a, b) => a + b, 0);
    const avg = subjects.length > 0 ? total / subjects.length : 0;
    const { grade, gpa, title: gradeTitle, title_bn } = getOverallGrade(marks);
    return [
      idx + 1,
      st.roll_number || '-',
      bn ? st.name_bn : (st.name_en || st.name_bn),
      ...marks,
      total,
      avg.toFixed(1),
      grade,
      gpa,
      bn ? title_bn : gradeTitle,
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

export const exportResultPDF = ({ title, students, subjects, marksMap, getOverallGrade, bn, institutionName, orientation = 'landscape', margins }: ExportData & { orientation?: 'landscape' | 'portrait' }) => {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const m = sanitizeMargins(margins);
  const margin = Math.min(m.left, m.right);

  doc.setFontSize(14);
  doc.text(institutionName || '', pageW / 2, 12, { align: 'center' });
  doc.setFontSize(11);
  doc.text(title, pageW / 2, 19, { align: 'center' });

  const colHeaders = [
    '#', bn ? 'Roll' : 'Roll', bn ? 'Name' : 'Name',
    ...subjects.map((s: any) => (bn ? s.name_bn : s.name).substring(0, 8)),
    'Total', 'Avg', 'Grade', 'GPA', 'Title',
  ];

  const fixedCols = 3;
  const endCols = 5;
  const subjectCols = subjects.length;
  const totalCols = fixedCols + subjectCols + endCols;
  const availW = pageW - margin * 2;
  const colW = Math.min(availW / totalCols, 22);
  const startX = margin;
  let y = 26;
  const rowH = 6;
  const headerH = 7;

  doc.setFontSize(6);
  doc.setTextColor(100);
  colHeaders.forEach((h, i) => {
    doc.text(h, startX + i * colW + colW / 2, y + headerH / 2 + 1, { align: 'center', maxWidth: colW - 1 });
  });
  y += headerH;
  doc.setDrawColor(200);
  doc.line(startX, y, startX + totalCols * colW, y);

  doc.setTextColor(30);
  doc.setFontSize(6);

  students.forEach((st: any, idx: number) => {
    if (y + rowH > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = 15;
    }

    const marks = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`] ?? 0);
    const total = marks.reduce((a, b) => a + b, 0);
    const avg = subjects.length > 0 ? total / subjects.length : 0;
    const { grade, gpa, title: gradeTitle, title_bn } = getOverallGrade(marks);

    const rowData = [
      String(idx + 1),
      String(st.roll_number || '-'),
      (bn ? st.name_bn : (st.name_en || st.name_bn) || '').substring(0, 14),
      ...marks.map(String),
      String(total),
      avg.toFixed(1),
      grade,
      gpa,
      ((bn ? title_bn : gradeTitle) || '').substring(0, 10),
    ];

    rowData.forEach((val, i) => {
      doc.text(val, startX + i * colW + colW / 2, y + rowH / 2 + 1, { align: 'center', maxWidth: colW - 1 });
    });

    y += rowH;
    doc.setDrawColor(230);
    doc.line(startX, y, startX + totalCols * colW, y);
  });

  const footerY = doc.internal.pageSize.getHeight() - 10;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, footerY);

  doc.save(`${title.replace(/[^a-zA-Z0-9\s]/g, '_')}.pdf`);
};

export const printResultSheet = ({ title, students, subjects, marksMap, getOverallGrade, bn, institutionName, institutionLogo, institutionAddress, institutionPhone, className, examName, sessionName, passMark = 33, signatories, orientation = 'landscape', showPageNumbers = true, showFooterInstitution = true, margins }: ExportData & { orientation?: 'landscape' | 'portrait' }) => {
  const m = sanitizeMargins(margins);
  const sigList = (signatories && signatories.length ? signatories : DEFAULT_RESULT_SIGNATORIES).slice(0, 6);
  // Build computed rows + ranking by total (desc)
  const computed = students.map((st: any, idx: number) => {
    const marks = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`] ?? 0);
    const total = marks.reduce((a, b) => a + b, 0);
    const avg = subjects.length > 0 ? total / subjects.length : 0;
    const overall = getOverallGrade(marks);
    const failed = marks.some(m => m < passMark) || overall.hasFail;
    return { idx, st, marks, total, avg, overall, failed };
  });
  const sortedByTotal = [...computed].sort((a, b) => b.total - a.total);
  const rankMap = new Map<number, number>();
  sortedByTotal.forEach((r, i) => rankMap.set(r.idx, i + 1));

  const passCount = computed.filter(c => !c.failed).length;
  const failCount = computed.length - passCount;
  const topper = sortedByTotal[0];
  const classAvg = computed.length ? (computed.reduce((s, c) => s + c.total, 0) / computed.length).toFixed(2) : '0';

  const subjectHeaders = subjects.map((s: any) => {
    const fullName = (bn ? s.name_bn : s.name) || '';
    const len = fullName.length;
    // Tier classes drive font-size + line-clamp so all subject headers share the same visual height
    const sizeClass = len > 22 ? 'sub-name xs' : len > 16 ? 'sub-name sm' : len > 10 ? 'sub-name md' : 'sub-name';
    const safeTitle = fullName.replace(/"/g, '&quot;');
    return `<th class="sub-th"><span class="${sizeClass}" title="${safeTitle}">${fullName}</span><span class="sub-max">100</span></th>`;
  }).join('');

  const rows = computed.map(({ idx, st, marks, total, avg, overall, failed }) => {
    const rank = rankMap.get(idx);
    const marksCells = marks.map(m =>
      `<td class="num ${m < passMark ? 'fail-cell' : ''}">${m}</td>`
    ).join('');
    return `<tr class="${failed ? 'row-fail' : ''}">
      <td class="num">${idx + 1}</td>
      <td class="num bold">${st.roll_number || '-'}</td>
      <td class="name">${bn ? st.name_bn : (st.name_en || st.name_bn)}</td>
      ${marksCells}
      <td class="num bold">${total}</td>
      <td class="num">${avg.toFixed(1)}</td>
      <td class="num bold grade-${overall.grade?.replace(/[^A-Z]/g, '') || 'N'}">${overall.grade}</td>
      <td class="num bold">${overall.gpa}</td>
      <td class="num"><span class="rank-pill">${rank}</span></td>
      <td class="num ${failed ? 'status-fail' : 'status-pass'}">${failed ? (bn ? 'অকৃতকার্য' : 'Fail') : (bn ? 'কৃতকার্য' : 'Pass')}</td>
    </tr>`;
  }).join('');

  const metaRow = (label: string, value: string) =>
    value ? `<div class="meta-item"><span class="meta-k">${label}</span><span class="meta-v">${value}</span></div>` : '';

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${title}</title>
<style>@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box;}
  @page{
    size:A4 ${orientation};
    margin:${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;
    @bottom-left{
      content:${showFooterInstitution ? `"${(institutionName || '').replace(/"/g, '\\"')}"` : `""`};
      font-family:'SutonnyOMJ','Noto Sans Bengali','Inter',sans-serif;
      font-size:9pt;color:#64748b;
    }
    @bottom-right{
      content:${showPageNumbers ? `"${bn ? 'পৃষ্ঠা' : 'Page'} " counter(page${bn ? ', bengali' : ''}) " ${bn ? 'এর' : 'of'} " counter(pages${bn ? ', bengali' : ''})` : `""`};
      font-family:'SutonnyOMJ','Noto Sans Bengali','Inter',sans-serif;
      font-size:9pt;color:#64748b;
    }
  }
  body{font-family:'SutonnyOMJ','Noto Sans Bengali','Inter',sans-serif;color:#0f172a;background:#fff;padding:6mm 8mm;}
  .screen-pageinfo{display:none;}
  @media screen{.screen-pageinfo{display:flex;justify-content:flex-end;font-size:10px;color:#94a3b8;margin-top:6px;}}
  .sheet{border:2px solid #064e3b;border-radius:6px;padding:10px 14px 14px;}
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
  .rank-pill{display:inline-block;min-width:22px;padding:1px 6px;border-radius:999px;background:#064e3b;color:#fff;font-size:10px;font-weight:700;}
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
    body{padding:0;}
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
</style>
</head><body>
<div class="sheet">
  <div class="header">
    <div>${institutionLogo ? `<img src="${institutionLogo}" class="header-logo" crossorigin="anonymous" />` : ''}</div>
    <div class="header-text">
      <h1>${institutionName || ''}</h1>
      ${institutionAddress ? `<p class="addr">${institutionAddress}</p>` : ''}
      ${institutionPhone ? `<p class="phone">${bn ? 'ফোন' : 'Phone'}: ${institutionPhone}</p>` : ''}
    </div>
    <div></div>
  </div>
  <div class="doc-band"><span>${bn ? 'ফলাফল শীট' : 'RESULT SHEET'}</span></div>
  <div class="meta">
    ${metaRow(bn ? 'পরীক্ষা:' : 'Exam:', examName || title)}
    ${metaRow(bn ? 'শ্রেণি:' : 'Class:', className || '')}
    ${metaRow(bn ? 'শিক্ষাবর্ষ:' : 'Session:', sessionName || '')}
    ${metaRow(bn ? 'মোট ছাত্র:' : 'Total Students:', String(computed.length))}
    ${metaRow(bn ? 'প্রকাশের তারিখ:' : 'Issue Date:', new Date().toLocaleDateString(bn ? 'bn-BD' : 'en-GB'))}
  </div>
  <table class="result-table">
    ${(() => {
      const n = subjects.length;
      // Fixed % widths so every page on every printer aligns identically (table-layout:fixed)
      const fixedW = { idx: 3, roll: 5, name: 18, total: 5, avg: 4, grade: 5, gpa: 4, rank: 5, status: 7 };
      const used = Object.values(fixedW).reduce((a, b) => a + b, 0); // 56
      const subjectPool = Math.max(20, 100 - used); // 44
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
        `<col style="width:${fixedW.rank}%">`,
        `<col style="width:${fixedW.status}%">`,
      ].join('');
      return `<colgroup>${cols}</colgroup>`;
    })()}
    <thead><tr>
      <th>#</th>
      <th>${bn ? 'রোল' : 'Roll'}</th>
      <th style="text-align:left;padding-left:8px;">${bn ? 'শিক্ষার্থীর নাম' : 'Student Name'}</th>
      ${subjectHeaders}
      <th>${bn ? 'মোট' : 'Total'}</th>
      <th>${bn ? 'গড়' : 'Avg'}</th>
      <th>${bn ? 'গ্রেড' : 'Grade'}</th>
      <th>GPA</th>
      <th>${bn ? 'মেধাক্রম' : 'Rank'}</th>
      <th>${bn ? 'অবস্থা' : 'Status'}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary-wrap">
  <div class="summary">
    <div class="stat"><div class="stat-k">${bn ? 'মোট' : 'Total'}</div><div class="stat-v">${computed.length}</div></div>
    <div class="stat"><div class="stat-k">${bn ? 'কৃতকার্য' : 'Pass'}</div><div class="stat-v" style="color:#059669;">${passCount}</div></div>
    <div class="stat"><div class="stat-k">${bn ? 'অকৃতকার্য' : 'Fail'}</div><div class="stat-v" style="color:#dc2626;">${failCount}</div></div>
    <div class="stat"><div class="stat-k">${bn ? 'গড় নম্বর' : 'Class Avg'}</div><div class="stat-v">${classAvg}</div></div>
    <div class="stat"><div class="stat-k">${bn ? 'প্রথম স্থান' : 'Topper'}</div><div class="stat-v" style="font-size:12px;">${topper ? `${(bn ? topper.st.name_bn : (topper.st.name_en || topper.st.name_bn)) || '-'} (${topper.total})` : '-'}</div></div>
  </div>
  </div>
  <div class="signatures-keeper">
  <div class="signatures-wrap">
  <div class="signatures">
    ${sigList.map((s) => {
      const t = (bn ? s.title_bn : s.title_en) || (bn ? s.title_en : s.title_bn) || '';
      const n = (bn ? s.name_bn : s.name_en) || (bn ? s.name_en : s.name_bn) || '';
      return `<div class="sig-block"><div class="sig-line"></div><p class="sig-name">${n || '&nbsp;'}</p><p class="sig-title">${t}</p><p class="sig-sub">${bn ? 'স্বাক্ষর ও তারিখ' : 'Signature & Date'}</p></div>`;
    }).join('')}
  </div>
  </div>
  </div>
  <div class="footer">
    <span>${bn ? 'প্রিন্ট:' : 'Printed:'} ${new Date().toLocaleString(bn ? 'bn-BD' : 'en-GB')}</span>
    <span>${institutionName || ''}</span>
  </div>
  <div class="screen-pageinfo">${bn ? 'প্রিন্টে প্রতিটি পৃষ্ঠার নিচে পৃষ্ঠা সংখ্যা দেখাবে (যেমন: পৃষ্ঠা ১ এর ৩)' : 'Page numbers (e.g., Page 1 of 3) will appear at the bottom of every printed page'}</div>
</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        URL.revokeObjectURL(url);
      }, 700);
    };
  } else {
    URL.revokeObjectURL(url);
  }
};
