import jsPDF from 'jspdf';

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
}

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

export const exportResultPDF = ({ title, students, subjects, marksMap, getOverallGrade, bn, institutionName }: ExportData) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;

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

export const printResultSheet = ({ title, students, subjects, marksMap, getOverallGrade, bn, institutionName, institutionLogo, institutionAddress, institutionPhone }: ExportData) => {
  const subjectHeaders = subjects.map((s: any) => `<th style="padding:4px 6px;text-align:center;font-size:11px;border:1px solid #ccc;background:#f5f5f5;">${bn ? s.name_bn : s.name}</th>`).join('');

  const rows = students.map((st: any, idx: number) => {
    const marks = subjects.map((sub: any) => marksMap[`${st.id}_${sub.id}`] ?? 0);
    const total = marks.reduce((a, b) => a + b, 0);
    const avg = subjects.length > 0 ? total / subjects.length : 0;
    const { grade, gpa, title: gradeTitle, title_bn } = getOverallGrade(marks);
    const marksCells = marks.map(m => `<td style="padding:4px;text-align:center;border:1px solid #ddd;font-size:11px;">${m}</td>`).join('');
    return `<tr>
      <td style="padding:4px;text-align:center;border:1px solid #ddd;font-size:11px;">${idx + 1}</td>
      <td style="padding:4px;text-align:center;border:1px solid #ddd;font-size:11px;">${st.roll_number || '-'}</td>
      <td style="padding:4px 6px;border:1px solid #ddd;font-size:11px;">${bn ? st.name_bn : (st.name_en || st.name_bn)}</td>
      ${marksCells}
      <td style="padding:4px;text-align:center;border:1px solid #ddd;font-weight:bold;font-size:11px;">${total}</td>
      <td style="padding:4px;text-align:center;border:1px solid #ddd;font-size:11px;">${avg.toFixed(1)}</td>
      <td style="padding:4px;text-align:center;border:1px solid #ddd;font-weight:bold;font-size:11px;">${grade}</td>
      <td style="padding:4px;text-align:center;border:1px solid #ddd;font-weight:bold;font-size:11px;">${gpa}</td>
      <td style="padding:4px;text-align:center;border:1px solid #ddd;font-size:11px;">${bn ? title_bn : gradeTitle}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${title}</title>
<style>@font-face{font-family:"SutonnyOMJ";src:url("/fonts/SutonnyOMJ.ttf") format("truetype");font-display:swap;}</style><link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'SutonnyOMJ','Noto Sans Bengali',sans-serif; padding:15mm; }
  @media print { body { padding:10mm; } }
  .header { text-align:center; margin-bottom:16px; }
  .header-logo { width:50px; height:50px; object-fit:contain; margin:0 auto 8px; display:block; }
  .header h1 { font-size:18px; margin-bottom:2px; }
  .header h2 { font-size:14px; color:#555; margin-bottom:2px; }
  .header .info { font-size:11px; color:#777; }
  table { width:100%; border-collapse:collapse; margin-top:12px; }
  .signatures { display:flex; justify-content:space-between; margin-top:60px; padding:0 20px; }
  .sig-block { text-align:center; min-width:150px; }
  .sig-line { border-top:1px dashed #999; padding-top:6px; margin-top:40px; }
  .sig-title { font-size:12px; font-weight:600; }
  .sig-sub { font-size:10px; color:#888; }
</style>
</head><body>
<div class="header">
  ${institutionLogo ? `<img src="${institutionLogo}" class="header-logo" crossorigin="anonymous" />` : ''}
  <h1>${institutionName || ''}</h1>
  ${institutionAddress ? `<p class="info">${institutionAddress}</p>` : ''}
  ${institutionPhone ? `<p class="info">${bn ? 'ফোন' : 'Phone'}: ${institutionPhone}</p>` : ''}
  <h2>${title}</h2>
</div>
<table>
  <thead><tr>
    <th style="padding:4px 6px;text-align:center;font-size:11px;border:1px solid #ccc;background:#f5f5f5;">#</th>
    <th style="padding:4px 6px;text-align:center;font-size:11px;border:1px solid #ccc;background:#f5f5f5;">${bn ? 'রোল' : 'Roll'}</th>
    <th style="padding:4px 6px;text-align:left;font-size:11px;border:1px solid #ccc;background:#f5f5f5;">${bn ? 'নাম' : 'Name'}</th>
    ${subjectHeaders}
    <th style="padding:4px 6px;text-align:center;font-size:11px;border:1px solid #ccc;background:#f5f5f5;">${bn ? 'মোট' : 'Total'}</th>
    <th style="padding:4px 6px;text-align:center;font-size:11px;border:1px solid #ccc;background:#f5f5f5;">${bn ? 'গড়' : 'Avg'}</th>
    <th style="padding:4px 6px;text-align:center;font-size:11px;border:1px solid #ccc;background:#f5f5f5;">${bn ? 'গ্রেড' : 'Grade'}</th>
    <th style="padding:4px 6px;text-align:center;font-size:11px;border:1px solid #ccc;background:#f5f5f5;">GPA</th>
    <th style="padding:4px 6px;text-align:center;font-size:11px;border:1px solid #ccc;background:#f5f5f5;">${bn ? 'মর্যাদা' : 'Title'}</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="signatures">
  <div class="sig-block">
    <div class="sig-line"></div>
    <p class="sig-title">${bn ? 'পরীক্ষা নিয়ন্ত্রক' : 'Exam Controller'}</p>
    <p class="sig-sub">${bn ? 'স্বাক্ষর ও নাম' : 'Signature & Name'}</p>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p class="sig-title">${bn ? 'শিক্ষা সচিব' : 'Education Secretary'}</p>
    <p class="sig-sub">${bn ? 'স্বাক্ষর ও নাম' : 'Signature & Name'}</p>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <p class="sig-title">${bn ? 'মুহতামিম' : 'Principal'}</p>
    <p class="sig-sub">${bn ? 'স্বাক্ষর ও নাম' : 'Signature & Name'}</p>
  </div>
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
      }, 600);
    };
  } else {
    URL.revokeObjectURL(url);
  }
};
